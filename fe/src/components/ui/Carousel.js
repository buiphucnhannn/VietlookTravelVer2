"use client";

import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Carousel vô hạn, không thư viện.
 * - Danh sách được nhân 3 (bản sao | bản chính | bản sao), luôn đứng ở bản giữa; đi quá mép thì
 *   âm thầm dời đúng N card (nội dung giống hệt) → lướt mãi một chiều không giật.
 * - Mỗi lần bấm/tự chạy lướt 1 card; bấm liên tiếp sẽ cộng dồn đích đến (bấm 3 lần = 3 card).
 * - Kéo bằng chuột để lướt; cảm ứng dùng cuộn native + scroll-snap.
 * `itemClassName` quyết định bề rộng mỗi slide; `autoplay` = số ms giữa 2 lần tự lướt (0 = tắt).
 */
export default function Carousel({
  children,
  itemClassName = "basis-[85%] sm:basis-1/2 lg:basis-1/4",
  className,
  arrows = "side",
  dots = true,
  autoplay = 0,
  label = "carousel",
}) {
  const items = Children.toArray(children);
  const n = items.length;
  const loop = n > 1;
  const slides = loop ? [...items, ...items, ...items] : items;

  const track = useRef(null);
  const anim = useRef(0);
  const animating = useRef(false);
  const idx = useRef(loop ? n : 0); // vị trí (theo card) trong danh sách đã nhân 3
  const drag = useRef(null);
  const settleTimer = useRef(0);
  const touching = useRef(false);
  const resumeTimer = useRef(0);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Bề rộng 1 card đo chính xác tới phần lẻ (offsetWidth làm tròn → lệch dồn qua nhiều card, mobile 80% rất dễ lẻ)
  const step = () => track.current?.firstElementChild?.getBoundingClientRect().width || 1;

  /** Đưa vị trí về bản giữa nếu đã trôi sang bản sao (dời đúng N card → không thấy khác biệt). */
  const normalize = useCallback(() => {
    const el = track.current;
    if (!el || !loop) return;
    const s = step();
    if (idx.current >= 2 * n || idx.current < n) {
      const shift = idx.current >= 2 * n ? -n : n;
      idx.current += shift;
      el.style.scrollSnapType = "none";
      el.scrollLeft += shift * s;
      if (!animating.current) el.style.scrollSnapType = "";
    }
  }, [loop, n]);

  const syncPage = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setPage(((Math.round(el.scrollLeft / step()) % n) + n) % n);
  }, [n]);

  // Lần đầu: nhảy vào bản giữa (nội dung trùng với bản đầu nên không thấy nhảy)
  useLayoutEffect(() => {
    if (loop && track.current) track.current.scrollLeft = n * step();
  }, [loop, n]);

  /** Lướt mượt tới card thứ idx.current; chạy tiếp từ vị trí hiện tại nếu đang lướt dở. */
  const glide = useCallback(
    (duration = 450) => {
      const el = track.current;
      if (!el) return;
      cancelAnimationFrame(anim.current);
      const from = el.scrollLeft;
      const to = idx.current * step();
      if (Math.abs(to - from) < 1) return normalize();
      const t0 = performance.now();
      animating.current = true;
      el.style.scrollSnapType = "none";
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        el.scrollLeft = from + (to - from) * easeOut(p);
        if (p < 1) anim.current = requestAnimationFrame(tick);
        else {
          animating.current = false;
          el.style.scrollSnapType = "";
          normalize();
          syncPage();
        }
      };
      anim.current = requestAnimationFrame(tick);
    },
    [normalize, syncPage],
  );

  const go = useCallback(
    (dir) => {
      if (!track.current) return;
      if (loop) {
        // Đang ở gần mép bản sao → dời về bản giữa trước (giữ nguyên hình ảnh), rồi cộng dồn đích
        const el = track.current;
        const s = step();
        if (idx.current + dir >= 2 * n + 1 || idx.current + dir < n - 1) {
          const shift = idx.current >= 2 * n - 1 ? -n : n;
          idx.current += shift;
          el.scrollLeft += shift * s;
        }
        idx.current += dir;
      } else {
        idx.current = Math.max(0, Math.min(n - 1, idx.current + dir));
      }
      glide();
    },
    [glide, loop, n],
  );

  const goTo = (i) => {
    normalize();
    idx.current = (loop ? n : 0) + i;
    glide();
  };

  // Cuộn native (vuốt cảm ứng / trackpad): xong thì cập nhật vị trí & đưa về bản giữa
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const settle = () => {
      if (animating.current || drag.current || touching.current) return;
      // Chỉ dời khi đã gần mép 1 card (snap xong); lệch nhỏ do làm tròn pixel thì chấp nhận
      const s = step();
      if (Math.abs(el.scrollLeft / s - Math.round(el.scrollLeft / s)) > 0.15) return;
      idx.current = Math.round(el.scrollLeft / step());
      normalize();
      syncPage();
    };
    // Coi là đã dừng khi 200ms không còn sự kiện cuộn (quán tính / snap đều phát scroll liên tục).
    // Không dựa riêng vào "scrollend" vì Safari iOS chưa hỗ trợ.
    const onScroll = () => {
      syncPage();
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, 200);
    };
    // Cảm ứng: đặt tay → tạm dừng tự chạy; nhấc tay → để quán tính + snap chạy xong rồi mới xử lý
    const onTouchStart = () => {
      touching.current = true;
      cancelAnimationFrame(anim.current);
      animating.current = false;
      el.style.scrollSnapType = "";
      clearTimeout(resumeTimer.current);
      setPaused(true);
    };
    const onTouchEnd = () => {
      touching.current = false;
      clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => setPaused(false), 7000);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", settle);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", settle);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", settle);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      clearTimeout(resumeTimer.current);
      window.removeEventListener("resize", settle);
      clearTimeout(settleTimer.current);
      cancelAnimationFrame(anim.current);
    };
  }, [normalize, syncPage]);

  useEffect(() => {
    if (!autoplay || paused || dragging || n < 2) return;
    const id = setInterval(() => go(1), autoplay);
    return () => clearInterval(id);
  }, [autoplay, paused, dragging, go, n]);

  // ---- Kéo bằng chuột ----
  const onPointerDown = (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    cancelAnimationFrame(anim.current);
    animating.current = false;
    normalize();
    drag.current = {
      x: e.clientX,
      left: track.current.scrollLeft,
      moved: 0,
      t: performance.now(),
      id: e.pointerId,
    };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 5) return;
    if (!d.moved) {
      track.current.setPointerCapture(d.id);
      track.current.style.scrollSnapType = "none";
      setDragging(true);
    }
    d.moved = dx;
    track.current.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setDragging(false);
    const el = track.current;
    const s = step();
    const pos = el.scrollLeft / s;
    const fast = Math.abs(d.moved) / (performance.now() - d.t) > 0.5;
    // Kéo nhanh hoặc đủ 15% card → sang card kế theo hướng kéo; còn lại hít về card gần nhất
    let i = Math.round(pos);
    if (fast || Math.abs(d.moved) > s * 0.15) i = d.moved < 0 ? Math.ceil(pos) : Math.floor(pos);
    idx.current = i;
    glide(380);
    // Chặn cú click ngay sau khi kéo để không mở nhầm link
    el.dataset.dragged = "1";
    setTimeout(() => delete el.dataset.dragged, 0);
  };

  const btn =
    "grid size-11 place-items-center rounded-full bg-white text-brand-700 shadow-lg ring-1 ring-border transition hover:bg-brand-600 hover:text-white active:scale-95 disabled:opacity-40";

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={label}
    >
      {/* Bọc riêng dải slide + nút để nút căn giữa đúng chiều cao card (không tính dải chấm bên dưới) */}
      <div className="relative">
        <div
          ref={track}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={(e) => {
            if (track.current?.dataset.dragged) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onDragStart={(e) => e.preventDefault()}
          className={cn(
            "-mx-2 flex snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain pb-2 md:cursor-grab",
            dragging && "cursor-grabbing! select-none [&_*]:pointer-events-none",
          )}
        >
          {slides.map((child, i) => {
            const clone = loop && (i < n || i >= 2 * n);
            return (
              <div
                key={i}
                className={cn("min-w-0 shrink-0 snap-start snap-always px-2", itemClassName)}
                aria-hidden={clone || undefined}
                inert={clone || undefined}
              >
                {child}
              </div>
            );
          })}
        </div>

        {arrows === "side" && n > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => go(-1)}
              className={cn(
                btn,
                "absolute top-[calc(50%-0.25rem)] -left-3 hidden -translate-y-1/2 md:grid xl:-left-6",
              )}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => go(1)}
              className={cn(
                btn,
                "absolute top-[calc(50%-0.25rem)] -right-3 hidden -translate-y-1/2 md:grid xl:-right-6",
              )}
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {dots && n > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "relative h-2.5 rounded-full transition-all duration-300 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']",
                i === page ? "w-7 bg-sun-500" : "w-2.5 bg-brand-200 hover:bg-brand-300",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
