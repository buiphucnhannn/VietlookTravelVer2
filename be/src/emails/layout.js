import { env } from "../config/env.js";

/**
 * Khung HTML email — đơn giản, 1 cột, nền trắng, 1 màu nhấn (xanh thương hiệu), vàng chỉ cho ô mã yêu cầu.
 * Bảng lồng nhau + style inline (Gmail, Outlook, Apple Mail), rộng tối đa 600px, an toàn chế độ tối,
 * điện thoại: bảng chi tiết xếp nhãn trên – giá trị dưới. Mọi chữ đưa vào đều phải qua escape().
 */

export const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/** Chữ nhiều dòng (lời nhắn của khách) → escape + xuống dòng */
export const multiline = (s) => escape(String(s ?? "").trim()).replace(/\r?\n/g, "<br>");

/**
 * Màu lấy đúng từ logo (fe/public/images/logo/*.png, đo bằng canvas):
 *  xanh chữ "VIETLOOK" + sóng: #1780c1 · đỏ chữ "TRAVEL": #ec1f27.
 * Xanh logo trên nền trắng chỉ 4.1:1 → chữ link nhỏ dùng sắc xanh đậm hơn cùng tông (đạt AA),
 * nút dùng chữ 18px đậm (chữ lớn, đạt AA). Đỏ chỉ là đường nhấn mảnh trên đầu thư.
 */
export const C = {
  brand: "#1780c1", // xanh logo
  brandText: "#0f6aa6", // xanh logo đậm hơn cho chữ link (5.6:1)
  red: "#ec1f27", // đỏ logo
  text: "#1f2d38",
  muted: "#66737e",
  line: "#e6ebf0",
  page: "#f3f5f7",
  codeBg: "#f2f8fc",
};

export const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif";

/** Logo trên Cloudinary (ảnh /images/logo/vietlook-logo.png của website — xem fe/src/lib/image-loader.js) */
export const logoUrl = () =>
  `https://res.cloudinary.com/${env.cloudinary.cloudName || "dzpmroj28"}/image/upload/f_png,q_auto,w_360/v1/${env.cloudinary.folder || "vietlook"}/site/images/logo/vietlook-logo`;

const CSS = `
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0;mso-table-rspace:0}
img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
a{color:${C.brandText}}
@media only screen and (max-width:560px){
  .outer{padding:0!important}
  .card{border-radius:0!important;border-left:0!important;border-right:0!important}
  .pad{padding-left:20px!important;padding-right:20px!important}
  .k,.v{display:block!important;width:100%!important;box-sizing:border-box}
  .k{padding:12px 0 2px!important}
  .v{padding:0 0 12px!important;border-top:0!important}
}
@media (prefers-color-scheme:dark){
  .bg{background:#0f171e!important}
  .card{background:#16212b!important;border-color:#26343f!important}
  .tx{color:#e6edf2!important}
  .mu{color:#a3b0bb!important}
  .ln{border-color:#26343f!important}
  .code{background:#132636!important}
  .cd{color:#6cb8ea!important}
  .q{background:#1c2a35!important}
  a{color:#6cb8ea!important}
  .btn,.btn a{color:#ffffff!important}
}
[data-ogsc] .tx{color:#e6edf2!important}
[data-ogsc] .mu{color:#a3b0bb!important}
`;

