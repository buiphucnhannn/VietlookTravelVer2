import { can } from "../constants/permissions.js";
import { enquiryModule, viewableKinds } from "../middlewares/enquiry-access.middleware.js";
import { auditService } from "../services/audit.service.js";
import { authService } from "../services/auth.service.js";
import { enquiryService } from "../services/enquiry.service.js";
import { pageContent, pageCopyService, pageService } from "../services/modules.service.js";
import { revisionService } from "../services/revision.service.js";
import { PAGE_KEYS } from "../constants/content.js";
import { PAGE_COPY_KEYS } from "../constants/page-copy.js";
import { publicService } from "../services/public.service.js";
import { reviewStatsService } from "../services/review-stats.service.js";
import { settingsService } from "../services/settings.service.js";
import { fxService } from "../services/payment/fx.service.js";
import { ApiError } from "../utils/ApiError.js";
import { noContent, ok } from "../utils/response.js";

/* ---------- Khoá bí mật trong Cài đặt (mã 9Pay) ---------- */

/**
 * Tên dễ đọc của từng khoá — ghi vào nhật ký (KHÔNG BAO GIỜ ghi giá trị hay 4 ký tự cuối).
 * (Nhật ký cũ về khoá API Tripadvisor / Google — đã bỏ — vẫn hiện đúng nhờ tên lưu sẵn trong meta.name.)
 */
export const SECRET_LABELS = Object.freeze({
  "9pay.merchantKey": "Mã cửa hàng 9Pay (Merchant Key)",
  "9pay.secretKey": "Mã bí mật 9Pay (Secret Key)",
  "9pay.checksumKey": "Mã kiểm tra 9Pay (Checksum Key)",
});

/** Nhật ký "đã thay / đã xoá khoá X" — ai, lúc nào (nhật ký tự ghi người làm + thời gian) */
function recordSecret(req, key, op) {
  auditService.record(req, "settings.secret", {
    meta: { key, name: SECRET_LABELS[key] ?? key, op },
  });
}

/**
 * Bước xác nhận mật khẩu (step-up) cho service gọi khi request THẬT SỰ đổi / xoá khoá.
 * Nhập sai → nhật ký "auth.reauth_failed" (đủ số lần → tài khoản tạm khoá như đăng nhập sai).
 * Mật khẩu chỉ dùng để kiểm tra rồi bỏ — không ghi vào nhật ký / log.
 */
const reauthOf = (req) => async () => {
  try {
    await authService.confirmPassword(req.user.id, req.validated.body.confirmPassword);
  } catch (err) {
    if (err.code === "REAUTH_FAILED" || err.justLocked)
      auditService.record(req, "auth.reauth_failed", { level: "warn" });
    if (err.justLocked) auditService.record(req, "auth.locked", { level: "warn" });
    throw err;
  }
};

