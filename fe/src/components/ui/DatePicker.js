"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  datePlaceholder,
  fmtDate,
  fmtDateInput,
  fmtDayChip,
  isISODate,
  parseDate,
  toISODate,
} from "@/lib/dates";

/**
 * Ô chọn ngày DÙNG CHUNG (website + CMS) thay cho <input type="date"> (trình duyệt hiện theo ngôn ngữ máy:
 * theo máy người dùng, không theo trang). Ô này hiện ngày theo NGÔN NGỮ TRANG (lib/dates.js), mọi máy như nhau:
 * en mm/dd/yyyy · vi (website tiếng Việt + CMS) dd/mm/yyyy · zh yyyy/mm/dd.
 *
 * - Gõ tay: chỉ nhận số, tự chèn "/" (vi 14112026 → 14/11/2026; zh 20261114 → 2026/11/14);
 *   rời ô → báo ngày sai / ngoài khoảng min–max.
 * - Lịch (nút bên phải, hoặc phím ↓ trong ô): tuần bắt đầu thứ Hai, tô hôm nay, khoá ngày ngoài khoảng;
 *   phím mũi tên / PageUp / PageDown / Home / End / Enter / Esc. Điện thoại: thẻ giữa màn hình, nền mờ.
 *   Dùng <dialog> (lớp trên cùng) → không bị khung cha overflow / transform cắt, không làm đóng popup cha.
 * - Giá trị vẫn là ISO "YYYY-MM-DD": onChange({ target: { value } }) như ô input thường.
 *   Đang gõ dở / gõ sai → value là đúng chữ đã gõ (không phải ISO) → form kiểm tra và báo lỗi như cũ.
 */

const L = {
  en: {
    open: "Choose date",
    prev: "Previous month",
    next: "Next month",
    today: "Today",
    clear: "Clear",
    close: "Close",
    invalid: "Please enter a valid date (mm/dd/yyyy)",
    min: (d) => `Please choose a date on or after ${d}`,
    max: (d) => `Please choose a date on or before ${d}`,
    week: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    locale: "en-US",
  },
  zh: {
    open: "选择日期",
    prev: "上个月",
    next: "下个月",
    today: "今天",
    clear: "清除",
    close: "关闭",
    invalid: "请输入有效日期（yyyy/mm/dd）",
    min: (d) => `请选择 ${d} 或之后的日期`,
    max: (d) => `请选择 ${d} 或之前的日期`,
    week: ["一", "二", "三", "四", "五", "六", "日"],
    locale: "zh-CN",
  },
  vi: {
    open: "Chọn ngày",
    prev: "Tháng trước",
    next: "Tháng sau",
    today: "Hôm nay",
    clear: "Xoá",
    close: "Đóng",
    invalid: "Ngày không hợp lệ (định dạng dd/mm/yyyy)",
    min: (d) => `Vui lòng chọn ngày từ ${d} trở đi`,
    max: (d) => `Vui lòng chọn ngày đến ${d} là muộn nhất`,
    week: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    locale: "vi-VN",
  },
};

/**
 * Chữ gõ vào → dạng số đang gõ dở (tự chèn "/", tối đa 10 ký tự):
 * en/vi "11/27/2026" · "27/11/2026" (2-2-4 chữ số) · zh "2026/11/27" (4-2-2 chữ số; nhận cả 年 月 日)
 */
function maskInput(raw, prev, lang) {
  const s = String(raw)
    .replace(/[.\-\s年月]/g, "/")
    .replace(/[^\d/]/g, "");
  // Đang xoá → để nguyên (xoá được qua dấu "/")
  if (s.length < prev.length) return s;
  // Số chữ số của từng phần
  const [a, b, c] = lang === "zh" ? [4, 2, 2] : [2, 2, 4];
  const parts = s.split("/").slice(0, 3);
  if (parts.length === 1) {
    const d = parts[0].slice(0, a + b + c);
    if (d.length < a) return d;
    if (d.length < a + b) return `${d.slice(0, a)}/${d.slice(a)}`;
    return `${d.slice(0, a)}/${d.slice(a, a + b)}/${d.slice(a + b)}`;
  }
  const [p0, p1 = "", p2 = ""] = parts;
  const first = p0.slice(0, a);
  if (parts.length === 2) {
    // en "11/2712" → tháng + ngày + phần năm
    if (p1.length > b) return `${first}/${p1.slice(0, b)}/${p1.slice(b, b + c)}`;
    return p1.length === b ? `${first}/${p1}/` : `${first}/${p1}`;
  }
  return `${first}/${p1.slice(0, b)}/${p2.slice(0, c)}`;
}

