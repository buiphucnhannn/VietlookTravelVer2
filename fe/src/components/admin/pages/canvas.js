"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Plus, Trash2, X, Zap } from "lucide-react";
import Link from "@/components/admin/Link";
import { cn } from "@/lib/utils";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Container from "@/components/ui/Container";
import { StillMotion } from "@/components/ui/motion";
import { DragHandle, Sortable } from "../Sortable";
import { InlineText as SharedInlineText } from "../home/shared";
import { EditorFrame, PREVIEW_CSS } from "../page-copy/chrome";
import { ImageSpot } from "../page-copy/image-edit";

/* =========================================================================
 * Bản xem trước trang Giới thiệu / chính sách: dựng y như trang thật trên website (cùng thứ tự khối,
 * cỡ chữ, khoảng cách, màu, ảnh nền), sửa chữ ngay trên đó. Phần không sửa ở đây (đánh giá, khối dùng chung,
 * thông tin liên hệ…) vẫn hiện đúng dữ liệu thật, kèm nhãn nhỏ "Tự động — sửa ở …".
 * ========================================================================= */

export const LANG_NAME = { en: "tiếng Anh", zh: "中文", vi: "tiếng Việt" };
export const emptyLoc = () => ({ en: "", zh: "", vi: "" });

/** Chữ gợi ý cho ô đang trống: chữ của ngôn ngữ khác đã có (khi lưu sẽ tự dịch sang) hoặc lời nhắc */
export const hintOf = (lang, loc, fallback) => otherOf(loc, lang) || fallback;
/** Chữ đầu tiên có nội dung ở ngôn ngữ KHÁC `lang` (thứ tự en → vi → zh) */
export const otherOf = (loc, lang) =>
  ["en", "vi", "zh"]
    .filter((l) => l !== lang)
    .map((l) => loc?.[l])
    .find((v) => typeof v === "string" && v.trim()) ?? "";
/** Danh sách của ngôn ngữ KHÁC `lang` có nhiều dòng nhất */
export const otherList = (list, lang) =>
  ["en", "vi", "zh"]
    .filter((l) => l !== lang)
    .map((l) => list?.[l] ?? [])
    .sort((a, b) => b.length - a.length)[0] ?? [];

/**
 * Dòng chữ sửa tại chỗ — dùng ĐÚNG ô sửa chữ chung của mọi trình sửa trang (home/shared → InlineText):
 * rê chuột: viền xanh nét đứt + nhãn "Bấm để sửa · tên ô"; bấm vào: viền cam, nền cam nhạt + thanh "Xong · Bỏ".
 * Kiểu chữ lấy từ className (giống hệt chữ trên website). `fit`: ô chỉ rộng vừa bằng chữ (tiêu đề nét cọ, chữ
 * trên nút); không có → ô rộng hết dòng. `singleLine`: không xuống dòng (Enter = xong). Đoạn văn: Shift + Enter.
 * `autoFocus`: con trỏ vào ô ngay (ô vừa bấm "Thêm").
 */
export function InlineText({
  value,
  onChange,
  placeholder,
  label,
  className,
  dark,
  singleLine,
  autoFocus,
  fit,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (autoFocus) ref.current?.querySelector("textarea")?.focus();
  }, [autoFocus]);
  return (
    <span ref={ref} className="contents">
      <SharedInlineText
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        label={label}
        multiline={!singleLine}
        light={!dark}
        className={cn(!fit && "grid w-full", className)}
      />
    </span>
  );
}

/** Ô chữ 3 ngôn ngữ sửa tại chỗ: value = { en, zh, vi } */
export function LocText({ value, onChange, lang, hint, ...props }) {
  return (
    <InlineText
      {...props}
      value={value?.[lang] ?? ""}
      onChange={(v) => onChange({ ...emptyLoc(), ...value, [lang]: v })}
      placeholder={hintOf(lang, value, hint)}
    />
  );
}

