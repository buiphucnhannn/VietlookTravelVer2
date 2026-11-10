import { NextResponse } from "next/server";
import { ADMIN_BASE, ADMIN_LOGIN, BACKEND_URL, backendHeaders } from "@/config/urls.mjs";
import { defaultLocale, locales } from "@/i18n/config";
import { regions } from "@/data/regions";

/**
 * Proxy (Next 16 — thay middleware):
 * 1. /api/v1/*      → chuyển tiếp sang backend kèm mã bí mật (PROXY_SECRET) + IP thật của khách.
 * 2. Khu quản trị   → hỏi backend /auth/me bằng cookie TRƯỚC khi render (proxy không giữ secret JWT nào):
 *                     chưa đăng nhập → trang đăng nhập; access hết hạn nhưng còn phiên → /auth/resume làm mới.
 * 3. Website        → URL như web cũ: tiếng Anh ở gốc, /zh, /vi có tiền tố; slug không tồn tại → 404 thật;
 *                     slug cũ (CMS đã đổi đường dẫn) → 308 sang slug mới (giữ SEO).
 */

/* ---------------- IP thật của khách ---------------- */

const isIp = (v) => /^[\d.]{7,15}$|^[\da-f:]{2,39}$/i.test(v ?? "");
/**
 * Chỉ lấy IP từ nguồn khách KHÔNG giả được: Vercel đặt x-real-ip; máy dev lấy phần tử cuối X-Forwarded-For.
 * Không xác định được → "" (backend tự tính theo kết nối). Backend chỉ tin X-Client-IP khi kèm đúng PROXY_SECRET.
 */
function clientIp(request) {
  const h = (name) => request.headers.get(name)?.trim() ?? "";
  if (process.env.VERCEL) return isIp(h("x-real-ip")) ? h("x-real-ip") : "";
  if (process.env.NODE_ENV !== "production") return h("x-forwarded-for").split(",").pop().trim();
  return "";
}
function forwardedFor(request) {
  const ip = clientIp(request);
  return ip ? { "x-forwarded-for": ip, "x-client-ip": ip } : {};
}

/* ---------------- 1. API → backend ---------------- */

/**
 * Có PROXY_SECRET → rewrite sang backend kèm mã bí mật (backend chặn mọi request gọi thẳng không có mã).
 * Chưa đặt (máy dev) → cho qua, rewrites trong next.config.mjs chuyển tiếp như thường.
 */
function forwardApi(request) {
  const secret = backendHeaders();
  if (!Object.keys(secret).length) return NextResponse.next();
  const { pathname, search, host, protocol } = request.nextUrl;
  const headers = new Headers(request.headers);
  for (const [k, v] of Object.entries(secret)) headers.set(k, v);
  // Xoá mọi header IP khách tự gửi rồi đặt lại bằng IP thật → không giả được để né giới hạn
  for (const k of ["x-client-ip", "x-forwarded-for", "x-real-ip"]) headers.delete(k);
  for (const [k, v] of Object.entries(forwardedFor(request))) headers.set(k, v);
  headers.set("x-forwarded-host", request.headers.get("x-forwarded-host") || host);
  headers.set(
    "x-forwarded-proto",
    request.headers.get("x-forwarded-proto") || protocol.replace(":", ""),
  );
  return NextResponse.rewrite(new URL(pathname + search, BACKEND_URL), { request: { headers } });
}

/* ---------------- 2. Khu quản trị ---------------- */

const PRIVATE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const HINT_COOKIES = ["vl_session", "__Host-vl_session"];
const hasSession = (request) => HINT_COOKIES.some((n) => request.cookies.has(n));
const withPrivate = (res) => {
  Object.entries(PRIVATE).forEach(([k, v]) => res.headers.set(k, v));
  return res;
};

async function currentUser(request) {
  const cookie = request.headers.get("cookie");
  if (!cookie) return { user: null };
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: {
        cookie,
        accept: "application/json",
        ...forwardedFor(request),
        ...backendHeaders(),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 429)
      return { user: null, limited: true, retry: res.headers.get("retry-after") ?? "60" };
    if (!res.ok) return { user: null };
    return { user: (await res.json()).data.user };
  } catch {
    return { user: null, down: true };
  }
}

/** Đường dẫn quay lại sau đăng nhập: chỉ đường dẫn nội bộ trong khu quản trị (chặn open redirect) */
function safeNext(raw) {
  const next = String(raw ?? "");
  if (!next.startsWith(ADMIN_BASE) || next.startsWith("//") || next.includes("\\"))
    return ADMIN_BASE;
  if (next.startsWith(ADMIN_LOGIN)) return ADMIN_BASE;
  return next;
}

async function guardAdmin(request) {
  const { pathname, search, searchParams } = request.nextUrl;
  const { user, limited, retry } = await currentUser(request);

  if (pathname === ADMIN_LOGIN) {
    // đã đăng nhập → về đúng trang ?next
    if (user)
      return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), request.url));
    return withPrivate(NextResponse.next());
  }

  if (limited) {
    const url = new URL(`${ADMIN_BASE}/too-many-requests`, request.url);
    url.searchParams.set("retry", retry);
    url.searchParams.set("next", pathname + search);
    return withPrivate(NextResponse.rewrite(url, { status: 429 }));
  }

  if (user) {
    // vừa làm mới phiên xong → bỏ tham số đánh dấu khỏi URL
    if (searchParams.has("resumed")) {
      const clean = request.nextUrl.clone();
      clean.searchParams.delete("resumed");
      return NextResponse.redirect(clean);
    }
    return withPrivate(NextResponse.next());
  }

  // Hết access token nhưng còn phiên → làm mới qua backend (refresh cookie chỉ gửi tới /api/v1/auth)
  if (hasSession(request) && searchParams.get("resumed") !== "1") {
    const back = request.nextUrl.clone();
    back.searchParams.set("resumed", "1"); // chống vòng lặp chuyển hướng
    const resume = new URL("/api/v1/auth/resume", request.url);
    resume.searchParams.set("next", back.pathname + back.search);
    return withPrivate(NextResponse.redirect(resume));
  }

  const login = new URL(ADMIN_LOGIN, request.url);
  login.searchParams.set("next", pathname + search);
  return withPrivate(NextResponse.redirect(login, 307));
}

