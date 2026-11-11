import { MAX_THEMES, REGION_VALUES } from "../constants/content.js";
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
import { cleanHtml } from "../utils/sanitize.js";
import { createContentService } from "./content.service.js";
import { afterSave as cleanupMedia } from "./media-cleanup.service.js";
import { settingsService } from "./settings.service.js";

const LANGS = ["en", "zh", "vi"];
const mapLangs = (obj, fn) => Object.fromEntries(LANGS.map((l) => [l, fn(obj?.[l] ?? "", l)]));

/** Đổi slug → giữ slug cũ để website chuyển hướng 301 (giữ SEO, link đã chia sẻ) */
function withOldSlugs(data, prev) {
  if (!prev || prev.slug === data.slug) return { ...data, oldSlugs: prev?.oldSlugs ?? [] };
  const old = new Set([...(prev.oldSlugs ?? []), prev.slug]);
  old.delete(data.slug);
  return { ...data, oldSlugs: [...old].slice(-20) };
}

/* ---------- Tour ---------- */

export async function prepareTour(data, prev) {
  // điểm đến / chủ đề phải có thật; miền (regions) suy ra từ điểm đến
  const dests = data.destinations.length
    ? await destinationRepository.findByIdents(data.destinations, { select: "slug region" })
    : [];
  const known = new Set(dests.map((d) => d.slug));
  const missing = data.destinations.filter((s) => !known.has(s));
  if (missing.length) throw ApiError.badRequest(`Điểm đến không tồn tại: ${missing.join(", ")}`);
  if (data.themes.length) {
    const themes = await themeRepository.findByIdents(data.themes, { select: "slug" });
    const t = new Set(themes.map((x) => x.slug));
    const bad = data.themes.filter((s) => !t.has(s));
    if (bad.length) throw ApiError.badRequest(`Chủ đề không tồn tại: ${bad.join(", ")}`);
  }
  if (data.originalPrice != null && data.price != null && data.originalPrice <= data.price)
    data.originalPrice = null; // giá gạch phải cao hơn giá bán
  const regionOf = Object.fromEntries(dests.map((d) => [d.slug, d.region]));
  const regions = [...new Set(data.destinations.map((s) => regionOf[s]))].filter((r) =>
    REGION_VALUES.includes(r),
  );

  const content = mapLangs(data.content, (c) => ({
    ...c,
    itinerary: (c.itinerary ?? []).map((d) => ({ ...d, html: cleanHtml(d.html) })),
    faqs: (c.faqs ?? []).map((f) => ({ ...f, a: cleanHtml(f.a) })),
  }));
  if (!LANGS.some((l) => content[l].title?.trim()))
    throw ApiError.badRequest("Vui lòng nhập tên tour ở ít nhất một ngôn ngữ");
  return withOldSlugs({ ...data, regions, content }, prev);
}

export const tourService = createContentService({
  repo: tourRepository,
  label: "tour",
  searchFields: ["content.en.title", "content.zh.title", "content.vi.title", "code"],
  defaultSort: "rank",
  // Tour không có trường name → "Tên A → Z" theo tên tour tiếng Việt (CMS hiển thị tiếng Việt trước)
  sorts: { name: { "content.vi.title": 1, "content.en.title": 1, _id: 1 } },
  prepare: prepareTour,
  trackOldSlugs: true,
  // tour nổi bật / dài ngày ở trang chủ lưu theo đường dẫn → đổi đường dẫn / xoá tour thì cập nhật theo
  afterUpdate: (next, prev) => settingsService.renameHomeRef("tour", prev.slug, next.slug),
  beforeRemove: (doc) => settingsService.renameHomeRef("tour", doc.slug, null),
  // danh sách tour trong CMS (tới 200 tour / lần) không cần lịch trình, bảng giá, đánh giá… của 3 ngôn ngữ
  listSelect:
    "slug code days nights halfDay regions destinations themes cruise tourType price originalPrice image rank featured featuredLong departure isActive createdAt updatedAt content.en.title content.zh.title content.vi.title content.en.summary",
  filters: (q) => ({
    ...(q.region && { regions: q.region }),
    ...(q.destination && { destinations: q.destination }),
    ...(q.theme && { themes: q.theme }),
    ...(q.featured === "featured" && { featured: true }),
    ...(q.featured === "long" && { featuredLong: true }),
  }),
});

/* ---------- Điểm đến / chủ đề ---------- */

export const destinationService = createContentService({
  repo: destinationRepository,
  label: "điểm đến",
  searchFields: ["name.en", "name.zh", "name.vi"],
  filters: (q) => (q.region ? { region: q.region } : {}),
  afterUpdate: async (next, prev) => {
    if (next.slug !== prev.slug)
      await tourRepository.renameRef("destinations", prev.slug, next.slug);
    if (next.slug !== prev.slug)
      await articleRepository.renameRef("destination", prev.slug, next.slug);
    await settingsService.renameHomeRef("destination", prev.slug, next.slug);
  },
  beforeRemove: async (doc) => {
    const n = await tourRepository.countUsing("destinations", doc.slug);
    if (n)
      throw ApiError.conflict(
        `Điểm đến đang gắn với ${n} tour — hãy ẩn điểm đến hoặc bỏ gắn khỏi các tour trước khi xoá`,
      );
    await settingsService.renameHomeRef("destination", doc.slug, null);
  },
});

