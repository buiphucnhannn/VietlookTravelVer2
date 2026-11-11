import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { z } from "zod";

// Chạy thẳng `node src/server.js` (không qua npm script) → tự nạp .env nếu có.
// Biến đã đặt sẵn trong môi trường (server / PM2) KHÔNG bị ghi đè.
if (existsSync(".env")) process.loadEnvFile(".env");

/**
 * Đọc + kiểm tra biến môi trường MỘT LẦN khi khởi động.
 * Thiếu / sai biến bắt buộc → dừng app ngay với thông báo rõ ràng (thay vì lỗi mơ hồ lúc chạy).
 * Mọi nơi khác chỉ đọc `env` (đã đóng băng) — KHÔNG đọc process.env rải rác.
 */
const csv = z
  .string()
  .default("")
  .transform((s) =>
    s
      .split(",")
      .map((x) => x.trim().replace(/\/+$/, ""))
      .filter(Boolean),
  );

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
      .default("info"),
    CORS_ORIGINS: csv,
    TRUST_PROXY: z.coerce.number().int().nonnegative().default(1),
    PROXY_SECRET: z.string().trim().default(""),

    MONGODB_URI: z.string().trim().min(1, "MONGODB_URI is required"),
    MONGODB_DB_NAME: z.string().trim().min(1).default("vietlook"),

    CLOUDINARY_CLOUD_NAME: z.string().trim().default(""),
    CLOUDINARY_API_KEY: z.string().trim().default(""),
    CLOUDINARY_API_SECRET: z.string().trim().default(""),
    CLOUDINARY_FOLDER: z
      .string()
      .trim()
      .regex(/^[a-z0-9_-]+$/i, "letters, digits, - and _ only")
      .default("vietlook"),
    // Mỗi ngày tự xoá ảnh CMS không còn dùng (cũ hơn 24 giờ) — xem services/media-cleanup.service.js
    MEDIA_CLEANUP_DAILY: z.enum(["true", "false"]).default("false"),

    JWT_ACCESS_SECRET: z.string().default(""),
    JWT_REFRESH_SECRET: z.string().default(""),
    JWT_ACCESS_TTL: z
      .string()
      .regex(/^\d+[smhd]?$/)
      .default("15m"),
    JWT_REFRESH_TTL: z
      .string()
      .regex(/^\d+[smhd]?$/)
      .default("7d"),
    MAX_SESSIONS: z.coerce.number().int().positive().default(5),
    COOKIE_SECURE: z.enum(["true", "false"]).optional(),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),

    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3000),

    TURNSTILE_SECRET_KEY: z.string().trim().default(""),

    // Khoá mã hoá secret lưu trong DB (vd. key 9Pay). Đổi khoá → secret đã lưu phải nhập lại.
    DATA_ENCRYPTION_KEY: z.string().default(""),

    // Email thông báo (Resend — gửi qua HTTPS). Trống RESEND_API_KEY → không gửi, đơn vẫn lưu trong CMS.
    RESEND_API_KEY: z.string().trim().default(""),
    MAIL_FROM: z.string().trim().default("Vietlook Travel <onboarding@resend.dev>"),
    // Email nhận thông báo mặc định khi CMS chưa cài (Cài đặt → Email nhận thông báo)
    NOTIFY_EMAIL: z.string().trim().toLowerCase().default(""),
    // CHỈ dùng khi phát triển / thử nghiệm: có giá trị → MỌI email (cho công ty lẫn cho khách) chỉ gửi tới địa chỉ này
    // (người nhận thật ghi trong tiêu đề + dải cảnh báo đầu email). Production: để trống.
    MAIL_REDIRECT_TO: z
      .string()
      .trim()
      .toLowerCase()
      .default("")
      .refine(
        (v) => !v || /^[^\s@,]+@[^\s@.,]+(\.[^\s@.,]+)+$/.test(v),
        "must be one email address",
      ),
    // Địa chỉ website (link trong email, nút "Mở trong CMS")
    PUBLIC_SITE_URL: z.string().trim().default("https://vietlooktravel.vercel.app"),

    // Tài khoản admin đầu tiên — server chỉ tạo khi CHƯA có (không ghi đè); quên mật khẩu: npm run admin:reset
    ADMIN_USERNAME: z
      .string()
      .trim()
      .toLowerCase()
      .default("")
      .refine((v) => !v || /^[a-z0-9._@-]{3,64}$/.test(v), "3-64 chars: a-z 0-9 . _ - @"),
    ADMIN_PASSWORD: z.string().default(""),
    ADMIN_NAME: z.string().trim().max(100).default("Quản trị viên"),

    // Nút "Đăng nhập nhanh" ở trang đăng nhập — CHỈ bật cho bản demo (vào thẳng tài khoản ADMIN_USERNAME)
    DEMO_LOGIN: z.enum(["true", "false"]).default("false"),

    // Cổng thanh toán 9Pay: địa chỉ cổng (production mặc định; thử nghiệm: https://sand-payment.9pay.vn)
    NINEPAY_ENDPOINT: z.string().trim().default(""), // trống → https://payment.9pay.vn
    // Tỷ giá USD → VND DỰ PHÒNG — chỉ dùng khi máy chủ chưa từng lấy được tỷ giá tự động (Vietcombank)
    PAYMENT_USD_VND_RATE: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.coerce.number().min(15_000).max(40_000).default(25_500),
    ),
    // CHỈ máy dev: giả lập 9Pay (key giả + trang cổng thanh toán giả trên chính API). Production luôn tắt.
    NINEPAY_FAKE: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["true", "false"]).default("false"),
    ),

    // CHỈ máy dev: làm chậm mọi request N ms để giả lập độ trễ mạng khi deploy (đo tốc độ CMS). Production luôn = 0.
    DEV_LATENCY_MS: z.coerce.number().int().min(0).max(5000).default(0),
  })
  .superRefine((e, ctx) => {
    const need = (cond, path, message) =>
      !cond && ctx.addIssue({ code: "custom", path: [path], message });

    // Khai admin thì phải có đủ cả tên đăng nhập lẫn mật khẩu (mật khẩu đặt tuỳ ý, không ràng buộc độ mạnh)
    if (e.ADMIN_USERNAME || e.ADMIN_PASSWORD) {
      need(e.ADMIN_USERNAME, "ADMIN_USERNAME", "is required when ADMIN_PASSWORD is set");
      need(e.ADMIN_PASSWORD, "ADMIN_PASSWORD", "is required when ADMIN_USERNAME is set");
      need(e.ADMIN_PASSWORD.length <= 128, "ADMIN_PASSWORD", "must be <= 128 chars");
    }

    if (e.NODE_ENV !== "production") return;
    need(
      e.ADMIN_USERNAME && e.ADMIN_PASSWORD,
      "ADMIN_USERNAME",
      "ADMIN_USERNAME / ADMIN_PASSWORD are required in production",
    );
    need(
      e.DATA_ENCRYPTION_KEY.length >= 32,
      "DATA_ENCRYPTION_KEY",
      "must be >= 32 chars in production",
    );
    need(
      e.JWT_ACCESS_SECRET.length >= 32,
      "JWT_ACCESS_SECRET",
      "must be >= 32 chars in production",
    );
    need(
      e.JWT_REFRESH_SECRET.length >= 32,
      "JWT_REFRESH_SECRET",
      "must be >= 32 chars in production",
    );
    need(
      e.JWT_ACCESS_SECRET !== e.JWT_REFRESH_SECRET,
      "JWT_REFRESH_SECRET",
      "must differ from JWT_ACCESS_SECRET",
    );
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  console.error(`[env] Invalid environment variables (see be/.env.example):\n${lines.join("\n")}`);
  process.exit(1);
}

const e = parsed.data;

// Dev chưa đặt secret → sinh ngẫu nhiên mỗi lần chạy (khởi động lại = phải đăng nhập lại)
const devSecret = () => randomBytes(48).toString("base64url");

export const env = Object.freeze({
  nodeEnv: e.NODE_ENV,
  isProd: e.NODE_ENV === "production",
  isTest: e.NODE_ENV === "test",
  port: e.PORT,
  logLevel: e.LOG_LEVEL,
  corsOrigins: e.CORS_ORIGINS,
  trustProxy: e.TRUST_PROXY,
  proxySecret: e.PROXY_SECRET,
  rateLimit: { windowMs: e.RATE_LIMIT_WINDOW_MS, max: e.RATE_LIMIT_MAX },
  mongo: { uri: e.MONGODB_URI, dbName: e.MONGODB_DB_NAME },
  cloudinary: {
    cloudName: e.CLOUDINARY_CLOUD_NAME,
    apiKey: e.CLOUDINARY_API_KEY,
    apiSecret: e.CLOUDINARY_API_SECRET,
    folder: e.CLOUDINARY_FOLDER,
    enabled: Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET),
    dailyCleanup: e.MEDIA_CLEANUP_DAILY === "true" && e.NODE_ENV !== "test",
  },
  jwt: {
    accessSecret: e.JWT_ACCESS_SECRET || devSecret(),
    refreshSecret: e.JWT_REFRESH_SECRET || devSecret(),
    accessTtl: e.JWT_ACCESS_TTL,
    refreshTtl: e.JWT_REFRESH_TTL,
  },
  maxSessions: e.MAX_SESSIONS,
  cookieSecure: e.COOKIE_SECURE ? e.COOKIE_SECURE === "true" : e.NODE_ENV === "production",
  login: { maxAttempts: e.LOGIN_MAX_ATTEMPTS, lockMs: e.LOGIN_LOCK_MINUTES * 60_000 },
  captcha: { secret: e.TURNSTILE_SECRET_KEY, enabled: Boolean(e.TURNSTILE_SECRET_KEY) },
  // Dev chưa đặt khoá → khoá cố định cho máy dev (KHÔNG dùng ở production — đã bắt buộc ở trên)
  dataEncryptionKey: e.DATA_ENCRYPTION_KEY || "vietlook-dev-only-encryption-key",
  mail: {
    resendKey: e.RESEND_API_KEY,
    from: e.MAIL_FROM,
    notifyFallback: e.NOTIFY_EMAIL,
    redirectTo: e.MAIL_REDIRECT_TO,
    enabled: Boolean(e.RESEND_API_KEY),
  },
  siteUrl: e.PUBLIC_SITE_URL.replace(/\/+$/, ""),
  admin: {
    username: e.ADMIN_USERNAME,
    password: e.ADMIN_PASSWORD,
    name: e.ADMIN_NAME,
    enabled: Boolean(e.ADMIN_USERNAME && e.ADMIN_PASSWORD),
  },
  demoLogin: e.DEMO_LOGIN === "true" && Boolean(e.ADMIN_USERNAME),
  devLatencyMs: e.NODE_ENV === "development" ? e.DEV_LATENCY_MS : 0,
  payment: {
    endpoint: (e.NINEPAY_ENDPOINT || "https://payment.9pay.vn").replace(/\/+$/, ""),
    fallbackUsdVnd: e.PAYMENT_USD_VND_RATE,
    // Giả lập 9Pay: KHÔNG BAO GIỜ chạy ở production
    fake: e.NINEPAY_FAKE === "true" && e.NODE_ENV !== "production",
  },
});
