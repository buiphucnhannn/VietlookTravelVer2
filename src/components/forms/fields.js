"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Copy, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-12 w-full rounded-lg border border-border bg-white px-4 text-[0.95rem] text-ink placeholder:text-muted/70 transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none aria-[invalid=true]:border-sun-500 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-sun-500/10";

/* ───────────── Kiểm tra dữ liệu form (dùng chung mọi form) ───────────── */

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Ngày sớm nhất được chọn: NGÀY MAI (YYYY-MM-DD theo giờ máy khách). */
export function minBookingDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoLocal(d);
}
export const isFutureDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= minBookingDate();
export const isEmail = (v) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(String(v).trim());
/** Số điện thoại: chỉ số, khoảng trắng, + ( ) - . ; 6–15 chữ số. */
export const cleanPhone = (v) => String(v).replace(/[^\d+\s().-]/g, "");
export const isPhone = (v) => {
  const s = String(v).trim();
  const digits = s.replace(/\D/g, "").length;
  return /^\+?[\d\s().-]+$/.test(s) && digits >= 6 && digits <= 15;
};

const MSG = {
  en: {
    name: "Please enter your full name",
    email: "Please enter your email address",
    emailInvalid: "Please enter a valid email address",
    phoneInvalid: "Please enter a valid phone number (digits and + only)",
    contactNeeded: "Please enter your email or phone number",
    date: "Please choose a date",
    dateFuture: "Please choose a future date",
    required: "This field is required",
    fix: "Please check the highlighted fields.",
  },
  zh: {
    name: "请输入您的姓名",
    email: "请输入您的邮箱",
    emailInvalid: "请输入有效的邮箱地址",
    phoneInvalid: "请输入有效的电话号码（仅限数字和 +）",
    contactNeeded: "请输入邮箱或电话号码",
    date: "请选择日期",
    dateFuture: "请选择今天之后的日期",
    required: "此项为必填",
    fix: "请检查标红的字段。",
  },
};
export const formMsg = (lang) => MSG[lang] || MSG.en;

/**
 * Kiểm tra các ô chung: tên, email, điện thoại, ngày.
 * opts.email: "required" | "optional" | "either" (email HOẶC điện thoại); opts.dates: { key: required? }
 * opts.required: các ô bắt buộc khác. Trả về { key: thông báo } – rỗng = hợp lệ.
 */
export function validate(d, lang, { email = "required", dates = {}, required = [] } = {}) {
  const m = formMsg(lang);
  const e = {};
  if (!String(d.name || "").trim()) e.name = m.name;
  const em = String(d.email || "").trim();
  const ph = String(d.phone || "").trim();
  if (em && !isEmail(em)) e.email = m.emailInvalid;
  else if (!em && email === "required") e.email = m.email;
  if (ph && !isPhone(ph)) e.phone = m.phoneInvalid;
  if (email === "either" && !em && !ph) e.email = m.contactNeeded;
  for (const [k, req] of Object.entries(dates)) {
    const v = d[k];
    if (!v) {
      if (req) e[k] = m.date;
    } else if (!isFutureDate(v)) e[k] = m.dateFuture;
  }
  for (const k of required) if (!String(d[k] ?? "").trim()) e[k] = m.required;
  return e;
}

/** Ô ngày: không cho chọn ngày đã qua (min = ngày mai). */
export function DateInput({ className, ...props }) {
  return (
    <input
      type="date"
      min={minBookingDate()}
      suppressHydrationWarning
      className={cn(inputClass, className)}
      {...props}
    />
  );
}

/** Ô điện thoại: chỉ nhận số, khoảng trắng và + ( ) - . */
export function PhoneInput({ className, onChange, ...props }) {
  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      className={cn(inputClass, className)}
      onChange={(e) => {
        const clean = cleanPhone(e.target.value);
        if (clean !== e.target.value) e.target.value = clean;
        onChange?.(e);
      }}
      {...props}
    />
  );
}

