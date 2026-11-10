import { Schema, model } from "mongoose";
import { MODULES } from "../constants/permissions.js";
import { ROLES, ROLE_VALUES } from "../constants/roles.js";
import { toJSONOptions } from "./shared.schema.js";

/**
 * Tài khoản quản trị CMS.
 * - Mật khẩu chỉ lưu dạng băm scrypt (password.service.js), `select: false` → không bao giờ tự lọt ra truy vấn.
 * - tokenVersion: tăng khi đổi mật khẩu / khoá tài khoản → mọi access token cũ lập tức vô hiệu.
 * - failedLoginCount + lockUntil: nhập sai nhiều lần → tạm khoá (LOGIN_MAX_ATTEMPTS, LOGIN_LOCK_MINUTES).
 */
const HIDDEN = ["passwordHash", "tokenVersion", "failedLoginCount"];

const permissionsSchema = new Schema(
  Object.fromEntries(
    Object.entries(MODULES).map(([m, levels]) => [m, { type: String, enum: levels }]),
  ),
  { _id: false },
);

const userSchema = new Schema(
  {
    // Tên đăng nhập (chữ thường, không dấu): a-z 0-9 . _ - @
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 64,
    },
    email: { type: String, lowercase: true, trim: true, maxlength: 254, default: "" },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.EDITOR },
    // Quyền từng mục cho nhân viên (admin bỏ qua). Chưa có (tài khoản cũ) → quyền mặc định cũ,
    // tính lúc đọc trong constants/permissions.js (effectivePermissions) — không cần chuyển dữ liệu.
    permissions: { type: permissionsSchema, default: undefined },
    isActive: { type: Boolean, default: true },
    // (cũ) managedByEnv — đã bỏ; giữ khai báo để dọn dữ liệu cũ
    managedByEnv: { type: Boolean },

    tokenVersion: { type: Number, default: 0 },
    passwordChangedAt: { type: Date, default: null },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: "" },
  },
  { timestamps: true, toJSON: toJSONOptions(HIDDEN), toObject: toJSONOptions(HIDDEN) },
);

export const USER_HIDDEN_FIELDS = HIDDEN;
export const User = model("User", userSchema);
