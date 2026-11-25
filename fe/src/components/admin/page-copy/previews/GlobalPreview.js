"use client";

import Image from "next/image";
import { ChevronDown, Handshake, Mail, MapPin, Menu, Phone } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { regions } from "@/data/regions";
import { tr } from "@/i18n/config";
import {
  FacebookIcon,
  GoogleMapsIcon,
  TripAdvisorIcon,
  WeChatIcon,
  WhatsAppIcon,
  ZaloIcon,
} from "@/components/ui/BrandIcons";
import { cn } from "@/lib/utils";
import { BgPhoto, ImagePill, ModuleNote, Sec, TONES, Txt, useCopyField } from "../blocks";
import { Pic } from "../../home/shared";
import { CONTACT_SETTINGS_HREF, useContactInfo, useSiteDict } from "./site-shared";

/**
 * Bản xem trước "Đầu & chân trang" (components/layout/Header.js + Footer.js) — đúng màu, bố cục trang thật.
 * Sửa được: dòng giới thiệu thanh trên cùng, chữ link B2B, nút lên kế hoạch, dải "biết đến chúng tôi qua",
 * dải mời lên kế hoạch (ảnh + chữ + nút), tiêu đề 4 cột, câu bản quyền, chữ trước logo thanh toán.
 * Chỉ xem: số điện thoại, email, địa chỉ, WeChat, mạng xã hội (CMS → Cài đặt → Thông tin liên hệ);
 * tên các mục menu & link (cấu trúc điều hướng, giữ cố định).
 */

// Tên menu chính (data/navigation.js) — chỉ để xem
const MENU = {
  en: ["Tours & Packages", "Private Car", "Visa & Fast-track", "B2B Partners"],
  zh: ["线路与套餐", "包车服务", "签证与快速通关", "B2B合作"],
  vi: ["Tour & Gói du lịch", "Thuê xe riêng", "Visa & Fast-track sân bay", "Đối tác B2B"],
};
const LANG_SHORT = { en: "EN", zh: "中文", vi: "VI" };
const SETTINGS = `${ADMIN_BASE}${CONTACT_SETTINGS_HREF}`;

function LogoMark({ small }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-white shadow-[0_6px_18px_-6px_rgba(0,0,0,0.45)] ring-2 ring-amber-brand/70",
          small ? "size-9" : "size-11",
        )}
      >
        <Image
          src="/images/logo/vietlook-icon.png"
          alt=""
          width={210}
          height={210}
          sizes="40px"
          className={small ? "w-6" : "w-8"}
        />
      </span>
      <Image
        src="/images/logo/vietlook-wordmark.png"
        alt="Vietlook Travel"
        width={527}
        height={59}
        sizes="160px"
        className={small ? "w-28" : "w-32 sm:w-36"}
      />
    </span>
  );
}

/** Ảnh nhỏ nghiêng trong dải mời lên kế hoạch */
function TiltPhoto() {
  const fld = useCopyField("ctaPhoto");
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="relative h-24 w-36 rotate-[-4deg] overflow-hidden rounded-xl shadow-2xl ring-4 ring-white sm:h-28 sm:w-44">
        <Pic src={fld.value || fld.def} sizes="176px" />
      </div>
      <ImagePill f="ctaPhoto" floating={false} title="Ảnh nhỏ" />
    </div>
  );
}

const colTitle =
  "relative mb-3.5 pb-2 text-[13px] font-bold tracking-wide text-brand-700 uppercase after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-7 after:rounded-full after:bg-sun-500";

