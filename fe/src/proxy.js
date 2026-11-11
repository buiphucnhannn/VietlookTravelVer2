import { NextResponse } from "next/server";
import { ADMIN_BASE, ADMIN_LOGIN, BACKEND_URL, backendHeaders, safeNext } from "@/config/urls.mjs";
import { defaultLocale, locales } from "@/i18n/config";
import { regions } from "@/data/regions";

/**
 * Proxy (Next 16 — thay middleware):
 * 1. /api/v1/*      → chuyển tiếp sang backend kèm mã bí mật (PROXY_SECRET) + IP thật của khách.
 * 2. Khu quản trị   → mở trang trực tiếp: hỏi backend /auth/me bằng cookie TRƯỚC khi render (proxy không giữ
 *                     secret JWT nào): chưa đăng nhập → trang đăng nhập; access hết hạn nhưng còn phiên → /auth/resume.
 *                     Chuyển tab / tải trước bên trong CMS: chỉ cần cookie phiên (xem guardAdmin).
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
    if (res.status >= 500) return { user: null, down: true }; // máy chủ API đang khởi động lại / lỗi
    if (!res.ok) return { user: null };
    return { user: (await res.json()).data.user };
  } catch {
    return { user: null, down: true };
  }
}

/**
 * Request do router của Next tự gửi bằng fetch (chuyển trang trong CMS, tải trước link) — KHÔNG phải trình duyệt
 * mở trang (gõ địa chỉ, F5, mở tab mới). Next ẩn header nội bộ (rsc, next-router-prefetch) khỏi proxy, nên dựa vào
 * Sec-Fetch-Dest do trình duyệt tự đặt: "empty" = fetch(). Thiếu header (trình duyệt cũ) → coi là mở trang (kiểm tra đủ).
 */
const isRouterFetch = (request) => request.headers.get("sec-fetch-dest") === "empty";

async function guardAdmin(request) {
  const { pathname, search, searchParams } = request.nextUrl;

  /*
   * Chuyển tab / tải trước trong CMS: KHÔNG hỏi backend (mỗi lần hỏi = 1 vòng mạng tới máy chủ API → bấm menu bị chậm,
   * tải trước nhiều link còn chạm giới hạn chống spam). Chỉ cần cookie đánh dấu phiên rồi cho qua. Vẫn an toàn vì:
   *  - Khung giao diện CMS là trang dựng sẵn, giống nhau cho mọi người, KHÔNG chứa dữ liệu nào (không tên khách,
   *    không nội dung nháp…). Mọi dữ liệu đều tải qua API backend — API kiểm tra đăng nhập + quyền từng mục ở MỌI
   *    request (requireAuth / requirePermission), nên bước kiểm tra ở proxy chỉ để chuyển người chưa đăng nhập về
   *    trang đăng nhập cho gọn (trải nghiệm), không phải lớp bảo vệ dữ liệu.
   *  - Mở trang trực tiếp (F5, gõ địa chỉ, tab mới) vẫn hỏi backend đầy đủ như trước (bên dưới).
   *  - Phiên hết hạn / bị thu hồi khi đang chuyển tab: API trả 401 → lib/api.js tự làm mới phiên, không được
   *    → về /login; AdminShell cũng hỏi lại /auth/me (khi quay lại tab, mỗi phút, sau lỗi 403).
   */
  if (pathname !== ADMIN_LOGIN && isRouterFetch(request)) {
    if (hasSession(request)) return withPrivate(NextResponse.next());
    const login = new URL(ADMIN_LOGIN, request.url);
    login.searchParams.set("next", pathname + search);
    return withPrivate(NextResponse.redirect(login, 307));
  }

  const { user, limited, retry, down } = await currentUser(request);

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

  // Máy chủ API tạm không trả lời mà người dùng còn phiên → báo "tạm gián đoạn" (503), KHÔNG đẩy về đăng nhập
  // (tránh tưởng bị đăng xuất / sai mật khẩu). Phiên thật sự hết hạn (401) vẫn đi tiếp xuống dưới như cũ.
  if (down && hasSession(request)) {
    const url = new URL(`${ADMIN_BASE}/unavailable`, request.url);
    url.searchParams.set("next", pathname + search);
    const res = NextResponse.rewrite(url, { status: 503 });
    res.headers.set("Retry-After", "10");
    return withPrivate(res);
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
  // Bỏ "/" cuối (next.config: skipTrailingSlashRedirect) — 301 một bước, giữ query
  if (pathname.length > 1 && pathname.endsWith("/")) {
    // URL thường (không dùng nextUrl: NextURL tự thêm lại "/" cuối theo URL gốc → vòng lặp)
    const to = new URL(`${pathname.replace(/\/+$/, "") || "/"}${url.search}`, request.url);
    return NextResponse.redirect(to, 301);
  }
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

  // Trang chủ "/" LUÔN là tiếng Anh (ngôn ngữ mặc định) — không tự chuyển theo ngôn ngữ trình duyệt/điện thoại.
  // Khách muốn tiếng Việt / tiếng Trung tự chọn ở nút ngôn ngữ (đường dẫn /vi, /zh). Cũng đúng khuyến nghị của Google:
  // không tự chuyển hướng theo ngôn ngữ để Googlebot thấy đủ mọi phiên bản.

  const res = await slugResponse(url, pathname, defaultLocale, "");
  if (res) return res;

  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Mọi trang (bỏ qua tài nguyên tĩnh, file có phần mở rộng) + API /api/v1/* (gắn mã bí mật)
  matcher: ["/((?!_next|api|images|icons|videos|.*\\..*).*)", "/api/v1/:path*"],
};
