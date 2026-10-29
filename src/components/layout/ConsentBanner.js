"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const KEY = "vl-consent";
const grant = (all) => ({
  ad_storage: all ? "granted" : "denied",
  ad_user_data: all ? "granted" : "denied",
  ad_personalization: all ? "granted" : "denied",
  analytics_storage: all ? "granted" : "denied",
});

function gtag() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(arguments);
}

/**
 * Banner cookie + Google Consent Mode v2 (tài liệu mục 3: "cookie banner/Consent Mode cho khách EU").
 * Mặc định từ chối mọi cookie quảng cáo/thống kê; khách chọn "Accept all" mới bật.
 * Lựa chọn lưu ở localStorage; GTM/GA4 gắn sau sẽ tự đọc trạng thái consent qua dataLayer.
 */
export default function ConsentBanner({ labels, privacyHref }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    gtag("consent", "default", { ...grant(false), wait_for_update: 500 });
    if (saved) gtag("consent", "update", grant(saved === "all"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chỉ hiện banner khi chưa có lựa chọn
    else setOpen(true);
  }, []);

  const choose = (all) => {
    try {
      localStorage.setItem(KEY, all ? "all" : "necessary");
    } catch {}
    gtag("consent", "update", grant(all));
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={labels.title}
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl animate-fade-up rounded-2xl bg-white p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)] ring-1 ring-sand-300/70 sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Cookie className="hidden size-9 shrink-0 text-clay-500 sm:block" strokeWidth={1.6} />
        <p className="flex-1 text-sm leading-relaxed text-ink/80">
          <span className="font-semibold text-ink">{labels.title}</span> {labels.text}{" "}
          <Link
            href={privacyHref}
            className="font-semibold text-clay-600 underline-offset-2 hover:underline"
          >
            {labels.more}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            className="h-10 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-sand-300 transition hover:bg-cream-100"
          >
            {labels.necessary}
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="h-10 rounded-full bg-clay-500 px-5 text-sm font-semibold text-white transition hover:bg-clay-600"
          >
            {labels.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
