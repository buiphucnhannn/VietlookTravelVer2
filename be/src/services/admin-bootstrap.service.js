import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ROLES } from "../constants/roles.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { MIN_PASSWORD } from "../validators/common.validator.js";
import { passwordService } from "./password.service.js";

/**
 * Tài khoản admin ĐẦU TIÊN: tạo từ ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_NAME trong .env khi server khởi động
 * và tài khoản đó CHƯA tồn tại. Sau khi đã tạo, .env không còn tác dụng với tài khoản này:
 * mật khẩu, tên… đổi ngay trong trang quản trị (đúng yêu cầu "đăng nhập, đăng xuất, đổi mật khẩu").
 * Quên mật khẩu → `npm run admin:reset` (đặt lại theo .env, xem resetAdminFromEnv).
 */
export async function ensureFirstAdmin() {
  // Dọn cờ của phiên bản cũ (tài khoản từng bị khoá sửa trong CMS)
  await userRepository.clearEnvManaged();

  if (!env.admin.enabled) {
    if (!(await userRepository.countActiveAdmins()))
      logger.warn(
        "[admin] Chưa có tài khoản admin — điền ADMIN_USERNAME / ADMIN_PASSWORD trong be/.env",
      );
    return;
  }
  const { username, password, name } = env.admin;
  if (await userRepository.findByUsername(username)) return; // đã có → giữ nguyên (không ghi đè mật khẩu)

  await userRepository.create({
    username,
    name,
    role: ROLES.ADMIN,
    passwordHash: await passwordService.hash(password),
  });
  logger.info(`[admin] Đã tạo tài khoản admin đầu tiên: ${username}`);
  warnShortPassword(password);
}

/** ADMIN_PASSWORD ngắn hơn mức tối thiểu khi đặt trong CMS → vẫn tạo / đặt lại, chỉ nhắc đổi */
function warnShortPassword(password) {
  if (password.length < MIN_PASSWORD)
    logger.warn(
      `[admin] ADMIN_PASSWORD ngắn hơn ${MIN_PASSWORD} ký tự — nên đăng nhập rồi đổi mật khẩu mạnh hơn trong trang quản trị`,
    );
}

/**
 * Khôi phục khi quên mật khẩu: đặt lại mật khẩu tài khoản ADMIN_USERNAME theo ADMIN_PASSWORD trong .env,
 * bật lại tài khoản, đặt quyền admin, mở khoá và đăng xuất mọi thiết bị. Chỉ chạy bằng lệnh trên máy chủ.
 */
export async function resetAdminFromEnv() {
  if (!env.admin.enabled) throw new Error("Cần ADMIN_USERNAME và ADMIN_PASSWORD trong be/.env");
  const { username, password, name } = env.admin;
  const existing = await userRepository.findByUsername(username);
  const passwordHash = await passwordService.hash(password);
  warnShortPassword(password);
  if (!existing) {
    await userRepository.create({ username, name, role: ROLES.ADMIN, passwordHash });
    return { username, created: true };
  }
  await userRepository.updateById(existing._id, {
    $set: { role: ROLES.ADMIN, isActive: true, lockUntil: null, failedLoginCount: 0 },
  });
  await userRepository.setPassword(existing._id, passwordHash);
  await sessionRepository.revokeAllForUser(existing._id);
  return { username, created: false };
}
