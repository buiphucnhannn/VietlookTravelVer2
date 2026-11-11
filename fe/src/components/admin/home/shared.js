"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, ImageOff, Plus } from "lucide-react";
import { cloudinaryVideo, parseVideo, videoThumb } from "@/lib/video";
import { cn, foldSearch } from "@/lib/utils";
import Link from "../Link";
import { Badge, Button, Modal, SearchBox } from "../ui";

/* ---------- Dữ liệu ---------- */

export const L = () => ({ en: "", zh: "", vi: "" });
export const MAX_SLIDES = 8;
export const MAX_TOURS = 8; // khối tour trên trang chủ hiện tối đa 8 thẻ
export const MAX_THEMES = 8;
export const MAX_DESTINATIONS = 5;
export const EMPTY_SLIDE = {
  video: "",
  videoMobile: "",
  poster: "",
  posterMobile: "",
  caption: L(),
};

const isVideoFile = (v) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(v) || /\/video\/upload\//.test(v);
export const isImage = (v) => !!v && !isVideoFile(v) && !/\.svg(\?|$)/i.test(v);
/** Cùng quy tắc với máy chủ: ảnh trong kho ảnh / ảnh có sẵn của website / ảnh vừa chọn (lưu khi bấm Lưu) */
export const validImage = (v) =>
  !v ||
  v.startsWith("blob:") ||
  /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//.test(v) ||
  /^\/(images|videos)\/[\w./ ()-]+\.(jpe?g|png|webp|avif|gif|svg)$/i.test(v);
/**
 * Video nền: link YouTube, video có sẵn của website, hoặc video Drive ĐÃ CHÉP về website (link Cloudinary).
 * Link Drive chưa chép (đang chép / chép lỗi) → chưa lưu được.
 */
export const validBannerVideo = (v) =>
  !v ||
  (/^\/videos\/[\w./-]+\.(mp4|webm)$/i.test(v) && !v.includes("..")) ||
  parseVideo(v)?.provider === "youtube" ||
  !!cloudinaryVideo(v);

const showable = (v) => isImage(v) && validImage(v);

/** Ảnh nền đại diện của 1 slide: ảnh chờ → ảnh bìa video (YouTube / video đã chép) → ảnh điện thoại */
export const slideBackground = (s) =>
  !s
    ? ""
    : showable(s.poster)
      ? s.poster
      : videoThumb(s.video) || (showable(s.posterMobile) ? s.posterMobile : "");

/**
 * Thẻ kéo được nhưng bấm vẫn có tác dụng: chỉ coi là "bấm" khi con trỏ gần như không di chuyển
 * (thả tay sau khi kéo không bị tính là bấm). Dùng: <button {...useTap(onTap)} />
 */
export function useTap(onTap) {
  const from = useRef(null);
  return {
    onPointerDown: (e) => {
      from.current = [e.clientX, e.clientY];
    },
    onClick: (e) => {
      const p = from.current;
      from.current = null;
      if (p && e.detail > 0 && Math.hypot(e.clientX - p[0], e.clientY - p[1]) > 6) return;
      onTap?.(e);
    },
  };
}

/* ---------- Ảnh ---------- */

/** Ảnh phủ kín khung cha (cha cần `relative`). Ảnh không hợp lệ → không vẽ gì. */
export function Pic({ src, sizes = "240px", className }) {
  if (!src) return null;
  // ảnh vừa chọn, chưa bấm Lưu (nằm tạm trên máy) → hiện thẳng, không qua bộ chuyển ảnh CDN
  if (src.startsWith("blob:"))
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ảnh tạm trên máy, chưa có trên CDN
      <img src={src} alt="" className={cn("absolute inset-0 size-full object-cover", className)} />
    );
  if (showable(src))
    return <Image src={src} alt="" fill sizes={sizes} className={cn("object-cover", className)} />;
  // ảnh bìa YouTube / ảnh xem trước Drive / khung hình đầu của video nền đã chép về
  if (
    /^https:\/\/(i\.ytimg\.com\/|drive\.google\.com\/thumbnail\?|res\.cloudinary\.com\/[\w-]+\/video\/upload\/)/.test(
      src,
    )
  )
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ảnh bìa video, không cần tối ưu
      <img src={src} alt="" className={cn("absolute inset-0 size-full object-cover", className)} />
    );
  return null;
}

/* ---------- Chữ sửa trực tiếp trên bản thu nhỏ ---------- */

/**
 * Ô nhập "vô hình": trông y như chữ trên trang, bấm vào là gõ được, tự giãn theo nội dung.
 * Kiểu chữ (cỡ, đậm, màu, căn lề) đặt ở `className` của khung ngoài.
 */
