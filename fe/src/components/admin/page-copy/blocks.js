"use client";

import { createContext, useContext, useState } from "react";
import { ArrowUpRight, Crop, ImagePlus, RotateCcw, Upload } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { LANGS, specAt } from "@/lib/page-copy/resolve.mjs";
import Link from "../Link";
import { canRecrop, useImageCrop } from "../ImageCropper";
import { ImageField, ImageUrlDialog, Spinner, useUi } from "../ui";
import { InlineText, Pic, Sec } from "../home/shared";

/**
 * KHỐI DÙNG CHUNG cho bản xem trước "Giao diện trang" (CMS → Giao diện trang → 1 trang).
 *
 * Bản xem trước của mỗi trang (previews/*.js) chỉ việc ghép các khối này theo đúng thứ tự / bố cục trang thật:
 *   <Txt f="heroTitle" className="…kiểu chữ…" />      chữ bấm vào là sửa (đúng ngôn ngữ đang chọn)
 *   <Img f="asideImage" aspect="aspect-[16/9]" />      ô ảnh có nút Đổi ảnh / Dán link / Cắt ảnh / Về ảnh mặc định
 *   <BgPhoto f="heroImage" />                          ảnh nền phủ kín khối + thanh nút đổi ảnh nhỏ ở góc
 *   <Sec name="Tên khối">…</Sec>                        1 khối của trang (nhãn tên khối ở góc)
 *   <SectionHead title="…" subtitle="…" />             tiêu đề khối (căn giữa / căn trái, có gạch ngắn)
 *   <ListOf f="services">{(i) => …}</ListOf>           lặp theo số phần tử của 1 danh sách
 *   <FaqList f="faq" />                                 câu hỏi thường gặp (mở sẵn để sửa)
 *   <ModuleNote href="/cars" …>                         phần dữ liệu có mục quản lý riêng (không sửa ở đây)
 * `f` là đường dẫn ô trong registry ("heroTitle", "faq.2.q", "heroImages.1").
 * Ô đã sửa khác mặc định có chấm cam; rê chuột / bấm vào ô → nút "Khôi phục mặc định".
 */

/* ---------- Dữ liệu đang soạn ---------- */

/**
 * { entry, state, setState, defs, lang } — state: dữ liệu đang soạn (fillPage), defs: mặc định { en, zh, vi }
 * (pageDefaults từng ngôn ngữ), setState(fn).
 */
export const PageCopyContext = createContext(null);

const keysOf = (path) => String(path).split(".");
const getIn = (obj, keys) => keys.reduce((a, k) => a?.[k], obj);
const setIn = (obj, keys, value) => {
  if (!keys.length) return value;
  const [k, ...rest] = keys;
  const next = Array.isArray(obj) ? [...obj] : { ...obj };
  next[k] = setIn(obj?.[k], rest, value);
  return next;
};
const same = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();

/** Ô lá (chữ 3 ngôn ngữ / ảnh) đã khác mặc định chưa */
export function leafEdited(spec, value, defs, keys) {
  if (spec?.type === "image") return !same(value, getIn(defs.en, keys));
  return LANGS.some((l) => !same(value?.[l], getIn(defs[l], keys)));
}

/**
 * 1 ô theo đường dẫn: { spec, value (chữ đúng ngôn ngữ / link ảnh), def, edited, set(v), reset() }.
 * Dùng khi cần tự dựng ô sửa (các khối bên dưới đã dùng sẵn).
 */
export function useCopyField(path) {
  const ctx = useContext(PageCopyContext);
  const keys = keysOf(path);
  const spec = specAt(ctx?.entry, path);
  const raw = getIn(ctx?.state, keys);
  const image = spec?.type === "image";
  const def = image ? getIn(ctx?.defs.en, keys) : getIn(ctx?.defs[ctx?.lang], keys);
  return {
    spec,
    lang: ctx?.lang,
    value: image ? (raw ?? "") : (raw?.[ctx?.lang] ?? ""),
    def: def ?? "",
    edited: !!spec && !!ctx && leafEdited(spec, raw, ctx.defs, keys),
    set: (v) => ctx.setState((s) => setIn(s, image ? keys : [...keys, ctx.lang], v)),
    /** Về mặc định (cả 3 ngôn ngữ) */
    reset: () =>
      ctx.setState((s) =>
        setIn(
          s,
          keys,
          image
            ? getIn(ctx.defs.en, keys)
            : Object.fromEntries(LANGS.map((l) => [l, getIn(ctx.defs[l], keys) ?? ""])),
        ),
      ),
  };
}

