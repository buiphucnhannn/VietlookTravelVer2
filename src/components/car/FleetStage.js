"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Briefcase, Check, Crown, Users } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import { useCarQuote } from "./CarQuote";

/**
 * "Sân khấu" đội xe: chọn hạng xe theo số chỗ, xe lướt vào bệ xoay có ánh sáng,
 * kèm thông số và các mẫu xe thực tế của Vietlook.
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
      {/* Chọn hạng xe theo số chỗ */}
      <div
        className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
        role="tablist"
      >
        {fleet.map((f, i) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => select(i)}
            className={cn(
              "group flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition",
              i === active
                ? "border-transparent bg-white text-brand-800 shadow-lg shadow-black/20"
                : "border-white/20 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white",
            )}
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-xs font-bold",
                i === active ? "bg-sun-500 text-white" : "bg-white/15 text-white",
              )}
            >
              {f.seats}
            </span>
            {f.name.label}
            {f.vip && <Crown className="size-3.5 text-amber-brand" />}
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.35fr_1fr]">
        {/* Sân khấu */}
        <div className="relative">
          <div className="relative mx-auto aspect-[16/10] max-w-2xl">
            {/* vòng sáng & bệ xoay */}
            <div
              className="absolute inset-x-[6%] bottom-[8%] h-[28%] rounded-[50%] opacity-80 blur-sm transition-colors duration-700"
              style={{ background: `radial-gradient(closest-side, ${car.accent}cc, transparent)` }}
            />
            <div className="absolute inset-x-[10%] bottom-[10%] h-[20%] animate-spin-slow rounded-[50%] border border-white/25 bg-gradient-to-b from-white/15 to-white/0" />
            <div className="absolute inset-x-[16%] bottom-[13%] h-[12%] rounded-[50%] border border-dashed border-white/25" />
            <span className="pointer-events-none absolute top-0 right-2 text-[7rem] leading-none font-extrabold text-white/5 select-none sm:text-[10rem]">
              {car.seats}
            </span>
            {/* xe */}
            {/* Khung cố định: xe căn giữa, bánh xe chạm bệ xoay; ảnh nào cũng vừa khung đều nhau */}
            <div
              key={`${car.key}-${img}`}
              className="absolute inset-x-[4%] top-[6%] bottom-[12%] animate-drive-in"
            >
              <Image
                src={car.images[img]}
                alt={`${car.name.label} – ${car.models[0]}`}
                fill
                sizes="(min-width: 1024px) 50vw, 90vw"
                className="object-contain object-bottom drop-shadow-[0_32px_24px_rgba(0,0,0,0.55)]"
              />
            </div>
          </div>
          {/* các mẫu xe thực tế trong hạng */}
          {car.images?.length > 1 && (
            <div className="mt-2 flex justify-center gap-2">
              {car.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImg(i)}
                  aria-label={`Model ${i + 1}`}
                  className={cn(
                    "relative h-14 w-20 rounded-xl border p-1 transition",
                    i === img
                      ? "border-amber-brand bg-white/15"
                      : "border-white/15 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-contain p-1" />
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
