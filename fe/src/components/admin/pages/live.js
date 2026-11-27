"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { DEFAULT_CONTACT_VIEW, contactView } from "@/lib/contact.mjs";
import { fillReviewStats, normalizeReviewStats } from "@/lib/review-stats";
import { pageCopyOf } from "@/lib/page-copy/registry.mjs";
import { resolvePage } from "@/lib/page-copy/resolve.mjs";

/**
 * Dữ liệu website dùng thật cho các phần KHÔNG sửa ở trang Giới thiệu / chính sách (bản xem trước):
 * bộ chữ giao diện 3 ngôn ngữ (đã điền điểm đánh giá), đánh giá của khách, thông tin liên hệ,
 * chữ khối "Du lịch không rào cản". Lấy từ đúng các API công khai website đang dùng (/public/...).
 * Tải 1 lần cho cả phiên (mở nhiều trang liền nhau không tải lại); lỗi → dùng mặc định, không chặn việc sửa.
 */
let pending = null;
const safe = (path) =>
  api(path)
    .then((r) => r?.data)
    .catch(() => undefined);

function loadAll() {
  pending ??= Promise.all([
    import("@/i18n/dictionaries/en"),
    import("@/i18n/dictionaries/zh"),
    import("@/i18n/dictionaries/vi"),
    safe("/public/site"),
    safe("/public/reviews"),
    safe("/public/page-copy/access"),
  ])
    .then(([en, zh, vi, site, reviews, access]) => ({
      dicts: { en: en.default, zh: zh.default, vi: vi.default },
      site: site ?? {},
      reviews: Array.isArray(reviews) ? reviews : [],
      access: access ?? {},
    }))
    .catch((err) => {
      pending = null; // lần sau thử lại
      throw err;
    });
  return pending;
}

/**
 * `usePublicData(lang)` → null khi đang tải, sau đó:
 *   { dict, reviewsOn(place), contact, access }
 *   - dict: bộ chữ đúng ngôn ngữ (giống getDictionary của website)
 *   - reviewsOn("about"): đánh giá đang bật hiện ở trang đó (giống getReviews(place))
 *   - contact: giống getContactInfo() — hotline, email, WhatsApp…
 *   - access: chữ khối "Du lịch không rào cản" (giống getPageText("access"))
 */
export function usePublicData(lang) {
  const [raw, setRaw] = useState(null);
  useEffect(() => {
    let alive = true;
    loadAll()
      .then((r) => alive && setRaw(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    if (!raw) return null;
    const stats = normalizeReviewStats(raw.site.reviewStats);
    const dict = { ...fillReviewStats(raw.dicts[lang], stats, lang), reviewStats: stats };
    const accessEntry = pageCopyOf("access");
    let access = null;
    try {
      access = accessEntry ? resolvePage(accessEntry, raw.access, { dict, data: {} }, lang) : null;
    } catch {
      access = null;
    }
    let contact = DEFAULT_CONTACT_VIEW;
    try {
      contact = contactView(raw.site.contact);
    } catch {
      // giữ mặc định
    }
    return {
      dict,
      contact,
      access: access ?? dict.access,
      reviewsOn: (place) => raw.reviews.filter((r) => (r.showOn ?? []).includes(place)),
    };
  }, [raw, lang]);
}
