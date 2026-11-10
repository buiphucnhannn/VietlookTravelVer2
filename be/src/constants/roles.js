/**
 * Vai trò tài khoản quản trị.
 * - admin : toàn quyền (quản lý tài khoản, cài đặt thanh toán, xem nhật ký thao tác)
 * - editor: quản lý nội dung (tour, bài viết, ảnh, đơn đặt) — không quản lý tài khoản
 */
export const ROLES = Object.freeze({ ADMIN: "admin", EDITOR: "editor" });
export const ROLE_VALUES = Object.values(ROLES);