export function InlineText({ value, onChange, placeholder, label, multiline, className, light }) {
  return (
    <span
      className={cn(
        "relative inline-grid max-w-full cursor-text rounded-md outline-1 outline-offset-[5px] outline-transparent transition-[outline-color,background-color] outline-dashed",
        light
          ? "focus-within:bg-brand-50/60 focus-within:outline-brand-500 hover:outline-brand-300"
          : "focus-within:bg-black/25 focus-within:outline-white hover:outline-white/60",
        className,
      )}
    >
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 min-w-[2ch] break-words whitespace-pre-wrap"
      >
        {(value || placeholder || "") + "​"}
      </span>
      <textarea
        rows={1}
        // giữ đúng cỡ chữ của trang thật (không bị quy tắc "ô nhập 16px trên điện thoại" trong theme.css ghi đè)
        data-inline
        // cols=1: bề rộng do dòng chữ "bóng" phía trên quyết định (mặc định 20 cột làm nút / nhãn ngắn bị kéo dài)
        cols={1}
        value={value}
        aria-label={label}
        title={label}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) =>
          onChange(multiline ? e.target.value : e.target.value.replace(/[\r\n]+/g, " "))
        }
        onKeyDown={(e) => {
          if (!multiline && e.key === "Enter") e.preventDefault();
        }}
        className="col-start-1 row-start-1 size-full resize-none overflow-hidden bg-transparent p-0 [text-align:inherit] [letter-spacing:inherit] text-inherit [text-transform:inherit] outline-none [font:inherit] [text-shadow:inherit] placeholder:text-current placeholder:opacity-45"
      />
    </span>
  );
}

/* ---------- Nút tròn nhỏ nổi trên ảnh ---------- */

