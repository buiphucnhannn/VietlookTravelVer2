"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  EyeOff,
  GripVertical,
  Plus,
  Replace,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "../Link";
import { PickerModal } from "./shared";

/**
 * SỬA DANH SÁCH NGAY TRÊN THẺ THẬT của website (tour nổi bật, tour dài ngày, điểm đến, chủ đề):
 *   const list = useListEdit({ value, shown, max, onChange, options, unit, … });
 *   <Component itemSlot={list.slot} after={list.ghost} />   (slot = lớp sửa phủ lên từng thẻ)
 *   {list.chip} {list.modal}
 * - Rê chuột lên thẻ: viền xanh + nhãn "Bấm để đổi …" + thanh nút: kéo · ← · → · × (bấm thẻ = chọn mục khác thay vào).
 * - Kéo thả thẻ để đổi chỗ (kéo thả gốc của trình duyệt → đúng vị trí cả khi trang đang thu nhỏ).
 * - Thẻ "＋ Thêm …" cuối hàng khi còn chỗ; nhãn đầu khối "Tên · n/max · kéo để sắp xếp" (+ "Dùng gợi ý này").
 * - Danh sách đang trống (website tự chọn): thao tác đầu tiên lấy đúng các thẻ đang hiện làm danh sách rồi sửa tiếp.
 */
export function useListEdit({
  title,
  value,
  shown,
  max,
  onChange,
  options,
  status,
  unit,
  pickerTitle,
  emptyHref,
  searchPlaceholder,
  onSearch,
  manageHref,
  manageText,
  note,
  dark,
  ghostClassName,
}) {
  const [picking, setPicking] = useState(null); // "add" | slug cần thay
  const [drag, setDrag] = useState(null); // slug đang kéo
  const [over, setOver] = useState(null); // slug đang được kéo tới
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const auto = !value.length;
  const base = auto ? shown.slice(0, max) : value;
  const room = max - base.length;

  const commit = (next) => onChange(next.slice(0, max));
  const moveTo = (from, to) => {
    const i = base.indexOf(from);
    const j = base.indexOf(to);
    if (i < 0 || j < 0 || i === j) return;
    const next = [...base];
    next.splice(i, 1);
    next.splice(j, 0, from);
    commit(next);
  };
  const move = (slug, d) => {
    const i = base.indexOf(slug);
    const j = i + d;
    if (i < 0 || j < 0 || j >= base.length) return;
    const next = [...base];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const remove = (slug) => commit(base.filter((x) => x !== slug));
  /** Đặt `v` vào chỗ của `slug`; `v` đang ở ô khác → hai ô đổi chỗ */
  const replace = (slug, v) => {
    const next = [...base];
    const i = next.indexOf(slug);
    const j = next.indexOf(v);
    if (i < 0) return;
    if (j >= 0) [next[i], next[j]] = [next[j], next[i]];
    else next[i] = v;
    commit(next);
  };

  const slot = (item) => {
    const slug = typeof item === "string" ? item : item?.slug;
    const i = base.indexOf(slug);
    return (
      <ItemOverlay
        key={`edit-${slug}`}
        index={i}
        count={base.length}
        unit={unit}
        name={byValue.get(slug)?.label}
        hidden={byValue.get(slug)?.hidden}
        dragging={drag === slug}
        over={over === slug && drag && drag !== slug}
        onPick={() => setPicking(slug)}
        onLeft={() => move(slug, -1)}
        onRight={() => move(slug, 1)}
        onRemove={() => remove(slug)}
        dnd={{
          onDragStart: (e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", slug);
            const card = e.currentTarget.parentElement;
            if (card) e.dataTransfer.setDragImage(card, 24, 24);
            setDrag(slug);
          },
          onDragEnd: () => {
            setDrag(null);
            setOver(null);
          },
          onDragOver: (e) => {
            if (!drag) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (over !== slug) setOver(slug);
          },
          onDragLeave: () => over === slug && setOver(null),
          onDrop: (e) => {
            if (!drag) return;
            e.preventDefault();
            moveTo(drag, slug);
            setDrag(null);
            setOver(null);
          },
        }}
      />
    );
  };

  const ghost =
    room > 0 ? (
      <AddCard
        key="edit-add"
        unit={unit}
        dark={dark}
        className={ghostClassName}
        onClick={() => setPicking("add")}
      />
    ) : null;

  const chip = (
    <ListChip
      title={title}
      count={`${base.length}/${max}`}
      auto={auto}
      note={note}
      onAdopt={auto && shown.length ? () => commit(shown) : null}
      onAdd={room > 0 ? () => setPicking("add") : null}
      unit={unit}
      href={manageHref}
      linkText={manageText}
    />
  );

  const modal =
    picking === "add" ? (
      <PickerModal
        multi
        title={pickerTitle}
        options={options}
        status={status}
        emptyHref={emptyHref}
        taken={base}
        room={room}
        unit={unit}
        searchPlaceholder={searchPlaceholder}
        onSearch={onSearch}
        onClose={() => setPicking(null)}
        onPick={(vals) => {
          commit([...base, ...vals]);
          setPicking(null);
        }}
      />
    ) : picking ? (
      <PickerModal
        title={`Đổi ${unit} ở ô số ${base.indexOf(picking) + 1}`}
        description={`Chọn ${unit} đang nằm ở ô khác thì hai ô sẽ đổi chỗ cho nhau.`}
        options={options}
        status={status}
        emptyHref={emptyHref}
        taken={base}
        unit={unit}
        searchPlaceholder={searchPlaceholder}
        onSearch={onSearch}
        onClose={() => setPicking(null)}
        onPick={([v]) => {
          replace(picking, v);
          setPicking(null);
        }}
      />
    ) : null;

  return { slot, ghost, chip, modal };
}

/* ---------- Lớp sửa phủ lên 1 thẻ ---------- */

const stop = (e) => e.stopPropagation();

function ToolBtn({ icon: Icon, label, onClick, disabled, danger, text, className }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      draggable={false}
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "inline-flex h-7 items-center justify-center gap-1 rounded-md font-sans text-[11px] leading-none font-semibold tracking-normal whitespace-nowrap normal-case transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35",
        text ? "px-2" : "w-7",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-blue-50 hover:text-blue-700",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {text}
    </button>
  );
}

