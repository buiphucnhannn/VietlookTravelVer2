import { Schema, model } from "mongoose";
import { localizedString, publishable, toJSONOptions } from "./shared.schema.js";

/** Chủ đề tour (tối đa 08 — kiểm tra ở theme.service.js). Hiện trên menu + trang chủ, mỗi chủ đề 1 trang riêng. */
const themeSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: localizedString(), default: () => ({}) },
    tagline: { type: localizedString(), default: () => ({}) },
    intro: { type: localizedString(), default: () => ({}) },
    image: { type: String, default: "" }, // ảnh thẻ ở trang chủ / menu
    banner: { type: String, default: "" }, // banner trang chủ đề
    ...publishable,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

export const Theme = model("Theme", themeSchema);
