"use client";

import { Fragment } from "react";
import { ChevronRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { tr } from "@/i18n/config";
import { phoneDigits } from "@/lib/contact.mjs";
import CopyButton from "@/components/ui/CopyButton";
import { Container } from "@/components/ui";
import ContactForm from "@/components/forms/ContactForm";
import {
  FacebookIcon,
  LineIcon,
  WeChatIcon,
  WhatsAppIcon,
  ZaloIcon,
} from "@/components/ui/BrandIcons";
import { BgEdit, Txt } from "../blocks";
import BrushHeroPreview from "./BrushHeroPreview";
import { CONTACT_SETTINGS_HREF } from "./site-shared";
import { Auto, Loading, SitePage, FormStates, Zone, useDict, useSiteInfo } from "./site-frame";

/**
 * Bản xem trước trang Liên hệ — dựng y như app/[lang]/contact/page.js.
 * Số điện thoại, email, WeChat, địa chỉ, bản đồ: chỉ xem (CMS → Thông tin liên hệ).
 */

const SETTINGS = `${ADMIN_BASE}${CONTACT_SETTINGS_HREF}`;

export default function ContactPreview({ lang }) {
  const dict = useDict(lang);
  const { info, loaded } = useSiteInfo();
  const { contact, messaging, social, maps } = info;
  const t = dict && {
    ...dict.contact,
    formTitle: <Txt f="formTitle" />,
    formText: <Txt f="formText" />,
  };
  const c = dict && {
    ...dict.common,
    fullName: dict.tour.fullName,
    phone: dict.tour.phone,
    message: dict.contact.message,
  };
  const waPhones = contact.phones.filter((ph) => ph.whatsapp);
  const zaloPhone = contact.phones.find((ph) => ph.zalo);
  const lineValues = [messaging.lineId, ...messaging.linePhones].filter(Boolean);
  const channels = [
    ...waPhones.map((ph, i) => ({
      key: `wa${i + 1}`,
      icon: WhatsAppIcon,
      color: "text-[#25d366]",
      title: ph.number,
      sub: "WhatsApp",
      href: `https://wa.me/${phoneDigits(ph.number)}`,
    })),
    {
      key: "wechat",
      icon: WeChatIcon,
      color: "text-[#07c160]",
      title: messaging.wechatId,
      sub: lang === "zh" ? "微信号" : "WeChat ID",
      copy: messaging.wechatId,
    },
    lineValues.length > 0 && {
      key: "line",
      icon: LineIcon,
      color: "",
      title: lineValues.map((v, i) => (
        <Fragment key={v}>
          {i > 0 && " · "}
          <span className="whitespace-nowrap">{v}</span>
        </Fragment>
      )),
      sub: "LINE",
    },
    zaloPhone && {
      key: "zalo",
      icon: ZaloIcon,
      color: "",
      title: zaloPhone.number,
      sub: "Zalo",
      href: messaging.zalo,
    },
    {
      key: "facebook",
      icon: FacebookIcon,
      color: "text-[#1877f2]",
      title: "Facebook",
      sub: social.facebookHandle,
      href: social.facebook,
    },
  ].filter(Boolean);

  return (
    <SitePage lang={lang} path="/contact">
      <BrushHeroPreview images="heroImages" title="heroTitle" subtitle="heroSubtitle" />

      <Zone name="Gửi tin nhắn & liên hệ trực tiếp">
        <section className="relative isolate overflow-clip bg-[#e6f4ef] py-14 lg:py-[4.5rem]">
          <BgEdit f="formImage" tone="mist" />
          <Container>
            <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
                {dict ? (
                  <FormStates labels={c}>
                    <Auto live label="Các ô của form giữ nguyên như website" at="-bottom-3 right-0">
                      <ContactForm lang={lang} t={t} c={c} />
                    </Auto>
                  </FormStates>
                ) : (
                  <Loading className="min-h-[560px]" />
                )}
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-ink">
                  <Txt f="directTitle" />
                </h2>
                <p className="pb-2 whitespace-pre-line text-ink/80">
                  <Txt f="directText" />
                </p>
                <Auto
                  href={SETTINGS}
                  label="Số điện thoại & kênh chat · sửa ở Thông tin liên hệ"
                  at="-top-3 right-0"
                  className="space-y-3"
                >
                  {loaded &&
                    channels.map((ch) => (
                      <div
                        key={ch.key}
                        className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-border"
                      >
                        <ch.icon className={`size-7 ${ch.color}`} />
                        <span className="flex-1">
                          <span className="block font-semibold text-ink">{ch.title}</span>
                          <span className="text-sm text-muted">{ch.sub}</span>
                        </span>
                        {ch.href && <ChevronRight className="size-5 text-muted" />}
                        {ch.copy && (
                          <CopyButton
                            value={ch.copy}
                            label={dict?.common.copy}
                            copiedLabel={dict?.common.copied}
                          />
                        )}
                      </div>
                    ))}
                </Auto>
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
                  <p className="font-semibold whitespace-pre-line text-brand-700">
                    <Txt f="noteText" />
                  </p>
                  <p className="mt-3 text-sm text-muted">
                    — <Txt f="noteSign" />
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </Zone>

      <Zone name="Văn phòng & bản đồ">
        <section className="py-14 lg:py-[4.5rem]">
          <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-5">
              <h2 className="text-3xl font-bold text-ink">
                <Txt f="officeTitle" />
              </h2>
              <Auto
                href={SETTINGS}
                label="Tên công ty, địa chỉ, điện thoại · sửa ở Thông tin liên hệ"
                at="-top-4 right-0"
                className="space-y-5"
              >
                <p className="text-lg font-semibold text-brand-700">{info.legalName}</p>
                <ul className="space-y-4 text-ink/85">
                  <li className="flex gap-3">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-sun-500" />{" "}
                    {tr(contact.address, lang)}
                  </li>
                  <li className="flex gap-3">
                    <Phone className="mt-0.5 size-5 shrink-0 text-sun-500" />
                    <span className="space-y-2">
                      {contact.phones.map((ph) => (
                        <span key={ph.raw} className="block">
                          <span className="font-semibold">{ph.number}</span>
                          <span className="block text-sm text-muted">{tr(ph.channels, lang)}</span>
                        </span>
                      ))}
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Mail className="mt-0.5 size-5 shrink-0 text-sun-500" />
                    {contact.email}
                  </li>
                  <li className="flex gap-3">
                    <Clock className="mt-0.5 size-5 shrink-0 text-sun-500" />{" "}
                    {tr(contact.hours, lang)}
                  </li>
                </ul>
              </Auto>
              <span className="inline-flex items-center gap-2 font-semibold text-brand-600">
                <Txt f="findUs" /> <ChevronRight className="size-4" />
              </span>
            </div>
            <Auto
              href={SETTINGS}
              label="Bản đồ · sửa ở Thông tin liên hệ"
              at="top-3 right-3"
              className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-border"
            >
              {loaded ? (
                <iframe
                  title="Vietlook Travel – Google Maps"
                  src={
                    lang === "zh"
                      ? maps.embed.replace("hl=en", "hl=zh-CN")
                      : lang === "vi"
                        ? maps.embed.replace("hl=en", "hl=vi")
                        : maps.embed
                  }
                  loading="lazy"
                  className="block h-[420px] w-full"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="h-[420px] bg-surface" />
              )}
            </Auto>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
