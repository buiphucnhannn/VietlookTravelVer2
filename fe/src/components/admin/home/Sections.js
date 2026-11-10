"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Clock, EyeOff, ImageOff, Plus, Repeat2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sortable } from "../Sortable";
import {
  AutoNote,
  HOVER_TOOLS,
  MAX_DESTINATIONS,
  MAX_THEMES,
  MAX_TOURS,
  MiniBtn,
  MiniHeading,
  Pic,
  PickerModal,
  Sec,
  grab,
  T,
  useTap,
} from "./shared";

const byValueOf = (options) => new Map(options.map((o) => [o.value, o]));
const sameId = (v) => v;

/* =========================================================================
 * Lưới thẻ tour (tour dài ngày / tour nổi bật): giữ và kéo thẻ để đổi thứ tự
 * ========================================================================= */

/** `tall`: thẻ vòm dọc 4:5 có mô tả ngắn, 4 thẻ một hàng — giống khối "Tour nổi bật" trên web */
function TourCards({ title, options, value, onChange, tall }) {
  const [picking, setPicking] = useState(false);
  const byValue = useMemo(() => byValueOf(options), [options]);
  const room = MAX_TOURS - value.length;

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-2 gap-3",
          tall
            ? "sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
            : "sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
        )}
      >
        <Sortable
          items={value}
          getId={sameId}
          onReorder={onChange}
          layout="grid"
          className="contents"
        >
          {(v, i, drag) => (
            <TourCard
              tour={byValue.get(v)}
              loading={!options.length}
              index={i}
              drag={drag}
              tall={tall}
              onRemove={() => onChange(value.filter((x) => x !== v))}
            />
          )}
        </Sortable>
        {room > 0 && !tall && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-t-[999px] rounded-b-2xl border-2 border-dashed border-clay-500/35 bg-white/60 text-xs font-semibold text-clay-600 transition hover:border-clay-500 hover:bg-white"
          >
            <span className="grid size-9 place-items-center rounded-full bg-cream-100 ring-1 ring-sand-300">
              <Plus className="size-4" />
            </span>
            Thêm tour
          </button>
        )}
      </div>
      {/* Thẻ cao: nút thêm nằm thành dải riêng bên dưới để các hàng thẻ luôn đều nhau */}
      {room > 0 && tall && (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-clay-500/35 bg-cream-50/60 text-xs font-semibold text-clay-600 transition hover:border-clay-500 hover:bg-white",
            value.length ? "mt-4 py-3" : "min-h-[160px]",
          )}
        >
          <span className="grid size-7 place-items-center rounded-full bg-cream-100 ring-1 ring-sand-300">
            <Plus className="size-3.5" />
          </span>
          Thêm tour
        </button>
      )}

      {picking && (
        <PickerModal
          multi
          title={`Thêm tour vào “${title}”`}
          options={options}
          taken={value}
          room={room}
          unit="tour"
          searchPlaceholder="Tìm tour theo tên…"
          onClose={() => setPicking(false)}
          onPick={(vals) => {
            onChange([...value, ...vals].slice(0, MAX_TOURS));
            setPicking(false);
          }}
        />
      )}
    </>
  );
}

