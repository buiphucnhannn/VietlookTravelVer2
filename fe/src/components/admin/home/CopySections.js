"use client";

import { useContext, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock4,
  CreditCard,
  Handshake,
  Headphones,
  Headset,
  Hotel,
  Layers,
  Map,
  MapPin,
  MapPinned,
  MessageCircle,
  MessageSquareText,
  Plane,
  Quote,
  ShieldCheck,
  Ship,
  SlidersHorizontal,
  Stamp,
  Star,
  UsersRound,
  Wallet,
} from "lucide-react";
import { partners } from "@/components/home/PartnerStrip";
import { tr } from "@/i18n/config";
import RibbonStar, { STAR_DEFAULT_NAMES } from "@/components/home/RibbonStar";
import { cn } from "@/lib/utils";
import { AutoNote, InlineText, MiniHeading, Pic, Sec, T } from "./shared";
import { HOME_IMAGE_CROPS } from "@/components/home/images";
import { HomeImagesContext, ImageSlot, useHomeImage } from "./ImageSlot";

/**
 * Các khối chữ của trang chủ (thu nhỏ): bố cục, màu và thứ tự như trang thật;
 * mọi câu chữ bấm vào là sửa được (<T k="…"/>), phần tự động có 1 dòng ghi chú nơi sửa.
 */

/* ---------- Dải uy tín dưới banner ---------- */

const trustIcons = [Star, Star, UsersRound, Headset, Layers];

export function TrustSection() {
  return (
    <Sec name="Dải uy tín" className="bg-cream-50 pb-6 sm:pb-7">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-sand-300/60">
        {trustIcons.map((Icon, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 max-md:last:col-span-2 lg:px-3.5 lg:first:pl-0"
          >
            <Icon
              className={cn(
                "mt-0.5 size-5 shrink-0",
                i === 0 ? "text-[#00af87]" : i === 1 ? "text-amber-brand" : "text-forest-700",
              )}
            />
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <T k={`trust.${i}.t`} label="Tiêu đề" className="text-xs font-bold text-ink" />
              <T
                k={`trust.${i}.d`}
                multiline
                label="Dòng mô tả"
                className="mt-1 text-[11px] text-muted"
              />
            </span>
          </li>
        ))}
      </ul>
    </Sec>
  );
}

/* ---------- 3 dịch vụ chính ---------- */

const services = [
  { key: "tours", icon: Map },
  { key: "car", icon: Car },
  { key: "visa", icon: Stamp },
];

export function ServicesSection() {
  return (
    <Sec name="Dịch vụ chính" className="bg-cream-50">
      <MiniHeading eyebrow="servicesEyebrow" title="servicesTitle" subtitle="servicesSubtitle" />
      <div className="grid gap-4 md:grid-cols-3">
        {services.map((s, i) => (
          <article
            key={s.key}
            className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_36px_-26px_rgba(60,40,10,0.55)] ring-1 ring-sand-300/60"
          >
            {/* Ảnh thẻ: bấm "Đổi ảnh / Dán link / Cắt ảnh" ngay trên ảnh (khung 16:10 như web) */}
            <div className="relative [&_.rounded-2xl]:rounded-none">
              <ImageSlot
                path={`services.${s.key}`}
                aspect="aspect-[16/10]"
                label="Ảnh thẻ dịch vụ"
              />
              <span className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-white/95 py-1 pr-3 pl-1 text-[11px] font-bold text-ink shadow">
                <span className="grid size-6 place-items-center rounded-full bg-sun-500 text-white">
                  <s.icon className="size-3" />
                </span>
                0{i + 1}
              </span>
            </div>
            <div className="flex flex-1 flex-col items-start p-4">
              <T
                k={`services.${s.key}.title`}
                label="Tên dịch vụ"
                className="text-sm font-bold tracking-tight text-ink sm:text-[0.95rem]"
              />
              <T
                k={`services.${s.key}.text`}
                multiline
                label="Mô tả dịch vụ"
                className="mt-1.5 text-xs leading-relaxed text-muted"
              />
              <span className="mt-auto w-full pt-4">
                <span className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-sun-500 px-3 text-xs font-semibold text-white">
                  <T k={`services.${s.key}.cta`} dark label="Chữ trên nút" />
                  <ArrowRight className="size-3.5 shrink-0" />
                </span>
              </span>
            </div>
          </article>
        ))}
      </div>
      <AutoNote className="mt-5">
        Ảnh nào trên trang chủ cũng đổi được bằng các nút ngay trên ảnh. Bấm “Bỏ ảnh” để dùng lại
        ảnh có sẵn.
      </AutoNote>
    </Sec>
  );
}

