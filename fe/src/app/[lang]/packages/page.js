import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  Star,
  Eye,
  Headphones,
  MapPin,
  Smartphone,
  Languages,
  Wrench,
} from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { fill, href, lp, tr } from "@/i18n/config";
import { cn, formatUSD } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { Button, Container, Reveal } from "@/components/ui";
import { AdviceBox, BrushHero } from "@/components/ui/PageHero";
import { getCatalog } from "@/lib/catalog";
import { getPageText } from "@/lib/page-copy/server";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const pc = await getPageText("packages", lang, dict);
  return pageMetadata({
    lang,
    path: "/packages",
    title: pc.heroTitle,
    description: pc.heroIntro,
  });
}

const whyIcons = [Smartphone, MapPin, Wrench, Languages, Star, Headphones];

function PackageRow({ tour, lang, dict, getDestination }) {
  const c = dict.common;
  const url = `${lp(lang)}/tours/${tour.slug}`;
  const stops = tour.destinations.map((d) => tr(getDestination(d)?.name, lang)).filter(Boolean);
  return (
    <article className="grid gap-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-border sm:grid-cols-[220px_1fr] sm:p-8">
      <Link
        href={url}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[4/3] overflow-hidden rounded-xl sm:aspect-square"
      >
        <Image
          src={tour.image}
          alt=""
          fill
          sizes="220px"
          className="object-cover transition-transform duration-700 hover:scale-105"
        />
      </Link>
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          <Link href={url} className="hover:text-brand-600">
            {tr(tour.title, lang)}
          </Link>
        </h3>
        <p className="mt-2 text-lg font-semibold text-brand-600">
          {tour.price ? (
            <>
              {c.from}: {formatUSD(tour.price)}
              {tour.originalPrice && (
                <span className="ml-2 text-base font-normal text-muted line-through">
                  {formatUSD(tour.originalPrice)}
                </span>
              )}
            </>
          ) : (
            c.priceOnRequest
          )}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {stops.map((s) => (
            <li key={s} className="flex items-center gap-1.5 text-ink/80">
              <CircleCheck className="size-4 text-brand-500" /> {s}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <details className="group text-sm text-muted">
            <summary className="flex cursor-pointer list-none items-center gap-2 hover:text-brand-600">
              <Eye className="size-4" /> {dict.packages.quickView}
            </summary>
            <ol className="mt-3 space-y-1.5 border-l-2 border-brand-100 pl-4">
              {(tr(tour.route, lang) || []).map((r, i) => (
                <li key={i}>
                  <strong className="text-brand-600">
                    {c.day} {i + 1}:
                  </strong>{" "}
                  {r}
                </li>
              ))}
            </ol>
          </details>
          <Button href={url} variant="primary" className="ml-auto">
            {c.viewTour}
          </Button>
        </div>
      </div>
    </article>
  );
}

export default async function PackagesPage({ params }) {
  const { packagesByWeeks, getDestination } = await getCatalog();
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = dict.packages;
  // Chữ / ảnh sửa được trong CMS → Giao diện trang → Gói tour 1–3 tuần (chưa sửa = nội dung mặc định)
  const pc = await getPageText("packages", lang, dict);
  const weeks = [
    { n: 1, id: "1-week" },
    { n: 2, id: "2-weeks" },
    { n: 3, id: "3-weeks" },
  ].map((w) => ({
    ...w,
    title: pc[`week${w.n}Title`],
    text: pc[`week${w.n}Text`],
    best: {
      title: pc[`week${w.n}BestTitle`],
      text: pc[`week${w.n}BestText`],
      ctaTitle: pc[`week${w.n}CtaTitle`],
      ctaText: pc[`week${w.n}CtaText`],
    },
  }));

  return (
    <>
      <BrushHero
        title={pc.heroTitle}
        subtitle={pc.heroIntro}
        images={pc.heroImages}
        collage={pc.collageImages}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: pc.heroTitle }]}
      />

      <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
        <BgImage src={pc.whyImage} tone="light" />
        <Container>
          <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {pc.whyTitle}
          </h2>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {pc.why.map((w, i) => {
              const Icon = whyIcons[i];
              return (
                // Subgrid 2 hàng (tiêu đề · mô tả): tiêu đề xuống 2 dòng không làm lệch mô tả các ô cùng hàng
                <Reveal
                  key={i}
                  delay={(i % 3) * 70}
                  className="row-span-2 grid grid-cols-[auto_1fr] grid-rows-subgrid gap-x-4 gap-y-1"
                >
                  <Icon className="row-span-2 mt-1 size-9 shrink-0 text-ink" strokeWidth={1.8} />
                  <h3 className="text-xl font-medium text-ink">{w.title}</h3>
                  <p className="leading-relaxed text-muted">{w.text}</p>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Mỗi nhóm 1 / 2 / 3 tuần là một khối riêng (~1 màn hình), nền xen kẽ; xem đủ qua liên kết "See all" */}
      {weeks.map((w, wi) => {
        const list = packagesByWeeks(w.n).slice(0, 3);
        const best = w.best;
        return (
          <section
            key={w.id}
            id={w.id}
            className={cn("scroll-mt-32 py-14 lg:py-[4.5rem]", wi % 2 ? "bg-white" : "bg-surface")}
          >
            <Container>
              {wi === 0 && (
                <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  {pc.ourPackages}
                </h2>
              )}
              <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                <div className="lg:sticky lg:top-32 lg:self-start">
                  <span className="block text-6xl leading-none font-extrabold text-brand-200">
                    0{w.n}
                  </span>
                  <h3 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{w.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/80 italic">{w.text}</p>
                  <Link
                    href={`${lp(lang)}/tours?duration=${w.n === 1 ? "5-7" : w.n === 2 ? "8-14" : "15%2B"}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-sun-500"
                  >
                    {fill(p.seeAllWeek, { n: w.n })} <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="min-w-0">
                  {/* Lời giới thiệu "Lịch trình hay nhất cho tour N tuần" ngay trên danh sách */}
                  <div className="mb-6">
                    <p className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                      {best.title}
                    </p>
                    <p className="mt-2 max-w-4xl leading-relaxed text-ink/75">{best.text}</p>
                  </div>
                  <div className="rail space-y-5 max-sm:space-y-0">
                    {list.map((t) => (
                      <PackageRow
                        key={t.slug}
                        tour={t}
                        lang={lang}
                        dict={dict}
                        getDestination={getDestination}
                      />
                    ))}
                  </div>
                  {/* Chưa ưng tour nào → mời gửi yêu cầu thiết kế riêng đúng số tuần */}
                  <div className="mt-8">
                    <AdviceBox
                      title={best.ctaTitle}
                      text={best.ctaText}
                      cta={pc.ctaButton}
                      href={`${lp(lang)}/plan-your-trip`}
                    />
                  </div>
                </div>
              </div>
            </Container>
          </section>
        );
      })}
    </>
  );
}
