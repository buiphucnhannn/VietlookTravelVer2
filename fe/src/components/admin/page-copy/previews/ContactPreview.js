"use client";

import { ChevronRight, Clock, Copy, Info, Mail, MapPin, Phone, Send } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { tr } from "@/i18n/config";
import {
  FacebookIcon,
  LineIcon,
  WeChatIcon,
  WhatsAppIcon,
  ZaloIcon,
} from "@/components/ui/BrandIcons";
import { cn } from "@/lib/utils";
import { BgPhoto, Sec, TONES, Txt } from "../blocks";
import Link from "../../Link";
import BrushHeroPreview from "./BrushHeroPreview";
import { CONTACT_SETTINGS_HREF, useContactInfo } from "./site-shared";

/**
 * Bản xem trước trang Liên hệ (app/[lang]/contact/page.js) — thu nhỏ, đúng thứ tự trang thật.
 * Số điện thoại, WhatsApp, WeChat, LINE, Zalo, Facebook, email, địa chỉ, giờ mở cửa, bản đồ: thông tin chung
 * của website (CMS → Cài đặt → Thông tin liên hệ, dùng cả ở chân trang & nút chat) → chỉ hiện để xem ở đây.
 * Chủ đề trong form giữ cố định (email & CMS dịch chủ đề theo câu gốc).
 */

/** Link sang nơi sửa thông tin liên hệ */
function SettingsLink() {
  return (
    <Link
      href={`${ADMIN_BASE}${CONTACT_SETTINGS_HREF}`}
      className="font-semibold text-brand-700 underline underline-offset-2"
    >
      Cài đặt → Thông tin liên hệ
    </Link>
  );
}

/** Ghi chú nhỏ: phần chỉ xem */
function FixedNote({ children, className }) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-slate-500",
        className,
      )}
    >
      <Info className="mt-px size-3.5 shrink-0 text-brand-600" />
      <span>{children}</span>
    </p>
  );
}

