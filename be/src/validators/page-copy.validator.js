import { z } from "zod";
import { PAGE_COPY_SCHEMA, PAGE_COPY_SEO_KEYS } from "../constants/page-copy.js";
import { plainText } from "./common.validator.js";
import { media } from "./content.validator.js";
import { PAGE_COPY_HIDEABLE } from "../constants/hidden-blocks.js";
import { hiddenBlocks } from "./hidden-blocks.validator.js";

/**
 * Kiểm tra dữ liệu "Giao diện trang" theo khai báo của từng trang (constants/page-copy.js).
 * Chữ lưu dạng CHỮ THUẦN (bỏ thẻ HTML, ký tự điều khiển — website hiện như văn bản); ảnh chỉ nhận ảnh kho ảnh
 * Cloudinary của website hoặc ảnh có sẵn /images/…; ô lạ (không khai báo) bị bỏ; danh sách không vượt số phần tử.
 */

/** 1 dòng: gộp xuống dòng / khoảng trắng thừa */
const line = (max) => plainText(max).transform((s) => s.replace(/\s+/g, " ").trim());

/** Đoạn văn: giữ xuống dòng (tối đa 1 dòng trống liền nhau), bỏ khoảng trắng cuối dòng */
const paragraph = (max) =>
  plainText(max).transform((s) =>
    s
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );

const localized = (one) =>
  z.object({ en: one.default(""), zh: one.default(""), vi: one.default("") }).default({});

/** Zod cho 1 ô theo khai báo { type, max, count, item } */
export function fieldSchema(spec) {
  switch (spec.type) {
    case "text":
      return localized(line(spec.max));
    case "para":
      return localized(paragraph(spec.max));
    case "image":
      return media.default("");
    case "list": {
      const item = spec.item.type
        ? fieldSchema(spec.item)
        : z
            .object(
              Object.fromEntries(
                Object.entries(spec.item).map(([k, s]) => [k, fieldSchema(s).optional()]),
              ),
            )
            .default({});
      return z.array(item).max(spec.count, `Danh sách tối đa ${spec.count} mục`).optional();
    }
    default:
      throw new Error(`Kiểu ô không hỗ trợ: ${spec.type}`);
  }
}

/** Hiển thị trên Google: { en, zh, vi } × { title, description } (chữ thuần, 1 dòng) */
const seoLang = z
  .object({ title: line(200).default(""), description: line(500).default("") })
  .default({});
export const pageSeoSchema = z.object({ en: seoLang, zh: seoLang, vi: seoLang });

/** Lúc bản đang sửa được lưu (trình sửa gửi kèm) — có người lưu sau đó → 409, xem services/revision.service.js */
export const baseUpdatedAt = z.string().max(40).optional();

/** Zod cho dữ liệu cả trang: mọi ô đều không bắt buộc (không gửi = dùng mặc định) */
export function pageCopySchema(key) {
  const fields = PAGE_COPY_SCHEMA[key];
  if (!fields) return null;
  // khối tắt được trên website (constants/hidden-blocks.js) → cờ { <khối>: true }
  const hideable = Object.hasOwn(PAGE_COPY_HIDEABLE, key) ? PAGE_COPY_HIDEABLE[key] : null;
  return z.object({
    data: z
      .object({
        ...Object.fromEntries(
          Object.entries(fields).map(([k, s]) => [k, fieldSchema(s).optional()]),
        ),
        ...(hideable ? { hidden: hiddenBlocks(hideable).optional() } : {}),
        ...(PAGE_COPY_SEO_KEYS.includes(key) ? { seo: pageSeoSchema.optional() } : {}),
      })
      .default({}),
    baseUpdatedAt,
  });
}

/** Schema dựng sẵn cho mọi trang (dựng 1 lần lúc khởi động) */
export const PAGE_COPY_VALIDATORS = Object.freeze(
  Object.fromEntries(Object.keys(PAGE_COPY_SCHEMA).map((k) => [k, pageCopySchema(k)])),
);
