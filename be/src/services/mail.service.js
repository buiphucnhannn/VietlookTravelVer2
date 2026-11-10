import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Gửi email qua Resend (API HTTPS — chạy được cả khi VPS / hosting chặn cổng SMTP).
 * Chưa cấu hình RESEND_API_KEY → trả { ok:false, skipped:true }, KHÔNG ném lỗi (đơn vẫn lưu trong CMS).
 */
export const mailService = {
  get enabled() {
    return env.mail.enabled;
  },

  async send({ to, subject, html, replyTo }) {
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (!env.mail.enabled)
      return { ok: false, skipped: true, error: "RESEND_API_KEY chưa cấu hình" };
    if (!recipients.length) return { ok: false, skipped: true, error: "Chưa có email người nhận" };
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.mail.resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.mail.from,
          to: recipients,
          subject,
          html,
          ...(replyTo && { reply_to: replyTo }),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { ok: true };
      const body = await res.text().catch(() => "");
      logger.warn({ status: res.status }, `[mail] Resend từ chối: ${body.slice(0, 200)}`);
      return { ok: false, error: `Resend HTTP ${res.status}: ${body.slice(0, 200)}` };
    } catch (err) {
      logger.warn({ err }, "[mail] không gửi được email");
      return { ok: false, error: err?.message?.slice(0, 200) ?? "send failed" };
    }
  },
};