/* ---------- Khối đối tác B2B ---------- */

/** 1 khung ảnh của khối đối tác: 3 ảnh đổi luân phiên trên web — chọn số ảnh rồi đổi / cắt ngay trên khung */
function B2BFrame({ group, className }) {
  const [i, setI] = useState(0);
  return (
    // khung lớn nằm trên để nút đổi ảnh của cả 2 khung luôn bấm được; rê chuột / bấm vào khung → khung nổi lên trên
    <div
      className={cn(
        "absolute overflow-hidden rounded-[2rem] shadow-lg focus-within:z-[4] hover:z-[4]",
        className,
      )}
    >
      <ImageSlot
        path={`${group}.${i}`}
        aspect="aspect-[6/5]"
        label={group === "b2bNorth" ? "Ảnh khung lớn" : "Ảnh khung nhỏ"}
      />
      <div
        role="group"
        aria-label="Chọn ảnh để đổi (trên web 3 ảnh đổi luân phiên)"
        className="absolute top-2 right-3 flex gap-1 rounded-full bg-slate-950/55 p-1 backdrop-blur-sm"
      >
        {[0, 1, 2].map((k) => (
          <B2BThumb key={k} group={group} k={k} on={k === i} onClick={() => setI(k)} />
        ))}
      </div>
    </div>
  );
}

function B2BThumb({ group, k, on, onClick }) {
  const src = useHomeImage(`${group}.${k}`);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={`Ảnh ${k + 1}`}
      className={cn(
        "relative size-7 overflow-hidden rounded-full ring-2 transition",
        on ? "ring-white" : "opacity-70 ring-transparent hover:opacity-100",
      )}
    >
      <Pic src={src} sizes="64px" />
      <span className="absolute inset-0 grid place-items-center bg-black/25 text-[10px] font-bold text-white">
        {k + 1}
      </span>
    </button>
  );
}

export function B2BSection() {
  return (
    <Sec name="Dành cho đối tác" className="bg-cream-50">
      <span className="absolute inset-0 -z-10 opacity-40">
        <Pic src="/images/tours/hd/tourdulichnhatranggiare.jpg" sizes="1200px" />
      </span>
      <span className="absolute inset-0 -z-10 bg-gradient-to-l from-cream-50/95 via-cream-50/85 to-cream-50/50" />
      <div className="grid items-center gap-8 lg:grid-cols-2">
        {/* 2 khung ảnh (mỗi khung 3 ảnh đổi luân phiên) + 2 huy hiệu của trang thật — sửa ảnh ngay tại chỗ */}
        <div className="relative mx-auto aspect-[113/100] w-full max-w-md">
          <B2BFrame group="b2bNorth" className="top-0 left-0 z-[2] w-[70%] ring-4 ring-cream-50" />
          <B2BFrame group="b2bSouth" className="right-0 bottom-0 z-[1] w-[64%]" />
          <span className="pointer-events-none absolute bottom-[8%] left-[2%] z-[3] flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-ink shadow-xl select-none">
            <Clock4 className="size-5 text-sun-500" />
            <span className="text-sm leading-none font-extrabold">24h</span>
          </span>
          <span className="pointer-events-none absolute top-[8%] right-[2%] z-[3] rounded-xl bg-sun-500 px-3 py-2 text-sm leading-none font-extrabold text-white shadow-xl select-none">
            2–200+
          </span>
        </div>

        <div className="flex min-w-0 flex-col items-start">
          <T
            k="b2bEyebrow"
            label="Dòng chữ nhỏ phía trên tiêu đề"
            className="text-[0.62rem] font-bold tracking-[0.25em] text-clay-600 uppercase"
          />
          <T
            k="b2bTitle"
            multiline
            label="Tiêu đề khối"
            className="mt-2 text-xl leading-[1.1] font-extrabold tracking-[-0.03em] text-ink sm:text-[1.75rem]"
          />
          <ul className="mt-3.5 flex flex-wrap gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="rounded-full border border-sand-300 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-ink shadow-sm"
              >
                <T k={`b2bAudiences.${i}`} label="Nhóm đối tác" />
              </li>
            ))}
          </ul>
          <T
            k="b2bText"
            multiline
            label="Đoạn giới thiệu"
            className="mt-3.5 text-xs leading-relaxed text-ink/80 sm:text-[0.8rem]"
          />
          <ul className="mt-4 grid w-full gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="mt-px size-4 shrink-0 text-sun-500" />
                <T
                  k={`b2bPoints.${i}`}
                  multiline
                  label="Điểm mạnh"
                  className="min-w-0 text-xs text-ink/90"
                />
              </li>
            ))}
          </ul>
          <span className="mt-5 flex h-9 items-center gap-1.5 rounded-xl bg-sun-500 px-4 text-xs font-semibold text-white">
            <Handshake className="size-4 shrink-0" />
            <T k="b2bCta" dark label="Chữ trên nút" />
          </span>
        </div>
      </div>
    </Sec>
  );
}

