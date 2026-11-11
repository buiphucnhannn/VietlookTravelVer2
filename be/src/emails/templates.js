import { env } from "../config/env.js";
import { describeEnquiry, fmtDateTime, formatValue, pickLang } from "./format.js";
import { COMPANY, LANG_NAME, STAFF_HEADLINE, TYPE_LABEL } from "./labels.js";
import {
  C,
  FONT,
  SPACE,
  button,
  codeBox,
  escape,
  link,
  p,
  quote,
  shell,
  subhead,
  table,
  title,
} from "./layout.js";

/**
 * Mẫu email cho mọi form trên website — bố cục 1 cột, đơn giản, dễ đọc:
 *  - customerEmail: xác nhận cho khách (đúng ngôn ngữ khách dùng: en / zh / vi).
 *  - companyEmail: thông báo cho nhân viên (tiếng Việt).
 * Mọi dữ liệu khách nhập đều được escape → không chèn được HTML / link độc vào email.
 * `lookups` (không bắt buộc): tên xe / gói fast-track / điểm đến / tên tour theo ngôn ngữ — enquiry.service tra DB.
 */

export { escape };
export const typeLabel = (type, lang = "vi") =>
  TYPE_LABEL[lang]?.[type] ?? TYPE_LABEL.en[type] ?? type;

const ADMIN_BASE = "/admin";

/** Số điện thoại → số cho WhatsApp / tel (số VN bắt đầu bằng 0 → thêm mã 84) */
export const waNumber = (phone) => {
  const d = String(phone ?? "")
    .replace(/\D/g, "")
    .replace(/^00/, "");
  return /^0\d{8,10}$/.test(d) ? `84${d.slice(1)}` : d;
};
const telHref = (phone) => {
  const s = String(phone ?? "").trim();
  return `tel:${s.startsWith("+") ? "+" : ""}${s.replace(/\D/g, "")}`;
};

export const adminLink = (e) =>
  `${env.siteUrl}${ADMIN_BASE}/${e.type === "booking" ? "bookings" : "requests"}?code=${encodeURIComponent(e.code)}`;

