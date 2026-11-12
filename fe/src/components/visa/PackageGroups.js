"use client";

import { useState } from "react";
import { Check, Crown, PlaneLanding, PlaneTakeoff, Plus, Star } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import { subgrid } from "@/lib/subgrid";

const groupIcons = { arrival: PlaneLanding, departure: PlaneTakeoff, addons: Plus };

/**
 * 3 nhóm gói fast-track (Arrival 7 / Departure 5 / Add-ons 3) theo yêu cầu khách:
 * tab nhóm → lưới thẻ; mỗi thẻ: tên EN + ZH, mô tả, giá theo 5 sân bay, nút đặt.
 * `packages`: { arrival: [...], departure: [...], addons: [...] } đã dịch (label/text/prices).
 */
export default function PackageGroups({ packages, airports, labels, defaultGroup = "arrival" }) {
  const [group, setGroup] = useState(defaultGroup);
  const list = packages[group];
  // Subgrid: tên · mô tả · giá "từ" · nhãn sân bay · bảng giá · ghi chú liên hệ · nút → các thẻ cùng hàng
  // thẳng hàng nhau. Hàng giá / ghi chú chỉ tạo khi có ít nhất 1 thẻ cần (thẻ thiếu → ô giữ chỗ trống).
  const hasPrice = (p) => Object.values(p.prices).some(Boolean);
  const priceRow = list.some(hasPrice);
  const noteRow = list.some((p) => !hasPrice(p));
  const rows = 5 + priceRow + noteRow;

  return (
    <div>
      {/* Tab nhóm */}
      <div className="mx-auto flex max-w-3xl scrollbar-none overflow-x-auto rounded-full bg-cream-100 p-1.5 ring-1 ring-sand-300/70">
        {Object.keys(packages).map((g) => {
          const Icon = groupIcons[g];
          const on = g === group;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              aria-pressed={on}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition sm:text-[0.95rem]",
                on ? "bg-forest-700 text-white shadow" : "text-ink/70 hover:text-forest-700",
              )}
            >
              <Icon className="size-4" />
              <span>{labels.groups[g]}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  on ? "bg-white/20" : "bg-sand-300/60 text-ink/70",
                )}
              >
                {packages[g].length}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted">{labels.groupSub[group]}</p>

      {/* Lưới thẻ gói */}
      <div
        key={group}
        className="rail mt-8 grid animate-fade-up gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {list.map((p) => (
          <article
            key={p.key}
            className={cn(
              "relative flex flex-col rounded-3xl p-6 ring-1 transition hover:-translate-y-1",
              p.vip
                ? "bg-forest-900 text-white ring-forest-700"
                : "bg-white ring-sand-300/70 hover:shadow-[0_24px_48px_-24px_rgba(60,40,10,0.4)]",
              p.popular && "ring-2 ring-clay-500",
              subgrid(rows, "sm"),
            )}
          >
            {p.popular && (
              <span className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-clay-500 px-3 py-1 text-xs font-bold text-white">
                <Star className="size-3 fill-current" /> {labels.popular}
              </span>
            )}
            <h3 className="flex items-start gap-2 text-lg leading-snug font-bold">
              {p.vip && <Crown className="mt-0.5 size-5 shrink-0 text-amber-brand" />}
              {/* Chỉ hiện tên theo ngôn ngữ đang xem (EN ở bản EN, ZH ở bản ZH) */}
              <span>{p.label}</span>
            </h3>
            <p
              className={cn(
                "mt-3 flex-1 text-sm leading-relaxed",
                p.vip ? "text-white/75" : "text-ink/75",
              )}
            >
              {p.text}
            </p>

            {/* Giá "từ" thấp nhất + bảng giá theo 5 sân bay */}
            {(() => {
              const vals = Object.values(p.prices).filter(Boolean);
              if (!vals.length) return priceRow ? <span aria-hidden /> : null;
              return (
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className={cn("text-xs", p.vip ? "text-white/60" : "text-muted")}>
                    {labels.from}
                  </span>
                  <span
                    className={cn(
                      "text-3xl font-extrabold tracking-tight",
                      p.vip ? "text-amber-brand" : "text-clay-600",
                    )}
                  >
                    {formatUSD(Math.min(...vals))}
                  </span>
                  <span className={cn("text-xs", p.vip ? "text-white/60" : "text-muted")}>
                    / {labels.perPax}
                  </span>
                </p>
              );
            })()}
            <p
              className={cn(
                "mt-3 text-[0.7rem] font-semibold tracking-[0.14em] uppercase",
                p.vip ? "text-white/55" : "text-muted",
              )}
            >
              {labels.priceByAirport}
            </p>
            <ul className="mt-2 grid grid-cols-5 gap-1 text-center">
              {airports.map((a) => (
                <li
                  key={a.code}
                  className={cn("rounded-lg py-1.5", p.vip ? "bg-white/10" : "bg-cream-100")}
                  title={a.label}
                >
                  <span
                    className={cn(
                      "block text-[0.7rem] font-bold",
                      p.vip ? "text-amber-brand" : "text-forest-700",
                    )}
                  >
                    {a.code}
                  </span>
                  <span
                    className={cn(
                      "block text-sm leading-tight font-semibold",
                      p.prices[a.code]
                        ? p.vip
                          ? "text-white"
                          : "text-ink"
                        : p.vip
                          ? "text-white/35"
                          : "text-ink/30",
                    )}
                  >
                    {p.prices[a.code] ? `${p.prices[a.code]}` : "–"}
                  </span>
                </li>
              ))}
            </ul>
            {hasPrice(p) ? (
              noteRow && <span aria-hidden />
            ) : (
              <p className={cn("mt-2 text-xs", p.vip ? "text-white/60" : "text-muted")}>
                {labels.contactPrice} · {labels.perPax}
              </p>
            )}

            <a
              href={`#book-visa`}
              data-package={p.key}
              className={cn(
                "mt-5 flex h-11 items-center justify-center gap-2 rounded-xl font-semibold transition",
                p.vip
                  ? "bg-amber-brand text-ink hover:brightness-105"
                  : "bg-clay-500 text-white hover:bg-clay-600",
              )}
            >
              <Check className="size-4" /> {labels.book}
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
