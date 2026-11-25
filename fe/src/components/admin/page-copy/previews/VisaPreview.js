"use client";

import { useState } from "react";
import { AlertTriangle, ChevronRight, FileCheck2, Info, Send, Ticket } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { visaProcesses } from "@/data/visa";
import { PROCESS_ICONS } from "@/components/visa/ProcessTabs";
import { cn } from "@/lib/utils";
import { Pic } from "../../home/shared";
import {
  CtaButton,
  FaqList,
  ImagePill,
  ListOf,
  ModuleNote,
  Sec,
  SectionHead,
  TONES,
  Txt,
  BgPhoto,
  Shown,
  useCopyField,
} from "../blocks";

/**
 * Bản xem trước trang Visa & Fast-track (app/[lang]/visa-fast-track/page.js) — thu nhỏ, đúng thứ tự trang thật.
 * Gói fast-track & giá, bảng loại visa: dữ liệu ở mục Visa & fast-track → khung ghi chú + link.
 */

const TABS = [
  { key: "arrival", tab: "tabArrival", steps: "stepsArrival" },
  { key: "departure", tab: "tabDeparture", steps: "stepsDeparture" },
  { key: "evisa", tab: "tabEvisa", steps: "stepsEvisa" },
];
const GROUPS = [
  ["groupArrival", "groupArrivalSub"],
  ["groupDeparture", "groupDepartureSub"],
  ["groupAddons", "groupAddonsSub"],
];

/** 1 ô ảnh của dải 3 ảnh đầu trang (điện thoại chỉ hiện ảnh đầu, như trang thật) */
function HeroTile({ i }) {
  const fld = useCopyField(`heroImages.${i}`);
  return (
    <div className={cn("relative h-full flex-1", i > 0 && "hidden md:block")}>
      <Pic src={fld.value || fld.def} sizes="480px" />
    </div>
  );
}

