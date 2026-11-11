import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gộp className có điều kiện và xử lý xung đột class Tailwind. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Chuẩn hoá chữ để tìm kiếm: bỏ dấu tiếng Việt (đ → d), chữ thường, bỏ khoảng trắng & ký tự phân cách
 * → "ha noi" = "Hà Nội" = "hanoi". Dùng chung cho tìm tour trên website và các ô tìm trong CMS
 * (backend có bản tương ứng ở be/src/utils/search.js).
 */
export const foldSearch = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "");

/** Giá tour hiển thị bằng USD (khách quốc tế). */
export function formatUSD(value) {
  if (value == null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Locale định dạng ngày theo ngôn ngữ giao diện. */
export const dateLocale = (lang) => ({ zh: "zh-CN", vi: "vi-VN" })[lang] || "en-GB";

/** Ngày dạng "2025-05-01" (giờ UTC) → hiển thị đúng ngày ở mọi múi giờ (không lùi 1 ngày ở châu Mỹ, khớp server/trình duyệt) */
export function formatDate(iso, lang = "en") {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return ""; // thiếu ngày → bỏ trống (Intl báo lỗi với ngày không hợp lệ)
  return new Intl.DateTimeFormat(dateLocale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
