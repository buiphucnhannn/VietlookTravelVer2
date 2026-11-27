"use client";

import { CheckCircle2, Clock, Copy } from "lucide-react";
import { Container } from "@/components/ui";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { Txt } from "../blocks";
import { Auto, SitePage, Zone, useDict } from "./site-frame";

/**
 * Bản xem trước Trang cảm ơn — dựng y như app/[lang]/thank-you/page.js (header nền trắng như trang thật).
 * Mã yêu cầu: website tự điền mã của lượt gửi (ở đây hiện mã mẫu).
 */
export default function ThankYouPreview({ lang }) {
  const dict = useDict(lang);
  return (
    <SitePage lang={lang} path="/thank-you">
      <Zone name="Lời cảm ơn" at="left-3 top-20 lg:top-[7.5rem]">
        {/* trang không có ảnh đầu trang: website chừa chỗ cho header nền trắng */}
        <div aria-hidden className="h-16 lg:h-[108px]" />
        <section className="flex min-h-[calc(100svh-4rem)] items-center bg-cream-50 py-8 lg:min-h-[calc(100svh-6.75rem)] short:py-4">
          <Container className="max-w-3xl text-center">
            <CheckCircle2
              className="mx-auto size-14 text-forest-700 short:size-12"
              strokeWidth={1.5}
            />
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-forest-900 sm:text-[2.6rem] sm:leading-tight lg:[text-wrap:nowrap] short:mt-4 short:text-[2.2rem]">
              <Txt f="title" />
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed whitespace-pre-line text-ink/75 sm:text-lg short:mt-4">
              <Txt f="text" />
            </p>
            <Auto
              label="Mã tự điền theo lượt gửi"
              at="bottom-0 left-1/2 translate-y-[130%] -translate-x-1/2"
            >
              <div className="mx-auto mt-8 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 rounded-2xl border border-dashed border-sand-300 bg-cream-50 px-4 py-2.5 sm:flex-nowrap sm:gap-x-3 sm:px-5">
                <span className="basis-full text-sm text-muted sm:basis-auto">
                  {dict?.common.yourRequestCode}:
                </span>
                <span className="font-mono text-base font-bold tracking-wider whitespace-nowrap text-forest-700 sm:text-lg">
                  VL-123456
                </span>
                <span className="grid size-9 place-items-center rounded-lg text-clay-600">
                  <Copy className="size-4" />
                </span>
              </div>
            </Auto>
            <p className="mx-auto mt-8 max-w-lg text-sm leading-relaxed text-ink/70 short:mt-6">
              <Clock className="mr-1.5 inline size-4 -translate-y-px text-clay-600" />
              <span>
                <Txt f="step1" /> <Txt f="step2" />
              </span>
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4 short:mt-7">
              <span className="inline-flex h-12 items-center gap-2 rounded-full bg-[#25d366] px-6 font-semibold text-white">
                <WhatsAppIcon className="size-5" /> <Txt f="whatsapp" dark />
              </span>
              <span className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-forest-700 ring-1 ring-forest-700">
                <Txt f="browse" />
              </span>
            </div>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
