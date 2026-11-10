/**
 * Lỗi nghiệp vụ có mã HTTP + mã lỗi máy đọc được (code). Ném ở service / controller / middleware
 * → error middleware trả JSON chuẩn { success:false, error:{ code, message, details? } }.
 *   throw ApiError.notFound("Không tìm thấy tour")
 *   throw new ApiError(423, "Tài khoản tạm khoá", { code: "ACCOUNT_LOCKED" })
 */
const DEFAULT_CODES = {
  400: "BAD_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  422: "VALIDATION_ERROR",
  423: "LOCKED",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_ERROR",
  503: "SERVICE_UNAVAILABLE",
};

export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {{ code?: string, details?: unknown }} [opts]
   */
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code || DEFAULT_CODES[statusCode] || "ERROR";
    this.details = details;
  }

  static badRequest(message = "Yêu cầu không hợp lệ", details) {
    return new ApiError(400, message, { details });
  }
  static unauthorized(message = "Vui lòng đăng nhập", code = "UNAUTHENTICATED") {
    return new ApiError(401, message, { code });
  }
  static forbidden(message = "Bạn không có quyền thực hiện thao tác này", code = "FORBIDDEN") {
    return new ApiError(403, message, { code });
  }
  static notFound(message = "Không tìm thấy") {
    return new ApiError(404, message);
  }
  static conflict(message = "Dữ liệu bị trùng") {
    return new ApiError(409, message);
  }
  static unprocessable(message = "Dữ liệu chưa hợp lệ", details) {
    return new ApiError(422, message, { details });
  }
  static unavailable(message = "Dịch vụ tạm thời không khả dụng", code = "SERVICE_UNAVAILABLE") {
    return new ApiError(503, message, { code });
  }
}
