import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  DollarSign,
  Eye,
  Headphones,
  MapPin,
  Smartphone,
  Star,
  Wrench,
} from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { fill, href, lp, tr } from "@/i18n/config";
import { cn, formatUSD } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { packagesByWeeks, tourText } from "@/data/tours";
import { getDestination } from "@/data/destinations";
import { Button, Container, Reveal } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/packages",
    title: dict.packages.title,
    description: dict.packages.intro,
  });
}

const whyIcons = [Smartphone, MapPin, Wrench, DollarSign, Star, Headphones];

function PackageRow({ tour, lang, dict }) {
  const c = dict.common;
  const url = `${lp(lang)}/tours/${tour.slug}`;
  const stops = tour.destinations.map((d) => tr(getDestination(d)?.name, lang)).filter(Boolean);
  return (
    <article className="grid gap-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-border sm:grid-cols-[220px_1fr] sm:p-8">
      <Link
        href={url}
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
              {tourText(tour, lang).route.map((r, i) => (
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
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = dict.packages;
  const weeks = [
    { n: 1, id: "1-week", ...p.week1 },
    { n: 2, id: "2-weeks", ...p.week2 },
    { n: 3, id: "3-weeks", ...p.week3 },
  ];

  return (
    <>
      <BrushHero
        title={p.title}
        subtitle={p.intro}
        images={[
          "/images/tours/v2/ha-giang-14025581.jpg",
          "/images/tours/v2/sapa-6130917.jpg",
          "/images/tours/v2/hoi-an-746921.jpg",
          "/images/tours/v2/mekong-delta-3180637.jpg",
        ]}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: p.title }]}
      />

      <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
        <BgImage src="/images/tours/hd/bao-lac-cao-bang.jpg" tone="light" />
        <Container>
          <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {p.whyTitle}
          </h2>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {p.why.map((w, i) => {
              const Icon = whyIcons[i];
              return (
                <Reveal key={w.title} delay={(i % 3) * 70} className="flex gap-4">
                  <Icon className="mt-1 size-9 shrink-0 text-ink" strokeWidth={1.8} />
                  <div>
                    <h3 className="text-xl font-medium text-ink">{w.title}</h3>
                    <p className="mt-1 leading-relaxed text-muted">{w.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Mỗi nhóm 1 / 2 / 3 tuần là một khối riêng (~1 màn hình), nền xen kẽ; xem đủ qua liên kết "See all" */}
      {weeks.map((w, wi) => {
        const list = packagesByWeeks(w.n).slice(0, 3);
        return (
          <section
            key={w.id}
            id={w.id}
            className={cn("scroll-mt-32 py-14 lg:py-[4.5rem]", wi % 2 ? "bg-white" : "bg-surface")}
          >
            <Container>
              {wi === 0 && (
                <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  {p.ourPackages}
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
                <div className="rail space-y-5 max-sm:space-y-0">
                  {list.map((t) => (
                    <PackageRow key={t.slug} tour={t} lang={lang} dict={dict} />
                  ))}
                </div>
              </div>
            </Container>
          </section>
        );
      })}
    </>
  );
}
