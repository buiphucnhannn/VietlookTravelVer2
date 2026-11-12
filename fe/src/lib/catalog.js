import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { BACKEND_URL, backendHeaders } from "@/config/urls.mjs";
import { fallbackLangs, isBlank, tr } from "@/i18n/config";
import { regions } from "@/data/regions";
import { autoFeaturedTours, autoLongTours, pushBack } from "@/lib/tour-picks";
import { cruiseKind, durationCounts } from "@/lib/tour-categories";

/**
 * Nội dung website lấy từ backend (be/) — quản lý trong CMS.
 * - Mỗi loại dữ liệu cache riêng theo thẻ (tours, destinations, themes, articles, taxonomy, services, pages,
 *   settings). CMS lưu xong gọi refreshPublicContent (lib/revalidate.js) → website hiện dữ liệu mới ngay.
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

/**
 * Phụ thu nhóm nhỏ (CMS → Cài đặt): { enabled, one, two, threeFour, fivePlus } — % theo số khách, chỉ áp dụng
 * cho tour chưa có bảng giá theo số khách. null = máy chủ chưa có cài đặt này → khung đặt tour không cộng.
 */
export const getSmallGroup = cache(async () => (await loadSite()).smallGroup ?? null);

/** Mã đo lường Google nhập trong CMS (Cài đặt) — { gtmId, ga4Id, adsId } */
export const getTracking = cache(async () => (await loadSite()).tracking ?? {});

/* ---------- Chuẩn hoá ---------- */

/** Chọn bản dịch: trường trống → dùng ngôn ngữ khác đã có (en → vi → zh) */
const pickLang = (obj, lang) => {
  for (const l of fallbackLangs(lang)) if (!isBlank(obj?.[l])) return obj[l];
  return obj?.[lang];
};

/** Tour (thẻ) → cấu trúc các component đang dùng */
function normalizeTour(t) {
  return {
    ...t,
    title: t.title ?? {},
    regions: t.regions ?? [],
    destinations: t.destinations ?? [],
    themes: t.themes ?? [],
    labels: t.labels ?? [],
  };
}

const postDate = (p) => (p.publishedAt ? String(p.publishedAt).slice(0, 10) : "");
const normalizePost = (p) => ({ ...p, date: postDate(p) });

/* ---------- Catalog: các hàm tiện ích (giống src/data/* cũ) ---------- */

