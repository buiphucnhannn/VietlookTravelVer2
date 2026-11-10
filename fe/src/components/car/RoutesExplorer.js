"use client";

import { useState } from "react";
import { ChevronRight, Clock, Plane } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import { useCarQuote } from "./CarQuote";

// Vị trí các thành phố trên "bản đồ chữ S" cách điệu: x, y (%) và phía đặt nhãn (l = trái, r = phải)
const nodes = {
  hanoi: [34, 7, "r"],
  "da-nang": [60, 29, "l"],
  "nha-trang": [80, 47, "l"],
  dalat: [58, 59, "l"],
  "mui-ne": [74, 71, "l"],
  "ho-chi-minh-city": [46, 83, "l"],
  "phu-quoc": [14, 94, "r"],
};

/** Bảng giá tuyến phổ biến (giá USD/xe từ website cũ) + bản đồ lộ trình cách điệu. */
export default function RoutesExplorer({ areas, routes, classes, t }) {
  const { update, goToQuick, goToForm } = useCarQuote();
  const [area, setArea] = useState(areas[0].key);
  const [cls, setCls] = useState(classes[1].key);
  const list = routes.filter((r) => r.area === area);
  const current = areas.find((a) => a.key === area);

  // Đường cong mượt (Catmull-Rom → Bézier) đi qua đúng tâm các chấm
  const pts = areas.map((a) => nodes[a.key]);
  const path = pts
    .map(([x, y], i) => {
      if (!i) return `M${x} ${y}`;
      const [x0, y0] = pts[i - 2] || pts[i - 1];
      const [x1, y1] = pts[i - 1];
      const [x3, y3] = pts[i + 1] || [x, y];
      const c1 = [x1 + (x - x0) / 6, y1 + (y - y0) / 6];
      const c2 = [x - (x3 - x1) / 6, y - (y3 - y1) / 6];
      return `C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="grid gap-8 overflow-clip rounded-[2rem] bg-white p-5 shadow-[0_30px_80px_-40px_rgba(15,62,95,0.5)] ring-1 ring-border sm:p-8 lg:grid-cols-[320px_1fr]">
      {/* Bản đồ chữ S: chấm nằm đúng trên đường cong, nhãn đặt xen kẽ trái/phải để không dính nhau */}
      <div className="relative aspect-square w-full self-start overflow-hidden rounded-3xl bg-gradient-to-b from-brand-50 to-[#f7efe1] max-sm:aspect-[4/5] sm:aspect-[3/4] lg:sticky lg:top-40">
        <div className="absolute inset-x-6 top-7 bottom-7">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <path
              d={path}
              fill="none"
              stroke="#1780c1"
              strokeOpacity="0.3"
              strokeLinecap="round"
              strokeDasharray="0.1 7"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 3.5 }}
            />
          </svg>
          {areas.map((a) => {
            const [x, y, side] = nodes[a.key];
            const on = a.key === area;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setArea(a.key)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={cn(
                  "group absolute grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center",
                  on ? "z-20" : "z-10",
                )}
              >
                <span
                  className={cn(
                    "relative size-4 rounded-full border-2 shadow-sm transition",
                    on
                      ? "scale-125 border-white bg-sun-500 ring-4 ring-sun-500/25"
                      : "border-brand-500 bg-white group-hover:bg-brand-100",
                  )}
                >
                  {on && (
                    <span className="absolute -inset-0.5 animate-ping rounded-full bg-sun-500/40" />
                  )}
                </span>
                <span
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[0.8rem] leading-tight font-bold whitespace-nowrap shadow-sm ring-1 backdrop-blur transition",
                    side === "l" ? "right-full mr-2 text-right" : "left-full ml-2 text-left",
                    on
                      ? "bg-white text-sun-600 ring-sun-500/30"
                      : "bg-white/75 text-ink/85 ring-black/5 group-hover:bg-white",
                  )}
                >
                  {a.name}
                  <span className="hidden text-[0.65rem] font-medium text-muted sm:block">
                    {a.airport}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-sun-500 uppercase">
              {t.routeFrom}
            </p>
            <h3 className="text-3xl font-extrabold tracking-tight text-ink">{current.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Plane className="size-4" /> {current.airport}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-surface p-1">
            {classes.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCls(c.key)}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm",
                  cls === c.key ? "bg-brand-600 text-white shadow" : "text-muted hover:text-ink",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <ul key={area + cls} className="mt-5 grid gap-x-6 lg:grid-cols-2">
          {list.map((r, i) => {
            const price = r.prices[cls] ?? r.prices.jeep;
            return (
              <li
                key={r.slug}
                className="animate-fade-up border-b border-border"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (r.from) {
                      update({
                        tripType: r.kind === "day" ? "byDay" : "oneWay",
                        from: r.from,
                        to: r.to,
                        vehicle: classes.find((x) => x.key === cls)?.vehicle || "",
                      });
                      goToQuick();
                    } else {
                      update({ route: r.label });
                      goToForm();
                    }
                  }}
                  className="group flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-brand-50"
                >
                  <span className="flex-1 font-semibold text-ink">{r.label}</span>
                  {r.hours && (
                    <span className="hidden items-center gap-1 text-sm text-muted sm:flex">
                      <Clock className="size-3.5" /> {r.hours} {t.hours}
                    </span>
                  )}
                  <span className="text-right">
                    <span className="block text-[0.65rem] text-muted uppercase">{t.routeFrom}</span>
                    <span className="text-lg font-extrabold text-brand-700">
                      {price ? formatUSD(price) : "—"}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-sun-500" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-muted">{t.otherRoute}</p>
      </div>
    </div>
  );
}
