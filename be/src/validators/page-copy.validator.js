import { z } from "zod";
import { PAGE_COPY_SCHEMA } from "../constants/page-copy.js";
import { plainText } from "./common.validator.js";
import { media } from "./content.validator.js";

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

/** Zod cho dữ liệu cả trang: mọi ô đều không bắt buộc (không gửi = dùng mặc định) */
export function pageCopySchema(key) {
  const fields = PAGE_COPY_SCHEMA[key];
  if (!fields) return null;
  return z.object({
    data: z
      .object(
        Object.fromEntries(Object.entries(fields).map(([k, s]) => [k, fieldSchema(s).optional()])),
      )
      .default({}),
  });
}

/** Schema dựng sẵn cho mọi trang (dựng 1 lần lúc khởi động) */
export const PAGE_COPY_VALIDATORS = Object.freeze(
  Object.fromEntries(Object.keys(PAGE_COPY_SCHEMA).map((k) => [k, pageCopySchema(k)])),
);
