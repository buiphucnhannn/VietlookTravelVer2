import { captchaService } from "../services/captcha.service.js";
import { ApiError } from "../utils/ApiError.js";
import { formLang, formMessage } from "../utils/form-messages.js";

/**
 * Bắt buộc captcha (Cloudflare Turnstile) cho form công khai.
 * Frontend gửi token qua header `X-Captcha-Token` (hoặc body.captchaToken).
 *   router.post("/enquiries", publicFormLimiter, requireCaptcha, validate(...), controller.create)
 * Chưa đặt TURNSTILE_SECRET_KEY → bỏ qua (form vẫn chạy).
 */
export async function requireCaptcha(req, _res, next) {
  const token = req.get("x-captcha-token") ?? req.body?.captchaToken;
  if (await captchaService.verify(token, req.ip)) return next();
  // website hiện thẳng câu này cho khách → theo ngôn ngữ trang, không dùng chữ kỹ thuật
  const message = formMessage(formLang(req), "captcha");
  next(
    new ApiError(400, message, {
      code: "CAPTCHA_FAILED",
      details: [{ field: "captcha", message }],
    }),
  );
}
