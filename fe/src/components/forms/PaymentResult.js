"use client";

import { useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  MessageCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fill, formatVND, payErrorText, readPayOffer, startPayment } from "@/lib/payment";

const noopSubscribe = () => () => {};

const TONES = {
  success: {
    icon: CheckCircle2,
    box: "border-emerald-200 bg-emerald-50/70",
    icon_: "text-emerald-600",
    title: "text-emerald-900",
  },
  pending: {
    icon: Clock,
    box: "border-brand-100 bg-brand-50/70",
    icon_: "text-brand-600",
    title: "text-brand-900",
  },
  failed: {
    icon: XCircle,
    box: "border-sun-100 bg-sun-50/70",
    icon_: "text-sun-600",
    title: "text-ink",
  },
  // khách tự huỷ → giọng bình thản, không báo lỗi
  cancelled: {
    icon: Info,
    box: "border-sand-300/70 bg-white",
    icon_: "text-clay-600",
    title: "text-ink",
  },
};

/**
 * Kết quả thanh toán 9Pay trên trang cảm ơn (?payment=success|pending|failed|cancelled, &amount=VND).
 * Thất bại / huỷ → "Thử thanh toán lại" (dùng payToken còn lưu trong tab) + "Liên hệ chúng tôi".
 * Không có ?payment → không hiện gì (luồng đặt tour không thanh toán giữ nguyên).
 */
export default function PaymentResult({ lang, p, contactHref }) {
  const params = useSearchParams();
  const outcome = params.get("payment");
  const code = params.get("code") || "";
  const amount = Number(params.get("amount")) || 0;
  // payToken chỉ có trên trình duyệt (sessionStorage) → đọc sau khi hydrate
  const offer = useSyncExternalStore(
    noopSubscribe,
    () => (code ? sessionStorage.getItem(`vl-pay:${code}`) : null),
    () => null,
  );
  const [state, setState] = useState({ busy: false, error: "" });

  if (!["success", "pending", "failed", "cancelled"].includes(outcome)) return null;
  const kind = outcome === "cancelled" ? "failed" : outcome; // huỷ cũng cho thử lại
  const tone = TONES[outcome];
  const Icon = tone.icon;
  const title = {
    success: p.successTitle,
    pending: p.pendingTitle,
    failed: p.failedTitle,
    cancelled: p.cancelledTitle,
  }[outcome];
  const text = {
    success: amount ? fill(p.successText, { amount: formatVND(amount) }) : p.successNoAmount,
    pending: p.pendingText,
    failed: p.failedText,
    cancelled: p.cancelledText,
  }[outcome];
  const canRetry = kind === "failed" && Boolean(offer);

  const retry = async () => {
    const saved = readPayOffer(code);
    if (!saved?.token) return;
    setState({ busy: true, error: "" });
    try {
      const { url } = await startPayment(code, saved.token, lang);
      window.location.assign(url);
    } catch (err) {
      setState({ busy: false, error: payErrorText(err, p) });
    }
  };

  return (
    <div
      role="status"
      className={cn(
        "mx-auto mt-8 max-w-xl animate-fade-up rounded-2xl border px-5 py-5 text-left sm:px-6",
        tone.box,
      )}
    >
      <div className="flex gap-3.5">
        <Icon className={cn("mt-0.5 size-6 shrink-0", tone.icon_)} strokeWidth={2} />
        <div className="min-w-0">
          <p className={cn("text-lg leading-snug font-bold", tone.title)}>{title}</p>
          <p className="mt-1 text-[0.95rem] leading-relaxed text-ink/75">{text}</p>
        </div>
      </div>
      {kind === "failed" && (
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:pl-[2.6rem]">
          {canRetry && (
            <button
              type="button"
              onClick={retry}
              disabled={state.busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sun-500 px-5 text-sm font-semibold text-white shadow-md shadow-sun-500/20 transition hover:bg-sun-600 disabled:opacity-80"
            >
              {state.busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              {state.busy ? p.redirecting : p.retry}
            </button>
          )}
          <a
            href={contactHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-border transition hover:ring-brand-300"
          >
            <MessageCircle className="size-4 text-brand-600" /> {p.contact}
          </a>
        </div>
      )}
      {state.error && (
        <p role="alert" className="mt-3 text-sm font-medium text-sun-700 sm:pl-[2.6rem]">
          {state.error}
        </p>
      )}
    </div>
  );
}
