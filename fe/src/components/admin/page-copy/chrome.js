"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  History,
  Keyboard,
  Languages,
  MousePointerClick,
  RotateCcw,
  Save,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_BASE } from "@/config/urls.mjs";
import Link from "../Link";
import { AutoTranslate } from "../translate";
import { Badge, Button, LangTabs, fmtDateTime, useUi } from "../ui";

/**
 * KHUNG TRÌNH SỬA TRANG dùng chung (Trang chủ · Giao diện trang · Giới thiệu · chính sách) — 1 kiểu cho mọi trang:
 *   <EditorHeader …>            ← Giao diện trang · tên trang · lời dẫn · "Lưu lần cuối …" · nút bên phải
 *   <EditorFrame label tools>  khung "trình duyệt": 3 chấm · thanh địa chỉ · công cụ (Đi tới khối, Lịch sử, Hướng dẫn)
 *   <SaveBar …>                 thanh lưu dính đáy màn hình: Dịch tự động + ngôn ngữ · trạng thái · Bỏ thay đổi · Lưu
 *   <LangTools …>               Dịch tự động + tab ngôn ngữ (CHỈ 1 chỗ: thanh lưu; chế độ chỉ xem: khung trên)
 *   <ToolButton> <QuickHelp>    nút công cụ ở khung trên + hộp "Hướng dẫn nhanh"
 *   useSaveShortcut(save)       Ctrl/⌘ + S = Lưu
 *   useConflictSave()           lưu kèm `baseUpdatedAt`; có người vừa lưu (409) → hỏi Ghi đè / Tải lại bản mới
 *   useStickyBarRoom(ref)       chừa chỗ cho thanh lưu khi trình duyệt tự cuộn tới ô đang sửa (SaveBar tự gọi)
 */

export const LANG_NAME = { en: "tiếng Anh", zh: "tiếng Trung", vi: "tiếng Việt" };
export const HUB = `${ADMIN_BASE}/pages`;

const TZ = "Asia/Ho_Chi_Minh";
const fmt = (opts) => new Intl.DateTimeFormat("vi-VN", { hour12: false, timeZone: TZ, ...opts });
const HHMM = fmt({ hour: "2-digit", minute: "2-digit" });
const DDMM_HHMM = fmt({ day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const valid = (v) => v && !Number.isNaN(new Date(v).getTime());
/** "14:05" (giờ Việt Nam) */
export const fmtClock = (v) => (valid(v) ? HHMM.format(new Date(v)) : "");
/** "27/11 14:05" (giờ Việt Nam) */
export const fmtShort = (v) => {
  if (!valid(v)) return "";
  const p = Object.fromEntries(DDMM_HHMM.formatToParts(new Date(v)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
};

/** Dịch tự động + tab ngôn ngữ — đặt ở thanh lưu (luôn hiện, cả trên điện thoại) */
export function LangTools({ lang, onLang, filled, canEdit, value, onTranslate }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {canEdit && (
        <AutoTranslate
          lang={lang}
          value={value}
          onChange={onTranslate}
          className="px-3 ring-1 ring-brand-200/70"
          // điện thoại: chỉ biểu tượng (vẫn có tên cho trình đọc màn hình) → thanh lưu gọn 1 hàng
          label={<span className="max-[430px]:sr-only">Dịch tự động</span>}
        />
      )}
      <LangTabs value={lang} onChange={onLang} filled={filled} className="bg-white" />
    </div>
  );
}

/** ← Giao diện trang (rời trang khi chưa lưu: `onClick` hỏi lại) */
export function BackLink({ onClick, href = HUB }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
    >
      <ArrowLeft className="size-3.5" />
      Giao diện trang
    </Link>
  );
}

/** Nút "Xem trang thật" (mở tab mới; đang có thay đổi chưa lưu → nhắc website hiện bản đã lưu) */
export function ViewLiveLink({ href, dirty, className }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={dirty ? "Website đang hiện bản đã lưu gần nhất" : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900",
        className,
      )}
    >
      <ExternalLink className="size-4" />
      Xem trên website
    </a>
  );
}

/** Nút "Về mặc định cả trang" (chỉ hiện khi trang có ô đã sửa) */
export function ResetAllButton({ onClick }) {
  return (
    <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onClick}>
      Về mặc định cả trang
    </Button>
  );
}

/**
 * Đầu trình sửa: ← Giao diện trang · tên trang · lời dẫn (+ "Lưu lần cuối …") · nút bên phải.
 * `readOnly`: chỉ xem → lời dẫn ngắn.
 */
export function EditorHeader({ title, intro, readOnly, updatedAt, onBack, actions }) {
  return (
    <>
      <BackLink onClick={onBack} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            {readOnly ? "Bạn đang ở chế độ chỉ xem." : intro}
            {updatedAt && ` Lưu lần cuối ${fmtDateTime(updatedAt)}.`}
          </p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </>
  );
}

