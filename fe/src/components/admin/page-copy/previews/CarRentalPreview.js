"use client";

import {
  BadgeCheck,
  CalendarCheck,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gem,
  Globe2,
  Images,
  Languages,
  Map,
  MapPinned,
  MessageSquareQuote,
  Phone,
  Plane,
  Route,
  ShieldCheck,
  Signpost,
  Ticket,
  Users,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { useContactInfo } from "./site-shared";
import { cn } from "@/lib/utils";
import { Pic } from "../../home/shared";
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

/**
 * Bản xem trước trang Thuê xe (app/[lang]/car-rental/page.js) — đúng thứ tự & bố cục trang thật, thu nhỏ.
 * Đội xe, tuyến & giá, khu vực, đánh giá: dữ liệu có mục quản lý riêng → khung ghi chú + link.
 */

const trustIcons = [Plane, Clock, Languages, Ticket];
const serviceIcons = [Plane, Map, Signpost, CalendarCheck, Users, Globe2];
const includedIcons = [Ticket, Plane, Clock, BadgeCheck, Gem, Languages];
const howIcons = [CalendarCheck, MapPinned, ShieldCheck];
const GALLERY = ["sedan-v3a", "suv-u1", "minivan-1", "limo-1", "int-vclass", "coach29-u1"];

/** Mô phỏng khung form (form giữ nguyên theo website, không sửa ở đây) */
function FormMock({ title, rows = 3, className }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-4 text-left shadow-xl ring-1 ring-slate-200",
        className,
      )}
    >
      <p className="mb-3 text-xs font-bold text-ink">{title}</p>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="block h-7 rounded-lg bg-slate-100 ring-1 ring-slate-200/70" />
        ))}
        <span className="block h-8 rounded-lg bg-amber-brand/80" />
      </div>
      <p className="mt-2.5 text-center text-[10px] text-slate-400">
        Khung form giữ nguyên như trên website
      </p>
    </div>
  );
}