/** Nút xoá tròn nhỏ */
export function RemoveButton({ onClick, name, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Xoá ${name}`}
      title="Xoá"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-sun-600 transition hover:bg-sun-50",
        className,
      )}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

/**
 * Cụm nút nổi ở góc mỗi thẻ / đoạn: tay nắm kéo để đổi chỗ + xoá. Chỉ hiện khi rê chuột vào thẻ hoặc đang gõ
 * trong thẻ (thẻ cần class `group/item`) → bản xem trước gọn như trang thật.
 */
export function CardTools({ drag, onRemove, name, className }) {
  return (
    <span
      data-edit-ui
      className={cn(
        "absolute -top-4 right-3 z-20 flex items-center rounded-full bg-white p-0.5 opacity-0 shadow-md ring-1 ring-slate-200 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100 focus-within:opacity-100",
        drag.dragging && "opacity-100",
        className,
      )}
    >
      <DragHandle {...drag.handle} className="rounded-full" />
      <RemoveButton onClick={onRemove} name={name} />
    </span>
  );
}

/** Nút "thêm" viền nét đứt */
export function AddButton({ children, onClick, dark, disabled, className }) {
  return (
    <button
      type="button"
      data-edit-ui
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-dashed px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        dark
          ? "border-white/40 text-white/80 hover:border-white hover:bg-white/10 hover:text-white"
          : "border-brand-300 bg-white/70 text-brand-700 hover:border-brand-500 hover:bg-brand-50",
        className,
      )}
    >
      <Plus className="size-4" />
      {children}
    </button>
  );
}

/**
 * Các thẻ chữ ngắn (phẩm chất, ngôn ngữ): trông đúng như thẻ trên website; rê chuột / bấm vào thẻ thì hiện
 * cụm nút nhỏ phía trên (kéo đổi chỗ, xoá). `chipClass`: kiểu thẻ y như website.
 */
export const InlineChips = memo(function InlineChips({
  value,
  placeholders = [],
  onChange,
  dark,
  addLabel,
  newHint,
  name,
  chipClass,
}) {
  const [focusAt, setFocusAt] = useState(-1);
  return (
    <>
      <Sortable items={value} onReorder={onChange} layout="grid" className="contents">
        {(item, i, drag) => {
          const hint = placeholders[i] || newHint;
          return (
            <span
              className={cn(
                // cùng màu với ô sửa chữ chung: rê chuột viền xanh nét đứt · đang gõ viền cam + nền cam nhạt
                "group/chip relative inline-flex max-w-full cursor-text items-center outline-2 outline-offset-2 outline-transparent outline-dashed focus-within:outline-solid",
                chipClass,
                dark
                  ? "focus-within:bg-orange-500/20 focus-within:outline-orange-500 hover:outline-blue-400"
                  : "focus-within:bg-orange-500/[0.08] focus-within:outline-orange-500 hover:outline-blue-500",
                drag.dragging && "shadow-lg",
              )}
            >
              <span className="inline-grid min-w-0">
                <span
                  aria-hidden="true"
                  className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre"
                >
                  {item || hint}
                </span>
                <input
                  size={1}
                  data-inline
                  value={item}
                  autoFocus={i === focusAt}
                  placeholder={hint}
                  aria-label={`${name} ${i + 1}`}
                  title={`Bấm để sửa · ${name} ${i + 1}`}
                  onChange={(e) => onChange(value.map((x, k) => (k === i ? e.target.value : x)))}
                  className={cn(
                    "col-start-1 row-start-1 w-full min-w-0 bg-transparent caret-orange-500 outline-none",
                    dark ? "placeholder:text-white/45" : "placeholder:text-brand-700/45",
                  )}
                />
              </span>
              {/* Cụm nút nổi phía trên thẻ: chạm sát mép trên thẻ để rê chuột từ thẻ lên không bị mất */}
              <span
                data-edit-ui
                className={cn(
                  "absolute bottom-[calc(100%-4px)] left-1/2 z-20 hidden -translate-x-1/2 items-center rounded-full bg-white p-0.5 text-slate-500 shadow-md ring-1 ring-slate-200 group-focus-within/chip:flex group-hover/chip:flex",
                  drag.dragging && "flex",
                )}
              >
                <DragHandle {...drag.handle} className="size-7 rounded-full" />
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, k) => k !== i))}
                  aria-label={`Xoá ${name} ${i + 1}`}
                  title="Xoá"
                  className="grid size-7 place-items-center rounded-full text-sun-600 transition hover:bg-sun-50"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </span>
          );
        }}
      </Sortable>
      <AddButton
        dark={dark}
        className="px-3 py-1"
        onClick={() => {
          setFocusAt(value.length);
          onChange([...value, ""]);
        }}
      >
        {addLabel}
      </AddButton>
    </>
  );
});
/**
 * Nhãn "⚡ Tự động · sửa ở …" ở góc khối KHÔNG sửa ở đây (cùng kiểu với Giao diện trang): bình thường chỉ là chấm ⚡
 * nhỏ mờ; rê chuột lên khối (khung cha có lớp `group/auto`) hoặc lên chấm thì hiện đủ chữ + link sang mục sửa.
 * Nằm đè lên khối (không đẩy bố cục) → khối vẫn y như trang thật.
 */
export function AutoChip({ children, href, dark, className }) {
  const cls = cn(
    "group/chip absolute top-3 right-3 z-20 inline-flex h-6 max-w-[calc(100%-1.5rem)] min-w-6 items-center justify-center gap-1 rounded-full px-1.5 text-[11px] leading-4 font-semibold opacity-70 shadow-sm ring-1 backdrop-blur group-hover/auto:px-2.5 group-hover/auto:opacity-100 hover:px-2.5 hover:opacity-100",
    dark
      ? "bg-slate-950/70 text-white/90 ring-white/15 hover:bg-slate-950/85"
      : "bg-white/95 text-slate-600 ring-slate-900/10 hover:text-brand-700",
    className,
  );
  const body = (
    <>
      <Zap className="size-3 shrink-0 text-amber-500" />
      <span className="hidden truncate group-hover/auto:inline group-hover/chip:inline">
        {children}
      </span>
      {href && (
        <ArrowUpRight className="hidden size-3 shrink-0 opacity-60 group-hover/auto:block group-hover/chip:block" />
      )}
    </>
  );
  const title = typeof children === "string" ? children : undefined;
  return href ? (
    <Link href={href} data-admin-link data-edit-ui title={title} aria-label={title} className={cls}>
      {body}
    </Link>
  ) : (
    <span data-edit-ui title={title} className={cls}>
      {body}
    </span>
  );
}

/* =========================================================================
 * Khung "trang web": cùng khung trình duyệt với Giao diện trang (thanh địa chỉ + Dịch tự động + tab ngôn ngữ).
 * Bấm vào link bên trong bản xem trước không rời trang sửa (trừ link của CMS có `data-admin-link`).
 * Bản xem trước đứng yên: không hiệu ứng chuyển động / trượt / hiện dần (site-preview + StillMotion).
 * ========================================================================= */

const stayHere = (e) => {
  const a = e.target.closest?.("a[href]");
  if (a && !a.closest("[data-admin-link]")) e.preventDefault();
};

export function MiniSite({ name, lang, tools, children }) {
  return (
    <EditorFrame name={name} lang={lang} tools={tools}>
      {/* cùng màu chữ / font như website; lang → chữ Trung dùng đúng font dự phòng */}
      <div
        lang={lang}
        onClickCapture={stayHere}
        data-preview-canvas
        className="site-preview @container w-full overflow-clip text-foreground"
      >
        <style>{PREVIEW_CSS}</style>
        <StillMotion>{children}</StillMotion>
      </div>
    </EditorFrame>
  );
}

/**
 * Đầu trang y như website (components/ui/PageHero.js → BrushHero): dải 1–3 ảnh ghép phủ tối, đường dẫn,
 * tiêu đề trên nét cọ, dòng mô tả. Bấm vào phần ảnh là đổi ảnh đầu trang (cùng kiểu đổi ảnh với mọi trang);
 * `extraImages` là các ảnh ghép bên cạnh (chỉ để xem). memo: chỉ vẽ lại khi tiêu đề / mô tả / ảnh đổi.
 */
export const MiniHero = memo(function MiniHero({
  title,
  subtitle,
  image,
  lang,
  set,
  fallbackImage,
  extraImages = [],
}) {
  const first = image || fallbackImage;
  const list = [...new Set([first, ...extraImages].filter(Boolean))].slice(0, 3);
  const shown = title[lang] || otherOf(title, lang);
  return (
    <section className="relative isolate overflow-hidden bg-brand-950">
      <div className="absolute inset-0 -z-10 flex gap-[3px] bg-brand-950">
        {list.map((src, i) => (
          <div key={src} className={cn("relative h-full flex-1", i > 0 && "hidden md:block")}>
            {/* ảnh vừa chọn chưa lưu (blob:) → <img> thường */}
            {String(src).startsWith("blob:") ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh tạm trên máy, chưa có trên CDN
              <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <Image
                src={src}
                alt=""
                fill
                sizes={list.length > 1 ? "(min-width: 768px) 34vw, 100vw" : "100vw"}
                className="object-cover"
              />
            )}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />
      <ImageSpot
        value={image}
        onChange={(v) => set({ image: v })}
        crop={{ ratio: 12 / 5, width: 2400 }}
        label="Ảnh đầu trang"
        edited={!!image}
        onReset={() => set({ image: "" })}
        tagAt="top-3 left-3"
        toolsAt="top-3 right-3"
      />

      <Container className="flex min-h-[360px] flex-col items-center justify-center pt-24 pb-12 text-center text-white sm:min-h-[420px] lg:min-h-[460px] lg:pt-32">
        <Breadcrumbs
          items={[{ label: "Vietlook", href: "/" }, { label: shown || "…" }]}
          light
          className="mb-5"
        />
        <h1 className="brush max-w-full text-4xl font-extrabold tracking-tight drop-shadow-md [--brush-color:var(--color-clay-600)] sm:text-6xl">
          <InlineText
            dark
            fit
            singleLine
            label="Tiêu đề trang"
            value={title[lang]}
            onChange={(v) => set({ title: { ...title, [lang]: v } })}
            placeholder={hintOf(lang, title, "Tiêu đề trang")}
          />
        </h1>
        <InlineText
          dark
          label="Dòng mô tả dưới tiêu đề"
          value={subtitle[lang]}
          onChange={(v) => set({ subtitle: { ...subtitle, [lang]: v } })}
          placeholder={hintOf(lang, subtitle, "Thêm một dòng mô tả ngắn")}
          className="mt-5 max-w-3xl text-base font-semibold drop-shadow-md sm:text-xl"
        />
      </Container>
    </section>
  );
});
