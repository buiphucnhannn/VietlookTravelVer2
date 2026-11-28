"use client";

import { useRef, useState } from "react";
import { EyeOff, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolButton, useDismiss } from "./chrome";

/**
 * "Đi tới khối": menu ở khung trên của trình sửa trang — liệt kê các khối của bản xem trước, bấm 1 khối → cuộn
 * tới đúng khối đó (trang dài như Trang chủ có ~20 khối).
 *
 * Danh sách đọc thẳng từ bản xem trước: mọi phần tử có `data-jump="<Tên khối>"` (khối Zone / Block, các phần của
 * trang Giới thiệu…) trong cùng khung [data-editor-frame]; thêm `data-jump-hidden` → ghi "Đang ẩn".
 * Khối lồng trong khối CÙNG TÊN (vd. Block bọc Zone) chỉ tính 1 lần; khối đang không hiện (display:none) bị bỏ.
 */

/** Các khối đang có trong bản xem trước, theo thứ tự trên trang */
function readBlocks(frame) {
  if (!frame) return [];
  const out = [];
  for (const el of frame.querySelectorAll("[data-jump]")) {
    const name = el.getAttribute("data-jump")?.trim();
    if (!name || !el.getClientRects().length) continue;
    const parent = el.parentElement?.closest("[data-jump]");
    if (parent && frame.contains(parent) && parent.getAttribute("data-jump")?.trim() === name)
      continue;
    const hidden = el.hasAttribute("data-jump-hidden") || !!el.closest("[data-jump-hidden]");
    out.push({ el, name, hidden });
  }
  return out;
}

/** Thanh dính phía trên (header điện thoại) — chừa chỗ khi cuộn tới */
const topRoom = () => {
  const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  return Number.isFinite(pad) && pad > 0 ? pad : window.innerWidth < 1024 ? 80 : 16;
};

/**
 * Cuộn tới khối (giữ chỗ cho thanh dính phía trên). Khối xa chưa vẽ (content-visibility) có chiều cao ước lượng →
 * sau khi cuộn xong đo lại và chỉnh cho đúng. Nháy viền nhẹ để thấy khối vừa tới.
 */
function scrollToBlock(el) {
  const go = (behavior) => {
    const top = el.getBoundingClientRect().top + window.scrollY - topRoom();
    window.scrollTo({ top: Math.max(0, top), behavior });
  };
  go("smooth");
  let tries = 0;
  const fix = () => {
    const off = el.getBoundingClientRect().top - topRoom();
    if (Math.abs(off) > 4 && tries++ < 3) {
      go("auto");
      setTimeout(fix, 160);
    }
  };
  setTimeout(fix, 520);
  el.animate?.(
    [
      { boxShadow: "inset 0 0 0 3px rgba(37,99,235,0.7)" },
      { boxShadow: "inset 0 0 0 3px rgba(37,99,235,0)" },
    ],
    { duration: 1400, delay: 350, easing: "ease-out" },
  );
}

export default function JumpMenu() {
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);

  const toggle = () => {
    if (!open) setBlocks(readBlocks(ref.current?.closest("[data-editor-frame]")));
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} className="relative">
      <ToolButton
        icon={ListTree}
        label="Đi tới khối"
        active={open}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggle}
      />
      {open && (
        <div
          role="menu"
          aria-label="Đi tới khối"
          className="absolute top-full left-0 z-50 mt-2 max-h-[min(26rem,70vh)] w-64 animate-[admin-pop_.16s_ease-out] scrollbar-thin overflow-y-auto overscroll-contain rounded-2xl bg-white p-1.5 shadow-[0_18px_48px_-16px_rgba(10,37,60,0.45)] ring-1 ring-slate-200 sm:right-0 sm:left-auto"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Các khối trên trang
          </p>
          {blocks.length ? (
            blocks.map((b, i) => (
              <button
                key={`${b.name}-${i}`}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  scrollToBlock(b.el);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-800",
                  b.hidden && "text-slate-400",
                )}
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{b.name}</span>
                {b.hidden && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    <EyeOff className="size-3" />
                    Đang ẩn
                  </span>
                )}
              </button>
            ))
          ) : (
            <p className="px-2.5 py-3 text-sm text-slate-500">Trang này chưa chia khối.</p>
          )}
        </div>
      )}
    </div>
  );
}