/* ---------- Bản đồ Bắc → Nam ---------- */

export function MapSection() {
  return (
    <Sec name="Bản đồ Việt Nam" className="bg-cream-100">
      <MiniHeading eyebrow="mapEyebrow" title="mapTitle" subtitle="mapSubtitle" className="mb-5" />
      <AutoNote href="/admin/destinations" linkText="Mở mục Điểm đến">
        Bản đồ tự hiện mọi điểm đến đang bật cùng 2 tour tiêu biểu của điểm đó.
      </AutoNote>
    </Sec>
  );
}

/* ---------- Vietlook qua những con số ---------- */

const statIcons = [CalendarCheck, Map, MapPin, Plane, Car, Star];
function StatIcon({ i }) {
  const Icon = statIcons[i];
  return <Icon className="size-4" />;
}

/**
 * `values`: 6 con số nhân viên tự nhập (trống = website tự tính); `auto`: con số tự động tương ứng,
 * hiện mờ khi ô để trống.
 */
export function StatsSection({ values, onValues, auto }) {
  const stat = (i, right) => (
    <li
      key={i}
      className={cn(
        "flex items-center gap-3",
        right ? "lg:flex-row" : "lg:flex-row-reverse lg:text-right",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#2a0f0b] text-amber-brand ring-2 ring-amber-brand/70">
        <StatIcon i={i} />
      </span>
      <span className={cn("flex min-w-0 flex-col items-start", !right && "lg:items-end")}>
        <InlineText
          value={values[i] ?? ""}
          placeholder={auto[i]}
          onChange={(v) => onValues(values.map((x, k) => (k === i ? v.slice(0, 12) : x)))}
          label="Con số — để trống thì website tự tính"
          className="text-xl leading-none font-extrabold tracking-tight text-white"
        />
        <T
          k={`heritageStats.${i}.label`}
          dark
          multiline
          label="Chú thích của con số"
          className="mt-1.5 text-[11px] font-medium text-cream-100/75"
        />
      </span>
    </li>
  );

  return (
    <Sec name="Con số nổi bật" dark className="bg-[#2a0f0b] text-cream-50">
      <span className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_62%,#7a2216_0%,#4a160f_38%,#2a0f0b_72%)]" />
      <MiniHeading
        dark
        eyebrow="heritageEyebrow"
        title="heritageTitle"
        subtitle="heritageText"
        className="[&>span:last-child]:hidden"
      />
      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8">
        <ul className="max-lg:contents lg:grid lg:gap-7">{[0, 1, 2].map((i) => stat(i, false))}</ul>
        <div
          aria-hidden
          className="relative mx-auto size-44 select-none max-lg:order-first max-lg:col-span-full sm:size-52"
        >
          <span className="absolute inset-[-10%] rounded-full bg-[radial-gradient(circle,rgba(247,179,43,0.35),rgba(247,179,43,0.08)_45%,transparent_70%)]" />
          <Image
            src="/images/drum/trong-dong-bronze.webp"
            alt=""
            width={416}
            height={416}
            className="absolute inset-0 size-full brightness-125 saturate-125"
          />
          <span className="absolute inset-[36%] grid place-items-center rounded-full bg-white shadow-[0_0_0_3px_rgba(247,179,43,0.5)]">
            <Image
              src="/images/logo/vietlook-icon.png"
              alt=""
              width={96}
              height={96}
              className="h-auto w-[74%]"
            />
          </span>
        </div>
        <ul className="max-lg:contents lg:grid lg:gap-7">{[3, 4, 5].map((i) => stat(i, true))}</ul>
      </div>
      <AutoNote dark className="mt-6">
        Con số để trống (chữ mờ) sẽ do website tự tính. Gõ vào ô nếu muốn tự đặt con số.
      </AutoNote>
    </Sec>
  );
}

/* ---------- 5 bước đặt tour ---------- */

const stepIcons = [MessageSquareText, CalendarCheck, Map, CreditCard, Plane];

export function StepsSection() {
  return (
    <Sec name="Các bước đặt tour" className="bg-cream-50">
      <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(247,179,43,0.18),transparent_55%)]" />
      <MiniHeading eyebrow="stepsEyebrow" title="stepsTitle" />
      <ol className="relative grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-5">
        <span
          aria-hidden
          className="absolute top-7 right-[10%] left-[10%] hidden border-t-2 border-dotted border-amber-brand/50 md:block"
        />
        {stepIcons.map((Icon, i) => (
          <li
            key={i}
            className="relative flex flex-col items-center text-center max-md:last:col-span-2"
          >
            <span className="relative grid size-14 place-items-center rounded-full bg-white text-ink shadow-[0_10px_30px_-14px_rgba(60,40,10,0.35)] ring-1 ring-sand-300/60">
              <Icon className="size-6" strokeWidth={1.3} />
              <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-amber-brand ring-[3px] ring-cream-50" />
            </span>
            <span className="mt-3 block text-3xl leading-none font-semibold text-amber-brand/90">
              {String(i + 1).padStart(2, "0")}
            </span>
            <T
              k={`steps.${i}.title`}
              multiline
              label="Tên bước"
              className="mt-2 text-xs leading-snug font-semibold text-ink"
            />
            <T
              k={`steps.${i}.text`}
              multiline
              label="Mô tả bước"
              className="mt-1.5 text-[11px] leading-relaxed text-muted"
            />
          </li>
        ))}
      </ol>
    </Sec>
  );
}