function ItemOverlay({
  index,
  count,
  unit,
  name,
  hidden,
  dragging,
  over,
  onPick,
  onLeft,
  onRight,
  onRemove,
  dnd,
}) {
  const show =
    "opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 [@media(hover:none)]:opacity-100";
  return (
    <div
      data-edit-ui
      draggable
      role="button"
      tabIndex={0}
      aria-label={`${unit} số ${index + 1}${name ? `: ${name}` : ""} — bấm để đổi, kéo để sắp xếp`}
      title={`Bấm để đổi ${unit} · kéo để sắp xếp`}
      onClick={(e) => {
        if (!e.currentTarget.contains(e.target)) return; // sự kiện từ hộp chọn (portal)
        e.preventDefault();
        e.stopPropagation();
        onPick();
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        } else if (e.key === "ArrowLeft") onLeft();
        else if (e.key === "ArrowRight") onRight();
        else if (e.key === "Delete") onRemove();
      }}
      {...dnd}
      className={cn(
        "group/item @container absolute inset-0 z-20 cursor-grab rounded-[inherit] outline-none active:cursor-grabbing",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-blue-500 after:transition-opacity after:duration-150 after:ring-inset",
        "after:opacity-0 after:ring-2 hover:after:opacity-100 focus-visible:after:opacity-100",
        dragging && "opacity-60 after:opacity-100",
        over && "after:bg-blue-500/15 after:opacity-100 after:ring-4",
      )}
    >
      {/* góc trái trên: 1 thanh nút duy nhất trên 1 hàng (số thứ tự · kéo · ← · → · Đổi · ×) — thẻ hẹp bớt ← → và
          chữ "Đổi" (vẫn kéo thả / phím mũi tên được) để thanh không xuống dòng đè lên chữ của thẻ */}
      <span
        className={cn(
          "absolute top-0 left-0 z-10 flex max-w-full [zoom:var(--pz,1)] flex-col items-start gap-1 p-2 transition-opacity duration-150",
          show,
          over && "opacity-100",
        )}
      >
        <span className="flex max-w-full flex-nowrap items-center gap-0.5 rounded-lg bg-white/95 p-0.5 shadow-lg ring-1 ring-slate-900/10">
          <span
            title="Kéo để sắp xếp"
            className="flex h-7 cursor-grab items-center gap-0.5 pr-0.5 pl-1 text-slate-400"
          >
            <span className="grid size-5 place-items-center rounded-full bg-blue-600 font-sans text-[10px] font-bold text-white">
              {index + 1}
            </span>
            <GripVertical className="size-3.5" />
          </span>
          <ToolBtn
            icon={ArrowLeft}
            label="Đưa lên trước"
            onClick={onLeft}
            disabled={index <= 0}
            className="@max-[18rem]:hidden"
          />
          <ToolBtn
            icon={ArrowRight}
            label="Đưa ra sau"
            onClick={onRight}
            disabled={index < 0 || index >= count - 1}
            className="@max-[18rem]:hidden"
          />
          <ToolBtn
            icon={Replace}
            label={`Đổi ${unit} khác`}
            text={<span className="@max-[12rem]:hidden">Đổi</span>}
            onClick={onPick}
          />
          <ToolBtn icon={X} label={`Gỡ ${unit} này`} onClick={onRemove} danger />
        </span>
        {over && (
          <span className="pointer-events-none inline-flex items-center rounded-md bg-blue-600 px-2 py-1 font-sans text-[11px] leading-none font-semibold whitespace-nowrap text-white normal-case shadow-lg">
            Thả vào đây
          </span>
        )}
      </span>
      {hidden && (
        <span className="pointer-events-none absolute bottom-0 left-0 z-10 [zoom:var(--pz,1)] p-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 font-sans text-[11px] leading-none font-semibold text-white normal-case shadow">
            <EyeOff className="size-3" /> Đang ẩn — website không hiện {unit} này
          </span>
        </span>
      )}
    </div>
  );
}

