"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Ảnh viền "nét cọ xé giấy" chuyển đổi luân phiên (phong cách khối B2B của Demo 1).
 * mask: đường dẫn SVG mặt nạ; startDelay: chờ trước lần đổi ảnh đầu tiên (lệch pha giữa
 * các khung dùng cùng interval để không đổi ảnh cùng lúc).
 */
export default function B2BSlides({ images, mask, interval = 4800, startDelay = 0, className }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let id;
    const next = () => setIndex((i) => (i + 1) % images.length);
    const t = setTimeout(() => {
      next();
      id = setInterval(next, interval);
    }, interval + startDelay);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [images.length, interval, startDelay]);

  return (
    <div
      className={cn("absolute drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]", className)}
      aria-hidden
    >
      <div
        className="relative size-full"
        style={{
          maskImage: `url(${mask})`,
          WebkitMaskImage: `url(${mask})`,
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      >
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes="(min-width: 1024px) 440px, 70vw"
            className={cn(
              "object-cover transition-opacity duration-1000",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>
    </div>
  );
}
