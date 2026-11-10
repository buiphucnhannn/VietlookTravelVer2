import mongoose from "mongoose";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/** Route không tồn tại → 404 JSON */
export const notFoundHandler = (req, _res, next) =>
  next(ApiError.notFound(`Đường dẫn API không tồn tại: ${req.method} ${req.path}`));

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: "Ảnh quá lớn (tối đa 8MB) — hãy chọn ảnh nhỏ hơn",
  LIMIT_FILE_COUNT: "Chọn quá nhiều ảnh trong 1 lần",
  LIMIT_UNEXPECTED_FILE: "File tải lên không hợp lệ",
};

/**
 * Bắt mọi lỗi (Express 5 tự chuyển lỗi của handler async vào đây — không cần try/catch).
 * Chuyển lỗi Mongoose / Multer / JSON hỏng sang mã HTTP phù hợp; lỗi lạ → 500 (ẩn chi tiết ở production).
 * Express nhận diện error handler qua đủ 4 tham số (giữ _next dù không dùng).
 */
export function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    error = ApiError.unprocessable(
      "Dữ liệu chưa hợp lệ — vui lòng kiểm tra lại",
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    );
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest("Dữ liệu không hợp lệ, vui lòng tải lại trang rồi thử lại");
  } else if (err?.code === 11000) {
    error = ApiError.conflict("Dữ liệu bị trùng với mục đã có");
  } else if (err instanceof multer.MulterError) {
    error = ApiError.badRequest(MULTER_MESSAGES[err.code] ?? "File tải lên không hợp lệ");
  } else if (err?.type === "entity.parse.failed") {
    error = ApiError.badRequest("Dữ liệu gửi lên không hợp lệ, vui lòng tải lại trang rồi thử lại");
  } else if (err?.type === "entity.too.large") {
    error = new ApiError(413, "Dữ liệu gửi lên quá lớn");
  }

  const isKnown = error instanceof ApiError;
  const status = isKnown ? error.statusCode : 500;

  // Lỗi bất ngờ → ghi đủ stack để sửa; lỗi nghiệp vụ 5xx đã biết → 1 dòng cảnh báo.
  if (!isKnown) req.log?.error({ err }, `Unhandled error: ${err?.message}`);
  else if (status >= 500) req.log?.warn({ code: error.code }, error.message);

  if (error.retryAfter) res.set("Retry-After", String(error.retryAfter));

  res.status(status).json({
    success: false,
    error: {
      code: isKnown ? error.code : "INTERNAL_ERROR",
      message:
        !isKnown && env.isProd
          ? "Máy chủ đang gặp sự cố, vui lòng thử lại sau ít phút"
          : error.message,
      ...(isKnown && error.details && { details: error.details }),
      ...(error.retryAfter && { retryAfter: error.retryAfter }),
      ...(!env.isProd && !isKnown && { stack: err?.stack }),
    },
  });
}
