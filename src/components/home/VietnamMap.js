"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import { VN_PATH, VN_VIEWBOX, archipelagos, vnProject } from "@/data/vietnam-map";

const W = 520;
const H = 640;
// Vị trí nhãn quanh ghim để không đè nhau (l = trái, r = phải; dy = lệch dọc px)
const side = {
  sapa: ["l", 0],
  "ha-giang": ["l", -4],
  "cao-bang": ["r", -4],
  hanoi: ["r", -12],
  "halong-bay": ["r", 4],
  "ninh-binh": ["r", 8],
  "moc-chau": ["l", 6],
  "quang-binh": ["r", 0],
  hue: ["l", 0],
  "da-nang": ["r", -6],
  "hoi-an": ["r", 10],
  "nha-trang": ["r", 0],
  dalat: ["l", 0],
  "mui-ne": ["r", 4],
  "ho-chi-minh-city": ["l", -6],
  "vung-tau": ["r", 10],
  "mekong-delta": ["l", 10],
  "phu-quoc": ["l", 0],
};

/**
 * Bản đồ Việt Nam Bắc → Nam (tài liệu mục 4 + tham khảo lotuscharmtravel.com):
 * ghim mọi điểm đến; bấm ghim → thẻ bên phải (mô tả + 2 tour nổi bật + Discover now).
 * Tự chuyển ghim mỗi 5 giây cho tới khi khách tương tác. Luôn ghi Hoàng Sa, Trường Sa (Việt Nam).
 */
export default function VietnamMap({ items, labels, lang }) {
  const [active, setActive] = useState(items[0]?.slug);
  const [auto, setAuto] = useState(true);
  const cur = items.find((d) => d.slug === active) || items[0];

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setActive((s) => {
        const i = items.findIndex((d) => d.slug === s);
        return items[(i + 1) % items.length].slug;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [auto, items]);

  const pick = (slug) => {
    setAuto(false);
    setActive(slug);
  };

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
      {/* Bản đồ */}
      <div className="relative mx-auto w-full max-w-[460px]" style={{ aspectRatio: `${W}/${H}` }}>
        <svg viewBox={VN_VIEWBOX} className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <linearGradient id="vn-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-forest-700)" />
              <stop offset="55%" stopColor="#3f7a5f" />
              <stop offset="100%" stopColor="var(--color-clay-500)" />
            </linearGradient>
          </defs>
          <path
            d={VN_PATH}
            fill="url(#vn-fill)"
            stroke="var(--color-cream-50)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Hoàng Sa, Trường Sa – chấm đảo */}
          {archipelagos.map((a) => {
            const [x, y] = vnProject(...a.at);
            return (
              <g key={a.name.en} fill="var(--color-forest-700)">
                {[
                  [0, 0],
                  [7, 4],
                  [-6, 6],
                  [3, -6],
                  [10, -3],
                ].map(([dx, dy], i) => (
                  <circle key={i} cx={x + dx} cy={y + dy} r="1.8" />
                ))}
              </g>
            );
          })}
        </svg>

        {archipelagos.map((a) => {
          const [x, y] = vnProject(...a.at);
          return (
            <span
              key={a.name.en}
              className="absolute -translate-x-1/2 translate-y-3 text-center text-[0.62rem] leading-tight font-medium text-forest-700/80 italic sm:text-[0.7rem]"
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
            >
              {a.name[lang] || a.name.en}
            </span>
          );
        })}

        {/* Ghim + nhãn */}
        {items.map((d) => {
          const [x, y] = vnProject(...d.at);
          const on = d.slug === cur.slug;
          const [s, dy] = side[d.slug] || ["r", 0];
          return (
            <button
              key={d.slug}
              type="button"
              onClick={() => pick(d.slug)}
              aria-pressed={on}
              aria-label={d.name}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
            >
              <span
                className={cn(
                  "relative block size-3 rounded-full ring-2 ring-white transition",
                  on ? "scale-125 bg-amber-brand" : "bg-cream-50 group-hover:bg-amber-brand",
                )}
              >
                {on && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-amber-brand/70" />
                )}
              </span>
              <span
                className={cn(
                  "absolute top-1/2 hidden rounded-full px-2 py-0.5 text-[0.68rem] font-semibold whitespace-nowrap shadow-sm transition sm:block",
                  s === "l" ? "right-full mr-1.5" : "left-full ml-1.5",
                  on
                    ? "bg-forest-900 text-white"
                    : "bg-white/95 text-ink group-hover:bg-forest-700 group-hover:text-white",
                )}
                style={{ transform: `translateY(calc(-50% + ${dy}px))` }}
              >
                {d.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Thẻ điểm đến đang chọn */}
      <div
        key={cur.slug}
        className="animate-fade-up overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-30px_rgba(60,40,10,0.45)] ring-1 ring-sand-300/70"
      >
        <div className="relative h-44 sm:h-52">
          <Image
            src={cur.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-x-5 bottom-4 text-white">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-amber-brand uppercase">
              <MapPin className="size-3.5" /> {cur.region}
            </p>
            <h3 className="text-3xl font-bold tracking-tight">{cur.name}</h3>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <p className="line-clamp-3 leading-relaxed text-ink/75">{cur.intro}</p>
          {cur.tours.length > 0 && (
            <>
              <p className="mt-5 mb-3 text-sm font-bold text-ink">{labels.featured}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {cur.tours.map((t) => (
                  <Link
                    key={t.slug}
                    href={t.href}
                    className="group flex gap-3 rounded-2xl bg-cream-50 p-2 ring-1 ring-sand-300/60 transition hover:ring-clay-500"
                  >
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                      <Image src={t.image} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm leading-snug font-semibold text-ink group-hover:text-clay-600">
                        {t.title}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <Clock className="size-3" /> {t.duration}
                        {t.price ? (
                          <b className="text-clay-600">
                            {labels.from} {formatUSD(t.price)}
                          </b>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-sm text-muted">
              {cur.count} {labels.tours}
            </span>
            <Link
              href={cur.href}
              className="inline-flex items-center gap-2 rounded-full bg-clay-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-600"
            >
              {labels.discover} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
