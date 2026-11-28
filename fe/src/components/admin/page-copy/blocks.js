"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowUpRight, ImageOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGS, specAt } from "@/lib/page-copy/resolve.mjs";
import Link from "../Link";
import { InlineText, Pic, Sec } from "../home/shared";
import { ImageSpot, SpotLayer, useImageChange, useImageHost } from "./image-edit";

/**
 * KHỐI DÙNG CHUNG cho bản xem trước "Giao diện trang" (CMS → Giao diện trang → 1 trang).
 *
 * Bản xem trước của mỗi trang (previews/*.js) chỉ việc ghép các khối này theo đúng thứ tự / bố cục trang thật:
 *   <Txt f="heroTitle" className="…kiểu chữ…" />      chữ bấm vào là sửa (đúng ngôn ngữ đang chọn)
 *   <Img f="asideImage" aspect="aspect-[16/9]" />      khung ảnh — bấm vào ảnh là đổi ảnh
 *   <BgPhoto f="heroImage" />                          ảnh nền phủ kín khối — bấm vào phần nền là đổi ảnh
 *   <Sec name="Tên khối">…</Sec>                        1 khối của trang (nhãn tên khối ở góc)
 *   <SectionHead title="…" subtitle="…" />             tiêu đề khối (căn giữa / căn trái, có gạch ngắn)
 *   <ListOf f="services">{(i) => …}</ListOf>           lặp theo số phần tử của 1 danh sách
 *   <FaqList f="faq" />                                 câu hỏi thường gặp (mở sẵn để sửa)
 *   <ModuleNote href="/cars" …>                         phần dữ liệu có mục quản lý riêng (không sửa ở đây)
 * `f` là đường dẫn ô trong registry ("heroTitle", "faq.2.q", "heroImages.1").
 * Ô đã sửa khác mặc định có chấm cam; rê chuột / bấm vào ô → nút "Khôi phục mặc định".
 *
 * Ảnh: mọi ảnh đều đổi NGAY TRÊN ẢNH (image-edit.js → ImageSpot): rê chuột → viền xanh + nhãn "Bấm để đổi ảnh",
 * bấm vào ảnh → hộp "Đổi ảnh"; "Cắt ảnh" / "Về ảnh mặc định" ở góc phải khi rê chuột.
 *
 * Hiệu năng: dữ liệu đang soạn nằm trong 1 "kho" (createCopyStore) — mỗi ô chỉ theo dõi đúng giá trị của nó
 * (useSyncExternalStore), nên gõ 1 chữ chỉ vẽ lại đúng ô đó, không vẽ lại cả trang thu nhỏ.
 */

/* ---------- Dữ liệu đang soạn ---------- */

/** Kho dữ liệu đang soạn: get() · set(next | fn) · subscribe(cb) */
export function createCopyStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set: (next) => {
      const v = typeof next === "function" ? next(state) : next;
      if (v === state) return;
      state = v;
      subs.forEach((cb) => cb());
    },
    subscribe: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
  };
}

/**
 * { entry, store, defs, lang } — store: kho dữ liệu đang soạn (fillPage, xem createCopyStore),
 * defs: mặc định { en, zh, vi } (pageDefaults từng ngôn ngữ).
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
const noSub = () => () => {};

/** Ô lá (chữ 3 ngôn ngữ / ảnh) đã khác mặc định chưa */
export function leafEdited(spec, value, defs, keys) {
  if (spec?.type === "image") return !same(value, getIn(defs.en, keys));
  return LANGS.some((l) => !same(value?.[l], getIn(defs[l], keys)));
}

/** Giá trị thô của 1 ô trong kho — chỉ vẽ lại khi chính ô này đổi */
function useLeaf(ctx, keys) {
  const store = ctx?.store;
  const snap = () => (store ? getIn(store.get(), keys) : undefined);
  return useSyncExternalStore(store?.subscribe ?? noSub, snap, snap);
}

/**
 * 1 ô theo đường dẫn: { spec, value (chữ đúng ngôn ngữ / link ảnh), def, edited, set(v), reset() }.
 * Dùng khi cần tự dựng ô sửa (các khối bên dưới đã dùng sẵn).
 */
