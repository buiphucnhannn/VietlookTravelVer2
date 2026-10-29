"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DestinationTile } from "@/components/tours/TourCard";

// Lưới 5 cột trên desktop: ô vùng lớn 2×2 + tối đa 6 ô điểm đến (2 hàng) – vừa một màn hình.
const MAX_SMALL = 6;
const lastSpan = { 1: "", 2: "lg:col-span-2", 3: "lg:col-span-3" };

/** Tab Bắc – Trung – Nam, mỗi điểm đến hiển thị số tour. */
export default function RegionTabs({ regions, tripsLabel }) {
  const [active, setActive] = useState(0);
  const region = regions[active];
  const [main, ...rest] = region.tiles;
  const small = rest.slice(0, MAX_SMALL);
  // Ô cuối kéo dài để lấp chỗ trống khi vùng có ít điểm đến
  const fill = Math.max(1, MAX_SMALL - small.length + 1);

  return (
    <div>
      <div
        role="tablist"
        className="mx-auto mb-7 grid w-full grid-cols-3 gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-border sm:flex sm:w-fit sm:rounded-full"
      >
        {regions.map((r, i) => (
          <button
            key={r.slug}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-xl px-1 py-2 text-[0.8rem] leading-tight font-semibold transition sm:rounded-full sm:px-7 sm:py-2.5 sm:text-base",
              i === active ? "bg-brand-600 text-white shadow" : "text-ink hover:bg-brand-50",
            )}
          >
            {r.name}
            <span
              className={cn(
                "block text-[0.7rem] sm:ml-1.5 sm:inline sm:text-xs",
                i === active ? "text-white/75" : "text-muted",
              )}
            >
              ({r.count})
            </span>
          </button>
        ))}
      </div>

      <div
        key={region.slug}
        role="tabpanel"
        className="grid animate-fade-up grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-5 lg:grid-rows-[200px_200px]"
      >
        <DestinationTile
          {...main}
          tripsLabel={tripsLabel}
          className="col-span-2 aspect-[2/1] lg:row-span-2 lg:aspect-auto"
          sizes="(min-width: 1024px) 40vw, 100vw"
        />
        {small.map((tile, i) => (
          <DestinationTile
            key={tile.href}
            {...tile}
            tripsLabel={tripsLabel}
            className={cn(
              "aspect-[4/3] lg:aspect-auto",
              i === small.length - 1 && lastSpan[Math.min(fill, 3)],
            )}
            sizes="(min-width: 1024px) 20vw, 50vw"
          />
        ))}
      </div>
    </div>
  );
}
