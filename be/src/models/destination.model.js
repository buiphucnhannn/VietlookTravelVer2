import { Schema, model } from "mongoose";
import { REGION_VALUES } from "../constants/content.js";
import { localizedString, publishable, toJSONOptions } from "./shared.schema.js";

/** Điểm đến — thuộc 1 trong 3 miền cố định Bắc / Trung / Nam. */
const destinationSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    region: { type: String, enum: REGION_VALUES, required: true, index: true },
    name: { type: localizedString(), default: () => ({}) },
    intro: { type: localizedString(), default: () => ({}) }, // 2–3 câu mô tả
    highlights: { type: [localizedString()], default: [] },
    image: { type: String, default: "" }, // ảnh thẻ
    hero: { type: String, default: "" }, // ảnh banner trang điểm đến
    keywords: { type: [String], default: [] }, // từ khoá tự gán tour vào điểm đến khi chuyển dữ liệu
    ...publishable,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

destinationSchema.index({ region: 1, order: 1 });

export const Destination = model("Destination", destinationSchema);
