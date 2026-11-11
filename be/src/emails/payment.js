import { fmtDate, fmtDateTime, fmtMoney, pickLang } from "./format.js";
import { COMPANY } from "./labels.js";
import {
  C,
  FONT,
  SPACE,
  button,
  codeBox,
  escape,
  p,
  shell,
  subhead,
  table,
  title,
} from "./layout.js";
import { adminLink, firstLine } from "./templates.js";

/**
 * Email khi khách thanh toán online thành công (9Pay) — cùng khung với email đơn mới (layout.js):
 *  - paymentCustomerEmail: biên nhận cho khách (en / zh / vi theo ngôn ngữ khách dùng).
 *  - paymentCompanyEmail: báo nhân viên (tiếng Việt).
 */

/** 2550000 → "2.550.000 ₫" */
export const fmtVnd = (n) => `${Math.round(Number(n) || 0).toLocaleString("vi-VN")} ₫`;

const T = {
  en: {
    subject: (e, deposit) =>
      deposit ? `Deposit received for booking ${e.code}` : `Payment received for booking ${e.code}`,
    preheader: (amount) => `We have received your payment of ${amount}. Thank you!`,
    hello: (n) => `Dear ${n},`,
    lead: (deposit) =>
      deposit
        ? "Thank you – we have received your deposit. Your booking request is now secured."
        : "Thank you – we have received your payment in full.",
    codeLabel: "Your booking code",
    receipt: "Payment receipt",
    tour: "Tour",
    date: "Departure",
    paid: "Amount paid",
    usd: "Equivalent",
    paidAt: "Paid on",
    txn: "Transaction ID",
    remaining: "Balance to pay later",
    next: "What happens next",
    nextText:
      "Our travel expert will send your final booking confirmation within 24 hours. Keep this email as your receipt.",
    questions: "Questions? Simply reply to this email or chat with us on WhatsApp.",
    whatsapp: "Chat on WhatsApp",
    signoff: "Warm regards,",
    team: "The Vietlook Travel team",
  },
  zh: {
    subject: (e, deposit) => (deposit ? `预订 ${e.code} 定金已收到` : `预订 ${e.code} 付款已收到`),
    preheader: (amount) => `我们已收到您的付款 ${amount}，谢谢！`,
    hello: (n) => `${n}，您好！`,
    lead: (deposit) =>
      deposit
        ? "感谢您！我们已收到您的定金，您的预订已为您保留。"
        : "感谢您！我们已收到您的全额付款。",
    codeLabel: "您的预订编号",
    receipt: "付款凭证",
    tour: "线路",
    date: "出发日期",
    paid: "已付金额",
    usd: "约合",
    paidAt: "付款时间",
    txn: "交易编号",
    remaining: "待付余款",
    next: "接下来",
    nextText: "旅行顾问将在24小时内发送最终预订确认。请保留此邮件作为付款凭证。",
    questions: "有任何问题？直接回复此邮件，或通过 WhatsApp 联系我们。",
    whatsapp: "WhatsApp 联系我们",
    signoff: "此致敬礼，",
    team: "Vietlook Travel 团队",
  },
  vi: {
    subject: (e, deposit) =>
      deposit ? `Đã nhận tiền đặt cọc cho đơn ${e.code}` : `Đã nhận thanh toán cho đơn ${e.code}`,
    preheader: (amount) => `Vietlook Travel đã nhận ${amount}. Cảm ơn bạn!`,
    hello: (n) => `Xin chào ${n},`,
    lead: (deposit) =>
      deposit
        ? "Cảm ơn bạn! Chúng tôi đã nhận tiền đặt cọc, chỗ của bạn đã được giữ."
        : "Cảm ơn bạn! Chúng tôi đã nhận đủ tiền thanh toán.",
    codeLabel: "Mã đặt tour của bạn",
    receipt: "Biên nhận thanh toán",
    tour: "Tour",
    date: "Ngày khởi hành",
    paid: "Số tiền đã trả",
    usd: "Tương đương",
    paidAt: "Thời gian",
    txn: "Mã giao dịch",
    remaining: "Còn lại thanh toán sau",
    next: "Tiếp theo",
    nextText:
      "Chuyên viên tư vấn sẽ gửi xác nhận đặt tour chính thức trong vòng 24 giờ. Hãy giữ email này làm biên nhận.",
    questions: "Có câu hỏi? Bạn chỉ cần trả lời email này hoặc nhắn cho chúng tôi qua WhatsApp.",
    whatsapp: "Nhắn qua WhatsApp",
    signoff: "Trân trọng,",
    team: "Đội ngũ Vietlook Travel",
  },
};

/** Tiền còn lại (USD) sau các lượt đã trả */
const remainingUsd = (e) => {
  const total = Number(e.estimate?.total) || 0;
  const paid = (e.payments ?? [])
    .filter((x) => x.status === "paid")
    .reduce((s, x) => s + (Number(x.amountUsd) || 0), 0);
  return Math.max(0, Math.round((total - paid) * 100) / 100);
};