export function useCopyField(path) {
  const ctx = useContext(PageCopyContext);
  const keys = useMemo(() => keysOf(path), [path]);
  const raw = useLeaf(ctx, keys);
  const spec = specAt(ctx?.entry, path);
  const image = spec?.type === "image";
  const lang = ctx?.lang;
  const def = image ? getIn(ctx?.defs.en, keys) : getIn(ctx?.defs[lang], keys);
  const set = useCallback(
    (v) => ctx.store.set((s) => setIn(s, image ? keys : [...keys, lang], v)),
    [ctx, keys, image, lang],
  );
  const reset = useCallback(
    () =>
      ctx.store.set((s) =>
        setIn(
          s,
          keys,
          image
            ? getIn(ctx.defs.en, keys)
            : Object.fromEntries(LANGS.map((l) => [l, getIn(ctx.defs[l], keys) ?? ""])),
        ),
      ),
    [ctx, keys, image],
  );
  return {
    spec,
    lang,
    value: image ? (raw ?? "") : (raw?.[lang] ?? ""),
    def: def ?? "",
    edited: !!spec && !!ctx && leafEdited(spec, raw, ctx.defs, keys),
    set,
    /** Về mặc định (cả 3 ngôn ngữ) */
    reset,
  };
}

/** Chữ / ảnh đang dùng của 1 ô, chỉ để hiện (vd. đường dẫn "Vietlook › tiêu đề" lặp lại tiêu đề trang) */
export function Shown({ f }) {
  const fld = useCopyField(f);
  return fld.value || fld.def;
}

/**
 * Hàm đọc chữ / ảnh đang dùng (chỉ để hiện, không sửa) theo đường dẫn: plain("heroImages.1"), plain("heroEyebrow").
 * Dùng khi truyền vào component của website cần chuỗi thật (link ảnh, chữ lặp lại ở đường dẫn trang…).
 * Chỉ vẽ lại component khi một trong các ô ĐÃ ĐỌC đổi (gõ ở ô khác không vẽ lại).
 */
export function usePlain() {
  const ctx = useContext(PageCopyContext);
  const read = useCallback(
    (state, path) => {
      const keys = keysOf(path);
      const raw = getIn(state, keys);
      if (specAt(ctx?.entry, path)?.type === "image") return raw || getIn(ctx?.defs.en, keys) || "";
      return raw?.[ctx?.lang] || getIn(ctx?.defs[ctx?.lang], keys) || "";
    },
    [ctx],
  );
  // các ô component này đã đọc (chỉ thêm, không bớt) → "ảnh chụp" để biết khi nào cần vẽ lại
  const [paths] = useState(() => new Set());
  const store = ctx?.store;
  const snap = () => (store ? [...paths].map((p) => read(store.get(), p)).join("\u0000") : "");
  useSyncExternalStore(store?.subscribe ?? noSub, snap, snap);
  return (path) => {
    paths.add(path);
    return store ? read(store.get(), path) : "";
  };
}

/** Số phần tử của 1 danh sách (theo khai báo) */
export function useListCount(path) {
  const ctx = useContext(PageCopyContext);
  return specAt(ctx?.entry, path)?.count ?? 0;
}

/* ---------- Chấm "đã sửa" + nút khôi phục ---------- */

function EditedMark({ onReset, label, className }) {
  return (
    <span data-edit-ui className={cn("absolute -top-2.5 -right-2.5 z-20 flex", className)}>
      {/* chấm cam: luôn hiện; rê chuột / đang sửa → hiện nút khôi phục */}
      <span
        aria-hidden
        className="size-2.5 [zoom:var(--pz,1)] rounded-full bg-amber-400 ring-2 ring-white group-focus-within/f:hidden group-hover/f:hidden"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()} // giữ con trỏ trong ô chữ
        onClick={onReset}
        title={`Khôi phục mặc định${label ? ` — ${label}` : ""}`}
        aria-label="Khôi phục mặc định"
        className="hidden size-6 [zoom:var(--pz,1)] place-items-center rounded-full bg-amber-400 text-white shadow-md ring-2 ring-white group-focus-within/f:grid group-hover/f:grid hover:bg-amber-500"
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
 * `placeholder`: chữ mờ khi ô trống mà không có câu mặc định (ô tuỳ chọn, vd. "Bấm để thêm…").
 * memo: chỉ vẽ lại khi chính ô này đổi (hoặc đổi ngôn ngữ).
 */
export const Txt = memo(function Txt({ f, className, dark, label, placeholder }) {
  const fld = useCopyField(f);
  if (!fld.spec) return null;
  const name = label ?? fld.spec.label;
  return (
    <span className="group/f relative inline-grid max-w-full">
      <InlineText
        value={fld.value}
        placeholder={fld.def || placeholder || "…"}
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
});

/* ---------- Ảnh ---------- */

/**
 * Lớp đổi ảnh cho ô ảnh `f`, đặt làm con trực tiếp của khung ảnh (`relative`) — bấm vào phần ảnh là đổi ảnh.
 * `tagAt` / `toolsAt`: vị trí nhãn "Bấm để đổi ảnh" / nút Cắt ảnh · Về mặc định. `host`: xem ImageSpot.
 */
export const ImageEdit = memo(function ImageEdit({ f, title, tagAt, toolsAt, host }) {
  const fld = useCopyField(f);
  if (!fld.spec) return null;
  return (
    <ImageSpot
      value={fld.value}
      onChange={fld.set}
      crop={fld.spec.crop}
      label={title ?? fld.spec.label}
      edited={fld.edited}
      onReset={fld.reset}
      tagAt={tagAt}
      toolsAt={toolsAt}
      host={host}
    />
  );
});

/**
 * Khung ảnh (ảnh chi tiết trong khối / ô chỉ có trong trình sửa) — bấm vào ảnh là đổi ảnh.
 * `aspect`: tỉ lệ khung đúng như trên web.
 */
export function Img({ f, aspect = "aspect-[16/10]", className, label }) {
  const fld = useCopyField(f);
  if (!fld.spec) return null;
  const src = fld.value || fld.def;
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200",
        aspect,
        className,
      )}
    >
      {src ? (
        <Pic src={src} sizes="600px" />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-slate-300">
          <ImageOff className="size-8" />
        </span>
      )}
      <ImageEdit f={f} title={label} />
    </div>
  );
}

