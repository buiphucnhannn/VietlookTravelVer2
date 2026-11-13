import { z } from "zod";
import { REVIEW_LANGS, REVIEW_PLACES, REVIEW_SOURCES } from "../constants/content.js";
import { plainText } from "./common.validator.js";
import { loc, media } from "./content.validator.js";

/**
 * Đánh giá khách (CMS → Đánh giá khách). Lời khách lưu dạng CHỮ THUẦN (bỏ thẻ HTML, ký tự điều khiển) —
 * website hiện như văn bản, không bao giờ hiện HTML.
 */

/** 1 dòng (tên, tiêu đề): gộp xuống dòng / khoảng trắng thừa */
const line = (max) => plainText(max).transform((s) => s.replace(/\s+/g, " ").trim());

/** Lời khách: giữ xuống dòng (tối đa 1 dòng trống liền nhau), bỏ khoảng trắng cuối dòng */
const paragraph = (max) =>
  plainText(max).transform((s) =>
    s
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );

/** Link bài đánh giá gốc: chỉ http(s) (chặn javascript:, data:…) */
const sourceUrl = z
  .string()
  .trim()
  .max(1000, "Link quá dài")
  .refine((v) => {
    if (v === "") return true;
    try {
      const u = new URL(v);
      return (u.protocol === "https:" || u.protocol === "http:") && !/\s/.test(v);
    } catch {
      return false;
    }
  }, "Link bài gốc phải là địa chỉ web bắt đầu bằng http:// hoặc https://")
  .default("");

/** Ngày đánh giá "YYYY-MM-DD" (không bắt buộc): ngày có thật, không ở tương lai */
const reviewDate = z
  .string()
  .trim()
  .refine((v) => {
    if (v === "") return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Ngày đánh giá không hợp lệ")
  .refine(
    (v) => v === "" || v <= new Date(Date.now() + 14 * 3600_000).toISOString().slice(0, 10),
    "Ngày đánh giá không được sau hôm nay",
  )
  .default("");

export const reviewSchema = z.object({
  name: line(100).refine((s) => s.length > 0, "Vui lòng nhập tên người viết đánh giá"),
  title: line(200).default(""),
  text: paragraph(5000).refine((s) => s.length > 0, "Vui lòng nhập nội dung đánh giá"),
  rating: z.coerce
    .number({ error: "Số sao phải từ 1 đến 5" })
    .int("Số sao phải từ 1 đến 5")
    .min(1, "Số sao phải từ 1 đến 5")
    .max(5, "Số sao phải từ 1 đến 5")
    .default(5),
  source: z.enum(REVIEW_SOURCES, { error: "Nguồn đánh giá không hợp lệ" }).default("tripadvisor"),
  url: sourceUrl,
  date: reviewDate,
  trip: loc(160),
  photo: media.default(""),
  language: z.enum(REVIEW_LANGS, { error: "Ngôn ngữ không hợp lệ" }).default(""),
  showOn: z
    .array(z.enum(REVIEW_PLACES, { error: "Trang hiển thị không hợp lệ" }))
    .max(REVIEW_PLACES.length * 2)
    .transform((list) => REVIEW_PLACES.filter((p) => list.includes(p))) // bỏ trùng, đúng thứ tự
    .refine((list) => list.length > 0, "Chọn ít nhất một trang để hiện đánh giá")
    .default([...REVIEW_PLACES]),
  order: z.coerce.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
});

/** Lấy đánh giá từ API: một nền tảng hoặc tất cả nền tảng có khoá */
export const reviewImportQuery = z.object({
  source: z.enum(["tripadvisor", "google"]).optional(),
});
