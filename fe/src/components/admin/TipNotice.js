"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Notice } from "./ui";

/**
 * Mẹo nhỏ (vd. cách kéo thả để đổi thứ tự) có nút ×. Đã tắt → nhớ trên máy này (localStorage),
 * không hiện lại. Trình duyệt chặn lưu trữ → vẫn tắt được trong lần xem này.
 */
const PREFIX = "vl-admin-tip:";
const listeners = new Set();
const memory = new Set(); // dự phòng khi localStorage bị chặn

const isDismissed = (id) => {
  if (memory.has(id)) return true;
  try {
    return window.localStorage.getItem(PREFIX + id) === "1";
  } catch {
    return false;
  }
};

const dismiss = (id) => {
  memory.add(id);
  try {
    window.localStorage.setItem(PREFIX + id, "1");
  } catch {
    /* chế độ ẩn danh / chặn lưu trữ → chỉ nhớ trong phiên */
  }
  for (const fn of listeners) fn();
};

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export default function TipNotice({ id, title, children, className }) {
  const hidden = useSyncExternalStore(
    subscribe,
    () => isDismissed(id),
    () => true, // máy chủ: chưa biết → không hiện, tránh nháy
  );
  if (hidden) return null;
  return (
    <div className={className}>
      <div className="relative">
        <Notice title={title} className="pr-11">
          {children}
        </Notice>
        <button
          type="button"
          onClick={() => dismiss(id)}
          aria-label="Ẩn mẹo này"
          title="Ẩn mẹo này"
          className="absolute top-2 right-2 grid size-7 place-items-center rounded-lg text-brand-700/70 transition hover:bg-brand-100 hover:text-brand-900"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