export default function GlobalPreview({ lang }) {
  const info = useContactInfo();
  const dict = useSiteDict(lang);
  const n = dict?.nav ?? {};
  const { contact, social, messaging } = info;

  const columns = [
    {
      f: "colAbout",
      links: [
        ...regions.map((r) => tr(r.name, lang)),
        n.guideMonths,
        n.guideEssentials,
        n.guideAll,
      ],
    },
    {
      f: "colServices",
      links: [n.allPackages, n.groupTours, n.halong, n.carHire, n.visa, n.partners],
    },
    { f: "colCompany", links: [n.aboutCompany, n.reviews, n.contact, n.whyUs] },
  ];

  return (
    <>
      {/* ========== Đầu trang ========== */}
      <Sec name="Đầu trang (mọi trang)" className="bg-slate-200/70 px-0! pb-0! sm:px-0!" wide>
        <div className="overflow-hidden shadow-[0_6px_24px_-14px_rgba(15,62,95,0.35)]">
          {/* Thanh trên cùng — máy tính */}
          <div className="bg-brand-950 text-[0.75rem] text-white/85">
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 px-4 py-2 sm:px-6">
              <Txt f="topTagline" dark className="font-medium tracking-wide" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <Phone className="size-3.5" /> {contact.hotline}
                </span>
                <span className="hidden items-center gap-1.5 whitespace-nowrap lg:flex">
                  <Mail className="size-3.5" /> {contact.email}
                </span>
                <span className="h-4 w-px bg-white/20" />
                <span className="flex items-center gap-1.5 font-semibold text-amber-brand">
                  <Handshake className="size-3.5 shrink-0" />
                  <Txt f="partnersLabel" dark />
                </span>
                <span className="rounded-full bg-sun-500 px-3 py-0.5 font-semibold text-white">
                  <Txt f="planTrip" dark />
                </span>
                <span className="font-semibold">{LANG_SHORT[lang]}</span>
              </div>
            </div>
          </div>
          {/* Thanh chính */}
          <div className="flex items-center justify-between gap-4 bg-white px-4 py-3 sm:px-6">
            <LogoMark />
            <nav className="hidden flex-1 items-center justify-end gap-5 lg:flex">
              {[...MENU[lang], n.guide, n.about].map((label, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-[0.82rem] font-semibold whitespace-nowrap text-ink"
                >
                  {label}
                  {i < 5 && <ChevronDown className="size-3.5 opacity-75" />}
                </span>
              ))}
            </nav>
            <Menu className="size-6 text-ink lg:hidden" />
          </div>
        </div>
        <p className="px-4 py-2.5 text-center text-[11px] text-slate-500 sm:px-6">
          Tên các mục menu giữ cố định (cấu trúc điều hướng của website). Số điện thoại, email:{" "}
          <a href={SETTINGS} className="font-semibold text-brand-700 underline">
            Cài đặt → Thông tin liên hệ
          </a>
          .
        </p>
      </Sec>

      {/* ========== Dải "biết đến chúng tôi qua" ========== */}
      <Sec name="Chân trang — biết đến chúng tôi qua" dark className="bg-forest-700 text-white">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-base font-semibold">
            <Txt f="knowUs" dark />:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              {
                icon: TripAdvisorIcon,
                label: "Tripadvisor",
                sub: "★ 5.0",
                cls: "size-5 text-[#00af87]",
              },
              { icon: GoogleMapsIcon, label: "Google Maps", sub: "★ 4.7", cls: "size-4" },
              {
                icon: FacebookIcon,
                label: "Facebook",
                sub: social.facebookHandle,
                cls: "size-4 text-[#1877f2]",
              },
            ].map((s) => (
              <span
                key={s.label}
                className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15"
              >
                <span className="grid size-8 place-items-center rounded-full bg-white">
                  <s.icon className={s.cls} />
                </span>
                <span className="text-sm leading-tight">
                  <span className="block font-semibold">{s.label}</span>
                  <span className="block text-[11px] text-white/70">{s.sub}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </Sec>

      {/* ========== Dải mời lên kế hoạch ========== */}
      <Sec name="Chân trang — mời lên kế hoạch" dark className="bg-[#2b3640] text-white">
        <BgPhoto f="ctaImage" fade={TONES.night} title="Ảnh nền dải" />
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr_auto]">
          <div className="hidden md:block">
            <TiltPhoto />
          </div>
          <div className="flex flex-col items-start">
            <Txt f="ctaTitle" dark className="text-xl font-extrabold tracking-tight sm:text-2xl" />
            <Txt f="ctaText" dark className="mt-1.5 text-sm text-white/75" />
          </div>
          <span className="inline-flex h-11 items-center justify-center self-start rounded-md bg-clay-500 px-6 text-sm font-semibold text-white shadow-sm md:self-center">
            <Txt f="ctaButton" dark />
          </span>
        </div>
      </Sec>

      {/* ========== Chân trang chính ========== */}
      <Sec
        name="Chân trang — các cột"
        className="bg-[linear-gradient(115deg,#fffaf1_0%,#fbf7f0_38%,#eaf5fc_100%)] text-ink/75"
        wide
      >
        <div className="flex flex-col items-start justify-between gap-4 border-b border-brand-200/60 pb-4 sm:flex-row sm:items-center">
          <LogoMark small />
          <div className="flex items-center gap-2">
            {[
              <FacebookIcon key="f" className="size-5 text-[#0866FF]" />,
              <span key="t" className="grid size-6 place-items-center rounded-full bg-[#34E0A1]">
                <TripAdvisorIcon className="size-4 text-black" />
              </span>,
              <GoogleMapsIcon key="g" className="size-5" />,
              <WhatsAppIcon key="w" className="size-5 text-[#25D366]" />,
              <ZaloIcon key="z" className="size-6" />,
            ].map((icon, i) => (
              <span
                key={i}
                className="grid size-9 place-items-center rounded-full bg-white shadow-sm ring-1 ring-brand-100"
              >
                {icon}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-7 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.f}>
              <div className={colTitle}>
                <Txt f={col.f} />
              </div>
              <ul className="space-y-2 text-[13px] leading-snug text-ink/60">
                {col.links.filter(Boolean).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className={colTitle}>
              <Txt f="colContact" />
            </div>
            <ul className="space-y-3 text-[12.5px] leading-relaxed">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-sun-500" />
                <span>{tr(contact.address, lang)}</span>
              </li>
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-sun-500" />
                <span>
                  {contact.phones.map((ph, i) => (
                    <span key={ph.raw} className={cn("block", i > 0 && "mt-1.5")}>
                      <span className="font-semibold text-ink">{ph.number}</span>
                      <span className="block text-[11px] text-muted">{tr(ph.channels, lang)}</span>
                    </span>
                  ))}
                </span>
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-sun-500" />
                <span className="break-all">{contact.email}</span>
              </li>
              <li className="flex gap-2.5">
                <WeChatIcon className="mt-0.5 size-4 shrink-0 text-sun-500" />
                <span>
                  {lang === "zh" ? "微信号" : "WeChat ID"}: {messaging.wechatId}
                </span>
              </li>
            </ul>
          </div>
        </div>
        <ModuleNote
          className="mt-6"
          title="Địa chỉ, số điện thoại, email, WeChat, link mạng xã hội"
          text="Là thông tin chung của cả website (đầu trang, trang Liên hệ, nút chat, email gửi khách) — sửa một lần ở Cài đặt. Tên các link trong cột giữ cố định theo menu."
          href={SETTINGS}
          linkText="Mở Cài đặt → Thông tin liên hệ"
        />
      </Sec>

      {/* ========== Dải dưới cùng ========== */}
      <Sec name="Chân trang — dòng cuối" className="bg-brand-100 text-ink/70" wide>
        <div className="flex flex-col items-center gap-3 border-b border-brand-200 pb-3 md:flex-row md:justify-between">
          <span className="text-center text-[12.5px] text-ink/55">
            {[n.termsPolicy, n.privacyPolicy, n.paymentPolicy, n.cancelPolicy]
              .filter(Boolean)
              .join("  ·  ")}
          </span>
          <span className="flex items-center gap-2 text-xs">
            <span>
              <Txt f="payments" />:
            </span>
            <span className="flex h-9 items-center rounded-lg bg-white px-2.5 shadow-sm ring-1 ring-brand-200">
              <Image
                src="/images/logo/9pay.svg"
                alt="9Pay"
                width={179}
                height={72}
                className="h-6 w-auto"
              />
            </span>
          </span>
        </div>
        <p className="pt-3 text-center text-xs text-muted">
          © 2009–2026 {info.legalName}. <Txt f="rights" /> · {dict?.footer?.businessNo}:{" "}
          {info.legal.businessNo} · {dict?.footer?.licenceNo}: {info.legal.licenceNo}
        </p>
      </Sec>
    </>
  );
}
