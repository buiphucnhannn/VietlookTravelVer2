import { ENQUIRY_TYPES } from "../constants/content.js";
import { logger } from "../config/logger.js";
import { companyEmail, customerEmail } from "../emails/templates.js";
import {
  carRepository,
  counterRepository,
  destinationRepository,
  enquiryRepository,
  fastTrackRepository,
  tourRepository,
} from "../repositories/content.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { formMessage } from "../utils/form-messages.js";
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

/**
 * Tên hiển thị cho các mã trong form (loại xe, gói fast-track, điểm đến, tên tour theo ngôn ngữ)
 * → email in chữ dễ hiểu thay vì mã. Lỗi tra cứu không chặn việc gửi email (email dùng chữ dự phòng).
 */
export async function emailLookups(e) {
  const d = e.details ?? {};
  const str = (v) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
  const dests = Array.isArray(d.destinations) ? d.destinations.map(str).filter(Boolean) : [];
  try {
    const [car, pkg, places, tour] = await Promise.all([
      str(d.vehicle) ? carRepository.findByIdent(str(d.vehicle), { select: "key name" }) : null,
      str(d.level) ? fastTrackRepository.findByIdent(str(d.level), { select: "key name" }) : null,
      dests.length ? destinationRepository.findByIdents(dests, { select: "slug name" }) : [],
      e.tour?.slug
        ? tourRepository.findByIdent(e.tour.slug, {
            select: "slug content.en.title content.zh.title content.vi.title",
          })
        : null,
    ]);
    const titles = tour?.content
      ? Object.fromEntries(["en", "zh", "vi"].map((l) => [l, tour.content[l]?.title ?? ""]))
      : null;
    return {
      vehicle: car ? { [car.key]: car.name } : {},
      level: pkg ? { [pkg.key]: pkg.name } : {},
      destinations: Object.fromEntries((places ?? []).map((p) => [p.slug, p.name])),
      ...(titles && { tourTitle: titles }),
    };
  } catch (err) {
    logger.warn({ err }, "[enquiry] không tra được tên hiển thị cho email");
    return {};
  }
}

/** Gửi email (khách + doanh nghiệp) rồi lưu kết quả để CMS đánh dấu đơn chưa gửi được email */
async function deliver(enquiry) {
  const settings = await settingsService.getNotifications();
  const recipients = await settingsService.recipients();
  const lookups = await emailLookups(enquiry);
  const status = { customer: "skipped", company: "skipped", error: "" };
  const errors = [];

  const company = await mailService.send({
    to: recipients,
    replyTo: enquiry.email || undefined,
    ...companyEmail(enquiry, lookups),
  });
  status.company = company.ok ? "sent" : company.skipped ? "skipped" : "failed";
  if (!company.ok) errors.push(`DN: ${company.error}`);

  if (enquiry.email && settings.sendCustomerConfirmation) {
    const customer = await mailService.send({
      to: enquiry.email,
      replyTo: settings.replyTo || recipients[0],
      ...customerEmail(enquiry, lookups),
    });
    status.customer = customer.ok ? "sent" : customer.skipped ? "skipped" : "failed";
    if (!customer.ok) errors.push(`Khách: ${customer.error}`);
  }
  status.error = errors.join(" | ").slice(0, 500);
  await enquiryRepository.setEmailStatus(enquiry._id, status);
  return status;
}

/** Chưa đặt RESEND_API_KEY — nhân viên chỉ thấy câu dễ hiểu (CMS dựa vào mã MAIL_NOT_CONFIGURED) */
const mailOff = () =>
  ApiError.unavailable(
    "Chức năng gửi email chưa được bật — đơn vẫn lưu đầy đủ trong trang quản trị",
    "MAIL_NOT_CONFIGURED",
  );

export const enquiryService = {
  /** Khách gửi form trên website. Lưu DB TRƯỚC, gửi email SAU (không chặn phản hồi). */
  async createPublic(data, meta) {
    let tour = null;
    let estimate = { currency: "USD", total: null, lines: [] };
    if (data.type === "booking") {
      // nhận cả đường dẫn cũ (khách mở trang tour trước khi CMS đổi đường dẫn)
      tour = await tourRepository.findBySlugOrOld(data.tourSlug);
      if (!tour || !tour.isActive) {
        const message = formMessage(data.lang, "tourUnavailable"); // khách thấy câu này
        throw new ApiError(400, message, {
          code: "TOUR_UNAVAILABLE",
          details: [{ field: "body.tourSlug", message }],
        });
      }
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
        tour: {
          slug: tour.slug,
          code: tour.code,
          title: ["en", "vi", "zh"].map((l) => tour.content?.[l]?.title).find(Boolean) || tour.slug,
        },
        departureDate: data.departureDate,
        adults: data.adults ?? 1,
        childAges: data.childAges ?? [],
        hotelClass: data.hotelClass ?? null,
        estimate,
      }),
      // "children" là trường chung (đặt tour lưu theo tuổi trẻ em) → form khác (thiết kế tour) giữ số trẻ em trong details
      details:
        !tour && Number(data.children) > 0
          ? { ...data.details, children: Number(data.children) }
          : data.details,
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

  /** kinds: nhóm tài khoản được xem ("bookings" / "requests") — chỉ được 1 nhóm → luôn lọc theo nhóm đó */
  async list(query, kinds = ["bookings", "requests"]) {
    const page = getPagination(query, { defaultLimit: 30, maxLimit: 100 });
    const filter = {};
    const kind = query.kind ?? (kinds.length === 1 ? kinds[0] : undefined);
    if (kind === "bookings") filter.type = "booking";
    if (kind === "requests") filter.$nor = [{ type: "booking" }];
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
    if (!mailService.enabled) throw mailOff();
    return deliver(e);
  },

  async remove(id) {
    const e = await this.get(id);
    await enquiryRepository.deleteById(id);
    return e;
  },

  /** Số liệu chỉ của các nhóm tài khoản được xem (nhóm còn lại không trả về) */
  async stats(kinds = ["bookings", "requests"]) {
    const since = new Date(Date.now() - 7 * 24 * 3600_000);
    const only =
      kinds.length === 1
        ? kinds[0] === "bookings"
          ? { type: "booking" }
          : { $nor: [{ type: "booking" }] }
        : {};
    const [byKind, last7Days] = await Promise.all([
      enquiryRepository.stats(),
      enquiryRepository.recentSince(since, only),
    ]);
    const out = { last7Days };
    for (const k of kinds) out[k] = byKind[k];
    return out;
  },
};