/** Khung "trình duyệt" bao bản xem trước: thanh địa chỉ ghi tên trang + ngôn ngữ đang sửa, công cụ bên phải */
export function EditorFrame({ name, lang, tools, children, className }) {
  return (
    <div
      data-editor-frame
      className={cn(
        "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-200",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-t-2xl border-b border-slate-200 bg-slate-100 px-3.5 py-2">
        <span className="flex gap-1.5 max-sm:hidden" aria-hidden>
          <span className="size-2.5 rounded-full bg-sun-400" />
          <span className="size-2.5 rounded-full bg-amber-brand" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200 max-sm:hidden">
          {name} · đang sửa nội dung <b className="text-slate-700">{LANG_NAME[lang]}</b>
        </span>
        <div className="flex flex-wrap items-center gap-1.5 max-sm:flex-1 max-sm:justify-between">
          {tools}
        </div>
      </div>
      {/* bo góc dưới + cắt phần tràn của bản xem trước (thanh trên không cắt → menu công cụ thả xuống được) */}
      <div className="overflow-hidden rounded-b-2xl">{children}</div>
    </div>
  );
}

/** Nút công cụ ở khung trên (biểu tượng + chữ; điện thoại chỉ biểu tượng) */
export function ToolButton({ icon: Icon, label, short, active, className, ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:text-brand-700 hover:ring-brand-300 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none",
        active && "text-brand-700 ring-brand-300",
        className,
      )}
      {...props}
    >
      <Icon className="size-4 shrink-0" />
      <span className="max-[480px]:hidden">{short ?? label}</span>
    </button>
  );
}

/** Đóng khi bấm ra ngoài / Esc (menu thả xuống, hộp nhỏ) */
export function useDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen, ref]);
}

const TIPS = [
  { icon: MousePointerClick, text: "Bấm thẳng vào chữ trên bản xem trước để sửa." },
  { icon: MousePointerClick, text: "Bấm vào ảnh để đổi ảnh (chọn ảnh mới hoặc ảnh trong kho)." },
  { icon: Keyboard, text: "Nhấn Ctrl + S (máy Mac: ⌘ + S) để lưu nhanh." },
  { icon: History, text: "“Lịch sử” giữ 20 bản lưu gần nhất — bấm để quay lại bản cũ." },
  {
    icon: Languages,
    text: "“Dịch tự động” ở thanh dưới dịch các ô còn trống sang ngôn ngữ đang chọn; khi lưu, ngôn ngữ còn trống cũng được tự dịch.",
  },
];

