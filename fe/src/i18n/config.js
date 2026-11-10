// Cấu hình đa ngôn ngữ dùng chung cho server & client.
export const locales = ["en", "zh", "vi"];
export const defaultLocale = "en";

export const localeMeta = {
  en: { label: "English", short: "EN", hreflang: "en", ogLocale: "en_US", flag: "🇬🇧" },
  zh: { label: "简体中文", short: "中文", hreflang: "zh-Hans", ogLocale: "zh_CN", flag: "🇨🇳" },
  vi: { label: "Tiếng Việt", short: "VI", hreflang: "vi", ogLocale: "vi_VN", flag: "🇻🇳" },
};

export const hasLocale = (value) => locales.includes(value);

/** Thứ tự ngôn ngữ thay thế khi thiếu bản dịch: ngôn ngữ đang xem → en → vi → zh */
export const fallbackLangs = (lang) => [...new Set([lang, "en", "vi", "zh"])];

/** Giá trị coi như "chưa nhập" (chuỗi trống / chỉ có thẻ HTML rỗng, mảng rỗng) */
export const isBlank = (v) =>
  v == null ||
  (typeof v === "string" && !v.replace(/<[^>]*>|&nbsp;/g, "").trim()) ||
  (Array.isArray(v) && v.length === 0);

/**
 * Lấy bản dịch từ object `{ en, zh, vi }`; thiếu bản dịch thì dùng ngôn ngữ khác đã có
 * (thứ tự en → vi → zh) để trang không bao giờ trống.
 */
export function tr(value, lang) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) return value;
  for (const l of fallbackLangs(lang)) if (!isBlank(value[l])) return value[l];
  return value[lang] ?? value[defaultLocale] ?? "";
}

/**
 * Tiền tố URL của ngôn ngữ: tiếng Anh (mặc định) nằm ở gốc như website cũ ("" → /car-rental),
 * tiếng Trung / tiếng Việt có tiền tố "/zh", "/vi" (→ /zh/car-rental, /vi/car-rental). proxy.js rewrite nội bộ sang /en/... khi render.
 */
export const lp = (lang) => (lang === defaultLocale ? "" : `/${lang}`);

/** Ghép đường dẫn theo ngôn ngữ: href("en", "/tours") -> "/tours", href("zh", "/tours") -> "/zh/tours". */
export function href(lang, path = "/") {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${lp(lang)}${clean}` || "/";
}

/** Thay {name} trong chuỗi dịch. */
export function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "");
}

/** Bỏ tiền tố ngôn ngữ khỏi pathname: "/zh/tours" -> "/tours", "/tours" -> "/tours". */
export function stripLocale(pathname) {
  const parts = (pathname || "/").split("/");
  if (hasLocale(parts[1])) parts.splice(1, 1);
  return parts.join("/") || "/";
}

/** Đổi ngôn ngữ của một pathname hiện tại. */
export function switchLocalePath(pathname, nextLang) {
  return href(nextLang, stripLocale(pathname));
}
