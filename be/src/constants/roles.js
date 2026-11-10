/**
 * Vai trò tài khoản quản trị.
 * - admin : toàn quyền (gồm Cài đặt và Tài khoản quản trị)
 * - editor: "Nhân viên" — chỉ các mục được cấp trong permissions (constants/permissions.js)
 */
export const ROLES = Object.freeze({ ADMIN: "admin", EDITOR: "editor" });
export const ROLE_VALUES = Object.values(ROLES);
