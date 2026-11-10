import rateLimit from "express-rate-limit";
import { auditService } from "../services/audit.service.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Bọc express-rate-limit: trả lỗi JSON chuẩn 429 kèm Retry-After / retryAfter (giây).
 * Bộ đếm lưu trong bộ nhớ (đủ cho 1 server; chạy nhiều instance → dùng store Redis).
 */
export function limiter({ message = "Bạn thao tác quá nhanh, vui lòng thử lại sau", ...options }) {
  return rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...options,
    handler: (req, _res, next, opts) => {
      const resetTime = req.rateLimit?.resetTime;
      const retryAfter = Math.max(
        1,
        Math.ceil(
          ((resetTime ? resetTime.getTime() : Date.now() + opts.windowMs) - Date.now()) / 1000,
        ),
      );
      auditService.security(req, "security.rate_limited", { retryAfter });
      const err = new ApiError(429, message);
      err.retryAfter = retryAfter;
      next(err);
    },
  });
}

/** Form công khai (đặt tour, liên hệ, báo giá...): 10 lần / 10 phút / IP */
export const publicFormLimiter = limiter({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  message: "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút",
});
