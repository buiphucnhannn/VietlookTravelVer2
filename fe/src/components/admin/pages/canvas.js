"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronRight,
  Compass,
  Eye,
  Film,
  Handshake,
  Headphones,
  HeartHandshake,
  ImagePlus,
  Languages,
  Layers,
  ListTree,
  MapPinned,
  MessageSquareQuote,
  Play,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import Link from "@/components/admin/Link";
import { cn } from "@/lib/utils";
import { parseVideo, videoThumb } from "@/lib/video";
import { siteConfig } from "@/constants/site";
import { ABOUT_COLLAGE, ABOUT_MAX_REASONS } from "@/data/about";
import RichText from "../RichText";
import { DragHandle, Sortable } from "../Sortable";
import { Button, ImageField, Modal, VideoChip, VideoField, VideoHelp } from "../ui";

/* =========================================================================
 * Trang thu nhỏ: sửa chữ ngay trên bản xem trước
 * ========================================================================= */

const LANG_NAME = { en: "tiếng Anh", zh: "中文", vi: "tiếng Việt" };
const MAX_VALUES = 12;
const MAX_STATS = 8;
const emptyLoc = () => ({ en: "", zh: "", vi: "" });

/** Chữ gợi ý cho ô đang trống: chữ của ngôn ngữ khác đã có (khi lưu sẽ tự dịch sang) hoặc lời nhắc */
const hintOf = (lang, loc, fallback) => otherOf(loc, lang) || fallback;
/** Chữ đầu tiên có nội dung ở ngôn ngữ KHÁC `lang` (thứ tự en → vi → zh) */
const otherOf = (loc, lang) =>
  ["en", "vi", "zh"]
    .filter((l) => l !== lang)
    .map((l) => loc?.[l])
    .find((v) => typeof v === "string" && v.trim()) ?? "";
/** Danh sách của ngôn ngữ KHÁC `lang` có nhiều dòng nhất */
const otherList = (list, lang) =>
  ["en", "vi", "zh"]
    .filter((l) => l !== lang)
    .map((l) => list?.[l] ?? [])
    .sort((a, b) => b.length - a.length)[0] ?? [];

/**
 * Dòng chữ sửa tại chỗ: trong suốt, tự cao theo nội dung, viền nét đứt khi rê chuột / đang gõ.
 * Kiểu chữ lấy từ className của khung ngoài (giống hệt chữ trên website).
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
    "col-start-1 row-start-1 min-w-0 px-2 py-1 break-words whitespace-pre-wrap [text-align:inherit]";
  return (
    <span className={cn(fit ? "inline-grid max-w-full" : "grid w-full", className)}>
      <span aria-hidden="true" className={cn(cell, "invisible")}>
        {/* ký tự &nbsp; cuối giữ chỗ cho dòng trống cuối cùng */}
        {value || placeholder}&nbsp;
      </span>
      <textarea
        rows={1}
        cols={1}
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
function LocText({ value, onChange, lang, hint, ...props }) {
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
function RemoveButton({ onClick, name, className }) {
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

/** Cụm nút nổi ở góc mỗi thẻ: tay nắm kéo để đổi chỗ + xoá */
function CardTools({ drag, onRemove, name }) {
  return (
    <span className="absolute -top-3.5 right-3 z-10 flex items-center rounded-full bg-white p-0.5 shadow-md ring-1 ring-slate-200">
      <DragHandle {...drag.handle} className="rounded-full" />
      <RemoveButton onClick={onRemove} name={name} />
    </span>
  );
}

/** Nút "thêm" viền nét đứt */
function AddButton({ children, onClick, dark, disabled, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-dashed px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        dark
          ? "border-white/40 text-white/80 hover:border-white hover:bg-white/10 hover:text-white"
          : "border-brand-300 text-brand-700 hover:border-brand-500 hover:bg-brand-50",
        className,
      )}
    >
      <Plus className="size-4" />
      {children}
    </button>
  );
}

