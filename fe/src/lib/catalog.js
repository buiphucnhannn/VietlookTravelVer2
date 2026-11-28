import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { BACKEND_URL, backendHeaders } from "@/config/urls.mjs";
import { normalizeReviewStats } from "@/lib/review-stats";
import { contactView } from "@/lib/contact.mjs";
import { buildCatalog, normalizePost, normalizeTour } from "@/lib/catalog-build";

export { readingTime, tourText } from "@/lib/catalog-build";

/**
 * Nội dung website lấy từ backend (be/) — quản lý trong CMS.
 * - Mỗi loại dữ liệu cache riêng theo thẻ (tours, destinations, themes, articles, taxonomy, services, pages,
 *   settings, reviews). CMS lưu xong gọi refreshPublicContent (lib/revalidate.js) → website hiện dữ liệu mới ngay.
 * - getCatalog() trả về đúng các hàm trước đây nằm trong src/data/* (allTours, toursByDestination,
 *   getDestination, allPosts…) → các trang giữ nguyên giao diện, chỉ đổi nguồn dữ liệu.
 * Chỉ chạy ở server (Server Components, sitemap, metadata).
 */
const API = `${BACKEND_URL}/api/v1/public`;

// Lúc BUILD backend có thể đang khởi động lại → lỗi tạm thời thì chờ rồi thử lại (~2 phút). Lúc chạy thật không chờ.
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";
const RETRY_DELAYS = IS_BUILD ? [5_000, 15_000, 30_000, 60_000] : [1_000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(API + path, {
        headers: { accept: "application/json", ...backendHeaders() },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 404) return null;
      if (res.status >= 500) throw Object.assign(new Error(`HTTP ${res.status}`), { retry: true });
      if (!res.ok) throw new Error(`Backend ${path} → HTTP ${res.status}`);
      return (await res.json()).data;
    } catch (err) {
      const transient = err.retry || err.name === "TimeoutError" || err.name === "TypeError";
      if (!transient || attempt >= RETRY_DELAYS.length) throw err;
      console.warn(`[vietlook] Backend chưa sẵn sàng (${path}: ${err.message}) — thử lại`);
      await sleep(RETRY_DELAYS[attempt]);
    }
  }
}

/* ---------- Tải dữ liệu (cache theo thẻ) ---------- */

async function loadTours() {
  "use cache";
  cacheTag("tours");
  cacheLife("hours");
  return (await get("/tours")) ?? [];
}

async function loadTour(slug) {
  "use cache";
  cacheTag("tours", `tour:${slug}`);
  cacheLife("hours");
  return get(`/tours/${encodeURIComponent(slug)}`);
}

async function loadDestinations() {
  "use cache";
  cacheTag("destinations");
  cacheLife("hours");
  return (await get("/destinations")) ?? [];
}

async function loadThemes() {
  "use cache";
  cacheTag("themes");
  cacheLife("hours");
  return (await get("/themes")) ?? [];
}

async function loadArticles() {
  "use cache";
  cacheTag("articles");
  cacheLife("hours");
  return (await get("/articles")) ?? [];
}

async function loadArticle(slug) {
  "use cache";
  cacheTag("articles", `article:${slug}`);
  cacheLife("hours");
  return get(`/articles/${encodeURIComponent(slug)}`);
}

async function loadTaxonomy() {
  "use cache";
  cacheTag("taxonomy");
  cacheLife("hours");
  return (await get("/taxonomy")) ?? { categories: [], authors: [] };
}

async function loadServices() {
  "use cache";
  cacheTag("services");
  cacheLife("hours");
  return (await get("/services")) ?? { cars: [], carAreas: [], visaTypes: [], fastTrack: [] };
}

async function loadPages() {
  "use cache";
  cacheTag("pages");
  cacheLife("hours");
  return (await get("/pages")) ?? [];
}

async function loadReviews() {
  "use cache";
  cacheTag("reviews");
  cacheLife("hours");
  return (await get("/reviews")) ?? [];
}

async function loadHome() {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  return (await get("/home")) ?? {};
}

async function loadSite() {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  return (await get("/site")) ?? { tracking: {} };
}

/**
 * Thanh toán online 9Pay (CMS → Cài đặt): { enabled, depositPercent, rate } — không có mã bí mật.
 * Cache ngắn (vài phút) + thẻ "settings" (CMS lưu → làm mới ngay). Lỗi → coi như tắt (đặt tour như cũ).
 */
async function loadPaymentConfig() {
  "use cache";
  cacheTag("settings", "payment");
  cacheLife("minutes");
  try {
    return (await get("/payment-config")) ?? { enabled: false };
  } catch {
    return { enabled: false };
  }
}
export const getPaymentConfig = cache(loadPaymentConfig);

