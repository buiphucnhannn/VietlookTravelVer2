import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { escape } from "../emails/layout.js";

const asList = (to) => (Array.isArray(to) ? to : [to]).filter(Boolean);

/** Dải cảnh báo đầu email khi đang chuyển hướng (máy dev) — cho biết email lẽ ra gửi tới ai */
function devBanner(original) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef3f7"><tr><td align="center" style="padding:14px 12px 0">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td align="center" bgcolor="#fff6e0" style="background:#fff6e0;border:1px solid #f3d58a;border-radius:999px;padding:7px 16px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:18px;color:#6b4e00;text-align:center">Thư thử nghiệm — lẽ ra gửi tới: <b>${escape(original)}</b></td></tr></table>
</td></tr></table>`;
}

/**
 * Chế độ phát triển: MAIL_REDIRECT_TO có giá trị → mọi email chỉ gửi tới địa chỉ đó.
 * Người nhận thật được ghi vào tiêu đề ("[DEV → khach@…]") và dải cảnh báo đầu email.
 * Hàm thuần (không gửi gì) — dùng chung cho mailService.send và test.
 */
export function applyRedirect(msg, redirectTo = env.mail.redirectTo) {
  if (!redirectTo) return { ...msg, to: asList(msg.to) };
  const original = asList(msg.to).join(", ") || "(không có)";
  const short = original.length > 80 ? `${original.slice(0, 77)}…` : original;
  const html = String(msg.html ?? "");
  const banner = devBanner(original);
  return {
    ...msg,
    to: [redirectTo],
    subject: `[DEV → ${short}] ${msg.subject}`,
    html: html.includes("<!--DEV_BANNER-->")
      ? html.replace("<!--DEV_BANNER-->", banner)
      : /<body[^>]*>/i.test(html)
        ? html.replace(/<body[^>]*>/i, (m) => `${m}${banner}`)
        : `${banner}${html}`,
    ...(msg.text != null && {
      text: `[Thư thử nghiệm — lẽ ra gửi tới: ${original}]\n\n${msg.text}`,
    }),
  };
}

/**
 * Gửi email qua Resend (API HTTPS — chạy được cả khi VPS / hosting chặn cổng SMTP).
 * Chưa cấu hình RESEND_API_KEY → trả { ok:false, skipped:true }, KHÔNG ném lỗi (đơn vẫn lưu trong CMS).
 */
export const mailService = {
  get enabled() {
    return env.mail.enabled;
  },

  async send(message) {
    if (!env.mail.enabled)
      return { ok: false, skipped: true, error: "RESEND_API_KEY chưa cấu hình" };
    if (!asList(message.to).length)
      return { ok: false, skipped: true, error: "Chưa có email người nhận" };
    const { to, subject, html, text, replyTo } = applyRedirect(message);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.mail.resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.mail.from,
          to,
          subject,
          html,
          ...(text && { text }),
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
