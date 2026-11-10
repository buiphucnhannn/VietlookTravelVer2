"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Briefcase, Check, Crown, Users } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import { useCarQuote } from "./CarQuote";

/**
 * "Sân khấu" đội xe: chọn hạng xe theo số chỗ (lưới ô đều nhau), ảnh xe tiêu biểu của hạng
 * trong khung bo góc, kèm thông số, mẫu xe, giá từ và nút chọn xe.
 */
export default function FleetStage({ fleet, t }) {
  const { update, goToQuick } = useCarQuote();
  const [active, setActive] = useState(0);
  const [img, setImg] = useState(0);
  const car = fleet[active];

  const select = (i) => {
    setActive(i);
    setImg(0);
  };

  return (
    <div>
      {/* Chọn hạng xe: lưới ô đều nhau – 1 hàng 8 ô (≥1280px), 2 hàng 4 ô (tablet),
          vuốt ngang có hít ô (mobile). Số chỗ to làm điểm nhấn, tên hạng xe bên dưới. */}
      <div
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 scrollbar-none gap-3 overflow-x-auto px-4 pt-2 pb-3 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 xl:grid-cols-8"
        role="tablist"
      >
        {fleet.map((f, i) => {
          const on = i === active;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => select(i)}
              className={cn(
                "group relative flex w-[8.5rem] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border px-2 pt-3.5 pb-3 text-center transition duration-300 sm:w-auto",
                on
                  ? "-translate-y-1 border-transparent bg-white text-brand-800 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)] ring-2 ring-sun-500"
                  : "border-white/15 bg-white/[0.06] text-white hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.12]",
              )}
            >
              {f.vip && (
                <Crown
                  aria-label="VIP"
                  className={cn(
                    "absolute top-2 right-2 size-4",
                    on ? "text-sun-500" : "text-amber-brand",
                  )}
                />
              )}
              <span className="flex items-baseline gap-1 leading-none">
                <span
                  className={cn(
                    "text-[1.9rem] font-extrabold tracking-tight",
                    on ? "text-sun-500" : "text-white",
                  )}
                >
                  {f.seats}
                </span>
                <span
                  className={cn(
                    "text-[0.7rem] font-semibold uppercase",
                    on ? "text-brand-700/70" : "text-white/55",
                  )}
                >
                  {t.seats}
                </span>
              </span>
              <span
                className={cn(
                  "mt-2 line-clamp-2 flex min-h-[2.5em] items-center text-[0.82rem] leading-tight font-semibold",
                  on ? "text-brand-800" : "text-white/85",
                )}
              >
                {f.name.label}
              </span>
              {/* gạch chỉ báo ô đang chọn */}
              <span
                className={cn(
                  "absolute -bottom-px left-1/2 h-1 w-10 -translate-x-1/2 rounded-full transition",
                  on ? "bg-sun-500" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.35fr_1fr]">
        {/* Sân khấu */}
        <div className="relative">
          {/* Ảnh xe trong khung bo góc */}
          <div className="relative mx-auto aspect-[16/10] max-w-2xl">
            {/* vầng sáng theo màu hạng xe phía sau khung ảnh */}
            <div
              className="absolute inset-[-6%] rounded-[2rem] opacity-70 blur-2xl transition-colors duration-700"
              style={{ background: `radial-gradient(closest-side, ${car.accent}aa, transparent)` }}
            />
            <div
              key={`${car.key}-${img}`}
              className="absolute inset-0 animate-fade-up overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.7)] ring-1 ring-white/20"
            >
              <Image
                src={car.images[img]}
                alt={`${car.name.label} – ${car.models[0]}`}
                fill
                sizes="(min-width: 1024px) 50vw, 90vw"
                className="object-cover"
              />
            </div>
          </div>
          {/* các mẫu xe thực tế trong hạng */}
          {car.images?.length > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {car.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImg(i)}
                  aria-label={`Model ${i + 1}`}
                  className={cn(
                    "relative h-14 w-20 overflow-hidden rounded-xl border-2 transition",
                    i === img
                      ? "border-amber-brand bg-white/15"
                      : "border-white/15 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thông số */}
        <div key={car.key} className="animate-fade-up text-white">
          <p className="text-sm font-bold tracking-[0.2em] text-amber-brand uppercase">
            {car.tagline}
          </p>
          <h3 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {car.name.label}
          </h3>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: Users, v: car.pax, l: t.passengersShort },
              { icon: Briefcase, v: car.luggage, l: t.luggage },
              { icon: Crown, v: car.seats, l: t.seats },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/10"
              >
                <s.icon className="mx-auto size-5 text-amber-brand" />
                <p className="mt-1 text-2xl font-extrabold">{s.v}</p>
                <p className="text-xs text-white/70">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm font-semibold text-white/70">{t.models}</p>
          <p className="mt-1 text-white/95">{car.models.join(" · ")}</p>
          <p className="mt-5 text-sm font-semibold text-white/70">{t.idealFor}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {car.ideal.map((x) => (
              <li
                key={x}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm"
              >
                <Check className="size-3.5 text-amber-brand" /> {x}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            {car.from ? (
              <p>
                <span className="block text-xs text-white/60">{t.fromPrice}</span>
                <span className="text-3xl font-extrabold text-amber-brand">
                  {formatUSD(car.from)}
                </span>
                <span className="text-sm text-white/70"> / {t.perCar}</span>
              </p>
            ) : (
              <p className="text-lg font-semibold text-amber-brand">{t.contactPrice}</p>
            )}
            <button
              type="button"
              onClick={() => {
                update({ vehicle: car.key, passengers: Math.min(car.pax, 45) });
                goToQuick();
              }}
              className="ml-auto inline-flex h-12 items-center gap-2 rounded-xl bg-sun-500 px-6 font-semibold text-white shadow-lg shadow-sun-500/30 transition hover:bg-sun-600"
            >
              {t.selectCar} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
