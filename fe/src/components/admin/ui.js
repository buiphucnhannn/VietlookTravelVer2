"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crop,
  Film,
  HelpCircle,
  ImagePlus,
  Info,
  Link2,
  Loader2,
  PlayCircle,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { canonicalVideo, embedUrl, parseVideo, videoLinkError, videoThumb } from "@/lib/video";
import { cn } from "@/lib/utils";
import { fmtDate as fmtDateShared, fmtDateTime as fmtDateTimeShared } from "@/lib/dates";
import DatePicker from "@/components/ui/DatePicker";
import { useVisualViewport } from "@/lib/use-visual-viewport";
import { DragHandle, Sortable } from "./Sortable";
import { CROP_PRESETS, canRecrop, cropSpec, useImageCrop } from "./ImageCropper";
import { isPendingImage } from "./pendingImages";
import { copyDriveVideo } from "./pendingVideos";

/* =========================================================================
 * Ngôn ngữ nội dung
 * ========================================================================= */

/** Nhập nội dung bằng ngôn ngữ nào cũng được — ngôn ngữ còn trống sẽ tự dịch khi lưu */
export const LANGS = [
  { key: "vi", label: "Tiếng Việt", short: "VI" },
  { key: "en", label: "English", short: "EN" },
  { key: "zh", label: "中文", short: "中文" },
];

/** Ngôn ngữ mở sẵn khi soạn nội dung (nhân viên thường viết tiếng Việt trước) */
export const DEFAULT_LANG = "vi";

/** Chữ đầu tiên có nội dung trong { en, zh, vi } (ưu tiên `prefer`) */
export const anyLang = (loc, prefer) =>
  (prefer && String(loc?.[prefer] ?? "").trim()) ||
  ["en", "vi", "zh"].map((l) => String(loc?.[l] ?? "").trim()).find(Boolean) ||
  "";

/** Tab ngôn ngữ: chấm xanh = đã nhập, chấm xám = còn trống (sẽ tự dịch khi lưu) */
export function LangTabs({ value, onChange, filled = {}, className }) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex shrink-0 rounded-full bg-slate-100 p-1", className)}
    >
      {LANGS.map((l) => (
        <button
          key={l.key}
          type="button"
          role="tab"
          aria-selected={value === l.key}
          onClick={() => onChange(l.key)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition sm:px-3.5",
            value === l.key
              ? "bg-white text-brand-800 shadow-sm"
              : "text-slate-500 hover:text-slate-800",
          )}
        >
          {l.short}
          <span
            className={cn(
              "size-1.5 rounded-full",
              filled[l.key] ? "bg-emerald-500" : "bg-slate-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Đã nhập nội dung cho từng ngôn ngữ chưa (dựa trên 1 trường chính) */
export const filledOf = (loc) =>
  Object.fromEntries(LANGS.map((l) => [l.key, Boolean(loc?.[l.key]?.trim?.())]));

/* =========================================================================
 * Nút, ô nhập
 * ========================================================================= */

const BTN = {
  primary:
    "bg-brand-700 text-white shadow-[0_1px_2px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-brand-800",
  accent:
    "bg-sun-500 text-white shadow-[0_1px_2px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-sun-600",
  secondary:
    "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-white text-sun-600 ring-1 ring-sun-100 hover:bg-sun-50 hover:ring-sun-400/40",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon: Icon,
  className,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-all duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55",
        "focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none",
        size === "sm"
          ? "h-9 px-3.5 text-xs"
          : size === "lg"
            ? "h-12 px-6 text-[15px]"
            : size === "icon"
              ? "size-9"
              : "h-11 px-5 text-sm",
        BTN[variant],
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : Icon ? (
        <Icon className="size-4" />
      ) : null}
      {children}
    </button>
  );
}

// Đệm trái/phải viết TÁCH (pl/pr, không dùng px): ô có ký hiệu / icon ($, %, kính lúp…) truyền pl-… / pr-… để chừa chỗ.
// Nếu dùng px thì px (padding-inline) và pl (padding-left) là 2 thuộc tính khác nhau → tuỳ thứ tự CSS mà chữ đè lên ký hiệu.
export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white pr-3.5 pl-3.5 py-2.5 text-sm text-ink shadow-[0_1px_1px_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-sun-400 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-sun-50";

export function Field({ label, hint, error, required, children, className, htmlFor, aside }) {
  // Nhãn gắn với ô nhập (bấm nhãn → con trỏ vào ô; trình đọc màn hình đọc đúng tên ô) khi ô là Input/Select…
  const autoId = useId();
  const linkable =
    !htmlFor &&
    label &&
    isValidElement(children) &&
    (LINKABLE_TAGS.includes(children.type) || LINKABLE.has(children.type));
  const ownId = linkable ? (children.props.id ?? autoId) : undefined;
  const control =
    linkable && !children.props.id ? cloneElement(children, { id: autoId }) : children;
  return (
    <div className={className}>
      {(label || aside) && (
        <div className="mb-1.5 flex items-end justify-between gap-3">
          {label && (
            <label
              htmlFor={htmlFor ?? ownId}
              className="flex items-center gap-1 text-[13px] font-semibold text-slate-700"
            >
              {label}
              {required && <span className="text-sun-500">*</span>}
            </label>
          )}
          {aside && <span className="text-xs text-slate-400">{aside}</span>}
        </div>
      )}
      {control}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-sun-600">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input {...props} className={cn(inputClass, className)} />;
}

/** Ô ngày của CMS: hiện dd/mm/yyyy (CMS luôn tiếng Việt, không theo máy), giá trị ISO — xem components/ui/DatePicker.js */
export function DateInput({ className, ...props }) {
  return <DatePicker lang="vi" {...props} className={cn(inputClass, className)} />;
}

export function Textarea({ className, rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={cn(inputClass, "resize-y leading-relaxed", className)}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      {...props}
      className={cn(
        inputClass,
        "cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2216%22%20height=%2216%22%20fill=%22none%22%20stroke=%22%2364748b%22%20stroke-width=%222%22%20viewBox=%220%200%2024%2024%22%3E%3Cpath%20d=%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10",
        className,
      )}
    >
      {children}
    </select>
  );
}

/** Công tắc bật / tắt */
export function Toggle({ checked, onChange, label, hint, disabled }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 select-none",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={!!checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
      {(label || hint) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-semibold text-slate-800">{label}</span>}
          {hint && (
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{hint}</span>
          )}
        </span>
      )}
    </label>
  );
}

/** Ô nhập theo ngôn ngữ đang chọn: value = { en, zh, vi } */
export function LocInput({ value, onChange, lang, multiline, rows, placeholder, ...props }) {
  const v = value?.[lang] ?? "";
  const set = (x) => onChange({ en: "", zh: "", vi: "", ...value, [lang]: x });
  const other = v.trim() ? "" : anyLang({ ...value, [lang]: "" });
  const ph = other ? `(trống — sẽ tự dịch khi lưu) ${other.slice(0, 60)}` : placeholder;
  return multiline ? (
    <Textarea
      value={v}
      rows={rows}
      placeholder={ph}
      onChange={(e) => set(e.target.value)}
      {...props}
    />
  ) : (
    <Input value={v} placeholder={ph} onChange={(e) => set(e.target.value)} {...props} />
  );
}

/** Ô nhập mà <Field> tự gắn nhãn (truyền id xuống thẻ input / textarea / select) */
const LINKABLE_TAGS = ["input", "textarea", "select"];
const LINKABLE = new Set([Input, Textarea, Select, LocInput, DateInput]);

/* =========================================================================
 * Khung trang
 * ========================================================================= */

export function PageHeader({ title, description, actions, back, eyebrow }) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {back}
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold tracking-[0.2em] text-sun-500 uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  icon: Icon,
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="size-[18px]" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>}
              {description && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
              )}
            </div>
          </div>
          {actions}
        </header>
      )}
      <div
        className={cn(
          !(bodyClassName ?? "").split(" ").includes("p-0") && "p-5 sm:p-6",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

const BADGE = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-200",
  red: "bg-sun-50 text-sun-700 ring-sun-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({ tone = "gray", children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset",
        BADGE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cn("size-5 animate-spin text-brand-600", className)} />;
}

