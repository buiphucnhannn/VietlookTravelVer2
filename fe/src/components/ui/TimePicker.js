"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { isTime, parseTime } from "@/lib/dates";

/**
 * Ô giờ DÙNG CHUNG thay cho <input type="time"> (trình duyệt hiện theo ngôn ngữ máy: "09:00 SA", "9:00 AM"…).
 * Ô này luôn hiện **HH:mm (24 giờ)** ở mọi ngôn ngữ / máy; giá trị "HH:mm".
 *
 * - Gõ tay: chỉ nhận số và ":"; 4 số tự chèn ":" (0930 → 09:30); rời ô → chuẩn hoá (930 → 09:30, 9 → 09:00)
 *   hoặc báo giờ không hợp lệ (00:00–23:59).
 * - Danh sách giờ thường dùng (mỗi `step` phút; nút đồng hồ bên phải hoặc phím ↓): ↑ ↓ Home End Enter, Esc chỉ đóng
 *   danh sách. Cùng cách hiện với ô ngày (components/ui/DatePicker.js): <dialog> lớp trên cùng, điện thoại → thẻ giữa
 *   màn hình.
 * - onChange({ target: { value } }) như ô input thường; gõ dở / sai → value là đúng chữ đã gõ → form kiểm tra.
 */

const L = {
  en: {
    open: "Choose time",
    close: "Close",
    invalid: "Please enter a valid time (HH:mm, 24-hour)",
  },
  zh: { open: "选择时间", close: "关闭", invalid: "请输入有效时间（HH:mm，24小时制）" },
  vi: { open: "Chọn giờ", close: "Đóng", invalid: "Giờ không hợp lệ (HH:mm, 24 giờ)" },
};

