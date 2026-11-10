import { Schema, model } from "mongoose";
import { toJSONOptions } from "./shared.schema.js";

/**
 * Nhật ký thao tác quản trị (ai sửa / xoá gì, lúc nào, từ IP nào) — yêu cầu của hợp đồng.
 * Chỉ ghi thêm, không sửa. Tự xoá sau 365 ngày (TTL index).
 */
const RETENTION_SECONDS = 365 * 24 * 60 * 60;

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "" }, // tên đăng nhập lúc thao tác
    action: { type: String, required: true }, // vd. "auth.login", "user.update", "media.delete"
    target: {
      type: { type: String, default: "" }, // vd. "user", "tour", "media"
      id: { type: String, default: "" },
    },
    ip: { type: String, default: "" },
    userAgent: { type: String, maxlength: 300, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: toJSONOptions(),
  },
);

// 1 index vừa để sắp xếp mới nhất trước, vừa để tự xoá bản ghi cũ
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
// Lọc theo 1 người / 1 loại thao tác, mới nhất trước (trang Nhật ký) — thay cho index đơn trên actor / action
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = model("AuditLog", auditLogSchema);