/** Chữ / ảnh đang dùng của 1 ô, chỉ để hiện (vd. đường dẫn "Vietlook › tiêu đề" lặp lại tiêu đề trang) */
export function Shown({ f }) {
  const fld = useCopyField(f);
  return fld.value || fld.def;
}

/** Số phần tử của 1 danh sách (theo khai báo) */
export function useListCount(path) {
  const ctx = useContext(PageCopyContext);
  return specAt(ctx?.entry, path)?.count ?? 0;
}

/* ---------- Chấm "đã sửa" + nút khôi phục ---------- */

function EditedMark({ onReset, label, className }) {
  return (
    <span className={cn("absolute -top-2.5 -right-2.5 z-20 flex", className)}>
      {/* chấm cam: luôn hiện; rê chuột / đang sửa → hiện nút khôi phục */}
      <span
        aria-hidden
        className="size-2.5 rounded-full bg-amber-400 ring-2 ring-white group-focus-within/f:hidden group-hover/f:hidden"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()} // giữ con trỏ trong ô chữ
        onClick={onReset}
        title={`Khôi phục mặc định${label ? ` — ${label}` : ""}`}
        aria-label="Khôi phục mặc định"
        className="hidden size-6 place-items-center rounded-full bg-amber-400 text-white shadow-md ring-2 ring-white transition group-focus-within/f:grid group-hover/f:grid hover:scale-110 hover:bg-amber-500"
      >
        <RotateCcw className="size-3" />
      </button>
    </span>
  );
}

/* ---------- Chữ sửa tại chỗ ---------- */

/**
 * 1 ô chữ trên bản xem trước — trông y như chữ trên trang (kiểu chữ ở `className`), bấm vào là gõ.
 * `dark`: chữ nằm trên nền tối / ảnh. Đoạn văn (kiểu "para") tự cho xuống dòng.
 * Xoá trống ô → hiện mờ câu mặc định (lưu lại = dùng câu mặc định).
 */
export function Txt({ f, className, dark, label }) {
  const fld = useCopyField(f);
  if (!fld.spec) return null;
  const name = label ?? fld.spec.label;
  return (
    <span className="group/f relative inline-grid max-w-full">
      <InlineText
        value={fld.value}
        placeholder={fld.def || "…"}
        onChange={fld.set}
        label={name}
        multiline={fld.spec.type === "para"}
        light={!dark}
        maxLength={fld.spec.max}
        className={className}
      />
      {/* rê chuột: nhãn xanh "Bấm để sửa · tên ô"; đang gõ: thanh Xong / Bỏ — do InlineText vẽ */}
      {fld.edited && <EditedMark onReset={fld.reset} label={name} />}
    </span>
  );
}

/* ---------- Ảnh ---------- */

/**
 * Ô ảnh (ảnh chi tiết trong khối): đủ nút Đổi ảnh / Dán link / Cắt ảnh / Về ảnh mặc định (ImageField).
 * `aspect`: tỉ lệ khung đúng như trên web.
 */
export function Img({ f, aspect = "aspect-[16/10]", className, label }) {
  const fld = useCopyField(f);
  if (!fld.spec) return null;
  return (
    <div className={cn("group/f relative w-full [&>div]:max-w-none", className)}>
      <ImageField
        value={fld.value}
        onChange={(v) => fld.set(v || fld.def)}
        folder="pages"
        aspect={aspect}
        crop={fld.spec.crop}
        label={label ?? fld.spec.label}
        fallback={fld.def || undefined}
      />
      {fld.edited && <EditedMark onReset={fld.reset} label={fld.spec.label} />}
    </div>
  );
}

/** Nút nhỏ trên thanh ảnh nền */
function PillBtn({ icon: Icon, label, onClick, iconOnly }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
    >
      <Icon className="size-3.5 shrink-0" />
      {!iconOnly && <span className="max-sm:hidden">{label}</span>}
    </button>
  );
}

