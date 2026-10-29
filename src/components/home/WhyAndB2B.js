import Image from "next/image";
import SpinBadge from "@/components/ui/SpinBadge";
import BgImage from "@/components/ui/BgImage";
import {
  CheckCircle2,
  Clock4,
  Handshake,
  Headphones,
  Layers,
  MapPinned,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button, Container, Reveal, SectionHeading } from "@/components/ui";
import { lp } from "@/i18n/config";

const whyIcons = [Layers, Wallet, MapPinned, ShieldCheck, Headphones, Handshake];

export function WhyUs({ dict }) {
  const t = dict.home;
  return (
    <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
      <BgImage src="/images/tours/v2/sapa-6872795.jpg" tone="light" />
      <Container>
        <SectionHeading title={t.whyTitle} subtitle={t.whySubtitle} />
        <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {t.why.map((w, i) => {
            const Icon = whyIcons[i];
            return (
              <Reveal key={w.title} delay={(i % 3) * 80} className="flex gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-forest-700 to-forest-700 text-white shadow-lg shadow-forest-700/25">
                  <Icon className="size-6" />
                </span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-ink">{w.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{w.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/** Khối B2B: thể hiện Vietlook là DMC/đối tác mặt đất cho đại lý (khách hàng hướng B2B). */
export function B2BBlock({ lang, dict }) {
  const t = dict.home;
  return (
    <section className="relative isolate overflow-hidden bg-forest-900 py-14 text-white lg:py-[4.5rem]">
      <BgImage src="/images/tours/v2/halong-bay-58597.jpg" tone="dark" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(197,115,59,0.35),transparent_50%),radial-gradient(circle_at_90%_90%,rgba(247,179,43,0.18),transparent_45%)]" />
      <Container className="relative grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="mx-auto w-full max-w-lg">
          {/* Cụm ảnh */}
          <div className="relative h-[340px] sm:h-[400px]">
            <SpinBadge className="absolute top-[3%] right-0 z-10 sm:top-[4%] sm:right-[1%]" />
            <div className="absolute top-0 left-0 h-[68%] w-[64%] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/10">
              <Image
                src="/images/tours/v2/halong-bay-5531592.jpg"
                alt=""
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
            <div className="absolute right-0 bottom-0 h-[62%] w-[58%] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/10">
              <Image
                src="/images/tours/v2/phu-quoc-26742974.jpg"
                alt=""
                fill
                sizes="300px"
                className="object-cover"
              />
            </div>
          </div>
          {/* Số liệu nổi bật – hàng riêng dưới cụm ảnh, không đè lên ảnh */}
          <div className="mt-8 flex items-center justify-center gap-5 sm:gap-12">
            <div className="flex items-center gap-3">
              <Clock4 className="size-8 shrink-0 text-amber-brand sm:size-10" />
              <div className="leading-none">
                <p className="text-3xl font-extrabold tracking-tight whitespace-nowrap text-amber-brand sm:text-5xl">
                  24h
                </p>
                <p className="mt-2 text-xs font-semibold tracking-[0.14em] whitespace-nowrap text-white/85 uppercase">
                  {lang === "zh" ? "报价回复" : "quote turnaround"}
                </p>
              </div>
            </div>
            <span aria-hidden className="h-14 w-px bg-white/20" />
            <div className="leading-none">
              <p className="text-3xl font-extrabold tracking-tight whitespace-nowrap text-amber-brand sm:text-5xl">
                2–200+
              </p>
              <p className="mt-2 text-xs font-semibold tracking-[0.14em] whitespace-nowrap text-white/85 uppercase">
                {dict.common.paxGroup}
              </p>
            </div>
          </div>
        </Reveal>
        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-amber-brand uppercase">
            {t.b2bEyebrow}
          </p>
          <h2 className="heading-lg mt-3 text-white">{t.b2bTitle}</h2>
          <p className="mt-5 text-lg leading-relaxed text-white/80">{t.b2bText}</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {t.b2bPoints.map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-brand" />
                <span className="text-white/90">{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href={`${lp(lang)}/partners`} variant="cta" size="lg">
              <Handshake className="size-5" /> {t.b2bCta}
            </Button>
            <Button href={`${lp(lang)}/group-tailor-made-tours`} variant="outline-white" size="lg">
              {dict.nav.groupTours}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
