"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { href } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Ô "Tôi đồng ý Chính sách bảo mật & Điều khoản…" đặt ngay trên nút gửi của MỌI form thu thập thông tin
 * (NĐ 13/2023/NĐ-CP: đồng ý rõ ràng, tự nguyện, nêu mục đích; GDPR). KHÔNG tick sẵn.
 * Chữ lấy từ từ điển `common.formConsent` (truyền `c` = dict.common hoặc bản mở rộng của nó).
 * Liên kết chính sách mở tab mới để khách không mất dữ liệu đang nhập.
 *
 *   <ConsentCheckbox id="cf-consent" lang={lang} c={c} checked={d.consent}
 *     onChange={(v) => …} error={errs.consent} />
 */
export default function ConsentCheckbox({ id, lang, c, checked, onChange, error, className }) {
  const t = c.formConsent;
  const errId = `${id}-error`;
  const links = { privacy: [t.privacy, "/policies/privacy"], terms: [t.terms, "/policies/terms"] };
  const parts = t.text.split(/\{(privacy|terms)\}/);

  return (
    <div data-consent className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[0.8rem] leading-snug text-ink transition sm:text-sm",
          error
            ? "border-sun-500 bg-sun-50/70"
            : "border-border bg-white/80 hover:border-brand-300",
        )}
      >
        <span className="relative mt-px grid size-5 shrink-0 place-items-center">
          <input
            id={id}
            type="checkbox"
            name="consent"
            checked={!!checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? errId : undefined}
            className="peer size-5 cursor-pointer appearance-none rounded-md border-2 border-muted/60 bg-white transition checked:border-brand-600 checked:bg-brand-600 focus-visible:ring-4 focus-visible:ring-brand-500/30 focus-visible:outline-none aria-[invalid=true]:border-sun-500"
          />
          <Check
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100"
          />
        </span>
        <span>
          {parts.map((p, i) =>
            links[p] ? (
              <a
                key={i}
                href={href(lang, links[p][1])}
                target="_blank"
                rel="noopener"
                className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900"
              >
                {links[p][0]}
              </a>
            ) : (
              <Fragment key={i}>{p}</Fragment>
            ),
          )}
        </span>
      </label>
      {error && (
        <p id={errId} role="alert" className="text-xs font-medium text-sun-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Lỗi của ô đồng ý (rỗng = đã tick). */
export const consentError = (checked, c) => (checked ? {} : { consent: c.formConsent.error });

/** Bỏ lỗi ô đồng ý (gọi ngay khi khách tick). */
export const dropConsentError = (errs) => {
  if (!errs.consent) return errs;
  const next = { ...errs };
  delete next.consent;
  return next;
};

/** Có lỗi ở ô nhập khác ngoài ô đồng ý (để hiện câu "Vui lòng kiểm tra lại các ô được đánh dấu"). */
export const hasFieldErrors = (errs) => Object.keys(errs).some((k) => k !== "consent");

/** Sau khi báo lỗi: cuộn tới & đặt con trỏ vào ô lỗi đầu tiên trong form (kể cả ô đồng ý). */
export function focusFirstError(formEl) {
  requestAnimationFrame(() => {
    const el = formEl?.querySelector?.('[aria-invalid="true"]');
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  });
}