/* ---------- Thiết kế tour riêng ---------- */

const customIcons = [Hotel, MessageCircle, SlidersHorizontal, Layers, BadgeDollarSign];

/** 6 cánh ngôi sao dải lụa (thứ tự như home.images.star) + lớp tỉ lệ khung đúng hộp cánh trên web */
const STAR_PETALS = [
  { name: "Cánh trên", aspect: "aspect-[0.909]" },
  { name: "Cánh trái trên", aspect: "aspect-square" },
  { name: "Cánh phải trên", aspect: "aspect-[1.602]" },
  { name: "Cánh phải dưới", aspect: "aspect-[1.536]" },
  { name: "Cánh trái dưới", aspect: "aspect-[1.767]" },
  { name: "Cánh dưới", aspect: "aspect-[2.86]" },
];

function StarThumb({ k, on, onClick }) {
  const src = useHomeImage(`star.${k}`);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={STAR_PETALS[k].name}
      className={cn(
        "relative h-9 overflow-hidden rounded-lg ring-2 transition",
        on ? "ring-clay-500" : "opacity-75 ring-sand-300/60 hover:opacity-100",
      )}
    >
      <Pic src={src} sizes="64px" />
      <span className="absolute inset-0 grid place-items-center bg-black/25 text-[10px] font-bold text-white">
        {k + 1}
      </span>
    </button>
  );
}