export const themeService = createContentService({
  repo: themeRepository,
  label: "chủ đề",
  searchFields: ["name.en", "name.zh", "name.vi"],
  beforeCreate: async () => {
    if ((await themeRepository.count()) >= MAX_THEMES)
      throw ApiError.badRequest(`Tối đa ${MAX_THEMES} chủ đề — hãy sửa hoặc xoá chủ đề cũ`);
  },
  afterUpdate: async (next, prev) => {
    if (next.slug !== prev.slug) await tourRepository.renameRef("themes", prev.slug, next.slug);
    await settingsService.renameHomeRef("theme", prev.slug, next.slug);
  },
  beforeRemove: async (doc) => {
    await tourRepository.pullRef("themes", doc.slug); // tour vẫn còn, chỉ bỏ gắn chủ đề
    await settingsService.renameHomeRef("theme", doc.slug, null);
  },
});

/* ---------- Bài viết / chuyên mục / tác giả ---------- */

export function prepareArticle(data, prev) {
  if (!LANGS.some((l) => data.title?.[l]?.trim()))
    throw ApiError.badRequest("Vui lòng nhập tiêu đề ở ít nhất một ngôn ngữ");
  return withOldSlugs({ ...data, body: mapLangs(data.body, (h) => cleanHtml(h)) }, prev);
}

export const articleService = createContentService({
  repo: articleRepository,
  label: "bài viết",
  searchFields: ["title.en", "title.zh", "title.vi"],
  defaultSort: "newest",
  // "Mới nhất" / "Cũ nhất" theo NGÀY ĐĂNG (ngày hiện trong danh sách), không theo ngày nhập vào CMS
  // (bài chuyển từ web cũ được nhập cùng lúc → createdAt không phản ánh ngày đăng thật)
  sorts: {
    newest: { publishedAt: -1, createdAt: -1, _id: -1 },
    oldest: { publishedAt: 1, createdAt: 1, _id: 1 },
  },
  prepare: prepareArticle,
  trackOldSlugs: true,
  // Danh sách bài viết trong CMS: KHÔNG gửi nội dung HTML (nặng) của 3 ngôn ngữ — chỉ cần biết ngôn ngữ nào
  // đã có nội dung (body.{lang} = true / false) để báo "Thiếu bản …"
  listSelect: {
    slug: 1,
    title: 1,
    image: 1,
    category: 1,
    author: 1,
    destination: 1,
    publishedAt: 1,
    isActive: 1,
    createdAt: 1,
    updatedAt: 1,
    ...Object.fromEntries(
      LANGS.map((l) => [
        `body.${l}`,
        { $gt: [{ $strLenCP: { $trim: { input: { $ifNull: [`$body.${l}`, ""] } } } }, 0] },
      ]),
    ),
  },
  filters: (q) => (q.category ? { category: q.category } : {}),
});
// danh sách bài viết mới nhất trước theo ngày đăng
articleService.list = (
  (list) => (query) =>
    list({ sort: "newest", ...query })
)(articleService.list);

export const categoryService = createContentService({
  repo: categoryRepository,
  label: "chuyên mục",
  searchFields: ["name.en", "name.zh", "name.vi"],
  afterUpdate: async (next, prev) => {
    if (next.slug !== prev.slug)
      await articleRepository.renameRef("category", prev.slug, next.slug);
  },
  beforeRemove: async (doc) => {
    const n = await articleRepository.countUsing("category", doc.slug);
    if (n)
      throw ApiError.conflict(
        `Chuyên mục đang có ${n} bài viết — chuyển bài sang chuyên mục khác trước`,
      );
  },
});

export const authorService = createContentService({
  repo: authorRepository,
  label: "tác giả",
  searchFields: ["name.en", "name.zh", "name.vi"],
  afterUpdate: async (next, prev) => {
    if (next.slug !== prev.slug) await articleRepository.renameRef("author", prev.slug, next.slug);
  },
  beforeRemove: async (doc) => {
    const n = await articleRepository.countUsing("author", doc.slug);
    if (n)
      throw ApiError.conflict(`Tác giả đang có ${n} bài viết — đổi tác giả của các bài đó trước`);
  },
});

/* ---------- Dịch vụ ---------- */

export const carService = createContentService({
  repo: carRepository,
  label: "loại xe",
  idField: "key",
  searchFields: ["name.en", "name.zh", "name.vi"],
});

export const carAreaService = createContentService({
  repo: carAreaRepository,
  label: "khu vực phục vụ",
  idField: "key",
  searchFields: ["name.en", "name.zh", "name.vi"],
});

export const visaTypeService = createContentService({
  repo: visaTypeRepository,
  label: "loại visa",
  idField: "key",
  searchFields: ["name.en", "name.zh", "name.vi"],
});

export const fastTrackService = createContentService({
  repo: fastTrackRepository,
  label: "gói fast-track",
  idField: "key",
  searchFields: ["name.en", "name.zh", "name.vi"],
  filters: (q) => (q.group ? { group: q.group } : {}),
});

/* ---------- Trang giới thiệu & chính sách ---------- */

export const pageService = {
  async list() {
    return pageRepository.find({}, { sort: { key: 1 } });
  },

  async get(key) {
    const page = await pageRepository.findByIdent(key);
    if (!page) throw ApiError.notFound("Không tìm thấy trang");
    return page;
  },

  async save(key, data) {
    const prev = await pageRepository.findByIdent(key);
    const next = await pageRepository.upsertByIdent(key, {
      ...data,
      key,
      body: mapLangs(data.body, (h) => cleanHtml(h)),
    });
    cleanupMedia(prev, next); // ảnh bị thay / bỏ → dọn nền
    return next;
  },
};
