"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, Copy, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { isISODate } from "@/lib/dates";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import Captcha, { resetCaptcha } from "./Captcha";

export const inputClass =
  "h-12 w-full rounded-lg border border-border bg-white pr-4 pl-4 text-[0.95rem] text-ink placeholder:text-muted/70 transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none aria-[invalid=true]:border-sun-500 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-sun-500/10";

/* ───────────── Kiểm tra dữ liệu form (dùng chung mọi form) ───────────── */

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Ngày sớm nhất được chọn: NGÀY MAI (YYYY-MM-DD theo giờ máy khách). */
export function minBookingDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoLocal(d);
}
const noopSubscribe = () => () => {};
/**
 * minBookingDate() dùng khi render: chỉ tính ở trình duyệt (server/dựng sẵn trả undefined → chưa đặt min).
 * Không gọi new Date() lúc dựng trang tĩnh → trang được dựng sẵn trọn vẹn (không phải chờ phần động).
 */
export const useMinBookingDate = () =>
  useSyncExternalStore(noopSubscribe, minBookingDate, () => undefined);
export const isFutureDate = (v) => isISODate(v) && v >= minBookingDate();
/** Lỗi của 1 ô ngày đã có chữ: gõ sai dạng → "ngày không hợp lệ"; ngày đã qua → "chọn ngày trong tương lai" */
export const dateError = (v, m) =>
  !isISODate(v) ? m.dateInvalid : !isFutureDate(v) ? m.dateFuture : "";
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
    dateInvalid: "Please enter a valid date (mm/dd/yyyy)",
    returnAfter: "Return date must be on or after the departure date",
    timeInvalid: "Please enter a valid time (HH:mm, 24-hour)",
    returnTimeAfter: "Return time must be later than the pickup time on the same day",
    required: "This field is required",
    route: "Please tell us your route (where to pick you up and where to go)",
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
    dateInvalid: "请输入有效日期（yyyy/mm/dd）",
    returnAfter: "返程日期不能早于出发日期",
    timeInvalid: "请输入有效时间（HH:mm，24小时制）",
    returnTimeAfter: "同一天返程时，返程时间须晚于接车时间",
    required: "此项为必填",
    route: "请填写行程路线（从哪里出发、去哪里）",
    fix: "请检查标红的字段。",
  },
  vi: {
    name: "Vui lòng nhập họ và tên",
    email: "Vui lòng nhập địa chỉ email",
    emailInvalid: "Vui lòng nhập địa chỉ email hợp lệ",
    phoneInvalid: "Vui lòng nhập số điện thoại hợp lệ (chỉ gồm chữ số và dấu +)",
    contactNeeded: "Vui lòng nhập email hoặc số điện thoại",
    date: "Vui lòng chọn ngày",
    dateFuture: "Vui lòng chọn một ngày trong tương lai",
    dateInvalid: "Ngày không hợp lệ (định dạng dd/mm/yyyy)",
    returnAfter: "Ngày về không được sớm hơn ngày đi",
    timeInvalid: "Giờ không hợp lệ (HH:mm, 24 giờ)",
    returnTimeAfter: "Về trong cùng ngày thì giờ về phải sau giờ đón",
    required: "Vui lòng điền thông tin này",
    route: "Vui lòng cho biết lộ trình (đón ở đâu, đi những nơi nào)",
    fix: "Vui lòng kiểm tra lại các ô được đánh dấu.",
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
    } else if (dateError(v, m)) e[k] = dateError(v, m);
  }
  for (const k of required) if (!String(d[k] ?? "").trim()) e[k] = m.required;
  return e;
}

/**
 * Ô ngày của website: hiện theo ngôn ngữ trang (en mm/dd/yyyy · vi dd/mm/yyyy · zh yyyy/mm/dd), giá trị ISO; không cho chọn ngày đã qua
 * (min mặc định = ngày mai). Xem components/ui/DatePicker.js.
 */
export function DateInput({ className, lang, min, ...props }) {
  const minDefault = useMinBookingDate();
  return (
    <DatePicker
      lang={lang}
      min={min ?? minDefault}
      className={cn(inputClass, className)}
      {...props}
    />
  );
}

/** Ô giờ của website: luôn hiện HH:mm (24 giờ, mọi ngôn ngữ / máy). Xem components/ui/TimePicker.js. */
export function TimeInput({ className, ...props }) {
  return <TimePicker {...props} className={cn(inputClass, className)} />;
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

/** Chống spam: ô ẩn (bot thường điền vào) + captcha Cloudflare Turnstile (chỉ hiện khi cần xác minh). */
export function Honeypot() {
  return (
    <>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company website
          <input type="text" name="website_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Captcha />
    </>
  );
}

/**
 * Gửi yêu cầu tới backend (/api/v1/enquiries) → lưu vào CMS, trả về mã yêu cầu, email thông báo gửi sau.
 * Kèm token captcha (nếu bật) và header chống CSRF.
 */
export function useEnquiry(type, lang) {
  const router = useRouter();
  const [state, setState] = useState({ status: "idle", code: null, error: null });

  /** stay(data) → true: ở lại trang (vd. bước thanh toán 9Pay), không chuyển sang trang cảm ơn */
  async function submit(payload, formEl, { stay } = {}) {
    setState({ status: "sending", code: null, error: null });
    try {
      const honeypot = formEl?.querySelector?.('[name="website_url"]')?.value || "";
      const captcha = formEl?.querySelector?.('[name="cf-turnstile-response"]')?.value || "";
      const res = await fetch("/api/v1/enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "fetch",
          ...(captcha && { "X-Captcha-Token": captcha }),
        },
        body: JSON.stringify({ type, lang, honeypot, page: window.location.pathname, ...payload }),
        signal: AbortSignal.timeout(30_000),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const err = new Error(
          json?.error?.details?.[0]?.message || json?.error?.message || "error",
        );
        // Câu máy chủ đã dịch theo ngôn ngữ khách (dữ liệu sai, captcha, gửi quá nhiều, tour ngừng bán) → hiện cho khách;
        // lỗi máy chủ (5xx) / bị chặn (403) → form hiện câu chung
        if ([400, 404, 409, 422, 429].includes(res.status)) err.forCustomer = true;
        throw err;
      }
      const code = json?.data?.code;
      setState({ status: "success", code, error: null });
      if (stay?.(json?.data)) return json?.data;
      // Chuyển sang trang cảm ơn (URL riêng để đo Google Ads); sự kiện chuyển đổi gửi ở đó khi khách đã đồng ý
      // cookie (components/forms/LeadEvent.js)
      const prefix = lang && lang !== "en" ? `/${lang}` : "";
      router.push(`${prefix}/thank-you?code=${encodeURIComponent(code || "")}&type=${type}`);
      return json?.data;
    } catch (e) {
      resetCaptcha(formEl);
      setState({ status: "error", code: null, error: e.forCustomer ? e.message : null });
    }
  }

  return { ...state, submit, reset: () => setState({ status: "idle", code: null, error: null }) };
}

export function SuccessPanel({ title, text, code, labels, onReset, className }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className={cn(
        "animate-fade-up rounded-2xl border border-brand-100 bg-brand-50/60 p-8 text-center",
        className,
      )}
    >
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
