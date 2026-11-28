"use client";

import { useCallback, useContext, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageCopyContext } from "./page-copy/blocks";

/**
 * BẬT / TẮT TỪNG KHỐI TRÊN WEBSITE (dùng chung Trang chủ · Giao diện trang · Giới thiệu).
 * - Công tắc nhỏ "Hiện / Ẩn trên website" ở mép trên khối: chỉ hiện khi rê chuột vào khối (màn cảm ứng:
 *   luôn hiện) → không che nội dung khi chỉ xem. Khối đang ẩn: công tắc luôn hiện kèm chữ "Đang ẩn trên website".
 * - Khối đang ẩn vẫn hiện trong trình sửa nhưng mờ đi (HIDDEN_DIM) để sửa trước — bật lại là lên website.
 * - Dữ liệu: `hidden: { <khoá khối>: true }` (lib/hidden-blocks.mjs). Banner / đầu trang không có công tắc.
 */

/** Lớp chuyển động mờ / rõ của phần nội dung khối */
export const DIM_TRANSITION = "transition-[opacity,filter] duration-200";
/** Khối đang ẩn: mờ ~45%, bớt màu */
export const HIDDEN_DIM = "opacity-45 saturate-[.3]";

/**
 * Lớp đặt chỗ + hiện / ẩn công tắc theo nhóm rê chuột `group` (vd. "zl" → group-hover/zl). Khi khối đang hiện:
 * ẩn hẳn (không bấm nhầm) cho tới khi rê chuột / chọn vào khối.
 */
const REVEAL = {
  zl: "pointer-events-none opacity-0 group-focus-within/zl:pointer-events-auto group-focus-within/zl:opacity-100 group-hover/zl:pointer-events-auto group-hover/zl:opacity-100",
  zone: "pointer-events-none opacity-0 group-focus-within/zone:pointer-events-auto group-focus-within/zone:opacity-100 group-hover/zone:pointer-events-auto group-hover/zone:opacity-100",
  sec: "pointer-events-none opacity-0 group-focus-within/sec:pointer-events-auto group-focus-within/sec:opacity-100 group-hover/sec:pointer-events-auto group-hover/sec:opacity-100",
};

/**
 * Công tắc "Hiện / Ẩn trên website" của 1 khối (đặt tuyệt đối trong khung khối — `className` chọn góc).
 * `group`: tên nhóm rê chuột của khung khối ("zl" = Zone, "zone" = khối Trang chủ, "sec" = khối trang Giới thiệu).
 * `inline`: nằm trong 1 hàng nút có sẵn (không đặt tuyệt đối).
 */
export function BlockSwitch({ name, hidden, onChange, group = "zl", inline, className }) {
  const label = `Hiện / Ẩn khối “${name}” trên website`;
  return (
    <span
      data-edit-ui
      className={cn(
        "z-40 flex [zoom:var(--pz,1)] transition-opacity duration-150",
        inline ? "pointer-events-auto relative" : "absolute",
        !hidden && REVEAL[group],
        !hidden && "[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100",
        // mặc định: giữa, nằm vắt trên mép trên của khối (không đè tiêu đề khối; góc trái / phải trên thường là
        // nhãn đổi ảnh nền, nút cắt ảnh, nhãn ⚡)
        className ?? (inline ? "" : "-top-3.5 left-1/2 -translate-x-1/2"),
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={!hidden}
        aria-label={label}
        title={
          hidden
            ? `Khối “${name}” đang ẩn trên website — bấm để hiện lại`
            : `Bấm để ẩn khối “${name}” trên website`
        }
        onClick={(e) => {
          e.stopPropagation();
          onChange(!hidden);
        }}
        className={cn(
          "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full pr-1 pl-2.5 font-sans text-[11px] leading-none font-semibold tracking-normal whitespace-nowrap normal-case shadow-md ring-1 transition-colors",
          hidden
            ? "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100"
            : "bg-white/95 text-slate-600 ring-slate-900/10 hover:text-slate-900",
        )}
      >
        {hidden ? (
          <EyeOff className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <Eye className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
        )}
        <span className="truncate">
          {hidden ? "Đang ẩn trên website · vẫn sửa được" : "Hiện trên website"}
        </span>
        {/* rãnh công tắc */}
        <span
          aria-hidden
          className={cn(
            "relative ml-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
            hidden ? "bg-slate-300" : "bg-emerald-500",
          )}
        >
          <span
            className={cn(
              "absolute size-3 rounded-full bg-white shadow transition-[left]",
              hidden ? "left-0.5" : "left-[0.875rem]",
            )}
          />
        </span>
      </button>
    </span>
  );
}

const noSub = () => () => {};

/**
 * Cờ ẩn khối `key` trong dữ liệu đang soạn của Giao diện trang (PageCopyContext): [đang ẩn?, đặt(ẩn)].
 * `key` trống → [false, null] (khối không tắt được). Chỉ vẽ lại khi chính cờ này đổi.
 */
export function usePageCopyHidden(key) {
  const ctx = useContext(PageCopyContext);
  const store = key && ctx?.entry?.hideable?.includes(key) ? ctx.store : null;
  const snap = () => (store ? store.get()?.hidden?.[key] === true : false);
  const hidden = useSyncExternalStore(store?.subscribe ?? noSub, snap, snap);
  const set = useCallback(
    (on) =>
      store.set((s) => {
        const next = { ...s?.hidden };
        if (on) next[key] = true;
        else delete next[key];
        return { ...s, hidden: next };
      }),
    [store, key],
  );
  return [hidden, store ? set : null];
}
