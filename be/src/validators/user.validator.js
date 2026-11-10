import { z } from "zod";
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
});

export const updateUserSchema = z
  .object({ name: name.optional(), role: role.optional(), isActive: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, "Không có thay đổi nào");

export const resetPasswordSchema = z.object({ newPassword: strongPassword });
