"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pic } from "../../home/shared";
import { ImagePill, Sec, Shown, Txt, useCopyField } from "../blocks";

/**
 * Đầu trang kiểu BrushHero (components/ui/PageHero.js) thu nhỏ: dải 1–3 ảnh ghép, phủ tối, tiêu đề nét cọ.
 * Dùng cho các trang Liên hệ / Đối tác B2B / Dịch vụ.
 *   images   : đường dẫn danh sách ảnh ("heroImages"); điện thoại chỉ hiện ảnh đầu như trang thật
 *   count    : số ảnh hiện ở đầu trang (trang thật chỉ hiện tối đa 3)
 *   title / subtitle: đường dẫn ô chữ · crumb: chữ cố định ở đường dẫn "Vietlook › …" (mặc định = tiêu đề)
 *   pills    : false → không đặt nút đổi ảnh ở đầu trang (ảnh sửa ở khối khác, vd. trang Dịch vụ)
 */
function HeroTile({ f, i }) {
  const fld = useCopyField(f);
  return (
    <div className={cn("relative h-full flex-1", i > 0 && "hidden md:block")}>
      <Pic src={fld.value || fld.def} sizes="480px" />
    </div>
  );
}

export default function BrushHeroPreview({
  images,
  count = 3,
  title,
  subtitle,
  crumb,
  pills = true,
  children,
}) {
  const idx = Array.from({ length: count }, (_, i) => i);
  return (
    <Sec name="Đầu trang" dark className="bg-brand-950 text-white sm:pb-12">
      <div className="absolute inset-0 -z-10 flex gap-[3px] bg-brand-950">
        {idx.map((i) => (
          <HeroTile key={i} f={`${images}.${i}`} i={i} />
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />
      {pills && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex gap-[3px] px-2">
          {idx.map((i) => (
            <div
              key={i}
              className={cn("relative flex flex-1 justify-center", i > 0 && "hidden md:flex")}
            >
              <ImagePill
                f={`${images}.${i}`}
                title={`Ảnh ${i + 1}`}
                floating={false}
                className="pointer-events-auto"
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex min-h-[240px] flex-col items-center justify-center pb-10 text-center sm:min-h-[280px]">
        <p className="mb-3 flex max-w-full items-center gap-1 text-[11px] text-white/75">
          Vietlook <ChevronRight className="size-3 shrink-0" />{" "}
          <span className="truncate text-white">{crumb ?? <Shown f={title} />}</span>
        </p>
        <Txt
          f={title}
          dark
          className="brush text-2xl font-extrabold tracking-tight drop-shadow-md [--brush-color:var(--color-clay-600)] sm:text-[2.4rem]"
        />
        {subtitle && (
          <Txt
            f={subtitle}
            dark
            className="mt-4 max-w-2xl text-[13px] font-semibold drop-shadow-md sm:text-[15px]"
          />
        )}
        {children}
      </div>
    </Sec>
  );
}
