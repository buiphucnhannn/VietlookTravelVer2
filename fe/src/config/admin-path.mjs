/**
 * Đường dẫn BÍ MẬT của trang đăng nhập quản trị (biến môi trường ADMIN_LOGIN_PATH, VD "/quan-tri-7f3k9x").
 * CHỈ dùng ở server: next.config.mjs + src/proxy.js. KHÔNG import file này từ Client Component — giá trị không
 * được lọt vào JS công khai, HTML trang công khai, sitemap hay robots.txt.
 *
 * - Đã đặt → trang đăng nhập chỉ mở ở đường dẫn này; /login, /admin… với người chưa đăng nhập → 404 như trang không có.
 * - Chưa đặt (máy dev / test) → giữ như cũ: đăng nhập ở /login.
 *
 * Quy tắc: 1 đoạn, chỉ chữ thường không dấu / số / gạch ngang, dài 8–64 ký tự, không trùng khu vực có sẵn.
 */
const RESERVED = /^\/(admin|login|api|en|vi|zh|_next|images|icons|videos)(-|$)/;

export function resolveAdminLoginPath() {
  const raw = (process.env.ADMIN_LOGIN_PATH ?? "").trim();
  if (!raw) return null;
  const path = `/${raw.replace(/^\/+|\/+$/g, "")}`.toLowerCase();
  if (!/^\/[a-z0-9-]{8,64}$/.test(path) || RESERVED.test(path)) {
    console.warn(
      "[vietlook] ADMIN_LOGIN_PATH không hợp lệ (cần dạng /quan-tri-xxxxxx: chữ thường không dấu, số, gạch ngang, 8–64 ký tự) — tạm dùng /login.",
    );
    return null;
  }
  return path;
}

/** Cảnh báo lúc build / chạy production nếu chưa đặt (trang đăng nhập vẫn ở /login — ai cũng đoán được). */
export function warnIfAdminLoginPathMissing() {
  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_LOGIN_PATH?.trim()) {
    console.warn(
      "[vietlook] Chưa đặt ADMIN_LOGIN_PATH — trang đăng nhập quản trị đang ở /login (dễ đoán). Đặt đường dẫn bí mật trong Vercel → Settings → Environment Variables rồi Redeploy (xem docs/DEPLOY.md).",
    );
  }
}
