import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { Container, SectionHeading } from "@/components/ui";
import TripPlannerForm from "@/components/forms/TripPlannerForm";
import SpinBadge from "@/components/ui/SpinBadge";
import YouTubeLite from "@/components/ui/YouTubeLite";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { lp } from "@/i18n/config";

/** Form lên kế hoạch chuyến đi trên trang chủ. */
export function PlannerBlock({ lang, dict, destinationOptions }) {
  const t = dict.home;
  return (
    <section className="relative isolate overflow-clip py-14 lg:py-[4.5rem]" id="plan">
      <Image
        src="/images/tours/v2/ninh-binh-c42.jpg"
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-forest-900/95 via-forest-900/85 to-forest-900/60" />
      <Container className="grid items-start gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="text-white lg:sticky lg:top-36">
          <SectionHeading title={t.plannerTitle} subtitle={t.plannerSubtitle} align="left" light />
          <div className="space-y-3">
            <a
              href={siteConfig.messaging.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 hover:bg-white/15"
            >
              <WhatsAppIcon className="size-6 text-[#25d366]" />
              <span>
                <span className="block text-xs text-white/70">WhatsApp · WeChat · Zalo</span>
                <span className="font-semibold">{siteConfig.contact.hotline}</span>
              </span>
            </a>
            <a
              href={`tel:${siteConfig.contact.hotline2Raw}`}
              className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 hover:bg-white/15"
            >
              <Phone className="size-6 text-amber-brand" />
              <span className="font-semibold">{siteConfig.contact.hotline2}</span>
            </a>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 hover:bg-white/15"
            >
              <Mail className="size-6 text-amber-brand" />
              <span className="font-semibold break-all">{siteConfig.contact.email}</span>
            </a>
          </div>
        </div>
        <TripPlannerForm
          lang={lang}
          t={{ ...dict.planner, ...dict.tour }}
          c={dict.common}
          destinationOptions={destinationOptions}
        />
      </Container>
    </section>
  );
}

/** Khối "About us" kiểu localvietnam: ảnh blob + video giới thiệu. */
export function AboutBlob({ lang, dict }) {
  const t = dict.home;
  return (
    <section className="relative isolate overflow-hidden bg-surface py-14 lg:py-[4.5rem]">
      <BgImage src="/images/tours/v2/hanoi-33622716.jpg" tone="side" />
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="heading-xl text-ink">{t.aboutTitle}</h2>
          <p className="mt-4 text-lg font-medium text-forest-700">{t.aboutSubtitle}</p>
          <span className="mt-5 block h-[3px] w-16 rounded-full bg-forest-700" />
          <p className="mt-6 text-lg leading-relaxed text-ink/80">{t.aboutText}</p>
          <Link
            href={`${lp(lang)}/about`}
            className="mt-7 inline-block text-lg font-medium text-forest-700 underline underline-offset-4 hover:text-sun-500"
          >
            {t.aboutCta}
          </Link>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <SpinBadge className="absolute top-[8%] right-0 z-10 sm:right-2" />
          <div className="blob relative aspect-square overflow-hidden shadow-2xl">
            <Image
              src="/images/tours/v2/vietnam-12674100.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-6 left-0 w-[62%] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white sm:-left-10">
            <YouTubeLite
              id={siteConfig.youtubeIds[0]}
              title="Discovering the timeless beauty with Vietlook Travel"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