/** Ngôi sao dải lụa + ô đổi ảnh cho cánh đang chọn (trên web mỗi cánh là 1 ảnh điểm đến) */
function StarEditor({ lang }) {
  const [k, setK] = useState(0);
  const ctx = useContext(HomeImagesContext);
  return (
    <div className="mx-auto flex w-full max-w-[300px] flex-col items-center gap-3">
      <div aria-hidden inert className="pointer-events-none w-full max-w-[280px] select-none">
        <RibbonStar lang={lang} images={ctx?.images?.star} labels={ctx?.starLabels} />
      </div>
      <div className="w-full rounded-2xl bg-white/80 p-2.5 shadow-sm ring-1 ring-sand-300/60">
        <p className="mb-2 text-center text-[11px] font-semibold text-slate-600">
          Ảnh trong ngôi sao — chọn cánh để đổi
        </p>
        <div className="mb-2.5 grid grid-cols-6 gap-1.5">
          {STAR_PETALS.map((_, i) => (
            <StarThumb key={i} k={i} on={i === k} onClick={() => setK(i)} />
          ))}
        </div>
        {/* khung cánh đúng tỉ lệ, cao tối đa ~170px để cánh dọc không kéo dài cả cột */}
        <ImageSlot
          key={k}
          path={`star.${k}`}
          aspect={STAR_PETALS[k].aspect}
          label={STAR_PETALS[k].name}
          className="mx-auto [&>div>div]:rounded-xl"
          style={{ maxWidth: Math.round(170 * HOME_IMAGE_CROPS.star[k].ratio) }}
        />
        <p className="mt-1.5 text-center text-[11px] text-slate-500">{STAR_PETALS[k].name}</p>
        <label className="mt-2.5 block text-left">
          <span className="mb-1 block text-[11px] font-semibold text-slate-600">
            Tên địa điểm (hiện khi rê chuột vào cánh)
          </span>
          <input
            value={ctx?.starLabels?.[k]?.[lang] ?? ""}
            maxLength={60}
            placeholder={tr(STAR_DEFAULT_NAMES[k], lang)}
            onChange={(e) =>
              ctx?.setStarLabels((list) =>
                (list ?? []).map((l, i) => (i === k ? { ...l, [lang]: e.target.value } : l)),
              )
            }
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>
    </div>
  );
}

export function CustomTripSection({ lang }) {
  return (
    <Sec
      name="Tour thiết kế riêng"
      className="bg-cream-50 bg-[radial-gradient(circle_at_28%_50%,rgba(255,255,255,0.9),rgba(255,255,255,0)_55%),repeating-radial-gradient(circle_at_28%_50%,rgba(160,130,80,0.09)_0_1px,transparent_1px_26px)]"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr]">
        <StarEditor lang={lang} />
        <div className="flex min-w-0 flex-col items-start">
          <T
            k="customEyebrow"
            label="Dòng chữ nhỏ phía trên tiêu đề"
            className="text-[0.62rem] font-bold tracking-[0.18em] text-clay-600 uppercase"
          />
          <T
            k="customTitle"
            multiline
            label="Tiêu đề khối"
            className="mt-2 text-xl leading-tight font-bold tracking-[-0.03em] text-ink sm:text-[1.65rem]"
          />
          <T
            k="customSubtitle"
            multiline
            label="Dòng mô tả dưới tiêu đề"
            className="mt-2 text-sm font-medium text-forest-700"
          />
          <T
            k="customText"
            multiline
            label="Đoạn giới thiệu"
            className="mt-2.5 text-xs leading-relaxed text-ink/80 sm:text-[0.8rem]"
          />
          <ul className="mt-4 grid w-full gap-2 sm:grid-cols-2">
            {customIcons.map((Icon, i) => (
              <li
                key={i}
                className="flex items-center gap-2.5 rounded-xl bg-white/90 p-2 shadow-sm ring-1 ring-sand-300/50 sm:last:col-span-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cream-100 text-clay-600">
                  <Icon className="size-4" />
                </span>
                <T
                  k={`customPoints.${i}`}
                  multiline
                  label="Điểm nổi bật"
                  className="min-w-0 text-xs leading-snug font-semibold text-ink"
                />
              </li>
            ))}
          </ul>
          <span className="mt-5 flex h-9 items-center rounded-xl bg-sun-500 px-4 text-xs font-semibold text-white">
            <T k="customCta" dark label="Chữ trên nút" />
          </span>
        </div>
      </div>
    </Sec>
  );
}

/* ---------- Vì sao chọn Vietlook ---------- */

const whyIcons = [Layers, Wallet, MapPinned, ShieldCheck, Headphones, Handshake];

export function WhySection() {
  return (
    <Sec name="Vì sao chọn Vietlook" className="bg-cream-50">
      <span className="absolute inset-0 -z-10 opacity-15">
        <Pic src="/images/tours/v2/sapa-6872795.jpg" sizes="1200px" />
      </span>
      <MiniHeading title="whyTitle" subtitle="whySubtitle" />
      <ul className="grid gap-x-7 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {whyIcons.map((Icon, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest-700 text-white shadow-lg shadow-forest-700/25">
              <Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col items-start">
              <T
                k={`why.${i}.title`}
                label="Tiêu đề lý do"
                className="text-sm font-semibold tracking-tight text-ink"
              />
              <T
                k={`why.${i}.text`}
                multiline
                label="Mô tả lý do"
                className="mt-1 text-xs leading-relaxed text-muted"
              />
            </span>
          </li>
        ))}
      </ul>
    </Sec>
  );
}

