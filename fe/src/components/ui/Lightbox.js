"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { lockScroll } from "@/components/fx/SmoothScroll";
import { useA11y } from "@/components/layout/A11y";

/**
 * Popup xem ảnh toàn màn hình: ảnh lớn, nút trước/sau, dải ảnh nhỏ, phím ← → Esc.
 * Render qua portal ra <body> để không bị kẹt trong phần tử cha có transform (vd. dải ảnh chạy marquee).
 */
export default function Lightbox({ images, index, onClose, onChange, alt = "" }) {
  const n = images.length;
  const a11y = useA11y();
  const thumbs = useRef(null);
  const go = (d) => onChange((index + d + n) % n);
  // Điện thoại: vuốt ngang trên ảnh để chuyển ảnh
  const touch = useRef(null);
  const onTouchStart = (e) => (touch.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - (touch.current ?? e.changedTouches[0].clientX);
    touch.current = null;
    if (n > 1 && Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChange((index + 1) % n);
      if (e.key === "ArrowLeft") onChange((index - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, n, onChange, onClose]);

  useEffect(() => {
    lockScroll(true);
    return () => lockScroll(false);
  }, []);

  // Giữ ảnh nhỏ đang xem luôn nằm trong dải thumbnail
  useEffect(() => {
    // Chỉ cuộn dải thumbnail (scrollIntoView sẽ kéo cả trang phía sau)
    const strip = thumbs.current;
    const el = strip?.children[index];
    if (el)
      strip.scrollTo({
        left: el.offsetLeft - strip.clientWidth / 2 + el.offsetWidth / 2,
        behavior: "smooth",
      });
  }, [index]);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      data-lenis-prevent
    >
      <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 text-white sm:p-4">
        <span className="text-sm text-white/70">
          {index + 1} / {n}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={a11y.close}
          className="grid size-11 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="size-6" />
        </button>
      </div>
      {/* Bấm vùng tối quanh ảnh để đóng */}
      <div
        className="relative min-h-0 flex-1"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          key={images[index]}
          src={images[index]}
          alt={alt}
          fill
          sizes="100vw"
          className="pointer-events-none animate-fade-up object-contain sm:p-2 sm:px-20"
        />
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={a11y.previous}
              className="absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white ring-1 ring-white/15 hover:bg-white/25 sm:left-3 sm:size-12 sm:bg-white/10 sm:ring-0"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={a11y.next}
              className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white ring-1 ring-white/15 hover:bg-white/25 sm:right-3 sm:size-12 sm:bg-white/10 sm:ring-0"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <div
        ref={thumbs}
        className="flex shrink-0 scrollbar-none gap-2 overflow-x-auto px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 [&>:first-child]:ml-auto [&>:last-child]:mr-auto"
      >
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`${i + 1}`}
            className={cn(
              "relative h-12 w-16 shrink-0 overflow-hidden rounded-md ring-2 transition sm:h-14 sm:w-20",
              i === index ? "ring-sun-500" : "opacity-50 ring-transparent hover:opacity-100",
            )}
          >
            <Image src={src} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