/* ---------- Thẻ "＋ Thêm …" cuối hàng ---------- */

function AddCard({ unit, onClick, dark, className }) {
  return (
    <button
      type="button"
      data-edit-ui
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid h-full min-h-56 w-full place-items-center rounded-[2rem] border-2 border-dashed transition-colors duration-150 outline-none focus-visible:ring-4 focus-visible:ring-blue-300",
        dark
          ? "border-white/35 bg-white/5 text-white/85 hover:border-blue-300 hover:bg-blue-400/15"
          : "border-blue-300 bg-blue-50/50 text-blue-700 hover:border-blue-500 hover:bg-blue-50",
        className,
      )}
    >
      <span className="flex [zoom:var(--pz,1)] flex-col items-center gap-2 font-sans text-sm font-semibold normal-case">
        <span className="grid size-10 place-items-center rounded-full bg-blue-600 text-white shadow-md">
          <Plus className="size-5" />
        </span>
        Thêm {unit}
      </span>
    </button>
  );
}

/* ---------- Nhãn đầu khối ---------- */

function ListChip({ title, count, auto, note, onAdopt, onAdd, unit, href, linkText }) {
  return (
    <div
      data-edit-ui
      className="flex max-w-full flex-wrap items-center gap-1.5 rounded-xl bg-white/95 p-1 pl-2.5 font-sans text-[11px] leading-none font-semibold tracking-normal text-slate-600 normal-case shadow-md ring-1 ring-blue-200"
    >
      <span className="inline-flex items-center gap-1 text-blue-700">
        <Sparkles className="size-3.5" /> {title}
      </span>
      <span className="text-slate-400">·</span>
      <span className="tabular-nums">{count}</span>
      <span className="text-slate-400 max-xl:hidden">·</span>
      <span className="font-normal text-slate-500 max-xl:hidden">
        {auto ? "website đang tự chọn" : "kéo thẻ để sắp xếp"}
        {note ? ` · ${note}` : ""}
      </span>
      {onAdopt && (
        <button
          type="button"
          onClick={onAdopt}
          title="Giữ đúng các thẻ đang hiện làm danh sách riêng để sắp xếp, thay, gỡ"
          className="h-7 rounded-lg bg-blue-600 px-2.5 text-white transition-colors duration-150 hover:bg-blue-700"
        >
          Dùng gợi ý này
        </button>
      )}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-blue-700 ring-1 ring-blue-200 transition-colors duration-150 hover:bg-blue-50"
        >
          <Plus className="size-3.5" /> Thêm {unit}
        </button>
      )}
      {href && (
        <Link
          href={href}
          data-admin-link
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-brand-700"
        >
          {linkText} <ArrowUpRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
