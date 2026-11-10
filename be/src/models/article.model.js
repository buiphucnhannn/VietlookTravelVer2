import { Schema, model } from "mongoose";
import { localizedString, seoSchema, toJSONOptions } from "./shared.schema.js";

/** Bài viết cẩm nang. body = HTML đã lọc (sanitize) theo từng ngôn ngữ. */
const articleSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    oldSlugs: { type: [String], default: [], index: true },
    title: { type: localizedString(), default: () => ({}) },
    excerpt: { type: localizedString(), default: () => ({}) },
    body: { type: localizedString(), default: () => ({}) },
    image: { type: String, default: "" },
    category: { type: String, default: "", index: true }, // slug chuyên mục
    author: { type: String, default: "vietlook-team", index: true }, // slug tác giả
    destination: { type: String, default: "" }, // slug điểm đến liên quan (bài viết liên quan)
    month: { type: Number, min: 1, max: 12, default: null }, // chuyên mục "Việt Nam theo tháng"
    publishedAt: { type: Date, default: () => new Date(), index: true },
    seo: { type: seoSchema(), default: () => ({}) },
    sourceUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

articleSchema.index({ isActive: 1, publishedAt: -1 });

export const Article = model("Article", articleSchema);
