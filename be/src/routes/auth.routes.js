import { Router } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { authController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { limiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { changePasswordSchema, loginSchema } from "../validators/auth.validator.js";

const FIFTEEN_MIN = 15 * 60 * 1000;
const tooMany = "Bạn đã thử đăng nhập quá nhiều lần, vui lòng thử lại sau ít phút";

// Chống dò mật khẩu — nhiều lớp, chỉ đếm lần THẤT BẠI (đăng nhập đúng không bị tính).
// Lớp cuối: khoá tài khoản tạm thời trong DB (LOGIN_MAX_ATTEMPTS / LOGIN_LOCK_MINUTES, xem auth.service.js).
// Văn phòng dùng chung 1 IP → đếm theo IP + tên đăng nhập (người gõ nhầm không làm khoá người khác),
// thêm trần rộng hơn theo IP (dò nhiều tài khoản từ 1 máy).
const accountLimiter = limiter({
  windowMs: FIFTEEN_MIN,
  limit: 10,
  skipSuccessfulRequests: true,
  message: tooMany,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip ?? "")}|${String(req.body?.username ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 64)}`,
});
const ipLimiter = limiter({
  windowMs: FIFTEEN_MIN,
  limit: 30,
  skipSuccessfulRequests: true,
  message: tooMany,
});
// Đăng nhập nhanh (bản demo) có bộ đếm riêng — không bị chặn vì người khác gõ sai mật khẩu
const demoLimiter = limiter({
  windowMs: FIFTEEN_MIN,
  limit: 30,
  skipSuccessfulRequests: true,
  message: tooMany,
});
const globalLoginLimiter = limiter({
  windowMs: FIFTEEN_MIN,
  limit: 300,
  skipSuccessfulRequests: true,
  message: tooMany,
  keyGenerator: () => "login:global", // ngắt mạch khi bị tấn công phân tán
});
const refreshLimiter = limiter({ windowMs: 60 * 1000, limit: 60 });
const passwordLimiter = limiter({ windowMs: FIFTEEN_MIN, limit: 5, skipSuccessfulRequests: true });

const router = Router();

router.post(
  "/login",
  globalLoginLimiter,
  accountLimiter, // trước ipLimiter: lần bị chặn của 1 tài khoản không cộng vào trần chung của IP
  ipLimiter,
  validate({ body: loginSchema }),
  authController.login,
);
router.get("/demo", refreshLimiter, authController.demoStatus);
router.post("/demo-login", demoLimiter, authController.demoLogin);
router.post("/refresh", refreshLimiter, authController.refresh);
router.get("/resume", refreshLimiter, authController.resume);
// Không bắt buộc access token: hết hạn rồi bấm Đăng xuất vẫn thu hồi phiên + xoá cookie
router.post("/logout", refreshLimiter, authController.logout);
router.get("/me", requireAuth, authController.me);
router.patch(
  "/password",
  passwordLimiter,
  requireAuth,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

export default router;
