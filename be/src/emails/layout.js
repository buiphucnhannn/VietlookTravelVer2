import { env } from "../config/env.js";

/**
 * Khung HTML email dùng chung: bảng lồng nhau + style inline (Gmail, Outlook, Apple Mail, điện thoại),
 * rộng tối đa 600px (nội dung ~552px), có màu cho chế độ tối, preheader ẩn.
 * Bố cục: phần tiêu đề, tiêu đề mục, thẻ thông tin, các bước, nút, chân email căn giữa;
 * bảng chi tiết giữ nhãn trái – giá trị phải. Mọi chữ đưa vào đều phải qua escape().
 */

export const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/** Chữ nhiều dòng (lời nhắn của khách) → escape + xuống dòng */
export const multiline = (s) =>
  escape(
    String(s ?? "")
      .replace(/<\/?[a-z][^<>]*>/gi, "") // đơn cũ còn thẻ HTML khách gõ → bỏ thẻ, không hiện nguyên văn
      .trim(),
  ).replace(/\r?\n/g, "<br>");

/** Màu thương hiệu (fe/src/app/globals.css) */
export const C = {
  navy: "#0a253c",
  navy2: "#0f4870",
  brand: "#1780c1",
  brandDark: "#0f6aa6",
  brandSoft: "#eef7fd",
  headBg: "#e8f2fa",
  red: "#ee3b35",
  amber: "#f7b32b",
  amberSoft: "#fff6e0",
  ink: "#22323d",
  muted: "#5b6b77",
  faint: "#8696a3",
  line: "#e3eaf0",
  soft: "#f5f8fb",
  page: "#eef3f7",
};

export const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";

/** Lề trái/phải của nội dung (600 − 2×24 = 552px) */
const PX = 24;

/** Logo trên Cloudinary (ảnh /images/logo/vietlook-logo.png của website — xem fe/src/lib/image-loader.js) */
export const logoUrl = () =>
  `https://res.cloudinary.com/${env.cloudinary.cloudName || "dzpmroj28"}/image/upload/f_png,q_auto,w_360/v1/${env.cloudinary.folder || "vietlook"}/site/images/logo/vietlook-logo`;

const CSS = `
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0;mso-table-rspace:0}
img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
a{color:${C.brand}}
@media only screen and (max-width:560px){
  .wrap{padding:0!important}
  .card{border-radius:0!important;border-left:0!important;border-right:0!important}
  .px{padding-left:18px!important;padding-right:18px!important}
  .hero{padding:28px 18px 26px!important}
  .head-px{padding-left:12px!important;padding-right:12px!important}
  .h1{font-size:23px!important;line-height:31px!important}
  .col{display:block!important;width:100%!important;box-sizing:border-box;margin:0 0 10px 0!important}
  .gap{display:none!important;width:0!important}
  .lbl{width:42%!important}
}
@media (prefers-color-scheme:dark){
  .bg{background:#0b1620!important}
  .card{background:#111f2b!important;border-color:#22374a!important}
  .tx{color:#e8eef3!important}
  .mu{color:#9fb1c1!important}
  .soft{background:#16293a!important;border-color:#22374a!important}
  .zebra{background:#142534!important}
  .bd{border-color:#22374a!important}
  .lnk{color:#6cb8ea!important}
  .head{background:#16293a!important;background-image:none!important}
  .hero{background:#0f3a5c!important}
}
[data-ogsc] .tx{color:#e8eef3!important}
[data-ogsc] .mu{color:#9fb1c1!important}
`;

/**
 * @param {object} o
 * @param {string} o.lang      vi | en | zh (thuộc tính lang của trang)
 * @param {string} o.title     <title>
 * @param {string} o.preheader dòng xem trước trong hộp thư (ẩn trong email)
 * @param {string} o.hero      HTML phần tiêu đề (đã escape)
 * @param {string} o.body      HTML nội dung (đã escape)
 * @param {string} o.footer    HTML chân email (đã escape)
 */
