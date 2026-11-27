"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import { VN_PATH, VN_VIEWBOX, archipelagos, vnProject } from "@/data/vietnam-map";

const W = 520;
const H = 640;
// Bản đồ hiện tối đa 460px → 1 đơn vị viewBox ≈ 0,885px (nhãn có cỡ chữ cố định theo px)
const PX = 460 / W;

/**
 * Điểm đến CHÍNH luôn ghi tên trên bản đồ; điểm khác chỉ là chấm — rê chuột / bấm / đang chọn mới hiện tên
 * (bản đồ nhỏ, ghi hết ~35 tên thì chồng chéo khó đọc). Thứ tự = ưu tiên chỗ đặt nhãn.
 */
const MAJOR = [
  "hanoi",
  "halong-bay",
  "sapa",
  "ha-giang",
  "ninh-binh",
  "cao-bang",
  "hue",
  "hoi-an",
  "da-nang",
  "ho-chi-minh-city",
  "mekong-delta",
  "phu-quoc",
  "nha-trang",
  "dalat",
  "quang-binh",
  "quy-nhon",
  "con-dao",
];
// Phía ưu tiên của nhãn (l = trái, r = phải) — miền Bắc / bờ biển miền Trung ghi ra biển cho thoáng
const PREFER = {
  sapa: "l",
  "ha-giang": "l",
  "moc-chau": "l",
  "son-la": "l",
  "dien-bien": "l",
  hue: "l",
  dalat: "l",
  "ho-chi-minh-city": "l",
  "mekong-delta": "l",
  "phu-quoc": "l",
};

/** Bề rộng / cao ước lượng của nhãn (đơn vị viewBox): chữ Hán rộng gấp đôi chữ Latin */
function labelBox(name) {
  const px = [...String(name)].reduce((w, ch) => w + (/[㐀-鿿]/.test(ch) ? 11 : 6.3), 0);
  return { w: (px + 18) / PX, h: 21 / PX };
}

const overlap = (a, b) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Đặt nhãn các điểm chính, tránh đè nhau: thử 6 chỗ quanh ghim (phải / trái, ngang / lệch lên / lệch xuống),
 * chọn chỗ ít chồng lấn nhất với nhãn đã đặt + các ghim + mép bản đồ. Trả { slug: { side, dy } } (dy theo px).
 */
function layoutLabels(items) {
  const pins = items.map((d) => {
    const [x, y] = vnProject(...d.at);
    return { x: x - 6, y: y - 6, w: 12, h: 12, slug: d.slug };
  });
  const placed = [];
  const out = {};
  const order = [...items]
    .filter((d) => MAJOR.includes(d.slug))
    .sort((a, b) => MAJOR.indexOf(a.slug) - MAJOR.indexOf(b.slug));
  for (const d of order) {
    const [x, y] = vnProject(...d.at);
    const { w, h } = labelBox(d.name);
    const pref = PREFER[d.slug] ?? "r";
    let best = null;
    for (const side of [pref, pref === "l" ? "r" : "l"]) {
      for (const dyu of [0, -15, 15, -26, 26]) {
        const bx = side === "r" ? x + 9 : x - 9 - w;
        const box = { x: bx, y: y - h / 2 + dyu, w, h };
        let cost = (side === pref ? 0 : 40) + Math.abs(dyu) * 1.5;
        for (const p of placed) cost += overlap(box, p) * 4;
        for (const p of pins) if (p.slug !== d.slug) cost += overlap(box, p) * 3;
        if (box.x < 0) cost += -box.x * h * 3;
        if (box.x + w > W) cost += (box.x + w - W) * h * 3;
        if (!best || cost < best.cost) best = { cost, box, side, dy: dyu * PX };
      }
    }
    placed.push(best.box);
    out[d.slug] = { side: best.side, dy: Math.round(best.dy) };
  }
  return out;
}