/* ---------------- 3. Website: slug hợp lệ ---------------- */

// Slug lấy từ backend (nội dung sửa trong CMS). Nhớ NGẮN vì bộ nhớ proxy rải trên nhiều máy chủ:
// slug đã biết dùng lại tối đa 10s; slug lạ hỏi lại nếu danh sách cũ hơn 2s (bài / tour vừa đăng hiện ngay).
const SLUG_TTL = 10_000;
const SLUG_TTL_MISS = 2_000;
let slugCache = { at: 0, data: null };
let slugLoading = null;

async function fetchSlugs() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/public/slugs`, {
      headers: backendHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const d = (await res.json()).data;
    slugCache = {
      at: Date.now(),
      data: {
        tours: d.tours,
        "travel-guide": d.articles,
        destinations: [...regions.map((r) => r.slug), ...d.destinations].map((slug) => ({ slug })),
        themes: d.themes.map((slug) => ({ slug })),
        policies: d.policies.map((slug) => ({ slug })),
        "travel-guide/category": d.categories.map((slug) => ({ slug })),
        "travel-guide/author": d.authors.map((slug) => ({ slug })),
      },
    };
  } catch {
    slugCache.at = Date.now(); // backend lỗi → giữ danh sách cũ (nếu có), tránh dồn request
  } finally {
    slugLoading = null;
  }
  return slugCache.data;
}

function loadSlugs(force = false) {
  const age = Date.now() - slugCache.at;
  if (slugCache.data && age < (force ? SLUG_TTL_MISS : SLUG_TTL)) return slugCache.data;
  return (slugLoading ??= fetchSlugs());
}

const DYNAMIC =
  /^\/(tours|destinations|policies|themes|travel-guide\/category|travel-guide\/author|travel-guide)\/([^/]+)\/?$/;

/** → { ok } | { redirect: slugMới } | { missing } | null (không phải trang động / backend lỗi → cho qua) */
async function checkSlug(path) {
  const m = path.match(DYNAMIC);
  if (!m) return null;
  const [, route, raw] = m;
  if (route === "travel-guide" && (raw === "category" || raw === "author")) return null;
  const slug = decodeURIComponent(raw);
  const find = (data) => data?.[route]?.find((x) => x.slug === slug || x.old?.includes(slug));
  let data = await loadSlugs();
  if (!data) return null;
  let hit = find(data);
  if (!hit) {
    data = await loadSlugs(true);
    hit = find(data);
  }
  if (!hit) return { missing: true };
  return hit.slug === slug
    ? { ok: true }
    : { redirect: path.replace(raw, encodeURIComponent(hit.slug)) };
}

const notFound = (url, lang) => {
  url.pathname = `/${lang}/__not-found`;
  return NextResponse.rewrite(url);
};

// Ngôn ngữ có tiền tố URL (mọi ngôn ngữ trừ tiếng Anh mặc định): zh, vi
const PREFIXED = locales.filter((l) => l !== defaultLocale);

/** Kết quả kiểm tra slug → 404 thật / chuyển hướng 308 sang slug mới / undefined (đi tiếp) */
async function slugResponse(url, path, lang, prefix) {
  const r = await checkSlug(path);
  if (r?.missing) return notFound(url, lang);
  if (r?.redirect) {
    const to = url.clone();
    to.pathname = `${prefix}${r.redirect}`;
    const res = NextResponse.redirect(to, 308);
    res.headers.set("Cache-Control", "no-store"); // CMS có thể đổi slug lần nữa → trình duyệt không nhớ mãi
    return res;
  }
  return undefined;
}

export async function proxy(request) {
  const url = request.nextUrl;
  const { pathname } = url;

  if (pathname.startsWith("/api/v1/")) return forwardApi(request);
  if (pathname === ADMIN_LOGIN || pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`))
    return guardAdmin(request);

  const prefixed = PREFIXED.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (prefixed) {
    return (
      (await slugResponse(url, pathname.slice(prefixed.length + 1), prefixed, `/${prefixed}`)) ??
      NextResponse.next()
    );
  }

  if (pathname === `/${defaultLocale}` || pathname.startsWith(`/${defaultLocale}/`)) {
    url.pathname = pathname.slice(defaultLocale.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  // Trang chủ: trình duyệt ưu tiên tiếng Trung / tiếng Việt và chưa từng tự chọn ngôn ngữ (cookie "lang") → /zh, /vi
  if (pathname === "/" && !request.cookies.get("lang")) {
    const first = (request.headers.get("accept-language") || "").split(",")[0].trim();
    const pref = PREFIXED.find((l) => first.toLowerCase().startsWith(l));
    if (pref) {
      url.pathname = `/${pref}`;
      return NextResponse.redirect(url);
    }
  }

  const res = await slugResponse(url, pathname, defaultLocale, "");
  if (res) return res;

  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Mọi trang (bỏ qua tài nguyên tĩnh, file có phần mở rộng) + API /api/v1/* (gắn mã bí mật)
  matcher: ["/((?!_next|api|images|icons|videos|.*\\..*).*)", "/api/v1/:path*"],
};
