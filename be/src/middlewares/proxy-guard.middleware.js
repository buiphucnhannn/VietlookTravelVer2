import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { env } from "../config/env.js";
import { auditService } from "../services/audit.service.js";
import { ApiError } from "../utils/ApiError.js";

const SECRET_HEADER = "x-proxy-secret";
const CLIENT_IP_HEADER = "x-client-ip";
const secret = Buffer.from(env.proxySecret);

const matches = (value) => {
  const got = Buffer.from(value ?? "");
  return got.length === secret.length && timingSafeEqual(got, secret);
};

/**
 * "Khoá cửa sau" + IP khách không giả được (bật khi có PROXY_SECRET).
 * 1) Chỉ nhận request API đi qua website: frontend (Next.js) gắn header X-Proxy-Secret.
 *    Gọi thẳng địa chỉ backend → 403 (trừ /api/v1/health cho công cụ giám sát).
 * 2) IP khách: chỉ tin header X-Client-IP khi request mang đúng mã bí mật (chắc chắn đến từ frontend).
 * PROXY_SECRET trống (máy dev) → tắt, req.ip theo TRUST_PROXY.
 */
export function proxyGuard(req, _res, next) {
  if (!secret.length) return next();
  if (matches(req.get(SECRET_HEADER))) {
    const ip = (req.get(CLIENT_IP_HEADER) ?? "").trim();
    if (isIP(ip)) Object.defineProperty(req, "ip", { value: ip, configurable: true });
    return next();
  }
  if (!req.path.startsWith("/api/") || req.path === "/api/v1/health") return next();
  auditService.security(req, "security.direct_access");
  next(ApiError.forbidden("Forbidden", "DIRECT_ACCESS"));
}
