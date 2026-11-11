"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownToLine, ArrowUpToLine, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KÉO – THẢ ĐỂ ĐỔI VỊ TRÍ (chuột, cảm ứng, bàn phím).
 *
 *   <Sortable items={list} onReorder={setList} layout="grid" className="grid grid-cols-4 gap-3">
 *     {(item, i, drag) => (
 *       <div {...drag.handle} className={drag.dragging ? "opacity-60" : ""}>…</div>
 *     )}
 *   </Sortable>
 *
 * - layout: "grid" (lưới thẻ) | "vertical" (danh sách dọc) | "horizontal" (hàng ngang)
 * - `drag.handle`: gắn vào phần tử dùng để nắm kéo.
 *     · Thẻ chỉ có ảnh/chữ → gắn vào cả thẻ (kéo cả thẻ). Bấm thường (không rê quá 6px) vẫn là click.
 *     · Thẻ có ô nhập liệu → gắn vào nút tay nắm <DragHandle {...drag.handle} /> để không cản việc gõ chữ.
 * - Mặc định định danh theo vị trí (không cần id, ô nhập không mất con trỏ khi gõ). Có id ổn định thì
 *   truyền getId={(item) => item.id} để chuyển động mượt hơn.
 * - onReorder(danhSáchMới, từ, đến)
 * - highlight: id (theo getId) của mục cần nháy viền một lúc (vd. vừa chuyển tới) — tự cuộn tới mục đó.
 *
 * DANH SÁCH CÓ PHÂN TRANG — đổi chỗ xuyên trang:
 *   const paged = usePaged(all, 12);
 *   const sort = usePagedSort({ all, paged, onReorder: (fullList) => save(fullList) });
 *   <Sortable items={paged.items} getId={(x) => x.id} onReorder={sort.onPageReorder} highlight={sort.flash}>
 *     {(x, i, drag) => … <PositionBadge {...sort.badge(x, i)} /> …}
 *   </Sortable>
 * Kéo – thả đổi chỗ trong trang đang xem; bấm số thứ tự (PositionBadge) để chuyển tới vị trí bất kỳ
 * (Lên đầu / Xuống cuối / nhập số) → danh sách đầy đủ được xếp lại, tự sang trang có mục đó và nháy viền.
 */
export function Sortable({
  items,
  onReorder,
  children,
  layout = "vertical",
  getId,
  disabled,
  className,
  highlight,
  as: Tag = "div",
}) {
  const ids = useMemo(
    () => items.map((item, i) => (getId ? String(getId(item, i)) : `pos-${i}`)),
    [items, getId],
  );
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const strategy =
    layout === "grid"
      ? rectSortingStrategy
      : layout === "horizontal"
        ? horizontalListSortingStrategy
        : verticalListSortingStrategy;

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to), from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={strategy} disabled={disabled}>
        <Tag className={className}>
          {items.map((item, i) => (
            <SortableItem
              key={ids[i]}
              id={ids[i]}
              disabled={disabled}
              flash={highlight != null && String(highlight) === ids[i]}
              flashable={highlight !== undefined}
            >
              {(drag) => children(item, i, drag)}
            </SortableItem>
          ))}
        </Tag>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, disabled, flash, flashable, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const nodeRef = useRef(null);
  const setRef = useCallback(
    (el) => {
      nodeRef.current = el;
      setNodeRef(el);
    },
    [setNodeRef],
  );
  useEffect(() => {
    if (flash) nodeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [flash]);
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    position: "relative",
  };
  return (
    <div
      ref={setRef}
      style={style}
      className={cn(
        isDragging && "drop-shadow-2xl",
        flashable &&
          "rounded-2xl outline-2 -outline-offset-2 transition-[outline-color] duration-700",
        flashable && (flash ? "outline-brand-400" : "outline-transparent"),
      )}
    >
      {children({
        dragging: isDragging,
        handle: disabled
          ? {}
          : { ...attributes, ...listeners, style: { touchAction: "manipulation", cursor: "grab" } },
      })}
    </div>
  );
}

/** Nút tay nắm để kéo (dùng cho thẻ có ô nhập liệu): <DragHandle {...drag.handle} /> */
export function DragHandle({ className, light, ...props }) {
  return (
    <button
      type="button"
      title="Giữ và kéo để đổi vị trí"
      aria-label="Giữ và kéo để đổi vị trí"
      {...props}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg transition active:cursor-grabbing",
        light
          ? "text-white/70 hover:bg-white/15 hover:text-white"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
        className,
      )}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

/** Chuyển 1 mục từ vị trí `from` sang vị trí `to` (tính từ 0) trong danh sách đầy đủ */
export function moveItem(list, from, to) {
  const target = Math.min(Math.max(0, to), list.length - 1);
  if (from < 0 || from >= list.length || from === target) return list;
  return arrayMove(list, from, target);
}

/**
 * Đổi thứ tự cho danh sách có phân trang (usePaged) — không bị giới hạn trong 1 trang.
 *   all        : danh sách đầy đủ đang xếp (vd. mọi điểm đến của 1 miền)
 *   paged      : kết quả usePaged(all, cỡTrang)
 *   onReorder  : (danhSáchĐầyĐủMới) => lưu thứ tự
 * Trả về { onPageReorder, moveTo, reveal(id), flash, badge(item, i) }.
 *   reveal(id): vừa thêm mới → khi danh sách tải lại có mục đó thì sang đúng trang, cuộn tới và nháy viền.
 */