/**
 * Bản đồ Việt Nam Bắc → Nam (tài liệu mục 4 + tham khảo lotuscharmtravel.com):
 * ghim mọi điểm đến; bấm ghim → thẻ bên phải (mô tả + 2 tour nổi bật + Discover now).
 * Tự chuyển ghim mỗi 5 giây cho tới khi khách tương tác. Luôn ghi Hoàng Sa, Trường Sa (Việt Nam).
 */
export default function VietnamMap({ items, labels, lang }) {
  const [active, setActive] = useState(items[0]?.slug);
  const [auto, setAuto] = useState(true);
  const cur = items.find((d) => d.slug === active) || items[0];
  // Chỗ đặt nhãn các điểm chính (tính 1 lần, giống nhau ở máy chủ và trình duyệt)
  const layout = useMemo(() => layoutLabels(items), [items]);

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
              className={cn(
                "absolute w-24 translate-y-3 text-center text-[0.62rem] leading-tight font-medium text-balance text-forest-700/80 italic sm:w-28 sm:text-[0.7rem]",
                // sát mép phải (Trường Sa) → lệch vào trong để không bị cắt trên điện thoại
                x / W > 0.8 ? "-translate-x-[78%]" : "-translate-x-1/2",
              )}
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
            >
              {a.name[lang] || a.name.en}
            </span>
          );
        })}

        {labels.hint && (
          <p className="absolute inset-x-0 -bottom-7 text-center text-xs text-muted">
            {labels.hint}
          </p>
        )}

        {/* Ghim + nhãn */}
        {items.map((d) => {
          const [x, y] = vnProject(...d.at);
          const on = d.slug === cur.slug;
          const major = layout[d.slug];
          const s = major?.side ?? PREFER[d.slug] ?? (x > W * 0.72 ? "l" : "r");
          const dy = major?.dy ?? 0;
          return (
            <button
              key={d.slug}
              type="button"
              onClick={() => pick(d.slug)}
              aria-pressed={on}
              aria-label={d.name}
              title={major ? undefined : d.name}
              className={cn(
                "group absolute -translate-x-1/2 -translate-y-1/2 p-1.5 hover:z-30 focus-visible:z-30",
                on ? "z-30" : major ? "z-20" : "z-10",
              )}
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
            >
              <span
                className={cn(
                  "relative block rounded-full ring-white transition",
                  major ? "size-3 ring-2" : "size-2.5 ring-[1.5px]",
                  on
                    ? "scale-125 bg-amber-brand"
                    : "bg-cream-50 group-hover:scale-125 group-hover:bg-amber-brand",
                )}
              >
                {on && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-amber-brand/70" />
                )}
              </span>
              <span
                className={cn(
                  "pointer-events-none absolute top-1/2 hidden rounded-full px-2 py-0.5 text-[0.68rem] font-semibold whitespace-nowrap shadow-sm transition",
                  // điểm chính: luôn ghi tên (từ sm); điểm khác: chỉ khi rê chuột / đang chọn
                  // điện thoại: chỉ ghi tên điểm đang chọn (bản đồ nhỏ, ghi hết sẽ chồng chéo)
                  on
                    ? "block"
                    : major
                      ? "sm:block"
                      : "sm:group-hover:block sm:group-focus-visible:block",
                  s === "l" ? "right-full mr-0.5" : "left-full ml-0.5",
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
                    // Từ sm: subgrid 2 hàng (tên tour · thời lượng/giá) → 2 thẻ cạnh nhau thẳng hàng
                    className="group flex gap-3 rounded-2xl bg-cream-50 p-2 ring-1 ring-sand-300/60 transition hover:ring-clay-500 sm:row-span-2 sm:grid sm:grid-cols-[auto_1fr] sm:grid-rows-subgrid sm:gap-y-0"
                  >
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-sand-300/40 sm:row-span-2">
                      <Image src={t.image} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                    <span className="min-w-0 sm:contents">
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
