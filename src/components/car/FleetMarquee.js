"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import Lightbox from "@/components/ui/Lightbox";

/**
 * 3 dải ảnh đội xe chạy ngược chiều nhau (rê chuột thì dừng); bấm ảnh để mở popup xem lớn.
 * rows: [{ images: string[], alt }]
 */
export default function FleetMarquee({ rows }) {
  const all = rows.flatMap((r) => r.images);
  const [open, setOpen] = useState(null);

  // Vị trí bắt đầu của từng dải trong danh sách ảnh chung
  const starts = rows.map((_, i) => rows.slice(0, i).reduce((sum, r) => sum + r.images.length, 0));

  return (
    <>
      {rows.map(({ images, alt }, ri) => {
        const start = starts[ri];
        return (
          <div key={ri} className="group relative mb-3 flex overflow-hidden last:mb-0">
            <div
              className="flex w-max animate-marquee gap-3 pr-3 group-hover:[animation-play-state:paused]"
              style={{
                animationDirection: ri % 2 ? "reverse" : "normal",
                animationDuration: `${images.length * 3.2}s`,
              }}
            >
              {/* Nhân đôi để dải chạy liền mạch; bản sao ẩn với trình đọc màn hình */}
              {[...images, ...images].map((src, i) => {
                const copy = i >= images.length;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setOpen(start + (i % images.length))}
                    tabIndex={copy ? -1 : undefined}
                    aria-hidden={copy || undefined}
                    aria-label={copy ? undefined : `${alt} ${(i % images.length) + 1}`}
                    className="group/img relative h-36 w-56 shrink-0 cursor-zoom-in overflow-hidden rounded-2xl sm:h-44 sm:w-64"
                  >
                    <Image
                      src={src}
                      alt={copy ? "" : alt}
                      fill
                      sizes="256px"
                      className="object-cover transition-transform duration-500 group-hover/img:scale-105"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover/img:bg-black/25 group-hover/img:opacity-100">
                      <Expand className="size-6 drop-shadow" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {open != null && (
        <Lightbox
          images={all}
          index={open}
          onChange={setOpen}
          onClose={() => setOpen(null)}
          alt="Vietlook Travel fleet"
        />
      )}
    </>
  );
}