export function Field({ label, required, hint, error, className, children, htmlFor }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
          {label}
          {required && <span className="ml-1 text-sun-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs font-medium text-sun-600">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        inputClass,
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b6b77%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] appearance-none bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(inputClass, "h-auto min-h-28 py-3", className)} {...props} />;
}

/** Bộ đếm +/- (số người lớn, trẻ em...). */
export function Counter({ value, onChange, min = 0, max = 99, label, id, className }) {
  return (
    <div
      className={cn(
        "flex h-12 items-center justify-between rounded-lg border border-border bg-white px-1.5",
        className,
      )}
    >
      <button
        type="button"
        aria-label={`- ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid size-9 place-items-center rounded-md bg-surface text-ink transition hover:bg-brand-100 disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <output id={id} className="min-w-10 text-center text-base font-semibold text-ink">
        {value}
      </output>
      <button
        type="button"
        aria-label={`+ ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid size-9 place-items-center rounded-md bg-surface text-ink transition hover:bg-brand-100 disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Nút chọn dạng "chip" (nhiều lựa chọn hoặc một). */
export function Chips({ options, value, onChange, multiple }) {
  const isOn = (o) => (multiple ? value.includes(o.value) : value === o.value);
  const toggle = (o) => {
    if (!multiple) return onChange(o.value);
    onChange(isOn(o) ? value.filter((v) => v !== o.value) : [...value, o.value]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={isOn(o)}
          onClick={() => toggle(o)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition",
            isOn(o)
              ? "border-brand-600 bg-brand-600 text-white shadow-sm"
              : "border-border bg-white text-ink hover:border-brand-300 hover:bg-brand-50",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Ô ẩn chống spam (bot thường điền vào). */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Company website
        <input type="text" name="website_url" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

/** Gửi yêu cầu tới /api/enquiry, trả về mã yêu cầu. */
export function useEnquiry(type, lang) {
  const router = useRouter();
  const [state, setState] = useState({ status: "idle", code: null, error: null });

  async function submit(payload, formEl) {
    setState({ status: "sending", code: null, error: null });
    try {
      const honeypot = formEl?.querySelector?.('[name="website_url"]')?.value || "";
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, lang, honeypot, page: window.location.pathname, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "error");
      setState({ status: "success", code: json.code, error: null });
      // Sự kiện chuyển đổi cho GTM/GA4 + chuyển sang trang cảm ơn (URL riêng để đo Google Ads)
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "generate_lead", form_type: type, request_code: json.code });
      const prefix = lang && lang !== "en" ? `/${lang}` : "";
      router.push(`${prefix}/thank-you?code=${encodeURIComponent(json.code || "")}&type=${type}`);
      return json;
    } catch (e) {
      setState({ status: "error", code: null, error: e.message });
    }
  }

  return { ...state, submit, reset: () => setState({ status: "idle", code: null, error: null }) };
}

export function SuccessPanel({ title, text, code, labels, onReset }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="animate-fade-up rounded-2xl border border-brand-100 bg-brand-50/60 p-8 text-center">
      <CheckCircle2 className="mx-auto size-14 text-brand-500" strokeWidth={1.6} />
      <h3 className="mt-4 text-2xl font-bold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-muted">{text}</p>
      {code && (
        <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-xl border border-dashed border-brand-300 bg-white px-5 py-3">
          <span className="text-sm text-muted">{labels.yourRequestCode}:</span>
          <span className="font-mono text-lg font-bold tracking-wider text-brand-700">{code}</span>
          <button
            type="button"
            aria-label={labels.copy}
            onClick={() => {
              navigator.clipboard?.writeText(code).catch(() => {});
              setCopied(true);
            }}
            className="text-brand-600 hover:text-brand-800"
          >
            {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
      )}
      <p className="mx-auto mt-5 max-w-md text-sm text-muted">{labels.weReply}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 text-sm font-semibold text-brand-600 hover:underline"
        >
          {labels.sendAnother}
        </button>
      )}
    </div>
  );
}

export function FormError({ show, text }) {
  if (!show) return null;
  return (
    <p role="alert" className="rounded-lg bg-sun-50 px-4 py-3 text-sm font-medium text-sun-700">
      {text}
    </p>
  );
}
