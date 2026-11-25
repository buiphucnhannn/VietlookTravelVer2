"use client";

import { ChevronRight, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { cn } from "@/lib/utils";
import { Pic } from "../../home/shared";
import { ImagePill, ModuleNote, Sec, Shown, Txt, useCopyField } from "../blocks";

/**
 * Khối dùng chung cho bản xem trước nhóm "Tour & du thuyền" (Tất cả tour, 3 trang du thuyền, Gói tour):
 * đầu trang 3 ảnh + tiêu đề nét cọ (components/ui/PageHero.js → BrushHero), hộp tư vấn (AdviceBox),
 * khung ghi chú cho danh sách tour (dữ liệu mục Tour).
 */

export const TOURS_ADMIN = `${ADMIN_BASE}/tours`;

/** 1 ô ảnh của dải 3 ảnh đầu trang (điện thoại chỉ hiện ảnh đầu, như trang thật) */
function HeroTile({ i, solo }) {
  const fld = useCopyField(`heroImages.${i}`);
  return (
    <div
      className={cn(
        "relative h-full flex-1",
        i > 0 && "hidden md:block",
        i > 0 && solo && "lg:hidden",
      )}
    >
      <Pic src={fld.value || fld.def} sizes="480px" />
    </div>
  );
}

// Khung "giọt nước" + dải ảnh chéo — giống BlobCollage trong components/ui/PageHero.js
const BLOB =
  "M0.06,0.42 C0.1,0.18 0.36,0.03 0.66,0.01 C0.88,-0.005 1,0.1 0.985,0.3 C0.97,0.52 0.85,0.76 0.62,0.9 C0.43,1.01 0.2,1.02 0.08,0.86 C0.01,0.76 0.02,0.58 0.06,0.42 Z";
const BANDS = [
  "polygon(0 0, 100% 0, 100% 22%, 0 50%)",
  "polygon(0 52.5%, 100% 24.5%, 100% 62%, 0 90%)",
  "polygon(0 92.5%, 100% 64.5%, 100% 100%, 0 100%)",
];

function CollageBand({ i }) {
  const fld = useCopyField(`collageImages.${i}`);
  return (
    <div className="absolute inset-0" style={{ clipPath: BANDS[i] }}>
      <Pic src={fld.value || fld.def} sizes="400px" />
    </div>
  );
}

/** 3 ảnh ghép chéo trong khung bo tròn (trang Gói tour) + 3 thanh đổi ảnh bên dưới */
function Collage() {
  return (
    <div className="flex w-full max-w-[19rem] flex-col items-center gap-2 justify-self-center">
      <div className="relative aspect-[5/4] w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]">
        <svg width="0" height="0" className="absolute">
          <defs>
            <clipPath id="pc-hero-blob" clipPathUnits="objectBoundingBox">
              <path d={BLOB} />
            </clipPath>
          </defs>
        </svg>
        <div className="absolute inset-0 translate-x-3 translate-y-2 rotate-[8deg] bg-clay-500/85 [clip-path:url(#pc-hero-blob)]" />
        <div className="absolute inset-0 bg-white/95 [clip-path:url(#pc-hero-blob)]">
          {[0, 1, 2].map((i) => (
            <CollageBand key={i} i={i} />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <ImagePill
            key={i}
            f={`collageImages.${i}`}
            title={`Ảnh ghép ${i + 1}`}
            floating={false}
          />
        ))}
      </div>
      <p className="text-center text-[10.5px] text-white/60">
        Khung ảnh ghép chỉ hiện trên máy tính (dải từ trên xuống: ảnh 1 → 3).
      </p>
    </div>
  );
}

/**
 * Đầu trang: dải 3 ảnh nền + đường dẫn + tiêu đề nét cọ + đoạn giới thiệu.
 * `collage`: có khung 3 ảnh ghép bên phải (trang Gói tour; màn hình lớn chỉ giữ ảnh nền đầu).
 */
export function TourHero({ collage }) {
  return (
    <Sec name="Đầu trang" dark className="bg-brand-950 text-white sm:pb-12" wide>
      <div className="absolute inset-0 -z-10 flex gap-[3px] bg-brand-950">
        {[0, 1, 2].map((i) => (
          <HeroTile key={i} i={i} solo={collage} />
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />
      {collage && (
        <div className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/55 via-black/35 to-black/10 lg:block" />
      )}
      {/* nút đổi ảnh nền: mỗi ảnh 1 thanh nút ở chân ô ảnh đó */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex gap-[3px] px-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "relative flex flex-1 justify-center",
              i > 0 && "hidden md:flex",
              collage && i > 0 && "lg:hidden",
            )}
          >
            <ImagePill
              f={`heroImages.${i}`}
              title={collage ? `Ảnh nền ${i + 1}` : `Ảnh ${i + 1}`}
              floating={false}
              className="pointer-events-auto"
            />
          </div>
        ))}
      </div>
      <div
        className={cn(
          "flex min-h-[260px] flex-col items-center justify-center pb-12 text-center sm:min-h-[300px]",
          collage &&
            "lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-center lg:gap-8 lg:text-left",
        )}
      >
        <div className={cn("flex flex-col items-center", collage && "lg:items-start")}>
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
        </div>
        {collage && (
          <div className="mt-6 lg:mt-0">
            <Collage />
          </div>
        )}
      </div>
    </Sec>
  );
}

/** Hộp tư vấn kiểu AdviceBox: chữ bên trái, nút bên phải (title / text / cta: đường dẫn ô) */
export function AdviceBoxPreview({ title, text, cta, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col items-start">
        <Txt f={title} className="text-base font-extrabold tracking-tight text-ink sm:text-lg" />
        <Txt f={text} className="mt-1.5 text-xs leading-relaxed text-ink/75" />
      </div>
      <span className="inline-flex h-9 shrink-0 items-center self-start rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white shadow-sm lg:self-center">
        <Txt f={cta} dark />
      </span>
    </div>
  );
}

/** Mô phỏng thanh lọc + lưới thẻ tour (dữ liệu mục Tour, không sửa ở đây) */
export function TourGridNote({ title, text }) {
  return (
    <ModuleNote
      icon={LayoutGrid}
      title={title}
      text={text}
      href={TOURS_ADMIN}
      linkText="Sửa tour ở mục Tour"
    >
      <div className="mb-4 flex flex-wrap items-center gap-1.5" aria-hidden>
        <SlidersHorizontal className="mr-1 size-4 text-slate-400" />
        {["Điểm đến", "Chủ đề", "Thời lượng", "Ngân sách"].map((x) => (
          <span
            key={x}
            className="rounded-lg bg-white px-2.5 py-1 text-[10.5px] font-medium text-slate-500 ring-1 ring-slate-200"
          >
            {x}
          </span>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <span className="block aspect-[4/3] bg-slate-100" />
            <span className="m-2 block h-2 w-3/4 rounded bg-slate-200" />
            <span className="m-2 mt-0 block h-2 w-1/3 rounded bg-brand-100" />
          </div>
        ))}
      </div>
    </ModuleNote>
  );
}
