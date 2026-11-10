import { z } from "zod";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Mã không hợp lệ");
export const idParam = z.object({ id: objectId });

export const pageQuery = z.object({
  page: z.coerce.number().int().positive().max(10_000).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

/** Tên đăng nhập: chữ thường không dấu, số và . _ - @ (3–64 ký tự) */
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._@-]{3,64}$/, "Tên đăng nhập 3–64 ký tự: chữ không dấu, số và . _ - @");

export const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Email không hợp lệ"));

/**
 * Mật khẩu tài khoản quản trị: khách đặt tuỳ ý, chỉ cần không để trống.
 * Giới hạn 128 ký tự để chống gửi chuỗi khổng lồ làm nặng việc băm (DoS).
 */
export const strongPassword = z
  .string()
  .min(1, "Vui lòng nhập mật khẩu")
  .max(128, "Mật khẩu tối đa 128 ký tự");

/** Chữ thuần (tên, ghi chú): bỏ ký tự điều khiển vô hình, giới hạn độ dài */
export const plainText = (max) =>
  z
    .string()
    .max(max * 2)
    // eslint-disable-next-line no-control-regex -- cố ý: tìm đúng các ký tự điều khiển để XOÁ
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max, `Tối đa ${max} ký tự`));

/** Ô tìm kiếm (?q=) */
export const searchQuery = z.string().trim().max(100).optional();

/** Chuỗi 3 ngôn ngữ — khớp localizedString ở models/shared.schema.js */
export const localized = z.object({
  en: z.string().trim().min(1),
  zh: z.string().trim().default(""),
  vi: z.string().trim().default(""),
});

/** slug URL: chữ thường không dấu, số, gạch ngang */
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang");

/** Ảnh đã upload (Cloudinary) — chỉ nhận https (chặn javascript:, data:, http:) */
export const image = z.object({
  url: z.url({ protocol: /^https$/ }),
  publicId: z.string().max(300).optional().default(""),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().max(300).optional().default(""),
});
