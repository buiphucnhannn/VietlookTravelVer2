import { Schema, model } from "mongoose";
import { PAGE_KEYS } from "../constants/content.js";
import { PAGE_COPY_KEYS } from "../constants/page-copy.js";
import { localizedString, seoSchema, toJSONOptions } from "./shared.schema.js";

/**
 * Trang nội dung sửa trong CMS: giới thiệu (about) + 4 trang chính sách
 * (điều khoản, bảo mật, thanh toán & hoàn tiền, hủy / đổi tour).
 * `data`: phần có cấu trúc riêng của trang giới thiệu (câu chuyện, tầm nhìn, sứ mệnh, giá trị…).
 * Cùng collection: bản "Giao diện trang" của các trang công khai (key thuộc PAGE_COPY_KEYS — chỉ dùng `data`,
 * xem constants/page-copy.js). Website / sitemap / chân trang chỉ coi PAGE_KEYS là trang giới thiệu & chính sách.
 */
const pageSchema = new Schema(
  {
    key: { type: String, enum: [...PAGE_KEYS, ...PAGE_COPY_KEYS], required: true, unique: true },
    title: { type: localizedString(), default: () => ({}) },
    subtitle: { type: localizedString(), default: () => ({}) },
    body: { type: localizedString(), default: () => ({}) }, // HTML đã lọc
    image: { type: String, default: "" },
    data: { type: Schema.Types.Mixed, default: {} },
    seo: { type: seoSchema(), default: () => ({}) },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: String, default: "" }, // tên người lưu gần nhất (báo khi có người khác vừa lưu)
  },
  { timestamps: true, minimize: false, toJSON: toJSONOptions() },
);

export const Page = model("Page", pageSchema);