/**
 * Lớp đổi ảnh đặt trong khung ảnh có sẵn (khung cha cần `relative`). Giữ tên cũ cho các bản xem trước;
 * `className` (vị trí thanh nút cũ) không còn dùng — nhãn / nút nằm ngay trên ảnh.
 */
export function ImagePill({ f, title }) {
  return <ImageEdit f={f} title={title} />;
}

/**
 * Ảnh nền phủ kín khối cha (cha cần `relative isolate`) — bấm vào phần nền ảnh là đổi ảnh.
 * `fade`: lớp phủ làm mờ ảnh như trang thật (vd. "bg-white/85").
 */
export function BgPhoto({ f, sizes = "1200px", className, fade, title, tagAt, toolsAt }) {
  const fld = useCopyField(f);
  return (
    <>
      <span className={cn("pointer-events-none absolute inset-0 -z-10", className)}>
        <Pic src={fld.value || fld.def} sizes={sizes} />
      </span>
      {fade && <span className={cn("pointer-events-none absolute inset-0 -z-10", fade)} />}
      <ImageEdit f={f} title={title} tagAt={tagAt} toolsAt={toolsAt} />
    </>
  );
}

/**
 * Ảnh phủ kín khung cha (cha cần `relative`), đúng như ảnh trên website — bấm vào ảnh là đổi ảnh.
 * `className`: lớp của lớp ảnh (vd. "-z-10"), `imgClassName`: lớp của ảnh (vd. "object-[50%_70%]").
 * `pill={false}`: chỉ hiện ảnh (không sửa ở chỗ này). `hero`: ảnh đầu trang (nhãn / nút nằm dưới thanh menu).
 */
export function Photo({
  f,
  sizes = "100vw",
  className,
  imgClassName,
  pill = true,
  title,
  hero,
  tagAt = hero ? HERO_TAG : undefined,
  toolsAt = hero ? HERO_TOOLS : undefined,
}) {
  const fld = useCopyField(f);
  return (
    <>
      <span className={cn("absolute inset-0", className)}>
        <Pic src={fld.value || fld.def} sizes={sizes} className={imgClassName} />
      </span>
      {pill && <ImageEdit f={f} title={title} tagAt={tagAt} toolsAt={toolsAt} />}
    </>
  );
}

/**
 * Thay next/image trong component của website (vd. BrushHero ImageComponent): hiện được cả ảnh vừa chọn chưa lưu
 * (blob:) — next/image không vẽ được loại ảnh này.
 */
export function PreviewImage({
  src,
  alt = "",
  className,
  style,
  preload,
  fetchPriority,
  priority,
  ...rest
}) {
  if (!src) return null;
  if (String(src).startsWith("blob:"))
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ảnh tạm trên máy, chưa có trên CDN
      <img
        src={src}
        alt={alt}
        className={cn("absolute inset-0 size-full", className)}
        style={style}
      />
    );
  return <Image src={src} alt={alt} className={className} style={style} {...rest} />;
}

