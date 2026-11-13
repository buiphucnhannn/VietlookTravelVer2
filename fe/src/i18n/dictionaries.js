import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getReviewStats } from "@/lib/catalog";
import { fillReviewStats } from "@/lib/review-stats";
import { hasLocale } from "./config";

const dictionaries = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  zh: () => import("./dictionaries/zh").then((m) => m.default),
  vi: () => import("./dictionaries/vi").then((m) => m.default),
};

/**
 * Bộ chữ giao diện theo ngôn ngữ. Các ô {taLabel} {taCount} {gScore}… (điểm & số lượt đánh giá Tripadvisor /
 * Google) được điền sẵn từ CMS → Cài đặt (lib/review-stats.js); `dict.reviewStats` = số liệu gốc
 * { tripadvisor, google } cho các khối cần số / link (huy hiệu banner, số sao, chân trang…).
 * Mỗi request chỉ dựng 1 lần cho mỗi ngôn ngữ.
 */
const load = cache(async (lang) => {
  const [dict, reviewStats] = await Promise.all([dictionaries[lang](), getReviewStats()]);
  return { ...fillReviewStats(dict, reviewStats, lang), reviewStats };
});

export async function getDictionary(lang) {
  if (!hasLocale(lang)) notFound();
  return load(lang);
}
