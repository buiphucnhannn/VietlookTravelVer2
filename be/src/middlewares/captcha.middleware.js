import { captchaService } from "../services/captcha.service.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Bắt buộc captcha (Cloudflare Turnstile) cho form công khai.
 * Frontend gửi token qua header `X-Captcha-Token` (hoặc body.captchaToken).
 *   router.post("/enquiries", publicFormLimiter, requireCaptcha, validate(...), controller.create)
 */
export async function requireCaptcha(req, _res, next) {
  const token = req.get("x-captcha-token") ?? req.body?.captchaToken;
  if (await captchaService.verify(token, req.ip)) return next();
  next(
    ApiError.badRequest("Xác minh captcha thất bại, vui lòng thử lại", [
      { field: "captcha", message: "invalid" },
    ]),
  );
}
