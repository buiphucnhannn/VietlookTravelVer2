import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { httpLogger } from "./middlewares/http-logger.middleware.js";
import { originGuard } from "./middlewares/origin-guard.middleware.js";
import { proxyGuard } from "./middlewares/proxy-guard.middleware.js";
import { limiter } from "./middlewares/rate-limit.middleware.js";
import apiRoutes from "./routes/index.js";

/**
 * Tạo Express app (KHÔNG listen ở đây — server.js lo khởi động → test import app trực tiếp với supertest).
 *
 * Thứ tự middleware có chủ đích: header bảo mật → CORS → parse (giới hạn kích thước) → log
 * → chặn truy cập trực tiếp → chống CSRF → giới hạn tần suất → route → 404 → xử lý lỗi.
 */
export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy); // số proxy tin cậy → req.ip đúng, không giả được X-Forwarded-For
  app.set("query parser", "simple"); // ?a[b]=1 KHÔNG thành object lồng nhau (chống NoSQL injection qua query)
  app.set("json spaces", 0);

  // Máy dev đo tốc độ: giả lập độ trễ mạng tới máy chủ thật (DEV_LATENCY_MS; production luôn tắt)
  if (env.devLatencyMs > 0) app.use((_req, _res, next) => void setTimeout(next, env.devLatencyMs));

  app.use(
    helmet({
      // API chỉ trả JSON → CSP chặt nhất có thể
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
      hsts: env.isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin)),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "X-Requested-With", "X-Captcha-Token", "X-Request-Id"],
      credentials: true,
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb", strict: true }));
  app.use(express.urlencoded({ extended: false, limit: "100kb", parameterLimit: 100 }));
  app.use(cookieParser());
  app.use(httpLogger);

  app.use(proxyGuard);
  app.use(originGuard);
  // Giới hạn chung / IP. Bỏ qua GET /api/v1/public/* (nội dung chỉ đọc): website (Next server) gọi các
  // endpoint này từ CÙNG 1 IP máy chủ cho mọi khách và đã cache theo thẻ → giới hạn ở đây sẽ chặn nhầm cả website.
  app.use(
    limiter({
      windowMs: env.rateLimit.windowMs,
      limit: env.rateLimit.max,
      skip: (req) => req.method === "GET" && req.path.startsWith("/api/v1/public/"),
    }),
  );

  app.use("/api/v1", apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
