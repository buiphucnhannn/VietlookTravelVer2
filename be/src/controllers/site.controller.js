import { can } from "../constants/permissions.js";
import { enquiryModule, viewableKinds } from "../middlewares/enquiry-access.middleware.js";
import { auditService } from "../services/audit.service.js";
import { authService } from "../services/auth.service.js";
import { enquiryService } from "../services/enquiry.service.js";
import { pageService } from "../services/modules.service.js";
import { publicService } from "../services/public.service.js";
import { reviewStatsService } from "../services/review-stats.service.js";
import { settingsService } from "../services/settings.service.js";
import { fxService } from "../services/payment/fx.service.js";
import { ApiError } from "../utils/ApiError.js";
import { noContent, ok } from "../utils/response.js";

/* ---------- Khoá bí mật trong Cài đặt (mã 9Pay, khoá API đánh giá) ---------- */

/** Tên dễ đọc của từng khoá — ghi vào nhật ký (KHÔNG BAO GIỜ ghi giá trị hay 4 ký tự cuối) */
export const SECRET_LABELS = Object.freeze({
  "review.tripadvisor": "Khoá API Tripadvisor",
  "review.google": "Khoá API Google",
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
  reviews: async (_req, res) => ok(res, await publicService.reviews()),
  home: async (_req, res) => ok(res, await publicService.home()),
  slugs: async (_req, res) => ok(res, await publicService.slugs()),
  site: async (_req, res) =>
    ok(res, {
      tracking: await settingsService.getTracking(),
      smallGroup: await settingsService.getSmallGroup(),
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

  async remove(req, res) {
    const doc = await enquiryService.remove(req.validated.params.id);
    auditService.record(req, "enquiry.delete", {
      target: { type: "enquiry", id: doc.code },
      meta: enquiryInfo(doc),
    });
    noContent(res);
  },
};

/** Trang chủ, trang nội dung, cài đặt (CMS) */
export const settingsController = {
  getHome: async (_req, res) => ok(res, await settingsService.getHome()),
  async saveHome(req, res) {
    const data = await settingsService.saveHome(req.validated.body, req.user);
    auditService.record(req, "settings.home");
    ok(res, data);
  },

  pages: async (_req, res) => ok(res, await pageService.list()),
  page: async (req, res) => ok(res, await pageService.get(req.validated.params.key)),
  async savePage(req, res) {
    const { key } = req.validated.params;
    const data = await pageService.save(key, req.validated.body);
    auditService.record(req, "page.update", { target: { type: "page", id: key } });
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

  getSmallGroup: async (_req, res) => ok(res, await settingsService.getSmallGroup()),
  async saveSmallGroup(req, res) {
    const data = await settingsService.saveSmallGroup(req.validated.body, req.user);
    auditService.record(req, "settings.smallGroup", { meta: data });
    ok(res, data);
  },

  /* Điểm & số lượt đánh giá (Tripadvisor / Google) — chỉ admin; khoá API không bao giờ trả về / ghi nhật ký */
  getReviewStats: async (_req, res) => ok(res, await reviewStatsService.get()),
  async saveReviewStats(req, res) {
    const { data, keyChanges } = await reviewStatsService.save(req.validated.body, req.user, {
      reauth: reauthOf(req),
    });
    auditService.record(req, "settings.review_stats", {
      meta: {
        tripadvisor: `${data.tripadvisor.rating} · ${data.tripadvisor.count}`,
        google: `${data.google.rating} · ${data.google.count}`,
        tripadvisorAuto: data.tripadvisor.autoActive,
        googleAuto: data.google.autoActive,
      },
    });
    for (const c of keyChanges) recordSecret(req, `review.${c.source}`, c.op);
    ok(res, data);
  },
  /** Nút "Cập nhật ngay": lấy số qua API ngay (kiểm tra khoá vừa nhập) */
  async syncReviewStats(req, res) {
    const result = await reviewStatsService.sync({ by: req.user?.username, manual: true });
    auditService.record(req, "settings.review_sync", {
      meta: { ok: result.lastSync.ok, message: result.lastSync.message },
    });
    ok(res, { ...(await reviewStatsService.get()), result: result.lastSync });
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
