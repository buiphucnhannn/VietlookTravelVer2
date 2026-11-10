import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Kiểm tra token Cloudflare Turnstile (captcha cho form công khai: đặt tour, liên hệ, báo giá...).
 * Trả true/false. Chưa cấu hình TURNSTILE_SECRET_KEY → luôn true (chỉ nên dùng khi dev).
 */
export const captchaService = {
  async verify(token, ip) {
    if (!env.captcha.enabled) return true;
    if (!token || typeof token !== "string" || token.length > 2048) return false;
    try {
      const res = await fetch(VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env.captcha.secret,
          response: token,
          remoteip: ip ?? "",
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      return data.success === true;
    } catch (err) {
      logger.warn({ err }, "[captcha] không kiểm tra được Turnstile");
      return false; // lỗi mạng → từ chối (an toàn hơn cho qua)
    }
  },
};