const isoParts = (iso) => iso.split("-").map(Number);
/** Cộng ngày cho "YYYY-MM-DD" (giờ UTC) */
function addDays(iso, n) {
  const [y, m, d] = isoParts(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
/** Cộng tháng, giữ ngày (31 → ngày cuối tháng nếu tháng ngắn hơn) */
function addMonths(iso, n) {
  const [y, m, d] = isoParts(iso);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return toISODate(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(d, last));
}
/** 0 = thứ Hai … 6 = Chủ nhật */
const mondayIndex = (iso) => {
  const [y, m, d] = isoParts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};
/** Hôm nay theo giờ máy người dùng */
const localToday = () => {
  const n = new Date();
  return toISODate(n.getFullYear(), n.getMonth() + 1, n.getDate());
};
const clampISO = (iso, min, max) => (min && iso < min ? min : max && iso > max ? max : iso);
const textOf = (v, lang) => (isISODate(v) ? fmtDateInput(v, lang) : String(v ?? ""));

export default function DatePicker({
  value = "",
  onChange,
  id,
  name,
  min,
  max,
  required,
  disabled,
  lang = "en",
  className,
  wrapperClassName,
  placeholder,
  isDisabled,
  onKeyDown,
  onBlur,
  "aria-invalid": ariaInvalid,
  "aria-describedby": describedBy,
  ...rest
}) {
  const t = L[lang] ?? L.en;
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const msgId = `${autoId}-msg`;
  const titleId = `${autoId}-title`;

  const [text, setText] = useState(() => textOf(value, lang));
  // Giá trị từ ngoài đổi (chọn nhanh, đặt lại form…) → hiện lại; giá trị do chính ô này gửi đi → giữ chữ đang gõ
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const mine = isISODate(value) ? parseDate(text, lang) === value : String(value ?? "") === text;
    if (!mine) setText(textOf(value, lang));
  }

  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [centered, setCentered] = useState(false);
  const [focusDay, setFocusDay] = useState("");
  const [today, setToday] = useState("");
  const wrapRef = useRef(null);
  const dlgRef = useRef(null);
  const btnRef = useRef(null);
  const moveFocus = useRef(false);

  const iso = isISODate(value) ? value : parseDate(text, lang);
  let own = "";
  if (touched && text.trim()) {
    if (!iso) own = t.invalid;
    else if (min && iso < min) own = t.min(fmtDate(min, lang));
    else if (max && iso > max) own = t.max(fmtDate(max, lang));
  }
  const parentInvalid = ariaInvalid === true || ariaInvalid === "true";
  const showOwn = Boolean(own) && !parentInvalid;

  const emit = (v) => onChange?.({ target: { value: v, name, id: inputId } });

  const dayOff = (d) => Boolean((min && d < min) || (max && d > max) || isDisabled?.(d));

  const openCalendar = () => {
    if (disabled) return;
    const now = localToday();
    setToday(now);
    setCentered(window.matchMedia("(max-width: 639px)").matches);
    setFocusDay(clampISO(iso || now, min, max));
    moveFocus.current = true;
    setOpen(true);
  };
  const closeCalendar = (refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus({ preventScroll: true });
  };
  const pick = (d) => {
    if (dayOff(d)) return;
    setText(fmtDateInput(d, lang));
    setTouched(false);
    emit(d);
    closeCalendar();
  };

  // Mở / đóng <dialog> (lớp trên cùng) + đặt vị trí: máy tính → ngay dưới ô (lật lên trên nếu thiếu chỗ)
  useLayoutEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    if (!open) {
      if (dlg.open) dlg.close();
      return;
    }
    if (!dlg.open) dlg.showModal();
    if (centered) return;
    const place = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      const w = dlg.offsetWidth;
      const h = dlg.offsetHeight;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      let top = r.bottom + 6;
      if (top + h > vh - 8 && r.top - h - 6 >= 8) top = r.top - h - 6;
      top = Math.max(8, Math.min(top, vh - h - 8));
      const left = Math.max(8, Math.min(r.left, vw - w - 8));
      dlg.style.top = `${top}px`;
      dlg.style.left = `${left}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, centered]);

  // Đưa con trỏ bàn phím tới ngày đang chọn (khi mở / khi di chuyển bằng phím)
  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    dlgRef.current?.querySelector(`[data-iso="${focusDay}"]`)?.focus({ preventScroll: true });
  }, [open, focusDay]);

  // Đóng <dialog> khi ô bị gỡ khỏi trang lúc lịch đang mở
  useEffect(() => () => dlgRef.current?.open && dlgRef.current.close(), []);

  const onGridKey = (e) => {
    const step = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      Home: () => addDays(focusDay, -mondayIndex(focusDay)),
      End: () => addDays(focusDay, 6 - mondayIndex(focusDay)),
      PageUp: () => addMonths(focusDay, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusDay, e.shiftKey ? 12 : 1),
    }[e.key];
    if (!step) return;
    e.preventDefault();
    moveFocus.current = true;
    setFocusDay(step());
  };

  // Lưới 6 tuần × 7 ngày của tháng đang xem (tuần bắt đầu thứ Hai)
  let weeks = [];
  let title = "";
  if (open && focusDay) {
    const [y, m] = isoParts(focusDay);
    const first = toISODate(y, m, 1);
    const start = addDays(first, -mondayIndex(first));
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));
    title = new Intl.DateTimeFormat(t.locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, 1)));
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  const viewMonth = focusDay ? focusDay.slice(0, 7) : "";
  const prevOff = Boolean(min && addMonths(`${viewMonth}-01`, -1).slice(0, 7) < min.slice(0, 7));
  const nextOff = Boolean(max && addMonths(`${viewMonth}-01`, 1).slice(0, 7) > max.slice(0, 7));
  const navBtn =
    "grid size-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30";

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
          maxLength={10}
          placeholder={placeholder ?? datePlaceholder(lang)}
          required={required}
          disabled={disabled}
          value={text}
          aria-invalid={parentInvalid || Boolean(own) || undefined}
          aria-describedby={cn(describedBy, showOwn && msgId) || undefined}
          onChange={(e) => {
            const next = maskInput(e.target.value, text, lang);
            setText(next);
            setTouched(false);
            const parsed = parseDate(next, lang);
            emit(parsed ?? next);
          }}
          onBlur={(e) => {
            setTouched(true);
            if (iso && text !== fmtDateInput(iso, lang)) setText(fmtDateInput(iso, lang)); // vi 1/5/2027 → 01/05/2027
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              openCalendar();
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
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? `${autoId}-dlg` : undefined}
          onClick={() => (open ? closeCalendar() : openCalendar())}
          className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none disabled:opacity-40"
        >
          <CalendarDays className="size-[18px]" />
        </button>
      </div>
      {showOwn && (
        <p id={msgId} role="alert" className="mt-1 text-xs font-medium text-sun-600">
          {own}
        </p>
      )}

      <dialog
        ref={dlgRef}
        id={`${autoId}-dlg`}
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault();
          closeCalendar();
        }}
        onKeyDown={(e) => {
          // Esc chỉ đóng lịch, không lan ra popup / form cha
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            closeCalendar();
          }
        }}
        // Bấm ra ngoài (vùng nền của dialog) → đóng
        onMouseDown={(e) => e.target === e.currentTarget && closeCalendar(false)}
        style={
          centered
            ? { inset: 0, margin: "auto", height: "fit-content" }
            : { right: "auto", bottom: "auto", margin: 0 }
        }
        className={cn(
          "overflow-visible bg-transparent p-0 text-ink",
          centered
            ? "w-[min(22rem,calc(100vw-2rem))] backdrop:bg-slate-900/45"
            : "w-[18.5rem] backdrop:bg-transparent",
        )}
      >
        {open && (
          <div className="rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-slate-900/10">
            <div className="flex items-center justify-between gap-2 pb-2">
              <button
                type="button"
                aria-label={t.prev}
                title={t.prev}
                disabled={prevOff}
                onClick={() => setFocusDay(clampISO(addMonths(focusDay, -1), min, max))}
                className={navBtn}
              >
                <ChevronLeft className="size-4" />
              </button>
              <p
                id={titleId}
                aria-live="polite"
                className="text-sm font-bold text-slate-900 tabular-nums"
              >
                {title}
              </p>
              <button
                type="button"
                aria-label={t.next}
                title={t.next}
                disabled={nextOff}
                onClick={() => setFocusDay(clampISO(addMonths(focusDay, 1), min, max))}
                className={navBtn}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div role="grid" aria-labelledby={titleId} onKeyDown={onGridKey}>
              <div role="row" className="grid grid-cols-7">
                {t.week.map((w) => (
                  <span
                    key={w}
                    role="columnheader"
                    className="py-1 text-center text-[11px] font-semibold text-slate-400"
                  >
                    {w}
                  </span>
                ))}
              </div>
              {weeks.map((week) => (
                <div key={week[0]} role="row" className="grid grid-cols-7">
                  {week.map((d) => {
                    const off = dayOff(d);
                    const inMonth = d.slice(0, 7) === viewMonth;
                    const selected = d === iso;
                    const isToday = d === today;
                    return (
                      <span key={d} role="gridcell" aria-selected={selected} className="p-0.5">
                        <button
                          type="button"
                          data-iso={d}
                          tabIndex={d === focusDay ? 0 : -1}
                          disabled={off}
                          aria-label={fmtDayChip(d, lang)}
                          aria-current={isToday ? "date" : undefined}
                          onClick={() => pick(d)}
                          onFocus={() => d !== focusDay && setFocusDay(d)}
                          className={cn(
                            "relative grid w-full place-items-center rounded-lg text-sm tabular-nums transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none",
                            centered ? "h-10" : "h-9",
                            selected
                              ? "bg-brand-600 font-bold text-white shadow-sm"
                              : off
                                ? "cursor-not-allowed text-slate-300 line-through decoration-slate-300/70"
                                : inMonth
                                  ? "font-medium text-slate-800 hover:bg-brand-50 hover:text-brand-700"
                                  : "text-slate-400 hover:bg-slate-50",
                            isToday &&
                              !selected &&
                              "font-bold text-brand-700 ring-1 ring-brand-300",
                          )}
                        >
                          {Number(d.slice(8))}
                        </button>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                disabled={dayOff(today)}
                onClick={() => pick(today)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40"
              >
                {t.today}
              </button>
              <div className="flex items-center gap-1">
                {!required && text && (
                  <button
                    type="button"
                    onClick={() => {
                      setText("");
                      setTouched(false);
                      emit("");
                      closeCalendar();
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    {t.clear}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => closeCalendar()}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
