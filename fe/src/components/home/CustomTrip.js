import { BadgeDollarSign, Hotel, Layers, MessageCircle, SlidersHorizontal } from "lucide-react";
import { Button, Container, Reveal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { lp } from "@/i18n/config";
import RibbonStar from "./RibbonStar";

const icons = [Hotel, MessageCircle, SlidersHorizontal, Layers, BadgeDollarSign];

/**
 * Khối "Custom / Make a trip" (yêu cầu khách 31/10, mục 3): thay ảnh ruộng bậc thang hình tròn
 * và huy hiệu xoay bằng hình "dải lụa xoắn" của Demo 3; nền giấy kem vân tròn nhẹ.
 */
export default function CustomTrip({ lang, dict, starImages, starLabels }) {
  const t = dict.home;
  const points = t.customPoints;
  return (
    <section className="relative isolate overflow-hidden bg-cream-50 bg-[radial-gradient(circle_at_28%_50%,rgba(255,255,255,0.9),rgba(255,255,255,0)_55%),repeating-radial-gradient(circle_at_28%_50%,rgba(160,130,80,0.09)_0_1px,transparent_1px_26px)] py-14 lg:py-[4.5rem]">
      <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <Reveal className="mx-auto w-full max-w-[min(520px,calc(100svh-200px))] animate-float px-4 sm:px-0">
          <RibbonStar lang={lang} images={starImages} labels={starLabels} />
        </Reveal>

        <div>
          <p className="text-sm font-bold tracking-[0.18em] text-clay-600 uppercase">
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
                    "flex items-center gap-3 rounded-xl bg-white/90 p-3 shadow-sm ring-1 ring-sand-300/50",
                    i === points.length - 1 && points.length % 2 && "sm:col-span-2",
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-cream-100 text-clay-600">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[0.95rem] leading-snug font-semibold text-ink">{p}</span>
                </Reveal>
              );
            })}
          </ul>

          <Button href={`${lp(lang)}/plan-your-trip`} variant="cta" size="lg" className="mt-8">
            {t.customCta}
          </Button>
        </div>
      </Container>
    </section>
  );
}
