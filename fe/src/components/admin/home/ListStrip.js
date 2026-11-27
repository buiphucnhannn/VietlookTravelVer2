"use client";

import { useMemo, useState } from "react";
import { EyeOff, ImageOff, Plus, Sparkles, X } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { cn } from "@/lib/utils";
import Link from "../Link";
import { Sortable } from "../Sortable";
import { Pic, PickerModal, grab, useTap } from "./shared";

/**
 * THANH SỬA dưới một khối của bản xem trước trang chủ (khối phía trên hiện y như website).
 * Nằm ngoài "trang web" nên giữ cỡ chữ thật của trang quản trị (bù lại độ thu nhỏ của khung xem trước).
 *   <EditBar title="Tour nổi bật" hint="…">…</EditBar>
 */
export function EditBar({ title, hint, href, linkText, children, className }) {
  return (
    <div
      className={cn(
        "relative z-20 [zoom:var(--pz,1)] border-y border-dashed border-blue-300/70 bg-[linear-gradient(180deg,#f5f9ff,#eef4ff)] px-4 py-3 font-sans text-slate-700 sm:px-6",
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Sparkles className="size-3" /> {title}
          </span>
          {hint && <span className="text-slate-500">{hint}</span>}
          {href && (
            <Link
              href={href}
              className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900"
            >
              {linkText}
            </Link>
          )}
        </p>
        {children}
      </div>
    </div>
  );
}

const sameId = (v) => v;

/**
 * Danh sách chọn & sắp xếp gọn (tour, chủ đề, điểm đến): thẻ nhỏ kéo thả đổi thứ tự, nút × để gỡ, nút Thêm.
 * - `options`: [{ value, label, image, sub, hidden }] — để hiện tên, ảnh của mục đã chọn
 * - `auto`: các mục website đang TỰ hiện khi danh sách trống → hiện mờ + nút "Dùng gợi ý này"
 * - `swap`: bấm vào 1 thẻ → chọn mục khác thay vào đúng ô đó (chọn mục đang ở ô khác → 2 ô đổi chỗ)
 */
export function ListStrip({
  value,
  onChange,
  options,
  status,
  max,
  unit,
  pickerTitle,
  emptyHref,
  searchPlaceholder,
  onSearch,
  auto = [],
  autoText,
  adoptText = "Dùng gợi ý này",
  swap,
}) {
  const [picking, setPicking] = useState(null); // "add" | số ô cần thay
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const room = max - value.length;
  const preview = !value.length;

  /** Đặt `v` vào ô `i`; nếu `v` đang ở ô khác thì hai ô đổi chỗ */
  const place = (i, v) => {
    const next = [...value];
    const j = next.indexOf(v);
    if (j >= 0) [next[i], next[j]] = [next[j], next[i]];
    else next[i] = v;
    onChange(next);
  };

  return (
    <>
      {preview ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600">{autoText}</span>
          {auto.length > 0 && (
            <button
              type="button"
              onClick={() => onChange(auto.slice(0, max))}
              className="rounded-full bg-brand-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-brand-800"
            >
              {adoptText}
            </button>
          )}
          <AddButton onClick={() => setPicking("add")} unit={unit} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Sortable
            items={value}
            getId={sameId}
            onReorder={onChange}
            layout="horizontal"
            className="flex flex-wrap items-center gap-2"
          >
            {(v, i, drag) => (
              <Chip
                index={i}
                item={byValue.get(v)}
                loading={status === "loading"}
                drag={drag}
                unit={unit}
                onTap={swap ? () => setPicking(i) : undefined}
                onRemove={() => onChange(value.filter((x) => x !== v))}
              />
            )}
          </Sortable>
          {room > 0 && <AddButton onClick={() => setPicking("add")} unit={unit} />}
          <span className="ml-auto text-[11px] text-slate-500">
            {value.length}/{max} · kéo thả để sắp xếp{swap ? " · bấm vào thẻ để thay" : ""}
          </span>
        </div>
      )}

      {picking === "add" && (
        <PickerModal
          multi
          title={pickerTitle}
          options={options}
          status={status}
          emptyHref={emptyHref}
          taken={value}
          room={room}
          unit={unit}
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          onClose={() => setPicking(null)}
          onPick={(vals) => {
            onChange([...value, ...vals].slice(0, max));
            setPicking(null);
          }}
        />
      )}
      {typeof picking === "number" && (
        <PickerModal
          title={`Chọn ${unit} cho ô số ${picking + 1}`}
          description={`Chọn ${unit} đang nằm ở ô khác thì hai ô sẽ đổi chỗ cho nhau.`}
          options={options}
          status={status}
          emptyHref={emptyHref}
          taken={value}
          unit={unit}
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          onClose={() => setPicking(null)}
          onPick={([v]) => {
            place(picking, v);
            setPicking(null);
          }}
        />
      )}
    </>
  );
}

function AddButton({ onClick, unit }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-blue-400 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-600 hover:bg-blue-50"
    >
      <Plus className="size-3.5" /> Thêm {unit}
    </button>
  );
}

function Chip({ index, item, loading, drag, unit, onTap, onRemove }) {
  const tap = useTap(onTap);
  return (
    <div
      {...grab(drag)}
      {...(onTap ? tap : {})}
      title={item?.label}
      className={cn(
        "group relative flex h-9 max-w-[15rem] items-center gap-2 rounded-lg bg-white py-1 pr-1 pl-1 text-xs shadow-sm ring-1 select-none",
        drag?.dragging ? "shadow-lg ring-blue-500" : "ring-slate-200 hover:ring-blue-400",
        onTap ? "cursor-pointer" : "cursor-grab",
      )}
    >
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
        {index + 1}
      </span>
      <span className="relative grid h-7 w-10 shrink-0 place-items-center overflow-hidden rounded bg-slate-100 text-slate-300">
        <ImageOff className="size-3" />
        <Pic src={item?.image} sizes="48px" />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-medium",
          item ? "text-slate-800" : "text-slate-400",
        )}
      >
        {item ? item.label : loading ? "Đang tải…" : `${unit} không còn nữa — nên gỡ ra`}
      </span>
      {item?.hidden && (
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-amber-700">
          <EyeOff className="size-3" /> Đang ẩn
        </span>
      )}
      <button
        type="button"
        aria-label={`Gỡ ${unit} này`}
        title="Gỡ"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="grid size-7 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export const TOURS_HREF = `${ADMIN_BASE}/tours`;
