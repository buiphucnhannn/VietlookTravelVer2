import { ENQUIRY_TYPES } from "../constants/content.js";
import { logger } from "../config/logger.js";
import { companyEmail, customerEmail, testEmail } from "../emails/templates.js";
import {
  counterRepository,
  enquiryRepository,
  tourRepository,
} from "../repositories/content.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { estimatePrice } from "../utils/pricing.js";
import { mailService } from "./mail.service.js";
import { settingsService } from "./settings.service.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ 0/O, 1/I dễ nhầm

/** Mã yêu cầu: VL-BK260512-7QX2 (loại + ngày theo giờ VN + hậu tố từ bộ đếm, không trùng) */
async function nextCode(type) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
    .format(new Date())
    .replace(/-/g, "")
    .slice(2);
  const seq = await counterRepository.next(`enquiry-${ymd}`);
  // hậu tố: 2 ký tự ngẫu nhiên + số thứ tự trong ngày (base32) → khó đoán, không trùng
  const rand = Array.from(
    { length: 2 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("");
  let n = seq;
  let tail = "";
  do {
    tail = ALPHABET[n % ALPHABET.length] + tail;
    n = Math.floor(n / ALPHABET.length);
  } while (n > 0);
  return `VL-${ENQUIRY_TYPES[type]}${ymd}-${rand}${tail.padStart(2, ALPHABET[0])}`;
}

/** Gửi email (khách + doanh nghiệp) rồi lưu kết quả để CMS đánh dấu đơn chưa gửi được email */
async function deliver(enquiry) {
  const settings = await settingsService.getNotifications();
  const recipients = await settingsService.recipients();
  const status = { customer: "skipped", company: "skipped", error: "" };
  const errors = [];

  const company = await mailService.send({
    to: recipients,
    replyTo: enquiry.email || undefined,
    ...companyEmail(enquiry),
  });
  status.company = company.ok ? "sent" : company.skipped ? "skipped" : "failed";
  if (!company.ok) errors.push(`DN: ${company.error}`);

  if (enquiry.email && settings.sendCustomerConfirmation) {
    const customer = await mailService.send({
      to: enquiry.email,
      replyTo: settings.replyTo || recipients[0],
      ...customerEmail(enquiry),
    });
    status.customer = customer.ok ? "sent" : customer.skipped ? "skipped" : "failed";
    if (!customer.ok) errors.push(`Khách: ${customer.error}`);
  }
  status.error = errors.join(" | ").slice(0, 500);
  await enquiryRepository.setEmailStatus(enquiry._id, status);
  return status;
}

export const enquiryService = {
  /** Khách gửi form trên website. Lưu DB TRƯỚC, gửi email SAU (không chặn phản hồi). */
  async createPublic(data, meta) {
    let tour = null;
    let estimate = { currency: "USD", total: null, lines: [] };
    if (data.type === "booking") {
      tour = await tourRepository.findByIdent(data.tourSlug);
      if (!tour || !tour.isActive)
        throw ApiError.badRequest("Tour không tồn tại hoặc đã ngừng bán");
      // giá tạm tính tính lại ở máy chủ theo bảng giá trong CMS (không tin số trình duyệt gửi)
      estimate = {
        currency: "USD",
        ...estimatePrice(tour, {
          adults: data.adults ?? 1,
          childAges: data.childAges ?? [],
          date: data.departureDate,
          hotelClass: data.hotelClass,
        }),
      };
    }

    const doc = await enquiryRepository.create({
      code: await nextCode(data.type),
      type: data.type,
      name: data.name,
      email: data.email,
      phone: data.phone,
      nationality: data.nationality,
      message: data.notes || data.message,
      ...(tour && {
        tour: { slug: tour.slug, code: tour.code, title: tour.content?.en?.title ?? tour.slug },
        departureDate: data.departureDate,
        adults: data.adults ?? 1,
        childAges: data.childAges ?? [],
        hotelClass: data.hotelClass ?? null,
        estimate,
      }),
      details: data.details,
      lang: data.lang,
      page: data.page,
      ip: meta.ip ?? "",
      userAgent: String(meta.userAgent ?? "").slice(0, 300),
    });
    const enquiry = doc.toObject();
    deliver(enquiry).catch((err) =>
      logger.error({ err, code: enquiry.code }, "[enquiry] lỗi gửi email"),
    );
    return { code: enquiry.code, estimate: tour ? estimate : undefined };
  },

  /* ---------- CMS ---------- */

  async list(query) {
    const page = getPagination(query, { defaultLimit: 30, maxLimit: 100 });
    const filter = {};
    if (query.kind === "bookings") filter.type = "booking";
    if (query.kind === "requests") filter.$nor = [{ type: "booking" }];
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.emailFailed)
      filter.$or = [{ "emailStatus.company": "failed" }, { "emailStatus.customer": "failed" }];
    if (query.q) {
      const rx = new RegExp(escapeRegex(query.q), "i");
      const search = [
        { code: rx },
        { name: rx },
        { email: rx },
        { phone: rx },
        { "tour.title": rx },
      ];
      if (filter.$or) filter.$and = [{ $or: filter.$or }, { $or: search }];
      else filter.$or = search;
      if (filter.$and) delete filter.$or;
    }
    const { items, total } = await enquiryRepository.paginate(filter, {
      ...page,
      sort: { createdAt: -1 },
      select: "-ip -userAgent",
    });
    return { items, meta: buildPageMeta(page, total) };
  },

  async get(id) {
    const e = await enquiryRepository.findById(id, { select: "-ip -userAgent" });
    if (!e) throw ApiError.notFound("Không tìm thấy đơn / yêu cầu");
    return e;
  },

  async findByCode(code) {
    const e = await enquiryRepository.findByCode(code);
    if (!e) throw ApiError.notFound("Không tìm thấy mã yêu cầu");
    return { id: String(e._id), type: e.type };
  },

  async update(id, data) {
    await this.get(id);
    return enquiryRepository.updateById(id, { $set: data }, { select: "-ip -userAgent" });
  },

  async addNote(id, text, actor) {
    await this.get(id);
    return enquiryRepository.addNote(id, { text, by: actor?.name || actor?.username || "" });
  },

  async removeNote(id, noteId) {
    await this.get(id);
    return enquiryRepository.removeNote(id, noteId);
  },

  /** Gửi lại email (đơn bị đánh dấu chưa gửi được) */
  async resendEmail(id) {
    const e = await enquiryRepository.findById(id);
    if (!e) throw ApiError.notFound("Không tìm thấy đơn / yêu cầu");
    if (!mailService.enabled)
      throw ApiError.unavailable(
        "Máy chủ chưa cấu hình gửi email (RESEND_API_KEY)",
        "MAIL_NOT_CONFIGURED",
      );
    return deliver(e);
  },

  async remove(id) {
    const e = await this.get(id);
    await enquiryRepository.deleteById(id);
    return e;
  },

  async stats() {
    const since = new Date(Date.now() - 7 * 24 * 3600_000);
    const [byKind, last7Days] = await Promise.all([
      enquiryRepository.stats(),
      enquiryRepository.recentSince(since),
    ]);
    return { ...byKind, last7Days };
  },

  /** Gửi email thử tới danh sách người nhận đang cài */
  async sendTest() {
    if (!mailService.enabled)
      throw ApiError.unavailable(
        "Máy chủ chưa cấu hình gửi email (RESEND_API_KEY)",
        "MAIL_NOT_CONFIGURED",
      );
    const to = await settingsService.recipients();
    if (!to.length) throw ApiError.badRequest("Chưa có email người nhận");
    const r = await mailService.send({ to, ...testEmail() });
    if (!r.ok) throw ApiError.unavailable(`Gửi thử thất bại: ${r.error}`, "MAIL_FAILED");
    return { to };
  },
};