export function paymentCustomerEmail(e, attempt) {
  const lang = pickLang(e.lang);
  const t = T[lang];
  const deposit = e.paymentStatus === "deposit";
  const amount = fmtVnd(attempt.amount);
  const rest = remainingUsd(e);
  const rows = [
    e.tour?.title && { label: t.tour, text: e.tour.title },
    e.departureDate && { label: t.date, text: fmtDate(e.departureDate, lang) },
    { label: t.paid, text: amount, strong: true },
    attempt.amountUsd && { label: t.usd, text: fmtMoney(attempt.amountUsd) },
    { label: t.paidAt, text: fmtDateTime(attempt.paidAt ?? new Date(), lang) },
    attempt.transactionId && { label: t.txn, text: attempt.transactionId },
    deposit && rest > 0 && { label: t.remaining, text: fmtMoney(rest) },
  ].filter(Boolean);
  const name = String(e.name ?? "").trim();
  const body = [
    p(escape(t.hello(name)), { margin: `0 0 ${SPACE.para}px` }),
    p(escape(t.lead(deposit)), { margin: "0 0 24px" }),
    codeBox(t.codeLabel, e.code),
    subhead(t.receipt),
    table(rows),
    subhead(t.next),
    p(escape(t.nextText), { margin: "0" }),
    p(escape(t.questions), { margin: "24px 0 0" }),
    button(COMPANY.whatsapp, t.whatsapp, { top: 16 }),
    p(`${escape(t.signoff)}<br>${escape(t.team)}`, { margin: `${SPACE.section}px 0 0` }),
  ].join("\n");
  const footer = `<p class="mu" style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted}"><b>${escape(COMPANY.legalName[lang])}</b><br>${escape(COMPANY.address[lang])}</p>`;
  const subject = t.subject(e, deposit);
  const html = shell({ lang, title: subject, preheader: t.preheader(amount), body, footer });
  const text = [
    t.hello(name),
    "",
    t.lead(deposit),
    "",
    `${t.codeLabel}: ${e.code}`,
    "",
    `${t.receipt}:`,
    ...rows.map((r) => `- ${r.label}: ${r.text}`),
    "",
    `${t.next}:`,
    t.nextText,
    "",
    t.questions,
    `WhatsApp: ${COMPANY.whatsapp}`,
    "",
    t.signoff,
    t.team,
    "",
    "--",
    COMPANY.legalName[lang],
    COMPANY.address[lang],
  ].join("\n");
  return { subject, html, text, headers: { "X-Entity-Ref-ID": `${e.code}-${attempt.invoiceNo}` } };
}

export function paymentCompanyEmail(e, attempt) {
  const deposit = e.paymentStatus === "deposit";
  const amount = fmtVnd(attempt.amount);
  const name = String(e.name ?? "").trim();
  const headline = deposit ? "Khách đã đặt cọc" : "Khách đã thanh toán";
  const subject = `${headline} ${amount} – ${e.code} – ${firstLine(name, 40)}`;
  const rest = remainingUsd(e);
  const rows = [
    { label: "Khách hàng", text: name },
    e.tour?.title && { label: "Tour", text: e.tour.title },
    e.departureDate && { label: "Ngày khởi hành", text: fmtDate(e.departureDate, "vi") },
    { label: "Số tiền", text: amount, strong: true },
    attempt.amountUsd && {
      label: "Tương đương",
      text: `${fmtMoney(attempt.amountUsd)} (tỷ giá ${Math.round(attempt.rate || 0).toLocaleString("vi-VN")}đ)`,
    },
    e.estimate?.total && { label: "Tổng giá tạm tính", text: fmtMoney(e.estimate.total) },
    deposit && rest > 0 && { label: "Còn lại", text: fmtMoney(rest) },
    { label: "Thời gian", text: fmtDateTime(attempt.paidAt ?? new Date(), "vi") },
    attempt.transactionId && { label: "Mã giao dịch 9Pay", text: attempt.transactionId },
    { label: "Mã hoá đơn", text: attempt.invoiceNo },
  ].filter(Boolean);
  const link_ = adminLink(e);
  const body = [
    title(`${headline} –`, e.code),
    p("Tiền về tài khoản 9Pay của công ty. Đơn đã tự cập nhật trạng thái thanh toán.", {
      size: 14,
      muted: true,
      margin: "0 0 24px",
      align: "center",
    }),
    table(rows),
    button(link_, "Mở trong trang quản trị"),
  ].join("\n");
  const html = shell({ lang: "vi", title: subject, preheader: `${name} · ${amount}`, body });
  const text = [
    `${headline} – ${e.code}`,
    "",
    ...rows.map((r) => `${r.label}: ${r.text}`),
    "",
    `Mở trong trang quản trị: ${link_}`,
  ].join("\n");
  return {
    subject,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `${e.code}-${attempt.invoiceNo}`,
      "Auto-Submitted": "auto-generated",
    },
  };
}
