"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, ShieldCheck } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import {
  fill,
  formatRate,
  formatVND,
  payErrorText,
  savePayOffer,
  startPayment,
} from "@/lib/payment";
import { FormError } from "@/components/forms/fields";

/**
 * Bước "Thanh toán" sau khi đơn đặt tour ĐÃ được lưu (chỉ khi CMS bật 9Pay).
 * Thứ tự: đã lưu đơn → tóm tắt đơn → số tiền trả ngay (USD lớn, VND + tỷ giá) → nút 9Pay / Thanh toán sau
 * → dòng tin cậy. Số tiền do máy chủ tính (offer từ POST /enquiries).
 */
export default function PaymentStep({ lang, code, offer, summary, p }) {
  const router = useRouter();
  const [state, setState] = useState({ busy: false, error: "" });
  const prefix = lang && lang !== "en" ? `/${lang}` : "";
  const thankYou = `${prefix}/thank-you?code=${encodeURIComponent(code)}&type=booking`;
  const deposit = offer.kind === "deposit";
  const rest = Math.max(0, (offer.totalUsd || 0) - (offer.amountUsd || 0));
  const label =
    offer.kind === "balance"
      ? p.payBalance
      : deposit
        ? fill(p.payDeposit, { percent: offer.depositPercent })
        : p.payFull;

  const pay = async () => {
    setState({ busy: true, error: "" });
    try {
      savePayOffer(code, offer);
      const { url } = await startPayment(code, offer.token, lang);
      window.location.assign(url); // nút giữ trạng thái "Đang mở 9Pay…" tới khi trang mới tải
    } catch (err) {
      setState({ busy: false, error: payErrorText(err, p) });
    }
  };

  const rows = [
    [p.tour, summary.tour],
    [p.date, summary.date],
    [p.guests, summary.guests],
    summary.hotel && [p.hotel, summary.hotel],
  ].filter(Boolean);

  return (
    // Khung dính (màn hình lớn): phần thông tin cuộn khi màn hình quá thấp, nút thanh toán + dòng tin cậy luôn ở đáy
    <div
      className="animate-fade-up space-y-5 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0"
      aria-live="polite"
    >
      <div
        data-bk-scroll
        className="scrollbar-thin space-y-5 lg:-mx-2 lg:-my-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:px-2 lg:py-1 bk-mid:space-y-3 bk-compact:space-y-2.5"
      >
        <div className="text-center">
          <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <CheckCircle2 className="size-3.5 shrink-0" /> {p.stepBadge}
            </span>
            <span className="font-mono tracking-wide whitespace-nowrap text-emerald-800/80">
              <span className="hidden min-[380px]:inline">· </span>
              {code}
            </span>
          </p>
          <h3 className="mt-3 text-xl leading-snug font-bold text-balance text-ink bk-mid:mt-2 bk-mid:text-lg">
            {p.stepTitle}
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-pretty text-muted bk-mid:mt-1 bk-mid:text-[0.8rem] bk-mid:leading-snug bk-compact:hidden">
            {fill(p.stepText, { code })}
          </p>
        </div>

        <dl className="divide-y divide-border rounded-xl bg-surface px-4 text-sm bk-compact:text-[0.8rem]">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex items-start justify-between gap-5 py-3 bk-mid:py-2 bk-compact:py-1.5"
            >
              <dt className="shrink-0 text-muted">{k}</dt>
              <dd className="min-w-0 text-right leading-snug font-medium text-ink">
                <span className="line-clamp-3 bk-mid:line-clamp-2 bk-compact:line-clamp-1">
                  {v}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="overflow-hidden rounded-xl border border-brand-100 bg-brand-50/60">
          {(deposit || offer.kind === "balance") && (
            <p className="flex justify-between gap-3 border-b border-brand-100 px-4 py-2.5 text-sm text-muted bk-mid:py-2 bk-compact:py-1.5 bk-compact:text-[0.8rem]">
              <span>{p.total}</span>
              <span className="font-semibold text-ink tabular-nums">
                {formatUSD(offer.totalUsd)}
              </span>
            </p>
          )}
          {/* Mức compact: "Trả ngay" bên trái — số tiền bên phải, ghi chú tỷ giá 1 dòng bên dưới */}
          <div className="px-4 py-5 text-center bk-mid:py-3 bk-compact:flex bk-compact:flex-wrap bk-compact:items-center bk-compact:justify-between bk-compact:gap-x-3 bk-compact:py-2.5 bk-compact:text-left">
            <div>
              <p className="text-[11px] font-bold tracking-[0.12em] text-brand-700 uppercase">
                {p.payNow}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{label}</p>
            </div>
            <div className="bk-compact:text-right">
              <p className="mt-2 text-4xl leading-none font-extrabold text-sun-500 tabular-nums bk-mid:mt-1.5 bk-mid:text-3xl bk-compact:mt-0 bk-compact:text-[1.75rem]">
                {formatUSD(offer.amountUsd)}
              </p>
              <p className="mt-3 text-base font-bold text-ink tabular-nums bk-mid:mt-2 bk-compact:mt-0.5 bk-compact:text-sm">
                {formatVND(offer.amountVnd)}
              </p>
            </div>
            <div className="bk-compact:mt-1.5 bk-compact:basis-full bk-compact:text-center bk-compact:text-[0.7rem] bk-compact:leading-snug">
              <p className="mt-0.5 text-xs leading-relaxed text-muted bk-compact:inline bk-compact:text-[0.7rem]">
                {p.charged}
              </p>
              <span className="hidden text-muted bk-compact:inline"> · </span>
              <p className="text-xs text-muted tabular-nums bk-compact:inline bk-compact:text-[0.7rem]">
                {fill(p.rate, { rate: formatRate(offer.rate) })}
              </p>
            </div>
          </div>
          {deposit && rest > 0 && (
            <p className="border-t border-brand-100 bg-white/50 px-4 py-2.5 text-center text-xs leading-relaxed text-pretty text-muted bk-mid:py-2 bk-compact:py-1.5 bk-compact:text-[0.7rem] bk-compact:leading-snug">
              {fill(p.restLater, { amount: formatUSD(rest) })}
            </p>
          )}
        </div>

        <FormError show={!!state.error} text={state.error} />
      </div>

      <div className="shrink-0 space-y-1.5 lg:pt-4 bk-mid:lg:pt-3 bk-compact:space-y-1">
        <button
          type="button"
          onClick={pay}
          disabled={state.busy}
          aria-busy={state.busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-sun-500 text-base font-semibold text-white shadow-md shadow-sun-500/25 transition hover:bg-sun-600 disabled:opacity-80 bk-mid:h-11"
        >
          {state.busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" strokeWidth={2.4} />
          )}
          {state.busy ? p.redirecting : p.button}
        </button>
        <button
          type="button"
          onClick={() => router.push(thankYou)}
          disabled={state.busy}
          className="flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold text-brand-600 transition hover:bg-brand-50 disabled:opacity-50 bk-mid:h-9 bk-compact:h-8"
        >
          {p.later}
        </button>
      </div>

      <div className="shrink-0 border-t border-border pt-4 text-center text-xs text-muted lg:mt-4 bk-mid:pt-3 bk-mid:lg:mt-3 bk-compact:pt-2 bk-compact:lg:mt-2">
        <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <ShieldCheck className="size-4 shrink-0 text-brand-500" /> {p.trust}
        </p>
        <p className="mt-1 bk-compact:mt-0.5">{p.methods}</p>
      </div>
    </div>
  );
}
