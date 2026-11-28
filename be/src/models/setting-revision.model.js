import { Schema, model } from "mongoose";

/**
 * Lịch sử phiên bản của nội dung sửa trong CMS → Giao diện trang (Trang chủ, các trang công khai, Giới thiệu,
 * chính sách). Mỗi lần lưu / khôi phục thành công, BẢN TRƯỚC ĐÓ được cất lại ở đây (giữ 20 bản mới nhất / trang).
 *   key      : "home" hoặc khoá trang ("about", "car-rental"…)
 *   data     : toàn bộ nội dung bản cũ (đúng dạng đã lưu)
 *   savedAt  : lúc bản cũ được lưu · savedBy: tên người đã lưu bản cũ (nếu biết)
 *   by       : người vừa lưu / khôi phục làm bản này bị thay · reason: "save" | "restore"
 * Ảnh / video nhắc tới trong bản cũ vẫn được coi là "đang dùng" (dọn ảnh quét mọi collection) → khôi phục không hỏng ảnh.
 */
const settingRevisionSchema = new Schema(
  {
    key: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    savedAt: { type: Date, default: null },
    savedBy: { type: String, default: "" },
    by: {
      id: { type: String, default: null },
      name: { type: String, default: "" },
    },
    reason: { type: String, enum: ["save", "restore"], default: "save" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

settingRevisionSchema.index({ key: 1, createdAt: -1 });

export const SettingRevision = model("SettingRevision", settingRevisionSchema);