/** Thẻ tour khung vòm nền kem như trang thật; cả thẻ là tay nắm kéo */
function TourCard({ tour, loading, index, drag, onRemove, tall }) {
  return (
    <article
      {...grab(drag)}
      className={cn(
        "group relative flex h-full flex-col rounded-t-[999px] rounded-b-2xl bg-cream-100 p-1.5 ring-1 ring-sand-300/70 transition-shadow select-none",
        drag.dragging ? "shadow-2xl ring-clay-500" : "hover:shadow-lg",
      )}
    >
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-t-[999px] rounded-b-xl bg-sand-300/40 text-sand-300",
          tall ? "aspect-[4/5]" : "aspect-square",
        )}
      >
        <ImageOff className="size-5" />
        <Pic src={tour?.image} sizes={tall ? "320px" : "220px"} />
        {tour?.days ? (
          <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-cream-50/95 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-clay-600 shadow">
            <Clock className="size-3" /> {tour.days} ngày
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-1.5 pt-2 pb-1">
        <p
          className={cn(
            "line-clamp-2 min-h-[2.1rem] text-xs leading-snug font-bold",
            tour ? "text-ink" : "text-slate-400",
          )}
        >
          {tour ? tour.label : loading ? "Đang tải…" : "Tour này không còn nữa — nên gỡ ra"}
        </p>
        {tall && tour?.summary && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted">{tour.summary}</p>
        )}
        <p className="mt-auto flex items-center justify-between gap-1 pt-1 text-[11px]">
          <span className="font-bold text-sun-500">
            {tour?.price ? `từ ${tour.priceText}` : ""}
          </span>
          {tour?.hidden && (
            <span className="flex items-center gap-1 font-semibold text-amber-700">
              <EyeOff className="size-3" /> Đang ẩn
            </span>
          )}
        </p>
      </div>
      <span className="absolute top-0 left-0 grid size-5 place-items-center rounded-full bg-slate-900/70 text-[10px] font-bold text-white">
        {index + 1}
      </span>
      <span className={cn("absolute top-0 right-0", HOVER_TOOLS)}>
        <MiniBtn icon={X} label="Gỡ khỏi khối này" danger onClick={onRemove} />
      </span>
    </article>
  );
}

const WEEK_TABS = ["Tất cả", "1 tuần", "2 tuần", "3 tuần trở lên"];

/** Khối "Tour dài ngày" của trang chủ: tiêu đề + phụ đề + lưới tour + nút xem thêm */
export function LongToursSection({ options, value, onChange }) {
  return (
    <Sec name="Tour dài ngày" className="bg-cream-50" wide>
      <header className="mx-auto mb-5 flex max-w-2xl flex-col items-center text-center">
        <T
          k="longToursTitle"
          label="Tiêu đề khối"
          className="text-xl font-bold tracking-wide text-forest-900 sm:text-[1.65rem]"
        />
        <T
          k="longToursSubtitle"
          multiline
          label="Dòng mô tả dưới tiêu đề"
          className="mt-2 text-xs text-ink/70 italic sm:text-[0.8rem]"
        />
      </header>
      <div aria-hidden className="mb-5 flex flex-wrap justify-center gap-1.5 select-none">
        {WEEK_TABS.map((w, i) => (
          <span
            key={w}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold ring-1",
              i === 0
                ? "bg-forest-700 text-white ring-forest-700"
                : "bg-white text-ink/70 ring-sand-300",
            )}
          >
            {w}
          </span>
        ))}
      </div>

      <TourCards
        title="Tour dài ngày nổi bật"
        options={options}
        value={value}
        onChange={onChange}
      />

      <div className="mt-6 flex flex-col items-center gap-4">
        <span className="rounded-full bg-clay-500 px-5 py-2 text-xs font-semibold text-white shadow-md">
          <T k="longToursCta" dark label="Chữ trên nút" />
        </span>
        <AutoNote>
          {value.length
            ? `Đã chọn ${value.length}/${MAX_TOURS} tour. Giữ và kéo thẻ để đổi thứ tự — trang chủ hiện 8 tour đứng đầu của mỗi nhóm tuần; tour đã có ở khối “Tour nổi bật” được xếp sau để không lặp lại.`
            : "Chưa chọn tour nào — trang chủ tự lấy các tour được đánh dấu “dài ngày”."}
        </AutoNote>
      </div>
    </Sec>
  );
}