/** Các thẻ chữ ngắn (phẩm chất, ngôn ngữ): sửa tại chỗ, kéo để đổi chỗ, thêm, xoá */
function InlineChips({ value, placeholders = [], onChange, dark, addLabel, newHint, name }) {
  const [focusAt, setFocusAt] = useState(-1);
  return (
    <>
      <Sortable items={value} onReorder={onChange} layout="grid" className="contents">
        {(item, i, drag) => {
          const hint = placeholders[i] || newHint;
          return (
            <span
              className={cn(
                "inline-flex max-w-full items-center rounded-full p-1 transition",
                dark
                  ? "border border-white/25 font-semibold text-white focus-within:border-white focus-within:bg-white/10"
                  : "bg-brand-50 text-sm font-medium text-brand-700 ring-1 ring-transparent focus-within:bg-white focus-within:ring-brand-400",
                drag.dragging && (dark ? "bg-brand-900" : "bg-white ring-brand-400"),
              )}
            >
              <DragHandle
                {...drag.handle}
                light={dark}
                className={cn(
                  "size-7 rounded-full",
                  !dark && "text-brand-700/50 hover:bg-brand-100 hover:text-brand-800",
                )}
              />
              <span className="inline-grid min-w-0">
                <span
                  aria-hidden="true"
                  className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre"
                >
                  {item || hint}
                </span>
                <input
                  size={1}
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
              <button
                type="button"
                onClick={() => onChange(value.filter((_, k) => k !== i))}
                aria-label={`Xoá ${name} ${i + 1}`}
                title="Xoá"
                className={cn(
                  "ml-1 grid size-7 shrink-0 place-items-center rounded-full transition",
                  dark
                    ? "text-white/60 hover:bg-white/15 hover:text-white"
                    : "text-brand-700/60 hover:bg-brand-100 hover:text-brand-800",
                )}
              >
                <X className="size-3.5" />
              </button>
            </span>
          );
        }}
      </Sortable>
      <AddButton
        dark={dark}
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

/** Tiêu đề khối + dòng phụ + gạch ngắn (giống tiêu đề khối trên website) */
function SectionTitle({ title, subtitle, align = "center" }) {
  const centered = align === "center";
  return (
    <header className={cn("mb-7", centered && "mx-auto max-w-3xl text-center")}>
      {title}
      {subtitle}
      <span
        aria-hidden="true"
        className={cn(
          "mt-4 block h-[3px] w-14 rounded-full bg-clay-500",
          centered ? "mx-auto" : "ml-2",
        )}
      />
    </header>
  );
}

/* =========================================================================
 * Khung "website thu nhỏ"
 * ========================================================================= */

export function MiniSite({ name, children }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_48px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-200">
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
      {children}
    </div>
  );
}

/**
 * Đầu trang giống website: dải ảnh ghép phủ tối, đường dẫn, tiêu đề trên nét cọ, dòng mô tả.
 * Ảnh đầu tiên đổi được (nút "Đổi ảnh"); `extraImages` là các ảnh ghép bên cạnh (chỉ để xem).
 */
export function MiniHero({ d, lang, set, fallbackImage, extraImages = [] }) {
  const [imageOpen, setImageOpen] = useState(false);
  const first = d.image || fallbackImage;
  const strip = [...new Set([first, ...extraImages].filter(Boolean))].slice(0, 3);
  return (
    <section className="relative isolate overflow-hidden bg-brand-950 text-white">
      <div className="absolute inset-0 -z-10 flex gap-[3px]">
        {strip.map((src, i) => (
          <div key={src} className={cn("relative h-full flex-1", i > 0 && "hidden md:block")}>
            <Image
              src={src}
              alt=""
              fill
              sizes="(min-width: 768px) 480px, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />

      {/* Nút đổi ảnh: nằm trên phần ảnh đầu tiên */}
      <button
        type="button"
        onClick={() => setImageOpen(true)}
        className="absolute top-3 left-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-md transition hover:bg-white"
      >
        <ImagePlus className="size-4" />
        {first ? "Đổi ảnh" : "Thêm ảnh"}
      </button>

      <div className="mx-auto flex min-h-[260px] max-w-4xl flex-col items-center justify-center px-4 pt-14 pb-10 text-center sm:min-h-[330px] sm:px-8">
        <p className="mb-4 flex max-w-full items-center gap-1.5 text-xs font-medium text-white/80 drop-shadow">
          Vietlook
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="truncate text-white">{d.title[lang] || otherOf(d.title, lang)}</span>
        </p>
        <h2 className="brush max-w-full text-3xl font-extrabold tracking-tight drop-shadow-md [--brush-color:var(--color-clay-600)] sm:text-5xl">
          <InlineText
            dark
            fit
            singleLine
            label="Tiêu đề trang"
            value={d.title[lang]}
            onChange={(v) => set({ title: { ...d.title, [lang]: v } })}
            placeholder={hintOf(lang, d.title, "Tiêu đề trang")}
            className="leading-tight"
          />
        </h2>
        <InlineText
          dark
          label="Dòng mô tả dưới tiêu đề"
          value={d.subtitle[lang]}
          onChange={(v) => set({ subtitle: { ...d.subtitle, [lang]: v } })}
          placeholder={hintOf(lang, d.subtitle, "Thêm một dòng mô tả ngắn")}
          className="mt-4 max-w-3xl text-base font-semibold drop-shadow-md sm:text-lg"
        />
      </div>

      <Modal
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        size="sm"
        icon={ImagePlus}
        title="Ảnh đầu trang"
        description="Nên chọn ảnh ngang, rõ nét."
        footer={<Button onClick={() => setImageOpen(false)}>Xong</Button>}
      >
        <div className="flex justify-center">
          <ImageField
            value={d.image}
            onChange={(image) => set({ image })}
            folder="pages"
            crop={{ ratio: 16 / 9, width: 1920 }}
          />
        </div>
      </Modal>
    </section>
  );
}

/* =========================================================================
 * Trang chính sách: menu các chính sách · bài viết · mục lục
 * ========================================================================= */

/** Các đề mục lớn trong bài → mục lục như trên website */
const tocOf = (html) =>
  [...(html ?? "").matchAll(/<h2[^>]*>(.*?)<\/h2>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);

const POLICY_LABEL = {
  menu: { en: "Policies", zh: "政策", vi: "Chính sách" },
  toc: { en: "On this page", zh: "本页内容", vi: "Trong trang này" },
};

/**
 * `menu`: [{ key, href, icon, title, active, onClick }] — các trang chính sách (bấm để chuyển sang sửa
 * trang đó; `onClick` hỏi lại nếu còn thay đổi chưa lưu)
 */
export function PolicyBody({ d, lang, set, menu = [] }) {
  const toc = tocOf(d.body[lang] || otherOf(d.body, lang));
  return (
    <div className="grid gap-6 px-3 py-6 sm:px-6 sm:py-8 xl:grid-cols-[250px_minmax(0,1fr)] xl:gap-8 xl:px-8 xl:py-10 2xl:grid-cols-[250px_minmax(0,1fr)_240px]">
      {/* Menu chính sách */}
      <nav className="self-start rounded-2xl border border-slate-200 bg-white p-2.5 xl:sticky xl:top-20">
        <p className="px-3 pt-2 pb-2.5 text-[11px] font-bold tracking-[0.18em] text-brand-700 uppercase">
          {POLICY_LABEL.menu[lang]}
        </p>
        <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">
          {menu.map((m) => (
            <li key={m.key} className="min-w-0">
              <Link
                href={m.href}
                onClick={m.active ? (e) => e.preventDefault() : m.onClick}
                aria-current={m.active ? "page" : undefined}
                title={m.active ? undefined : "Chuyển sang sửa trang này"}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition",
                  m.active
                    ? "cursor-default bg-brand-600 text-white shadow-sm"
                    : "text-ink hover:bg-brand-50 hover:text-brand-700",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    m.active ? "bg-white/15" : "bg-brand-50 text-brand-600",
                  )}
                >
                  <m.icon className="size-4" />
                </span>
                <span className="min-w-0 truncate">{m.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bài viết */}
      <div className="min-w-0 [&_.admin-prose]:text-[15px] [&_.admin-prose]:leading-7 sm:[&_.admin-prose]:text-base sm:[&_.admin-prose]:leading-8 [&_.admin-prose_h2]:text-2xl [&_.admin-prose_h2]:tracking-tight [&_.admin-prose_h3]:text-xl">
        {/* key theo ngôn ngữ: mỗi ngôn ngữ có lời nhắc riêng khi còn trống */}
        <RichText
          key={lang}
          value={d.body[lang]}
          onChange={(html) => set({ body: { ...d.body, [lang]: html } })}
          folder="pages"
          minHeight={360}
          placeholder={
            otherOf(d.body, lang)
              ? `Chưa có bản ${LANG_NAME[lang]} — khi lưu sẽ tự dịch từ ngôn ngữ đã viết. Bấm vào đây để tự viết…`
              : "Bấm vào đây để viết nội dung…"
          }
        />
      </div>

      {/* Mục lục tự tạo từ các đề mục lớn (chỉ trên màn rộng, giống website) */}
      <aside className="hidden self-start rounded-2xl border border-slate-200 bg-white p-4 2xl:sticky 2xl:top-20 2xl:block">
        <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-brand-700 uppercase">
          <ListTree className="size-4" />
          {POLICY_LABEL.toc[lang]}
        </p>
        {toc.length ? (
          <ol className="space-y-0.5 border-l-2 border-brand-100">
            {toc.map((text, i) => (
              <li key={i} className="py-1.5 pl-3.5 text-sm leading-snug text-muted">
                {text}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-relaxed text-slate-400">
            Các đề mục lớn trong bài sẽ tự hiện thành mục lục ở đây.
          </p>
        )}
      </aside>
    </div>
  );
}

/* =========================================================================
 * Trang Giới thiệu — đúng thứ tự các khối trên website:
 * câu chuyện + 4 ảnh · tầm nhìn – sứ mệnh – giá trị · vì sao chọn Vietlook · video + con số · đánh giá
 * ========================================================================= */

/** Danh sách theo ngôn ngữ: nếu ngôn ngữ này chưa có gì → hiện các ô trống theo số dòng của ngôn ngữ khác */
const rowsOf = (list, lang) => {
  const own = list[lang] ?? [];
  if (own.length) return own;
  const english = otherList(list, lang);
  return english.length ? english.map(() => "") : [""];
};

const VALUE_ICONS = [Rocket, HeartHandshake, Sparkles];
const REASON_ICONS = [Layers, Wallet, MapPinned, ShieldCheck, Headphones, Handshake];
const SECTION = "px-3 py-9 sm:px-8 sm:py-12 xl:px-10";

export function AboutBody({ data, lang, setData }) {
  const loc = (key) => ({
    lang,
    value: data[key],
    onChange: (v) => setData({ [key]: v }),
  });
  return (
    <>
      <StorySection data={data} lang={lang} setData={setData} loc={loc} />
      <ValuesSection data={data} lang={lang} setData={setData} loc={loc} />
      <WhySection data={data} lang={lang} setData={setData} loc={loc} />
      <NumbersSection data={data} lang={lang} setData={setData} loc={loc} />
      {/* Khối đánh giá của khách: dùng chung toàn website, không sửa ở đây */}
      <section className="flex flex-col items-center gap-2 bg-forest-700 px-4 py-8 text-center text-white">
        <MessageSquareQuote className="size-7 text-amber-brand" />
        <p className="text-lg font-bold">Đánh giá của khách</p>
        <p className="max-w-md text-sm leading-relaxed text-white/75">
          Cuối trang hiện các đánh giá chung của website. Phần này không sửa ở đây.
        </p>
      </section>
    </>
  );
}

/* ----- Câu chuyện + 4 ảnh ----- */

function StorySection({ data, lang, setData, loc }) {
  const [focusAt, setFocusAt] = useState(-1);
  const story = rowsOf(data.story, lang);
  const setStory = (next) => setData({ story: { ...data.story, [lang]: next } });
  const english = otherList(data.story, lang);

  return (
    <section className={SECTION}>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0 self-center">
          <LocText
            {...loc("storyEyebrow")}
            singleLine
            label="Dòng chữ nhỏ phía trên tiêu đề"
            hint="Dòng chữ nhỏ"
            className="text-xs font-bold tracking-[0.2em] text-sun-500 uppercase"
          />
          <LocText
            {...loc("storyTitle")}
            singleLine
            label="Tiêu đề khối câu chuyện"
            hint="Tiêu đề"
            className="mt-0.5 text-2xl leading-tight font-bold tracking-tight text-ink sm:text-3xl"
          />
          <Sortable
            items={story}
            onReorder={setStory}
            className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/80 sm:text-base"
          >
            {(p, i, drag) => (
              <div
                className={cn(
                  "flex items-start gap-0.5 rounded-xl",
                  drag.dragging && "bg-white ring-1 ring-brand-200",
                )}
              >
                <DragHandle {...drag.handle} className="mt-0.5 -ml-1" />
                <InlineText
                  label={`Đoạn ${i + 1}`}
                  value={p}
                  autoFocus={i === focusAt}
                  onChange={(v) => setStory(story.map((x, k) => (k === i ? v : x)))}
                  placeholder={english[i] || "Viết một đoạn kể về Vietlook…"}
                  className="min-w-0 flex-1"
                />
                <RemoveButton
                  name={`đoạn ${i + 1}`}
                  className="mt-0.5"
                  onClick={() => setStory(story.filter((_, k) => k !== i))}
                />
              </div>
            )}
          </Sortable>
          <AddButton
            className="mt-4 ml-7"
            onClick={() => {
              setFocusAt(story.length);
              setStory([...story, ""]);
            }}
          >
            Thêm đoạn
          </AddButton>

          <div className="mt-7 flex flex-wrap items-center gap-2 pl-1">
            <Languages className="size-5 shrink-0 text-brand-600" />
            <InlineChips
              name="Ngôn ngữ hướng dẫn viên"
              value={data.languages}
              onChange={(languages) => setData({ languages })}
              addLabel="Thêm ngôn ngữ"
              newHint="VD: English"
            />
          </div>
          <p className="mt-2 pl-1 text-xs text-slate-400">
            Ngôn ngữ của hướng dẫn viên — hiện giống nhau ở cả ba bản EN, 中文, VI.
          </p>
        </div>

        <Collage value={data.collage} onChange={(collage) => setData({ collage })} />
      </div>
    </section>
  );
}

/** Lưới 2×2 ảnh cạnh câu chuyện: bấm để đổi ảnh, giữ và kéo để đổi chỗ */
function Collage({ value, onChange }) {
  const [editing, setEditing] = useState(-1);
  return (
    <>
      <Sortable
        items={value}
        onReorder={onChange}
        layout="grid"
        className="grid h-[340px] grid-cols-2 grid-rows-2 gap-3 sm:h-[460px] sm:gap-4 lg:h-full lg:min-h-[460px]"
      >
        {(src, i, drag) => (
          <button
            type="button"
            {...drag.handle}
            onClick={() => setEditing(i)}
            aria-label={`Ảnh ${i + 1}: bấm để đổi ảnh, giữ và kéo để đổi chỗ`}
            className={cn(
              "group absolute inset-0 overflow-hidden rounded-3xl bg-slate-200 shadow-lg ring-brand-400 transition focus-visible:ring-4 focus-visible:outline-none",
              drag.dragging && "ring-4",
            )}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="(min-width: 1024px) 320px, 50vw"
              className="object-cover"
            />
            <span className="absolute right-2.5 bottom-2.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-slate-800 shadow-md transition group-hover:bg-white">
              <ImagePlus className="size-3.5" />
              Đổi ảnh
            </span>
          </button>
        )}
      </Sortable>

      <Modal
        open={editing >= 0}
        onClose={() => setEditing(-1)}
        size="sm"
        icon={ImagePlus}
        title={`Ảnh ${editing + 1} cạnh câu chuyện`}
        description="Nên chọn ảnh rõ nét. Bỏ ảnh thì website dùng lại ảnh có sẵn."
        footer={<Button onClick={() => setEditing(-1)}>Xong</Button>}
      >
        <div className="flex justify-center">
          {editing >= 0 && (
            <ImageField
              value={value[editing]}
              onChange={(image) =>
                onChange(value.map((x, k) => (k === editing ? image || ABOUT_COLLAGE[k] : x)))
              }
              folder="pages"
              aspect="aspect-square"
              crop={{ width: 1000 }}
            />
          )}
        </div>
      </Modal>
    </>
  );
}

/* ----- Tầm nhìn – sứ mệnh – giá trị cốt lõi – phẩm chất ----- */

function ValuesSection({ data, lang, setData, loc }) {
  const [focusAt, setFocusAt] = useState(-1);
  const values = data.values;
  const setValues = (next) => setData({ values: next });
  const setValue = (i, field, v) =>
    setValues(values.map((x, k) => (k === i ? { ...x, [field]: v } : x)));
  const people = rowsOf(data.people, lang);

  return (
    <section className={cn(SECTION, "bg-brand-950 text-white")}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { key: "vision", icon: Eye, name: "Tầm nhìn", hint: "Viết tầm nhìn của công ty…" },
          { key: "mission", icon: Compass, name: "Sứ mệnh", hint: "Viết sứ mệnh của công ty…" },
        ].map((x) => (
          <div key={x.key} className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
            <x.icon className="ml-2 size-8 text-amber-brand" />
            <LocText
              {...loc(`${x.key}Title`)}
              dark
              singleLine
              label={`Tiêu đề ô ${x.name}`}
              hint={x.name}
              className="mt-2 text-xl font-bold sm:text-2xl"
            />
            <LocText
              {...loc(x.key)}
              dark
              label={x.name}
              hint={x.hint}
              className="mt-0.5 text-base text-white/85 sm:text-lg"
            />
          </div>
        ))}
      </div>

      <LocText
        {...loc("valuesTitle")}
        dark
        singleLine
        label="Tiêu đề khối giá trị"
        hint="Tiêu đề khối giá trị"
        className="mt-10 text-center text-2xl font-bold sm:text-3xl"
      />
      <Sortable
        items={values}
        onReorder={setValues}
        layout="grid"
        className="mt-8 grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3"
      >
        {(v, i, drag) => {
          const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
          return (
            <div className="group relative h-full rounded-3xl bg-white p-4 text-ink sm:p-5">
              <CardTools
                drag={drag}
                name={`giá trị ${i + 1}`}
                onRemove={() => setValues(values.filter((_, k) => k !== i))}
              />
              <span className="ml-2 grid size-11 place-items-center rounded-xl bg-sun-500 text-white">
                <Icon className="size-5" />
              </span>
              <LocText
                lang={lang}
                value={v.title}
                onChange={(t) => setValue(i, "title", t)}
                singleLine
                autoFocus={i === focusAt}
                label={`Tên giá trị ${i + 1}`}
                hint="Tên giá trị"
                className="mt-3 text-lg leading-snug font-bold"
              />
              <LocText
                lang={lang}
                value={v.text}
                onChange={(t) => setValue(i, "text", t)}
                label={`Mô tả giá trị ${i + 1}`}
                hint="Mô tả ngắn một hai câu"
                className="mt-0.5 text-sm leading-relaxed text-muted"
              />
            </div>
          );
        }}
      </Sortable>
      <div className="mt-5 flex justify-center">
        {values.length < MAX_VALUES ? (
          <AddButton
            dark
            onClick={() => {
              setFocusAt(values.length);
              setValues([...values, { title: emptyLoc(), text: emptyLoc() }]);
            }}
          >
            Thêm giá trị
          </AddButton>
        ) : (
          <p className="text-xs text-white/60">
            Đã đủ {MAX_VALUES} giá trị — xoá bớt nếu muốn thêm mục mới.
          </p>
        )}
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
        <InlineChips
          dark
          name="Phẩm chất"
          value={people}
          placeholders={otherList(data.people, lang)}
          onChange={(next) => setData({ people: { ...data.people, [lang]: next } })}
          addLabel="Thêm phẩm chất"
          newHint="VD: Tận tâm"
        />
      </div>
    </section>
  );
}

/* ----- Vì sao chọn Vietlook ----- */

function WhySection({ data, lang, setData, loc }) {
  const [focusAt, setFocusAt] = useState(-1);
  const reasons = data.reasons;
  const setReasons = (next) => setData({ reasons: next });
  const setReason = (i, field, v) =>
    setReasons(reasons.map((x, k) => (k === i ? { ...x, [field]: v } : x)));

  return (
    <section className={cn(SECTION, "bg-gradient-to-b from-emerald-50/70 to-white")}>
      <SectionTitle
        title={
          <LocText
            {...loc("whyTitle")}
            singleLine
            label="Tiêu đề khối lý do"
            hint="Tiêu đề khối lý do"
            className="text-2xl leading-tight font-bold tracking-tight text-ink sm:text-3xl"
          />
        }
        subtitle={
          <LocText
            {...loc("whySubtitle")}
            label="Dòng mô tả khối lý do"
            hint="Thêm một dòng mô tả ngắn"
            className="mt-1 text-base text-ink/75"
          />
        }
      />
      <Sortable
        items={reasons}
        onReorder={setReasons}
        layout="grid"
        className="grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-3"
      >
        {(r, i, drag) => {
          const Icon = REASON_ICONS[i % REASON_ICONS.length];
          return (
            <div
              className={cn(
                "group relative flex h-full gap-2 rounded-2xl p-2",
                drag.dragging && "bg-white ring-1 ring-brand-200",
              )}
            >
              <CardTools
                drag={drag}
                name={`lý do ${i + 1}`}
                onRemove={() => setReasons(reasons.filter((_, k) => k !== i))}
              />
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-forest-700 text-white shadow-lg shadow-forest-700/25">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <LocText
                  lang={lang}
                  value={r.title}
                  onChange={(t) => setReason(i, "title", t)}
                  singleLine
                  autoFocus={i === focusAt}
                  label={`Lý do ${i + 1}`}
                  hint="Tên lý do"
                  className="pr-16 text-lg leading-snug font-semibold tracking-tight text-ink"
                />
                <LocText
                  lang={lang}
                  value={r.text}
                  onChange={(t) => setReason(i, "text", t)}
                  label={`Mô tả lý do ${i + 1}`}
                  hint="Mô tả ngắn một hai câu"
                  className="text-sm leading-relaxed text-muted"
                />
              </div>
            </div>
          );
        }}
      </Sortable>
      <div className="mt-5 flex justify-center">
        {reasons.length < ABOUT_MAX_REASONS ? (
          <AddButton
            onClick={() => {
              setFocusAt(reasons.length);
              setReasons([...reasons, { title: emptyLoc(), text: emptyLoc() }]);
            }}
          >
            Thêm lý do
          </AddButton>
        ) : (
          <p className="text-xs text-slate-400">
            Khối này hiện tối đa {ABOUT_MAX_REASONS} lý do — xoá bớt nếu muốn thêm mục mới.
          </p>
        )}
      </div>
    </section>
  );
}

/* ----- Video + những con số + nút liên hệ ----- */

function NumbersSection({ data, lang, setData, loc }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [focusAt, setFocusAt] = useState(-1);
  const stats = data.stats;
  const setStats = (next) => setData({ stats: next });
  const setStat = (i, field, v) =>
    setStats(stats.map((x, k) => (k === i ? { ...x, [field]: v } : x)));
  const video = parseVideo(data.video);
  // ảnh xem trước: video CMS (YouTube / Drive) hoặc video mặc định của website
  const thumb = video
    ? videoThumb(data.video, { large: true })
    : `https://i.ytimg.com/vi/${siteConfig.youtubeIds[0]}/hqdefault.jpg`;

  return (
    <section className={cn(SECTION, "bg-slate-50")}>
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Video */}
        <div className="relative aspect-video overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={thumb}
            src={thumb}
            alt=""
            onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            className="absolute inset-0 size-full object-cover opacity-90"
          />
          {video && (
            <VideoChip provider={video.provider} className="absolute top-3.5 right-3 shadow-sm" />
          )}
          <span className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-sun-500 text-white shadow-lg ring-4 ring-white/80">
            <Play className="size-6 translate-x-0.5 fill-current" />
          </span>
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className="absolute top-3 left-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-md transition hover:bg-white"
          >
            <Film className="size-4" />
            Đổi video
          </button>
        </div>

        {/* Con số */}
        <div className="min-w-0">
          <SectionTitle
            align="left"
            title={
              <LocText
                {...loc("numbersTitle")}
                singleLine
                label="Tiêu đề khối con số"
                hint="Tiêu đề khối con số"
                className="text-2xl leading-tight font-bold tracking-tight text-ink sm:text-3xl"
              />
            }
          />
          <Sortable
            items={stats}
            onReorder={setStats}
            layout="grid"
            className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4"
          >
            {(s, i, drag) => (
              <div className="group relative flex h-full flex-col rounded-2xl bg-white p-2.5 ring-1 ring-slate-200 sm:p-3.5">
                <CardTools
                  drag={drag}
                  name={`con số ${i + 1}`}
                  onRemove={() => setStats(stats.filter((_, k) => k !== i))}
                />
                <InlineText
                  singleLine
                  autoFocus={i === focusAt}
                  label={`Con số ${i + 1}`}
                  value={s.value}
                  onChange={(v) => setStat(i, "value", v)}
                  placeholder="VD: 2009"
                  className="text-2xl leading-tight font-extrabold text-brand-600 sm:text-3xl"
                />
                <LocText
                  lang={lang}
                  value={s.label}
                  onChange={(v) => setStat(i, "label", v)}
                  singleLine
                  label={`Chú thích con số ${i + 1}`}
                  hint="Chú thích"
                  className="text-sm text-muted"
                />
              </div>
            )}
          </Sortable>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {/* Nút dẫn sang trang Liên hệ: sửa được chữ trên nút */}
            <span className="inline-flex max-w-full items-center rounded-lg bg-clay-600 px-3 py-1.5 font-semibold text-white shadow-sm">
              <LocText
                {...loc("ctaLabel")}
                dark
                fit
                singleLine
                label="Chữ trên nút liên hệ"
                hint="Chữ trên nút"
                className="text-sm"
              />
            </span>
            {stats.length < MAX_STATS && (
              <AddButton
                onClick={() => {
                  setFocusAt(stats.length);
                  setStats([...stats, { value: "", label: emptyLoc() }]);
                }}
              >
                Thêm con số
              </AddButton>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        size="sm"
        icon={Film}
        title="Video giới thiệu"
        description="Dán link video YouTube hoặc Google Drive. Để trống thì website dùng video có sẵn."
        footer={<Button onClick={() => setVideoOpen(false)}>Xong</Button>}
      >
        <div className="space-y-3">
          <VideoField value={data.video} onChange={(v) => setData({ video: v })} />
          <details className="group/help">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-sun-600 [&::-webkit-details-marker]:hidden">
              Cách lấy link video
            </summary>
            <div className="mt-2">
              <VideoHelp />
            </div>
          </details>
        </div>
      </Modal>
    </section>
  );
}
