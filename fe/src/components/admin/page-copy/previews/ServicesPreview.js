"use client";

import { ArrowRight, BookOpen, Car, CheckCircle2, Map, Stamp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Img, ListOf, Sec, Txt } from "../blocks";
import BrushHeroPreview from "./BrushHeroPreview";

/**
 * Bản xem trước trang Dịch vụ (app/[lang]/services/page.js) — thu nhỏ, đúng thứ tự trang thật.
 * Ảnh nền đầu trang = ảnh của 3 dịch vụ đầu (đổi ảnh ở thẻ dịch vụ bên dưới).
 * Thứ tự, biểu tượng và trang đích của 5 dịch vụ giữ cố định.
 */

const ICONS = [Users, Map, Car, Stamp, BookOpen];
const TARGETS = [
  "Tour nhóm & thiết kế riêng",
  "Gói tour",
  "Thuê xe",
  "Visa & Fast-track",
  "Cẩm nang du lịch",
];

export default function ServicesPreview() {
  return (
    <>
      {/* ========== Đầu trang ========== */}
      <BrushHeroPreview images="images" title="heroTitle" subtitle="heroSubtitle" pills={false}>
        <p className="mt-4 rounded-full bg-black/35 px-3 py-1 text-[11px] text-white/80">
          Ảnh nền là ảnh của 3 dịch vụ đầu — đổi ảnh ở từng thẻ dịch vụ bên dưới
        </p>
      </BrushHeroPreview>

      {/* ========== 5 dịch vụ ========== */}
      <Sec name="5 dịch vụ chính" className="bg-white">
        <div className="mb-6 flex justify-center text-center">
          <Txt
            f="intro"
            className="text-[11px] font-bold tracking-[0.18em] text-brand-700 uppercase sm:text-xs"
          />
        </div>
        <div className="space-y-8">
          <ListOf f="items">
            {(i) => {
              const Icon = ICONS[i] ?? Users;
              const flip = i % 2 === 1;
              return (
                <div key={i} className="grid items-center gap-5 lg:grid-cols-2 lg:gap-10">
                  <div className={cn("relative", flip && "lg:order-2")}>
                    <span className="pointer-events-none absolute top-2 left-3 z-10 font-hand text-4xl leading-none text-white/90 drop-shadow-lg">
                      0{i + 1}
                    </span>
                    <Img f={`images.${i}`} aspect="aspect-[16/10]" label={`Ảnh dịch vụ ${i + 1}`} />
                  </div>
                  <div className="flex min-w-0 flex-col items-start">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon className="size-5" />
                    </span>
                    <Txt
                      f={`items.${i}.title`}
                      className="mt-3 text-xl leading-tight font-bold tracking-tight text-ink sm:text-2xl"
                    />
                    <Txt
                      f={`items.${i}.text`}
                      className="mt-2 text-[13px] leading-relaxed text-ink/75"
                    />
                    <ul className="mt-3 space-y-1.5">
                      <ListOf f={`points${i}`}>
                        {(j) => (
                          <li
                            key={j}
                            className="flex items-start gap-2 text-xs font-medium text-ink"
                          >
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-500" />
                            <Txt f={`points${i}.${j}`} />
                          </li>
                        )}
                      </ListOf>
                    </ul>
                    <span className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-600 px-4 text-xs font-semibold text-white shadow-md">
                      <Txt f={`items.${i}.cta`} dark />
                      <ArrowRight className="size-3.5 shrink-0" />
                    </span>
                    <span className="mt-1.5 text-[10.5px] text-slate-400">
                      Nút dẫn tới trang {TARGETS[i]}
                    </span>
                  </div>
                </div>
              );
            }}
          </ListOf>
        </div>
      </Sec>
    </>
  );
}
