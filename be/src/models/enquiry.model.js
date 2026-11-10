import { Schema, model } from "mongoose";
import { ENQUIRY_STATUS, ENQUIRY_TYPE_VALUES } from "../constants/content.js";
import { toJSONOptions } from "./shared.schema.js";

/**
 * Đơn đặt tour + yêu cầu từ mọi form (thiết kế tour, báo giá xe, visa / fast-track, liên hệ, đối tác).
 * LUÔN lưu vào DB trước rồi mới gửi email → email lỗi cũng không mất đơn (hợp đồng mục 5.4).
 */
const note = new Schema(
  {
    text: { type: String, required: true, maxlength: 2000 },
    by: { type: String, default: "" },
    at: { type: Date, default: () => new Date() },
  },
  { _id: true },
);

const emailState = {
  type: String,
  enum: ["pending", "sent", "failed", "skipped"],
  default: "pending",
};

const enquirySchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // mã yêu cầu: VL-BK260512-7QX2
    type: { type: String, enum: ENQUIRY_TYPE_VALUES, required: true, index: true },
    status: { type: String, enum: ENQUIRY_STATUS, default: "new" }, // index: { status, createdAt } bên dưới
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },

    name: { type: String, trim: true, required: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, default: "", maxlength: 254 },
    phone: { type: String, trim: true, default: "", maxlength: 30 },
    nationality: { type: String, trim: true, default: "", maxlength: 80 },
    message: { type: String, default: "", maxlength: 5000 },

    // Đặt tour
    tour: {
      slug: { type: String, default: "" },
      code: { type: String, default: "" },
      title: { type: String, default: "" },
    },
    departureDate: { type: String, default: "" },
    adults: { type: Number, default: null },
    childAges: { type: [Number], default: [] },
    hotelClass: { type: Number, default: null }, // hạng khách sạn khách chọn (3 / 4 / 5 sao)
    estimate: {
      currency: { type: String, default: "USD" },
      total: { type: Number, default: null },
      lines: { type: [{ label: String, amount: Number, _id: false }], default: [] },
    },

    // Các trường riêng của từng form (đã lọc: chỉ chữ / số / danh sách ngắn)
    details: { type: Schema.Types.Mixed, default: {} },

    lang: { type: String, enum: ["en", "zh", "vi"], default: "en" },
    page: { type: String, default: "", maxlength: 300 },
    notes: { type: [note], default: [] },
    emailStatus: {
      customer: emailState,
      company: emailState,
      error: { type: String, default: "", maxlength: 500 },
    },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: true, minimize: false, toJSON: toJSONOptions(["ip", "userAgent"]) },
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ type: 1, status: 1, createdAt: -1 });
// Tab "Yêu cầu từ form" lọc theo trạng thái (không theo 1 loại cố định), mới nhất trước
enquirySchema.index({ status: 1, createdAt: -1 });

export const Enquiry = model("Enquiry", enquirySchema);

/** Bộ đếm tăng dần (mã yêu cầu không trùng) */
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = model("Counter", counterSchema);