/** Khối "Tour nổi bật" của trang chủ (ngay dưới khối dịch vụ): tiêu đề + dải thẻ tour + nút xem tất cả */
export function FeaturedToursSection({ options, value, onChange }) {
  const flagged = options.filter((o) => o.featured && !o.hidden).length;
  return (
    <Sec name="Tour nổi bật" className="bg-white" wide>
      <MiniHeading eyebrow="featuredEyebrow" title="featuredTitle" subtitle="featuredSubtitle" />

      <TourCards title="Tour nổi bật" options={options} value={value} onChange={onChange} tall />

      <div className="mt-6 flex flex-col items-center gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-clay-500 px-4 py-1.5 text-xs font-semibold text-clay-600">
          <T k="featuredCta" label="Chữ trên nút" />
          <ArrowRight className="size-3.5 shrink-0" />
        </span>
        <AutoNote href={value.length ? undefined : "/admin/tours"} linkText="Mở mục Tour">
          {value.length
            ? `Đã chọn ${value.length}/${MAX_TOURS} tour. Giữ và kéo thẻ để đổi thứ tự — trên web hiện 4 thẻ một lượt, khách bấm mũi tên để xem tiếp.`
            : flagged
              ? `Chưa chọn tour nào — trang chủ đang hiện ${Math.min(flagged, 12)} tour được đánh dấu “nổi bật” trong mục Tour.`
              : "Chưa chọn tour nào và chưa có tour nào được đánh dấu “nổi bật” — khối này đang ẩn trên trang chủ."}
        </AutoNote>
      </div>
    </Sec>
  );
}

/* =========================================================================
 * Chủ đề hiện ở trang chủ
 * ========================================================================= */

export function ThemeTiles({ options, value, onChange }) {
  const [picking, setPicking] = useState(false);
  const byValue = useMemo(() => byValueOf(options), [options]);
  const any = value.length > 0;
  const room = MAX_THEMES - value.length;
  const tiles = "grid grid-flow-col grid-rows-4 gap-2.5 sm:grid-rows-2 sm:gap-3";

  return (
    <Sec name="Chủ đề tour" dark className="bg-[#141210] text-white">
      <span className="absolute inset-0 -z-10 opacity-20 grayscale-[60%]">
        <Pic src="/images/tours/hd/ha-long.jpg" sizes="1200px" />
      </span>
      <header className="mx-auto mb-5 flex max-w-2xl flex-col items-center text-center">
        <T
          k="themesTitle"
          dark
          label="Tiêu đề khối"
          className="text-xl font-bold text-amber-brand uppercase sm:text-[1.65rem]"
        />
        <span aria-hidden className="mt-1 block h-0.5 w-16 bg-amber-brand" />
        <T
          k="themesSubtitle"
          dark
          multiline
          label="Dòng mô tả dưới tiêu đề"
          className="mt-3 text-xs tracking-wide text-white/90 sm:text-[0.8rem]"
        />
      </header>

      {!options.length ? (
        <p className="text-center text-sm text-white/60">Chưa có chủ đề nào.</p>
      ) : any ? (
        <div className={cn(tiles, "auto-cols-fr")}>
          <Sortable
            items={value}
            getId={sameId}
            onReorder={onChange}
            layout="grid"
            className="contents"
          >
            {(v, i, drag) => (
              <ThemeTile theme={byValue.get(v)} drag={drag}>
                <span className={cn("absolute top-1.5 right-1.5", HOVER_TOOLS)}>
                  <MiniBtn
                    icon={X}
                    label="Bỏ chủ đề này"
                    danger
                    onClick={() => onChange(value.filter((x) => x !== v))}
                  />
                </span>
              </ThemeTile>
            )}
          </Sortable>
          {room > 0 && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-white/30 text-xs font-semibold text-white/80 transition hover:border-white hover:bg-white/10 hover:text-white sm:h-28"
            >
              <Plus className="size-4" /> Thêm chủ đề
            </button>
          )}
        </div>
      ) : (
        <div className={cn(tiles, "auto-cols-fr")}>
          {options.slice(0, MAX_THEMES).map((o) => (
            <ThemeTile key={o.value} theme={o} />
          ))}
        </div>
      )}

      {options.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <AutoNote dark href="/admin/themes" linkText="Sửa tên, ảnh chủ đề">
            {any
              ? `Đang hiện ${value.length} chủ đề đã chọn. Giữ và kéo ô để đổi thứ tự.`
              : "Đang hiện tất cả chủ đề theo thứ tự ở mục Chủ đề tour."}
          </AutoNote>
          <button
            type="button"
            onClick={() => onChange(any ? [] : options.slice(0, MAX_THEMES).map((o) => o.value))}
            className="rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
          >
            {any ? "Hiện tất cả chủ đề" : "Tự chọn và sắp xếp"}
          </button>
        </div>
      )}

      {picking && (
        <PickerModal
          multi
          title="Thêm chủ đề vào trang chủ"
          options={options}
          taken={value}
          room={room}
          unit="chủ đề"
          searchPlaceholder="Tìm chủ đề theo tên…"
          onClose={() => setPicking(false)}
          onPick={(vals) => {
            onChange([...value, ...vals].slice(0, MAX_THEMES));
            setPicking(false);
          }}
        />
      )}
    </Sec>
  );
}

