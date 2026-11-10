import {
  articleRepository,
  authorRepository,
  carAreaRepository,
  carRepository,
  categoryRepository,
  destinationRepository,
  fastTrackRepository,
  pageRepository,
  themeRepository,
  tourRepository,
  visaTypeRepository,
} from "../repositories/content.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { settingsService } from "./settings.service.js";

/**
 * Dữ liệu công khai cho website (Next.js đọc ở server, cache theo thẻ — CMS lưu xong website cập nhật ngay).
 * Chỉ trả nội dung ĐANG HIỂN THỊ; không trả trường nội bộ (ghi chú, người sửa…).
 */
const PUBLIC_OMIT = "-__v -createdAt";
const LANGS = ["en", "zh", "vi"];

/** Thẻ tour gọn cho danh sách / bộ lọc (không gồm lịch trình, bảng giá…) */
function tourCard(t) {
  const pick = (k, map = (v) => v) =>
    Object.fromEntries(LANGS.map((l) => [l, map(t.content?.[l]?.[k])]));
  return {
    slug: t.slug,
    code: t.code,
    days: t.days,
    nights: t.nights,
    halfDay: t.halfDay,
    regions: t.regions,
    destinations: t.destinations,
    themes: t.themes,
    cruise: t.cruise,
    tourType: t.tourType ?? "private",
    price: t.price,
    originalPrice: t.originalPrice,
    image: t.image,
    rank: t.rank,
    featured: t.featured,
    featuredLong: t.featuredLong,
    departure: t.departure,
    title: pick("title", (v) => v ?? ""),
    summary: pick("summary", (v) => v ?? ""),
    route: pick("route", (v) => (v ?? []).slice(0, 8)),
    updatedAt: t.updatedAt,
  };
}

const CARD_FIELDS =
  "slug code days nights halfDay regions destinations themes cruise tourType price originalPrice image rank featured featuredLong departure updatedAt content.en.title content.zh.title content.vi.title content.en.summary content.zh.summary content.vi.summary content.en.route content.zh.route content.vi.route";

export const publicService = {
  async tours() {
    const list = await tourRepository.listActive({
      sort: { rank: 1, createdAt: -1 },
      select: CARD_FIELDS,
    });
    return list.map(tourCard);
  },

  async tour(slug) {
    const t = await tourRepository.findBySlugOrOld(slug);
    if (!t || !t.isActive) throw ApiError.notFound("Tour not found");
    const { _id, __v, sourceUrl, ...rest } = t; // eslint-disable-line no-unused-vars
    return rest;
  },

  async destinations() {
    return destinationRepository.listActive({ select: PUBLIC_OMIT });
  },

  async themes() {
    return themeRepository.listActive({ select: PUBLIC_OMIT });
  },

  async articles() {
    // danh sách không kèm nội dung bài (nhẹ) — nội dung lấy ở trang chi tiết
    return articleRepository.listActive({
      sort: { publishedAt: -1 },
      select: "slug title excerpt image category author destination month publishedAt updatedAt",
    });
  },

  async article(slug) {
    const a = await articleRepository.findBySlugOrOld(slug);
    if (!a || !a.isActive) throw ApiError.notFound("Article not found");
    const { _id, __v, sourceUrl, ...rest } = a; // eslint-disable-line no-unused-vars
    return rest;
  },

  async taxonomy() {
    const [categories, authors] = await Promise.all([
      categoryRepository.listActive({ select: PUBLIC_OMIT }),
      authorRepository.listActive({ select: PUBLIC_OMIT }),
    ]);
    return { categories, authors };
  },

  async services() {
    const [cars, carAreas, visaTypes, fastTrack] = await Promise.all([
      carRepository.listActive({ select: PUBLIC_OMIT }),
      carAreaRepository.listActive({ select: PUBLIC_OMIT }),
      visaTypeRepository.listActive({ select: PUBLIC_OMIT }),
      fastTrackRepository.listActive({ select: PUBLIC_OMIT }),
    ]);
    return { cars, carAreas, visaTypes, fastTrack };
  },

  async pages() {
    return pageRepository.listActive({ sort: { key: 1 }, select: PUBLIC_OMIT });
  },

  async home() {
    return settingsService.getHome();
  },

  /**
   * Slug hợp lệ của mọi trang động (website kiểm tra 404 thật & chuyển hướng slug cũ → slug mới).
   * tour / bài viết kèm slug cũ (old) khi CMS đổi đường dẫn.
   */
  async slugs() {
    const [tours, articles, destinations, themes, categories, authors, pages] = await Promise.all([
      tourRepository.listActive({ select: "slug oldSlugs", sort: { _id: 1 } }),
      articleRepository.listActive({ select: "slug oldSlugs", sort: { _id: 1 } }),
      destinationRepository.listActive({ select: "slug" }),
      themeRepository.listActive({ select: "slug" }),
      categoryRepository.listActive({ select: "slug" }),
      authorRepository.listActive({ select: "slug" }),
      pageRepository.listActive({ select: "key" }),
    ]);
    const withOld = (l) => l.map((d) => ({ slug: d.slug, old: d.oldSlugs ?? [] }));
    const plain = (l) => l.map((d) => d.slug);
    return {
      tours: withOld(tours),
      articles: withOld(articles),
      destinations: plain(destinations),
      themes: plain(themes),
      categories: plain(categories),
      authors: plain(authors),
      policies: pages.map((p) => p.key).filter((k) => k !== "about"),
    };
  },
};
