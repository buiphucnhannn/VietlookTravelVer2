import { siteConfig } from "@/constants/site";
import { defaultLocale, href, localeMeta, locales } from "@/i18n/config";
import { destinations, regions } from "@/data/destinations";
import { themes } from "@/data/themes";
import { allTours } from "@/data/tours";
import { allPosts, authors } from "@/data/posts";
import { guideCategories } from "@/data/guide-categories";

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
  "/policies/payment",
  "/policies/cancellation",
  "/policies/privacy",
  "/policies/terms",
];

/** Sitemap XML kèm khai báo hreflang cho 2 ngôn ngữ. */
export default function sitemap() {
  const paths = [
    ...staticPaths,
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
    changeFrequency:
      p.startsWith("/tours/") || p.startsWith("/travel-guide/") ? "weekly" : "monthly",
    priority: p === "" ? 1 : p.split("/").length <= 2 ? 0.8 : 0.6,
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [localeMeta[l].hreflang, `${siteConfig.url}${href(l, p || "/")}`]),
      ),
    },
  }));
}
