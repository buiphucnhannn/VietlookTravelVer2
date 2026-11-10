import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { toSeconds } from "../utils/duration.js";

/**
 * JWT HS256 — access (ngắn hạn) và refresh (dài hạn) dùng 2 secret KHÁC NHAU + claim `typ`
 * → không thể dùng nhầm loại này thay loại kia. issuer / audience cố định để chặn token của hệ thống khác.
 * Thuật toán cố định (algorithms: [ALG]) → chặn tấn công "alg: none" / đổi thuật toán.
 */
const ISSUER = "vietlook-api";
const AUDIENCE = "vietlook-cms";
const ALG = "HS256";

/** tv = tokenVersion của tài khoản: đổi mật khẩu / khoá tài khoản → tv tăng → token cũ vô hiệu */
export const signAccessToken = (user) =>
  jwt.sign({ typ: "access", role: user.role, tv: user.tokenVersion ?? 0 }, env.jwt.accessSecret, {
    algorithm: ALG,
    subject: String(user._id ?? user.id),
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: toSeconds(env.jwt.accessTtl),
  });

export const signRefreshToken = (sid, userId) =>
  jwt.sign({ typ: "refresh", sid: String(sid) }, env.jwt.refreshSecret, {
    algorithm: ALG,
    subject: String(userId),
    issuer: ISSUER,
    audience: AUDIENCE,
    jwtid: randomBytes(16).toString("hex"),
    expiresIn: toSeconds(env.jwt.refreshTtl),
  });

function verify(token, secret, typ) {
  if (!token || typeof token !== "string") return null;
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: [ALG],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload.typ === typ ? payload : null;
  } catch {
    return null;
  }
}

export const verifyAccessToken = (token) => verify(token, env.jwt.accessSecret, "access");
export const verifyRefreshToken = (token) => verify(token, env.jwt.refreshSecret, "refresh");
