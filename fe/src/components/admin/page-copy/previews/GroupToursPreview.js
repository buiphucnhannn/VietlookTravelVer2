"use client";

import {
  Accessibility,
  ArrowRight,
  Briefcase,
  CalendarSync,
  Car,
  ChevronRight,
  Ear,
  GraduationCap,
  HandHeart,
  Handshake,
  Heart,
  Hotel,
  MapPin,
  MessageSquareQuote,
  MessagesSquare,
  Stamp,
  Star,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import {
  BgPhoto,
  CtaButton,
  FaqList,
  Img,
  ListOf,
  ModuleNote,
  Sec,
  SectionHead,
  Shown,
  TONES,
  Txt,
} from "../blocks";
import { PlannerFormMock } from "./PlanTripPreview";

/**
 * Bản xem trước trang Tour nhóm & thiết kế riêng (app/[lang]/group-tailor-made-tours/page.js) — thu nhỏ,
 * đúng thứ tự trang thật. Đánh giá: dữ liệu ở mục Đánh giá → khung ghi chú + link; form giữ nguyên.
 * Biểu tượng từng thẻ cố định theo vị trí (giống trang thật).
 */

const includedIcons = [Users, Hotel, Car, Wrench, Stamp, MessagesSquare];
const pillarIcons = [Wrench, Star, MapPin, MessagesSquare];
const groupIcons = [UsersRound, Briefcase, GraduationCap, Handshake];
const accessIcons = [Accessibility, Ear, HandHeart];

export default function GroupToursPreview() {
  return (
    <>
      {/* ========== Đầu trang ========== */}
      <Sec name="Đầu trang" dark className="bg-brand-950 text-white sm:pb-12">
        <BgPhoto
          f="heroImage"
          sizes="1400px"
          fade="bg-gradient-to-b from-black/50 via-black/25 to-black/50"
          pill="top-2.5 right-3"
        />
        <div className="flex min-h-[250px] flex-col items-center justify-center text-center sm:min-h-[290px]">
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
            f="heroSubtitle"
            dark
            className="mt-4 max-w-2xl text-[13px] font-semibold drop-shadow-md sm:text-[15px]"
          />
          <CtaButton f="heroCta" variant="clay" className="mt-4" />
        </div>
      </Sec>

      {/* ========== Giới thiệu + du lịch không rào cản ========== */}
      <Sec name="Giới thiệu" className="bg-white">
        <div className="flex flex-col items-center text-center">
          <Txt
            f="intro"
            className="max-w-3xl text-base leading-snug font-medium text-ink sm:text-lg"
          />
        </div>
        <div className="mx-auto mt-5 flex max-w-3xl flex-col gap-3 rounded-2xl bg-brand-50/70 p-4 text-left ring-1 ring-brand-100 sm:flex-row sm:items-center sm:gap-4">
          <span className="flex shrink-0 items-center gap-1" aria-hidden>
            {accessIcons.map((Icon, i) => (
              <span
                key={i}
                className="grid size-9 place-items-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-brand-100"
              >
                <Icon className="size-4" />
              </span>
            ))}
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <Txt f="accessTitle" className="text-[13px] font-bold text-ink" />
            <Txt f="accessText" className="mt-0.5 text-xs leading-relaxed text-ink/75" />
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 self-start text-xs font-semibold text-brand-700 sm:self-center">
            <Txt f="accessCta" />
            <ArrowRight className="size-3.5" />
          </span>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Chữ của dải này chỉ đổi ở trang Tour nhóm — khối “không rào cản” ở trang chủ / Giới thiệu
          giữ nguyên.
        </p>
      </Sec>

      {/* ========== Thanh mục lục ========== */}
      <Sec name="Thanh mục lục" className="bg-[#dff3f1] pt-10 pb-4 sm:pb-5">
        <nav className="flex flex-wrap justify-center gap-x-1 gap-y-1">
          <ListOf f="tabs">
            {(i) => (
              <span key={i} className="px-3 py-1.5 text-[13px] font-medium text-ink">
                <Txt f={`tabs.${i}`} />
              </span>
            )}
          </ListOf>
        </nav>
        <p className="mt-1 text-center text-[11px] text-slate-500">
          Mỗi mục bấm vào chuyển tới đúng khối bên dưới (theo thứ tự).
        </p>
      </Sec>

      {/* ========== Luôn bao gồm ========== */}
      <Sec name="Luôn bao gồm" className="bg-[#d3e9e6]">
        <BgPhoto f="includedImage" fade={TONES.mist} />
        <div className="mb-6 flex flex-col items-center text-center">
          <Txt
            f="includedTitle"
            className="max-w-2xl text-xl leading-tight font-bold tracking-[-0.03em] text-ink sm:text-[1.65rem]"
          />
        </div>
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <ListOf f="included">
            {(i) => {
              const Icon = includedIcons[i] ?? Users;
              return (
                <div key={i} className="flex items-start gap-3.5">
                  <Icon className="mt-0.5 size-9 shrink-0 text-[#4a5a63]" strokeWidth={1.6} />
                  <div className="flex min-w-0 flex-col items-start">
                    <Txt f={`included.${i}.title`} className="text-base font-semibold text-ink" />
                    <Txt
                      f={`included.${i}.text`}
                      className="mt-0.5 text-[13px] leading-relaxed text-ink/70"
                    />
                  </div>
                </div>
              );
            }}
          </ListOf>
        </div>
      </Sec>

      {/* ========== Dải cam kết ========== */}
      <Sec name="Dải cam kết" dark className="bg-[#16a777] text-white">
        <BgPhoto f="pillarsImage" fade={TONES.dark} />
        <div className="grid grid-cols-2 gap-5 text-center md:grid-cols-4">
          <ListOf f="pillars">
            {(i) => {
              const Icon = pillarIcons[i] ?? Star;
              return (
                <div key={i} className="flex flex-col items-center">
                  <Icon className="size-7" />
                  <Txt f={`pillars.${i}`} dark className="mt-1.5 text-base font-semibold" />
                </div>
              );
            }}
          </ListOf>
        </div>
      </Sec>

      {/* ========== Loại nhóm ========== */}
      <Sec name="Loại nhóm" className="bg-white">
        <SectionHead title="groupTitle" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ListOf f="groups">
            {(i) => {
              const Icon = groupIcons[i] ?? UsersRound;
              return (
                <div
                  key={i}
                  className="flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-border"
                >
                  <div className="relative">
                    <Img
                      f={`groupImages.${i}`}
                      aspect="aspect-[16/10]"
                      label={`Ảnh thẻ ${i + 1}`}
                    />
                    <span className="pointer-events-none absolute top-2.5 left-2.5 z-10 grid size-9 place-items-center rounded-lg bg-white text-brand-600 shadow">
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <div className="flex flex-col items-start p-3.5">
                    <Txt f={`groups.${i}.title`} className="text-sm font-bold text-ink" />
                    <Txt f={`groups.${i}.text`} className="mt-1 text-xs text-muted" />
                  </div>
                </div>
              );
            }}
          </ListOf>
        </div>
      </Sec>

      {/* ========== Cách làm việc ========== */}
      <Sec name="Cách làm việc" className="bg-surface">
        <BgPhoto f="howImage" fade={TONES.light} />
        <SectionHead title="howTitle" />
        <ol className="relative grid gap-5 md:grid-cols-4">
          <span
            aria-hidden
            className="absolute top-6 right-[12%] left-[12%] hidden border-t-2 border-dashed border-brand-300 md:block"
          />
          <ListOf f="how">
            {(i) => (
              <li key={i} className="relative flex flex-col items-center text-center">
                <span className="grid size-12 place-items-center rounded-full bg-brand-600 text-lg font-extrabold text-white shadow-lg ring-4 ring-surface">
                  {i + 1}
                </span>
                <Txt f={`how.${i}.title`} className="mt-3 text-base font-bold text-ink" />
                <Txt f={`how.${i}.text`} className="mt-1 text-xs text-muted" />
              </li>
            )}
          </ListOf>
        </ol>
      </Sec>

      {/* ========== Lên kế hoạch (form) ========== */}
      <Sec name="Lên kế hoạch" dark className="bg-brand-950 text-white">
        <BgPhoto f="planImage" fade="bg-brand-950/80" />
        <div className="mx-auto max-w-2xl">
          <SectionHead title="plannerTitle" subtitle="plannerSubtitle" dark bar={false} />
          <PlannerFormMock />
        </div>
      </Sec>

      {/* ========== Đánh giá ========== */}
      <Sec name="Đánh giá" dark className="bg-forest-900 text-white">
        <SectionHead
          eyebrow="reviewsEyebrow"
          title="reviewsTitle"
          subtitle="reviewsSubtitle"
          dark
          bar={false}
        />
        <ModuleNote
          dark
          icon={MessageSquareQuote}
          title="Các đánh giá được chọn hiện ở trang Tour nhóm"
          text="Không có đánh giá nào được chọn → khối này tự ẩn trên website."
          href={`${ADMIN_BASE}/reviews`}
          linkText="Chọn đánh giá ở mục Đánh giá"
        />
      </Sec>

      {/* ========== Câu hỏi thường gặp ========== */}
      <Sec name="Câu hỏi thường gặp" className="bg-white">
        <div className="mx-auto max-w-3xl">
          <SectionHead title="faqTitle" />
          <FaqList f="faq" />
          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <Heart className="size-3.5 shrink-0 text-sun-500" />
            <CalendarSync className="size-3.5 shrink-0 text-brand-500" />
            <Txt f="faqNote" />
          </p>
        </div>
      </Sec>
    </>
  );
}