/* ---------- Ảnh ghép của đầu trang (BrushHero) ---------- */

/** Vị trí nhãn / nút đổi ảnh ở ảnh đầu trang: góc dưới (không đè tiêu đề / thanh menu trong suốt của website) */
export const HERO_TAG = "left-3 bottom-3";
export const HERO_TOOLS = "right-3 bottom-3";

/** 1 cột ảnh của dải ảnh đầu trang: tự lo hộp đổi ảnh của ô `f`, báo hàm "mở" lên cho lớp chung */
function HeroCol({ f, title, on, register, className, tagAt, toolsAt }) {
  const fld = useCopyField(f);
  const img = useImageChange({ value: fld.value, onChange: fld.set, crop: fld.spec?.crop });
  const open = img.open;
  useLayoutEffect(() => register(f, open), [register, f, open]);
  return (
    <span data-col className={cn("relative h-full flex-1", className)}>
      <SpotLayer
        on={on}
        busy={img.busy}
        label={title ?? fld.spec?.label}
        edited={fld.edited}
        canCrop={img.canCrop}
        onOpen={img.open}
        onCrop={img.recrop}
        onReset={fld.reset}
        tagAt={tagAt}
        toolsAt={toolsAt}
      />
      {img.dialogs}
    </span>
  );
}

/**
 * Đổi ảnh dải 1–3 ảnh ghép của đầu trang (BrushHero) ngay trên từng ảnh: rê chuột lên ảnh nào thì viền + nhãn hiện
 * trên ảnh đó, bấm vào là đổi đúng ảnh đó. Cột dựng y như dải ảnh của website (điện thoại chỉ ảnh đầu; có khung ảnh
 * ghép bên phải → màn lớn chỉ giữ ảnh nền đầu). Đặt BÊN TRONG section của BrushHero.
 *   fields: đường dẫn các ô ảnh theo đúng thứ tự cột (đã bỏ ảnh trùng / trống như website)
 *   split : có khung ảnh ghép bên phải
 */
export function HeroImageSpots({ fields, split, titles, tagAt = HERO_TAG, toolsAt = HERO_TOOLS }) {
  const ref = useRef(null);
  const opens = useRef(new Map());
  const [active, setActive] = useState(0);
  const register = useCallback((f, open) => {
    opens.current.set(f, open);
  }, []);
  /** Cột (đang hiện) nằm dưới con trỏ */
  const colAt = (x) => {
    const cols = [...(ref.current?.querySelectorAll(":scope > [data-col]") ?? [])];
    const i = cols.findIndex((c) => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && x >= r.left && x <= r.right;
    });
    return i;
  };
  const on = useImageHost(
    ref,
    (e) => {
      const i = colAt(e.clientX);
      opens.current.get(fields[i >= 0 ? i : 0])?.();
    },
    (e) => {
      const i = colAt(e.clientX);
      if (i >= 0) setActive(i);
    },
    "section",
  );
  return (
    <span
      ref={ref}
      data-edit-ui
      className="pointer-events-none absolute inset-0 z-[25] flex gap-[3px]"
    >
      {fields.map((f, i) => (
        <HeroCol
          key={f}
          f={f}
          title={titles?.[i] ?? (fields.length > 1 ? `Ảnh đầu trang ${i + 1}` : undefined)}
          on={on && active === i}
          register={register}
          tagAt={tagAt}
          toolsAt={toolsAt}
          className={cn(i > 0 && "hidden md:block", i > 0 && split && "lg:hidden")}
        />
      ))}
    </span>
  );
}

/* Khung "giọt nước" 1–3 ảnh ghép bên phải đầu trang (BrushHero collage): ranh giới các dải ảnh chéo theo toạ độ 0–1 */
const BAND_EDGES = {
  1: [],
  2: [(x) => 0.68 - 0.3 * x],
  3: [(x) => 0.5 - 0.28 * x, (x) => 0.9 - 0.28 * x],
};
const BAND_CLIPS = {
  1: ["none"],
  2: ["polygon(0 0, 100% 0, 100% 38%, 0 68%)", "polygon(0 70.5%, 100% 40.5%, 100% 100%, 0 100%)"],
  3: [
    "polygon(0 0, 100% 0, 100% 22%, 0 50%)",
    "polygon(0 52.5%, 100% 24.5%, 100% 62%, 0 90%)",
    "polygon(0 92.5%, 100% 64.5%, 100% 100%, 0 100%)",
  ],
};

