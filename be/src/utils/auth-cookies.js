import { env } from "../config/env.js";
import { toMs } from "./duration.js";

/**
 * Cookie đăng nhập — HttpOnly (JS trình duyệt không đọc được → chống đánh cắp token qua XSS),
 * SameSite=Strict (chống CSRF), Secure + tiền tố __Host- / __Secure- ở production.
 * Không đặt domain → cookie chỉ thuộc đúng host (frontend gọi API qua rewrite cùng origin của Next.js).
 * Token KHÔNG BAO GIỜ trả trong body / lưu localStorage.
 */
const secure = env.cookieSecure;
const REFRESH_TTL_MS = toMs(env.jwt.refreshTtl);

export const ACCESS_COOKIE = secure ? "__Host-vl_at" : "vl_at";
export const REFRESH_COOKIE = secure ? "__Secure-vl_rt" : "vl_rt";
/** Cookie "gợi ý" (giá trị "1", không chứa bí mật) để proxy Next biết còn phiên → thử làm mới thay vì bắt đăng nhập */
export const SESSION_HINT_COOKIE = secure ? "__Host-vl_session" : "vl_session";
export const REFRESH_PATH = "/api/v1/auth"; // refresh token chỉ được gửi tới các route /auth

const base = { httpOnly: true, secure, sameSite: "strict" };

/**
 * remember = "Ghi nhớ đăng nhập": cookie có hạn (giữ qua các lần tắt trình duyệt).
 * Không ghi nhớ: cookie phiên (không maxAge) → trình duyệt tự xoá khi đóng.
 */
export function setAuthCookies(res, { accessToken, refreshToken, remember = false }) {
  const life = remember ? { maxAge: REFRESH_TTL_MS } : {};
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, path: "/", ...life });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, path: REFRESH_PATH, ...life });
  res.cookie(SESSION_HINT_COOKIE, "1", { ...base, path: "/", ...life });
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...base, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
  res.clearCookie(SESSION_HINT_COOKIE, { ...base, path: "/" });
}
