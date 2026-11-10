import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import { Compass, Eye, HeartHandshake, Languages, Rocket, Sparkles } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { href, lp, tr } from "@/i18n/config";
import { pageMetadata, seoField } from "@/lib/seo";
import { siteConfig } from "@/constants/site";
import { reviews } from "@/data/reviews";
import { Button, Container, Reveal, SectionHeading } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import { WhyUs } from "@/components/home/WhyAndB2B";
import Reviews from "@/components/home/Reviews";
import VideoEmbed from "@/components/ui/VideoEmbed";
import { getCatalog } from "@/lib/catalog";
import {
  ABOUT_COLLAGE,
  ABOUT_HERO_IMAGES,
  ABOUT_MAX_REASONS,
  ABOUT_MISSION_TITLE,
  ABOUT_VISION_TITLE,
} from "@/data/about";

export async function generateMetadata({ params }) {
  const { about, aboutPage } = await getCatalog();
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/about",
    title:
      seoField(aboutPage?.seo, lang, "title") || tr(aboutPage?.title, lang) || dict.about.title,
    description: seoField(aboutPage?.seo, lang, "description") || tr(about.story, lang)[0],
    image: aboutPage?.image || undefined,
  });
}

export default async function AboutPage({ params }) {
  const { about, aboutPage } = await getCatalog();
  const { lang } = await params;
  const dict = await getDictionary(lang);
  // Tiêu đề / mô tả đầu trang sửa trong CMS (Giới thiệu & chính sách); chưa nhập → câu mặc định
  // Các dòng chữ / ảnh / số liệu còn lại cũng sửa trong CMS; ô nào (của ngôn ngữ đang xem) để trống
  // → dùng câu mặc định của đúng ngôn ngữ đó
  const own = (key) => about[key]?.[lang]?.trim() || "";
  const a = {
    ...dict.about,
    title: tr(aboutPage?.title, lang) || dict.about.title,
    subtitle: tr(aboutPage?.subtitle, lang) || dict.about.subtitle,
    storyEyebrow: own("storyEyebrow") || `${dict.common.since} ${siteConfig.since}`,
    storyTitle: own("storyTitle") || dict.about.storyTitle,
    visionTitle: own("visionTitle") || ABOUT_VISION_TITLE[lang] || ABOUT_VISION_TITLE.en,
    missionTitle: own("missionTitle") || ABOUT_MISSION_TITLE[lang] || ABOUT_MISSION_TITLE.en,
    valuesTitle: own("valuesTitle") || dict.about.valuesTitle,
    numbersTitle: own("numbersTitle") || dict.about.numbersTitle,
    ctaLabel: own("ctaLabel") || dict.nav.contact,
  };
  const valueIcons = [Rocket, HeartHandshake, Sparkles];
  const collage = ABOUT_COLLAGE.map((src, i) => about.collage?.[i] || src);
  // "Vì sao chọn Vietlook": tối đa 6 lý do (mỗi lý do một biểu tượng); chưa nhập → dùng bộ của trang chủ
  const reasons = (about.reasons ?? [])
    .map((r) => ({ title: tr(r.title, lang), text: tr(r.text, lang) }))
    .filter((r) => r.title || r.text)
    .slice(0, ABOUT_MAX_REASONS);
  const whyDict = {
    ...dict,
    home: {
      ...dict.home,
      whyTitle: own("whyTitle") || dict.home.whyTitle,
      whySubtitle: own("whySubtitle") || dict.home.whySubtitle,
      why: reasons.length ? reasons : dict.home.why,
    },
  };
  const cmsStats = (about.stats ?? [])
    .map((s) => ({ value: s.value, label: tr(s.label, lang) }))
    .filter((s) => s.value || s.label);
  const stats = cmsStats.length ? cmsStats : dict.home.stats;

  return (
    <>
      <BrushHero
        title={a.title}
        subtitle={a.subtitle}
        images={[aboutPage?.image || ABOUT_HERO_IMAGES[0], ...ABOUT_HERO_IMAGES.slice(1)]}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: a.title }]}
      />

      <section className="py-14 lg:py-[4.5rem]">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div className="self-center">
            <p className="text-xs font-bold tracking-[0.2em] text-sun-500 uppercase">
              {a.storyEyebrow}
            </p>
            <h2 className="heading-lg mt-2 text-ink">{a.storyTitle}</h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-ink/80 sm:text-justify sm:text-lg sm:hyphens-auto">
              {tr(about.story, lang).map((p) => (
                <p key={p.slice(0, 20)}>{p}</p>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Languages className="size-5 text-brand-600" />
              {(about.languages ?? []).map((l) => (
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
            {collage.map((src, i) => (
              <div key={i} className="relative overflow-hidden rounded-3xl shadow-lg">
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
            {
              icon: Eye,
              title: a.visionTitle,
              text: tr(about.vision, lang),
            },
            {
              icon: Compass,
              title: a.missionTitle,
              text: tr(about.mission, lang),
            },
          ].map((x, i) => (
            <div key={i} className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <x.icon className="size-9 text-amber-brand" />
              <h3 className="mt-4 text-2xl font-bold">{x.title}</h3>
              <p className="mt-2 text-lg text-white/80">{x.text}</p>
            </div>
          ))}
        </Container>
        <Container className="mt-14">
          <h2 className="text-center text-3xl font-bold">{a.valuesTitle}</h2>
          <div className="rail mt-10 grid gap-6 md:grid-cols-3">
            {(about.values ?? []).map((v, i) => {
              const Icon = valueIcons[i % valueIcons.length];
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
        <WhyUs dict={whyDict} />
      </div>

      <section className="relative isolate overflow-hidden bg-surface py-14 lg:py-[4.5rem]">
        <BgImage src="/images/tours/v2/hanoi-32123175.jpg" tone="mist" />
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl shadow-xl">
            {/* Video CMS (YouTube / Google Drive); trống → video giới thiệu có sẵn */}
            <VideoEmbed
              url={about.video}
              fallbackId={siteConfig.youtubeIds[0]}
              title="Discovering The Timeless Beauty With Vietlook Travel"
            />
          </div>
          <div>
            <SectionHeading title={a.numbersTitle} align="left" />
            <dl className="grid grid-cols-2 gap-4">
              {stats.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col-reverse rounded-2xl bg-white p-5 ring-1 ring-border"
                >
                  <dt className="text-sm text-muted">{s.label}</dt>
                  <dd className="text-3xl font-extrabold text-brand-600">{s.value}</dd>
                </div>
              ))}
            </dl>
            <Button href={`${lp(lang)}/contact`} variant="cta" className="mt-8">
              {a.ctaLabel}
            </Button>
          </div>
        </Container>
      </section>

      <Reviews lang={lang} dict={dict} reviews={reviews} bg="white" />
    </>
  );
}