function ProcessSteps() {
  const [tab, setTab] = useState(TABS[0].key);
  const cur = TABS.find((t) => t.key === tab);
  return (
    <>
      <div className="mx-auto flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-sand-300/70">
        {TABS.map((t) => (
          <span
            key={t.key}
            role="tab"
            aria-selected={t.key === tab}
            onClick={() => setTab(t.key)}
            className={cn(
              "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              t.key === tab ? "bg-clay-500 text-white shadow" : "text-ink/70 hover:text-clay-600",
            )}
          >
            <Txt f={t.tab} dark={t.key === tab} />
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500">
        Bấm tên tab để xem và sửa các bước của tab đó.
      </p>
      <ol className="relative mt-5 grid gap-4 md:grid-cols-5 md:gap-3">
        <span
          aria-hidden
          className="absolute top-6 right-[10%] left-[10%] hidden border-t-2 border-dashed border-sand-300 md:block"
        />
        <ListOf f={cur.steps}>
          {(i) => {
            const Icon = PROCESS_ICONS[visaProcesses[tab]?.[i]?.icon] || Send;
            return (
              <li
                key={`${tab}-${i}`}
                className="relative flex gap-3 md:flex-col md:items-center md:text-center"
              >
                <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-forest-700 text-white shadow-lg ring-4 ring-cream-50">
                  <Icon className="size-5" />
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-amber-brand text-[10px] font-bold text-ink">
                    {i + 1}
                  </span>
                </span>
                <div className="flex min-w-0 flex-col items-start md:mt-3 md:items-center">
                  <Txt f={`${cur.steps}.${i}.title`} className="text-[13px] font-bold text-ink" />
                  <Txt
                    f={`${cur.steps}.${i}.text`}
                    className="mt-1 text-[11.5px] leading-relaxed text-muted"
                  />
                </div>
              </li>
            );
          }}
        </ListOf>
      </ol>
    </>
  );
}

export default function VisaPreview() {
  return (
    <>
      {/* ========== Đầu trang: dải 3 ảnh + tiêu đề nét cọ ========== */}
      <Sec name="Đầu trang" dark className="bg-brand-950 text-white sm:pb-12">
        <div className="absolute inset-0 -z-10 flex gap-[3px] bg-brand-950">
          {[0, 1, 2].map((i) => (
            <HeroTile key={i} i={i} />
          ))}
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />
        {/* nút đổi ảnh: mỗi ảnh 1 thanh nút, đặt ở chân đúng ô ảnh đó */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex gap-[3px] px-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn("relative flex flex-1 justify-center", i > 0 && "hidden md:flex")}
            >
              <ImagePill
                f={`heroImages.${i}`}
                title={`Ảnh ${i + 1}`}
                floating={false}
                className="pointer-events-auto"
              />
            </div>
          ))}
        </div>
        <div className="flex min-h-[260px] flex-col items-center justify-center pb-10 text-center sm:min-h-[300px]">
          <p className="mb-3 flex max-w-full items-center gap-1 text-[11px] text-white/75">
            Vietlook <ChevronRight className="size-3 shrink-0" />{" "}
            <span className="truncate text-white">
              <Shown f="heroTitle" />
            </span>
          </p>
          <Txt
            f="heroTitle"
            dark
            className="brush text-2xl font-extrabold tracking-tight drop-shadow-md [--brush-color:var(--color-clay-600)] sm:text-[2.4rem]"
          />
          <Txt
            f="heroIntro"
            dark
            className="mt-4 max-w-2xl text-[13px] font-semibold drop-shadow-md sm:text-[15px]"
          />
          <Txt
            f="heroTagline"
            dark
            className="mt-2 text-sm font-bold text-amber-brand drop-shadow"
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <CtaButton f="ctaFast" variant="clay" className="rounded-md" />
            <CtaButton f="ctaTypes" variant="outline" className="rounded-md border-white/70" />
          </div>
        </div>
      </Sec>

      {/* ========== Gói fast-track ========== */}
      <Sec name="Gói fast-track" className="bg-cream-50">
        <SectionHead title="fastTitle" subtitle="fastSubtitle" />
        <div className="mb-3 grid gap-2.5 sm:grid-cols-3">
          {GROUPS.map(([name, sub]) => (
            <div
              key={name}
              className="flex flex-col items-start rounded-xl bg-white p-3 ring-1 ring-sand-300/70"
            >
              <Txt f={name} className="text-[13px] font-bold text-forest-700" />
              <Txt f={sub} className="mt-0.5 text-[11px] text-muted" />
            </div>
          ))}
        </div>
        <ModuleNote
          icon={Ticket}
          title="Các gói fast-track và giá theo 5 sân bay"
          text="Tên nhóm phía trên sửa ở đây; từng gói, mô tả và giá hiện tự động."
          href={`${ADMIN_BASE}/visa`}
          linkText="Sửa gói & giá ở mục Visa & fast-track"
        />
        <div className="mt-3 flex flex-col items-center text-center">
          <Txt f="dashNote" className="text-[11px] text-muted" />
          <span className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted">
            <Info className="size-3.5 shrink-0" />
            <Txt f="priceNote" />
          </span>
        </div>
      </Sec>

      {/* ========== Quy trình 5 bước + lưu ý ========== */}
      <Sec name="Quy trình 5 bước">
        <BgPhoto f="processImage" fade={TONES.light} />
        <SectionHead title="processTitle" subtitle="processSubtitle" />
        <ProcessSteps />
        <div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-2">
          <ListOf f="notes">
            {(i) => (
              <div
                key={i}
                className="flex gap-2.5 rounded-2xl border border-amber-brand/40 bg-amber-brand/10 p-3.5"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-clay-600" />
                <p className="text-xs leading-relaxed text-ink">
                  <span className="mr-1 font-bold text-clay-600">
                    <Txt f="notesTitle" />:
                  </span>
                  <Txt f={`notes.${i}`} />
                </p>
              </div>
            )}
          </ListOf>
        </div>
      </Sec>

      {/* ========== Thuật ngữ ========== */}
      <Sec name="Thuật ngữ" className="bg-cream-100">
        <SectionHead title="termsTitle" subtitle="termsSubtitle" />
        <dl className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <ListOf f="terms">
            {(i) => (
              <div
                key={i}
                className="flex flex-col items-start rounded-2xl bg-white p-3.5 ring-1 ring-sand-300/70"
              >
                <Txt f={`terms.${i}.term`} className="text-[13px] font-bold text-forest-700" />
                <Txt
                  f={`terms.${i}.meaning`}
                  className="mt-1 text-[11.5px] leading-relaxed text-ink/75"
                />
              </div>
            )}
          </ListOf>
        </dl>
      </Sec>

      {/* ========== Các loại visa ========== */}
      <Sec name="Các loại visa" className="bg-white">
        <SectionHead title="typesTitle" />
        <ModuleNote
          icon={FileCheck2}
          title="Bảng loại visa: thời gian lưu trú, thời gian xử lý, phí"
          href={`${ADMIN_BASE}/visa`}
          linkText="Sửa loại visa ở mục Visa & fast-track"
        />
        <span className="mt-3 flex items-start gap-1.5 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <Txt f="typesNote" />
        </span>
      </Sec>

      {/* ========== Form đặt + câu hỏi ========== */}
      <Sec name="Đặt dịch vụ & câu hỏi" className="bg-cream-50">
        <BgPhoto f="formImage" fade={TONES.mist} />
        <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sand-300/70 sm:p-5">
            <Txt f="formTitle" className="text-lg font-bold tracking-tight text-ink sm:text-xl" />
            <div className="mt-3 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="block h-7 rounded-lg bg-slate-100 ring-1 ring-slate-200/70"
                />
              ))}
              <span className="block h-8 rounded-lg bg-clay-500/80" />
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Khung form giữ nguyên như trên website
            </p>
          </div>
          <div className="flex flex-col items-start">
            <Txt f="faqTitle" className="mb-3 text-base font-bold text-ink sm:text-lg" />
            <FaqList f="faq" className="w-full" />
          </div>
        </div>
      </Sec>
    </>
  );
}
