/**
 * Địa chỉ backend (thư mục be/) — CHỈ server Next.js dùng (trình duyệt luôn gọi /api/v1 cùng tên miền).
 * .mjs thuần, không alias "@/" → next.config.mjs import được.
 */
const trim = (u) => u.replace(/\/+$/, "");
const withProtocol = (host) => (/^https?:\/\//.test(host) ? host : `https://${host}`);

/**
 * Backend chạy ở máy chủ KHÁC (Cloud VPS) nên không tự đoán được → production phải đặt BACKEND_URL.
 * Máy dev: mặc định http://localhost:4000.
 */
export function resolveBackendUrl() {
  if (process.env.BACKEND_URL) return trim(withProtocol(process.env.BACKEND_URL));
  if (process.env.VERCEL) {
    console.warn(
      "[vietlook] Chưa đặt BACKEND_URL — website không gọi được API. Thêm BACKEND_URL (VD https://api.vietlooktravel.com) trong Vercel → Settings → Environment Variables.",
    );
  }
  return "http://localhost:4000";
}

/**
 * Header gắn vào MỌI request server Next gửi sang backend: mã bí mật chung (PROXY_SECRET, đặt CÙNG giá trị
 * ở Vercel và backend) → backend chỉ nhận request đi qua website, chặn gọi thẳng để giả IP né giới hạn.
 * Chỉ dùng ở server (proxy.js, Server Components, server action) — KHÔNG phải biến NEXT_PUBLIC_.
 */
export const PROXY_SECRET_HEADER = "x-proxy-secret";
export const backendHeaders = () =>
  process.env.PROXY_SECRET ? { [PROXY_SECRET_HEADER]: process.env.PROXY_SECRET } : {};

export const BACKEND_URL = resolveBackendUrl();

/**
 * Khu quản trị (CMS) — thư mục app/(system)/admin và app/(system)/login.
 * Bảo vệ: proxy hỏi backend /auth/me TRƯỚC khi render (chưa đăng nhập → /login), mọi API quản trị bắt buộc
 * đăng nhập + phân quyền, không index (noindex), không cache, không cho nhúng iframe (xem next.config.mjs).
 */
export const ADMIN_BASE = "/admin";
export const ADMIN_LOGIN = "/login";