export function shell({ lang, title, preheader, hero, body, footer }) {
  const htmlLang = lang === "zh" ? "zh-CN" : lang;
  return `<!doctype html>
<html lang="${escape(htmlLang)}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escape(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>table,td,a,p,span,h1{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
<style>${CSS}</style>
</head>
<body class="bg" style="margin:0;padding:0;width:100%;background:${C.page};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.page}">${escape(preheader)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>
<!--DEV_BANNER-->
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
<tr><td class="wrap" align="center" style="padding:28px 12px 36px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${C.line};border-radius:20px;overflow:hidden;box-shadow:0 6px 28px rgba(10,37,60,.08);font-family:${FONT}">
<tr><td class="head" align="center" bgcolor="${C.headBg}" style="background:${C.headBg};padding:26px ${PX}px 20px">
<a href="${escape(env.siteUrl)}" target="_blank" style="text-decoration:none"><img src="${escape(logoUrl())}" width="124" height="65" alt="Vietlook Travel" style="display:block;margin:0 auto;width:124px;height:auto;max-width:124px;border:0;font-family:${FONT};font-size:20px;font-weight:700;color:${C.brand}"></a>
</td></tr>
${hero}
${body}
${footer}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/** Phần tiêu đề căn giữa: nền xanh đậm chuyển màu nhẹ, nhãn nhỏ + tiêu đề + mô tả + mã yêu cầu (+ chú thích) */
export function hero({ eyebrow, title, text, codeLabel, code, caption }) {
  return `<tr><td class="head head-px" bgcolor="${C.headBg}" style="background:${C.headBg};background-image:linear-gradient(180deg,${C.headBg} 0%,${C.headBg} 55%,#ffffff 55%,#ffffff 100%);padding:0 ${PX}px 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr>
<td class="hero" align="center" bgcolor="${C.navy2}" style="background:${C.navy2};background-image:linear-gradient(135deg,${C.navy} 0%,${C.navy2} 55%,${C.brandDark} 100%);border-radius:18px;box-shadow:0 8px 24px rgba(10,37,60,.18);padding:34px 32px 30px;text-align:center">
<!--[if mso]><table role="presentation" width="470" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center"><![endif]-->
<div style="max-width:470px;margin:0 auto">
${eyebrow ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 14px"><tr><td style="background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:5px 14px;font-family:${FONT};font-size:11px;line-height:15px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:#ffffff">${escape(eyebrow)}</td></tr></table>` : ""}
<h1 class="h1" style="margin:0;font-family:${FONT};font-size:26px;line-height:34px;font-weight:700;color:#ffffff;word-break:break-word">${escape(title)}</h1>
${text ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:#e1ebf3">${text}</p>` : ""}
${
  code
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0"><tr>
<td align="center" bgcolor="#ffffff" style="background:#ffffff;border-radius:14px;padding:12px 24px;border-bottom:3px solid ${C.amber};text-align:center">
<span style="display:block;font-family:${FONT};font-size:11px;line-height:15px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:${C.muted}">${escape(codeLabel)}</span>
<span style="display:block;margin-top:3px;font-family:${MONO};font-size:21px;line-height:28px;font-weight:700;letter-spacing:1px;color:${C.navy};white-space:nowrap">${escape(code)}</span>
</td></tr></table>
${caption ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:#d3e1ec">${escape(caption)}</p>` : ""}`
    : ""
}
</div>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</td></tr>`;
}

/** Một khối nội dung có lề chuẩn */
export const section = (inner, { top = 30, bottom = 0, align = "left" } = {}) =>
  `<tr><td class="px" align="${align}" style="padding:${top}px ${PX}px ${bottom}px;font-family:${FONT};text-align:${align}">${inner}</td></tr>`;

/** Tiêu đề mục căn giữa + gạch nhấn ngắn */
export const heading = (text) =>
  `<p class="tx" style="margin:0;text-align:center;font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;color:${C.navy}">${escape(text)}</p>
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 16px"><tr><td width="28" height="3" bgcolor="${C.amber}" style="width:28px;height:3px;background:${C.amber};border-radius:2px;font-size:0;line-height:0">&nbsp;</td></tr></table>`;

export const paragraph = (
  html,
  { size = 15, color = C.ink, margin = "0 0 14px", align = "left" } = {},
) =>
  `<p class="${color === C.ink ? "tx" : "mu"}" style="margin:${margin};text-align:${align};font-family:${FONT};font-size:${size}px;line-height:${Math.round(size * 1.6)}px;color:${color}">${html}</p>`;

/** Thẻ nền nhạt bo góc (khối liên hệ, hỗ trợ…) */
export const panel = (inner, { bg = C.soft, align = "center", pad = "22px 22px" } = {}) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="soft" align="${align}" bgcolor="${bg}" style="background:${bg};border:1px solid ${C.line};border-radius:16px;padding:${pad};text-align:${align};font-family:${FONT}">${inner}</td></tr></table>`;

/** Lưới "thông tin chính" 2 cột, thẻ cùng chiều cao trong 1 hàng, chữ căn giữa (1 cột trên điện thoại) */
export function factGrid(facts) {
  if (!facts.length) return "";
  const cell = (f, span) =>
    `<td class="col soft" ${span ? 'colspan="3"' : 'width="49%"'} align="center" valign="middle" bgcolor="${C.soft}" style="background:${C.soft};border:1px solid ${C.line};border-radius:14px;padding:14px 14px 15px;text-align:center">
<span class="mu" style="display:block;font-family:${FONT};font-size:11px;line-height:15px;letter-spacing:1.1px;text-transform:uppercase;font-weight:700;color:${C.muted}">${escape(f.label)}</span>
<span class="tx" style="display:block;margin-top:5px;font-family:${FONT};font-size:16px;line-height:23px;font-weight:700;color:${C.navy};word-break:break-word">${escape(f.text)}</span>
</td>`;
  const rows = [];
  for (let i = 0; i < facts.length; i += 2) {
    if (i)
      rows.push(
        `<tr><td class="gap" colspan="3" height="10" style="height:10px;font-size:0;line-height:0">&nbsp;</td></tr>`,
      );
    if (i === facts.length - 1) rows.push(`<tr>${cell(facts[i], true)}</tr>`);
    else
      rows.push(
        `<tr>${cell(facts[i])}<td class="gap" width="2%" style="font-size:0;line-height:0">&nbsp;</td>${cell(facts[i + 1])}</tr>`,
      );
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate">${rows.join("")}</table>`;
}

/** Bảng chi tiết: nhãn trái – giá trị phải, hàng xen kẽ nền nhạt */
export function detailTable(rows) {
  if (!rows.length) return "";
  const tr = rows
    .map((r, i) => {
      const zebra = i % 2 === 0;
      const bg = zebra ? `background:${C.soft};` : "";
      return `<tr>
<td class="lbl mu${zebra ? " zebra" : ""}" width="40%" valign="top" style="${bg}padding:11px 14px;font-family:${FONT};font-size:14px;line-height:21px;color:${C.muted}">${escape(r.label)}</td>
<td class="tx${zebra ? " zebra" : ""}" valign="top" style="${bg}padding:11px 14px;font-family:${FONT};font-size:14px;line-height:21px;font-weight:600;color:${C.ink};word-break:break-word">${r.html ?? escape(r.text)}</td>
</tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bd" style="border:1px solid ${C.line};border-radius:14px;border-collapse:separate;overflow:hidden">${tr}</table>`;
}

/** Bảng giá tạm tính: các dòng + tổng nổi bật */
export function priceTable(lines, totalLabel, totalText, note) {
  const rows = lines
    .map(
      (l) => `<tr>
<td class="tx bd" style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;line-height:20px;color:${C.ink}">${escape(l.label)}</td>
<td class="tx bd" align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;line-height:20px;color:${C.ink};white-space:nowrap">${escape(l.amount)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bd" style="border:1px solid ${C.line};border-radius:14px;border-collapse:separate"><tr><td style="padding:6px 18px 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr>
<tr><td class="soft" bgcolor="${C.amberSoft}" style="background:${C.amberSoft};border-radius:0 0 14px 14px;padding:14px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="tx" style="font-family:${FONT};font-size:15px;line-height:22px;font-weight:700;color:${C.navy}">${escape(totalLabel)}</td>
<td class="tx" align="right" style="font-family:${FONT};font-size:22px;line-height:26px;font-weight:700;color:${C.navy};white-space:nowrap">${escape(totalText)}</td>
</tr></table>
</td></tr></table>
${note ? `<p class="mu" style="margin:10px 0 0;text-align:center;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted}">${escape(note)}</p>` : ""}`;
}

/** Trích lời nhắn của khách (chữ căn trái để dễ đọc) */
export function quote(text) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="zebra tx" bgcolor="${C.soft}" style="background:${C.soft};border-left:4px solid ${C.amber};border-radius:4px 14px 14px 4px;padding:16px 18px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.ink};word-break:break-word">${multiline(text)}</td>
</tr></table>`;
}

/** Các bước tiếp theo: thẻ có số thứ tự, căn giữa (3 cột; xếp dọc trên điện thoại) */
export function stepCards(list) {
  const cells = list.map(
    (
      s,
      i,
    ) => `<td class="col" width="32%" valign="top" align="center" style="padding:0 4px;text-align:center">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 10px"><tr><td align="center" valign="middle" width="34" height="34" bgcolor="${C.brand}" style="width:34px;height:34px;background:${C.brand};border-radius:17px;font-family:${FONT};font-size:15px;line-height:34px;font-weight:700;color:#ffffff;text-align:center">${i + 1}</td></tr></table>
<p class="tx" style="margin:0;font-family:${FONT};font-size:14px;line-height:21px;color:${C.ink}">${escape(s)}</p>
</td>`,
  );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells.join(`<td class="gap" width="2%" style="font-size:0;line-height:0">&nbsp;</td>`)}</tr></table>`;
}

/** Nút chính căn giữa (bảng — hiện đúng cả trên Outlook) */
export function button(href, label, { bg = C.brand, color = "#ffffff" } = {}) {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
<td align="center" bgcolor="${bg}" style="background:${bg};border-radius:12px">
<a href="${escape(href)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:${color};text-decoration:none;border-radius:12px">${escape(label)}</a>
</td></tr></table>`;
}

/** Hàng nút nhỏ (gọi / WhatsApp / email) — nối tiếp nhau, tự xuống dòng, căn giữa */
export function pills(items, { align = "center" } = {}) {
  const list = items.filter(Boolean);
  if (!list.length) return "";
  return `<div style="font-size:0;line-height:0;text-align:${align}">${list
    .map(
      (p) =>
        `<a href="${escape(p.href)}" target="_blank" style="display:inline-block;margin:0 4px 8px;padding:10px 18px;background:${p.bg ?? C.brandSoft};border:1px solid ${p.bg && p.bg !== "#ffffff" ? p.bg : C.line};border-radius:999px;font-family:${FONT};font-size:14px;line-height:18px;font-weight:700;color:${p.color ?? C.brandDark};text-decoration:none;white-space:nowrap">${escape(p.label)}</a>`,
    )
    .join(" ")}</div>`;
}

export const divider = () =>
  `<tr><td class="px" style="padding:32px ${PX}px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="bd" style="border-top:1px solid ${C.line};font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>`;

/** Chân email căn giữa */
export const footerRow = (inner) =>
  `<tr><td class="px soft bd" align="center" bgcolor="${C.soft}" style="background:${C.soft};border-top:1px solid ${C.line};padding:28px ${PX}px 30px;text-align:center;font-family:${FONT}">${inner}</td></tr>`;
