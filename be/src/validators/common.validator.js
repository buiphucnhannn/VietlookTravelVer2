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

/** Độ dài tối thiểu khi ĐẶT mật khẩu quản trị (fe kiểm tra trước: MIN_PASSWORD trong trang Đổi mật khẩu / Tài khoản) */
export const MIN_PASSWORD = 8;

/**
 * Mật khẩu khi tạo tài khoản / đặt lại / đổi mật khẩu: ít nhất 8 ký tự, không bắt ký tự đặc biệt.
 * Chỉ áp dụng khi ĐẶT mật khẩu — đăng nhập vẫn nhận mật khẩu cũ ngắn hơn (loginSchema).
 * Giới hạn 128 ký tự để chống gửi chuỗi khổng lồ làm nặng việc băm (DoS).
 */
export const strongPassword = z
  .string()
  .min(1, "Vui lòng nhập mật khẩu")
  .min(MIN_PASSWORD, `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự`)
  .max(128, "Mật khẩu tối đa 128 ký tự");

/** Chữ thuần (tên, ghi chú): bỏ ký tự điều khiển vô hình, giới hạn độ dài */
export const plainText = (max) =>
  z
    .string()
    .max(max * 2)
    .transform((s) =>
      s
        // eslint-disable-next-line no-control-regex -- cố ý: tìm đúng các ký tự điều khiển để XOÁ
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        // khách gõ / dán thẻ HTML (<b>, <script>…) → bỏ thẻ, giữ chữ ("trẻ < 5 tuổi" vẫn giữ nguyên)
        .replace(/<\/?[a-z][^<>]*>/gi, "")
        .trim(),
    )
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
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang",
  );

/** Ảnh đã upload (Cloudinary) — chỉ nhận https (chặn javascript:, data:, http:) */
export const image = z.object({
  url: z.url({ protocol: /^https$/ }),
  publicId: z.string().max(300).optional().default(""),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().max(300).optional().default(""),
});