/** Khung chờ: thanh xương mờ (mượt hơn vòng quay đơn thuần) */
export function LoadingBlock({ text = "Đang tải…", rows = 4 }) {
  return (
    <div role="status" aria-label={text} className="space-y-3 p-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4">
          <span className="size-11 shrink-0 rounded-xl bg-slate-100" />
          <span className="flex-1 space-y-2">
            <span
              className="block h-3 rounded-full bg-slate-100"
              style={{ width: `${70 - i * 9}%` }}
            />
            <span className="block h-2.5 w-1/3 rounded-full bg-slate-100/80" />
          </span>
        </div>
      ))}
      <p className="pt-1 text-center text-xs text-slate-400">{text}</p>
    </div>
  );
}

/**
 * Vùng danh sách đang tải trang / bộ lọc mới: giữ dữ liệu cũ (làm mờ) + nhãn "Đang tải…" nhỏ ở trên,
 * thay vì nháy khung trống. Mờ sau 150ms nên tải nhanh thì không thấy nháy.
 */
export function BusyArea({ busy, children, className }) {
  return (
    <div aria-busy={busy || undefined} className={cn("relative", className)}>
      <div
        className={cn(
          "transition-opacity duration-200",
          busy && "pointer-events-none opacity-50 delay-150",
        )}
      >
        {children}
      </div>
      {busy && (
        <span className="pointer-events-none absolute top-12 left-1/2 z-10 inline-flex -translate-x-1/2 animate-[admin-fade_.2s_ease-out_.15s_both] items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-md ring-1 ring-slate-200">
          <Loader2 className="size-3.5 animate-spin text-brand-600" />
          Đang tải…
        </span>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Info, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="relative grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-100">
        <Icon className="size-6" />
      </span>
      <p className="mt-4 font-semibold text-slate-800">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children, className, title }) {
  const tones = {
    info: "bg-brand-50/70 text-brand-900 ring-brand-100 [&_svg]:text-brand-600",
    warn: "bg-amber-50 text-amber-900 ring-amber-200 [&_svg]:text-amber-600",
    error: "bg-sun-50 text-sun-700 ring-sun-100 [&_svg]:text-sun-600",
    success: "bg-emerald-50 text-emerald-900 ring-emerald-200 [&_svg]:text-emerald-600",
  };
  const Icon =
    tone === "warn" || tone === "error" ? AlertTriangle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div className={cn("flex gap-3 rounded-xl px-4 py-3 text-sm ring-1", tones[tone], className)}>
      <Icon className="mt-0.5 size-[18px] shrink-0" />
      <div className="min-w-0 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/**
 * Ô tìm kiếm: icon kính lúp · ô nhập · nút xoá nằm CẠNH NHAU trong một hàng (flex) — không đặt icon đè lên ô
 * nhập nên chữ không bao giờ chạy dưới icon, dù cỡ chữ / phông / thiết bị thế nào.
 */
export function SearchBox({ value, onChange, placeholder = "Tìm kiếm…", className }) {
  return (
    <label
      className={cn(
        "flex h-[42px] w-full cursor-text items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100 hover:border-slate-300",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, "")}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Xoá tìm kiếm"
          className="-mr-1 grid size-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}

/** Dãy số trang rút gọn: 1 … 4 5 [6] 7 8 … 20 */
function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  const from = Math.max(2, Math.min(page - 1, total - 4));
  const to = Math.min(total - 1, Math.max(page + 1, 5));
  if (from > 2) out.push("…a");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < total - 1) out.push("…b");
  out.push(total);
  return out;
}

/**
 * Phân trang: "Hiển thị 21–40 trong 176" + số trang. Dùng cho cả danh sách phân trang ở máy chủ
 * (meta từ API) lẫn ở trình duyệt (usePaged). bare = không kẻ viền / nền (đặt ngoài Card).
 */
/** Ô nhập "Đến trang __ / N": gõ số rồi Enter (hoặc rời ô) để nhảy tới trang đó */
function PageJump({ page, totalPages, onGo }) {
  const [text, setText] = useState("");
  const submit = () => {
    const n = Number.parseInt(text, 10);
    setText("");
    if (Number.isFinite(n)) onGo(Math.min(totalPages, Math.max(1, n)));
  };
  return (
    <label className="flex items-center gap-2 text-[13px] whitespace-nowrap text-slate-500">
      Đến trang
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={text}
        placeholder={String(page)}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 5))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        onBlur={() => text && submit()}
        aria-label={`Nhập số trang (1–${totalPages})`}
        className="h-9 w-14 [appearance:textfield] rounded-xl bg-white text-center text-[13px] font-semibold text-slate-800 ring-1 ring-slate-200 transition outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-brand-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span>/ {totalPages}</span>
    </label>
  );
}

export function Pagination({ meta, onPage, bare, unit = "mục", className }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total } = meta;
  const limit = meta.limit ?? Math.ceil(total / totalPages);
  const first = (page - 1) * limit + 1;
  const last = Math.min(total, page * limit);
  const go = (p) => p !== page && p >= 1 && p <= totalPages && onPage(p);
  const arrow =
    "grid size-9 place-items-center rounded-xl text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 bg-white";
  return (
    <nav
      aria-label="Phân trang"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-[13px] text-slate-500",
        bare ? "pt-5" : "border-t border-slate-100 bg-slate-50/50 px-5 py-3",
        className,
      )}
    >
      <span>
        Hiển thị{" "}
        <b className="font-semibold text-slate-700">
          {first}–{last}
        </b>{" "}
        trong <b className="font-semibold text-slate-700">{total}</b> {unit}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={arrow}
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="hidden items-center gap-1 sm:flex">
          {pageList(page, totalPages).map((p) =>
            typeof p === "string" ? (
              <span key={p} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "grid h-9 min-w-9 place-items-center rounded-xl px-2 text-[13px] font-semibold transition",
                  p === page
                    ? "bg-brand-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {p}
              </button>
            ),
          )}
        </span>
        <span className="px-1.5 font-medium text-slate-600 sm:hidden">
          {page}/{totalPages}
        </span>
        <button
          type="button"
          className={arrow}
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight className="size-4" />
        </button>
        {totalPages >= 5 && (
          <>
            <span className="mx-1.5 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <span className="ml-1.5 sm:ml-0">
              <PageJump page={page} totalPages={totalPages} onGo={go} />
            </span>
          </>
        )}
      </div>
    </nav>
  );
}

/**
 * Phân trang ngay trên trình duyệt cho danh sách đã tải đủ (điểm đến, chủ đề, xe, visa, tài khoản…).
 *   const paged = usePaged(items, 12);
 *   paged.items.map(...)   →   <Pagination meta={paged.meta} onPage={paged.setPage} />
 * paged.offset = vị trí của phần tử đầu trang trong danh sách gốc (để đổi thứ tự cho đúng).
 * Danh sách ngắn lại (lọc / xoá) → tự lùi về trang cuối còn dữ liệu.
 */
