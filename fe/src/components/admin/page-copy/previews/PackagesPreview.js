"use client";

import {
  ArrowRight,
  Headphones,
  Languages,
  ListOrdered,
  MapPin,
  Smartphone,
  Star,
  Wrench,
} from "lucide-react";
import { BgPhoto, ListOf, ModuleNote, Sec, TONES, Txt } from "../blocks";
import { AdviceBoxPreview, TOURS_ADMIN, TourHero } from "./tours-shared";

/**
 * Bản xem trước trang Gói tour 1–3 tuần (app/[lang]/packages/page.js) — đúng thứ tự trang thật, thu nhỏ.
 * 3 tour mỗi nhóm: tự chọn từ mục Tour theo số ngày → khung ghi chú + link.
 */

const whyIcons = [Smartphone, MapPin, Wrench, Languages, Star, Headphones];
const DAYS = { 1: "5–8 ngày", 2: "9–15 ngày", 3: "từ 16 ngày" };
const SEE_ALL = {
  1: "Xem tất cả gói 1 tuần",
  2: "Xem tất cả gói 2 tuần",
  3: "Xem tất cả gói 3 tuần",
};

function WeekBlock({ n }) {
  const w = (k) => `week${n}${k}`;
  return (
    <Sec name={`Gói ${n} tuần`} className={n % 2 ? "bg-surface" : "bg-white"}>
      {n === 1 && (
        <div className="mb-6 flex justify-center">
          <Txt
            f="ourPackages"
            className="text-center text-xl font-semibold tracking-tight text-ink sm:text-[1.65rem]"
          />
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-start">
          <span className="block text-4xl leading-none font-extrabold text-brand-200">0{n}</span>
          <Txt f={w("Title")} className="mt-2 text-lg font-semibold tracking-tight text-ink" />
          <Txt f={w("Text")} className="mt-2 text-xs leading-relaxed text-ink/80 italic" />
          <span
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
            title="Chữ liên kết cố định theo số tuần"
          >
            {SEE_ALL[n]} <ArrowRight className="size-3.5" />
          </span>
        </div>
        <div className="flex min-w-0 flex-col items-stretch">
          <div className="mb-4 flex flex-col items-start">
            <Txt
              f={w("BestTitle")}
              className="text-base font-semibold tracking-tight text-ink sm:text-lg"
            />
            <Txt f={w("BestText")} className="mt-1.5 text-xs leading-relaxed text-ink/75" />
          </div>
          <ModuleNote
            icon={ListOrdered}
            title={`3 tour ${DAYS[n]} hiện tự động`}
            text="Ảnh, tên, giá, điểm dừng và lịch trình nhanh lấy từ từng tour (ưu tiên tour có giá)."
            href={TOURS_ADMIN}
            linkText="Sửa tour ở mục Tour"
          >
            <div className="mb-3 space-y-2" aria-hidden>
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl bg-white p-2.5 text-left ring-1 ring-slate-200"
                >
                  <span className="size-12 shrink-0 rounded-lg bg-slate-100" />
                  <span className="flex flex-1 flex-col gap-1.5 pt-1">
                    <span className="block h-2 w-2/3 rounded bg-slate-200" />
                    <span className="block h-2 w-1/4 rounded bg-brand-100" />
                  </span>
                </div>
              ))}
            </div>
          </ModuleNote>
          <AdviceBoxPreview
            title={w("CtaTitle")}
            text={w("CtaText")}
            cta="ctaButton"
            className="mt-4"
          />
        </div>
      </div>
    </Sec>
  );
}

export default function PackagesPreview() {
  return (
    <>
      <TourHero collage />

      {/* ========== Vì sao chọn ========== */}
      <Sec name="Lý do chọn">
        <BgPhoto f="whyImage" fade={TONES.light} />
        <div className="mb-6 flex justify-center">
          <Txt
            f="whyTitle"
            className="text-center text-xl font-semibold tracking-tight text-ink sm:text-[1.65rem]"
          />
        </div>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <ListOf f="why">
            {(i) => {
              const Icon = whyIcons[i] ?? Star;
              return (
                <div key={i} className="flex gap-3">
                  <Icon className="mt-0.5 size-7 shrink-0 text-ink" strokeWidth={1.8} />
                  <div className="flex min-w-0 flex-col items-start">
                    <Txt f={`why.${i}.title`} className="text-[15px] font-medium text-ink" />
                    <Txt f={`why.${i}.text`} className="mt-1 text-xs leading-relaxed text-muted" />
                  </div>
                </div>
              );
            }}
          </ListOf>
        </div>
      </Sec>

      {[1, 2, 3].map((n) => (
        <WeekBlock key={n} n={n} />
      ))}
    </>
  );
}