export function MiniBtn({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      // nút nằm trên thẻ kéo được → không để thao tác bấm nút bị hiểu là bắt đầu kéo thẻ
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={cn(
        "grid size-7 place-items-center rounded-full bg-white/95 shadow-md ring-1 ring-slate-900/10 transition hover:scale-110 disabled:pointer-events-none disabled:opacity-40",
        danger ? "text-sun-600 hover:bg-sun-50" : "text-slate-700 hover:bg-white",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

/** Lớp nút hiện khi rê chuột (điện thoại: luôn hiện) */
export const HOVER_TOOLS =
  "opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100";

/* ---------- Tiêu đề 1 khối trên bản thu nhỏ ---------- */

export function SectionTitle({ title, hint, count, dark, action }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:mb-5">
      <div className="min-w-0">
        <h2
          className={cn(
            "text-lg leading-tight font-bold tracking-tight sm:text-xl",
            dark ? "text-amber-brand" : "text-brand-950",
          )}
        >
          {title}
          {count && (
            <span
              className={cn(
                "ml-2 align-middle text-xs font-semibold",
                dark ? "text-white/60" : "text-slate-400",
              )}
            >
              {count}
            </span>
          )}
        </h2>
        {hint && (
          <p
            className={cn(
              "mt-1 text-xs leading-relaxed",
              dark ? "text-white/70" : "text-slate-500",
            )}
          >
            {hint}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

/* ---------- Hộp chọn (tour / điểm đến) ---------- */

function PickerThumb({ src }) {
  return (
    <span className="relative grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-300">
      <ImageOff className="size-4" />
      <Pic src={src} sizes="64px" />
    </span>
  );
}

/**
 * Hộp tìm & chọn. `multi`: tích nhiều mục rồi bấm "Thêm"; không `multi`: bấm 1 mục là chọn luôn.
 * `taken`: các mục đã có sẵn (multi → ẩn khỏi danh sách; đơn → ghi chú "Đang ở ô số n").
 * Chỉ dựng khi cần mở (cha: `{picker && <PickerModal … />}`) để mỗi lần mở là một lần chọn mới.
 * `onSearch(q)` (tuỳ chọn, trả Promise<options>): `options` chỉ là phần tải sẵn (vd. 200 tour đầu) → gõ tìm thì
 * hỏi thêm máy chủ (chờ gõ xong 300ms), kết quả ghép với các mục tải sẵn khớp từ khoá.
 * `status` ("loading" | "ready" | "error", từ useOptionsState) + `emptyHref` (trang thêm mục) → báo đúng khi danh
 * sách trống: đang tải / tải lỗi / chưa có mục nào / đã chọn hết / không khớp từ khoá.
 */
export function PickerModal({
  title,
  description,
  options,
  status = "ready",
  emptyHref,
  taken = [],
  multi,
  room = 1,
  unit = "mục",
  searchPlaceholder,
  onClose,
  onPick,
  onSearch,
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState([]);
  const term = q.trim();
  const [remote, setRemote] = useState({ q: "", items: [] });
  const searching = Boolean(onSearch && term && remote.q !== term);
  useEffect(() => {
    if (!onSearch || !term) return;
    let alive = true;
    const t = setTimeout(() => {
      onSearch(term)
        .catch(() => [])
        .then((items) => alive && setRemote({ q: term, items }));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term, onSearch]);

  const list = useMemo(() => {
    // không phân biệt dấu / hoa thường / khoảng trắng: "ha noi" = "Hà Nội"
    const s = foldSearch(q);
    const local = options.filter(
      (o) => !s || foldSearch(o.label).includes(s) || foldSearch(o.value).includes(s),
    );
    const more = remote.q && remote.q === term ? remote.items : [];
    const seen = new Set(local.map((o) => o.value));
    return [...local, ...more.filter((o) => !seen.has(o.value))].filter(
      (o) => !multi || !taken.includes(o.value),
    );
  }, [q, term, remote, options, taken, multi]);

  const toggle = (v) =>
    setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : p.length < room ? [...p, v] : p));
  const full = picked.length >= room;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={title}
      description={description}
      footer={
        multi ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Huỷ
            </Button>
            <Button icon={Plus} disabled={!picked.length} onClick={() => onPick(picked)}>
              {picked.length ? `Thêm ${picked.length} ${unit}` : `Chọn ${unit} để thêm`}
            </Button>
          </>
        ) : null
      }
    >
      <SearchBox value={q} onChange={setQ} placeholder={searchPlaceholder} />
      {multi && (
        <p className="mt-2 text-xs text-slate-500">
          {full
            ? `Đã đủ ${room} ${unit}. Gỡ bớt một ${unit} để chọn thêm.`
            : `Có thể chọn thêm ${room - picked.length} ${unit}.`}
        </p>
      )}
      <ul className="mt-3 space-y-1">
        {list.map((o) => {
          const on = picked.includes(o.value);
          const at = multi ? -1 : taken.indexOf(o.value);
          const off = multi && !on && full;
          return (
            <li key={o.value}>
              <button
                type="button"
                disabled={off}
                aria-pressed={multi ? on : undefined}
                onClick={() => (multi ? toggle(o.value) : onPick([o.value]))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-2 text-left ring-1 transition disabled:opacity-45",
                  on ? "bg-brand-50 ring-brand-300" : "ring-transparent hover:bg-slate-50",
                )}
              >
                <PickerThumb src={o.image} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm leading-snug font-semibold text-slate-800">
                    {o.label}
                  </span>
                  {o.sub && <span className="block text-xs text-slate-500">{o.sub}</span>}
                </span>
                {o.hidden && <Badge tone="amber">Đang ẩn</Badge>}
                {at >= 0 && <Badge tone="blue">Đang ở ô số {at + 1}</Badge>}
                {multi && (
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full ring-1 transition",
                      on
                        ? "bg-brand-700 text-white ring-brand-700"
                        : "bg-white text-transparent ring-slate-300",
                    )}
                  >
                    <Check className="size-3.5" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {searching && list.length > 0 && (
        <p className="py-3 text-center text-xs text-slate-400">Đang tìm thêm…</p>
      )}
      {!list.length && (
        <p className="py-8 text-center text-sm text-slate-500">
          {searching ? (
            "Đang tìm…"
          ) : term ? (
            "Không tìm thấy kết quả phù hợp."
          ) : options.length ? (
            `Tất cả ${unit} đều đã được chọn.`
          ) : status === "loading" ? (
            "Đang tải danh sách…"
          ) : status === "error" ? (
            "Chưa tải được danh sách — vui lòng kiểm tra mạng rồi tải lại trang."
          ) : (
            <>
              Chưa có {unit} nào.
              {emptyHref && (
                <>
                  {" "}
                  <Link
                    href={emptyHref}
                    className="font-semibold text-brand-700 underline underline-offset-2"
                  >
                    Thêm {unit} mới
                  </Link>
                </>
              )}
            </>
          )}
        </p>
      )}
    </Modal>
  );
}

/* ---------- Câu chữ các khối (sửa ngay trên bản thu nhỏ) ---------- */

/**
 * { copy, defs, lang, setCopy }:
 * - `copy`: cây câu chữ của trang chủ, mỗi câu là { en, zh, vi } (xem components/home/copy.js)
 * - `defs`: câu mặc định theo từng ngôn ngữ — hiện mờ khi ô bị xoá trống
 * - `setCopy(fn)`: cập nhật cây
 */
export const CopyContext = createContext(null);

const getIn = (obj, keys) => keys.reduce((a, k) => a?.[k], obj);
const setIn = (obj, keys, value) => {
  if (!keys.length) return value;
  const [k, ...rest] = keys;
  const next = Array.isArray(obj) ? [...obj] : { ...obj };
  next[k] = setIn(obj?.[k], rest, value);
  return next;
};

/** Một câu chữ sửa trực tiếp. `k`: đường dẫn trong cây, vd "servicesTitle", "why.2.text". `dark`: nằm trên nền tối. */
export function T({ k, className, multiline, dark, label }) {
  const { copy, defs, lang, setCopy } = useContext(CopyContext);
  const keys = String(k).split(".");
  const node = getIn(copy, keys);
  if (!node) return null;
  return (
    <InlineText
      value={node[lang] ?? ""}
      placeholder={getIn(defs[lang], keys) || getIn(defs.en, keys) || "…"}
      onChange={(v) => setCopy((c) => setIn(c, [...keys, lang], v))}
      label={label ?? "Bấm để sửa chữ"}
      multiline={multiline}
      light={!dark}
      className={className}
    />
  );
}

/** Tiêu đề khối căn giữa như trang thật: dòng nhỏ in hoa · tiêu đề đậm · phụ đề · gạch ngắn */
export function MiniHeading({ eyebrow, title, subtitle, dark, className }) {
  return (
    <header
      className={cn("mx-auto mb-6 flex max-w-2xl flex-col items-center text-center", className)}
    >
      {eyebrow && (
        <T
          k={eyebrow}
          dark={dark}
          label="Dòng chữ nhỏ phía trên tiêu đề"
          className={cn(
            "mb-2 text-[0.62rem] font-bold tracking-[0.18em] uppercase",
            dark ? "text-amber-brand" : "text-clay-600",
          )}
        />
      )}
      <T
        k={title}
        dark={dark}
        label="Tiêu đề khối"
        className={cn(
          "text-xl leading-tight font-bold tracking-[-0.03em] sm:text-[1.65rem]",
          dark ? "text-white" : "text-ink",
        )}
      />
      {subtitle && (
        <T
          k={subtitle}
          dark={dark}
          multiline
          label="Dòng mô tả dưới tiêu đề"
          className={cn("mt-2 text-xs sm:text-[0.8rem]", dark ? "text-white/80" : "text-ink/75")}
        />
      )}
      <span
        aria-hidden
        className={cn(
          "mt-3.5 block h-[3px] w-10 rounded-full",
          dark ? "bg-amber-brand" : "bg-clay-500",
        )}
      />
    </header>
  );
}

/** Một khối của bản thu nhỏ: nhãn tên khối ở góc + nội dung căn giữa như trang thật */
export function Sec({ name, dark, className, children, wide }) {
  return (
    <section
      className={cn("relative isolate overflow-hidden px-4 pt-11 pb-8 sm:px-8 sm:pb-10", className)}
    >
      <span
        className={cn(
          "absolute top-2.5 left-3 z-10 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase select-none sm:left-4",
          dark ? "bg-white/10 text-white/65" : "bg-slate-900/[0.06] text-slate-500",
        )}
      >
        {name}
      </span>
      <div className={cn("mx-auto", wide ? "max-w-6xl" : "max-w-5xl")}>{children}</div>
    </section>
  );
}

/** Ghi chú 1 dòng cho phần nội dung tự động: nói rõ sửa ở đâu */
export function AutoNote({ children, href, linkText, dark, className }) {
  return (
    <p
      className={cn(
        "mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-2xl border border-dashed px-3.5 py-1.5 text-center text-[11px] leading-relaxed",
        dark
          ? "border-white/25 bg-white/5 text-white/75"
          : "border-slate-300 bg-white/70 text-slate-500",
        className,
      )}
    >
      <span>{children}</span>
      {href && (
        <Link
          href={href}
          className={cn(
            "font-semibold underline underline-offset-2",
            dark ? "text-amber-brand" : "text-brand-700",
          )}
        >
          {linkText}
        </Link>
      )}
    </p>
  );
}

/**
 * Tay nắm kéo cho cả thẻ (thẻ không có ô nhập): trên màn hình cảm ứng vẫn vuốt để cuộn trang được,
 * nhấn giữ một chút rồi mới kéo thẻ.
 */
export const grab = (drag) => {
  const h = drag?.handle;
  return h?.style ? { ...h, style: { ...h.style, touchAction: "manipulation" } } : (h ?? {});
};