/* ---------- Dải logo đối tác ---------- */

export function PartnerStripSection() {
  return (
    <Sec name="Logo đối tác" className="bg-cream-100 pb-6 sm:pb-7">
      <div className="flex flex-col items-center text-center">
        <T
          k="partnerStrip"
          label="Tiêu đề dải logo đối tác"
          className="text-base font-bold tracking-tight text-forest-900 uppercase sm:text-lg"
        />
      </div>
      <ul
        aria-hidden
        className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 select-none"
      >
        {partners.map((p) => (
          <li key={p.name}>
            <Image
              src={p.logo}
              alt=""
              width={p.w}
              height={160}
              sizes="120px"
              className={cn(
                "w-auto max-w-[110px] object-contain opacity-90",
                p.big ? "h-9" : "h-6",
              )}
            />
          </li>
        ))}
      </ul>
    </Sec>
  );
}

/* ---------- Dự án hợp tác ---------- */

const projectIcons = [Handshake, Building2, Ship];

export function ProjectsSection() {
  return (
    <Sec name="Dự án hợp tác" className="bg-white">
      <MiniHeading eyebrow="partnersEyebrow" title="projectsTitle" subtitle="partnersSubtitle" />
      <ul className="grid gap-4 md:grid-cols-3">
        {projectIcons.map((Icon, i) => (
          <li
            key={i}
            className="flex flex-col items-start rounded-2xl border border-sand-300/70 bg-cream-50 p-4"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-forest-700 text-white">
              <Icon className="size-4" />
            </span>
            <T
              k={`projects.${i}.title`}
              multiline
              label="Tên dự án"
              className="mt-3 text-sm font-bold text-ink"
            />
            <T
              k={`projects.${i}.text`}
              multiline
              label="Mô tả dự án"
              className="mt-1.5 text-xs leading-relaxed text-muted"
            />
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-center">
        <span className="flex h-9 items-center gap-1.5 rounded-xl bg-sun-500 px-4 text-xs font-semibold text-white">
          <Handshake className="size-4 shrink-0" />
          <T k="partnersCta" dark label="Chữ trên nút" />
        </span>
      </div>
    </Sec>
  );
}

/* ---------- Đánh giá của khách ---------- */

export function ReviewsSection() {
  return (
    <Sec name="Đánh giá của khách" dark className="bg-forest-900 text-white">
      <MiniHeading dark eyebrow="reviewsEyebrow" title="reviewsTitle" subtitle="reviewsSubtitle" />
      <ul aria-hidden className="grid gap-3 select-none sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className={cn("rounded-2xl bg-white p-4", i === 2 && "max-sm:hidden")}>
            <Quote className="size-5 text-amber-brand" />
            <span className="mt-3 block h-2 w-3/4 rounded-full bg-slate-200" />
            <span className="mt-2 block h-2 w-full rounded-full bg-slate-100" />
            <span className="mt-2 block h-2 w-5/6 rounded-full bg-slate-100" />
            <span className="mt-4 flex items-center gap-2">
              <span className="size-7 rounded-full bg-slate-200" />
              <span className="h-2 w-20 rounded-full bg-slate-200" />
              <span className="ml-auto flex items-center gap-0.5 text-[11px] font-bold text-forest-900">
                5 <Star className="size-3 fill-amber-brand text-amber-brand" />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Sec>
  );
}

/* ---------- Cẩm nang du lịch + Việt Nam theo tháng ---------- */

function PostSkeletons({ n, className }) {
  return (
    <ul aria-hidden className={cn("grid gap-3 select-none", className)}>
      {Array.from({ length: n }, (_, i) => (
        <li
          key={i}
          className={cn(
            "overflow-hidden rounded-xl bg-white ring-1 ring-sand-300/50",
            i >= 2 && "max-sm:hidden",
          )}
        >
          <span className="block h-20 bg-sand-300/35" />
          <span className="block space-y-1.5 p-2.5">
            <span className="block h-2 w-full rounded-full bg-slate-200" />
            <span className="block h-2 w-2/3 rounded-full bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function GuideSection() {
  return (
    <Sec name="Cẩm nang du lịch" className="bg-white">
      <MiniHeading eyebrow="guideEyebrow" title="guideTitle" subtitle="guideSubtitle" />
      <PostSkeletons n={4} className="grid-cols-2 sm:grid-cols-4" />
      <div className="mt-5 flex flex-col items-center gap-4">
        <span className="flex h-9 items-center rounded-full bg-forest-700 px-4 text-xs font-semibold text-white">
          <T k="guideCta" dark label="Chữ trên nút" />
        </span>
        <AutoNote href="/admin/articles" linkText="Mở mục Bài viết">
          4 bài viết mới nhất tự hiện ở đây.
        </AutoNote>
      </div>
    </Sec>
  );
}

export function MonthsSection() {
  return (
    <Sec name="Việt Nam theo tháng" className="bg-cream-50">
      <MiniHeading eyebrow="monthEyebrow" title="monthTitle" subtitle="monthSubtitle" />
      <PostSkeletons n={4} className="grid-cols-2 sm:grid-cols-4" />
      <AutoNote className="mt-5" href="/admin/articles" linkText="Mở mục Bài viết">
        12 thẻ tháng tự lấy từ các bài viết thuộc chuyên mục “Việt Nam theo tháng”.
      </AutoNote>
    </Sec>
  );
}

/* ---------- Lên kế hoạch chuyến đi ---------- */

export function PlannerSection() {
  return (
    <Sec name="Lên kế hoạch chuyến đi" dark className="bg-forest-900 text-white">
      <div className="grid items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex min-w-0 flex-col items-start">
          <T
            k="plannerTitle"
            dark
            multiline
            label="Tiêu đề khối"
            className="text-xl leading-tight font-bold tracking-[-0.03em] text-white sm:text-[1.65rem]"
          />
          <T
            k="plannerSubtitle"
            dark
            multiline
            label="Dòng mô tả dưới tiêu đề"
            className="mt-2 text-xs text-white/80 sm:text-[0.8rem]"
          />
          <span aria-hidden className="mt-3.5 block h-[3px] w-10 rounded-full bg-amber-brand" />
        </div>
        <div aria-hidden className="space-y-2.5 rounded-2xl bg-white p-4 select-none">
          <span className="block h-2 w-1/3 rounded-full bg-slate-200" />
          <span className="flex flex-wrap gap-1.5">
            {[14, 20, 16, 24, 18].map((w, i) => (
              <span key={i} className="h-6 rounded-full bg-slate-100" style={{ width: w * 4 }} />
            ))}
          </span>
          <span className="grid grid-cols-2 gap-2">
            <span className="h-8 rounded-lg bg-slate-100" />
            <span className="h-8 rounded-lg bg-slate-100" />
          </span>
          <span className="block h-8 w-28 rounded-lg bg-sun-500" />
        </div>
      </div>
    </Sec>
  );
}

/* ---------- Giới thiệu ngắn ---------- */

export function AboutSection() {
  return (
    <Sec name="Về chúng tôi" className="bg-white">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col items-start">
          <T
            k="aboutTitle"
            label="Tiêu đề khối"
            className="text-2xl leading-tight font-bold tracking-[-0.03em] text-ink sm:text-[2rem]"
          />
          <T
            k="aboutSubtitle"
            multiline
            label="Dòng mô tả dưới tiêu đề"
            className="mt-2 text-sm font-medium text-forest-700"
          />
          <span aria-hidden className="mt-3 block h-[3px] w-10 rounded-full bg-forest-700" />
          <T
            k="aboutText"
            multiline
            label="Đoạn giới thiệu công ty"
            className="mt-4 text-xs leading-relaxed text-ink/80 sm:text-[0.8rem]"
          />
          <T
            k="aboutCta"
            label="Chữ của đường dẫn"
            className="mt-4 text-sm font-medium text-forest-700 underline underline-offset-4"
          />
        </div>
        {/* khung vòm như trang thật, góc dưới bớt cong để các nút đổi ảnh không bị che */}
        <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[42%_58%_30%_34%/48%_42%_24%_26%] shadow-xl [&_.rounded-2xl]:rounded-none">
          <ImageSlot path="about" aspect="aspect-square" label="Ảnh giới thiệu" />
        </div>
      </div>
    </Sec>
  );
}