/** Chữ gõ vào → chỉ số và một dấu ":", 4 số liền → chèn ":" */
function maskInput(raw, prev) {
  let s = String(raw)
    .replace(/[.hH\s]/g, ":")
    .replace(/[^\d:]/g, "");
  const i = s.indexOf(":");
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/:/g, "");
  if (s.length < prev.length) return s; // đang xoá → để nguyên
  if (i < 0 && s.length >= 4) s = `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return s.slice(0, 5);
}

const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3);
const fromMin = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function TimePicker({
  value = "",
  onChange,
  id,
  name,
  required,
  disabled,
  lang = "en",
  step = 30,
  className,
  wrapperClassName,
  placeholder = "HH:mm",
  onBlur,
  onKeyDown,
  "aria-invalid": ariaInvalid,
  "aria-describedby": describedBy,
  ...rest
}) {
  const t = L[lang] ?? L.en;
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const msgId = `${autoId}-msg`;
  const listId = `${autoId}-list`;

  const [text, setText] = useState(() => String(value ?? ""));
  // Giá trị từ ngoài đổi → hiện lại; giá trị do chính ô này gửi đi → giữ chữ đang gõ
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const mine = isTime(value) ? parseTime(text) === value : String(value ?? "") === text;
    if (!mine) setText(String(value ?? ""));
  }

  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [centered, setCentered] = useState(false);
  const wrapRef = useRef(null);
  const dlgRef = useRef(null);
  const btnRef = useRef(null);

  const time = isTime(value) ? value : parseTime(text);
  const own = touched && text.trim() && !time ? t.invalid : "";
  const parentInvalid = ariaInvalid === true || ariaInvalid === "true";
  const showOwn = Boolean(own) && !parentInvalid;
  const emit = (v) => onChange?.({ target: { value: v, name, id: inputId } });

  const options = Array.from({ length: Math.ceil(1440 / step) }, (_, i) => fromMin(i * step));
  // Giờ đang chọn, hoặc mốc gần nhất (để mở danh sách đúng chỗ)
  const active = time
    ? (options.find((o) => o === time) ??
      options.reduce((a, o) =>
        Math.abs(toMin(o) - toMin(time)) < Math.abs(toMin(a) - toMin(time)) ? o : a,
      ))
    : "09:00";

  const openList = () => {
    if (disabled) return;
    setCentered(window.matchMedia("(max-width: 639px)").matches);
    setOpen(true);
  };
  const closeList = (refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus({ preventScroll: true });
  };
  const pick = (v) => {
    setText(v);
    setTouched(false);
    emit(v);
    closeList();
  };

  useLayoutEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    if (!open) {
      if (dlg.open) dlg.close();
      return;
    }
    if (!dlg.open) dlg.showModal();
    // giờ đang chọn nằm giữa danh sách + nhận con trỏ bàn phím
    const cur = dlg.querySelector(`[data-time="${active}"]`);
    cur?.scrollIntoView({ block: "center" });
    cur?.focus({ preventScroll: true });
    if (centered) return;
    const place = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      dlg.style.width = `${Math.max(r.width, 160)}px`;
      const w = dlg.offsetWidth;
      const h = dlg.offsetHeight;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      let top = r.bottom + 6;
      if (top + h > vh - 8 && r.top - h - 6 >= 8) top = r.top - h - 6;
      top = Math.max(8, Math.min(top, vh - h - 8));
      dlg.style.top = `${top}px`;
      dlg.style.left = `${Math.max(8, Math.min(r.left, vw - w - 8))}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
    // chỉ chạy khi mở / đổi kiểu hiện; `active` lúc mở là đủ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, centered]);

  useEffect(() => () => dlgRef.current?.open && dlgRef.current.close(), []);

  const onListKey = (e) => {
    const items = [...e.currentTarget.querySelectorAll("[data-time]")];
    const i = items.indexOf(document.activeElement);
    const next = {
      // điện thoại: lưới 3 cột → ↑ ↓ theo hàng, ← → theo ô
      ArrowDown: Math.min(items.length - 1, i + (centered ? 3 : 1)),
      ArrowUp: Math.max(0, i - (centered ? 3 : 1)),
      ...(centered && {
        ArrowRight: Math.min(items.length - 1, i + 1),
        ArrowLeft: Math.max(0, i - 1),
      }),
      Home: 0,
      End: items.length - 1,
      PageDown: Math.min(items.length - 1, i + 4),
      PageUp: Math.max(0, i - 4),
    }[e.key];
    if (next == null) return;
    e.preventDefault();
    items[next]?.focus();
    items[next]?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className={wrapperClassName}>
      <div ref={wrapRef} className="relative">
        <input
          {...rest}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={5}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          value={text}
          aria-invalid={parentInvalid || Boolean(own) || undefined}
          aria-describedby={cn(describedBy, showOwn && msgId) || undefined}
          onChange={(e) => {
            const next = maskInput(e.target.value, text);
            setText(next);
            setTouched(false);
            emit(parseTime(next) ?? next);
          }}
          onBlur={(e) => {
            setTouched(true);
            if (time && text !== time) setText(time); // 930 → 09:30
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              openList();
              return;
            }
            onKeyDown?.(e);
          }}
          className={cn(className, "pr-11 tabular-nums")}
        />
        <button
          ref={btnRef}
          type="button"
          disabled={disabled}
          aria-label={t.open}
          title={t.open}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => (open ? closeList() : openList())}
          className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none disabled:opacity-40"
        >
          <Clock className="size-[18px]" />
        </button>
      </div>
      {showOwn && (
        <p id={msgId} role="alert" className="mt-1 text-xs font-medium text-sun-600">
          {own}
        </p>
      )}

      <dialog
        ref={dlgRef}
        aria-label={t.open}
        onCancel={(e) => {
          e.preventDefault();
          closeList();
        }}
        onKeyDown={(e) => {
          // Esc chỉ đóng danh sách, không lan ra popup / form cha
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            closeList();
          }
        }}
        onMouseDown={(e) => e.target === e.currentTarget && closeList(false)}
        style={
          centered
            ? { inset: 0, margin: "auto", height: "fit-content" }
            : { right: "auto", bottom: "auto", margin: 0 }
        }
        className={cn(
          "overflow-visible bg-transparent p-0 text-ink",
          centered
            ? "w-[min(18rem,calc(100vw-2rem))] backdrop:bg-slate-900/45"
            : "backdrop:bg-transparent",
        )}
      >
        {open && (
          <div className="rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-900/10">
            <div
              id={listId}
              role="listbox"
              aria-label={t.open}
              onKeyDown={onListKey}
              className={cn(
                "overflow-y-auto overscroll-contain",
                centered ? "grid max-h-[60dvh] grid-cols-3 gap-1" : "max-h-60",
              )}
            >
              {options.map((o) => {
                const on = o === time;
                return (
                  <button
                    key={o}
                    type="button"
                    role="option"
                    aria-selected={on}
                    data-time={o}
                    tabIndex={o === active ? 0 : -1}
                    onClick={() => pick(o)}
                    className={cn(
                      "w-full rounded-lg px-3 text-sm tabular-nums transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none",
                      centered ? "h-11 text-center" : "h-9 text-left",
                      on
                        ? "bg-brand-600 font-bold text-white"
                        : "font-medium text-slate-800 hover:bg-brand-50 hover:text-brand-700",
                    )}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {centered && (
              <div className="mt-1.5 flex justify-end border-t border-slate-100 pt-1.5">
                <button
                  type="button"
                  onClick={() => closeList()}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.close}
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}