/** Khung email: logo nhỏ căn giữa + nội dung + chân email */
export function shell({ lang, title, preheader, body, footer }) {
  const htmlLang = lang === "zh" ? "zh-CN" : lang;
  return `<!doctype html>
<html lang="${escape(htmlLang)}" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
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
<body class="bg" style="margin:0;padding:0;width:100%;background:${C.page}">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.page}">${escape(preheader)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>
<!--DEV_BANNER-->
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
<tr><td class="outer" align="center" style="padding:24px 12px 32px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${C.line};border-top:3px solid ${C.red};border-radius:12px;font-family:${FONT}">
<tr><td align="center" style="padding:28px 32px 4px">
<a href="${escape(env.siteUrl)}" target="_blank" style="text-decoration:none"><img src="${escape(logoUrl())}" width="96" alt="Vietlook Travel" style="display:block;margin:0 auto;width:96px;height:auto;border:0;font-family:${FONT};font-size:18px;font-weight:700;color:${C.brand}"></a>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 36px;font-family:${FONT};text-align:left">
${body}
</td></tr>
${footer ? `<tr><td class="pad ln" style="padding:20px 40px 26px;border-top:1px solid ${C.line};font-family:${FONT};text-align:center" align="center">${footer}</td></tr>` : ""}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Nhịp khoảng cách (bội số 8): giữa các mục 32px · tiêu đề mục → nội dung 10px ·
 * giữa các đoạn trong 1 mục 12px · nhóm liền nhau 8px. Mọi p / td đều đặt margin rõ ràng.
 * Line-height: thân 1.6 · tiêu đề 1.3 · nhãn 1.4.
 */
export const SPACE = { section: 32, para: 12, tight: 8, head: 10 };

/** Tiêu đề 22px */
export const title = (text, nowrapTail = "") =>
  `<h1 class="tx" style="margin:0 0 4px;text-align:center;font-family:${FONT};font-size:22px;line-height:29px;font-weight:700;color:${C.text}">${escape(text)}${nowrapTail ? ` <span class="cd" style="white-space:nowrap;color:${C.brand}">${escape(nowrapTail)}</span>` : ""}</h1>`;

/** Đoạn văn 16px (html đã escape) */
export const p = (
  html,
  { margin = `0 0 ${SPACE.para}px`, size = 16, muted = false, align = "left" } = {},
) =>
  `<p class="${muted ? "mu" : "tx"}" style="margin:${margin};text-align:${align};font-family:${FONT};font-size:${size}px;line-height:${Math.round(size * 1.6)}px;color:${muted ? C.muted : C.text}">${html}</p>`;

/** Tiêu đề mục nhỏ */
export const subhead = (text) =>
  `<p class="tx" style="margin:${SPACE.section}px 0 ${SPACE.head}px;font-family:${FONT};font-size:17px;line-height:24px;font-weight:700;color:${C.text}">${escape(text)}</p>`;

/** Ô mã yêu cầu (căn giữa, nền xanh rất nhạt, viền xanh logo) */
export const codeBox = (label, code) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0"><tr>
<td class="code" align="center" bgcolor="${C.codeBg}" style="background:${C.codeBg};border:2px solid ${C.brand};border-radius:10px;padding:16px 12px;text-align:center">
<span class="mu" style="display:block;font-family:${FONT};font-size:13px;line-height:18px;color:${C.muted};margin:0">${escape(label)}</span>
<span class="cd" style="display:block;margin-top:4px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:22px;line-height:30px;font-weight:700;letter-spacing:1px;color:${C.brand}">${escape(code)}</span>
</td></tr></table>`;

/** Bảng 2 cột nhãn | giá trị (điện thoại: nhãn trên, giá trị dưới) */
export function table(rows) {
  if (!rows.length) return "";
  const tr = rows
    .map((r, i) => {
      const top = i ? `border-top:1px solid ${C.line};` : "";
      // nhãn 14px / giá trị 16px cùng line-height 24px + căn trên → dòng đầu thẳng hàng
      return `<tr>
<td class="k mu ln" width="34%" valign="top" style="${top}width:34%;min-width:120px;padding:11px 14px 11px 0;margin:0;font-family:${FONT};font-size:14px;line-height:24px;color:${C.muted}">${escape(r.label)}</td>
<td class="v tx ln" valign="top" style="${top}padding:11px 0;margin:0;font-family:${FONT};font-size:16px;line-height:24px;color:${C.text};${r.strong ? "font-weight:700;" : ""}word-break:break-word">${r.html ?? escape(r.text)}</td>
</tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="ln" style="border-top:1px solid ${C.line};border-bottom:1px solid ${C.line}">${tr}</table>`;
}

/** Lời nhắn của khách: đoạn trích đơn giản */
export const quote = (text) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="q tx" bgcolor="#f6f8fa" style="background:#f6f8fa;border-left:3px solid ${C.brand};padding:12px 16px;font-family:${FONT};font-size:16px;line-height:25px;color:${C.text};word-break:break-word">${multiline(text)}</td></tr></table>`;

/** Nút chính căn giữa */
export const button = (href, label, { top = SPACE.section } = {}) =>
  `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:${top}px auto 0"><tr>
<td class="btn" align="center" bgcolor="${C.brand}" style="background:${C.brand};border-radius:8px">
<a href="${escape(href)}" target="_blank" style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:18px;line-height:22px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${escape(label)}</a>
</td></tr></table>`;

/** Link chữ */
export const link = (href, label) =>
  `<a href="${escape(href)}" target="_blank" style="color:${C.brandText};text-decoration:underline">${escape(label)}</a>`;
