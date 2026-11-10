import { createApp } from "./app.js";
import { configureCloudinary } from "./config/cloudinary.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { ensureFirstAdmin } from "./services/admin-bootstrap.service.js";

/** Điểm khởi động: kết nối dịch vụ ngoài → mở cổng → tắt êm khi nhận tín hiệu dừng. */
async function bootstrap() {
  configureCloudinary();
  if (!env.captcha.enabled && env.isProd)
    logger.warn("TURNSTILE_SECRET_KEY chưa đặt — form công khai KHÔNG có captcha");
  await connectDatabase();
  await ensureFirstAdmin(); // tạo tài khoản admin đầu tiên từ .env nếu chưa có

  const server = createApp().listen(env.port, () =>
    logger.info(`Vietlook API listening on http://localhost:${env.port}/api/v1 (${env.nodeEnv})`),
  );
  // Chống request treo / slowloris
  server.headersTimeout = 20_000;
  server.requestTimeout = 60_000;
  server.keepAliveTimeout = 5_000;

  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    logger.info(`${signal} received - shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // quá 10s thì buộc dừng
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

process.on("unhandledRejection", (err) => {
  logger.fatal({ err }, "Unhandled rejection");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.fatal({ err }, "Startup failed");
  process.exit(1);
});
