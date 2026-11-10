import { Schema, model } from "mongoose";
import { FAST_TRACK_GROUPS } from "../constants/content.js";
import { localizedList, localizedString, publishable, toJSONOptions } from "./shared.schema.js";

/** Loại xe (4 – 45 chỗ). Giá theo tuyến để cứng ở website (theo phạm vi hợp đồng). */
const carSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    seats: { type: Number, min: 1, max: 60, required: true },
    pax: { type: Number, min: 1, max: 60 }, // số khách tối đa
    luggage: { type: Number, min: 0, max: 60 },
    name: { type: localizedString(), default: () => ({}) },
    tagline: { type: localizedString(), default: () => ({}) },
    description: { type: localizedString(), default: () => ({}) },
    images: { type: [String], default: [] },
    models: { type: [String], default: [] }, // dòng xe: Toyota Vios, Ford Transit…
    ideal: { type: localizedList(), default: () => ({}) }, // phù hợp cho
    priceKey: { type: String, default: "" }, // cột giá trong bảng tuyến
    accent: { type: String, default: "#1780c1" },
    vip: { type: Boolean, default: false }, // hạng xe cao cấp (nhãn VIP)
    ...publishable,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

/** Khu vực phục vụ xe */
const carAreaSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: localizedString(), default: () => ({}) },
    airport: { type: String, default: "" },
    image: { type: String, default: "" },
    ...publishable,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

/** Loại visa: thời gian lưu trú, thời gian xử lý, phí */
const visaTypeSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: localizedString(), default: () => ({}) },
    stay: { type: localizedString(), default: () => ({}) },
    processing: { type: localizedString(), default: () => ({}) },
    fee: { type: localizedString(), default: () => ({}) },
    note: { type: localizedString(), default: () => ({}) },
    ...publishable,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

/** Gói fast-track: chiều đến / chiều đi / cộng thêm — giá USD theo 5 sân bay (null = liên hệ) */
const fastTrackSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    group: { type: String, enum: FAST_TRACK_GROUPS, required: true, index: true },
    name: { type: localizedString(), default: () => ({}) },
    desc: { type: localizedString(), default: () => ({}) },
    prices: {
      SGN: { type: Number, default: null },
      HAN: { type: Number, default: null },
      DAD: { type: Number, default: null },
      CXR: { type: Number, default: null },
      PQC: { type: Number, default: null },
    },
    popular: { type: Boolean, default: false },
    vip: { type: Boolean, default: false },
    ...publishable,
  },
  { timestamps: true, toJSON: toJSONOptions() },
);

export const Car = model("Car", carSchema);
export const CarArea = model("CarArea", carAreaSchema);
export const VisaType = model("VisaType", visaTypeSchema);
export const FastTrackPackage = model("FastTrackPackage", fastTrackSchema);