function ThemeTile({ theme, drag, children }) {
  return (
    <div
      {...grab(drag)}
      className={cn(
        "group relative h-24 overflow-hidden rounded-md bg-white/10 select-none sm:h-28",
        drag?.dragging && "ring-2 ring-amber-brand",
      )}
    >
      <Pic src={theme?.image} sizes="280px" />
      <span className="absolute inset-0 bg-black/25" />
      <span className="absolute inset-0 grid place-items-center px-2 text-center text-[0.8rem] leading-tight font-semibold uppercase [text-shadow:0_2px_8px_rgba(0,0,0,.7)] sm:text-sm">
        {theme ? theme.label : "Chủ đề không còn nữa"}
      </span>
      {theme?.hidden && (
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
          <EyeOff className="size-3" /> Đang ẩn
        </span>
      )}
      {children}
    </div>
  );
}

/* =========================================================================
 * Lưới điểm đến: 5 ô lớn (chọn + kéo để đổi chỗ) + dải "điểm đến khác" tự động
 * ========================================================================= */

export function DestinationTiles({ options, value, onChange }) {
  const [slot, setSlot] = useState(null);
  const byValue = useMemo(() => byValueOf(options), [options]);
  const others = options.filter((o) => !o.hidden && !value.includes(o.value));
  const empty = Array.from({ length: MAX_DESTINATIONS - value.length }, (_, k) => value.length + k);

  /** Đặt điểm đến `v` vào ô `i`; nếu `v` đang ở ô khác thì hai ô đổi chỗ cho nhau */
  const place = (i, v) => {
    const next = [...value];
    const j = next.indexOf(v);
    if (i >= next.length) {
      if (j < 0) next.push(v);
    } else if (j >= 0) [next[i], next[j]] = [next[j], next[i]];
    else next[i] = v;
    onChange(next);
    setSlot(null);
  };

  return (
    <Sec name="Điểm đến nổi bật" className="bg-cream-50">
      <MiniHeading eyebrow="gridEyebrow" title="gridTitle" subtitle="gridSubtitle" />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:auto-rows-[150px] lg:grid-cols-[1fr_1fr_0.9fr]">
        <Sortable
          items={value}
          getId={sameId}
          onReorder={onChange}
          layout="grid"
          // ô thứ 3 cao 2 hàng (vòm tròn) như trang thật; ô cuối trên điện thoại rộng cả hàng
          className="contents lg:[&>*:nth-child(3)]:row-span-2 max-lg:[&>*:nth-child(5)]:col-span-2"
        >
          {(v, i, drag) => (
            <DestinationTile
              index={i}
              dest={byValue.get(v)}
              loading={!options.length}
              drag={drag}
              onSwap={() => setSlot(i)}
              onRemove={() => onChange(value.filter((x) => x !== v))}
            />
          )}
        </Sortable>
        {empty.map((i, k) => (
          <button
            key={i}
            type="button"
            disabled={k > 0}
            onClick={() => setSlot(i)}
            className={cn(
              "flex min-h-[130px] flex-col items-center justify-center gap-1.5 rounded-t-[1.75rem] rounded-b-2xl border-2 border-dashed border-brand-200 bg-white/60 text-xs font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-50 lg:min-h-0",
              i === 2 && "lg:row-span-2 lg:rounded-t-[999px]",
              i === 4 && "max-lg:col-span-2",
            )}
          >
            <Plus className="size-4" /> Chọn điểm đến
          </button>
        ))}
      </div>

      {/* Dải "điểm đến khác" của trang thật — tự động */}
      <div
        aria-hidden
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-forest-900 px-4 py-3 text-white select-none"
      >
        <p className="flex items-baseline gap-2 max-lg:flex-1">
          <span className="text-2xl leading-none font-bold text-amber-brand">{others.length}+</span>
          <span className="text-xs font-semibold">điểm đến khác</span>
        </p>
        <ul className="flex min-w-0 flex-wrap gap-1.5 max-lg:order-last max-lg:basis-full lg:flex-1 lg:justify-center">
          {others.slice(0, 6).map((d) => (
            <li
              key={d.value}
              className="flex items-center gap-1.5 rounded-full bg-white/10 py-0.5 pr-2.5 pl-0.5 text-[11px] font-medium whitespace-nowrap text-white/90 ring-1 ring-white/10"
            >
              <span className="relative size-5 overflow-hidden rounded-full bg-white/20">
                <Pic src={d.image} sizes="20px" />
              </span>
              {d.label}
            </li>
          ))}
        </ul>
        <span className="flex items-center gap-1 rounded-full bg-clay-500 px-3.5 py-1.5 text-[11px] font-semibold">
          Xem tất cả <ArrowRight className="size-3" />
        </span>
      </div>

      <AutoNote className="mt-4" href="/admin/destinations" linkText="Sửa tên, ảnh điểm đến">
        Bấm vào ô để đổi điểm đến, giữ và kéo để đổi chỗ. Các điểm đến còn lại tự hiện ở dải bên
        dưới.
      </AutoNote>

      {slot !== null && (
        <PickerModal
          title={`Chọn điểm đến cho ô số ${Math.min(slot, value.length) + 1}`}
          description="Chọn điểm đến đang nằm ở ô khác thì hai ô sẽ đổi chỗ cho nhau."
          options={options}
          taken={value}
          searchPlaceholder="Tìm điểm đến theo tên…"
          onClose={() => setSlot(null)}
          onPick={([v]) => place(slot, v)}
        />
      )}
    </Sec>
  );
}

