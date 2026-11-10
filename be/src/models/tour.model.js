import { Schema, model } from "mongoose";
import { REGION_VALUES } from "../constants/content.js";
import { publishable, seoSchema, toJSONOptions } from "./shared.schema.js";

/**
 * Tour. Nội dung chữ tách theo từng ngôn ngữ trong `content.{en,zh,vi}` → CMS có 3 tab ngôn ngữ,
 * website lấy đúng ngôn ngữ, trường nào bản zh / vi để trống thì dùng bản en.
 * Số liệu (giá, số ngày, ảnh, điểm đến…) dùng chung mọi ngôn ngữ.
 */
const day = new Schema(
  {
    day: { type: Number, min: 0, max: 120 },
    title: { type: String, trim: true, default: "" },
    html: { type: String, default: "" }, // HTML đã lọc (sanitize) ở service
    meals: { type: [{ type: String, enum: ["B", "L", "D"] }], default: [] }, // bữa sáng / trưa / tối
    overnight: { type: String, trim: true, default: "" }, // nghỉ đêm tại…
  },
  { _id: false },
);

const priceTable = new Schema(
  {
    heading: { type: String, default: null },
    period: { type: String, default: null },
    rows: { type: [[String]], default: [] },
  },
  { _id: false },
);

const faq = new Schema(
  { q: { type: String, trim: true, default: "" }, a: { type: String, default: "" } },
  { _id: false },
);

const contentLang = new Schema(
  {
    title: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
    route: { type: [String], default: [] }, // các chặng / điểm dừng
    highlights: { type: [String], default: [] },
    itinerary: { type: [day], default: [] },
    included: { type: [String], default: [] },
    excluded: { type: [String], default: [] },
    childPolicy: { type: String, default: null },
    notes: { type: String, default: null },
    priceTables: { type: [priceTable], default: [] }, // bảng giá dạng chữ (theo hạng khách sạn, mùa…)
    faqs: { type: [faq], default: [] },
  },
  { _id: false },
);

/** Giá tạm tính khi khách đặt tour (USD). Bỏ trống → dùng `price` / người lớn. */
const pricing = new Schema(
  {
    // Bảng giá bậc theo số khách: 2–3 khách giá X, 4–6 khách giá Y…
    groupTiers: {
      // price = khách sạn 3★ (hoặc giá duy nhất); price4 / price5 = hạng 4★ / 5★ (bỏ trống nếu không áp dụng)
      type: [
        {
          minPax: Number,
          maxPax: Number,
          price: Number,
          price4: Number,
          price5: Number,
          _id: false,
        },
      ],
      default: [],
    },
    // Giá trẻ em theo độ tuổi: % giá người lớn (0 = miễn phí)
    childRates: {
      type: [{ minAge: Number, maxAge: Number, percent: Number, _id: false }],
      default: [],
    },
    singleSupplement: { type: Number, default: null }, // phụ thu phòng đơn / khách
    holidaySurcharge: { type: Number, default: null }, // phụ thu lễ Tết / khách (USD)
    holidayPercent: { type: Number, default: null }, // hoặc phụ thu lễ Tết theo % giá
    holidayDates: { type: [String], default: [] }, // các ngày áp dụng phụ thu (YYYY-MM-DD hoặc MM-DD)
  },
  { _id: false },
);

const review = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    text: { type: String, default: "" },
    date: { type: String, default: "" },
    source: { type: String, default: "" }, // TripAdvisor / Google…
  },
  { _id: false },
);

const tourSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    oldSlugs: { type: [String], default: [], index: true }, // đường dẫn cũ → chuyển hướng 301
    code: { type: String, trim: true, default: "" },
    days: { type: Number, min: 0, default: 1 },
    nights: { type: Number, min: 0, default: 0 },
    halfDay: { type: Boolean, default: false },
    regions: { type: [{ type: String, enum: REGION_VALUES }], default: [] },
    destinations: { type: [String], default: [], index: true }, // slug điểm đến
    themes: { type: [String], default: [], index: true }, // slug chủ đề
    cruise: { type: Boolean, default: false }, // du thuyền Hạ Long
    tourType: { type: String, enum: ["private", "group"], default: "private" }, // tour riêng / tour ghép
    price: { type: Number, default: null }, // giá USD / người lớn
    originalPrice: { type: Number, default: null }, // giá gốc (gạch ngang) khi có khuyến mãi
    image: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    videos: { type: [String], default: [] }, // link YouTube / Google Drive (dạng chuẩn — utils/video.js)
    departure: { type: String, default: "daily" }, // daily | weekly | on-request | dates
    departureDates: { type: [String], default: [] }, // YYYY-MM-DD khi departure = dates
    departureDays: { type: [Number], default: [] }, // thứ trong tuần (0 = CN … 6 = T7) khi departure = weekly
    content: {
      en: { type: contentLang, default: () => ({}) },
      zh: { type: contentLang, default: () => ({}) },
      vi: { type: contentLang, default: () => ({}) },
    },
    pricing: { type: pricing, default: () => ({}) },
    reviews: { type: [review], default: [] },
    seo: { type: seoSchema(), default: () => ({}) },
    featured: { type: Boolean, default: false, index: true }, // tour nổi bật (trang chủ)
    featuredLong: { type: Boolean, default: false, index: true }, // tour dài ngày nổi bật (trang chủ)
    rank: { type: Number, default: 1000 }, // thứ tự gợi ý (nhỏ trước)
    sourceUrl: { type: String, default: "" }, // URL trên web cũ (đối chiếu 301)
    isActive: publishable.isActive,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

tourSchema.index({ isActive: 1, rank: 1 });

export const Tour = model("Tour", tourSchema);
