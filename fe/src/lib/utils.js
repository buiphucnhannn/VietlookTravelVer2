import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gộp className có điều kiện và xử lý xung đột class Tailwind. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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

export function formatDate(iso, lang = "en") {
  return new Intl.DateTimeFormat(dateLocale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
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
