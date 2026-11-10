import { z } from "zod";
import { MODULES } from "../constants/permissions.js";
import { ROLE_VALUES } from "../constants/roles.js";
import {
  email,
  pageQuery,
  plainText,
  searchQuery,
  strongPassword,
  username,
} from "./common.validator.js";

const name = plainText(100).pipe(z.string().min(2, "Tên tối thiểu 2 ký tự"));
const role = z.enum(ROLE_VALUES);

/** Quyền từng mục: chỉ nhận mục đã biết + mức hợp lệ của mục đó (mục lạ → lỗi). Thiếu mục = Không truy cập. */
export const permissionsSchema = z
  .object(
    Object.fromEntries(
      Object.entries(MODULES).map(([m, levels]) => [m, z.enum(levels).optional()]),
    ),
  )
  .strict();

export const listUsersQuery = pageQuery.extend({
  q: searchQuery,
  role: role.optional(),
});

export const createUserSchema = z.object({
  username,
  email: z
    .union([z.literal(""), email])
    .optional()
    .default(""),
  name,
  password: strongPassword,
  role: role.default("editor"),
  permissions: permissionsSchema.optional(),
});

export const updateUserSchema = z
  .object({
    name: name.optional(),
    role: role.optional(),
    isActive: z.boolean().optional(),
    permissions: permissionsSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Không có thay đổi nào");

export const resetPasswordSchema = z.object({ newPassword: strongPassword });