/** Giao diện 1 trang công khai (CMS → Giao diện trang): các ô đã sửa — xem lib/page-copy/server.js */
async function loadPageCopy(key) {
  "use cache";
  cacheTag("pages", `page:${key}`);
  cacheLife("hours");
  return (await get(`/page-copy/${encodeURIComponent(key)}`)) ?? {};
}

/**
 * Phụ thu nhóm nhỏ (CMS → Cài đặt): { enabled, one, two, threeFour, fivePlus } — % theo số khách, chỉ áp dụng
 * cho tour chưa có bảng giá theo số khách. null = máy chủ chưa có cài đặt này → khung đặt tour không cộng.
 */
export const getSmallGroup = cache(async () => (await loadSite()).smallGroup ?? null);

/**
 * Điểm & số lượt đánh giá công ty (CMS → Đánh giá → Điểm & số lượt đánh giá) — { tripadvisor, google }:
 * { rating, count, url }. Thẻ "settings": CMS lưu / máy chủ tự cập nhật xong → website làm mới ngay.
 * Backend lỗi → số dự phòng trong lib/review-stats.js (website không bao giờ hỏng vì thiếu số này).
 */
export const getReviewStats = cache(async () => {
  try {
    return normalizeReviewStats((await loadSite()).reviewStats);
  } catch {
    return normalizeReviewStats(null);
  }
});

/** Mã đo lường Google nhập trong CMS (Cài đặt) — { gtmId, ga4Id, adsId } */
export const getTracking = cache(async () => (await loadSite()).tracking ?? {});

/** Trang chủ → "Hiển thị trên Google" nhập trong CMS ({ en, zh, vi } × { title, description }) — null nếu chưa sửa */
export const getHomeSeo = cache(async () => {
  try {
    return (await loadHome()).seo ?? null;
  } catch {
    return null;
  }
});

/**
 * Thông tin liên hệ công ty (CMS → Thông tin liên hệ): điện thoại, email, địa chỉ, mạng xã hội…
 * cùng dạng siteConfig (contact / messaging / social / maps / legal) — xem lib/contact.mjs.
 * Thẻ "settings": CMS lưu xong → website làm mới ngay. Backend lỗi → đúng giá trị mặc định (siteConfig).
 */
export const getContactInfo = cache(async () => {
  try {
    return contactView((await loadSite()).contact);
  } catch {
    return contactView(null);
  }
});

/** Toàn bộ dữ liệu website (mỗi request chỉ dựng 1 lần) */
export const getCatalog = cache(async () => {
  const [tours, destinations, themes, articles, taxonomy, services, pages, home] =
    await Promise.all([
      loadTours(),
      loadDestinations(),
      loadThemes(),
      loadArticles(),
      loadTaxonomy(),
      loadServices(),
      loadPages(),
      loadHome(),
    ]);
  return buildCatalog({ tours, destinations, themes, articles, taxonomy, services, pages, home });
});

/**
 * Đánh giá khách đang hiện (CMS → Đánh giá khách), đúng thứ tự trong CMS.
 * `place`: chỉ lấy đánh giá được chọn hiện ở trang đó — "home" | "about" | "group" | "car".
 * Không có đánh giá nào → [] (trang ẩn khối đánh giá).
 */
export const getReviews = cache(async (place) => {
  const list = await loadReviews();
  return place ? list.filter((r) => (r.showOn ?? []).includes(place)) : list;
});

/**
 * Các ô đã sửa của 1 trang trong CMS → Giao diện trang ({} = chưa sửa gì). Lỗi → {} (trang dùng nội dung mặc
 * định, không hỏng) — lần lỗi không được cache nên lượt xem sau tự lấy lại.
 */
export const getPageCopy = cache(async (key) => {
  try {
    return await loadPageCopy(key);
  } catch (err) {
    console.warn(`[vietlook] Chưa tải được giao diện trang ${key}: ${err.message}`);
    return {};
  }
});

/* ---------- Chi tiết (đầy đủ nội dung) ---------- */

/** Tour đầy đủ (lịch trình, bảng giá…) — null nếu không có / đang ẩn */
export const getTour = cache(async (slug) => {
  const t = await loadTour(slug);
  return t
    ? {
        ...normalizeTour(t),
        title: Object.fromEntries(["en", "zh", "vi"].map((l) => [l, t.content?.[l]?.title ?? ""])),
      }
    : null;
});

/** Bài viết đầy đủ (nội dung) */
export const getPost = cache(async (slug) => {
  const p = await loadArticle(slug);
  return p ? normalizePost(p) : null;
});