/** Hộp "Hướng dẫn nhanh" — vài mẹo dùng trình sửa trang */
export function QuickHelp({ tips = TIPS }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);
  return (
    <div ref={ref} className="relative">
      <ToolButton
        icon={CircleHelp}
        label="Hướng dẫn nhanh"
        short="Hướng dẫn"
        active={open}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <div
          role="dialog"
          aria-label="Hướng dẫn nhanh"
          className="absolute top-full right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] animate-[admin-pop_.16s_ease-out] rounded-2xl bg-white p-4 text-left shadow-[0_18px_48px_-16px_rgba(10,37,60,0.45)] ring-1 ring-slate-200"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900">Hướng dẫn nhanh</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="size-4" />
            </button>
          </div>
          <ul className="space-y-2.5">
            {tips.map((t) => (
              <li key={t.text} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-600">
                <t.icon className="mt-0.5 size-4 shrink-0 text-brand-600" />
                {t.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Nút "Lịch sử" ở khung trên (mở HistoryDrawer) */
export function HistoryButton({ onClick, active }) {
  return <ToolButton icon={History} label="Lịch sử" active={active} onClick={onClick} />;
}

/**
 * Thanh lưu dính đáy màn hình.
 *   tools      LangTools (Dịch tự động + ngôn ngữ)
 *   note       dòng phụ cạnh trạng thái
 *   status     thay chỗ trạng thái "Chưa lưu / Đã lưu" (vd. "Đang chuẩn bị video…", lỗi ảnh / video) — hiện cả trên điện thoại
 *   extra      nút thêm trước nút Lưu (vd. "Huỷ lưu video")
 *   saveLabel  chữ thay "Lưu thay đổi" (vd. tiến độ tải ảnh)
 * Tự chừa chỗ cho thanh (useStickyBarRoom) khi trình duyệt cuộn tới ô đang sửa.
 */
export function SaveBar({
  tools,
  dirty,
  note,
  status,
  extra,
  onDiscard,
  onSave,
  busy,
  saving,
  saveLabel,
}) {
  const barRef = useRef(null);
  useStickyBarRoom(barRef); // trình duyệt tự cuộn tới ô đang sửa → không bị thanh này che
  return (
    <div
      ref={barRef}
      className="sticky bottom-3 z-30 mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-[0_12px_40px_-12px_rgba(10,37,60,0.4)] ring-1 ring-slate-200 backdrop-blur sm:bottom-4 sm:px-4"
    >
      {tools}
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 text-xs",
          !status && "max-sm:hidden",
          status && "max-sm:order-last max-sm:basis-full",
        )}
      >
        {status ||
          (dirty ? (
            <Badge tone="amber">Chưa lưu</Badge>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-slate-500">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              Đã lưu mọi thay đổi
            </span>
          ))}
        {/* khung hẹp (vd. 1024px có thanh menu): bỏ dòng phụ, giữ "Đã lưu" trên 1 dòng */}
        {note && !status && <span className="truncate text-slate-400 max-xl:hidden">{note}</span>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            icon={Undo2}
            onClick={onDiscard}
            disabled={busy}
            aria-label="Bỏ thay đổi"
            title="Bỏ thay đổi"
          >
            <span className="max-sm:hidden">Bỏ thay đổi</span>
          </Button>
        )}
        {extra}
        <Button icon={Save} onClick={onSave} loading={saving} disabled={!dirty}>
          {saveLabel || (
            <>
              <span className="max-sm:hidden">Lưu thay đổi</span>
              <span className="sm:hidden">Lưu</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/** Ctrl/⌘ + S = Lưu (luôn gọi bản `save` mới nhất) */
export function useSaveShortcut(save, enabled = true) {
  const ref = useRef(save);
  useEffect(() => {
    ref.current = save;
  }, [save]);
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        ref.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/** Kết quả của useConflictSave khi người dùng chọn "Tải lại bản mới" */
export const RELOAD = Object.freeze({ reload: true });

/**
 * Lưu có chống ghi đè: `send(base)` gửi kèm baseUpdatedAt = base. Máy chủ báo có người vừa lưu
 * (409 CONTENT_CONFLICT) → hỏi "Ghi đè" (gửi lại với lúc lưu mới nhất) hay "Tải lại bản mới" (trả RELOAD).
 *   const r = await guarded((base) => api(url, { method: "PUT", body: { ...body, baseUpdatedAt: base } }), updatedAt)
 */
export function useConflictSave() {
  const { confirm } = useUi();
  return useCallback(
    async (send, base) => {
      try {
        return await send(base || undefined);
      } catch (err) {
        if (err?.code !== "CONTENT_CONFLICT") throw err;
        const at = err.details?.updatedAt;
        const by = err.details?.by;
        const ok = await confirm({
          title: "Có người vừa lưu trang này",
          message: `Nội dung này vừa được người khác lưu lúc ${fmtClock(at) || "vừa rồi"}${by ? ` (${by})` : ""}. Ghi đè hay tải lại bản mới?`,
          confirmText: "Ghi đè",
          cancelText: "Tải lại bản mới",
          danger: true,
        });
        if (ok) return send(at);
        return RELOAD;
      }
    },
    [confirm],
  );
}

/**
 * Thanh lưu dính đáy màn hình không được che ô đang sửa: khi bấm Tab / bấm vào ô / mở hộp đổi ảnh, trình duyệt
 * cuộn ô vào vùng nhìn thấy — chừa đúng chiều cao thanh lưu ở đáy (và thanh tiêu đề dính trên điện thoại ở đầu)
 * qua scroll-padding của trang. Thanh đổi chiều cao (xuống 2 dòng) → đo lại.
 */
export function useStickyBarRoom(ref) {
  useEffect(() => {
    const bar = ref.current;
    const root = document.documentElement;
    if (!bar) return;
    const mobileHeader = window.matchMedia("(max-width: 1023.98px)"); // AdminShell: header dính h-16 dưới lg
    const apply = () => {
      root.style.scrollPaddingBottom = `${Math.ceil(bar.offsetHeight) + 28}px`;
      root.style.scrollPaddingTop = mobileHeader.matches ? "80px" : "16px";
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(bar);
    mobileHeader.addEventListener("change", apply);
    return () => {
      ro.disconnect();
      mobileHeader.removeEventListener("change", apply);
      root.style.scrollPaddingBottom = "";
      root.style.scrollPaddingTop = "";
    };
  }, [ref]);
}

/**
 * Bản xem trước để SỬA chữ & ảnh: ảnh đứng yên — không phóng to / nhích lên khi rê chuột (hiệu ứng hover của thẻ,
 * ảnh), nội dung "hiện dần khi cuộn" hiện sẵn. Chỉ áp trong .site-preview, phần giao diện sửa (data-edit-ui) giữ nguyên.
 */
export const PREVIEW_CSS = `
.site-preview :is(img, picture, video):not([data-edit-ui] *) { scale: none !important; }
.site-preview [class*="hover:scale"]:hover:not([data-edit-ui], [data-edit-ui] *),
.site-preview .group:hover [class*="group-hover:scale"]:not([data-edit-ui] *) { scale: none !important; }
.site-preview [class*="hover:-translate"]:hover:not([data-edit-ui], [data-edit-ui] *),
.site-preview [class*="hover:translate"]:hover:not([data-edit-ui], [data-edit-ui] *),
.site-preview .group:hover [class*="group-hover:-translate"]:not([data-edit-ui] *),
.site-preview .group:hover [class*="group-hover:translate"]:not([data-edit-ui] *) { translate: none !important; }
.site-preview [class*="opacity-0"][class*="translate-y-[18px]"] { opacity: 1 !important; translate: none !important; scale: none !important; }
`;
