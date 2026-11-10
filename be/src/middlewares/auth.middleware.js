import { ROLES } from "../constants/roles.js";
import { userRepository } from "../repositories/user.repository.js";
import { verifyAccessToken } from "../services/token.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ACCESS_COOKIE } from "../utils/auth-cookies.js";

/**
 * Bắt buộc đã đăng nhập: access token (cookie HttpOnly) hợp lệ + tài khoản còn hoạt động
 * + tokenVersion khớp (đổi mật khẩu / bị khoá → token cũ hết hiệu lực ngay, không chờ hết hạn).
 * Gắn req.user = { id, username, name, role }.
 */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(ApiError.unauthorized("Bạn chưa đăng nhập", "UNAUTHENTICATED"));

  const payload = verifyAccessToken(token);
  if (!payload) return next(ApiError.unauthorized("Phiên đăng nhập đã hết hạn", "TOKEN_EXPIRED"));

  const user = await userRepository.findById(payload.sub, {
    select: "username name role isActive tokenVersion",
  });
  if (!user || !user.isActive || (user.tokenVersion ?? 0) !== payload.tv)
    return next(ApiError.unauthorized("Phiên đăng nhập không còn hiệu lực", "TOKEN_REVOKED"));

  req.user = { id: String(user._id), username: user.username, name: user.name, role: user.role };
  next();
}

/** Bắt buộc có 1 trong các vai trò (dùng sau requireAuth) */
export const requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(ApiError.forbidden());

/** Route quản lý nội dung (admin + editor) */
export const requireStaff = [requireAuth, requireRole(ROLES.ADMIN, ROLES.EDITOR)];
/** Route chỉ admin (tài khoản, thanh toán, nhật ký) */
export const requireAdmin = [requireAuth, requireRole(ROLES.ADMIN)];
