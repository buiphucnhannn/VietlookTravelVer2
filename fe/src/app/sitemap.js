import { connection } from "next/server";
import { siteConfig } from "@/constants/site";
import { defaultLocale, href, localeMeta, locales } from "@/i18n/config";
import { getCatalog } from "@/lib/catalog";
import { policyLangs, postLangs, primaryLang, tourLangs } from "@/lib/seo";

const staticPaths = [
  "",
  "/tours",
  "/packages",
  "/halong-bay-cruises",
  "/halong-bay-overnight-cruises",
  "/day-cruises",
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
  // Không dựng sẵn lúc build: đọc dữ liệu mới nhất mỗi lần (dữ liệu vẫn qua bộ nhớ đệm theo thẻ nên nhanh),
  // nhờ vậy ẩn/hiện trang, tour, bài viết trong CMS là sitemap cập nhật ngay
  await connection();
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

  // Tour / bài viết / chính sách chưa có nội dung ở ngôn ngữ nào → bỏ ngôn ngữ đó (giống hreflang trong <head>)
  const langsOf = Object.fromEntries([
    ...allTours.map((t) => [`/tours/${t.slug}`, tourLangs(t)]),
    ...allPosts.map((p) => [`/travel-guide/${p.slug}`, postLangs(p)]),
    ...Object.entries(policies).map(([k, p]) => [`/policies/${k}`, policyLangs(p)]),
  ]);

  return paths.map((p) => {
    const langs = langsOf[p] ?? locales;
    const main = primaryLang(defaultLocale, langs);
    return {
      url: `${siteConfig.url}${href(main, p || "/")}`,
      ...(modified[p] && { lastModified: new Date(modified[p]) }),
      changeFrequency:
        p.startsWith("/tours/") || p.startsWith("/travel-guide/") ? "weekly" : "monthly",
      priority: p === "" ? 1 : p.split("/").length <= 2 ? 0.8 : 0.6,
      alternates: {
        languages: {
          ...Object.fromEntries(
            langs.map((l) => [localeMeta[l].hreflang, `${siteConfig.url}${href(l, p || "/")}`]),
          ),
          // giống thẻ hreflang trong <head> (lib/seo.js)
          "x-default": `${siteConfig.url}${href(main, p || "/")}`,
        },
      },
    };
  });
}