export function usePagedSort({ all, paged, onReorder, getId = (x) => x.id }) {
  const [flash, setFlash] = useState(null);
  const [pending, setPending] = useState(null);
  // nháy viền ~2 giây rồi tắt
  useEffect(() => {
    if (flash == null) return;
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash]);

  const pulse = (id) => setFlash(id);

  // mục vừa thêm đã có trong danh sách → chuyển tới trang chứa nó (điều chỉnh state ngay khi render)
  if (pending != null) {
    const at = all.findIndex((x) => String(getId(x)) === pending);
    if (at >= 0) {
      setPending(null);
      paged.setPage(Math.floor(at / (paged.meta?.limit || all.length || 1)) + 1);
      setFlash(pending);
    }
  }
  const reveal = useCallback((id) => id != null && setPending(String(id)), []);

  /** kéo – thả trong trang đang xem → ghép trang vào đúng chỗ trong danh sách đầy đủ */
  const onPageReorder = (pageItems) =>
    onReorder([
      ...all.slice(0, paged.offset),
      ...pageItems,
      ...all.slice(paged.offset + pageItems.length),
    ]);

  /** chuyển 1 mục tới vị trí `position` (1 … N), sang trang có mục đó và nháy viền */
  const moveTo = (item, position) => {
    const id = getId(item);
    const from = all.findIndex((x) => getId(x) === id);
    const to = Math.min(Math.max(1, Math.round(Number(position)) || 1), all.length) - 1;
    if (from < 0) return;
    if (from !== to) onReorder(moveItem(all, from, to));
    paged.setPage(Math.floor(to / (paged.meta?.limit || all.length || 1)) + 1);
    pulse(String(id));
  };

  const badge = (item, i) => ({
    position: paged.offset + i + 1,
    total: all.length,
    onMove: (p) => moveTo(item, p),
  });

  return { onPageReorder, moveTo, reveal, flash, badge };
}

// chặn sự kiện để bấm vào số thứ tự / ô nhập không kích hoạt kéo – thả của thẻ bên ngoài
const stop = (e) => e.stopPropagation();
const STOP = {
  onPointerDown: stop,
  onMouseDown: stop,
  onTouchStart: stop,
  onKeyDown: stop,
  onClick: stop,
};

/**
 * Số thứ tự của mục; bấm vào → popup nhỏ "Chuyển tới vị trí" (nhập số, Lên đầu, Xuống cuối).
 *   <PositionBadge position={5} total={23} onMove={(p) => …} />   (thường dùng {...sort.badge(item, i)})
 */
export function PositionBadge({ position, total, onMove, className, light }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  return (
    <span {...STOP} className="inline-flex shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Vị trí hiện tại — bấm để chuyển tới vị trí khác"
        aria-label={`Vị trí ${position} trên ${total}. Bấm để chuyển tới vị trí khác`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-lg px-1.5 text-xs font-bold tabular-nums shadow-sm ring-1 transition",
          "focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none",
          light
            ? "bg-white/90 text-slate-700 ring-white/60 backdrop-blur hover:bg-white hover:text-brand-700"
            : "bg-white text-slate-600 ring-slate-200 hover:text-brand-700 hover:ring-brand-300",
          open && "text-brand-700 ring-2 ring-brand-400",
          className,
        )}
      >
        {position}
      </button>
      {open && (
        <MovePopover
          anchor={btnRef}
          position={position}
          total={total}
          onClose={close}
          onMove={(p) => {
            setOpen(false);
            if (p !== position) onMove(p);
          }}
        />
      )}
    </span>
  );
}

const POPOVER_W = 248;

function MovePopover({ anchor, position, total, onClose, onMove }) {
  const [value, setValue] = useState(String(position));
  const [pos, setPos] = useState(null);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // đặt popup ngay dưới (hoặc trên, nếu thiếu chỗ) nút số, luôn nằm trong màn hình
  useEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const h = boxRef.current?.offsetHeight || 170;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - POPOVER_W - 8);
      const below = r.bottom + 6;
      const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below;
      setPos({ left, top });
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
    const away = (e) => {
      if (boxRef.current?.contains(e.target) || anchor.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [anchor, onClose]);

  const n = Number(value);
  const valid = value !== "" && Number.isInteger(n) && n >= 1 && n <= total;
  const quick =
    "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45";

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      {...STOP}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          onClose();
          anchor.current?.focus();
        }
      }}
      ref={boxRef}
      role="dialog"
      aria-label="Chuyển tới vị trí"
      style={{ width: POPOVER_W, ...(pos ?? { left: -9999, top: 0 }) }}
      className="fixed z-[80] rounded-2xl bg-white p-3 text-left shadow-[0_18px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200"
    >
      <p className="text-[13px] font-semibold text-slate-800">Chuyển tới vị trí</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Đang ở vị trí {position} / {total}
      </p>
      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onMove(n);
        }}
      >
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={1}
          max={total}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`Vị trí mới (1 – ${total})`}
          aria-invalid={value !== "" && !valid}
          className="h-10 w-0 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-base tabular-nums outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-sun-400 sm:h-9 sm:text-sm"
        />
        <button
          type="submit"
          disabled={!valid || n === position}
          className="h-9 rounded-xl bg-brand-700 px-3.5 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:opacity-45"
        >
          Chuyển
        </button>
      </form>
      <div className="mt-2 flex gap-2">
        <button type="button" className={quick} disabled={position === 1} onClick={() => onMove(1)}>
          <ArrowUpToLine className="size-3.5" />
          Lên đầu
        </button>
        <button
          type="button"
          className={quick}
          disabled={position === total}
          onClick={() => onMove(total)}
        >
          <ArrowDownToLine className="size-3.5" />
          Xuống cuối
        </button>
      </div>
    </div>,
    document.body,
  );
}
