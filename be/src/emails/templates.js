import { env } from "../config/env.js";
import { describeEnquiry, fieldLabel, fmtDateTime, formatValue, pickLang } from "./format.js";
import { COMPANY, LANG_NAME, STAFF_HEADLINE, TYPE_LABEL } from "./labels.js";
import {
  C,
  FONT,
  button,
  detailTable,
  divider,
  escape,
  factGrid,
  footerRow,
  heading,
  hero,
  panel,
  paragraph,
  pills,
  priceTable,
  quote,
  section,
  shell,
  stepCards,
} from "./layout.js";

/**
 * Mẫu email cho mọi form trên website:
 *  - companyEmail: thông báo cho nhân viên (tiếng Việt) — tóm tắt, liên hệ nhanh, nút mở trong trang quản trị.
 *  - customerEmail: xác nhận cho khách (đúng ngôn ngữ khách dùng: en / zh / vi).
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
  const digits = s.replace(/\D/g, "");
  return `tel:${s.startsWith("+") ? "+" : ""}${digits}`;
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
    title: (n) => `Thank you, ${n}!`,
    intro: {
      booking:
        "We've received your booking request. Our travel expert will check availability for your departure date and get back to you within 24 hours.",
      planner:
        "We've received your trip details. A travel expert will email you a free tailor-made proposal within 24 hours.",
      car: "We've received your private car request. We'll confirm the vehicle and final price within 24 hours – usually much sooner.",
      visa: "We've received your visa & fast-track request. We'll confirm the package and the documents needed within 24 hours.",
      contact: "We've received your message and will reply within 24 hours (usually much sooner).",
      partner:
        "We've received your partnership enquiry. Our B2B team will contact you within 24 hours.",
    },
    codeLabel: "Your request code",
    keepCode: "Just quote this code whenever you contact us.",
    summary: "Your request",
    estimate: "Estimated price",
    priceNote:
      "Estimate only – our team will confirm the final price with you. No online payment is needed.",
    yourDetails: "Your contact details",
    yourMessage: "Your message",
    next: "What happens next",
    steps: {
      first: "Our travel expert reviews your request – within 24 hours.",
      second: {
        booking: "We confirm availability and send your booking confirmation with a payment guide.",
        planner: "We send a day-by-day itinerary with a transparent price – free to adjust.",
        car: "We confirm your vehicle, driver and final price.",
        visa: "We confirm your package, price and the documents we need from you.",
        contact: "We reply with all the information you need.",
        partner: "We share our B2B rates and partnership terms.",
      },
      pay: "Confirm and pay the way that suits you – bank transfer or in person. No online payment needed.",
      chat: "Anything else? Chat with us on WhatsApp, WeChat or Zalo any time.",
    },
    help: "Need help sooner?",
    helpText: "Our local team is here for you 24/7.",
    call: "Call us",
    emailUs: "Email us",
    wechat: "WeChat / Zalo",
    signoff: "Warm regards,",
    team: "The Vietlook Travel team",
    licence: "International tour operator licence",
    why: "You're receiving this email because a request was submitted on the Vietlook Travel website with this address. If it wasn't you, simply ignore this email or reply to let us know.",
    subject: (e) =>
      e.type === "booking"
        ? `Booking request received – ${e.code} | Vietlook Travel`
        : `We've received your request – ${e.code} | Vietlook Travel`,
    preheader: (e) => `Request code ${e.code} · our travel expert will reply within 24 hours.`,
  },
  zh: {
    title: (n) => `${n}，感谢您的信任！`,
    intro: {
      booking: "我们已收到您的预订申请。旅行顾问将核实您所选出发日期的余位，并在24小时内与您联系。",
      planner: "我们已收到您的行程需求。旅行顾问将在24小时内通过邮件发送免费的定制方案。",
      car: "我们已收到您的包车需求，将在24小时内（通常更快）确认车型与最终价格。",
      visa: "我们已收到您的签证与快速通关需求，将在24小时内确认套餐及所需资料。",
      contact: "我们已收到您的留言，将在24小时内回复您（通常会更快）。",
      partner: "我们已收到您的合作咨询，B2B团队将在24小时内与您联系。",
    },
    codeLabel: "您的需求编号",
    keepCode: "联系我们时请提供此编号。",
    summary: "您的需求",
    estimate: "预估价格",
    priceNote: "以上为预估价格，最终价格由我们的顾问与您确认。无需在线付款。",
    yourDetails: "您的联系方式",
    yourMessage: "您的留言",
    next: "接下来",
    steps: {
      first: "旅行顾问将在24小时内查看您的需求。",
      second: {
        booking: "我们确认余位，并发送预订确认及付款指引。",
        planner: "我们发送逐日行程及透明报价，可随时调整。",
        car: "我们确认车型、司机及最终价格。",
        visa: "我们确认套餐、价格及需要您提供的资料。",
        contact: "我们会回复您需要的所有信息。",
        partner: "我们将提供B2B价格及合作条款。",
      },
      pay: "确认后按您方便的方式付款——银行转账或当面支付，无需在线付款。",
      chat: "还有其他问题？随时通过 WhatsApp、微信或 Zalo 联系我们。",
    },
    help: "需要更快的帮助？",
    helpText: "本地团队 24/7 为您服务。",
    call: "致电我们",
    emailUs: "发送邮件",
    wechat: "微信 / Zalo",
    signoff: "此致敬礼，",
    team: "Vietlook Travel 团队",
    licence: "国际旅行社经营许可证",
    why: "您收到此邮件，是因为有人使用此邮箱在 Vietlook Travel 网站提交了需求。如非本人操作，请忽略此邮件或回复告知我们。",
    subject: (e) =>
      e.type === "booking"
        ? `已收到您的预订申请 – ${e.code} | Vietlook Travel`
        : `我们已收到您的需求 – ${e.code} | Vietlook Travel`,
    preheader: (e) => `需求编号 ${e.code} · 旅行顾问将在24小时内回复您。`,
  },
  vi: {
    title: (n) => `Cảm ơn ${n}!`,
    intro: {
      booking:
        "Vietlook Travel đã nhận yêu cầu đặt tour của bạn. Chuyên viên tư vấn sẽ kiểm tra chỗ cho ngày khởi hành bạn chọn và liên hệ trong vòng 24 giờ.",
      planner:
        "Chúng tôi đã nhận thông tin chuyến đi của bạn. Chuyên viên tư vấn sẽ gửi email đề xuất thiết kế riêng miễn phí trong vòng 24 giờ.",
      car: "Chúng tôi đã nhận yêu cầu thuê xe riêng của bạn và sẽ xác nhận xe cùng giá cuối cùng trong vòng 24 giờ – thường sớm hơn nhiều.",
      visa: "Chúng tôi đã nhận yêu cầu visa & fast-track của bạn và sẽ xác nhận gói dịch vụ cùng giấy tờ cần chuẩn bị trong vòng 24 giờ.",
      contact:
        "Chúng tôi đã nhận tin nhắn của bạn và sẽ phản hồi trong vòng 24 giờ (thường sớm hơn nhiều).",
      partner:
        "Chúng tôi đã nhận đề nghị hợp tác của bạn. Bộ phận B2B sẽ liên hệ trong vòng 24 giờ.",
    },
    codeLabel: "Mã yêu cầu của bạn",
    keepCode: "Khi liên hệ, bạn chỉ cần đọc mã này cho chúng tôi.",
    summary: "Yêu cầu của bạn",
    estimate: "Giá tạm tính",
    priceNote:
      "Giá tạm tính – chuyên viên sẽ xác nhận giá cuối cùng với bạn. Không cần thanh toán trực tuyến.",
    yourDetails: "Thông tin liên hệ của bạn",
    yourMessage: "Lời nhắn của bạn",
    next: "Các bước tiếp theo",
    steps: {
      first: "Chuyên viên tư vấn xem yêu cầu của bạn – trong vòng 24 giờ.",
      second: {
        booking: "Chúng tôi xác nhận còn chỗ và gửi xác nhận đặt tour kèm hướng dẫn thanh toán.",
        planner:
          "Chúng tôi gửi lịch trình chi tiết từng ngày với giá minh bạch – thoải mái điều chỉnh.",
        car: "Chúng tôi xác nhận xe, tài xế và giá cuối cùng.",
        visa: "Chúng tôi xác nhận gói dịch vụ, giá và giấy tờ cần bạn cung cấp.",
        contact: "Chúng tôi phản hồi đầy đủ thông tin bạn cần.",
        partner: "Chúng tôi gửi bảng giá B2B và điều khoản hợp tác.",
      },
      pay: "Xác nhận và thanh toán theo cách thuận tiện – chuyển khoản hoặc trực tiếp, không cần thanh toán trực tuyến.",
      chat: "Cần thêm gì? Nhắn cho chúng tôi qua WhatsApp, WeChat hoặc Zalo bất cứ lúc nào.",
    },
    help: "Cần hỗ trợ sớm hơn?",
    helpText: "Đội ngũ tại Việt Nam luôn sẵn sàng 24/7.",
    call: "Gọi hotline",
    emailUs: "Gửi email",
    wechat: "WeChat / Zalo",
    signoff: "Trân trọng,",
    team: "Đội ngũ Vietlook Travel",
    licence: "Giấy phép lữ hành quốc tế",
    why: "Bạn nhận được email này vì địa chỉ email này đã được dùng để gửi yêu cầu trên website Vietlook Travel. Nếu không phải bạn, hãy bỏ qua email này hoặc trả lời để chúng tôi biết.",
    subject: (e) =>
      e.type === "booking"
        ? `Đã nhận yêu cầu đặt tour – ${e.code} | Vietlook Travel`
        : `Vietlook Travel đã nhận yêu cầu của bạn – ${e.code}`,
    preheader: (e) => `Mã yêu cầu ${e.code} · chuyên viên sẽ phản hồi trong vòng 24 giờ.`,
  },
};

/** Chân email chung (thông tin công ty), căn giữa */
function footer(lang, note) {
  const t = CUSTOMER[lang];
  const link = (href, label) =>
    `<a class="lnk" href="${escape(href)}" target="_blank" style="color:${C.brand};text-decoration:none;font-weight:600">${escape(label)}</a>`;
  const dot = ` <span style="color:#a9b7c3">&nbsp;·&nbsp;</span> `;
  const small = (html, margin = "0 0 4px") =>
    `<p class="mu" style="margin:${margin};font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted}">${html}</p>`;
  return footerRow(`<p class="tx" style="margin:0 0 8px;font-family:${FONT};font-size:14px;line-height:20px;font-weight:700;color:${C.navy}">${escape(COMPANY.legalName[lang])}</p>
${small(escape(COMPANY.address[lang]))}
${small(`Hotline / WhatsApp / Zalo: ${link(telHref(COMPANY.hotline), COMPANY.hotline)}${dot}${link(`mailto:${COMPANY.email}`, COMPANY.email)}`)}
${small(`${escape(t.licence)}: ${escape(COMPANY.licence)}`, "0 0 16px")}
<p style="margin:0 0 18px;font-family:${FONT};font-size:13px;line-height:20px">${COMPANY.social.map(([n, h]) => link(h, n)).join(dot)}</p>
${note ? `<p class="mu" style="margin:0 auto;max-width:460px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint}">${escape(note)}</p>` : ""}`);
}

