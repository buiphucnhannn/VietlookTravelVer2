"use client";

import {
  Briefcase,
  Bus,
  Clock,
  FileSignature,
  Flag,
  Gift,
  Headset,
  Mail,
  Percent,
  Send,
  Stamp,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { cn } from "@/lib/utils";
import { BgPhoto, Img, ListOf, ModuleNote, Sec, SectionHead, TONES, Txt } from "../blocks";
import BrushHeroPreview from "./BrushHeroPreview";

/**
 * Bản xem trước trang Đối tác B2B (app/[lang]/partners/page.js) — thu nhỏ, đúng thứ tự trang thật.
 * Khối "Dự án đã phục vụ" dùng chung chữ & ảnh với trang chủ → khung ghi chú + link sang Trang chủ.
 */

const icons = [Percent, Clock, FileSignature, Bus, Stamp, Headset, Flag, Gift];
// Đường dẫn "Vietlook › …" của trang thật dùng tên mục menu (cố định)
const CRUMB = {
  en: "For travel agents (B2B)",
  zh: "同业合作（B2B）",
  vi: "Dành cho đại lý du lịch (B2B)",
};
// 4 ô ảnh ghép cạnh form: ô cao trái · 2 ô phải · 1 ô ngang dưới (như trang thật)
const BENTO = ["row-span-2", "", "", "col-span-2"];
const FIELDS = ["company", "country", "website", "volume"];

export default function PartnersPreview({ lang }) {
  return (
    <>
      {/* ========== Đầu trang ========== */}
      <BrushHeroPreview
        images="heroImages"
        title="heroTitle"
        subtitle="heroSubtitle"
        crumb={CRUMB[lang] ?? CRUMB.en}
      />

      {/* ========== Lời giới thiệu ========== */}
      <Sec name="Lời giới thiệu" className="bg-white pb-6">
        <div className="flex justify-center text-center">
          <Txt
            f="intro"
            className="max-w-3xl text-base leading-snug font-medium text-ink sm:text-lg"
          />
        </div>
      </Sec>

      {/* ========== Ưu đãi cho đối tác ========== */}
      <Sec name="Ưu đãi cho đối tác">
        <BgPhoto f="offersImage" fade={TONES.light} />
        <SectionHead title="offerTitle" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ListOf f="offers">
            {(i) => {
              const Icon = icons[i] ?? Gift;
              return (
                <div key={i} className="flex flex-col items-start gap-2 rounded-2xl bg-surface p-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-600 text-white">
                    <Icon className="size-4" />
                  </span>
                  <Txt
                    f={`offers.${i}.title`}
                    className="text-[15px] leading-snug font-bold text-ink"
                  />
                  <Txt f={`offers.${i}.text`} className="text-xs text-muted" />
                </div>
              );
            }}
          </ListOf>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-500">
          Biểu tượng của từng thẻ giữ cố định theo thứ tự.
        </p>
      </Sec>

      {/* ========== Dự án đã phục vụ (dùng chung với trang chủ) ========== */}
      <Sec name="Dự án đã phục vụ" className="bg-white">
        <ModuleNote
          icon={Briefcase}
          title="Dự án đã phục vụ: tiêu đề, mô tả và các thẻ dự án"
          text="Khối này dùng chung chữ & ảnh với khối “Dự án” trên trang chủ — sửa một lần, cả hai trang cùng đổi."
          href={`${ADMIN_BASE}/home`}
          linkText="Sửa ở mục Trang chủ"
        />
      </Sec>

      {/* ========== Ảnh ghép + form hợp tác ========== */}
      <Sec name="Form hợp tác" dark className="bg-brand-950">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="grid grid-cols-2 grid-rows-[auto_auto_auto] gap-3">
            <ListOf f="gallery">
              {(i) => (
                <div key={i} className={cn("min-w-0", BENTO[i])}>
                  <Img
                    f={`gallery.${i}`}
                    label={`Ảnh ${i + 1}`}
                    aspect={
                      BENTO[i] === "row-span-2"
                        ? "aspect-[3/4]"
                        : BENTO[i] === "col-span-2"
                          ? "aspect-[21/9]"
                          : "aspect-[4/3]"
                    }
                  />
                </div>
              )}
            </ListOf>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col items-center rounded-2xl bg-white p-4 text-center sm:p-5">
              <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-600">
                <Mail className="size-4" />
              </span>
              <Txt f="formTitle" className="mt-3 text-lg font-bold text-ink sm:text-xl" />
              <Txt f="formText" className="mt-1.5 text-xs text-muted" />
              <div className="mt-4 grid w-full gap-x-2 gap-y-2.5 text-left sm:grid-cols-2">
                {FIELDS.map((k) => (
                  <div key={k} className="flex min-w-0 flex-col items-start gap-1">
                    <Txt f={k} className="text-[11px] font-semibold text-ink" />
                    <span className="block h-7 w-full rounded-lg bg-slate-100 ring-1 ring-slate-200/70" />
                  </div>
                ))}
                {[0, 1].map((i) => (
                  <span
                    key={i}
                    className="block h-7 rounded-lg bg-slate-100 ring-1 ring-slate-200/70"
                  />
                ))}
                <span className="flex h-8 items-center justify-center rounded-lg bg-brand-600/85 text-white sm:col-span-2">
                  <Send className="size-3.5" />
                </span>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Nhãn 4 ô đầu sửa được; các ô còn lại giữ nguyên như trên website
              </p>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white/95 p-4 text-center ring-1 ring-emerald-200">
              <span className="mb-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Khách thấy sau khi gửi form
              </span>
              <Txt f="successTitle" className="text-[15px] font-bold text-ink" />
              <Txt f="successText" className="mt-1 text-xs text-muted" />
            </div>
          </div>
        </div>
      </Sec>
    </>
  );
}
