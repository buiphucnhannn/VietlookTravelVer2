import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import { Compass, Eye, HeartHandshake, Languages, Rocket, Sparkles } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { href, lp, tr } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/constants/site";
import { about } from "@/data/company";
import { reviews } from "@/data/reviews";
import { Button, Container, Reveal, SectionHeading } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import { WhyUs } from "@/components/home/WhyAndB2B";
import Reviews from "@/components/home/Reviews";
import YouTubeLite from "@/components/ui/YouTubeLite";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/about",
    title: dict.about.title,
    description: tr(about.story, lang)[0],
  });
}

export default async function AboutPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const a = dict.about;
  const valueIcons = [Rocket, HeartHandshake, Sparkles];
  const collage = [
    "/images/tours/v2/vietnam-12674100.jpg",
    "/images/tours/v2/hanoi-33497767.jpg",
    "/images/tours/v2/hoi-an-23857938.jpg",
    "/images/tours/v2/hanoi-1483768.jpg",
  ];

  return (
    <>
      <BrushHero
        title={a.title}
        subtitle={a.subtitle}
        images={[
          "/images/tours/v2/hanoi-920561.jpg",
          "/images/tours/v2/hanoi-33497770.jpg",
          "/images/tours/v2/ninh-binh-19757775.jpg",
        ]}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: a.title }]}
      />

      <section className="py-14 lg:py-[4.5rem]">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div className="self-center">
            <p className="text-xs font-bold tracking-[0.2em] text-sun-500 uppercase">
              {dict.common.since} {siteConfig.since}
            </p>
            <h2 className="heading-lg mt-2 text-ink">{a.storyTitle}</h2>
            <div className="mt-6 space-y-4 text-justify text-lg leading-relaxed hyphens-auto text-ink/80">
              {tr(about.story, lang).map((p) => (
                <p key={p.slice(0, 20)}>{p}</p>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Languages className="size-5 text-brand-600" />
              {about.languages.map((l) => (
                <span
                  key={l}
                  className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
          {/* Lưới 2×2 đều nhau, cao đúng bằng khối chữ bên cạnh → mép trên/dưới thẳng hàng */}
          <div className="grid h-[420px] grid-cols-2 grid-rows-2 gap-4 sm:h-[560px] lg:h-full">
            {collage.map((src) => (
              <div key={src} className="relative overflow-hidden rounded-3xl shadow-lg">
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative isolate overflow-hidden bg-brand-950 py-14 text-white lg:py-[4.5rem]">
        <BgImage src="/images/tours/hd/hanoi7.jpg" tone="dark" />
        <Container className="grid gap-6 md:grid-cols-2">
          {[
            { icon: Eye, title: lang === "zh" ? "愿景" : "Vision", text: tr(about.vision, lang) },
            {
              icon: Compass,
              title: lang === "zh" ? "使命" : "Mission",
              text: tr(about.mission, lang),
            },
          ].map((x) => (
            <div key={x.title} className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <x.icon className="size-9 text-amber-brand" />
              <h3 className="mt-4 text-2xl font-bold">{x.title}</h3>
              <p className="mt-2 text-lg text-white/80">{x.text}</p>
            </div>
          ))}
        </Container>
        <Container className="mt-14">
          <h2 className="text-center text-3xl font-bold">{a.valuesTitle}</h2>
          <div className="rail mt-10 grid gap-6 md:grid-cols-3">
            {about.values.map((v, i) => {
              const Icon = valueIcons[i];
              return (
                <Reveal key={i} delay={i * 90} className="rounded-3xl bg-white p-7 text-ink">
                  <span className="grid size-12 place-items-center rounded-xl bg-sun-500 text-white">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold">{tr(v.title, lang)}</h3>
                  <p className="mt-2 text-muted">{tr(v.text, lang)}</p>
                </Reveal>
              );
            })}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {tr(about.people, lang).map((p) => (
              <span key={p} className="rounded-full border border-white/25 px-5 py-2 font-semibold">
                {p}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <div id="why">
        <WhyUs dict={dict} />
      </div>

      <section className="relative isolate overflow-hidden bg-surface py-14 lg:py-[4.5rem]">
        <BgImage src="/images/tours/v2/hanoi-32123175.jpg" tone="mist" />
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl shadow-xl">
            <YouTubeLite
              id={siteConfig.youtubeIds[0]}
              title="Discovering The Timeless Beauty With Vietlook Travel"
            />
          </div>
          <div>
            <SectionHeading title={a.numbersTitle} align="left" />
            <dl className="grid grid-cols-2 gap-4">
              {dict.home.stats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col-reverse rounded-2xl bg-white p-5 ring-1 ring-border"
                >
                  <dt className="text-sm text-muted">{s.label}</dt>
                  <dd className="text-3xl font-extrabold text-brand-600">{s.value}</dd>
                </div>
              ))}
            </dl>
            <Button href={`${lp(lang)}/contact`} variant="cta" className="mt-8">
              {dict.nav.contact}
            </Button>
          </div>
        </Container>
      </section>

      <Reviews lang={lang} dict={dict} reviews={reviews} bg="white" />
    </>
  );
}