export function customerEmail(e, lookups = {}) {
  const lang = pickLang(e.lang);
  const t = CUSTOMER[lang];
  const type = TYPE_LABEL[lang][e.type] ? e.type : "contact";
  const { facts, rows, long, price } = describeEnquiry(e, lang, lookups);
  const name = String(e.name ?? "").trim();

  const contactRows = [
    ["name", name],
    ["email", e.email],
    ["phone", e.phone],
    ["nationality", e.nationality],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => ({ key: k, label: fieldLabel(k, lang, e.type), text: String(v) }));

  const nextSteps = [
    t.steps.first,
    t.steps.second[type],
    ["contact", "partner"].includes(type) ? t.steps.chat : t.steps.pay,
  ];

  const body = [
    facts.length || rows.length
      ? section(
          `${heading(t.summary)}${factGrid(facts)}${rows.length ? `<div style="height:12px;line-height:12px;font-size:0">&nbsp;</div>${detailTable(rows)}` : ""}`,
          { top: 32 },
        )
      : "",
    price
      ? section(
          `${heading(t.estimate)}${priceTable(price.lines, t.estimate, price.total, t.priceNote)}`,
        )
      : "",
    ...long.map((l) =>
      section(`${heading(l.key === "message" ? t.yourMessage : l.label)}${quote(l.text)}`),
    ),
    contactRows.length ? section(`${heading(t.yourDetails)}${detailTable(contactRows)}`) : "",
    divider(),
    section(`${heading(t.next)}${stepCards(nextSteps)}`, { top: 30 }),
    section(
      panel(
        `<p class="tx" style="margin:0 0 4px;font-family:${FONT};font-size:17px;line-height:24px;font-weight:700;color:${C.navy}">${escape(t.help)}</p>
<p class="mu" style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:21px;color:${C.muted}">${escape(t.helpText)}</p>
${pills([
  {
    href: telHref(COMPANY.hotline),
    label: `${t.call} ${COMPANY.hotline}`,
    bg: C.brand,
    color: "#ffffff",
  },
  { href: COMPANY.whatsapp, label: "WhatsApp", bg: "#ffffff", color: C.brandDark },
  {
    href: `mailto:${COMPANY.email}?subject=${encodeURIComponent(e.code)}`,
    label: t.emailUs,
    bg: "#ffffff",
    color: C.brandDark,
  },
])}
<p class="mu" style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted}">${escape(t.wechat)}: <b>${escape(COMPANY.wechatId)}</b><br>${escape(COMPANY.hours[lang])}</p>`,
        { bg: C.brandSoft },
      ),
      { top: 30 },
    ),
    section(
      paragraph(
        `${escape(t.signoff)}<br><b class="tx" style="color:${C.navy}">${escape(t.team)}</b>`,
        {
          margin: "0",
          align: "center",
        },
      ),
      { top: 28, bottom: 34, align: "center" },
    ),
  ].join("\n");

  const html = shell({
    lang,
    title: t.subject(e),
    preheader: t.preheader(e),
    hero: hero({
      eyebrow: typeLabel(e.type, lang),
      title: t.title(name || "you"),
      text: escape(t.intro[type]),
      codeLabel: t.codeLabel,
      code: e.code,
      caption: t.keepCode,
    }),
    body,
    footer: footer(lang, t.why),
  });

  const text = [
    t.title(name),
    "",
    t.intro[type],
    "",
    `${t.codeLabel}: ${e.code}`,
    "",
    ...(facts.length || rows.length
      ? [`— ${t.summary} —`, ...[...facts, ...rows].map((r) => `${r.label}: ${r.text}`), ""]
      : []),
    ...(price
      ? [
          `— ${t.estimate} —`,
          ...price.lines.map((l) => `${l.label}: ${l.amount}`),
          `${t.estimate}: ${price.total}`,
          t.priceNote,
          "",
        ]
      : []),
    ...long.flatMap((l) => [`— ${l.label} —`, l.text, ""]),
    `— ${t.next} —`,
    ...nextSteps.map((s, i) => `${i + 1}. ${s}`),
    "",
    `${t.help} WhatsApp: ${COMPANY.whatsapp} · Hotline: ${COMPANY.hotline} · ${COMPANY.email}`,
    "",
    t.signoff,
    t.team,
    "",
    "--",
    COMPANY.legalName[lang],
    COMPANY.address[lang],
    t.why,
  ].join("\n");

  return { subject: t.subject(e), html, text };
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
  const link = adminLink(e);
  const sent = fmtDateTime(e.createdAt ?? new Date(), "vi");
  const headFact = ["booking", "car", "visa", "planner"].includes(e.type) ? facts[0]?.text : "";
  const subject = `[${e.code}] ${headline} · ${firstLine(name, 40)}${headFact ? ` · ${firstLine(headFact, 50)}` : ""}`;

  const phone = String(e.phone ?? "").trim();
  const email = String(e.email ?? "").trim();
  const wa = waNumber(phone);
  const contactLines = [
    phone &&
      `<a class="lnk" href="${escape(telHref(phone))}" style="color:${C.brand};text-decoration:none;font-weight:600;white-space:nowrap">${escape(phone)}</a>`,
    email &&
      `<a class="lnk" href="mailto:${escape(email)}" style="color:${C.brand};text-decoration:none;font-weight:600">${escape(email)}</a>`,
    e.nationality && `${escape(fieldLabel("nationality", lang))}: <b>${escape(e.nationality)}</b>`,
  ].filter(Boolean);
  const replySubject = encodeURIComponent(`Re: [${e.code}] Vietlook Travel`);

  const customerCard = panel(
    `<p class="mu" style="margin:0 0 4px;font-family:${FONT};font-size:11px;line-height:15px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:${C.muted}">Khách hàng</p>
<p class="tx" style="margin:0 0 6px;font-family:${FONT};font-size:20px;line-height:27px;font-weight:700;color:${C.navy};word-break:break-word">${escape(name)}</p>
${contactLines.length ? `<p class="tx" style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:22px;color:${C.ink}">${contactLines.join(` <span style="color:#a9b7c3">&nbsp;·&nbsp;</span> `)}</p>` : ""}
${pills([
  phone && { href: telHref(phone), label: "Gọi điện", bg: C.brand, color: "#ffffff" },
  wa && { href: `https://wa.me/${wa}`, label: "WhatsApp", bg: "#ffffff", color: C.brandDark },
  wa && { href: `https://zalo.me/${wa}`, label: "Zalo", bg: "#ffffff", color: C.brandDark },
  email && {
    href: `mailto:${email}?subject=${replySubject}`,
    label: "Gửi email",
    bg: "#ffffff",
    color: C.brandDark,
  },
])}
${customerLang !== "vi" ? `<p class="mu" style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:19px;color:${C.muted}">Khách dùng trang <b>${escape(langName)}</b> — nên trả lời bằng ${escape(langName.replace(/^T/, "t"))}.</p>` : ""}`,
    { bg: C.brandSoft },
  );

  const meta = [
    { key: "createdAt", label: fieldLabel("createdAt", lang), text: sent },
    { key: "lang", label: fieldLabel("lang", lang), text: langName },
    e.page && {
      key: "page",
      label: fieldLabel("page", lang),
      text: String(e.page).replace(/^https?:\/\/[^/]+/, "") || "/",
    },
  ].filter(Boolean);

  const body = [
    section(customerCard, { top: 30 }),
    facts.length ? section(`${heading("Thông tin chính")}${factGrid(facts)}`, { top: 30 }) : "",
    price
      ? section(
          `${heading("Giá tạm tính")}${priceTable(price.lines, "Tổng tạm tính", price.total, "Tính theo bảng giá trong trang quản trị tại thời điểm khách gửi.")}`,
          { top: 30 },
        )
      : "",
    ...long.map((l) =>
      section(
        `${heading(l.label === "Lời nhắn" ? "Lời nhắn của khách" : l.label)}${quote(l.text)}`,
        { top: 30 },
      ),
    ),
    section(`${heading("Chi tiết")}${detailTable([...rows, ...meta])}`, { top: 30 }),
    section(
      `${button(link, "Mở trong trang quản trị")}${email ? `<p class="mu" style="margin:14px 0 0;text-align:center;font-family:${FONT};font-size:13px;line-height:19px;color:${C.muted}">Bấm <b>Trả lời</b> trong hộp thư để email thẳng cho khách.</p>` : ""}`,
      { top: 26, bottom: 32 },
    ),
  ].join("\n");

  const html = shell({
    lang,
    title: subject,
    preheader: `${name}${headFact ? ` · ${headFact}` : ""}${phone ? ` · ${phone}` : ""}`,
    hero: hero({
      eyebrow: `${typeLabel(e.type, "vi")} · ${sent}`,
      title: headline,
      text: `Từ <b style="color:#ffffff">${escape(name)}</b>${headFact ? ` · ${escape(firstLine(headFact, 70))}` : ""}`,
      codeLabel: "Mã yêu cầu",
      code: e.code,
    }),
    body,
    footer: footerRow(
      `<p class="mu" style="margin:0 auto;max-width:440px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint}">Email tự động từ website Vietlook Travel, gửi tới email nhận thông báo trong <b>Cài đặt</b> của trang quản trị.</p>`,
    ),
  });

  const text = [
    `${headline} — ${e.code}`,
    "",
    `Khách hàng: ${name}`,
    phone ? `Điện thoại: ${phone}` : null,
    email ? `Email: ${email}` : null,
    e.nationality ? `Quốc tịch: ${e.nationality}` : null,
    "",
    ...[...facts, ...rows, ...meta].map((r) => `${r.label}: ${r.text}`),
    ...(price
      ? [
          "",
          "Giá tạm tính:",
          ...price.lines.map((l) => `  ${l.label}: ${l.amount}`),
          `  Tổng: ${price.total}`,
        ]
      : []),
    ...long.flatMap((l) => ["", `${l.label}:`, l.text]),
    "",
    `Mở trong trang quản trị: ${link}`,
  ]
    .filter((x) => x != null)
    .join("\n");

  return { subject, html, text };
}

/** Dùng cho test / xem trước: định dạng 1 giá trị lẻ */
export const formatField = (key, value, lang = "vi", type) =>
  formatValue(key, value, { lang: pickLang(lang), type });
