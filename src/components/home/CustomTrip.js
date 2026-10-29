import Image from "next/image";
import SpinBadge from "@/components/ui/SpinBadge";
import BgImage from "@/components/ui/BgImage";
import { BadgeDollarSign, Hotel, Layers, MessageCircle, SlidersHorizontal } from "lucide-react";
import { Button, Container, Reveal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { lp } from "@/i18n/config";

const icons = [Hotel, MessageCircle, SlidersHorizontal, Layers, BadgeDollarSign];

/** Khối "Custom Made Trip" theo localvietnam.com: ảnh blob + nội dung + danh sách lợi ích. */
export default function CustomTrip({ lang, dict }) {
  const t = dict.home;
  const points = t.customPoints;
  return (
    <section className="relative isolate overflow-hidden bg-cream-50 py-14 lg:py-[4.5rem]">
      <BgImage src="/images/tours/hd/hoang-su-phi-ha-giang.jpg" tone="mist" position="50% 75%" />
      <Container className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <Reveal className="relative mx-auto w-full max-w-[540px] lg:ml-0 lg:max-w-[min(540px,calc(100svh-260px))] lg:pb-20">
          <SpinBadge className="absolute top-4 right-2 z-10 sm:right-6" />
          <div className="blob relative aspect-square overflow-hidden shadow-xl">
            <Image
              src="/images/tours/v2/sapa-6130917.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 540px, 90vw"
              className="object-cover object-[30%_40%]"
            />
          </div>
          {/* Ghi chú viết tay ở góc dưới trái (không khung, viền sáng nhẹ để dễ đọc) */}
          <div
            className="absolute bottom-0 left-2 hidden items-start gap-1 font-hand text-[1.6rem] leading-[1.1] text-forest-700 [text-shadow:0_1px_14px_rgba(255,255,255,0.95),0_0_4px_rgba(255,255,255,0.8)] lg:flex"
            aria-hidden
          >
            <p className="relative whitespace-pre-line">{t.customNote}</p>
          </div>
        </Reveal>

        <div>
          <p className="text-sm font-bold tracking-[0.18em] text-forest-700 uppercase">
            {t.customEyebrow}
          </p>
          <h2 className="heading-lg mt-3 text-ink">{t.customTitle}</h2>
          <p className="mt-3 text-xl font-medium text-forest-700">{t.customSubtitle}</p>
          <p className="mt-4 text-lg leading-relaxed text-ink/80">{t.customText}</p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {points.map((p, i) => {
              const Icon = icons[i];
              return (
                <Reveal
                  as="li"
                  key={p}
                  delay={i * 70}
                  className={cn(
                    "flex items-center gap-3 rounded-xl bg-white/85 p-3 shadow-sm ring-1 ring-white backdrop-blur",
                    i === points.length - 1 && points.length % 2 && "sm:col-span-2",
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-cream-100 text-forest-700">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[0.95rem] leading-snug font-semibold text-ink">{p}</span>
                </Reveal>
              );
            })}
          </ul>

          <Button href={`${lp(lang)}/plan-your-trip`} variant="primary" size="lg" className="mt-8">
            {t.customCta}
          </Button>
        </div>
      </Container>
    </section>
  );
}
