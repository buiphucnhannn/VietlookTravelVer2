"use client";

import { useContext } from "react";
import Image from "next/image";
import {
  Accessibility,
  ArrowUpRight,
  ChevronRight,
  Ear,
  ListOrdered,
  Mail,
  MessagesSquare,
  Phone,
  Star,
} from "lucide-react";
import { siteConfig } from "@/constants/site";
import { EXCLUSIVE_THEME } from "@/constants/themes";
import { LineIcon, WeChatIcon, WhatsAppIcon, ZaloIcon } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/utils";
import { Pic } from "../../home/shared";
import { PageCopyContext, Sec, Txt } from "../blocks";

/**
 * Bản xem trước thẻ "Chữ chung trên trang chi tiết" (lib/page-copy/registry/detail.mjs): 4 khối theo nơi chữ
 * xuất hiện — trang chủ đề, trang điểm đến, bài viết cẩm nang, trang tour. Mỗi khối là các mảnh thu nhỏ của
 * trang thật (đúng kiểu chữ / màu), phần dữ liệu riêng (tour, bài viết, ảnh…) chỉ mô phỏng mờ.
 */

const SAMPLE = {
  theme: `/themes/${EXCLUSIVE_THEME}`,
  region: "/destinations/north-vietnam",
  guide: "/travel-guide",
  tours: "/tours",
};

