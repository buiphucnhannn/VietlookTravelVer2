import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import {
  Briefcase,
  CalendarSync,
  Car,
  GraduationCap,
  Handshake,
  Heart,
  Hotel,
  MessagesSquare,
  Star,
  Stamp,
  Users,
  Wrench,
  MapPin,
  UsersRound,
} from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { JsonLd, pageMetadata } from "@/lib/seo";
import { Container, Reveal, SectionHeading } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import TripPlannerForm from "@/components/forms/TripPlannerForm";
import Reviews from "@/components/home/Reviews";
import AccessibleTravel from "@/components/ui/AccessibleTravel";
import { href } from "@/i18n/config";
import { getCatalog, getReviews } from "@/lib/catalog";
import { getPageText } from "@/lib/page-copy/server";
import { withAccessCopy } from "@/lib/page-copy/access.mjs";
import { cn } from "@/lib/utils";
import { subgrid } from "@/lib/subgrid";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = await getPageText("group-tailor-made-tours", lang, dict);
  return pageMetadata({
    lang,
    path: "/group-tailor-made-tours",
    title: p.heroTitle,
    description: p.intro,
    image: p.heroImage,
  });
}

export default async function GroupTailorMadePage({ params }) {
  const { plannerOptions } = await getCatalog();
  const reviews = await getReviews("group");
  const { lang } = await params;
  const dict = await getDictionary(lang);
  // Chữ / ảnh sửa được trong CMS → Giao diện trang → Tour nhóm & thiết kế riêng (chưa sửa = nội dung mặc định).
  // Dải "không rào cản": ô riêng của trang này để trống → chữ của khối chung (Toàn website → Khối du lịch không rào cản)
  const access = await getPageText("access", lang, dict);
  const p = await getPageText("group-tailor-made-tours", lang, withAccessCopy(dict, access));
  const includedIcons = [Users, Hotel, Car, Wrench, Stamp, MessagesSquare];
  const pillarIcons = [Wrench, Star, MapPin, MessagesSquare];
  const groupIcons = [UsersRound, Briefcase, GraduationCap, Handshake];
  const tabIds = ["included", "groups", "how", "plan", "faq"];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <JsonLd data={faqLd} />
      <BrushHero
        title={p.heroTitle}
        subtitle={p.heroSubtitle}
        images={[p.heroImage]}
        cta={{ href: "#plan", label: p.heroCta }}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: p.heroTitle }]}
      />

      <Container className="py-10 text-center">
        <p className="mx-auto max-w-5xl text-xl leading-snug font-medium whitespace-pre-line text-ink sm:text-2xl">
          {p.intro}
        </p>
        {/* Du lịch không rào cản: nhóm có khách đi xe lăn / khiếm thính / đi lại hạn chế → sắp xếp theo yêu cầu */}
        <AccessibleTravel
          lang={lang}
          dict={dict}
          copy={{ ...access, title: p.accessTitle, bandText: p.accessText, cta: p.accessCta }}
          variant="band"
          className="mx-auto mt-8 max-w-5xl"
        />
      </Container>

      {/* Thanh tab kiểu localvietnam */}
      <div data-scroll-offset className="sticky top-16 z-30 bg-[#dff3f1] lg:top-[108px]">
        {/* Chỉ các mục chuyển tới khối trong trang, căn giữa (nút Free Trip Planning đã có trên header) */}
        <Container>
          <nav className="flex scrollbar-none gap-1 overflow-x-auto py-1 md:justify-center">
            {p.tabs.map((label, i) => (
              <a
                key={tabIds[i]}
                href={`#${tabIds[i]}`}
                className="shrink-0 px-4 py-3 text-[0.95rem] font-medium text-ink transition-colors hover:text-brand-600"
              >
                {label}
              </a>
            ))}
          </nav>
        </Container>
      </div>

      <section
        id="included"
        className="relative isolate scroll-mt-40 overflow-hidden bg-[#d3e9e6] py-14 lg:py-[4.5rem]"
      >
        <BgImage src={p.includedImage} tone="mist" />
        <Container>
          <h2 className="heading-lg mx-auto mb-12 max-w-4xl text-center text-ink">
            {p.includedTitle}
          </h2>
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            {p.included.map((x, i) => {
              const Icon = includedIcons[i];
              return (
                // Từ md: subgrid 2 hàng (tiêu đề · mô tả), biểu tượng chiếm cả 2 hàng
                <Reveal
                  key={i}
                  delay={(i % 2) * 80}
                  className="flex items-start gap-5 md:row-span-2 md:grid md:grid-cols-[auto_1fr] md:grid-rows-subgrid md:gap-y-0"
                >
                  <Icon
                    className="mt-1 size-12 shrink-0 text-[#4a5a63] md:row-span-2"
                    strokeWidth={1.6}
                  />
                  <div className="md:contents">
                    <h3 className="text-2xl font-semibold text-ink">{x.title}</h3>
                    <p className="mt-1 text-lg leading-relaxed whitespace-pre-line text-ink/70">
                      {x.text}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      <div className="relative isolate overflow-hidden bg-[#16a777] py-10 text-white">
        <BgImage src={p.pillarsImage} tone="dark" />
        <Container className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {p.pillars.map((pillar, i) => {
            const Icon = pillarIcons[i];
            return (
              <div key={i}>
                <Icon className="mx-auto size-9" />
                <p className="mt-2 text-xl font-semibold sm:text-2xl">{pillar}</p>
              </div>
            );
          })}
        </Container>
      </div>

      <section id="groups" className="scroll-mt-40 py-14 lg:py-[4.5rem]">
        <Container>
          <SectionHeading title={p.groupTitle} />
          <div className="rail grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {p.groups.map((x, i) => {
              const Icon = groupIcons[i];
              return (
                <Reveal key={i} delay={i * 80} className={subgrid(3, "sm")}>
                  <div
                    className={cn(
                      "group h-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border",
                      subgrid(3, "sm"),
                    )}
                  >
                    <div className="relative h-44 overflow-hidden">
                      <Image
                        src={p.groupImages[i]}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <span className="absolute bottom-3 left-3 grid size-11 place-items-center rounded-xl bg-white text-brand-600 shadow">
                        <Icon className="size-5" />
                      </span>
                    </div>
                    <h3 className="px-5 pt-5 text-lg font-bold text-ink">{x.title}</h3>
                    <p className="mt-1.5 px-5 pb-5 whitespace-pre-line text-muted">{x.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      <section
        id="how"
        className="relative isolate scroll-mt-40 overflow-hidden bg-surface py-14 lg:py-[4.5rem]"
      >
        <BgImage src={p.howImage} tone="light" />
        <Container>
          <SectionHeading title={p.howTitle} />
          <ol className="relative grid gap-8 md:grid-cols-4">
            <span className="route-dash absolute top-8 right-[12%] left-[12%] hidden h-0.5 text-brand-300 md:block" />
            {p.how.map((s, i) => (
              <Reveal
                as="li"
                key={i}
                delay={i * 100}
                className={cn("relative text-center", subgrid(3, "md"))}
              >
                <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-brand-600 text-2xl font-extrabold text-white shadow-lg ring-8 ring-surface">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl font-bold text-ink">{s.title}</h3>
                <p className="mt-2 whitespace-pre-line text-muted">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <section id="plan" className="relative scroll-mt-36 overflow-hidden py-14 lg:py-[4.5rem]">
        <Image src={p.planImage} alt="" fill sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-brand-950/80" />
        <Container className="max-w-4xl">
          <SectionHeading title={p.plannerTitle} subtitle={p.plannerSubtitle} light />
          <TripPlannerForm
            lang={lang}
            t={{ ...dict.planner, ...dict.tour }}
            c={dict.common}
            destinationOptions={plannerOptions(lang)}
          />
        </Container>
      </section>

      <Reviews
        lang={lang}
        dict={{
          ...dict,
          home: {
            ...dict.home,
            reviewsEyebrow: p.reviewsEyebrow,
            reviewsTitle: p.reviewsTitle,
            reviewsSubtitle: p.reviewsSubtitle,
          },
        }}
        reviews={reviews}
      />

      <section id="faq" className="scroll-mt-40 py-14 lg:py-[4.5rem]">
        <Container className="max-w-4xl">
          <SectionHeading title={p.faqTitle} />
          <div className="space-y-3">
            {p.faq.map((f, i) => (
              <details
                key={i}
                open={i === 0}
                className="group rounded-2xl bg-white ring-1 ring-border open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-lg font-semibold text-ink">
                  {f.q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 leading-relaxed whitespace-pre-line text-muted">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-muted">
            <Heart className="size-4 text-sun-500" />{" "}
            <CalendarSync className="size-4 text-brand-500" /> {p.faqNote}
          </p>
        </Container>
      </section>
    </>
  );
}
