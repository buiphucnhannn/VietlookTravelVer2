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

/* Định dạng ngày: dùng lib/dates.js (mm/dd/yyyy cho mọi ngôn ngữ). */

export function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