function buildCatalog({ tours, destinations, themes, articles, taxonomy, services, pages, home }) {
  const allTours = tours.map(normalizeTour);
  const getRegion = (slug) => regions.find((r) => r.slug === slug);
  const getDestination = (slug) => destinations.find((d) => d.slug === slug);
  const destinationsByRegion = (regionSlug) => destinations.filter((d) => d.region === regionSlug);
  const getTheme = (slug) => themes.find((t) => t.slug === slug);

  const toursByDestination = (slug) => {
    if (getRegion(slug)) return allTours.filter((t) => t.regions.includes(slug));
    // Tour lấy điểm đến này làm điểm chính được ưu tiên lên đầu
    return allTours
      .filter((t) => t.destinations.includes(slug))
      .sort(
        (a, b) =>
          a.destinations.indexOf(slug) - b.destinations.indexOf(slug) ||
          a.destinations.length - b.destinations.length,
      );
  };
  const toursByTheme = (slug) => allTours.filter((t) => t.themes.includes(slug));
  const cruiseTours = () =>
    allTours.filter((t) => t.cruise || t.destinations.includes("halong-bay"));
  /** Du thuyền theo loại: "overnight" (Hạ Long ngủ đêm) · "day" (trong ngày: Hạ Long, Nha Trang, Phú Quốc) */
  const cruisesByKind = (kind) => allTours.filter((t) => cruiseKind(t) === kind);
  const bySlugs = (slugs) =>
    (slugs ?? []).map((s) => allTours.find((t) => t.slug === s)).filter(Boolean);

  // Khối tour dài ngày trang chủ: chọn trong CMS (Trang chủ → Tour dài ngày); trống → website tự chọn
  // (lib/tour-picks.js: tour ≥ 7 ngày, chia đều 1/2/3 tuần, điểm cao trước — giống bản xem trước trong CMS).
  // `shown`: slug các tour đã hiện ở khối "Tour nổi bật" phía trên → đẩy xuống cuối danh sách (không bỏ đi,
  // để bộ lọc theo tuần vẫn đủ tour) — tab "Tất cả" vì vậy mở đầu bằng những tour khác, không lặp lại khối trên.
  const longTours = ({ shown } = {}) => {
    const picked = bySlugs(home.longTours).slice(0, 8);
    // tự chọn: đã tự xếp tour trùng khối trên xuống sau trong từng nhóm tuần (giữ xen kẽ 1/2/3 tuần)
    return picked.length ? pushBack(picked, shown) : autoLongTours(allTours, { avoid: shown });
  };
  // Khối "Tour nổi bật" trang chủ: chọn trong CMS (Trang chủ → Tour nổi bật, giữ đúng thứ tự);
  // trống → website tự chọn 8 tour đáng nổi bật nhất (lib/tour-picks.js)
  const featuredTours = () => {
    const picked = bySlugs(home.featuredTours).slice(0, 8);
    return picked.length ? picked : autoFeaturedTours(allTours);
  };

  /** Gói theo tuần: 1 tuần (5–8 ngày), 2 tuần (9–15), 3 tuần (16+). */
  const packagesByWeeks = (weeks) => {
    const range = { 1: [5, 8], 2: [9, 15], 3: [16, 60] }[weeks];
    return allTours
      .filter((t) => t.days >= range[0] && t.days <= range[1])
      .sort((a, b) => (b.price ? 1 : 0) - (a.price ? 1 : 0) || a.days - b.days);
  };

  function relatedTours(tour, limit = 4) {
    return allTours
      .filter((t) => t.slug !== tour.slug)
      .map((t) => ({
        t,
        score:
          t.destinations.filter((d) => tour.destinations.includes(d)).length * 3 +
          t.themes.filter((d) => tour.themes.includes(d)).length +
          (Math.abs(t.days - tour.days) <= 2 ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.t);
  }

  const countFor = (slug) => toursByDestination(slug).length;

  /** Dữ liệu gọn cho thẻ tour (truyền xuống client component). */
  function toCard(t, lang) {
    const dest = t.destinations.map((d) => tr(getDestination(d)?.name, lang)).filter(Boolean);
    return {
      slug: t.slug,
      title: pickLang(t.title, lang) ?? "",
      days: t.days,
      nights: t.nights,
      halfDay: t.halfDay,
      price: t.price,
      originalPrice: t.originalPrice,
      image: t.image,
      summary: pickLang(t.summary, lang) ?? "",
      destinations: t.destinations,
      destinationNames: dest.slice(0, 3),
      regions: t.regions,
      themes: t.themes,
      cruise: t.cruise,
      cruiseKind: cruiseKind(t),
      labels: t.labels,
      rank: t.rank,
      code: t.code,
      route: (pickLang(t.route, lang) ?? []).slice(0, 6),
    };
  }

  /** Lựa chọn điểm đến cho form thiết kế tour: 3 miền + các điểm đến đang hiển thị (theo thứ tự trong CMS). */
  function plannerOptions(lang) {
    return [
      ...regions.map((r) => ({ value: r.slug, label: tr(r.name, lang) })),
      ...destinations.map((d) => ({ value: d.slug, label: tr(d.name, lang) })),
    ];
  }

  // Cẩm nang
  const allPosts = articles.map(normalizePost);
  const authors = Object.fromEntries(taxonomy.authors.map((a) => [a.slug, a]));
  const guideCategories = taxonomy.categories;
  const getGuideCategory = (slug) => guideCategories.find((c) => c.slug === slug);
  const postsByCategory = (cat) => allPosts.filter((p) => p.category === cat);
  const monthPosts = () =>
    allPosts.filter((p) => p.category === "vietnam-by-month").sort((a, b) => a.month - b.month);
  function relatedPosts(post, limit = 3) {
    return allPosts
      .filter((p) => p.slug !== post.slug)
      .map((p) => ({
        p,
        score:
          (p.category === post.category ? 2 : 0) +
          (post.destination && p.destination === post.destination ? 3 : 0),
      }))
      .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
      .slice(0, limit)
      .map((x) => x.p);
  }

  // Dịch vụ: xe + visa / fast-track
  const fleet = services.cars;
  const carAreas = services.carAreas;
  const visaTypes = services.visaTypes;
  const GROUP_KEY = { arrival: "arrival", departure: "departure", addon: "addons" };
  const fastTrackPackages = { arrival: [], departure: [], addons: [] };
  for (const p of services.fastTrack) fastTrackPackages[GROUP_KEY[p.group]]?.push(p);
  const allPackages = () =>
    Object.entries(fastTrackPackages).flatMap(([group, list]) =>
      list.map((x) => ({ ...x, group })),
    );

  // Trang giới thiệu + chính sách
  const pageMap = Object.fromEntries(pages.map((p) => [p.key, p]));
  const about = pageMap.about?.data ?? {};
  const policies = Object.fromEntries(
    pages.filter((p) => p.key !== "about").map((p) => [p.key, p]),
  );

  // Chủ đề hiện ở trang chủ: chọn trong CMS; trống → tất cả
  const homeThemes = () => {
    const picked = (home.homeThemes ?? []).map(getTheme).filter(Boolean);
    return picked.length ? picked : themes;
  };

  return {
    home,
    regions,
    destinations,
    getRegion,
    getDestination,
    destinationsByRegion,
    plannerOptions,
    themes,
    getTheme,
    homeThemes,
    allTours,
    toursByDestination,
    toursByTheme,
    cruiseTours,
    cruisesByKind,
    tourDurationCounts: () => durationCounts(allTours),
    longTours,
    featuredTours,
    packagesByWeeks,
    relatedTours,
    countFor,
    toCard,
    allPosts,
    authors,
    guideCategories,
    getGuideCategory,
    postsByCategory,
    monthPosts,
    relatedPosts,
    fleet,
    carAreas,
    visaTypes,
    fastTrackPackages,
    allPackages,
    about,
    aboutPage: pageMap.about ?? null,
    policies,
  };
}

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

/**
 * Nội dung tour theo ngôn ngữ: lấy content[lang], trường nào trống thì dùng bản tiếng Anh.
 * Lịch trình ghép theo từng ngày (ngày chưa dịch → tiếng Anh).
 */
export function tourText(t, lang) {
  // ngôn ngữ đang xem trước, rồi en → vi → zh: trường nào trống thì lấy ở ngôn ngữ kế tiếp đã có
  const order = fallbackLangs(lang).map((l) => t.content?.[l] ?? {});
  const pick = (k) => order.map((c) => c[k]).find((v) => !isBlank(v));
  // khung lịch trình: bản có nhiều ngày nhất (ưu tiên theo thứ tự trên khi bằng nhau)
  const frame = order.reduce(
    (best, c) => ((c.itinerary?.length ?? 0) > (best.itinerary?.length ?? 0) ? c : best),
    order[0],
  );
  const dayOf = (i, k) => order.map((c) => c.itinerary?.[i]?.[k]).find((v) => !isBlank(v));
  return {
    title: pick("title") ?? "",
    summary: pick("summary") ?? "",
    route: pick("route") ?? [],
    highlights: pick("highlights") ?? [],
    itinerary: (frame.itinerary ?? []).map((d, i) => ({
      ...d,
      title: dayOf(i, "title") ?? d.title ?? "",
      html: dayOf(i, "html") ?? d.html ?? "",
      meals: dayOf(i, "meals") ?? [],
      overnight: dayOf(i, "overnight") ?? "",
    })),
    included: pick("included") ?? [],
    excluded: pick("excluded") ?? [],
    childPolicy: pick("childPolicy"),
    notes: pick("notes"),
    priceTables: pick("priceTables") ?? [],
    faqs: pick("faqs") ?? [],
  };
}

/** Bài viết đầy đủ (nội dung) */
export const getPost = cache(async (slug) => {
  const p = await loadArticle(slug);
  return p ? normalizePost(p) : null;
});

/** Ước tính thời gian đọc (phút). */
export const readingTime = (html = "") =>
  Math.max(
    2,
    Math.round(
      String(html)
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/).length / 200,
    ),
  );
