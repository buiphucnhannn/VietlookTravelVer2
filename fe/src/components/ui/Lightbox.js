"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { lockScroll } from "@/components/fx/SmoothScroll";

/**
 * Popup xem ảnh toàn màn hình: ảnh lớn, nút trước/sau, dải ảnh nhỏ, phím ← → Esc.
 * Render qua portal ra <body> để không bị kẹt trong phần tử cha có transform (vd. dải ảnh chạy marquee).
 */
export default function Lightbox({ images, index, onClose, onChange, alt = "" }) {
  const n = images.length;
  const thumbs = useRef(null);
  const go = (d) => onChange((index + d + n) % n);

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
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm text-white/70">
          {index + 1} / {n}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-11 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="size-6" />
        </button>
      </div>
      {/* Bấm vùng tối quanh ảnh để đóng */}
      <div className="relative flex-1" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <Image
          key={images[index]}
          src={images[index]}
          alt={alt}
          fill
          sizes="100vw"
          className="pointer-events-none animate-fade-up object-contain p-2 sm:px-20"
        />
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute top-1/2 left-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute top-1/2 right-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <div
        ref={thumbs}
        className="flex scrollbar-none gap-2 overflow-x-auto p-4 [&>:first-child]:ml-auto [&>:last-child]:mr-auto"
      >
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`${i + 1}`}
            className={cn(
              "relative h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition",
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
