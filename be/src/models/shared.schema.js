import { Schema } from "mongoose";

/** 3 ngôn ngữ của website: /en (mặc định), /zh, /vi. Bản zh / vi trống → website dùng bản en. */
export const LANGS = ["en", "zh", "vi"];

/** Chuỗi đa ngôn ngữ { en, zh, vi } */
export const localizedString = () =>
  new Schema(
    {
      en: { type: String, trim: true, default: "" },
      zh: { type: String, trim: true, default: "" },
      vi: { type: String, trim: true, default: "" },
    },
    { _id: false },
  );

/** Danh sách chuỗi theo từng ngôn ngữ { en: [..], zh: [..], vi: [..] } */
export const localizedList = () =>
  new Schema(
    {
      en: { type: [String], default: [] },
      zh: { type: [String], default: [] },
      vi: { type: [String], default: [] },
    },
    { _id: false },
  );

/** SEO theo ngôn ngữ: { en: { title, description }, zh: {...}, vi: {...} } */
const seoLang = new Schema(
  {
    title: { type: String, trim: true, maxlength: 200, default: "" },
    description: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { _id: false },
);
export const seoSchema = () =>
  new Schema(
    {
      en: { type: seoLang, default: () => ({}) },
      zh: { type: seoLang, default: () => ({}) },
      vi: { type: seoLang, default: () => ({}) },
    },
    { _id: false },
  );

/**
 * Bỏ _id / __v, thêm id khi trả JSON ra API.
 * `hidden`: các trường KHÔNG BAO GIỜ được trả ra ngoài (vd. passwordHash).
 */
export const toJSONOptions = (hidden = []) => ({
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    for (const key of hidden) delete ret[key];
    return ret;
  },
});

/** Trường chung cho mọi nội dung quản lý trong CMS */
export const publishable = {
  isActive: { type: Boolean, default: true, index: true }, // ẩn / hiện trên website
  order: { type: Number, default: 0 }, // thứ tự hiển thị (nhỏ trước)
};
