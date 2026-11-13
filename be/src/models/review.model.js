import { Schema, model } from "mongoose";
import { REVIEW_LANGS, REVIEW_PLACES, REVIEW_SOURCES } from "../constants/content.js";
import { localizedString, publishable, toJSONOptions } from "./shared.schema.js";

/**
 * Đánh giá khách (mục "Đánh giá khách" trong CMS) — hiện ở khối đánh giá trang chủ, giới thiệu, tour đoàn, thuê xe.
 * `text` / `title` là lời khách viết NGUYÊN VĂN (1 ngôn ngữ, không dịch); chỉ nhãn chuyến đi `trip` có 3 ngôn ngữ
 * (do Vietlook ghi). `photo`: ảnh minh hoạ chuyến đi do Vietlook chọn (không phải ảnh của khách).
 * (Đánh giá riêng của từng tour nằm trong tour — không liên quan.)
 */
const reviewSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    title: { type: String, trim: true, maxlength: 200, default: "" },
    text: { type: String, required: true, trim: true, maxlength: 5000 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    source: { type: String, enum: REVIEW_SOURCES, default: "tripadvisor" },
    url: { type: String, trim: true, maxlength: 1000, default: "" },
    date: { type: String, default: "" }, // "YYYY-MM-DD" — "" = không ghi ngày
    trip: { type: localizedString(), default: () => ({}) },
    photo: { type: String, default: "" },
    language: { type: String, enum: REVIEW_LANGS, default: "" },
    showOn: { type: [{ type: String, enum: REVIEW_PLACES }], default: () => [...REVIEW_PLACES] },
    ...publishable,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

reviewSchema.index({ isActive: 1, order: 1 });

export const Review = model("Review", reviewSchema);