/** Link "xem trang mẫu trên website" ở đầu mỗi khối (đúng ngôn ngữ đang sửa) */
function SampleLink({ path, children }) {
  const lang = useContext(PageCopyContext)?.lang ?? "en";
  return (
    <a
      href={`${lang === "en" ? "" : `/${lang}`}${path}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-[11.5px] font-semibold text-brand-700 transition hover:bg-brand-100"
    >
      {children}
      <ArrowUpRight className="size-3.5" />
    </a>
  );
}

/** Đầu mỗi khối: nơi xuất hiện + link trang mẫu */
function Where({ text, path, link }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
      <p className="text-xs text-slate-500">{text}</p>
      <SampleLink path={path}>{link}</SampleLink>
    </div>
  );
}

/** Nhãn nhỏ phía trên 1 mảnh mô phỏng */
function Part({ title, children, className }) {
  return (
    <div className={className}>
      <p className="mb-2 text-[10.5px] font-semibold tracking-wide text-slate-400 uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

/** Gợi ý {name} */
function NameHint({ what, dark }) {
  return (
    <p className={cn("mt-1.5 text-[10.5px]", dark ? "text-white/60" : "text-slate-400")}>
      <code className="rounded bg-black/10 px-1">{"{name}"}</code> = {what}, website tự điền
    </p>
  );
}

/** Thẻ tour / bài viết mô phỏng (dữ liệu thật ở mục Tour / Bài viết) */
function CardMock({ tall }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white text-left shadow-sm ring-1 ring-border">
      <span
        className={cn(
          "block bg-gradient-to-br from-cream-100 to-sand-300/50",
          tall ? "aspect-[4/3]" : "aspect-[16/10]",
        )}
      />
      <div className="space-y-1.5 p-2.5">
        <span className="block h-2 w-full rounded bg-slate-200" />
        <span className="block h-2 w-2/3 rounded bg-slate-200" />
      </div>
    </div>
  );
}

/** Hộp gợi ý (components/ui/AdviceBox): chữ trái, nút phải */
function AdviceMock({ title, text, cta }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-border lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="flex min-w-0 flex-col items-start">
        <Txt f={title} className="text-lg font-extrabold tracking-tight text-ink" />
        <Txt f={text} className="mt-1.5 text-[13px] leading-relaxed text-ink/75" />
      </div>
      <span className="inline-flex h-10 shrink-0 items-center self-start rounded-md bg-sun-500 px-5 text-sm font-semibold text-white shadow-md lg:self-center">
        <Txt f={cta} dark />
      </span>
    </div>
  );
}

export default function DetailPreview() {
  return (
    <>
      {/* ========== Trang chủ đề ========== */}
      <Sec name="Trang chủ đề" className="bg-white">
        <Where
          text="Hiện trên mọi trang chủ đề (vd. Tour độc quyền, Tour ẩm thực…)."
          path={SAMPLE.theme}
          link="Xem 1 trang chủ đề"
        />
        <div className="relative isolate overflow-hidden rounded-2xl px-5 py-10 text-center text-white">
          <Pic src="/images/tours/v2/hoi-an-746921.jpg" sizes="900px" className="-z-10" />
          <span className="absolute inset-0 -z-10 bg-black/45" />
          <Txt
            f="themeSamples"
            dark
            className="text-xl font-extrabold tracking-wide uppercase drop-shadow-md sm:text-[1.7rem]"
          />
          <NameHint what="tên chủ đề" dark />
        </div>

        <div className="mt-6 flex flex-col items-center text-center">
          <Txt
            f="themeBrowse"
            className="text-lg font-semibold tracking-wide text-ink uppercase sm:text-xl"
          />
          <NameHint what="tên chủ đề" />
        </div>

        <Part title="Khi chủ đề chưa có tour nào" className="mt-6">
          <AdviceMock title="themeEmptyTitle" text="themeEmptyText" cta="themeEmptyCta" />
        </Part>

        <div className="mt-6 rounded-2xl bg-[#0d1114] px-4 py-6 text-center">
          <Txt
            f="themeOthers"
            dark
            className="text-lg font-bold tracking-wide text-amber-brand uppercase"
          />
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={cn(
                  "relative block h-20 bg-white/10",
                  i > 2 && "max-sm:hidden",
                  i === 0 && "ring-2 ring-amber-brand ring-inset",
                )}
              >
                {i === 0 && (
                  <Star className="absolute top-2 left-1/2 size-3.5 -translate-x-1/2 fill-amber-brand text-amber-brand" />
                )}
              </span>
            ))}
          </div>
        </div>
      </Sec>

      {/* ========== Trang điểm đến ========== */}
      <Sec name="Trang điểm đến" className="bg-surface">
        <Where
          text="Hiện trên mọi trang miền và trang điểm đến (vd. Miền Bắc, Hạ Long, Hội An…)."
          path={SAMPLE.region}
          link="Xem trang Miền Bắc"
        />
        <div className="relative isolate overflow-hidden rounded-2xl px-5 py-9 text-white">
          <Pic src="/images/tours/hd/du-lich-tay-bac.jpg" sizes="900px" className="-z-10" />
          <span className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/85 via-brand-950/55 to-transparent" />
          <p className="mb-2 flex items-center gap-1 text-[11px] text-white/75">
            Vietlook <ChevronRight className="size-3" /> …
          </p>
          <div className="flex flex-col items-start">
            <Txt
              f="destRegionTours"
              dark
              className="text-2xl font-extrabold tracking-tight drop-shadow-md sm:text-[2rem]"
            />
            <NameHint what="tên miền (trang điểm đến lẻ dùng “Tour + tên điểm đến”)" dark />
            <p className="mt-2 max-w-md text-[12.5px] text-white/80">
              Lời giới thiệu miền: sửa ở thẻ “Tất cả điểm đến”.
            </p>
            <span className="mt-4 inline-flex h-9 items-center rounded-full bg-white px-4 text-xs font-semibold text-brand-700">
              <Txt f="destViewTours" />
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-white px-5 py-4 text-center shadow-sm ring-1 ring-border">
          <Txt
            f="destBestTours"
            className="text-lg font-extrabold tracking-tight text-ink sm:text-[1.4rem]"
          />
          <NameHint what="tên điểm đến" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 opacity-70 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn(i > 1 && "max-md:hidden")}>
              <CardMock />
            </div>
          ))}
        </div>

        <Part title="Hộp tư vấn dưới danh sách tour" className="mt-5">
          <AdviceMock title="adviceTitle" text="adviceText" cta="adviceCta" />
          <p className="mt-1.5 text-[10.5px] text-slate-400">
            Trang Tất cả tour, du thuyền và Gói tour có hộp tư vấn riêng (sửa ở thẻ của từng trang).
          </p>
        </Part>

        <div className="mt-7 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center text-center">
            <Txt f="destPlaces" className="text-lg font-bold tracking-tight text-ink" />
            <NameHint what="tên miền" />
            <span className="mt-2 block h-[3px] w-10 rounded-full bg-clay-500" />
          </div>
          <div className="flex flex-col items-center text-center">
            <Txt f="destGuide" className="text-lg font-bold tracking-tight text-ink" />
            <NameHint what="tên điểm đến" />
            <span className="mt-2 block h-[3px] w-10 rounded-full bg-clay-500" />
          </div>
        </div>
      </Sec>

      {/* ========== Bài viết cẩm nang ========== */}
      <Sec name="Bài viết cẩm nang" className="bg-white">
        <Where
          text="Hiện trên mọi bài viết của Cẩm nang du lịch."
          path={SAMPLE.guide}
          link="Mở Cẩm nang, chọn 1 bài"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 space-y-4">
            <div className="rounded-xl border border-border">
              <p className="flex items-center gap-2 px-4 py-3 font-semibold text-ink">
                <ListOrdered className="size-4 shrink-0 text-brand-500" />
                <Txt f="guideToc" className="text-sm" />
              </p>
              <div className="space-y-1.5 border-t border-border px-8 py-3">
                <span className="block h-2 w-2/3 rounded bg-brand-100" />
                <span className="block h-2 w-1/2 rounded bg-brand-100" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-ink bg-[#fffbe6] p-4 sm:flex-row">
              <Image
                src="/images/logo/vietlook-icon.png"
                alt=""
                width={48}
                height={48}
                className="size-12"
              />
              <div className="flex min-w-0 flex-1 flex-col items-center sm:items-start">
                <Txt f="guideEbookTitle" className="text-base font-bold text-brand-700" />
                <Txt f="guideEbookText" className="text-[13px] text-muted" />
              </div>
              <span className="inline-flex h-10 shrink-0 items-center rounded-md bg-sun-500 px-4 text-sm font-semibold text-white">
                <Txt f="guideEbookButton" dark />
              </span>
            </div>

            <div className="space-y-1.5 px-1 opacity-70">
              <span className="block h-2 w-full rounded bg-slate-200" />
              <span className="block h-2 w-11/12 rounded bg-slate-200" />
              <span className="block h-2 w-4/5 rounded bg-slate-200" />
            </div>

            <div className="flex gap-4 rounded-2xl bg-surface p-4">
              <span className="size-12 shrink-0 rounded-full bg-white ring-1 ring-border" />
              <div className="flex min-w-0 flex-col items-start">
                <Txt
                  f="guideAboutAuthor"
                  className="text-[11px] font-bold tracking-wider text-sun-500 uppercase"
                />
                <span className="mt-1.5 block h-2.5 w-32 rounded bg-slate-300" />
                <span className="mt-1.5 block h-2 w-48 max-w-full rounded bg-slate-200" />
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <Txt f="guideSidebarTitle" className="text-lg font-semibold text-ink" />
            <div className="rounded-2xl bg-surface p-4">
              <span className="block h-2.5 w-24 rounded bg-slate-300" />
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="block h-2 w-3/4 rounded bg-slate-200" />
                ))}
              </div>
              <p className="mt-3 border-t border-border pt-2 text-[13px] font-medium text-ink">
                <Txt f="destRegionTours" />
              </p>
              <p className="mt-1 text-[10.5px] text-slate-400">
                Dùng chung chữ “Tiêu đề trang miền” ở khối Trang điểm đến.
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-7 grid gap-6 rounded-2xl bg-brand-50 p-5 md:grid-cols-2">
          <div className="flex flex-col items-center text-center">
            <Txt f="guideRelatedTours" className="text-lg font-bold tracking-tight text-ink" />
            <span className="mt-2 block h-[3px] w-10 rounded-full bg-clay-500" />
          </div>
          <div className="flex flex-col items-center text-center">
            <Txt f="guideRelated" className="text-lg font-bold tracking-tight text-ink" />
            <span className="mt-2 block h-[3px] w-10 rounded-full bg-clay-500" />
          </div>
        </div>
      </Sec>

      {/* ========== Trang tour ========== */}
      <Sec name="Trang tour" className="bg-surface">
        <Where
          text="Hiện trên mọi trang tour. Nội dung tour (lịch trình, giá, ảnh…) sửa ở mục Tour."
          path={SAMPLE.tours}
          link="Mở danh sách tour, chọn 1 tour"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <Part title="Dòng dưới thông tin chính của tour">
              <p className="flex items-center gap-3 rounded-xl bg-brand-50/70 px-4 py-2.5 text-sm ring-1 ring-brand-100">
                <span className="flex shrink-0 items-center gap-1 text-brand-600" aria-hidden>
                  <Accessibility className="size-5" />
                  <Ear className="size-4" />
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 leading-snug">
                  <Txt f="tourAccessBadge" className="font-semibold text-ink" />
                  <span className="inline-flex items-center gap-1 font-semibold text-brand-600">
                    <Txt f="tourAccessCta" /> →
                  </span>
                </span>
              </p>
            </Part>
            <Part title="Dưới nút đặt tour (đầu trang)">
              <p className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm text-muted ring-1 ring-border">
                <WhatsAppIcon className="size-4 shrink-0 text-[#25d366]" />
                <WeChatIcon className="size-4 shrink-0 text-[#07c160]" />
                <Txt f="tourAskTitle" />
              </p>
            </Part>
            <Part title="Cuối trang tour">
              <div className="rounded-2xl bg-white px-4 py-5 text-center ring-1 ring-border">
                <Txt f="tourRelated" className="text-lg font-bold tracking-tight text-ink" />
                <span className="mx-auto mt-2 block h-[3px] w-10 rounded-full bg-clay-500" />
                <div className="mt-4 grid grid-cols-2 gap-3 opacity-70 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={cn(i > 1 && "max-sm:hidden")}>
                      <CardMock tall />
                    </div>
                  ))}
                </div>
              </div>
            </Part>
          </div>

          <Part title="Ô liên hệ trực tiếp (cột phải)">
            <div className="rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-border">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <MessagesSquare className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col items-start">
                  <Txt f="tourAskTitle" className="leading-snug font-bold text-ink" />
                  <Txt f="tourContactText" className="mt-0.5 text-sm leading-snug text-muted" />
                </div>
              </div>
              <div className="mt-3.5 flex items-center gap-3 rounded-xl bg-sun-50 px-4 py-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sun-500 text-white">
                  <Phone className="size-4" />
                </span>
                <span className="font-bold text-ink tabular-nums">
                  {siteConfig.contact.hotline}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm font-semibold text-ink">
                {[
                  [WhatsAppIcon, "WhatsApp", "size-5 text-[#25d366]"],
                  [ZaloIcon, "Zalo", "size-6"],
                  [WeChatIcon, "WeChat", "size-5 text-[#07c160]"],
                  [LineIcon, "LINE", "size-6"],
                ].map(([Icon, name, cls]) => (
                  <span
                    key={name}
                    className="flex h-9 items-center gap-2 rounded-lg px-3 ring-1 ring-border"
                  >
                    <Icon className={cls} />
                    {name}
                  </span>
                ))}
              </div>
              <p className="mt-2.5 flex items-center gap-2 text-sm font-medium text-brand-700">
                <Mail className="size-4 shrink-0" />
                <span className="truncate">{siteConfig.contact.email}</span>
              </p>
              <p className="mt-1 text-[10.5px] text-slate-400">
                Nhãn nút email (đọc cho người khiếm thị): <Txt f="tourContactEmail" />
              </p>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 border-t border-border pt-2.5 font-hand text-[1.05rem] leading-snug text-clay-600">
                <Txt f="tourContactSignoff" /> <Txt f="tourContactTeam" />
              </p>
              <p className="mt-2 text-[10.5px] text-slate-400">
                Số hotline, email: sửa ở Cài đặt → Thông tin liên hệ.
              </p>
            </div>
          </Part>
        </div>
      </Sec>
    </>
  );
}
