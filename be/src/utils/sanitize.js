import sanitizeHtml from "sanitize-html";

/**
 * Lọc HTML nhập từ CMS (lịch trình tour, nội dung bài viết, trang chính sách) trước khi lưu:
 * chỉ giữ thẻ định dạng an toàn → chặn XSS (script, onerror=, javascript:...) dù tài khoản CMS bị lộ.
 * Cho phép nhúng iframe YouTube (bài viết / tour có video).
 */
const OPTIONS = {
  allowedTags: [
    "p",
    "br",
    "hr",
    "h2",
    "h3",
    "h4",
    "h5",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "mark",
    "sub",
    "sup",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "caption",
    "span",
    "div",
    "iframe",
    "code",
    "pre",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    iframe: ["src", "width", "height", "title", "allow", "allowfullscreen", "frameborder"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan", "scope"],
    "*": ["style", "class"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
      color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
      "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
    },
  },
  allowedSchemes: ["https", "http", "mailto", "tel"],
  // Ảnh trong nội dung chỉ từ kho ảnh của website (Cloudinary) hoặc ảnh có sẵn — ảnh ngoài phải qua
  // "chèn ảnh từ link" (chép về Cloudinary). Không nhận data: (ảnh nhúng nặng, có thể giấu SVG).
  allowedSchemesByTag: { img: ["https"] },
  exclusiveFilter: (frame) =>
    frame.tag === "img" &&
    !/^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//.test(frame.attribs.src ?? "") &&
    !/^\/images\/[\w./-]+$/.test(frame.attribs.src ?? ""),
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // Khung nhúng: chỉ video YouTube / Vimeo / Google Drive
  allowedIframeHostnames: [
    "www.youtube.com",
    "www.youtube-nocookie.com",
    "player.vimeo.com",
    "drive.google.com",
  ],
  allowProtocolRelative: false,
  // link mở tab mới luôn kèm rel an toàn
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs:
        attribs.target === "_blank" ? { ...attribs, rel: "noopener noreferrer nofollow" } : attribs,
    }),
  },
};

export const cleanHtml = (html) => (html ? sanitizeHtml(String(html), OPTIONS) : "");

/** Chữ thuần: bỏ mọi thẻ HTML */
export const stripTags = (html) =>
  sanitizeHtml(String(html ?? ""), { allowedTags: [], allowedAttributes: {} }).trim();
