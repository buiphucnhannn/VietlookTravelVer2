import pino from "pino";
import { env } from "./env.js";

/**
 * Logger dùng chung (pino).
 * - Production: JSON 1 dòng / sự kiện + giờ ISO (dễ lọc trên server / dịch vụ log).
 * - Local: pino-pretty, 1 dòng dễ đọc: "GET /api/v1/health 200 - 3ms".
 * - Bảo mật: KHÔNG ghi header / cookie / body; khoá nhạy cảm còn sót (token, mật khẩu...) bị che
 *   "[REDACTED]" ở mọi cấp → lỡ log nhầm object cũng không lộ.
 */
const SENSITIVE = [
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiSecret",
  "authorization",
  "cookie",
  "set-cookie",
];

const pretty = !env.isProd && !env.isTest;

export const logger = pino({
  level: env.logLevel,
  base: env.isProd ? { service: "vietlook-api", env: env.nodeEnv } : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (label) => ({ level: label }) },
  redact: {
    paths: [
      ...SENSITIVE,
      ...SENSITIVE.map((k) => `*.${k}`),
      ...SENSITIVE.map((k) => `*.*.${k}`),
      'req.headers["x-proxy-secret"]',
    ],
    censor: "[REDACTED]",
  },
  ...(pretty && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        singleLine: true,
        ignore: "pid,hostname,req,res,responseTime,reqId",
      },
    },
  }),
});