const firstLine = (s, max = 60) => {
  const t = String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/* =========================================================================
 * Email cho khách
 * ========================================================================= */

const CUSTOMER = {
  en: {
    hello: (n) => `Dear ${n},`,
    received: {
      booking: "Thank you – we have received your tour booking request.",
      planner: "Thank you – we have received your tailor-made trip request.",
      car: "Thank you – we have received your private car request.",
      visa: "Thank you – we have received your visa & fast-track request.",
      contact: "Thank you – we have received your message.",
      partner: "Thank you – we have received your partnership enquiry.",
    },
    codeLabel: "Your request code",
    keepCode: "Please quote this code whenever you contact us.",
    summary: "Your request",
    estimate: "Estimated price",
    estimateNote: "This is an estimate – we will confirm the final price with you.",
    next: "What happens next",
    nextText: {
      booking:
        "Our travel expert will check availability and reply within 24 hours with your booking confirmation and a payment guide. No online payment is needed.",
      planner:
        "Within 24 hours, our travel expert will email you a day-by-day itinerary with a clear price. You can change anything before you confirm.",
      car: "We will confirm your vehicle, driver and final price within 24 hours – usually much sooner. No online payment is needed.",
      visa: "We will confirm your package, the price and the documents we need within 24 hours. No online payment is needed.",
      contact: "We will reply to your message within 24 hours – usually much sooner.",
      partner: "Our B2B team will contact you within 24 hours with our partner rates and terms.",
    },
    nextBookingPay:
      "Our travel expert will check availability and reply within 24 hours with your booking confirmation. If you chose to pay online, you will receive a separate payment receipt; otherwise we will send you a payment guide.",
    questions: "Questions? Simply reply to this email or chat with us on WhatsApp.",
    whatsapp: "Chat on WhatsApp",
    orCall: "Or call",
    signoff: "Warm regards,",
    team: "The Vietlook Travel team",
    why: "You received this email because a request was sent from the Vietlook Travel website with this email address. If it wasn't you, please ignore this email.",
    subject: (e) => `Your request ${e.code} has been received`,
    preheader: (e) => `Request code ${e.code} · we will reply within 24 hours.`,
  },
  zh: {
    hello: (n) => `${n}，您好！`,
    received: {
      booking: "感谢您！我们已收到您的行程预订申请。",
      planner: "感谢您！我们已收到您的定制行程需求。",
      car: "感谢您！我们已收到您的包车需求。",
      visa: "感谢您！我们已收到您的签证与快速通关需求。",
      contact: "感谢您！我们已收到您的留言。",
      partner: "感谢您！我们已收到您的合作咨询。",
    },
    codeLabel: "您的需求编号",
    keepCode: "联系我们时请提供此编号。",
    summary: "您的需求",
    estimate: "预估价格",
    estimateNote: "以上为预估价格，最终价格将由我们与您确认。",
    next: "接下来",
    nextText: {
      booking: "旅行顾问将核实余位，并在24小时内回复预订确认及付款指引。无需在线付款。",
      planner: "旅行顾问将在24小时内通过邮件发送逐日行程及清晰报价，确认前可随时调整。",
      car: "我们将在24小时内（通常更快）确认车型、司机及最终价格。无需在线付款。",
      visa: "我们将在24小时内确认套餐、价格及所需资料。无需在线付款。",
      contact: "我们将在24小时内回复您（通常会更快）。",
      partner: "我们的B2B团队将在24小时内与您联系，提供同业价格及合作条款。",
    },
    nextBookingPay:
      "旅行顾问将核实余位，并在24小时内回复预订确认。如您已在线付款，将另行收到付款凭证；否则我们会发送付款指引。",
    questions: "有任何问题？直接回复此邮件，或通过 WhatsApp 联系我们。",
    whatsapp: "WhatsApp 联系我们",
    orCall: "或致电",
    signoff: "此致敬礼，",
    team: "Vietlook Travel 团队",
    why: "您收到此邮件，是因为有人使用此邮箱在 Vietlook Travel 网站提交了需求。如非本人操作，请忽略此邮件。",
    subject: (e) => `您的需求 ${e.code} 已收到`,
    preheader: (e) => `需求编号 ${e.code} · 我们将在24小时内回复。`,
  },
  vi: {
    hello: (n) => `Xin chào ${n},`,
    received: {
      booking: "Cảm ơn bạn! Vietlook Travel đã nhận được yêu cầu đặt tour của bạn.",
      planner: "Cảm ơn bạn! Vietlook Travel đã nhận được yêu cầu thiết kế tour của bạn.",
      car: "Cảm ơn bạn! Vietlook Travel đã nhận được yêu cầu thuê xe của bạn.",
      visa: "Cảm ơn bạn! Vietlook Travel đã nhận được yêu cầu visa & fast-track của bạn.",
      contact: "Cảm ơn bạn! Vietlook Travel đã nhận được tin nhắn của bạn.",
      partner: "Cảm ơn bạn! Vietlook Travel đã nhận được đề nghị hợp tác của bạn.",
    },
    codeLabel: "Mã yêu cầu của bạn",
    keepCode: "Khi liên hệ, bạn chỉ cần đọc mã này cho chúng tôi.",
    summary: "Yêu cầu của bạn",
    estimate: "Giá tạm tính",
    estimateNote: "Đây là giá tạm tính – chúng tôi sẽ xác nhận giá cuối cùng với bạn.",
    next: "Tiếp theo",
    nextText: {
      booking:
        "Chuyên viên tư vấn sẽ kiểm tra chỗ và phản hồi trong vòng 24 giờ kèm xác nhận đặt tour và hướng dẫn thanh toán. Bạn không cần thanh toán trực tuyến.",
      planner:
        "Trong vòng 24 giờ, chuyên viên tư vấn sẽ gửi email lịch trình chi tiết từng ngày kèm giá rõ ràng. Bạn có thể điều chỉnh mọi thứ trước khi xác nhận.",
      car: "Chúng tôi sẽ xác nhận xe, tài xế và giá cuối cùng trong vòng 24 giờ – thường sớm hơn nhiều. Bạn không cần thanh toán trực tuyến.",
      visa: "Chúng tôi sẽ xác nhận gói dịch vụ, giá và giấy tờ cần chuẩn bị trong vòng 24 giờ. Bạn không cần thanh toán trực tuyến.",
      contact: "Chúng tôi sẽ trả lời bạn trong vòng 24 giờ – thường sớm hơn nhiều.",
      partner: "Bộ phận B2B sẽ liên hệ bạn trong vòng 24 giờ kèm bảng giá và điều khoản hợp tác.",
    },
    nextBookingPay:
      "Chuyên viên tư vấn sẽ kiểm tra chỗ và phản hồi trong vòng 24 giờ kèm xác nhận đặt tour. Nếu bạn đã thanh toán online, bạn sẽ nhận thêm email biên nhận; nếu chưa, chúng tôi sẽ gửi hướng dẫn thanh toán.",
    questions: "Có câu hỏi? Bạn chỉ cần trả lời email này hoặc nhắn cho chúng tôi qua WhatsApp.",
    whatsapp: "Nhắn qua WhatsApp",
    orCall: "Hoặc gọi",
    signoff: "Trân trọng,",
    team: "Đội ngũ Vietlook Travel",
    why: "Bạn nhận được email này vì địa chỉ email này đã được dùng để gửi yêu cầu trên website Vietlook Travel. Nếu không phải bạn, vui lòng bỏ qua email này.",
    subject: (e) => `Yêu cầu ${e.code} của bạn đã được tiếp nhận`,
    preheader: (e) => `Mã yêu cầu ${e.code} · chúng tôi sẽ phản hồi trong vòng 24 giờ.`,
  },
};

export function customerEmail(e, lookups = {}) {
  const lang = pickLang(e.lang);
  const t = CUSTOMER[lang];
  const type = TYPE_LABEL[lang][e.type] ? e.type : "contact";
  const { facts, price } = describeEnquiry(e, lang, lookups);
  const name = String(e.name ?? "").trim();

  // Chỉ thông tin chính (tour / tuyến, ngày, số khách, hạng khách sạn, giá tạm tính)
  const summary = [
    ...facts.map((f) => (f.key === "priceUSD" ? { ...f, strong: true } : f)),
    ...(price ? [{ key: "estimate", label: t.estimate, text: price.total, strong: true }] : []),
  ];
  const hasEstimate = summary.some((r) => r.key === "estimate");
  // 9Pay đang bật → không nói "không cần thanh toán trực tuyến"
  const nextText =
    type === "booking" && lookups.paymentOnline ? t.nextBookingPay : t.nextText[type];

  const body = [
    // lời chào → câu xác nhận (12) → ô mã (24) → chú thích (8) → các mục (32, tiêu đề → nội dung 10)
    p(escape(t.hello(name)), { margin: `0 0 ${SPACE.para}px` }),
    p(escape(t.received[type]), { margin: "0 0 24px" }),
    codeBox(t.codeLabel, e.code),
    p(escape(t.keepCode), {
      size: 13,
      muted: true,
      margin: `${SPACE.tight}px 0 0`,
      align: "center",
    }),
    summary.length
      ? `${subhead(t.summary)}${table(summary)}${hasEstimate ? p(escape(t.estimateNote), { size: 13, muted: true, margin: `${SPACE.tight}px 0 0` }) : ""}`
      : "",
    subhead(t.next),
    p(escape(nextText), { margin: "0" }),
    // nhóm liên hệ liền nhau: câu hỏi → nút (16) → "Hoặc gọi" (12)
    p(escape(t.questions), { margin: "24px 0 0" }),
    button(COMPANY.whatsapp, t.whatsapp, { top: 16 }),
    p(
      `${escape(t.orCall)} ${link(telHref(COMPANY.hotline), COMPANY.hotline)} · ${link(`mailto:${COMPANY.email}?subject=${encodeURIComponent(e.code)}`, COMPANY.email)}`,
      { size: 14, muted: true, margin: `${SPACE.para}px 0 0`, align: "center" },
    ),
    p(`${escape(t.signoff)}<br>${escape(t.team)}`, { margin: `${SPACE.section}px 0 0` }),
  ].join("\n");

  const footer = `<p class="mu" style="margin:0 0 4px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted}"><b>${escape(COMPANY.legalName[lang])}</b><br>${escape(COMPANY.address[lang])}</p>
<p class="mu" style="margin:10px 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted}">${escape(t.why)}</p>`;

  const html = shell({
    lang,
    title: t.subject(e),
    preheader: t.preheader(e),
    body,
    footer,
  });

  const text = [
    t.hello(name),
    "",
    t.received[type],
    "",
    `${t.codeLabel}: ${e.code}`,
    t.keepCode,
    "",
    ...(summary.length
      ? [
          `${t.summary}:`,
          ...summary.map((r) => `- ${r.label}: ${r.text}`),
          ...(hasEstimate ? [t.estimateNote] : []),
          "",
        ]
      : []),
    `${t.next}:`,
    nextText,
    "",
    t.questions,
    `WhatsApp: ${COMPANY.whatsapp}`,
    `${t.orCall} ${COMPANY.hotline} · ${COMPANY.email}`,
    "",
    t.signoff,
    t.team,
    "",
    "--",
    COMPANY.legalName[lang],
    COMPANY.address[lang],
    t.why,
  ].join("\n");

  // Thư giao dịch: mã riêng chống gộp luồng; KHÔNG List-Unsubscribe / Precedence (dấu hiệu thư hàng loạt)
  return { subject: t.subject(e), html, text, headers: { "X-Entity-Ref-ID": e.code } };
}

/* =========================================================================
 * Email cho nhân viên (tiếng Việt)
 * ========================================================================= */

export function companyEmail(e, lookups = {}) {
  const lang = "vi";
  const headline = STAFF_HEADLINE[e.type] ?? "Yêu cầu mới từ website";
  const { facts, rows, long, price } = describeEnquiry(e, lang, lookups);
  const name = String(e.name ?? "").trim();
  const customerLang = pickLang(e.lang);
  const langName = LANG_NAME.vi[customerLang];
  const link_ = adminLink(e);
  const sent = fmtDateTime(e.createdAt ?? new Date(), "vi");
  const headFact = ["booking", "car", "visa", "planner"].includes(e.type) ? facts[0]?.text : "";
  const subject = `${headline} ${e.code} – ${firstLine(name, 40)}`;

  const phone = String(e.phone ?? "").trim();
  const email = String(e.email ?? "").trim();
  const wa = waNumber(phone);
  const replySubject = encodeURIComponent(`Re: [${e.code}] Vietlook Travel`);
  const dot = ` <span class="mu" style="color:${C.muted}">·</span> `;
  const contactLinks = [
    phone && link(telHref(phone), phone),
    wa && link(`https://wa.me/${wa}`, "WhatsApp"),
    wa && link(`https://zalo.me/${wa}`, "Zalo"),
  ].filter(Boolean);

  const customer = [
    `<p class="tx" style="margin:0 0 4px;text-align:center;font-family:${FONT};font-size:18px;line-height:26px;font-weight:700;color:${C.text}">${escape(name)}</p>`,
    contactLinks.length ? p(contactLinks.join(dot), { margin: "0", align: "center" }) : "",
    email
      ? p(link(`mailto:${email}?subject=${replySubject}`, email), { margin: "0", align: "center" })
      : "",
    e.nationality ? p(`Quốc tịch: ${escape(e.nationality)}`, { margin: "0", align: "center" }) : "",
    customerLang !== "vi"
      ? p(
          `Khách dùng trang ${escape(langName)} — nên trả lời bằng ${escape(langName.replace(/^T/, "t"))}.`,
          {
            size: 14,
            muted: true,
            margin: `${SPACE.tight}px 0 0`,
            align: "center",
          },
        )
      : "",
  ].join("\n");

  const details = [
    ...facts,
    ...(price
      ? [
          ...price.lines.map((l) => ({ label: l.label, text: l.amount })),
          { label: "Tổng tạm tính", text: price.total, strong: true },
        ]
      : []),
    ...rows,
    e.page && {
      label: "Gửi từ trang",
      text: String(e.page).replace(/^https?:\/\/[^/]+/, "") || "/",
    },
  ].filter(Boolean);

  const body = [
    title(`${headline} –`, e.code),
    p(`Gửi lúc ${escape(sent)}`, { size: 14, muted: true, margin: "0 0 24px", align: "center" }),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="ln" align="center" style="border:1px solid ${C.line};border-radius:10px;padding:16px 16px 18px;text-align:center">${customer}</td></tr></table>`,
    subhead("Chi tiết"),
    table(details),
    ...long.map(
      (l) => `${subhead(l.key === "message" ? "Lời nhắn của khách" : l.label)}${quote(l.text)}`,
    ),
    button(link_, "Mở trong trang quản trị"),
    email
      ? p("Bấm Trả lời trong hộp thư để email thẳng cho khách.", {
          size: 13,
          muted: true,
          margin: "12px 0 0",
          align: "center",
        })
      : "",
  ].join("\n");

  const html = shell({
    lang,
    title: subject,
    preheader: `${name}${headFact ? ` · ${headFact}` : ""}${phone ? ` · ${phone}` : ""}`,
    body,
  });

  const text = [
    `${headline} – ${e.code}`,
    "",
    `Khách hàng: ${name}`,
    phone ? `Điện thoại: ${phone}` : null,
    email ? `Email: ${email}` : null,
    e.nationality ? `Quốc tịch: ${e.nationality}` : null,
    customerLang !== "vi" ? `Ngôn ngữ khách dùng: ${langName}` : null,
    "",
    ...details.map((r) => `${r.label}: ${r.text}`),
    ...long.flatMap((l) => ["", `${l.label}:`, l.text]),
    "",
    `Mở trong trang quản trị: ${link_}`,
  ]
    .filter((x) => x != null)
    .join("\n");

  return {
    subject,
    html,
    text,
    headers: { "X-Entity-Ref-ID": e.code, "Auto-Submitted": "auto-generated" },
  };
}

/** Dùng cho test / xem trước: định dạng 1 giá trị lẻ */
export const formatField = (key, value, lang = "vi", type) =>
  formatValue(key, value, { lang: pickLang(lang), type });