export default function CarRentalPreview() {
  const { contact } = useContactInfo(); // CMS → Cài đặt → Thông tin liên hệ
  return (
    <>
      {/* ========== Đầu trang ========== */}
      <Sec name="Đầu trang" dark className="bg-[#0b1b2b] pt-14 text-white sm:pb-12" wide>
        <BgPhoto
          f="heroImage"
          sizes="1400px"
          className="[&_img]:object-[50%_70%]"
          fade="bg-gradient-to-r from-[#0b1b2b]/90 via-[#0b1b2b]/55 to-transparent"
          pill="top-2.5 right-3"
        />
        <span className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1b2b]/70 via-transparent to-transparent" />
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_250px] lg:gap-8">
          <div className="flex min-w-0 flex-col items-start">
            <p className="mb-3 flex items-center gap-1 text-[11px] text-white/70">
              Vietlook <ChevronRight className="size-3" />
              <span className="truncate text-white/90">
                <Shown f="heroEyebrow" />
              </span>
            </p>
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-amber-brand uppercase">
              <Car className="size-3.5 shrink-0" />
              <Txt f="heroEyebrow" dark />
            </span>
            <Txt
              f="heroTitle"
              dark
              className="mt-2.5 text-2xl leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-[2.1rem]"
            />
            <Txt
              f="heroText"
              dark
              className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-white/80"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <CtaButton f="ctaQuote" />
              <CtaButton f="ctaFleet" variant="outline" />
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              <ListOf f="perks">
                {(i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs font-medium">
                    <CheckCircle2 className="size-4 shrink-0 text-amber-brand" />
                    <Txt f={`perks.${i}`} dark />
                  </li>
                )}
              </ListOf>
            </ul>
          </div>
          <FormMock title="Khung báo giá nhanh" className="max-lg:hidden" />
        </div>
      </Sec>

      {/* ========== Dải điểm mạnh ========== */}
      <Sec name="Dải điểm mạnh" className="border-t-2 border-amber-brand bg-white pb-6" wide>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
          <ListOf f="trust">
            {(i) => {
              const Icon = trustIcons[i] ?? Plane;
              return (
                <li key={i} className="flex items-start gap-3 lg:px-4 lg:first:pl-0">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-brand/15 text-[#a26a00]">
                    <Icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <Txt f={`trust.${i}.title`} className="text-[13px] font-bold text-ink" />
                    <Txt f={`trust.${i}.text`} className="mt-0.5 text-[11.5px] text-muted" />
                  </span>
                </li>
              );
            }}
          </ListOf>
        </ul>
      </Sec>

      {/* ========== Đội xe ========== */}
      <Sec
        name="Đội xe"
        dark
        className="bg-[radial-gradient(ellipse_at_50%_0%,#174a73,#0b1b2b_65%)] text-white"
      >
        <SectionHead title="fleetTitle" subtitle="fleetSubtitle" dark bar={false} />
        <ModuleNote
          dark
          icon={Car}
          title="Các hạng xe, ảnh xe, số chỗ và giá"
          text="Hiện tự động từ danh sách xe."
          href={`${ADMIN_BASE}/cars`}
          linkText="Sửa danh sách xe ở mục Xe & khu vực"
        />
      </Sec>

      {/* ========== Dịch vụ ========== */}
      <Sec name="Dịch vụ" className="bg-white">
        <SectionHead title="servicesTitle" align="left" bar="amber" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ListOf f="services">
            {(i) => {
              const Icon = serviceIcons[i] ?? Plane;
              return (
                <div key={i} className="relative overflow-hidden rounded-2xl bg-surface p-4">
                  <span className="absolute -top-6 -right-6 size-20 rounded-full bg-amber-brand/15" />
                  <span className="relative grid size-10 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="relative mt-3 flex flex-col items-start">
                    <Txt f={`services.${i}.title`} className="text-sm font-bold text-ink" />
                    <Txt
                      f={`services.${i}.text`}
                      className="mt-1 text-xs leading-relaxed text-muted"
                    />
                  </div>
                </div>
              );
            }}
          </ListOf>
        </div>
      </Sec>

      {/* ========== Tuyến phổ biến ========== */}
      <Sec name="Tuyến phổ biến" className="bg-[#f6f1e8]">
        <SectionHead title="routesTitle" subtitle="routesSubtitle" align="left" bar={false} />
        <ModuleNote
          icon={Route}
          title="Bảng tuyến đường, khu vực và giá theo hạng xe"
          text="Hiện tự động — khách chọn khu vực, tuyến và hạng xe để xem giá."
          href={`${ADMIN_BASE}/cars`}
          linkText="Sửa tuyến & giá ở mục Xe & khu vực"
        />
      </Sec>

      {/* ========== Khu vực phục vụ ========== */}
      <Sec name="Khu vực phục vụ" className="bg-white">
        <SectionHead title="areasTitle" subtitle="areasSubtitle" align="left" bar="amber" />
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
          <ModuleNote
            icon={MapPinned}
            title="Ô ảnh các khu vực (tên, sân bay, số tuyến)"
            href={`${ADMIN_BASE}/cars`}
            linkText="Sửa khu vực ở mục Xe & khu vực"
            className="flex items-center justify-center"
          />
          <div className="flex flex-col items-start justify-center rounded-2xl bg-amber-brand/15 p-4">
            <Globe2 className="size-7 text-[#a26a00]" />
            <Txt f="areasMore" className="mt-2 text-[13px] font-bold text-ink" />
          </div>
        </div>
      </Sec>

      {/* ========== Giá đã bao gồm ========== */}
      <Sec name="Giá đã bao gồm">
        <BgPhoto f="includedImage" fade={TONES.light} />
        <SectionHead title="includedTitle" align="left" bar="amber" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ListOf f="included">
            {(i) => {
              const Icon = includedIcons[i] ?? Ticket;
              return (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-2xl border border-border bg-white p-4"
                >
                  <span className="absolute top-1.5 right-3 text-4xl font-extrabold text-amber-brand/15">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="grid size-9 place-items-center rounded-lg bg-amber-brand/15 text-[#a26a00]">
                    <Icon className="size-4" />
                  </span>
                  <div className="mt-3 flex flex-col items-start">
                    <Txt f={`included.${i}.title`} className="text-[13px] font-bold text-ink" />
                    <Txt f={`included.${i}.text`} className="mt-1 text-xs text-muted" />
                  </div>
                </div>
              );
            }}
          </ListOf>
        </div>
      </Sec>

      {/* ========== Dải ảnh đội xe ========== */}
      <Sec name="Dải ảnh đội xe" className="bg-surface">
        <SectionHead title="galleryTitle" subtitle="gallerySubtitle" bar={false} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {GALLERY.map((n) => (
            <span key={n} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
              <Pic src={`/images/cars/${n}.webp`} sizes="160px" />
            </span>
          ))}
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <Images className="size-3.5" /> 3 dải ảnh xe chạy ngang trên website — dùng ảnh có sẵn.
        </p>
      </Sec>

      {/* ========== Cách đặt xe ========== */}
      <Sec name="Cách đặt xe" dark className="bg-[#0b1b2b] text-white">
        <BgPhoto f="howImage" fade={TONES.night} />
        <div className="flex flex-col items-start">
          <Txt
            f="howTitle"
            dark
            className="text-xl leading-tight font-bold tracking-[-0.03em] sm:text-[1.65rem]"
          />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ListOf f="how">
            {(i) => {
              const Icon = howIcons[i] ?? CalendarCheck;
              return (
                <div key={i} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <span className="relative inline-grid size-10 place-items-center rounded-xl bg-white/10 text-amber-brand">
                    <Icon className="size-[18px]" />
                    <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-amber-brand text-[10px] font-bold text-ink">
                      {i + 1}
                    </span>
                  </span>
                  <div className="mt-3 flex flex-col items-start">
                    <Txt f={`how.${i}.title`} dark className="text-base font-bold" />
                    <Txt f={`how.${i}.text`} dark className="mt-1 text-xs text-white/70" />
                  </div>
                </div>
              );
            }}
          </ListOf>
        </div>
      </Sec>

      {/* ========== Khách hàng nói gì ========== */}
      <Sec name="Đánh giá" className="bg-[#f6f1e8]">
        <SectionHead title="reviewsTitle" subtitle="reviewsSub" />
        <ModuleNote
          icon={MessageSquareQuote}
          title="3 đánh giá được chọn hiện ở trang Thuê xe"
          text="Không có đánh giá nào được chọn → khối này tự ẩn trên website."
          href={`${ADMIN_BASE}/reviews`}
          linkText="Chọn đánh giá ở mục Đánh giá"
        />
      </Sec>

      {/* ========== Câu hỏi thường gặp ========== */}
      <Sec name="Câu hỏi thường gặp" className="bg-white">
        <div className="grid items-start gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="flex flex-col items-start">
            <Txt
              f="faqTitle"
              className="text-xl leading-tight font-bold tracking-[-0.03em] text-ink sm:text-[1.65rem]"
            />
            <Txt f="faqSub" className="mt-2 text-[13px] text-muted" />
            <span className="mt-4 inline-flex h-9 items-center rounded-lg bg-amber-brand px-4 text-xs font-bold text-ink">
              WhatsApp
            </span>
          </div>
          <FaqList f="faq" numbered card="bg-[#f6f1e8] ring-1 ring-black/5" />
        </div>
      </Sec>

      {/* ========== Form báo giá + liên hệ ========== */}
      <Sec name="Form báo giá & liên hệ" className="bg-white">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex min-w-0 flex-col items-start">
            <Txt
              f="formTitle"
              className="text-xl leading-tight font-bold tracking-[-0.03em] text-ink sm:text-[1.65rem]"
            />
            <Txt f="formSubtitle" className="mt-2 mb-4 text-[13px] text-muted" />
            <FormMock title="Form báo giá xe" rows={5} className="w-full shadow-md" />
          </div>
          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white p-5 text-ink shadow-md ring-1 ring-sand-300/70">
              <div className="flex flex-col items-start">
                <Txt f="talkTitle" className="text-lg font-extrabold" />
                <Txt f="talkText" className="mt-1 text-xs text-muted" />
              </div>
              <span className="mt-4 flex items-center gap-3 rounded-xl bg-cream-50 p-3 ring-1 ring-sand-300/70">
                <span className="grid size-9 place-items-center rounded-lg bg-amber-brand text-ink">
                  <Phone className="size-4" />
                </span>
                <span className="text-sm font-extrabold text-forest-900">{contact.hotline}</span>
              </span>
              <p className="mt-2 text-[10.5px] text-slate-400">
                Số hotline & kênh chat lấy từ Cài đặt → Thông tin liên hệ.
              </p>
            </div>
            <Img f="asideImage" aspect="aspect-[16/9]" />
          </aside>
        </div>
      </Sec>
    </>
  );
}
