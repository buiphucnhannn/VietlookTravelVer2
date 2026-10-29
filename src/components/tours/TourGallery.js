"use client";

import { useState } from "react";
import Image from "next/image";
import { Images } from "lucide-react";
import { cn } from "@/lib/utils";
import Lightbox from "@/components/ui/Lightbox";

/** Album ảnh tour: lưới 1 ảnh lớn + 4 ảnh nhỏ, bấm để mở lightbox. */
export default function TourGallery({ images, title, label }) {
  const [open, setOpen] = useState(null);
  const grid = images.slice(0, 5);

  return (
    <>
      <div className="grid h-[300px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl sm:h-[440px]">
        {grid.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i)}
            className={cn(
              "group relative cursor-zoom-in overflow-hidden",
              i === 0 ? "col-span-4 row-span-2 sm:col-span-2" : "hidden sm:block",
              grid.length === 1 && "sm:col-span-4",
            )}
          >
            <Image
              src={src}
              alt={`${title} ${i + 1}`}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(min-width: 640px) 50vw, 100vw" : "25vw"}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(0)}
        className="relative z-10 -mt-14 mr-4 ml-auto flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink shadow-lg"
      >
        <Images className="size-4" /> {label} ({images.length})
      </button>

      {open != null && (
        <Lightbox
          images={images}
          index={open}
          onChange={setOpen}
          onClose={() => setOpen(null)}
          alt={title}
        />
      )}
    </>
  );
}
