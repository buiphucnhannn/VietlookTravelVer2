import { NextResponse } from "next/server";
import { defaultLocale } from "@/i18n/config";
import slugs from "@/data/generated/route-slugs.json";

// Route động → tập slug hợp lệ (sinh bởi scripts/route-slugs.mjs trước mỗi lần build)
const VALID = Object.fromEntries(Object.entries(slugs).map(([k, v]) => [k, new Set(v)]));
const DYNAMIC =
  /^\/(tours|destinations|policies|themes|travel-guide\/category|travel-guide\/author|travel-guide)\/([^/]+)\/?$/;

/** Slug không tồn tại → true (trả 404 thật ngay từ proxy, trước khi trang bắt đầu stream mã 200). */
function isUnknownSlug(path) {
  const m = path.match(DYNAMIC);
  if (!m) return false;
  const [, route, slug] = m;
  if (route === "travel-guide" && (slug === "category" || slug === "author")) return false;
  return !VALID[route]?.has(decodeURIComponent(slug));
}
const notFound = (url, lang) => {
  url.pathname = `/${lang}/__not-found`;
  return NextResponse.rewrite(url);
};

/**
 * URL như website cũ: tiếng Anh ở gốc (/car-rental), tiếng Trung có tiền tố (/zh/car-rental).
 * - /zh/...  → giữ nguyên
 * - /en/...  → 308 về URL không tiền tố (giữ link cũ / bookmark)
 * - còn lại  → rewrite nội bộ sang /en/... (thư mục app/[lang]); trên thanh địa chỉ vẫn không có /en
 * Trang chủ: trình duyệt ưu tiên tiếng Trung và chưa từng tự chọn ngôn ngữ (cookie "lang") → /zh.
 */
export function proxy(request) {
  const url = request.nextUrl;
  const { pathname } = url;

  if (pathname === "/zh" || pathname.startsWith("/zh/")) {
    if (isUnknownSlug(pathname.slice(3))) return notFound(url, "zh");
    return;
  }

  if (pathname === `/${defaultLocale}` || pathname.startsWith(`/${defaultLocale}/`)) {
    url.pathname = pathname.slice(defaultLocale.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/" && !request.cookies.get("lang")) {
    const first = (request.headers.get("accept-language") || "").split(",")[0].trim();
    if (first.toLowerCase().startsWith("zh")) {
      url.pathname = "/zh";
      return NextResponse.redirect(url);
    }
  }

  if (isUnknownSlug(pathname)) return notFound(url, defaultLocale);

  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Bỏ qua tài nguyên tĩnh, API và các file có phần mở rộng (ảnh, video, sitemap.xml, robots.txt...)
  matcher: ["/((?!_next|api|images|icons|.*\\..*).*)"],
};
