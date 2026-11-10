/**
 * Quên mật khẩu admin → đặt lại theo ADMIN_USERNAME / ADMIN_PASSWORD trong be/.env:
 *   npm run admin:reset
 * (Bình thường mật khẩu đổi trong trang quản trị; lệnh này chỉ dùng để khôi phục.)
 */
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { logger } from "../config/logger.js";
import { resetAdminFromEnv } from "../services/admin-bootstrap.service.js";

try {
  await connectDatabase();
  const r = await resetAdminFromEnv();
  logger.info(
    `[admin:reset] ${r.created ? "Đã tạo" : "Đã đặt lại mật khẩu"} tài khoản ${r.username} theo be/.env`,
  );
} catch (err) {
  logger.error({ err }, "[admin:reset] thất bại");
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
