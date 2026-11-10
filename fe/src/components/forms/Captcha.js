"use client";

import { useEffect, useRef } from "react";

/**
 * Captcha Cloudflare Turnstile cho form công khai (chống spam — hợp đồng mục 6.3).
 * - Chế độ "interaction-only": khách thật thường KHÔNG thấy gì; chỉ hiện ô xác minh khi Cloudflare nghi ngờ.
 * - Token nằm trong ô ẩn `cf-turnstile-response` của form → useEnquiry gửi kèm header X-Captcha-Token,
 *   backend kiểm tra với Cloudflare (TURNSTILE_SECRET_KEY).
 * Chưa đặt NEXT_PUBLIC_TURNSTILE_SITE_KEY → không hiện gì (máy dev).
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading = null;
function loadScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  return (loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  }));
}

export default function Captcha({ lang }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let id;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          appearance: "interaction-only",
          size: "flexible",
          language: ((l) => (l.startsWith("zh") ? "zh-cn" : l.slice(0, 2)))(
            lang || document.documentElement.lang || "en",
          ),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (id !== undefined) window.turnstile?.remove(id);
    };
  }, [lang]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="cf-captcha empty:hidden" />;
}

/** Đặt lại captcha sau mỗi lần gửi (token chỉ dùng được 1 lần) */
export function resetCaptcha(formEl) {
  const el = formEl?.querySelector?.(".cf-captcha");
  if (el && window.turnstile) window.turnstile.reset(el);
}