export function usePaged(items, pageSize = 12) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const offset = (current - 1) * pageSize;
  const slice = useMemo(() => items.slice(offset, offset + pageSize), [items, offset, pageSize]);
  return {
    items: slice,
    offset,
    page: current,
    setPage,
    meta: { page: current, limit: pageSize, total, totalPages },
  };
}

/* =========================================================================
 * Popup (Modal)
 * - Mọi màn hình: hộp nằm giữa (ngang + dọc), phóng nhẹ khi mở. Điện thoại: cách mép 12px, không bao giờ
 *   cao quá màn hình (kể cả khi bàn phím bật — xem useVisualViewport); tiêu đề + hàng nút luôn hiện,
 *   chỉ phần thân cuộn. Hàng nút: 2 nút ngắn nằm cạnh nhau, dài quá thì xuống dòng, nút chính ở phải/dưới.
 * - Esc / bấm nền để đóng, khoá cuộn trang, tự đưa con trỏ vào ô nhập đầu tiên,
 *   giữ phím Tab trong popup, trả con trỏ về chỗ cũ khi đóng.
 * ========================================================================= */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const MODAL_STACK = [];

export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  children,
  footer,
  size = "md",
  tone = "brand",
}) {
  const panelRef = useRef(null);
  const overlayRef = useRef(null);
  const titleId = useId();
  useVisualViewport(overlayRef, open);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // đưa con trỏ vào ô nhập đầu tiên (không phải nút đóng)
    const t = setTimeout(() => {
      const panel = panelRef.current;
      const first =
        panel?.querySelector("input:not([type=hidden]):not([disabled]),textarea,select") ??
        panel?.querySelector(FOCUSABLE);
      first?.focus({ preventScroll: true });
    }, 60);
    // Popup lồng nhau (vd. cắt ảnh trong popup sửa): chỉ popup trên cùng nhận Esc / Tab
    const token = {};
    MODAL_STACK.push(token);
    const onKey = (e) => {
      if (MODAL_STACK[MODAL_STACK.length - 1] !== token) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const [firstEl, lastEl] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      MODAL_STACK.splice(MODAL_STACK.indexOf(token), 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  const ICON_TONE = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100",
    danger: "bg-sun-50 text-sun-600 ring-sun-100",
    success: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  };
  // Gắn thẳng vào <body>: popup luôn nằm trên cùng, không bị thanh dính / khung có hiệu ứng của trang đè lên
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[80] flex items-center justify-center px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:p-6"
    >
      <div
        className="absolute inset-0 animate-[admin-fade_.18s_ease-out] bg-slate-950/50 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-full w-full flex-col overflow-hidden bg-white shadow-[0_24px_80px_-20px_rgba(10,37,60,0.45)]",
          "animate-[admin-pop_.22s_cubic-bezier(.2,.8,.2,1)] rounded-[22px] ring-1 ring-slate-900/5 sm:rounded-[24px]",
          size === "sm"
            ? "sm:max-w-md"
            : size === "lg"
              ? "sm:max-w-3xl"
              : size === "xl"
                ? "sm:max-w-5xl"
                : "sm:max-w-xl",
        )}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 py-3 pr-2.5 pl-4 sm:gap-3.5 sm:px-6 sm:py-4">
          {Icon && (
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl ring-1 sm:size-10",
                ICON_TONE[tone] ?? ICON_TONE.brand,
              )}
            >
              <Icon className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3
              id={titleId}
              className="text-base leading-snug font-bold text-slate-900 sm:text-[17px]"
            >
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid size-10 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:bg-slate-100 focus-visible:text-slate-700 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none sm:-mr-2"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:justify-end sm:px-6 sm:py-3.5 max-sm:[&>a]:min-w-[8.5rem] max-sm:[&>a]:flex-1 max-sm:[&>button]:min-w-[8.5rem] max-sm:[&>button]:flex-1">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* =========================================================================
 * Thông báo + hộp xác nhận (dùng toàn khu quản trị)
 * ========================================================================= */

const UiContext = createContext(null);

/**
 * Thông báo nổi (toast) — 1 kiểu duy nhất cho cả khu quản trị.
 *   const { toast } = useUi();
 *   toast("Đã lưu tour")                                  // thành công (mặc định)
 *   toast("Không lưu được", "error")                      // tone: success | error | warning | info
 *   toast.error("Chưa tải được danh sách", { title: "Có lỗi", action: { label: "Thử lại", onClick } })
 *   const t = toast.loading("Đang tải lại…");  …  t.success("Đã cập nhật danh sách")  /  t.error("…")
 * - Tự ẩn: thành công 3,5s · thông tin 4,5s · cảnh báo 5,5s · lỗi 7s (có nút bấm → ít nhất 7s);
 *   rê chuột / bấm Tab vào thông báo thì dừng đếm.
 * - Tối đa 4 thông báo, mới nhất ở trên; thông báo trùng hệt bắn liên tiếp → gộp lại (×2) và đếm lại từ đầu.
 */
const TOAST_TONE = {
  success: {
    Icon: CheckCircle2,
    ms: 3500,
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    bar: "bg-emerald-500",
    action: "text-emerald-700 hover:bg-emerald-50",
  },
  error: {
    Icon: XCircle,
    ms: 7000,
    icon: "bg-sun-50 text-sun-600 ring-sun-100",
    bar: "bg-sun-500",
    action: "text-sun-700 hover:bg-sun-50",
  },
  warning: {
    Icon: AlertTriangle,
    ms: 5500,
    icon: "bg-amber-50 text-amber-600 ring-amber-100",
    bar: "bg-amber-500",
    action: "text-amber-700 hover:bg-amber-50",
  },
  info: {
    Icon: Info,
    ms: 4500,
    icon: "bg-brand-50 text-brand-600 ring-brand-100",
    bar: "bg-brand-500",
    action: "text-brand-700 hover:bg-brand-50",
  },
  loading: {
    Icon: Loader2,
    ms: 0,
    icon: "bg-brand-50 text-brand-600 ring-brand-100 [&_svg]:animate-spin",
    bar: "",
    action: "text-brand-700 hover:bg-brand-50",
  },
};
const TOAST_MAX = 4;
const toneOf = (t) => (t === "warn" ? "warning" : TOAST_TONE[t] ? t : "success");

