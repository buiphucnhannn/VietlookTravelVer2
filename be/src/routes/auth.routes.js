import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { limiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { changePasswordSchema, loginSchema } from "../validators/auth.validator.js";

const FIFTEEN_MIN = 15 * 60 * 1000;
const tooMany = "Bạn đã thử đăng nhập quá nhiều lần, vui lòng thử lại sau ít phút";

// Chống dò mật khẩu — nhiều lớp, chỉ đếm lần THẤT BẠI (đăng nhập đúng không bị tính).
// Lớp cuối: khoá tài khoản tạm thời trong DB (LOGIN_MAX_ATTEMPTS / LOGIN_LOCK_MINUTES, xem auth.service.js).
const ipLimiter = limiter({
  windowMs: FIFTEEN_MIN,
  limit: 10,
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
  ipLimiter,
  validate({ body: loginSchema }),
  authController.login,
);
router.get("/demo", refreshLimiter, authController.demoStatus);
router.post("/demo-login", globalLoginLimiter, ipLimiter, authController.demoLogin);
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
