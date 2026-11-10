import { z } from "zod";
import { env } from "../config/env.js";
import { parseVideo } from "../utils/video.js";

/** Thư mục con trên Cloudinary: tours, articles, destinations... (chữ thường, số, gạch ngang) */
const folder = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{1,40}$/, "Thư mục không hợp lệ")
  .default("misc");

export const folderQuery = z.object({ folder });

/** Thêm ảnh từ link: http(s), tối đa 2048 ký tự (kiểm tra máy nội bộ ở upload.service.checkImageUrl) */
export const imageFromUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .max(2048, "Link quá dài")
    .regex(/^https?:\/\/\S+$/i, "Link ảnh phải bắt đầu bằng http:// hoặc https://"),
  folder,
});

export const deleteImageSchema = z.object({
  // chỉ được xoá ảnh trong thư mục của website (không đụng ảnh khác trên tài khoản Cloudinary)
  publicId: z
    .string()
    .max(300)
    .regex(/^[\w-]+(?:\/[\w-]+)+$/, "publicId không hợp lệ")
    .refine((id) => id.startsWith(`${env.cloudinary.folder}/`), "Ảnh không thuộc website")
    // ảnh hệ thống của website (đưa lên bằng images:upload) không được xoá từ CMS — website đang dùng
    .refine(
      (id) => !id.startsWith(`${env.cloudinary.folder}/site/`),
      "Không xoá được ảnh hệ thống của website",
    ),
});

/** Chép video nền trang chủ từ Google Drive: chỉ nhận link Drive hợp lệ (máy chủ tự dựng link tải từ mã file) */
export const driveVideoSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500, "Link quá dài")
    .refine((v) => parseVideo(v)?.provider === "drive", "Link chưa phải video Google Drive"),
});

export const driveVideoJobParams = z.object({ jobId: z.uuid("Không tìm thấy") });
