import { Schema, model } from "mongoose";

/**
 * Phiên đăng nhập (mỗi thiết bị 1 phiên). Chỉ lưu HASH (sha256) của refresh token, không lưu token gốc
 * → lộ database cũng không dùng được token.
 * - Mỗi lần làm mới: tạo phiên mới, phiên cũ đánh dấu revokedAt + replacedBy (xoay vòng token).
 * - Token cũ bị dùng lại sau thời gian ân hạn → coi là bị đánh cắp → thu hồi toàn bộ phiên của tài khoản.
 * - Tự xoá khi hết hạn (TTL index trên expiresAt).
 */
const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    remember: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: Schema.Types.ObjectId, default: null },
    userAgent: { type: String, maxlength: 300, default: "" },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model("Session", sessionSchema);