/**
 * Thanh đổi ảnh nhỏ (cho ảnh nền phủ kín khối, nơi không đặt được ô ảnh lớn):
 * Đổi ảnh · Dán link · Cắt ảnh · Về ảnh mặc định. Kéo thả ảnh vào khối cũng được (BgPhoto).
 */
export function ImagePill({ f, className, title, floating = true }) {
  const fld = useCopyField(f);
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const cropper = useImageCrop(fld.spec?.crop ?? { ratio: 16 / 9, width: 1920 }, "pages");
  if (!fld.spec) return null;

  const run = async (job, done) => {
    setBusy(true);
    try {
      const url = await job();
      if (url) {
        fld.set(url);
        toast(done);
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
        fld.set(urls[0]);
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

  return (
    <div
      className={cn(
        "group/f z-20 flex items-center gap-0.5 rounded-full bg-white/95 p-0.5 pl-2.5 shadow-lg ring-1 ring-slate-900/10 backdrop-blur",
        floating ? "absolute" : "relative",
        className,
      )}
    >
      <span className="mr-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
        <ImagePlus className="size-3.5 text-brand-600" />
        <span className="max-w-32 truncate max-md:hidden">{title ?? fld.spec.label}</span>
      </span>
      {busy ? (
        <Spinner className="m-1.5 size-4" />
      ) : (
        <>
          <PillBtn icon={Upload} label="Đổi ảnh" onClick={() => setLinkOpen(true)} />
          {canRecrop(fld.value) && (
            <PillBtn
              icon={Crop}
              label="Cắt ảnh"
              iconOnly
              onClick={() => run(() => cropper.recrop(fld.value), "Đã cắt lại ảnh")}
            />
          )}
          {fld.edited && (
            <PillBtn
              icon={RotateCcw}
              label="Về ảnh mặc định"
              iconOnly
              onClick={() => {
                fld.reset();
                toast("Đã trả về ảnh mặc định — bấm Lưu để lưu lại");
              }}
            />
          )}
        </>
      )}
      {fld.edited && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-400 ring-2 ring-white"
        />
      )}
      <ImageUrlDialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={fromLinks}
        onFiles={([file]) =>
          file &&
          run(
            async () => (await cropper.uploadFiles([file], { max: 1 }))[0],
            "Đã chọn ảnh — bấm Lưu để lưu lại",
          )
        }
        busy={busy}
      />
      {cropper.dialog}
    </div>
  );
}

/**
 * Ảnh nền phủ kín khối cha (cha cần `relative isolate`) + thanh đổi ảnh ở góc (`pill`: lớp vị trí,
 * mặc định góc trên bên phải). `fade`: lớp phủ làm mờ ảnh như trang thật (vd. "bg-white/85").
 */
export function BgPhoto({ f, sizes = "1200px", className, fade, pill = "top-3 right-3", title }) {
  const fld = useCopyField(f);
  return (
    <>
      <span className={cn("absolute inset-0 -z-10", className)}>
        <Pic src={fld.value || fld.def} sizes={sizes} />
      </span>
      {fade && <span className={cn("absolute inset-0 -z-10", fade)} />}
      <ImagePill f={f} className={pill} title={title} />
    </>
  );
}

/* ---------- Bố cục ---------- */

export { Sec };

/** Lớp phủ ảnh nền giống components/ui/BgImage.js (dùng làm `fade` của BgPhoto) */
export const TONES = {
  light: "bg-gradient-to-b from-white/92 via-white/78 to-white/60",
  mist: "bg-gradient-to-b from-[#f2f7fb]/92 via-[#f2f7fb]/80 to-[#f2f7fb]/65",
  night: "bg-gradient-to-r from-[#1c2630]/92 via-[#1c2630]/70 to-[#1c2630]/35",
  dark: "bg-gradient-to-r from-brand-950/90 via-brand-950/70 to-brand-950/30",
};

/** Lặp theo số phần tử của danh sách `f`: children(i) */
export function ListOf({ f, children }) {
  const n = useListCount(f);
  return Array.from({ length: n }, (_, i) => children(i));
}

/**
 * Tiêu đề khối như trang thật: (dòng nhỏ in hoa) · tiêu đề đậm · mô tả · gạch ngắn.
 * title / subtitle / eyebrow: đường dẫn ô. `align`: "center" | "left". `bar`: màu gạch ("clay" | "amber" | false).
 */
export function SectionHead({
  eyebrow,
  title,
  subtitle,
  align = "center",
  dark,
  bar = "clay",
  className,
}) {
  const center = align === "center";
  return (
    <header
      className={cn(
        "mb-6 flex flex-col",
        center ? "mx-auto max-w-2xl items-center text-center" : "max-w-2xl items-start",
        className,
      )}
    >
      {eyebrow && (
        <Txt
          f={eyebrow}
          dark={dark}
          className={cn(
            "mb-2 text-[0.62rem] font-bold tracking-[0.18em] uppercase",
            dark ? "text-amber-brand" : "text-clay-600",
          )}
        />
      )}
      {title && (
        <Txt
          f={title}
          dark={dark}
          className={cn(
            "text-xl leading-tight font-bold tracking-[-0.03em] sm:text-[1.65rem]",
            dark ? "text-white" : "text-ink",
          )}
        />
      )}
      {subtitle && (
        <Txt
          f={subtitle}
          dark={dark}
          className={cn("mt-2 text-xs sm:text-[0.85rem]", dark ? "text-white/75" : "text-ink/70")}
        />
      )}
      {bar && (
        <span
          aria-hidden
          className={cn(
            "mt-3.5 block h-[3px] w-10 rounded-full",
            bar === "amber" ? "bg-amber-brand" : "bg-clay-500",
          )}
        />
      )}
    </header>
  );
}

/** Nút trên trang (chữ trên nút sửa được). `variant`: "solid" | "outline" | "clay" */
export function CtaButton({ f, variant = "solid", icon: Icon, className }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-bold",
        variant === "solid" && "bg-amber-brand text-ink shadow-md",
        variant === "clay" && "bg-clay-500 text-white shadow-md",
        variant === "outline" && "border-2 border-white/50 text-white",
        className,
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" />}
      <Txt f={f} dark={variant !== "solid"} />
    </span>
  );
}

/**
 * Câu hỏi thường gặp: mỗi câu là 1 thẻ (câu hỏi + trả lời mở sẵn để sửa).
 * `numbered`: có số thứ tự 01, 02…; `tone`: nền thẻ.
 */
export function FaqList({ f, numbered, className, card = "bg-white ring-1 ring-sand-300/70" }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <ListOf f={f}>
        {(i) => (
          <div key={i} className={cn("rounded-2xl p-4", card)}>
            <div className="flex items-start gap-3">
              {numbered && (
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white text-[11px] font-bold text-[#a26a00] ring-1 ring-amber-brand/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col items-start">
                <Txt f={`${f}.${i}.q`} className="text-[13px] font-semibold text-ink" />
                <Txt f={`${f}.${i}.a`} className="mt-1.5 text-xs leading-relaxed text-muted" />
              </div>
            </div>
          </div>
        )}
      </ListOf>
    </div>
  );
}

/**
 * Phần dữ liệu có mục quản lý riêng (đội xe, bảng giá, gói visa, đánh giá…): khung nét đứt mô phỏng vị trí
 * trên trang + 1 dòng nói rõ sửa ở đâu. `children`: mô phỏng nhẹ (tuỳ chọn).
 */
export function ModuleNote({ icon: Icon, title, text, href, linkText, dark, className, children }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed p-4 text-center sm:p-5",
        dark ? "border-white/25 bg-white/[0.04]" : "border-slate-300 bg-white/70",
        className,
      )}
    >
      {children}
      <div className="mx-auto flex max-w-md flex-col items-center gap-1.5">
        {Icon && (
          <span
            className={cn(
              "grid size-9 place-items-center rounded-xl",
              dark ? "bg-white/10 text-amber-brand" : "bg-brand-50 text-brand-600",
            )}
          >
            <Icon className="size-[18px]" />
          </span>
        )}
        <p className={cn("text-[13px] font-semibold", dark ? "text-white" : "text-slate-700")}>
          {title}
        </p>
        {text && (
          <p
            className={cn(
              "text-[11.5px] leading-relaxed",
              dark ? "text-white/65" : "text-slate-500",
            )}
          >
            {text}
          </p>
        )}
        {href && (
          <Link
            href={href}
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-semibold transition",
              dark
                ? "bg-white/10 text-amber-brand hover:bg-white/15"
                : "bg-brand-50 text-brand-700 hover:bg-brand-100",
            )}
          >
            {linkText}
            <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
