import { Schema, model } from "mongoose";

/**
 * Cài đặt dạng khoá – giá trị (mỗi khoá 1 bản ghi):
 * - home          : banner trang chủ, tour nổi bật / dài ngày, chủ đề hiện ở trang chủ
 * - notifications : email nhận thông báo đơn / form
 * - payment       : cấu hình 9Pay (secret lưu MÃ HOÁ, chỉ admin xem / sửa)
 */
const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true, minimize: false },
);

export const Setting = model("Setting", settingSchema);
