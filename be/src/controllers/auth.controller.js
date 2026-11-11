import { env } from "../config/env.js";
import { auditService } from "../services/audit.service.js";
import { authService } from "../services/auth.service.js";
import { toPublicUser } from "../services/user.service.js";
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "../utils/auth-cookies.js";
import { ok } from "../utils/response.js";

const meta = (req) => ({ ip: req.ip, userAgent: req.get("user-agent") });

/** Đường dẫn khu quản trị trên website (đổi ở đây nếu đổi thư mục admin bên fe/) */
const ADMIN_BASE = "/admin";

/** Chỉ chấp nhận đường dẫn nội bộ trong khu quản trị (chặn open redirect: //evil.com, evil.com, https://...) */
const safeNext = (raw) => {
  const next = String(raw ?? ADMIN_BASE);
  return next.startsWith(ADMIN_BASE) && !next.startsWith("//") && !next.includes("\\")
    ? next
    : ADMIN_BASE;
};

/**
 * Controller chỉ: lấy dữ liệu đã validate → gọi service → trả phản hồi.
 * Token chỉ nằm trong cookie HttpOnly — KHÔNG BAO GIỜ trả trong body.
 */
export const authController = {
  async login(req, res) {
    let session;
    try {
      session = await authService.login(req.validated.body, meta(req));
    } catch (err) {
      // Không ghi tên đăng nhập / mật khẩu đã gõ vào log (có thể là mật khẩu gõ nhầm ô)
      if (err.code === "INVALID_CREDENTIALS" || err.code === "ACCOUNT_LOCKED")
        auditService.record(
          req,
          err.code === "ACCOUNT_LOCKED" ? "auth.locked" : "auth.login_failed",
          {
            // đúng tên đăng nhập → ghi tên tài khoản đó; tên không tồn tại → để trống (không ghi chữ đã gõ)
            actor: err.userId ? { id: err.userId, username: err.username } : null,
            level: "warn",
          },
        );
      throw err;
    }
    const { user, accessToken, refreshToken, remember } = session;
    auditService.record(req, "auth.login", { actor: user });
    setAuthCookies(res, { accessToken, refreshToken, remember });
    ok(res, { user });
  },

  /** GET /auth/demo — trang đăng nhập hỏi có hiện nút "Đăng nhập nhanh" không */
  demoStatus(_req, res) {
    ok(res, { enabled: env.demoLogin });
  },

  async demoLogin(req, res) {
    const { user, accessToken, refreshToken, remember } = await authService.demoLogin(meta(req));
    auditService.record(req, "auth.login", { actor: user, meta: { demo: true } });
    setAuthCookies(res, { accessToken, refreshToken, remember });
    ok(res, { user });
  },

  async refresh(req, res) {
    try {
      const session = await authService.refresh(req.cookies?.[REFRESH_COOKIE], meta(req));
      setAuthCookies(res, session);
      ok(res, { user: session.user });
    } catch (err) {
      clearAuthCookies(res);
      throw err;
    }
  },

  /** GET — proxy Next.js điều hướng trình duyệt tới đây khi access hết hạn: làm mới xong quay lại trang cũ */
  async resume(req, res) {
    try {
      setAuthCookies(res, await authService.refresh(req.cookies?.[REFRESH_COOKIE], meta(req)));
    } catch {
      clearAuthCookies(res);
    }
    res.redirect(303, safeNext(req.query.next));
  },

  async logout(req, res) {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
    res.status(204).end();
  },

  async me(req, res) {
    // requireAuth vừa đọc tài khoản (còn hoạt động, đúng phiên) → trả luôn, không truy vấn DB lần 2
    ok(res, {
      user: req.authUser ? toPublicUser(req.authUser) : await authService.me(req.user.id),
    });
  },

  async changePassword(req, res) {
    const session = await authService.changePassword(req.user.id, req.validated.body, meta(req));
    auditService.record(req, "auth.password_change", { target: { type: "user", id: req.user.id } });
    setAuthCookies(res, session);
    ok(res, { user: session.user });
  },
};
