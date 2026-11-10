"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Crown, Plane } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";

/** Bảng gói fast-track theo sân bay: chọn sân bay → giá từng gói. */
export default function FastTrackPicker({ airports, levels, labels }) {
  const [code, setCode] = useState(airports[0].code);
  const airport = airports.find((a) => a.code === code);

  return (
    <div>
      <div className="-mx-4 flex scrollbar-none gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
        {airports.map((a) => (
          <button
            key={a.code}
            type="button"
            onClick={() => setCode(a.code)}
            aria-pressed={a.code === code}
            className={cn(
              "group relative h-24 w-44 shrink-0 overflow-hidden rounded-2xl text-left ring-2 transition sm:w-auto",
              a.code === code ? "ring-sun-500" : "ring-transparent hover:ring-brand-200",
            )}
          >
            <Image
              src={a.image}
              alt=""
              fill
              sizes="240px"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <span
              className={cn(
                "absolute inset-0 transition",
                a.code === code ? "bg-brand-950/45" : "bg-brand-950/65",
              )}
            />
            <span className="absolute inset-x-3 bottom-3 text-white">
              <span className="flex items-center gap-1.5 text-2xl font-extrabold tracking-wide">
                <Plane className="size-4 text-amber-brand" /> {a.code}
              </span>
              <span className="block truncate text-xs text-white/85">{a.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div
        key={code}
        className="rail mt-6 grid animate-fade-up gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {levels.map((l) => (
          <div
            key={l.key}
            className={cn(
              "relative flex flex-col rounded-3xl p-6 ring-1 transition hover:-translate-y-1",
              l.vip ? "bg-brand-950 text-white ring-brand-900" : "bg-white ring-border",
              l.popular && "shadow-[0_24px_60px_-30px_rgba(238,59,53,0.6)] ring-2 ring-sun-500",
            )}
          >
            {l.popular && (
              <span className="absolute -top-3 left-7 rounded-full bg-sun-500 px-3 py-1 text-xs font-bold text-white">
                {labels.popular}
              </span>
            )}
            <h3 className="flex items-center gap-2 text-xl font-bold">
              {l.vip && <Crown className="size-5 text-amber-brand" />}
              {l.label}
            </h3>
            <p className={cn("mt-2 flex-1", l.vip ? "text-white/70" : "text-muted")}>{l.text}</p>
            <p className="mt-4">
              {l.price ? (
                <>
                  <span className={cn("text-xs", l.vip ? "text-white/60" : "text-muted")}>
                    {labels.from}
                  </span>
                  <span
                    className={cn(
                      "block text-4xl font-extrabold tracking-tight",
                      l.vip ? "text-amber-brand" : "text-brand-700",
                    )}
                  >
                    {formatUSD(Math.round(l.price * airport.factor))}
                  </span>
                  <span className={cn("text-sm", l.vip ? "text-white/60" : "text-muted")}>
                    {labels.perPax}
                  </span>
                </>
              ) : (
                <span
                  className={cn(
                    "block text-2xl font-bold",
                    l.vip ? "text-amber-brand" : "text-brand-700",
                  )}
                >
                  {labels.contactPrice}
                </span>
              )}
            </p>
            <a
              href="#book-visa"
              className={cn(
                "mt-6 flex h-11 items-center justify-center gap-2 rounded-xl font-semibold transition",
                l.vip
                  ? "bg-amber-brand text-ink hover:brightness-105"
                  : "bg-brand-50 text-brand-700 hover:bg-brand-600 hover:text-white",
              )}
            >
              <Check className="size-4" /> {labels.book}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
