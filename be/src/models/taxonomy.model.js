import { Schema, model } from "mongoose";
import { localizedString, publishable, toJSONOptions } from "./shared.schema.js";

/** Chuyên mục bài viết (Điểm đến, Cẩm nang cần biết, Việt Nam theo tháng, Phương tiện…) */
const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: localizedString(), default: () => ({}) },
    description: { type: localizedString(), default: () => ({}) },
    group: { type: String, default: "" }, // nhóm menu (essentials, transport…)
    icon: { type: String, default: "" }, // tên icon lucide dùng ở website
    ...publishable,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

/** Tác giả bài viết */
const authorSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: localizedString(), default: () => ({}) },
    role: { type: localizedString(), default: () => ({}) },
    bio: { type: localizedString(), default: () => ({}) },
    avatar: { type: String, default: "" },
    ...publishable,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

export const Category = model("Category", categorySchema);
export const Author = model("Author", authorSchema);
