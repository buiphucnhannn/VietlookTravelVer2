"use client";

import { CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { BgPhoto, ListOf, Sec, Shown, Txt } from "../blocks";

/**
 * Bản xem trước trang Lên kế hoạch chuyến đi (app/[lang]/plan-your-trip/page.js) — thu nhỏ, đúng bố cục thật:
 * cột chữ bên trái (tiêu đề, giới thiệu, điểm cam kết, thời gian trả lời) + form bên phải.
 * Các ô trong form (điểm đến, ngày đi, số khách…) giữ nguyên theo website — không sửa ở đây.
 */

/** Mô phỏng khung form lên kế hoạch (dùng chung với bản xem trước Tour nhóm) */
export function PlannerFormMock({ className }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-4 text-left shadow-xl ring-1 ring-slate-200 sm:p-5",
        className,
      )}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="block h-7 rounded-lg bg-slate-100 ring-1 ring-slate-200/70" />
        ))}
      </div>
      <span className="mt-2 block h-14 rounded-lg bg-slate-100 ring-1 ring-slate-200/70" />
      <span className="mt-2.5 block h-8 rounded-lg bg-clay-500/80" />
      <p className="mt-2.5 text-center text-[10px] text-slate-400">
        Các ô của form giữ nguyên như trên website
      </p>
    </div>
  );
}

export default function PlanTripPreview() {
  return (
    <Sec name="Toàn trang" dark className="bg-brand-950 text-white sm:pt-14 sm:pb-12">
      <BgPhoto
        f="heroImage"
        sizes="1400px"
        className="[&_img]:opacity-50"
        fade="bg-gradient-to-br from-brand-950 via-brand-950/80 to-brand-900/40"
        pill="top-2.5 right-3"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-8">
        <div className="flex min-w-0 flex-col items-start">
          <p className="mb-1 flex max-w-full items-center gap-1 text-[11px] text-white/70">
            Vietlook <ChevronRight className="size-3 shrink-0" />
            <Txt f="crumb" dark className="text-white/90" />
          </p>
          <Txt
            f="title"
            dark
            className="mt-3 text-2xl leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-[2.1rem]"
          />
          <Txt f="subtitle" dark className="mt-2.5 text-[13px] leading-relaxed text-white/80" />
          <ul className="mt-5 space-y-2">
            <ListOf f="points">
              {(i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-brand" />
                  <Txt f={`points.${i}`} dark />
                </li>
              )}
            </ListOf>
          </ul>
          <p className="mt-5 flex items-center gap-1.5 text-[11px] text-white/70">
            <Clock className="size-3.5 shrink-0" />
            <Txt f="replyNote" dark />
          </p>
        </div>
        <div className="flex flex-col">
          <PlannerFormMock />
          <p className="mt-2 text-[11px] text-white/60">
            Khi trang hiện trên Google, tên trang là “<Shown f="title" />
            ”.
          </p>
        </div>
      </div>
    </Sec>
  );
}