function ToastItem({ t, onDismiss }) {
  const s = TOAST_TONE[t.tone];
  const [paused, setPaused] = useState(false);
  const left = useRef(t.duration);
  const seen = useRef(t.v);

  // Đếm ngược (dừng khi rê chuột / đang thao tác trong thông báo); t.v đổi = gộp / cập nhật → đếm lại
  useEffect(() => {
    if (seen.current !== t.v) {
      seen.current = t.v;
      left.current = t.duration;
    }
    if (!t.duration || paused || t.leaving) return;
    const start = Date.now();
    const timer = setTimeout(() => onDismiss(t.id), left.current);
    return () => {
      clearTimeout(timer);
      left.current = Math.max(400, left.current - (Date.now() - start));
    };
  }, [t.v, t.duration, t.id, t.leaving, paused, onDismiss]);

  const isError = t.tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPaused(false)}
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl bg-white/95 py-3 pr-2 pl-3 text-slate-700 shadow-[0_16px_48px_-14px_rgba(10,37,60,0.35),0_2px_6px_-2px_rgba(10,37,60,0.08)] ring-1 ring-slate-900/[0.07] backdrop-blur",
        t.leaving
          ? "animate-[admin-toast-out_.18s_ease-in_forwards]"
          : "animate-[admin-toast_.28s_cubic-bezier(.2,.8,.2,1)]",
      )}
    >
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full ring-1", s.icon)}>
        <s.Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1 pt-[5px]">
        {t.title && <p className="text-sm leading-snug font-semibold text-slate-900">{t.title}</p>}
        {t.message && (
          <p
            className={cn(
              "leading-snug break-words",
              t.title ? "mt-0.5 text-[13px] text-slate-600" : "text-sm font-medium text-slate-800",
            )}
          >
            {t.message}
            {t.count > 1 && (
              <span className="ml-1.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-slate-100 px-1 align-[1px] text-[10px] font-bold text-slate-500">
                ×{t.count}
              </span>
            )}
          </p>
        )}
        {t.action && (
          <button
            type="button"
            onClick={() => {
              onDismiss(t.id);
              t.action.onClick?.();
            }}
            className={cn(
              "mt-1.5 -ml-2 inline-flex h-8 items-center rounded-lg px-2 text-[13px] font-bold transition",
              s.action,
            )}
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        aria-label="Đóng thông báo"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="size-4" />
      </button>
      {t.duration > 0 && (
        <span
          key={t.v}
          aria-hidden
          className={cn(
            "absolute bottom-0 left-0 h-[3px] w-full origin-left animate-[admin-shrink_linear_forwards] opacity-70",
            s.bar,
          )}
          style={{
            animationDuration: `${t.duration}ms`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      )}
    </div>
  );
}

/** Kho thông báo: giữ danh sách trong ref (đọc / ghi đồng bộ, không phụ thuộc lúc React vẽ lại) */
function useToastStore() {
  const [toasts, setToasts] = useState([]);
  const store = useRef([]);
  const seq = useRef(0);

  const toast = useMemo(() => {
    const commit = (next) => {
      store.current = next;
      setToasts(next);
    };
    const remove = (id) => commit(store.current.filter((x) => x.id !== id));
    const dismiss = (id) => {
      if (!store.current.some((x) => x.id === id && !x.leaving)) return;
      commit(store.current.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => remove(id), 180);
    };
    const build = (base, message, opts) => {
      const tone = toneOf(opts.tone ?? base.tone);
      const action = opts.action === undefined ? base.action : opts.action;
      const duration =
        opts.duration ??
        (tone === "loading" ? 0 : Math.max(TOAST_TONE[tone].ms, action ? 7000 : 0));
      const title = opts.title === undefined ? base.title : opts.title;
      return {
        ...base,
        tone,
        title,
        message: message ?? base.message ?? "",
        action,
        duration,
        key: `${tone}|${title ?? ""}|${message ?? base.message ?? ""}`,
      };
    };
    const handle = (id) => ({
      id,
      update: (message, opts = {}) => update(id, message, opts),
      success: (message, opts = {}) => update(id, message, { ...opts, tone: "success" }),
      error: (message, opts = {}) => update(id, message, { ...opts, tone: "error" }),
      warning: (message, opts = {}) => update(id, message, { ...opts, tone: "warning" }),
      info: (message, opts = {}) => update(id, message, { ...opts, tone: "info" }),
      dismiss: () => dismiss(id),
    });
    const update = (id, message, opts) => {
      const cur = store.current.find((x) => x.id === id);
      if (!cur || cur.leaving) return show(message, opts); // đã bị đóng → hiện thông báo mới
      const next = build({ ...cur, title: undefined, action: undefined }, message, {
        title: null,
        action: null,
        ...opts,
      });
      commit(store.current.map((x) => (x.id === id ? { ...next, v: cur.v + 1, count: 1 } : x)));
      return handle(id);
    };
    const show = (message, toneOrOpts) => {
      const opts = typeof toneOrOpts === "string" ? { tone: toneOrOpts } : (toneOrOpts ?? {});
      const next = build({ tone: "success" }, message, opts);
      const live = store.current.filter((x) => !x.leaving);
      const dup = next.tone !== "loading" && live.find((x) => x.key === next.key);
      if (dup) {
        // trùng hệt → đưa lên đầu, ×2, đếm lại
        const bumped = { ...dup, ...next, id: dup.id, v: dup.v + 1, count: dup.count + 1 };
        commit([bumped, ...store.current.filter((x) => x.id !== dup.id)]);
        return handle(dup.id);
      }
      const id = `t${++seq.current}`;
      const kept = live.slice(0, TOAST_MAX - 1);
      commit([
        { ...next, id, v: 0, count: 1 },
        ...store.current.filter((x) => x.leaving || kept.includes(x)),
      ]);
      return handle(id);
    };
    const fn = (message, toneOrOpts) => show(message, toneOrOpts);
    for (const tone of ["success", "error", "warning", "info", "loading"])
      fn[tone] = (message, opts = {}) => show(message, { ...opts, tone });
    fn.dismiss = dismiss;
    return fn;
  }, []);

  return { toasts, toast };
}

export function AdminProviders({ children }) {
  const { toasts, toast } = useToastStore();
  // Chỉ khi chạy thử trên máy (không có ở bản chạy thật): gọi window.__vlToast(...) để kiểm tra giao diện
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    window.__vlToast = toast;
    return () => delete window.__vlToast;
  }, [toast]);
  const [confirmState, setConfirmState] = useState(null);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })),
    [],
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  const close = (v) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };
  const danger = !!confirmState?.danger;

  return (
    <UiContext.Provider value={value}>
      {children}

      {/* Thông báo: luôn ở GÓC TRÊN BÊN PHẢI.
          Điện thoại / máy tính bảng (có thanh tiêu đề trên cùng): ngay dưới thanh đó, cách mép phải 12–20px.
          Máy tính: sát góc trên phải màn hình (cách 20px) — cùng một chỗ ở mọi trang, dù đang cuộn tới đâu.
          Chỉ dùng right + width (không mx-auto) để không bao giờ bị đẩy ra giữa. */}
      <section
        aria-label="Thông báo"
        className="pointer-events-none fixed top-[4.5rem] right-3 left-auto z-[95] flex w-[calc(100vw-24px)] flex-col items-stretch gap-2 sm:right-5 sm:w-[360px] lg:top-5 max-sm:[&>*:nth-child(n+4)]:hidden"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDismiss={toast.dismiss} />
        ))}
      </section>

      {/* Hộp xác nhận: biểu tượng lớn ở giữa, nút rõ ràng; Esc = huỷ */}
      {confirmState && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:p-6">
          <div
            className="absolute inset-0 animate-[admin-fade_.18s_ease-out] bg-slate-950/50 backdrop-blur-[3px]"
            onClick={() => close(false)}
          />
          <ConfirmPanel state={confirmState} danger={danger} onClose={close} />
        </div>
      )}
    </UiContext.Provider>
  );
}

