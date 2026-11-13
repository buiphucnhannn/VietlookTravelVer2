import { siteConfig } from "@/constants/site";

/**
 * Điểm & số lượt đánh giá của công ty (Tripadvisor / Google) — NGUỒN DUY NHẤT cho mọi chỗ hiện trên website
 * (chân trang, huy hiệu banner trang chủ, dải uy tín, khối đánh giá, "con số nổi bật", trang tour…).
 * Số lấy từ CMS → Cài đặt → "Điểm & số lượt đánh giá" (nhập tay hoặc máy chủ tự cập nhật mỗi ngày qua API),
 * qua /public/site (lib/catalog.js → getReviewStats). Mất kết nối / chưa có cài đặt → số dự phòng dưới đây.
 *
 * Câu chữ trong từ điển (i18n/dictionaries/*) dùng ô thay thế, getDictionary() tự điền:
 *   {taLabel} Excellent / 优秀 / Xuất sắc (theo điểm) · {taScore} 5.0 · {taCount} 93
 *   {gScore} 4.7 · {gCount} 31
 * Dùng được cả ở trình duyệt (trang quản trị) — không import gì chỉ chạy ở server.
 */
export const REVIEW_STATS_FALLBACK = Object.freeze({
  tripadvisor: { rating: 5, count: 93, url: siteConfig.social.tripadvisor },
  google: { rating: 4.7, count: 31, url: siteConfig.social.google },
});

const okUrl = (u) => typeof u === "string" && /^https:\/\/[^\s<>"']+$/i.test(u);

/** Dữ liệu từ backend → luôn đủ trường, số hợp lệ (sai / thiếu → số dự phòng) */
export function normalizeReviewStats(raw) {
  const pick = (src) => {
    const d = REVIEW_STATS_FALLBACK[src];
    const v = raw?.[src] ?? {};
    const rating = Number(v.rating);
    const count = Number(v.count);
    return {
      rating: v.rating != null && rating >= 0 && rating <= 5 ? rating : d.rating,
      count: v.count != null && Number.isInteger(count) && count >= 0 ? count : d.count,
      url: okUrl(v.url) ? v.url : d.url,
    };
  };
  return { tripadvisor: pick("tripadvisor"), google: pick("google") };
}

/** Thang chữ của Tripadvisor (4.5–5 = Excellent) */
const WORDS = [
  [4.5, { en: "Excellent", zh: "优秀", vi: "Xuất sắc" }],
  [3.5, { en: "Very good", zh: "很好", vi: "Rất tốt" }],
  [2.5, { en: "Average", zh: "一般", vi: "Trung bình" }],
  [1.5, { en: "Poor", zh: "较差", vi: "Kém" }],
  [0, { en: "Terrible", zh: "很差", vi: "Rất tệ" }],
];
export const ratingWord = (rating, lang = "en") => {
  const w = WORDS.find(([min]) => rating >= min)?.[1] ?? WORDS[0][1];
  return w[lang] ?? w.en;
};

const LOCALES = { en: "en-US", zh: "zh-CN", vi: "vi-VN" };
/** 1234 → "1,234" (en/zh) · "1.234" (vi) */
export const formatCount = (n, lang = "en") =>
  Number(n || 0).toLocaleString(LOCALES[lang] ?? "en-US");
/** 5 → "5.0" (giữ dấu chấm ở mọi ngôn ngữ, như Tripadvisor / Google hiện) */
export const formatScore = (n) => Number(n || 0).toFixed(1);

/** Giá trị thay vào các ô {taLabel} {taScore} {taCount} {gScore} {gCount} */
export function reviewTokens(stats, lang = "en") {
  const s = normalizeReviewStats(stats);
  return {
    taLabel: ratingWord(s.tripadvisor.rating, lang),
    taScore: formatScore(s.tripadvisor.rating),
    taCount: formatCount(s.tripadvisor.count, lang),
    gScore: formatScore(s.google.rating),
    gCount: formatCount(s.google.count, lang),
  };
}

const TOKEN_RX = /\{(taLabel|taScore|taCount|gScore|gCount)\}/g;

/**
 * Điền số đánh giá vào chuỗi / mảng / object (duyệt sâu, trả bản mới — không sửa dữ liệu gốc).
 * Chỉ thay đúng 5 ô trên; các ô khác như {n}, {score} giữ nguyên cho fill() dùng sau.
 */
export function fillReviewStats(value, stats, lang = "en", tokens = reviewTokens(stats, lang)) {
  if (typeof value === "string")
    return value.includes("{") ? value.replace(TOKEN_RX, (_, k) => tokens[k]) : value;
  if (Array.isArray(value)) return value.map((v) => fillReviewStats(v, stats, lang, tokens));
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fillReviewStats(v, stats, lang, tokens)]),
    );
  return value;
}
