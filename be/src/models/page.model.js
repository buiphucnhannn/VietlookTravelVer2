import { Schema, model } from "mongoose";
import { PAGE_KEYS } from "../constants/content.js";
import { localizedString, seoSchema, toJSONOptions } from "./shared.schema.js";

/**
 * Trang nội dung sửa trong CMS: giới thiệu (about) + 4 trang chính sách
 * (điều khoản, bảo mật, thanh toán & hoàn tiền, hủy / đổi tour).
 * `data`: phần có cấu trúc riêng của trang giới thiệu (câu chuyện, tầm nhìn, sứ mệnh, giá trị…).
 */
const pageSchema = new Schema(
  {
    key: { type: String, enum: PAGE_KEYS, required: true, unique: true },
    title: { type: localizedString(), default: () => ({}) },
    subtitle: { type: localizedString(), default: () => ({}) },
    body: { type: localizedString(), default: () => ({}) }, // HTML đã lọc
    image: { type: String, default: "" },
    data: { type: Schema.Types.Mixed, default: {} },
    seo: { type: seoSchema(), default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false, toJSON: toJSONOptions() },
);

export const Page = model("Page", pageSchema);
