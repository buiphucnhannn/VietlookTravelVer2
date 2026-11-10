import { CONTENT_MODULES, can, canAny, effectivePermissions } from "../constants/permissions.js";
import { ROLES } from "../constants/roles.js";
import { userRepository } from "../repositories/user.repository.js";
import { verifyAccessToken } from "../services/token.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ACCESS_COOKIE } from "../utils/auth-cookies.js";

/**
 * Bắt buộc đã đăng nhập: access token (cookie HttpOnly) hợp lệ + tài khoản còn hoạt động
 * + tokenVersion khớp (đổi mật khẩu / bị khoá → token cũ hết hiệu lực ngay, không chờ hết hạn).
 * Đọc lại tài khoản từ DB MỖI request → vai trò / quyền vừa đổi có hiệu lực ngay, không tin dữ liệu trong token.
 * Gắn req.user = { id, username, name, role, permissions } (permissions = quyền thực tế đã chuẩn hoá).
 */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(ApiError.unauthorized("Bạn chưa đăng nhập", "UNAUTHENTICATED"));

  const payload = verifyAccessToken(token);
  if (!payload) return next(ApiError.unauthorized("Phiên đăng nhập đã hết hạn", "TOKEN_EXPIRED"));

  const user = await userRepository.findById(payload.sub, {
    select: "username name role permissions isActive tokenVersion",
  });
  if (!user || !user.isActive || (user.tokenVersion ?? 0) !== payload.tv)
    return next(ApiError.unauthorized("Phiên đăng nhập không còn hiệu lực", "TOKEN_REVOKED"));

  req.user = {
    id: String(user._id),
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: effectivePermissions(user),
  };
  next();
}

/** Bắt buộc có 1 trong các vai trò (dùng sau requireAuth) */
export const requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(ApiError.forbidden());

/** Đã đăng nhập bằng tài khoản quản trị (admin hoặc nhân viên) — quyền từng mục kiểm tra riêng */
export const requireStaff = [requireAuth, requireRole(ROLES.ADMIN, ROLES.EDITOR)];
/** Route chỉ admin (tài khoản, cài đặt email / thanh toán / mã đo lường) */
export const requireAdmin = [requireAuth, requireRole(ROLES.ADMIN)];

/** Cần mức `level` (view | edit | full) ở mục `module` — dùng sau requireStaff */
export const requirePermission = (module, level) => (req, _res, next) =>
  can(req.user, module, level) ? next() : next(ApiError.forbidden());

/** Cần mức `level` ở ít nhất 1 mục trong danh sách */
export const requireAnyPermission = (modules, level) => (req, _res, next) =>
  canAny(req.user, modules, level) ? next() : next(ApiError.forbidden());

/** Tải ảnh / dịch tự động / chép video: cần quyền sửa ít nhất 1 mục nội dung website */
export const requireContentEditor = requireAnyPermission(CONTENT_MODULES, "edit");