function ConfirmPanel({ state, danger, onClose }) {
  const okRef = useRef(null);
  const cancelRef = useRef(null);
  const labelId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const prevFocus = document.activeElement;
    // Hỏi xoá/thao tác nguy hiểm: con trỏ đặt ở "Huỷ" để lỡ bấm Enter không xoá nhầm
    (danger ? cancelRef : okRef).current?.focus();
    // Bắt phím ở pha capture: Esc chỉ đóng hộp xác nhận (không đóng luôn popup bên dưới),
    // Tab chỉ chạy vòng giữa 2 nút
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current(false);
      } else if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        const next = document.activeElement === okRef.current ? cancelRef : okRef;
        next.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [danger]);
  const Icon = state.icon ?? (danger ? AlertTriangle : HelpCircle);
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`${labelId}-t`}
      aria-describedby={state.message ? `${labelId}-m` : undefined}
      className="relative max-h-full w-full max-w-[420px] animate-[admin-pop_.22s_cubic-bezier(.2,.8,.2,1)] scrollbar-thin overflow-y-auto overscroll-contain rounded-[22px] bg-white px-5 pt-6 pb-5 text-center shadow-[0_24px_80px_-20px_rgba(10,37,60,0.45)] sm:rounded-[24px] sm:px-6 sm:pt-7 sm:pb-6"
    >
      <span
        className={cn(
          "mx-auto grid size-14 place-items-center rounded-full ring-8",
          danger
            ? "bg-sun-50 text-sun-600 ring-sun-50/50"
            : "bg-brand-50 text-brand-700 ring-brand-50/50",
        )}
      >
        <Icon className="size-7" />
      </span>
      <h3 id={`${labelId}-t`} className="mt-5 text-lg font-bold text-slate-900">
        {state.title ?? "Xác nhận"}
      </h3>
      {state.message && (
        <p
          id={`${labelId}-m`}
          className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500"
        >
          {state.message}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2 [&>button]:min-w-[8rem] [&>button]:flex-1">
        <Button
          ref={cancelRef}
          variant="secondary"
          className="flex-1"
          onClick={() => onClose(false)}
        >
          {state.cancelText ?? "Huỷ"}
        </Button>
        <Button
          ref={okRef}
          variant={danger ? "accent" : "primary"}
          className="flex-1"
          onClick={() => onClose(true)}
        >
          {state.confirmText ?? "Đồng ý"}
        </Button>
      </div>
    </div>
  );
}

// Ngoài AdminProviders (vd. trang đăng nhập): thông báo bị bỏ qua nhưng gọi hàm không lỗi
const noopHandle = {};
const noopToast = Object.assign(() => noopHandle, {
  success: () => noopHandle,
  error: () => noopHandle,
  warning: () => noopHandle,
  info: () => noopHandle,
  loading: () => noopHandle,
  dismiss: () => {},
});
for (const k of ["update", "success", "error", "warning", "info"]) noopHandle[k] = () => noopHandle;
noopHandle.dismiss = () => {};
const NOOP_UI = { toast: noopToast, confirm: async () => true };

export function useUi() {
  return useContext(UiContext) ?? NOOP_UI;
}

/* =========================================================================
 * Ảnh (Cloudinary)
 * ========================================================================= */

// Ảnh chỉ được tải lên kho ảnh khi bấm Lưu: xem ./pendingImages.js (usePendingImages().prepare)
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const isHttpUrl = (v) => /^https?:\/\/\S+$/i.test(v.trim());
// Lọc định dạng / dung lượng, cắt ảnh lệch khung, thu nhỏ ảnh quá lớn: xem ./ImageCropper.js (useImageCrop)

function Thumb({ src, alt = "", className, sizes = "(min-width: 1024px) 320px, 50vw" }) {
  if (!src) return null;
  return (
    <span className={cn("relative block overflow-hidden bg-slate-100", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} draggable={false} className="object-cover" />
      {/* ảnh vừa chọn, chỉ được lưu khi bấm Lưu */}
      {isPendingImage(src) && (
        <span className="absolute top-1.5 right-1.5 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow-sm">
          Chưa lưu
        </span>
      )}
    </span>
  );
}

/** Hộp "Dán link ảnh" (1 hoặc nhiều link, mỗi dòng 1 link) */
export function ImageUrlDialog({ open, onClose, onSubmit, multiple = false, busy }) {
  const [text, setText] = useState("");
  const links = text
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const bad = links.filter((l) => !isHttpUrl(l));
  const submit = async () => {
    if (!links.length || bad.length) return;
    const done = await onSubmit(multiple ? links : links.slice(0, 1));
    if (done) setText("");
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      icon={Link2}
      title={multiple ? "Thêm ảnh từ link" : "Dán link ảnh"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} loading={busy} disabled={!links.length || bad.length > 0}>
            {multiple && links.length > 1 ? `Thêm ${links.length} ảnh` : "Thêm ảnh"}
          </Button>
        </>
      }
    >
      <Field
        label={multiple ? "Link ảnh (mỗi dòng 1 link)" : "Link ảnh"}
        error={bad.length ? "Link phải bắt đầu bằng http:// hoặc https://" : ""}
        hint="Mở ảnh trên trình duyệt, bấm chuột phải → “Sao chép địa chỉ hình ảnh” rồi dán vào đây."
      >
        {multiple ? (
          <Textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://…/anh-1.jpg"
          />
        ) : (
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
            placeholder="https://…/anh.jpg"
            inputMode="url"
          />
        )}
      </Field>
    </Modal>
  );
}

/** Nút nhỏ nằm đè trên ảnh (đổi / dán link / bỏ). Khung hẹp thì chỉ còn biểu tượng. */
function OverlayBtn({ icon: Icon, label, onClick, danger, crowded, iconOnly }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/95 px-2.5 text-xs font-semibold shadow-sm ring-1 ring-black/5 transition hover:bg-white",
        danger ? "text-sun-600" : "text-slate-700",
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {!iconOnly && (
        <span className={cn("hidden", crowded ? "@[21rem]:inline" : "@[17rem]:inline")}>
          {label}
        </span>
      )}
    </button>
  );
}

/**
 * 1 ảnh: tải từ thiết bị / dán link / kéo thả; đổi, cắt lại, xoá. value = URL (Cloudinary hoặc /images/... có sẵn)
 * Ảnh lệch khung `aspect` → tự mở hộp cắt. `crop` = khung + bề ngang ảnh ra, vd. { ratio: 16/9, width: 1920 }
 * (mặc định: tỉ lệ lấy từ `aspect`, ảnh ngang rộng 1600px).
 */
