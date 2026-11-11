import { siteConfig } from "@/constants/site";
import { defaultLocale, href, localeMeta, locales } from "@/i18n/config";
import { getCatalog } from "@/lib/catalog";

const staticPaths = [
  "",
  "/tours",
  "/packages",
  "/halong-bay-cruises",
  "/group-tailor-made-tours",
  "/plan-your-trip",
  "/car-rental",
  "/visa-fast-track",
  "/destinations",
  "/travel-guide",
  "/about",
  "/contact",
  "/partners",
  "/services",
];

/** Sitemap XML kèm khai báo hreflang cho mọi ngôn ngữ (en / zh-Hans / vi). */
export default async function sitemap() {
  const { destinations, regions, themes, allTours, allPosts, authors, guideCategories, policies } =
    await getCatalog();
  // Ngày sửa gần nhất của tour / bài viết → Google biết trang nào cần thu thập lại
  const modified = Object.fromEntries([
    ...allTours.map((t) => [`/tours/${t.slug}`, t.updatedAt]),
    ...allPosts.map((p) => [`/travel-guide/${p.slug}`, p.updatedAt || p.date]),
  ]);
  const paths = [
    ...staticPaths,
    // Trang chính sách: chỉ trang đang bật "Hiện trên website" (CMS → Giới thiệu & chính sách)
    ...Object.keys(policies).map((k) => `/policies/${k}`),
    ...regions.map((r) => `/destinations/${r.slug}`),
    ...destinations.map((d) => `/destinations/${d.slug}`),
    ...themes.map((t) => `/themes/${t.slug}`),
    ...allTours.map((t) => `/tours/${t.slug}`),
    ...guideCategories.map((c) => `/travel-guide/category/${c.slug}`),
    ...allPosts.map((p) => `/travel-guide/${p.slug}`),
    ...Object.keys(authors).map((a) => `/travel-guide/author/${a}`),
  ];

  return paths.map((p) => ({
    url: `${siteConfig.url}${href(defaultLocale, p || "/")}`,
    ...(modified[p] && { lastModified: new Date(modified[p]) }),
    changeFrequency:
      p.startsWith("/tours/") || p.startsWith("/travel-guide/") ? "weekly" : "monthly",
    priority: p === "" ? 1 : p.split("/").length <= 2 ? 0.8 : 0.6,
    alternates: {
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [localeMeta[l].hreflang, `${siteConfig.url}${href(l, p || "/")}`]),
        ),
        // giống thẻ hreflang trong <head> (lib/seo.js)
        "x-default": `${siteConfig.url}${href(defaultLocale, p || "/")}`,
      },
    },
  }));
}
