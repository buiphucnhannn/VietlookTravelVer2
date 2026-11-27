"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, ImagePlus, Plus, Sparkles, Trash2, X } from "lucide-react";
import Link from "@/components/admin/Link";
import { cn } from "@/lib/utils";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Container from "@/components/ui/Container";
import { DragHandle, Sortable } from "../Sortable";
import { Button, ImageField, Modal } from "../ui";

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
 * Dòng chữ sửa tại chỗ: trong suốt, tự cao theo nội dung, viền nét đứt khi rê chuột / đang gõ.
 * Kiểu chữ lấy từ className của khung ngoài (giống hệt chữ trên website). Khung có lề trong để viền không
 * dính chữ, lề âm bên ngoài bù lại → chữ nằm đúng chỗ như trên website.
 * `fit`: ô chỉ rộng vừa bằng chữ (dùng cho tiêu đề trên nét cọ, chữ trên nút).
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
  const cell =
    "col-start-1 row-start-1 min-w-0 px-2 py-1 break-words whitespace-pre-wrap [text-align:inherit] [text-transform:inherit]";
  return (
    <span
      className={cn(
        "-mx-2 -my-1",
        fit ? "inline-grid max-w-[calc(100%+1rem)]" : "grid w-[calc(100%+1rem)]",
        className,
      )}
    >
      <span aria-hidden="true" className={cn(cell, "invisible")}>
        {/* ký tự &nbsp; cuối giữ chỗ cho dòng trống cuối cùng */}
        {value || placeholder}&nbsp;
      </span>
      <textarea
        rows={1}
        cols={1}
        data-inline
        value={value}
        autoFocus={autoFocus}
        aria-label={label}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(singleLine ? e.target.value.replace(/\n+/g, " ") : e.target.value)
        }
        onKeyDown={singleLine ? (e) => e.key === "Enter" && e.preventDefault() : undefined}
        className={cn(
          cell,
          "resize-none overflow-hidden rounded-lg bg-transparent outline-1 outline-transparent transition-colors outline-dashed",
          dark
            ? "placeholder:text-white/45 hover:outline-white/60 focus:bg-white/10 focus:outline-white [@media(hover:none)]:outline-white/30"
            : "placeholder:text-slate-400 hover:outline-brand-300 focus:bg-brand-50/60 focus:outline-brand-500 [@media(hover:none)]:outline-slate-300",
        )}
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
export function InlineChips({
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
                "group/chip relative inline-flex max-w-full items-center outline-1 outline-transparent transition outline-dashed",
                chipClass,
                dark
                  ? "focus-within:bg-white/10 focus-within:outline-white hover:outline-white/60"
                  : "focus-within:bg-white focus-within:outline-brand-500 hover:outline-brand-300",
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
                  onChange={(e) => onChange(value.map((x, k) => (k === i ? e.target.value : x)))}
                  className={cn(
                    "col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none",
                    dark ? "placeholder:text-white/45" : "placeholder:text-brand-700/45",
                  )}
                />
              </span>
              {/* Cụm nút nổi phía trên thẻ: chạm sát mép trên thẻ để rê chuột từ thẻ lên không bị mất */}
              <span
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
}

/**
 * Nhãn nhỏ góc trên bên phải của khối KHÔNG sửa ở đây: nói rõ nội dung tự động lấy từ đâu và (nếu có)
 * link sang mục sửa. Nằm đè lên khối (không đẩy bố cục) → khối vẫn y như trang thật.
 */
export function AutoChip({ children, href, dark, className }) {
  const cls = cn(
    "absolute top-3 right-3 z-20 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full px-3 py-1 text-[11px] leading-4 font-semibold shadow-sm ring-1 backdrop-blur transition",
    dark
      ? "bg-black/35 text-white/85 ring-white/20 hover:bg-black/50 hover:text-white"
      : "bg-white/90 text-slate-600 ring-slate-200 hover:bg-white hover:text-brand-700",
    className,
  );
  const body = (
    <>
      <Sparkles className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{children}</span>
      {href && <ArrowUpRight className="size-3.5 shrink-0" />}
    </>
  );
  return href ? (
    <Link href={href} data-admin-link className={cls}>
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}

/* =========================================================================
 * Khung "trang web": viền + thanh địa chỉ. Bấm vào link bên trong bản xem trước không rời trang sửa
 * (trừ link của CMS có `data-admin-link`).
 * ========================================================================= */

const stayHere = (e) => {
  const a = e.target.closest?.("a[href]");
  if (a && !a.closest("[data-admin-link]")) e.preventDefault();
};

export function MiniSite({ name, lang, children }) {
  return (
    <div className="@container w-full overflow-clip rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_48px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-3.5 py-2">
        <span className="flex shrink-0 gap-1.5" aria-hidden="true">
          <i className="size-2.5 rounded-full bg-sun-500/70" />
          <i className="size-2.5 rounded-full bg-amber-400" />
          <i className="size-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="mx-auto max-w-full min-w-0 truncate rounded-full bg-white px-4 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
          Vietlook Travel · {name}
        </span>
        <span className="hidden w-[42px] shrink-0 sm:block" aria-hidden="true" />
      </div>
      {/* cùng màu chữ / font như website; lang → chữ Trung dùng đúng font dự phòng */}
      <div lang={lang} onClickCapture={stayHere} data-preview-canvas className="text-foreground">
        {children}
      </div>
    </div>
  );
}

/**
 * Đầu trang y như website (components/ui/PageHero.js → BrushHero): dải 1–3 ảnh ghép phủ tối, đường dẫn,
 * tiêu đề trên nét cọ, dòng mô tả. Ảnh đầu tiên đổi được (nút "Đổi ảnh"); `extraImages` là các ảnh ghép bên
 * cạnh (chỉ để xem).
 */
export function MiniHero({ d, lang, set, fallbackImage, extraImages = [] }) {
  const [imageOpen, setImageOpen] = useState(false);
  const first = d.image || fallbackImage;
  const list = [...new Set([first, ...extraImages].filter(Boolean))].slice(0, 3);
  const title = d.title[lang] || otherOf(d.title, lang);
  return (
    <section className="relative isolate overflow-hidden bg-brand-950">
      <div className="absolute inset-0 -z-10 flex gap-[3px] bg-brand-950">
        {list.map((src, i) => (
          <div key={src} className={cn("relative h-full flex-1", i > 0 && "hidden md:block")}>
            <Image
              src={src}
              alt=""
              fill
              sizes={list.length > 1 ? "(min-width: 768px) 34vw, 100vw" : "100vw"}
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />

      {/* Nút đổi ảnh: nằm trên phần ảnh đầu tiên (chỗ thanh menu website phủ lên) */}
      <button
        type="button"
        onClick={() => setImageOpen(true)}
        className="absolute top-3 left-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-md transition hover:bg-white"
      >
        <ImagePlus className="size-4" />
        {first ? "Đổi ảnh" : "Thêm ảnh"}
      </button>

      <Container className="flex min-h-[360px] flex-col items-center justify-center pt-24 pb-12 text-center text-white sm:min-h-[420px] lg:min-h-[460px] lg:pt-32">
        <Breadcrumbs
          items={[{ label: "Vietlook", href: "/" }, { label: title || "…" }]}
          light
          className="mb-5"
        />
        <h1 className="brush max-w-full text-4xl font-extrabold tracking-tight drop-shadow-md [--brush-color:var(--color-clay-600)] sm:text-6xl">
          <InlineText
            dark
            fit
            singleLine
            label="Tiêu đề trang"
            value={d.title[lang]}
            onChange={(v) => set({ title: { ...d.title, [lang]: v } })}
            placeholder={hintOf(lang, d.title, "Tiêu đề trang")}
          />
        </h1>
        <InlineText
          dark
          label="Dòng mô tả dưới tiêu đề"
          value={d.subtitle[lang]}
          onChange={(v) => set({ subtitle: { ...d.subtitle, [lang]: v } })}
          placeholder={hintOf(lang, d.subtitle, "Thêm một dòng mô tả ngắn")}
          className="mt-5 max-w-3xl text-base font-semibold drop-shadow-md sm:text-xl"
        />
      </Container>

      <Modal
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        size="sm"
        icon={ImagePlus}
        title="Ảnh đầu trang"
        description="Ảnh ngang phủ hết dải đầu trang (máy tính hiện phần giữa ảnh) — nên chọn ảnh rõ nét, chủ thể ở giữa."
        footer={<Button onClick={() => setImageOpen(false)}>Xong</Button>}
      >
        <div className="flex justify-center">
          <ImageField
            value={d.image}
            onChange={(image) => set({ image })}
            folder="pages"
            crop={{ ratio: 12 / 5, width: 2400 }}
          />
        </div>
      </Modal>
    </section>
  );
}