export function ImageField({
  value,
  onChange,
  folder,
  aspect = "aspect-[16/10]",
  crop,
  label = "Kéo thả ảnh vào đây",
  // Ô có ảnh mặc định của website (vd. ảnh trang chủ): fallback = URL ảnh mặc định.
  // Đang dùng ảnh mặc định → không có nút xoá, hiện nhãn "Ảnh mặc định"; đã thay ảnh → nút "Về ảnh mặc định".
  fallback,
}) {
  const { toast } = useUi();
  const isDefault = !!fallback && value === fallback;
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const cropper = useImageCrop(cropSpec({ aspect, crop }), folder);
  const croppable = canRecrop(value);

  const fromFiles = async (files) => {
    const list = [...(files ?? [])].slice(0, 1);
    if (input.current) input.current.value = "";
    if (!list.length) return;
    setBusy(true);
    try {
      const [url] = await cropper.uploadFiles(list, { max: 1 });
      if (url) {
        onChange(url);
        toast("Đã chọn ảnh — bấm Lưu để lưu lại");
      }
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const fromLinks = async ([link]) => {
    setBusy(true);
    try {
      const { urls } = await cropper.importLinks([link], { beforeCrop: () => setLinkOpen(false) });
      setLinkOpen(false);
      if (urls[0]) {
        onChange(urls[0]);
        toast("Đã thêm ảnh từ link — bấm Lưu để lưu lại");
      }
      return true;
    } catch (err) {
      toast(errorMessage(err), "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const recrop = async () => {
    setBusy(true);
    try {
      const url = await cropper.recrop(value);
      if (url) {
        onChange(url);
        toast("Đã cắt lại ảnh");
      }
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="@container w-full max-w-sm">
      <div
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          fromFiles(e.dataTransfer.files);
        }}
        className={cn(
          "group relative overflow-hidden rounded-2xl transition",
          aspect,
          value
            ? "ring-1 ring-slate-200"
            : "border-2 border-dashed border-slate-300 bg-slate-50/80",
          drag && "border-brand-400 bg-brand-50 ring-4 ring-brand-100",
        )}
      >
        {value ? (
          <>
            <Thumb
              src={value}
              sizes="(min-width: 1024px) 640px, 100vw"
              className="absolute inset-0"
            />
            {/* Các nút nằm gọn ở chân ảnh — ảnh dọc hay ngang đều không có nút lơ lửng bên dưới */}
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1.5 bg-gradient-to-t from-slate-950/75 via-slate-950/35 to-transparent px-2 pt-9 pb-2.5">
              {/* Ảnh có sẵn của website: ghi rõ ngay trên hàng nút (không đè lên số / nhãn ở góc ảnh) */}
              {isDefault && (
                <span
                  title="Ảnh có sẵn của website — không xoá được, chỉ thay bằng ảnh khác"
                  className="basis-full text-center text-[10.5px] font-semibold text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]"
                >
                  Ảnh mặc định · bấm Đổi ảnh để thay
                </span>
              )}
              <OverlayBtn
                icon={Upload}
                label="Đổi ảnh"
                crowded={croppable}
                onClick={() => input.current?.click()}
              />
              <OverlayBtn
                icon={Link2}
                label="Dán link"
                crowded={croppable}
                onClick={() => setLinkOpen(true)}
              />
              {croppable && <OverlayBtn icon={Crop} label="Cắt ảnh" crowded onClick={recrop} />}
              {fallback ? (
                !isDefault && (
                  <OverlayBtn
                    icon={RotateCcw}
                    label="Về ảnh mặc định"
                    iconOnly={croppable}
                    onClick={() => {
                      onChange(fallback);
                      toast("Đã trả về ảnh mặc định — bấm Lưu để lưu lại");
                    }}
                  />
                )
              ) : (
                <OverlayBtn
                  icon={Trash2}
                  label="Bỏ ảnh"
                  danger
                  iconOnly={croppable}
                  onClick={() => onChange("")}
                />
              )}
            </div>
          </>
        ) : (
          // Ô trống: tự gọn theo bề ngang ô (ô nhỏ chỉ còn 2 nút trên 1 hàng, ô rộng thêm biểu tượng + dòng gợi ý)
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center @[22rem]:gap-3">
            <span className="hidden size-10 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200 @[22rem]:grid">
              <ImagePlus className="size-5" />
            </span>
            <span className="hidden text-xs text-slate-500 @[16rem]:block">{label}</span>
            <span className="flex flex-nowrap justify-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={Upload}
                className="px-3"
                onClick={() => input.current?.click()}
              >
                Tải lên
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={Link2}
                className="px-3"
                onClick={() => setLinkOpen(true)}
              >
                Dán link
              </Button>
            </span>
          </div>
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-white/75 backdrop-blur-[1px]">
            <Spinner />
          </span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={(e) => fromFiles(e.target.files)}
      />
      <ImageUrlDialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={fromLinks}
        busy={busy}
      />
      {cropper.dialog}
    </div>
  );
}

/**
 * Nhiều ảnh (album): tải nhiều ảnh từ máy / dán nhiều link, kéo thả, đổi thứ tự, đặt ảnh bìa, cắt lại, xoá.
 * Mặc định album không có khung cố định → chỉ mời cắt ảnh quá dọc / quá dài (CROP_PRESETS.gallery);
 * truyền `crop={{ ratio: 16/10, width: 1600 }}` khi website hiện album trong khung cố định.
 */
export function GalleryField({ value = [], onChange, folder, max = 40, onSetCover, crop }) {
  const { toast } = useUi();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [cropping, setCropping] = useState(-1);
  const room = max - value.length;
  const cropper = useImageCrop(crop ? cropSpec({ crop }) : CROP_PRESETS.gallery, folder);

  const fromFiles = async (files) => {
    const list = [...(files ?? [])];
    if (input.current) input.current.value = "";
    if (room <= 0) return toast(`Tối đa ${max} ảnh`, "error");
    if (!list.length) return;
    if (list.length > room) toast(`Album tối đa ${max} ảnh — chỉ thêm ${room} ảnh đầu`, "warning");
    setBusy(true);
    try {
      const urls = await cropper.uploadFiles(list, { max: room });
      if (urls.length) {
        onChange([...value, ...urls]);
        toast(`Đã thêm ${urls.length} ảnh — bấm Lưu để lưu lại`);
      }
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const fromLinks = async (links) => {
    if (room <= 0) {
      toast(`Tối đa ${max} ảnh`, "error");
      return false;
    }
    setBusy(true);
    let urls = [];
    let failed = 0;
    try {
      ({ urls, failed } = await cropper.importLinks(links.slice(0, room), {
        beforeCrop: () => setLinkOpen(false),
      }));
    } catch {
      failed = 1;
    }
    setBusy(false);
    if (urls.length) onChange([...value, ...urls]);
    if (failed)
      toast(`${failed} link không lấy được ảnh (link hỏng hoặc không phải ảnh công khai)`, "error");
    if (urls.length) toast(`Đã thêm ${urls.length} ảnh từ link — bấm Lưu để lưu lại`);
    if (!failed) setLinkOpen(false);
    return !failed;
  };
  const recropAt = async (i) => {
    setCropping(i);
    try {
      const url = await cropper.recrop(value[i]);
      if (url) {
        onChange(value.map((x, k) => (k === i ? url : x)));
        toast("Đã cắt lại ảnh");
      }
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setCropping(-1);
    }
  };
  return (
    <div
      onDragOver={(e) => {
        // Chỉ nhận file kéo từ máy vào (kéo ảnh trong album để đổi chỗ thì không tính)
        if (!e.dataTransfer?.types?.includes("Files")) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        fromFiles(e.dataTransfer.files);
      }}
      className={cn("rounded-2xl transition", drag && "bg-brand-50/60 ring-4 ring-brand-100")}
    >
      {value.length > 0 && (
        <Sortable
          items={value}
          onReorder={(next) => onChange(next)}
          layout="grid"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {(src, i, d) => (
            <figure
              {...d.handle}
              style={d.handle.style && { ...d.handle.style, touchAction: "manipulation" }}
              title="Giữ và kéo để đổi vị trí"
              className={cn(
                "group relative overflow-hidden rounded-xl ring-1 ring-slate-200 select-none [-webkit-touch-callout:none]",
                d.dragging && "ring-2 ring-brand-400",
              )}
            >
              <Thumb src={src} className="aspect-[4/3]" />
              <span className="absolute top-1.5 left-1.5 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <div className="absolute right-1.5 bottom-1.5 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                {onSetCover && (
                  <IconBtn
                    label="Đặt làm ảnh bìa"
                    onClick={() => onSetCover(src)}
                    icon={ImagePlus}
                  />
                )}
                {canRecrop(src) && (
                  <IconBtn label="Cắt ảnh" onClick={() => recropAt(i)} icon={Crop} />
                )}
                <IconBtn
                  label="Xoá"
                  danger
                  onClick={() => onChange(value.filter((_, k) => k !== i))}
                  icon={Trash2}
                />
              </div>
              {cropping === i && (
                <span className="absolute inset-0 grid place-items-center bg-white/75 backdrop-blur-[1px]">
                  <Spinner />
                </span>
              )}
            </figure>
          )}
        </Sortable>
      )}
      {room > 0 && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 px-4 text-center",
            value.length ? "mt-3 py-3" : "py-8",
          )}
        >
          {busy ? (
            <>
              <Spinner />
              <span className="text-xs text-slate-500">Đang thêm ảnh…</span>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-500">Kéo thả ảnh vào đây, hoặc</span>
              <Button
                size="sm"
                variant="secondary"
                icon={Upload}
                onClick={() => input.current?.click()}
              >
                Tải từ máy
              </Button>
              <Button size="sm" variant="secondary" icon={Link2} onClick={() => setLinkOpen(true)}>
                Dán link
              </Button>
            </>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">
        {value.length}/{max} ảnh · JPG, PNG, WebP, AVIF, GIF
        {value.length > 1 && " · giữ và kéo ảnh để đổi thứ tự"}
      </p>
      <input
        ref={input}
        type="file"
        multiple
        accept={IMAGE_ACCEPT}
        hidden
        onChange={(e) => fromFiles(e.target.files)}
      />
      <ImageUrlDialog
        open={linkOpen}
        multiple
        onClose={() => setLinkOpen(false)}
        onSubmit={fromLinks}
        busy={busy}
      />
      {cropper.dialog}
    </div>
  );
}

/* =========================================================================
 * Video: CHỈ dán link (YouTube công khai / không công khai, Google Drive đã chia sẻ) — không tải file lên
 * ========================================================================= */

export function VideoHelp({ banner }) {
  return (
    <Notice tone="info" title="Cách thêm video">
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px]">
        <li>
          <b>YouTube</b>: đăng video ở chế độ <b>Công khai</b> hoặc <b>Không công khai</b> → bấm
          Chia sẻ → sao chép link.
        </li>
        <li>
          <b>Google Drive</b>: bấm chuột phải vào video → Chia sẻ → Quyền truy cập chung:{" "}
          <b>Bất kỳ ai có đường liên kết</b> → Sao chép đường liên kết.
        </li>
        {banner && (
          <li>
            Video Drive sẽ được tự chép về website để phát nền (tối đa 100MB, chờ khoảng vài chục
            giây).
          </li>
        )}
      </ul>
    </Notice>
  );
}

/**
 * Lấy video Drive đã chia sẻ về website (video nền trang chủ) → { url, poster }.
 * Theo dõi trạng thái / huỷ / bỏ video không lưu: xem ./pendingVideos.js
 */
export const importDriveVideo = (url) => copyDriveVideo(url);

/** Nhãn nhận diện nguồn video */
export function VideoChip({ provider, className }) {
  const yt = provider === "youtube";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        yt
          ? "bg-red-50 text-red-700 ring-red-200"
          : "bg-emerald-50 text-emerald-700 ring-emerald-200",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", yt ? "bg-red-500" : "bg-emerald-500")} />
      {yt ? "YouTube" : "Google Drive"}
    </span>
  );
}

/**
 * 1 video: dán link YouTube hoặc Google Drive → nhận diện ngay (nhãn nguồn + ảnh xem trước + phát thử tại chỗ).
 * allowSite: cho phép giữ video có sẵn của website (/videos/*.mp4).
 */
export function VideoField({ value, onChange, allowSite = false, placeholder }) {
  const [text, setText] = useState(value ?? "");
  const [lastValue, setLastValue] = useState(value ?? "");
  if ((value ?? "") !== lastValue) {
    setLastValue(value ?? "");
    setText(value ?? "");
  }
  const t = text.trim();
  const site = allowSite && /^\/videos\/[\w./-]+\.(mp4|webm)$/i.test(t) && !t.includes("..");
  const parsed = parseVideo(t);
  const error = !t || site || parsed ? "" : videoLinkError(t);
  const commit = (v) => {
    setText(v);
    const s = v.trim();
    const p = parseVideo(s);
    if (!s) onChange("");
    else if (allowSite && /^\/videos\/[\w./-]+\.(mp4|webm)$/i.test(s) && !s.includes(".."))
      onChange(s);
    else if (p) onChange(canonicalVideo(s));
  };
  return (
    <div className="space-y-2">
      <div className="relative">
        <Film className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={text}
          onChange={(e) => commit(e.target.value)}
          placeholder={placeholder ?? "Dán link video YouTube hoặc Google Drive…"}
          inputMode="url"
          aria-label="Link video"
          aria-invalid={!!error}
          className={cn("pl-10", t && (parsed ? "pr-36" : "pr-10"))}
        />
        {parsed && !error && (
          <VideoChip
            provider={parsed.provider}
            className="pointer-events-none absolute top-1/2 right-10 -translate-y-1/2"
          />
        )}
        {t && (
          <button
            type="button"
            onClick={() => commit("")}
            aria-label="Bỏ video"
            title="Bỏ video"
            className="absolute top-1/2 right-2.5 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {error ? (
        <p className="flex items-start gap-1 text-xs font-medium text-sun-600">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> {error}
        </p>
      ) : parsed ? (
        <VideoPreview url={t} />
      ) : site ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Film className="size-3.5" /> Video có sẵn của website:{" "}
          <span className="font-mono">{t.split("/").pop()}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Khung 16:9 phát video ngay tại chỗ (link nhúng dựng từ MÃ video) */
function VideoPlayer({ url, onClose }) {
  const v = parseVideo(url);
  if (!v) return null;
  const src = embedUrl(url) + (v.provider === "youtube" ? "&autoplay=1" : "");
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
      <iframe
        src={src}
        title="Xem thử video"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 size-full border-0"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng video"
        title="Đóng video"
        className="absolute top-2 left-2 grid size-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Ảnh xem trước; không có ảnh (video riêng tư / chưa chia sẻ) → khung thay thế gọn gàng */
function VideoPoster({ url, provider, small }) {
  const thumb = videoThumb(url, { large: !small });
  const [bad, setBad] = useState(null); // link ảnh đã lỗi
  const ok = thumb && bad !== thumb;
  return (
    <>
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh bìa YouTube / Drive, không cần tối ưu
        <img
          src={thumb}
          alt=""
          loading="lazy"
          onError={() => setBad(thumb)}
          // YouTube trả ảnh xám 120×90 khi video riêng tư / bị xoá
          onLoad={(e) =>
            provider === "youtube" && e.currentTarget.naturalWidth <= 120 && setBad(thumb)
          }
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900">
          {!small && (
            <span className="absolute inset-x-3 bottom-3 text-center text-xs leading-snug text-white/75">
              Chưa có ảnh xem trước — bấm phát thử để kiểm tra video
            </span>
          )}
        </span>
      )}
    </>
  );
}

/**
 * Xem trước video: nhãn nguồn, ảnh xem trước, bấm để phát thử ngay tại chỗ.
 * compact: dạng 1 hàng (danh sách video); mặc định: khung 16:9 lớn.
 */
function VideoPreview({ url, compact }) {
  const v = parseVideo(url);
  const [playing, setPlaying] = useState(null); // link đang phát
  if (!v) return null;
  const play = playing === url;
  const open =
    v.provider === "youtube"
      ? `https://www.youtube.com/watch?v=${v.id}`
      : `https://drive.google.com/file/d/${v.id}/view`;
  const hint =
    v.provider === "drive"
      ? 'Không phát được? Kiểm tra video đã chia sẻ "Bất kỳ ai có đường liên kết".'
      : "Không phát được? Kiểm tra video ở chế độ Công khai hoặc Không công khai.";
  const meta = (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <VideoChip provider={v.provider} />
      <a
        href={open}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-700 transition-colors hover:text-sun-600"
      >
        Mở trong tab mới ↗
      </a>
    </span>
  );

  if (compact)
    return (
      <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPlaying(play ? null : url)}
            aria-label={play ? "Đóng video" : "Phát thử"}
            className="group relative grid aspect-video w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-900 sm:w-28"
          >
            <VideoPoster url={url} provider={v.provider} small />
            <PlayCircle className="relative size-7 text-white drop-shadow transition group-hover:scale-110" />
          </button>
          <span className="min-w-0 space-y-1">
            {meta}
            <span className="hidden text-[11px] leading-snug text-slate-500 sm:block">{hint}</span>
          </span>
        </div>
        {play && (
          <div className="mt-2">
            <VideoPlayer url={url} onClose={() => setPlaying(null)} />
          </div>
        )}
      </div>
    );

  return (
    <div className="space-y-2">
      {play ? (
        <VideoPlayer url={url} onClose={() => setPlaying(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(url)}
          aria-label="Phát thử video"
          className="group relative grid aspect-video w-full place-items-center overflow-hidden rounded-xl bg-slate-900"
        >
          <VideoPoster url={url} provider={v.provider} />
          <span className="relative grid size-14 place-items-center rounded-full bg-white/90 text-slate-900 shadow-lg transition group-hover:scale-110">
            <PlayCircle className="size-8" />
          </span>
        </button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {meta}
        <span className="text-[11px] text-slate-500">{hint}</span>
      </div>
    </div>
  );
}

/** Danh sách video (tour…) */
export function VideoListField({ value = [], onChange, max = 10 }) {
  const [draft, setDraft] = useState("");
  const p = parseVideo(draft.trim());
  const dup = !!p && value.includes(canonicalVideo(draft.trim()));
  const add = () => {
    const c = canonicalVideo(draft.trim());
    if (!c || value.includes(c) || value.length >= max) return;
    onChange([...value, c]);
    setDraft("");
  };
  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <Sortable items={value} onReorder={(next) => onChange(next)} className="space-y-2">
          {(url, i, d) => (
            <div
              className={cn(
                "flex items-center gap-1 rounded-xl bg-white",
                d.dragging && "ring-2 ring-brand-300",
              )}
            >
              {value.length > 1 && <DragHandle {...d.handle} />}
              <div className="min-w-0 flex-1">
                <VideoPreview url={url} compact />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Xoá"
                title="Xoá"
                className="shrink-0 text-sun-600"
                onClick={() => onChange(value.filter((_, k) => k !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </Sortable>
      )}
      {value.length < max && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Film className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
              placeholder="Dán link YouTube hoặc Google Drive…"
              inputMode="url"
              aria-label="Link video"
              aria-invalid={!!draft.trim() && !p}
              className={cn("pl-10", p && "sm:pr-32")}
            />
            {p && (
              <VideoChip
                provider={p.provider}
                className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 sm:inline-flex"
              />
            )}
          </div>
          <Button variant="soft" icon={Plus} onClick={add} disabled={!p || dup}>
            Thêm
          </Button>
        </div>
      )}
      {draft.trim() && !p ? (
        <p className="flex items-start gap-1 text-xs font-medium text-sun-600">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> {videoLinkError(draft)}
        </p>
      ) : dup ? (
        <p className="text-xs text-slate-500">Video này đã có trong danh sách.</p>
      ) : p ? (
        // điện thoại: ô nhập hẹp nên nhãn nguồn hiện bên dưới
        <p className="flex items-center gap-2 text-xs text-slate-500 sm:hidden">
          <VideoChip provider={p.provider} /> Bấm Thêm để thêm video
        </p>
      ) : null}
    </div>
  );
}

function IconBtn({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-lg bg-white/95 shadow-sm disabled:opacity-40",
        danger ? "text-sun-600" : "text-slate-700",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

/* =========================================================================
 * Danh sách dòng chữ (chặng, điểm nổi bật, bao gồm…)
 * ========================================================================= */

export function StringList({
  value = [],
  onChange,
  placeholder = "Nhập nội dung…",
  addLabel = "Thêm dòng",
  multiline,
}) {
  const set = (i, v) => onChange(value.map((x, k) => (k === i ? v : x)));
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <Sortable items={value} onReorder={(next) => onChange(next)} className="space-y-2">
          {(item, i, d) => (
            <div
              className={cn(
                "flex items-start gap-1 rounded-xl",
                d.dragging && "bg-white ring-2 ring-brand-300",
              )}
            >
              {value.length > 1 && <DragHandle {...d.handle} className="mt-1.5" />}
              <span className="mt-3 w-5 shrink-0 text-center text-xs font-semibold text-slate-400 tabular-nums">
                {i + 1}
              </span>
              {multiline ? (
                <Textarea
                  rows={2}
                  value={item}
                  placeholder={placeholder}
                  onChange={(e) => set(i, e.target.value)}
                  className="min-w-0 flex-1"
                />
              ) : (
                <Input
                  value={item}
                  placeholder={placeholder}
                  onChange={(e) => set(i, e.target.value)}
                  className="min-w-0 flex-1"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange(value.filter((_, k) => k !== i))}
                aria-label="Xoá"
                title="Xoá"
                className="mt-1 shrink-0 text-sun-600"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </Sortable>
      )}
      <Button variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...value, ""])}>
        {addLabel}
      </Button>
    </div>
  );
}

/** Chọn nhiều mục (thẻ bấm bật / tắt) */
export function ChipSelect({ options, value = [], onChange, max }) {
  const toggle = (v) => {
    if (value.includes(v)) return onChange(value.filter((x) => x !== v));
    if (max && value.length >= max) return;
    onChange([...value, v]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
              on
                ? "bg-brand-700 text-white ring-brand-700"
                : "bg-white text-slate-600 ring-slate-200 hover:ring-brand-300",
            )}
          >
            {on && <Check className="size-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================================
 * Cảnh báo rời trang khi còn nội dung chưa lưu
 * ========================================================================= */

/**
 * Mọi nơi đang có thay đổi chưa lưu (trang soạn + hộp thoại mở bên trên). Gom lại để hộp thoại đóng
 * không xoá mất cảnh báo của trang bên dưới. Muốn rời trang có chủ đích: window.__vlHasUnsaved = () => false.
 */
const unsavedSources = new Set();
const anyUnsaved = () => unsavedSources.size > 0;

export function useUnsavedGuard(dirty) {
  useEffect(() => {
    window.__vlHasUnsaved = anyUnsaved;
    if (!dirty) return;
    const token = {};
    unsavedSources.add(token);
    const onBefore = (e) => {
      if (!window.__vlHasUnsaved?.()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => {
      unsavedSources.delete(token);
      window.removeEventListener("beforeunload", onBefore);
      window.__vlHasUnsaved = anyUnsaved;
    };
  }, [dirty]);
}

/* =========================================================================
 * Định dạng
 * ========================================================================= */

/** CMS luôn tiếng Việt: "dd/mm/yyyy HH:mm" / "dd/mm/yyyy" (giờ Việt Nam) — dùng chung với website: lib/dates.js */
export const fmtDateTime = (v) => fmtDateTimeShared(v, "vi");
export const fmtDate = (v) => fmtDateShared(v, "vi");
export const fmtUSD = (n) => (n == null ? "—" : `$${Number(n).toLocaleString("en-US")}`);

/** Chuỗi đa ngôn ngữ → tiếng Việt / Anh để hiển thị trong CMS */
export const locText = (v) => v?.vi || v?.en || v?.zh || "";
