// Cấu hình đa ngôn ngữ dùng chung cho server & client.
export const locales = ["en", "zh"];
export const defaultLocale = "en";

export const localeMeta = {
  en: { label: "English", short: "EN", hreflang: "en", ogLocale: "en_US", flag: "🇬🇧" },
  zh: { label: "简体中文", short: "中文", hreflang: "zh-Hans", ogLocale: "zh_CN", flag: "🇨🇳" },
};

export const hasLocale = (value) => locales.includes(value);

/** Lấy bản dịch từ object `{ en, zh }`; thiếu tiếng Trung thì dùng tiếng Anh. */
export function tr(value, lang) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) return value;
  return value[lang] ?? value[defaultLocale] ?? "";
}

/**
 * Tiền tố URL của ngôn ngữ: tiếng Anh (mặc định) nằm ở gốc như website cũ ("" → /car-rental),
 * tiếng Trung có tiền tố "/zh" (→ /zh/car-rental). proxy.js rewrite nội bộ sang /en/... khi render.
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