/** Dữ liệu công khai cho website */
export const publicController = {
  tours: async (_req, res) => ok(res, await publicService.tours()),
  tour: async (req, res) => ok(res, await publicService.tour(req.validated.params.slug)),
  destinations: async (_req, res) => ok(res, await publicService.destinations()),
  themes: async (_req, res) => ok(res, await publicService.themes()),
  articles: async (_req, res) => ok(res, await publicService.articles()),
  article: async (req, res) => ok(res, await publicService.article(req.validated.params.slug)),
  taxonomy: async (_req, res) => ok(res, await publicService.taxonomy()),
  services: async (_req, res) => ok(res, await publicService.services()),
  pages: async (_req, res) => ok(res, await publicService.pages()),
  // Giao diện trang (khoá đã kiểm tra ở route): ô đã sửa trong CMS, website đè lên nội dung mặc định
  pageCopy: async (req, res) => ok(res, await pageCopyService.publicData(req.params.key)),
  reviews: async (_req, res) => ok(res, await publicService.reviews()),
  home: async (_req, res) => ok(res, await publicService.home()),
  slugs: async (_req, res) => ok(res, await publicService.slugs()),
  site: async (_req, res) =>
    ok(res, {
      tracking: await settingsService.getTracking(),
      smallGroup: await settingsService.getSmallGroup(),
      // Thông tin liên hệ công ty (CMS → Thông tin liên hệ) — website dùng cho đầu / chân trang, nút chat…
      contact: await settingsService.getContact(),
      reviewStats: await reviewStatsService.publicStats(),
    }),

  /** Khách gửi form (đặt tour, thiết kế tour, xe, visa, liên hệ, đối tác) */
  async submitEnquiry(req, res) {
    const data = req.validated.body;
    // Honeypot: bot điền ô ẩn → giả vờ thành công, không lưu
    if (data.honeypot) return ok(res, { code: "VL-RQ000000-0000" });
    const result = await enquiryService.createPublic(data, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    req.log?.info(
      { event: "enquiry.create", code: result.code, type: data.type },
      `[enquiry] ${result.code}`,
    );
    res.status(201).json({ success: true, data: result });
  },
};

/** Nhật ký: mã đơn + tên khách + nhóm đơn (không ghi email / số điện thoại) */
const enquiryInfo = (doc) => ({
  name: doc.code,
  customer: doc.name ?? "",
  kind: enquiryModule(doc.type),
});

/** Đơn đặt tour + yêu cầu từ form (CMS) */
export const enquiryController = {
  async list(req, res) {
    const { items, meta } = await enquiryService.list(req.validated.query, viewableKinds(req.user));
    ok(res, items, meta);
  },
  stats: async (req, res) => ok(res, await enquiryService.stats(viewableKinds(req.user))),
  get: async (req, res) => ok(res, await enquiryService.get(req.validated.params.id)),
  async byCode(req, res) {
    const found = await enquiryService.findByCode(req.validated.params.code);
    // đơn thuộc nhóm tài khoản không được xem → coi như không có
    if (!can(req.user, enquiryModule(found.type), "view"))
      throw ApiError.notFound("Không tìm thấy mã yêu cầu");
    ok(res, found);
  },

  async update(req, res) {
    const doc = await enquiryService.update(req.validated.params.id, req.validated.body);
    auditService.record(req, "enquiry.update", {
      target: { type: "enquiry", id: doc.code },
      meta: { ...req.validated.body, ...enquiryInfo(doc) },
    });
    ok(res, doc);
  },

  async addNote(req, res) {
    const doc = await enquiryService.addNote(
      req.validated.params.id,
      req.validated.body.text,
      req.user,
    );
    auditService.record(req, "enquiry.note", {
      target: { type: "enquiry", id: doc.code },
      meta: enquiryInfo(doc),
    });
    ok(res, doc);
  },

  async removeNote(req, res) {
    const { id, noteId } = req.validated.params;
    const doc = await enquiryService.removeNote(id, noteId);
    if (doc)
      auditService.record(req, "enquiry.note_delete", {
        target: { type: "enquiry", id: doc.code },
        meta: enquiryInfo(doc),
      });
    ok(res, doc);
  },

  async resendEmail(req, res) {
    const { status, enquiry } = await enquiryService.resendEmail(req.validated.params.id);
    // nhật ký tra đơn theo MÃ đơn (như các thao tác khác) — ghi id nội bộ sẽ hiện nhầm "đã xoá"
    auditService.record(req, "enquiry.resend_email", {
      target: { type: "enquiry", id: enquiry.code },
      meta: enquiryInfo(enquiry),
    });
    ok(res, status);
  },

  /** Xoá = vào Thùng rác; ?hard=1 = xoá hẳn đơn đang trong Thùng rác */
  async remove(req, res) {
    const hard = req.query?.hard === "1";
    const id = req.validated.params.id;
    const doc = hard ? await enquiryService.purge(id) : await enquiryService.remove(id);
    auditService.record(req, hard ? "enquiry.purge" : "enquiry.delete", {
      target: { type: "enquiry", id: doc.code },
      meta: { ...enquiryInfo(doc), ...(!hard && { trash: true }) },
    });
    noContent(res);
  },

  async restore(req, res) {
    const doc = await enquiryService.restore(req.validated.params.id);
    auditService.record(req, "enquiry.restore", {
      target: { type: "enquiry", id: doc.code },
      meta: enquiryInfo(doc),
    });
    ok(res, doc);
  },
};

/** Trang chủ, trang nội dung, cài đặt (CMS) */
export const settingsController = {
  // CMS: kèm updatedAt (trình sửa gửi lại khi lưu → chống ghi đè; trang danh sách hiện "Cập nhật …")
  getHome: async (_req, res) => ok(res, await settingsService.getHomeAdmin()),
  async saveHome(req, res) {
    const { baseUpdatedAt, ...body } = req.validated.body;
    const data = await settingsService.saveHome(body, req.user, { baseUpdatedAt });
    auditService.record(req, "settings.home");
    ok(res, data);
  },

  pages: async (_req, res) => ok(res, await pageService.list()),
  page: async (req, res) => ok(res, await pageService.get(req.validated.params.key)),
  async savePage(req, res) {
    const { key } = req.validated.params;
    const { baseUpdatedAt, ...body } = req.validated.body;
    const data = await pageService.save(key, body, { actor: req.user, baseUpdatedAt });
    auditService.record(req, "page.update", { target: { type: "page", id: key } });
    ok(res, data);
  },

  /* Giao diện các trang công khai (khoá trang đã kiểm tra ở route — requirePageCopyKey) */
  pageCopies: async (_req, res) => ok(res, await pageCopyService.list()),
  pageCopy: async (req, res) => ok(res, await pageCopyService.get(req.params.key)),
  async savePageCopy(req, res) {
    const { key } = req.params;
    const { baseUpdatedAt, ...body } = req.validated.body;
    const data = await pageCopyService.save(key, body, { actor: req.user, baseUpdatedAt });
    auditService.record(req, "page.update", { target: { type: "page", id: key } });
    ok(res, data);
  },

  /* Lịch sử phiên bản (Trang chủ · Giao diện trang · Giới thiệu / chính sách) — quyền theo trang ở route */
  revisions: async (req, res) => ok(res, await revisionService.list(req.params.key)),
  revision: async (req, res) =>
    ok(res, await revisionService.get(req.params.key, req.validated.params.id)),
  /** "Dùng lại bản này": bản hiện tại được cất vào lịch sử trước, rồi lưu lại bản cũ (như 1 lần lưu) */
  async restoreRevision(req, res) {
    const { key } = req.params;
    const rev = await revisionService.get(key, req.validated.params.id);
    const opts = { actor: req.user, reason: "restore" };
    let data;
    if (key === "home") {
      const lists = { featuredTours: [], longTours: [], homeThemes: [], featuredDestinations: [] };
      data = await settingsService.saveHome({ ...lists, ...rev.data }, req.user, opts);
    } else if (PAGE_KEYS.includes(key))
      data = await pageService.save(key, pageContent(rev.data), opts);
    else if (PAGE_COPY_KEYS.includes(key))
      data = await pageCopyService.save(key, { data: rev.data }, opts);
    else throw ApiError.notFound("Không tìm thấy trang");
    auditService.record(req, "settings.revision_restore", {
      target: key === "home" ? {} : { type: "page", id: key },
      meta: { key, at: rev.savedAt ?? rev.createdAt, ...(key === "home" && { name: "Trang chủ" }) },
    });
    ok(res, data);
  },

  getNotifications: async (_req, res) => ok(res, await settingsService.getNotifications()),
  async saveNotifications(req, res) {
    const data = await settingsService.saveNotifications(req.validated.body, req.user);
    auditService.record(req, "settings.notifications", { meta: { count: data.recipients.length } });
    ok(res, data);
  },
  getTracking: async (_req, res) => ok(res, await settingsService.getTracking()),
  async saveTracking(req, res) {
    const data = await settingsService.saveTracking(req.validated.body, req.user);
    auditService.record(req, "settings.tracking");
    ok(res, data);
  },

  getContact: async (_req, res) => ok(res, await settingsService.getContact()),
  async saveContact(req, res) {
    const data = await settingsService.saveContact(req.validated.body, req.user);
    auditService.record(req, "settings.contact", {
      meta: { phones: data.phones.length, email: data.email },
    });
    ok(res, data);
  },
  getSmallGroup: async (_req, res) => ok(res, await settingsService.getSmallGroup()),
  async saveSmallGroup(req, res) {
    const data = await settingsService.saveSmallGroup(req.validated.body, req.user);
    auditService.record(req, "settings.smallGroup", { meta: data });
    ok(res, data);
  },

  /* Điểm & số lượt đánh giá (Tripadvisor / Google) — theo quyền Đánh giá; tự cập nhật qua Apify (mã trên máy chủ) */
  getReviewStats: async (_req, res) => ok(res, await reviewStatsService.get()),
  /**
   * Nút "Cập nhật ngay": BẮT ĐẦU lấy số mới (chạy nền 20–90 giây) rồi trả ngay; CMS hỏi lại GET để biết kết quả.
   * Nhật ký ghi khi chạy xong.
   */
  async syncReviewStats(req, res) {
    const { promise, already } = await reviewStatsService.manualSync({ by: req.user?.username });
    if (!already)
      promise
        .then((r) =>
          auditService.record(req, "settings.review_sync", {
            meta: { ok: r.lastSync.ok, message: r.lastSync.message },
          }),
        )
        .catch(() => {});
    ok(res, await reviewStatsService.get());
  },

  // kèm tỷ giá USD → VND đang dùng (tự động) để admin xem
  getPayment: async (_req, res) =>
    ok(res, { ...(await settingsService.getPayment()), fx: await fxService.getRate() }),
  async savePayment(req, res) {
    const saved = await settingsService.savePayment(req.validated.body, req.user, {
      reauth: reauthOf(req),
    });
    const data = { ...saved.data, fx: await fxService.getRate() };
    // không ghi key vào nhật ký — chỉ ghi "đã thay / đã xoá mã nào"
    auditService.record(req, "settings.payment", {
      meta: { enabled: data.enabled, depositPercent: data.depositPercent },
    });
    for (const c of saved.keyChanges) recordSecret(req, `9pay.${c.field}`, c.op);
    ok(res, data);
  },
};
