import { env } from "../config/env.js";

/**
 * Mẫu email: xác nhận cho khách (đúng ngôn ngữ khách đang dùng: en / zh / vi) + thông báo cho doanh nghiệp (tiếng Việt).
 * Mọi dữ liệu khách nhập đều được escape → không chèn được HTML / link độc vào email.
 */
const BRAND = "#1780c1";
const HOTLINE = "+84 98 339 3588";
const ADMIN_BASE = "/admin";

export const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const TYPE_LABEL = {
  vi: {
    booking: "Đặt tour",
    planner: "Thiết kế tour / lên kế hoạch",
    car: "Báo giá xe riêng",
    visa: "Visa & Fast-track",
    contact: "Liên hệ",
    partner: "Hợp tác đại lý B2B",
  },
  en: {
    booking: "Tour booking",
    planner: "Tailor-made trip",
    car: "Private car quote",
    visa: "Visa & fast-track",
    contact: "Contact",
    partner: "B2B partnership",
  },
  zh: {
    booking: "预订行程",
    planner: "定制行程",
    car: "包车报价",
    visa: "签证与快速通关",
    contact: "联系咨询",
    partner: "B2B合作",
  },
};

const FIELD_LABEL = {
  tour: "Tour",
  departureDate: "Ngày khởi hành",
  adults: "Người lớn",
  childAges: "Tuổi trẻ em",
  estimate: "Giá tạm tính",
  name: "Họ tên",
  email: "Email",
  phone: "Điện thoại",
  nationality: "Quốc tịch",
  message: "Lời nhắn",
};

const value = (v) =>
  Array.isArray(v) ? v.join(", ") : typeof v === "object" && v ? JSON.stringify(v) : String(v);

/** Bảng thông tin đơn (tên trường form → nhãn dễ đọc) */
function rows(entries) {
  return entries
    .filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && !v.length))
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;color:#5b6b77;vertical-align:top;white-space:nowrap">${escape(FIELD_LABEL[k] ?? k)}</td><td style="padding:8px 12px;color:#14212b"><b>${escape(value(v))}</b></td></tr>`,
    )
    .join("");
}

function enquiryEntries(e) {
  return [
    ["tour", e.tour?.title ? `${e.tour.title}${e.tour.code ? ` (${e.tour.code})` : ""}` : ""],
    ["departureDate", e.departureDate],
    ["adults", e.adults],
    ["childAges", e.childAges],
    ["estimate", e.estimate?.total != null ? `$${e.estimate.total} USD` : ""],
    ["name", e.name],
    ["email", e.email],
    ["phone", e.phone],
    ["nationality", e.nationality],
    ["message", e.message],
    ...Object.entries(e.details ?? {}),
  ];
}

function layout(inner) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:${BRAND};padding:20px 28px;color:#fff;font-size:20px;font-weight:bold">Vietlook Travel</td></tr>
<tr><td style="padding:28px;color:#14212b;font-size:15px;line-height:1.6">${inner}</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;color:#5b6b77;font-size:12px">Vietlook Travel and Trading Company Limited · Hotline / WhatsApp / Zalo: ${HOTLINE}</td></tr>
</table></td></tr></table></body></html>`;
}

const table = (html) =>
  `<table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;background:#f8fafc;border-radius:12px">${html}</table>`;

const CUSTOMER = {
  en: (e) => ({
    subject: `[${e.code}] We received your request – Vietlook Travel`,
    body: `<p>Dear ${escape(e.name)},</p><p>Thank you for contacting Vietlook Travel! Your request code is <b style="color:${BRAND}">${e.code}</b>.</p><p>Our travel expert will contact you within 24 hours to confirm the details and guide you on payment.</p>`,
  }),
  zh: (e) => ({
    subject: `[${e.code}] 我们已收到您的需求 – Vietlook Travel`,
    body: `<p>${escape(e.name)} 您好，</p><p>感谢您联系 Vietlook Travel！您的需求编号为 <b style="color:${BRAND}">${e.code}</b>。</p><p>我们的旅行顾问将在24小时内与您联系，确认细节并指导付款。</p>`,
  }),
  vi: (e) => ({
    subject: `[${e.code}] Vietlook Travel đã nhận yêu cầu của bạn`,
    body: `<p>Xin chào ${escape(e.name)},</p><p>Cảm ơn bạn đã liên hệ Vietlook Travel! Mã yêu cầu của bạn là <b style="color:${BRAND}">${e.code}</b>.</p><p>Chuyên viên tư vấn sẽ liên hệ trong vòng 24 giờ để xác nhận và hướng dẫn thanh toán.</p>`,
  }),
};

export function customerEmail(e) {
  const { subject, body } = (CUSTOMER[e.lang] ?? CUSTOMER.en)(e);
  return { subject, html: layout(`${body}${table(rows(enquiryEntries(e)))}`) };
}

export function companyEmail(e) {
  const type = TYPE_LABEL.vi[e.type] ?? e.type;
  const link = `${env.siteUrl}${ADMIN_BASE}/${e.type === "booking" ? "bookings" : "requests"}?code=${encodeURIComponent(e.code)}`;
  return {
    subject: `[${e.code}] ${type} mới từ ${e.name}`,
    html: layout(
      `<p style="margin-top:0"><b>${escape(type)}</b> mới — mã <b style="color:${BRAND}">${e.code}</b> (khách dùng trang ${escape(String(e.lang).toUpperCase())}).</p>${table(rows(enquiryEntries(e)))}<p><a href="${escape(link)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold">Mở trong trang quản trị</a></p>`,
    ),
  };
}

export function testEmail() {
  return {
    subject: "Email thử từ trang quản trị Vietlook Travel",
    html: layout(
      "<p>Đây là email thử. Nếu bạn nhận được, cấu hình gửi email thông báo đã hoạt động.</p>",
    ),
  };
}

export const typeLabel = (type, lang = "vi") => TYPE_LABEL[lang]?.[type] ?? type;