export default function ContactPreview({ lang }) {
  const info = useContactInfo();
  const { contact, messaging, social } = info;
  const lineValues = [messaging.lineId, ...messaging.linePhones].filter(Boolean);
  const channels = [
    ...contact.phones
      .filter((ph) => ph.whatsapp)
      .map((ph) => ({
        icon: WhatsAppIcon,
        color: "text-[#25d366]",
        title: ph.number,
        sub: "WhatsApp",
        go: 1,
      })),
    {
      icon: WeChatIcon,
      color: "text-[#07c160]",
      title: messaging.wechatId,
      sub: lang === "zh" ? "微信号" : "WeChat ID",
      copy: 1,
    },
    lineValues.length > 0 && { icon: LineIcon, title: lineValues.join(" · "), sub: "LINE" },
    messaging.zalo && {
      icon: ZaloIcon,
      title: contact.phones.find((ph) => ph.zalo)?.number,
      sub: "Zalo",
      go: 1,
    },
    {
      icon: FacebookIcon,
      color: "text-[#1877f2]",
      title: "Facebook",
      sub: social.facebookHandle,
      go: 1,
    },
  ].filter(Boolean);

  return (
    <>
      {/* ========== Đầu trang ========== */}
      <BrushHeroPreview images="heroImages" title="heroTitle" subtitle="heroSubtitle" />

      {/* ========== Form gửi tin nhắn + liên hệ trực tiếp ========== */}
      <Sec name="Gửi tin nhắn & liên hệ trực tiếp" className="bg-[#e6f4ef]">
        <BgPhoto f="formImage" fade={TONES.mist} />
        <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="flex flex-col items-center rounded-2xl bg-white p-4 text-center shadow-sm sm:p-5">
              <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-600">
                <Mail className="size-4" />
              </span>
              <Txt f="formTitle" className="mt-3 text-lg font-bold text-ink sm:text-xl" />
              <Txt f="formText" className="mt-1.5 text-xs text-muted sm:text-[13px]" />
              <div className="mt-4 grid w-full gap-2 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "block h-7 rounded-lg bg-slate-100 ring-1 ring-slate-200/70",
                      i === 0 && "sm:col-span-2",
                    )}
                  />
                ))}
                <span className="block h-14 rounded-lg bg-slate-100 ring-1 ring-slate-200/70 sm:col-span-2" />
                <span className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand-600/85 text-[11px] font-semibold text-white sm:col-span-2">
                  <Send className="size-3.5" />
                </span>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Các ô nhập và chủ đề trong form giữ nguyên như trên website
              </p>
            </div>
            {/* Màn hình sau khi khách gửi form */}
            <div className="flex flex-col items-center rounded-2xl bg-white/90 p-4 text-center ring-1 ring-emerald-200">
              <span className="mb-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Khách thấy sau khi gửi form
              </span>
              <Txt f="successTitle" className="text-[15px] font-bold text-ink" />
              <Txt f="successText" className="mt-1 text-xs text-muted" />
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2">
            <Txt f="directTitle" className="text-lg font-bold text-ink sm:text-xl" />
            <Txt f="directText" className="pb-1 text-xs text-ink/80 sm:text-[13px]" />
            {channels.map((ch, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-border"
              >
                <ch.icon className={cn("size-5 shrink-0", ch.color)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-ink">{ch.title}</span>
                  <span className="text-[11px] text-muted">{ch.sub}</span>
                </span>
                {ch.go && <ChevronRight className="size-4 text-muted" />}
                {ch.copy && <Copy className="size-3.5 text-muted" />}
              </div>
            ))}
            <FixedNote>
              Số điện thoại, WeChat, LINE, Zalo, Facebook là thông tin chung của website (dùng cả ở
              chân trang và nút chat) — sửa ở <SettingsLink />.
            </FixedNote>
            <div className="flex flex-col items-start rounded-xl border border-brand-200 bg-brand-50 p-4">
              <Txt f="noteText" className="text-[13px] font-semibold text-brand-700" />
              <span className="mt-2 flex items-center gap-1 text-xs text-muted">
                — <Txt f="noteSign" />
              </span>
            </div>
          </div>
        </div>
      </Sec>

      {/* ========== Văn phòng & bản đồ ========== */}
      <Sec name="Văn phòng & bản đồ" className="bg-white">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col items-start gap-3">
            <Txt f="officeTitle" className="text-xl font-bold text-ink sm:text-2xl" />
            <p className="text-sm font-semibold text-brand-700">{info.legalName}</p>
            <ul className="space-y-2.5 text-xs text-ink/85">
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-sun-500" />
                {tr(contact.address, lang)}
              </li>
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-sun-500" />
                <span className="space-y-1">
                  {contact.phones.map((ph) => (
                    <span key={ph.raw} className="block">
                      <span className="block font-semibold">{ph.number}</span>
                      <span className="block text-[11px] text-muted">{tr(ph.channels, lang)}</span>
                    </span>
                  ))}
                </span>
              </li>
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-sun-500" />
                {contact.email}
              </li>
              <li className="flex gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-sun-500" />
                {tr(contact.hours, lang)}
              </li>
            </ul>
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600">
              <Txt f="findUs" />
              <ChevronRight className="size-3.5 shrink-0" />
            </span>
            <FixedNote>
              Tên công ty, địa chỉ, số điện thoại, email, giờ mở cửa và bản đồ là thông tin chung
              của website — sửa ở <SettingsLink />.
            </FixedNote>
          </div>
          <div className="relative grid min-h-[220px] place-items-center overflow-hidden rounded-2xl bg-[#e8eef2] ring-1 ring-border">
            <span
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[size:28px_28px]"
            />
            <span className="relative flex flex-col items-center gap-1.5 text-center text-xs font-semibold text-slate-500">
              <MapPin className="size-7 text-sun-500" />
              Bản đồ Google Maps
              <span className="text-[11px] font-normal text-slate-400">
                Hiện tự động đúng vị trí văn phòng
              </span>
            </span>
          </div>
        </div>
      </Sec>
    </>
  );
}
