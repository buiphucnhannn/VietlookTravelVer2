"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONSENT_OPEN_EVENT,
  gtag,
  hasTrackingConsent,
  readConsent,
  saveConsent,
} from "@/lib/consent";

/** Nạp mã Google (1 lần) — CHỈ gọi sau khi khách đồng ý. Consent Mode đã được đặt trước đó (Tracking.js). */
function loadGoogle({ gtm, ga4, ads }) {
  if (window.__vlTagsLoaded) return;
  window.__vlTagsLoaded = true;
  const add = (src) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  };
  if (gtm) {
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    add(`https://www.googletagmanager.com/gtm.js?id=${gtm}`);
    return;
  }
  const ids = [ga4, ads].filter(Boolean);
  if (!ids.length) return;
  add(`https://www.googletagmanager.com/gtag/js?id=${ids[0]}`);
  gtag("js", new Date());
  ids.forEach((id) => gtag("config", id));
}

/**
 * Banner cookie + Google Consent Mode v2 (khách EU). Chỉ được gắn khi CMS có cài mã Google (xem Tracking.js).
 * - Chưa chọn: mọi cookie thống kê / quảng cáo bị từ chối và KHÔNG nạp mã Google nào.
 * - "Chấp nhận tất cả" / "Từ chối" / "Tuỳ chỉnh" (bật riêng Phân tích, Quảng cáo). Lựa chọn được nhớ (localStorage).
 * - Mở lại bảng tuỳ chỉnh bất cứ lúc nào: link "Cài đặt cookie" ở chân trang (CookieSettingsLink).
 * Banner dạng fixed ở đáy, hiện sau khi trang đã tải → không gây xô lệch bố cục (CLS), không chặn ảnh chính (LCP).
 */
export default function ConsentBanner({ ids, labels, privacyHref }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [choice, setChoice] = useState({ analytics: true, ads: true });
  const titleId = useId();

  useEffect(() => {
    const saved = readConsent();
    if (saved && hasTrackingConsent(saved)) loadGoogle(ids);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chỉ hiện banner khi chưa có lựa chọn
    if (!saved) setOpen(true);
    const reopen = () => {
      const c = readConsent();
      if (c) setChoice(c);
      setCustom(true);
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, [ids]);

  const choose = (c) => {
    saveConsent(c);
    if (hasTrackingConsent(c)) loadGoogle(ids);
    setOpen(false);
    setCustom(false);
  };

  if (!open) return null;

  const btn = "h-10 rounded-full px-4 text-sm font-semibold transition";
  const toggles = [
    { key: "analytics", label: labels.analytics, text: labels.analyticsText },
    { key: "ads", label: labels.ads, text: labels.adsText },
  ];

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      data-lenis-prevent
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-h-[calc(100dvh-24px)] max-w-3xl animate-fade-up overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)] ring-1 ring-sand-300/70 sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Cookie className="hidden size-9 shrink-0 text-clay-500 sm:block" strokeWidth={1.6} />
        <p className="flex-1 text-sm leading-relaxed text-ink/80">
          <span id={titleId} className="font-semibold text-ink">
            {labels.title}
          </span>{" "}
          {labels.text}{" "}
          <Link
            href={privacyHref}
            className="hover:text-clay-700 font-semibold text-clay-600 underline underline-offset-2"
          >
            {labels.more}
          </Link>
        </p>
        {!custom && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCustom(true)}
              className="min-h-10 px-1 text-sm font-semibold text-ink/70 underline underline-offset-2 hover:text-ink"
            >
              {labels.settings}
            </button>
            <button
              type="button"
              onClick={() => choose({ analytics: false, ads: false })}
              className={cn(btn, "text-ink ring-1 ring-sand-300 hover:bg-cream-100")}
            >
              {labels.reject}
            </button>
            <button
              type="button"
              onClick={() => choose({ analytics: true, ads: true })}
              className={cn(btn, "bg-clay-500 px-5 text-white hover:bg-clay-600")}
            >
              {labels.accept}
            </button>
          </div>
        )}
      </div>

      {custom && (
        <div className="mt-4 border-t border-sand-300/60 pt-4">
          <ul className="grid gap-3 sm:grid-cols-3">
            <li className="rounded-xl bg-cream-50 p-3">
              <label className="flex items-center justify-between gap-2 text-sm font-semibold text-ink">
                {labels.essential}
                <input type="checkbox" checked disabled className="size-4 accent-clay-500" />
              </label>
              <p className="mt-1 text-xs leading-relaxed text-muted">{labels.essentialText}</p>
            </li>
            {toggles.map((tg) => (
              <li key={tg.key} className="rounded-xl bg-cream-50 p-3">
                <label className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-ink">
                  {tg.label}
                  <input
                    type="checkbox"
                    checked={choice[tg.key]}
                    onChange={(e) => setChoice((c) => ({ ...c, [tg.key]: e.target.checked }))}
                    className="size-4 accent-clay-500"
                  />
                </label>
                <p className="mt-1 text-xs leading-relaxed text-muted">{tg.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap justify-end gap-2 max-sm:[&>button]:flex-1">
            <button
              type="button"
              onClick={() => choose({ analytics: false, ads: false })}
              className={cn(btn, "text-ink ring-1 ring-sand-300 hover:bg-cream-100")}
            >
              {labels.reject}
            </button>
            <button
              type="button"
              onClick={() => choose(choice)}
              className={cn(btn, "text-ink ring-1 ring-clay-500 hover:bg-cream-100")}
            >
              {labels.save}
            </button>
            <button
              type="button"
              onClick={() => choose({ analytics: true, ads: true })}
              className={cn(btn, "bg-clay-500 px-5 text-white hover:bg-clay-600")}
            >
              {labels.accept}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Link nhỏ "Cài đặt cookie" (chân trang) — chỉ hiện khi website có cài mã Google. */
export function CookieSettingsLink({ label, className }) {
  const [show, setShow] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- chỉ biết sau khi chạy ở trình duyệt
  useEffect(() => setShow(!!window.__vlTracking), []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
      className={className}
    >
      {label}
    </button>
  );
}