function DestinationTile({ index, dest, loading, drag, onSwap, onRemove }) {
  return (
    <div
      {...grab(drag)}
      className={cn(
        "group relative h-full min-h-[130px] overflow-hidden rounded-t-[1.75rem] rounded-b-2xl bg-forest-900 text-white ring-1 ring-sand-300/70 select-none lg:min-h-0",
        index === 2 && "lg:rounded-t-[999px]",
        drag.dragging && "ring-2 ring-amber-brand",
      )}
    >
      <Pic src={dest?.image} sizes="(min-width: 1024px) 420px, 50vw" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      <button
        type="button"
        {...useTap(onSwap)}
        aria-label={`Đổi điểm đến ở ô số ${index + 1}`}
        className="absolute inset-0 flex cursor-grab flex-col items-start justify-end p-3.5 text-left sm:p-4"
      >
        <span className="text-base leading-tight font-bold tracking-tight drop-shadow sm:text-lg">
          {dest ? dest.label : loading ? "Đang tải…" : "Điểm đến không còn nữa"}
        </span>
        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-white/80">
          <Repeat2 className="size-3 max-sm:hidden" />
          <span className="max-sm:hidden">Bấm để đổi · kéo để chuyển chỗ</span>
          {dest?.hidden && (
            <span className="ml-1.5 flex items-center gap-1 text-amber-200">
              <EyeOff className="size-3" /> Đang ẩn
            </span>
          )}
        </span>
      </button>
      <span className="pointer-events-none absolute top-2.5 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-slate-950/70 text-[10px] font-bold">
        {index + 1}
      </span>
      <span className={cn("absolute right-2 bottom-2", HOVER_TOOLS)}>
        <MiniBtn icon={X} label="Bỏ điểm đến này" danger onClick={onRemove} />
      </span>
    </div>
  );
}
