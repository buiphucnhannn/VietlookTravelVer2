import { env } from "../config/env.js";
import { auditService } from "../services/audit.service.js";
import { ApiError } from "../utils/ApiError.js";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/** Origin trùng tên miền trình duyệt đang mở (website gọi /api/v1 qua rewrite của Next.js) → hợp lệ */
function sameSite(req, origin) {
  let host;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const forwarded = (req.get("x-forwarded-host") || "").split(",")[0].trim().toLowerCase();
  return host === forwarded || host === (req.get("host") || "").toLowerCase();
}

/**
 * Chống CSRF (lớp thứ 2, bên cạnh cookie SameSite=Strict):
 * mọi request thay đổi dữ liệu phải có header `X-Requested-With: fetch` (form HTML / ảnh ở site khác
 * không gửi được header tuỳ chỉnh) và nếu có Origin thì phải là chính tên miền website hoặc thuộc CORS_ORIGINS.
 */
export function originGuard(req, _res, next) {
  if (SAFE.has(req.method)) return next();
  if (req.get("x-requested-with") !== "fetch") {
    auditService.security(req, "security.csrf_rejected");
    return next(ApiError.forbidden("Yêu cầu không hợp lệ", "CSRF_REJECTED"));
  }
  const origin = req.get("origin");
  if (origin && !env.corsOrigins.includes(origin) && !sameSite(req, origin)) {
    auditService.security(req, "security.bad_origin", { origin });
    return next(ApiError.forbidden("Nguồn gửi yêu cầu không được phép", "BAD_ORIGIN"));
  }
  next();
}
