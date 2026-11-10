import { z } from "zod";
import { strongPassword } from "./common.validator.js";

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Vui lòng nhập tên đăng nhập").max(64),
  password: z.string().min(1, "Vui lòng nhập mật khẩu").max(128),
  remember: z.boolean().optional().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại").max(128),
  newPassword: strongPassword,
});
