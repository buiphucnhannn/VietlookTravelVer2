import { fallbackLangs, isBlank, tr } from "@/i18n/config";
import { regions } from "@/data/regions";
import { autoFeaturedTours, autoLongTours, pushBack } from "@/lib/tour-picks";
import { cruiseKind, durationCounts } from "@/lib/tour-categories";

/**
 * Dựng "catalog" (các hàm tiện ích allTours, toursByDestination, getDestination…) từ dữ liệu thô của backend.
 * Thuần (không "server-only") → dùng chung cho website (lib/catalog.js, ở server) và bản xem trước trong CMS
 * (components/admin/page-copy/previews — dựng đúng y dữ liệu website đang hiện).
 */

/* ---------- Chuẩn hoá ---------- */

/** Chọn bản dịch: trường trống → dùng ngôn ngữ khác đã có (en → vi → zh) */
export const pickLang = (obj, lang) => {
  for (const l of fallbackLangs(lang)) if (!isBlank(obj?.[l])) return obj[l];
  return obj?.[lang];
};

/** Tour (thẻ) → cấu trúc các component đang dùng */
export function normalizeTour(t) {
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
export const normalizePost = (p) => ({ ...p, date: postDate(p) });

/* ---------- Catalog: các hàm tiện ích (giống src/data/* cũ) ---------- */

export function buildCatalog({
  tours,
  destinations,
  themes,
  articles,
  taxonomy,
  services,
  pages,
  home,
}) {
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

  // "Có thể bạn thích" dưới MỌI tour: cùng điểm đến > cùng miền / chủ đề / độ dài; không khớp gì thì vẫn đủ
  // thẻ — hoà điểm giữ thứ tự gợi ý của danh sách (rank = tour phổ biến trước) nên không bao giờ trống
  function relatedTours(tour, limit = 4) {
    const regionsOf = tour.regions ?? [];
    return allTours
      .filter((t) => t.slug !== tour.slug)
      .map((t) => ({
        t,
        score:
          t.destinations.filter((d) => tour.destinations.includes(d)).length * 3 +
          (t.regions ?? []).filter((r) => regionsOf.includes(r)).length +
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
      support: dayOf(i, "support") ?? "",
    })),
    included: pick("included") ?? [],
    excluded: pick("excluded") ?? [],
    childPolicy: pick("childPolicy"),
    notes: pick("notes"),
    priceTables: pick("priceTables") ?? [],
    faqs: pick("faqs") ?? [],
  };
}

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