/** 1 dải ảnh của khung ghép: hộp đổi ảnh riêng của ô `f`; nhãn + nút chỉ hiện khi dải đang được rê chuột */
function CollageBand({ f, index, show, register }) {
  const fld = useCopyField(f);
  const img = useImageChange({ value: fld.value, onChange: fld.set, crop: fld.spec?.crop });
  const open = img.open;
  useLayoutEffect(() => register(f, open), [register, f, open]);
  return (
    <>
      {show && (
        <SpotLayer
          on
          busy={img.busy}
          label={`Ảnh ghép ${index + 1}`}
          edited={fld.edited}
          canCrop={img.canCrop}
          onOpen={img.open}
          onCrop={img.recrop}
          onReset={fld.reset}
          tagAt="top-0 left-6"
          toolsAt="bottom-0 right-6"
          className="ring-0"
        />
      )}
      {img.dialogs}
    </>
  );
}

/**
 * Đổi ảnh khung "giọt nước" (ảnh ghép bên phải đầu trang, màn lớn) ngay trên từng dải ảnh. Gắn vào đúng khung của
 * website (tìm trong section đầu trang) — rê chuột lên dải nào thì dải đó sáng lên, bấm là đổi ảnh dải đó.
 */
export function CollageSpots({ fields }) {
  const probe = useRef(null);
  const [frame, setFrame] = useState(null);
  useLayoutEffect(() => {
    const el = probe.current?.closest("section")?.querySelector('[class*="aspect-[5/4]"]');
    setFrame(el ?? null);
  }, []);
  return (
    <>
      <span ref={probe} hidden />
      {frame && createPortal(<CollageLayer fields={fields} />, frame)}
    </>
  );
}

function CollageLayer({ fields }) {
  const ref = useRef(null);
  const opens = useRef(new Map());
  const [active, setActive] = useState(0);
  const register = useCallback((f, open) => {
    opens.current.set(f, open);
  }, []);
  const n = Math.min(3, fields.length) || 1;
  const bandAt = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r?.width) return 0;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    return BAND_EDGES[n].filter((edge) => y > edge(x)).length;
  };
  const on = useImageHost(
    ref,
    (e) => opens.current.get(fields[bandAt(e)])?.(),
    (e) => setActive(bandAt(e)),
  );
  return (
    <span ref={ref} data-edit-ui className="pointer-events-none absolute inset-0 z-[25]">
      {on && (
        <span className="absolute inset-0 [clip-path:url(#vl-hero-blob)]">
          <span
            className="absolute inset-0 bg-blue-500/25"
            style={{ clipPath: BAND_CLIPS[n][active] }}
          />
        </span>
      )}
      {fields.slice(0, 3).map((f, i) => (
        <CollageBand key={f} f={f} index={i} show={on && active === i} register={register} />
      ))}
    </span>
  );
}

/** Giữ tên cũ: dải ảnh đầu trang → HeroImageSpots (bấm thẳng vào từng ảnh) */
export function HeroImagePills({ f, count = 3, split }) {
  return (
    <HeroImageSpots fields={Array.from({ length: count }, (_, i) => `${f}.${i}`)} split={split} />
  );
}

/* ---------- Bố cục ---------- */

export { Sec };

/** Lớp phủ ảnh nền giống components/ui/BgImage.js (dùng làm `fade` của BgPhoto) */
export const TONES = {
  light: "bg-gradient-to-b from-white/92 via-white/78 to-white/60",
  mist: "bg-gradient-to-b from-[#f2f7fb]/92 via-[#f2f7fb]/80 to-[#f2f7fb]/65",
  side: "bg-gradient-to-r from-[#f4f6f8]/95 via-[#f4f6f8]/85 to-[#f4f6f8]/35",
  night: "bg-gradient-to-r from-[#1c2630]/92 via-[#1c2630]/70 to-[#1c2630]/35",
  dark: "bg-gradient-to-r from-brand-950/90 via-brand-950/70 to-brand-950/30",
};

/**
 * Ảnh nền khối y như components/ui/BgImage.js (ảnh + lớp màu `tone`) — bấm vào phần nền là đổi ảnh.
 * Đặt làm con đầu tiên của section có `relative isolate overflow-hidden`.
 */
export function BgEdit({ f, tone = "light", title, tagAt, toolsAt }) {
  const fld = useCopyField(f);
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <Pic src={fld.value || fld.def} sizes="100vw" />
        <div className={cn("absolute inset-0", TONES[tone])} />
      </div>
      <ImageEdit f={f} title={title} tagAt={tagAt} toolsAt={toolsAt} />
    </>
  );
}

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
