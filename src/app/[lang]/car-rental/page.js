import fs from "fs";
import BgImage from "@/components/ui/BgImage";
import path from "path";
import Image from "next/image";
import {
  BadgeCheck,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock,
  Gem,
  Globe2,
  Languages,
  Map,
  MapPinned,
  Phone,
  Plane,
  ShieldCheck,
  Signpost,
  Ticket,
  Users,
} from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { href, lp, tr } from "@/i18n/config";
import { JsonLd, pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/constants/site";
import {
  airportFrom,
  carAreas,
  carRoutes,
  fleet,
  places,
  quoteRoutes,
  routeTitle,
} from "@/data/cars";
import { reviews } from "@/data/reviews";
import { Breadcrumbs, Container, Reveal, SectionHeading, Stars } from "@/components/ui";
import { CarQuoteForm, CarQuoteProvider, QuickQuote } from "@/components/car/CarQuote";
import FleetStage from "@/components/car/FleetStage";
import FleetMarquee from "@/components/car/FleetMarquee";
import RoutesExplorer from "@/components/car/RoutesExplorer";
import { WeChatIcon, WhatsAppIcon, ZaloIcon } from "@/components/ui/BrandIcons";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/car-rental",
    title: dict.car.eyebrow,
    description: dict.car.text,
    image: "/images/rent-car/1061814248554042666112-1.jpg",
  });
}

// Ảnh thật trong kho: nội thất & ngoại thất (bỏ ảnh studio đã tách nền)
function fleetPhotos() {
  const dir = path.join(process.cwd(), "public/images/rent-car");
  const studio = new Set(["bus16.jpg", "limo.jpg", "mpv.jpg", "sedan.jpg", "download.jpeg"]);
  const interior = new Set([
    "152217964357731898522-copy.jpg",
    "1000000308_20250818190016682_thumb.jpg",
    "1000000309_20250818190027336_thumb.jpg",
    "1000000311_20250818190121267_thumb.jpg",
    "152217964357731898510-1.jpg",
    "152217964357731898512-1.jpg",
    "1567-HUnazjjSgm-anh_thumb.jpg",
    "1000000307_20250818190049226_thumb.jpg",
    "image_picker_416D4046-EA36-4326-BE20-41291B4B55FB-44080-00000C3327D88568_20260410210656122_thumb.jpg",
    "image_picker_5C359F19-74E1-4A11-BDB8-20A7A35B088F-44080-00000C32F06A4669_20260410210617247_thumb.jpg",
    "image_picker_CB288E27-E76A-4A22-9419-EAE35F54FE96-2705-000001068784230C_20260330071843712_thumb.jpg",
    "image_picker_F73F5A32-4EC0-4898-8945-896D669E6D65-2705-00000106877F1B93_20260330071843711_thumb.jpg",
  ]);
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !studio.has(f));
  return {
    exterior: files.filter((f) => !interior.has(f)).map((f) => `/images/rent-car/${f}`),
    interior: [...interior].map((f) => `/images/rent-car/${f}`),
  };
}

export default async function CarRentalPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.car;
  const c = {
    ...dict.common,
    fullName: dict.tour.fullName,
    phone: dict.tour.phone,
    notes: dict.tour.notes,
  };
  const { exterior, interior } = fleetPhotos();
  const half = Math.ceil(exterior.length / 2);

  const fleetData = fleet.map((f) => ({
    ...f,
    name: { label: tr(f.name, lang) },
    tagline: tr(f.tagline, lang),
    ideal: tr(f.ideal, lang),
    from: airportFrom(f.priceKey),
  }));
  const areas = carAreas.map((a) => ({ key: a.key, name: tr(a.name, lang), airport: a.airport }));
  const routes = carRoutes.map((r) => ({
    ...r,
    ...quoteRoutes.find((q) => q.slug === r.slug),
    label: routeTitle(r.title, lang),
  }));
  const classes = fleet
    .filter((f) => f.priceKey)
    .map((f) => ({ key: f.priceKey, vehicle: f.key, label: tr(f.name, lang).split(" – ")[0] }));
  const vehicles = fleet.map((f) => ({
    key: f.key,
    name: tr(f.name, lang),
    seats: f.seats,
    pax: f.pax,
    luggage: f.luggage,
    priceKey: f.priceKey,
    image: f.images[0],
  }));
  const placeList = Object.entries(places).map(([key, v]) => ({
    key,
    group: v.group,
    name: tr(v.name, lang),
  }));
  const trustIcons = [Plane, Clock, Languages, Ticket];

  const serviceIcons = [Plane, Map, Signpost, CalendarCheck, Users, Globe2];
  const includedIcons = [Ticket, Plane, Clock, BadgeCheck, Gem, Languages];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Private car hire with driver",
    provider: { "@type": "TravelAgency", name: siteConfig.legalName },
    areaServed: "Vietnam",
    offers: carRoutes
      .filter((r) => r.prices.sedan)
      .slice(0, 10)
      .map((r) => ({
        "@type": "Offer",
        name: r.title,
        price: r.prices.sedan,
        priceCurrency: "USD",
      })),
  };

  return (
    <CarQuoteProvider>
      <JsonLd data={jsonLd} />

      {/* ========== HERO ========== */}
      {/* Hero tối thiểu 1 màn hình (cao thêm khi form mở rộng): nội dung ở trên, dải đường + xe nằm riêng bên dưới – không đè nhau */}
      <section className="relative isolate flex flex-col overflow-hidden bg-[#0b1b2b] text-white lg:min-h-[min(100svh,960px)]">
        <Image
          src="/images/rent-car/download.jpeg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-bottom opacity-70"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b1b2b] via-[#0b1b2b]/80 to-[#0b1b2b]/30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1b2b] via-transparent to-transparent" />

        <Container className="grid flex-1 items-center gap-10 pt-28 pb-8 lg:grid-cols-[1fr_440px] lg:gap-12 lg:pt-[124px] lg:pb-6 xl:grid-cols-[1fr_460px] xl:gap-16">
          <div>
            <Breadcrumbs
              light
              className="mb-5"
              items={[{ label: "Vietlook", href: href(lang) }, { label: t.eyebrow }]}
            />
            <p className="flex items-center gap-2 text-sm font-bold tracking-[0.18em] text-amber-brand uppercase">
              <Car className="size-4" /> {t.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-5xl xl:text-[3.4rem]">
              {t.title}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/80">{t.text}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#quote"
                className="inline-flex h-12 items-center rounded-xl bg-amber-brand px-7 font-bold text-ink shadow-lg shadow-amber-brand/25 transition hover:brightness-105 max-sm:px-5 sm:h-13"
              >
                {t.ctaQuote}
              </a>
              <a
                href="#fleet"
                className="inline-flex h-12 items-center rounded-xl border-2 border-white/40 px-7 font-semibold transition hover:bg-white hover:text-ink max-sm:px-5 sm:h-13"
              >
                {t.ctaFleet}
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
              {t.perks.map((p) => (
                <li key={p} className="flex items-center gap-2.5 font-medium">
                  <CheckCircle2 className="size-5 text-amber-brand" /> {p}
                </li>
              ))}
            </ul>
          </div>
          <QuickQuote
            lang={lang}
            t={t}
            c={c}
            places={placeList}
            routes={quoteRoutes}
            vehicles={vehicles}
          />
        </Container>

        {/* Con đường & chiếc xe đang chạy – nằm trong luồng bố cục, dưới nội dung */}
        <div className="relative h-28 shrink-0 sm:h-32" aria-hidden>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-[#1b2733] to-[#121c26]" />
          <div className="absolute inset-x-0 bottom-7 h-1.5 animate-road bg-[repeating-linear-gradient(90deg,#f7b32b_0_60px,transparent_60px_120px)]" />
          <div className="absolute inset-x-0 bottom-16 h-px bg-white/15" />
          <div className="absolute bottom-4 left-[6%] w-[min(300px,58vw)] animate-float">
            <div
              className="absolute top-1/2 right-[96%] hidden w-40 space-y-2 sm:block"
              aria-hidden
            >
              {[90, 60, 75].map((w, i) => (
                <span
                  key={i}
                  className="block h-[3px] rounded-full bg-gradient-to-l from-white/60 to-transparent"
                  style={{ width: `${w}%`, marginLeft: `${100 - w}%` }}
                />
              ))}
            </div>
            <Image
              src="/images/rent-car/cutouts/limousine-studio.webp"
              alt="Vietlook limousine"
              width={777}
              height={272}
              priority
              className="h-auto w-full drop-shadow-[0_24px_18px_rgba(0,0,0,0.6)]"
            />
          </div>
          <div className="absolute right-[6%] bottom-5 hidden w-[min(190px,22vw)] md:block">
            <Image
              src="/images/rent-car/cutouts/kia-carnival-front.webp"
              alt=""
              width={324}
              height={166}
              className="h-auto w-full -scale-x-100 opacity-90 drop-shadow-[0_18px_14px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      </section>

      {/* ========== DẢI ĐIỂM MẠNH (như hltcarservice.com) ========== */}
      <section className="border-t-2 border-amber-brand bg-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.3)]">
        <Container>
          <ul className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
            {t.trust.map((x, i) => {
              const Icon = trustIcons[i];
              return (
                <li key={x.t} className="flex items-center gap-4 lg:px-6 lg:first:pl-0">
                  <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-amber-brand/15 text-[#a26a00]">
                    <Icon className="size-5" />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-bold text-ink">{x.t}</span>
                    <span className="text-sm text-muted">{x.d}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* ========== ĐỘI XE ========== */}
      <section
        id="fleet"
        className="relative scroll-mt-28 overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#174a73,#0b1b2b_65%)] py-14 text-white lg:py-[4.5rem]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <Container className="relative">
          <header className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="heading-lg text-white">{t.fleetTitle}</h2>
            <p className="mt-3 text-white/70">{t.fleetSubtitle}</p>
          </header>
          <FleetStage fleet={fleetData} t={{ ...t, contactPrice: dict.common.contactPrice }} />
        </Container>
      </section>

      {/* ========== DỊCH VỤ ========== */}
      <section id="services" className="scroll-mt-28 py-14 lg:py-[4.5rem]">
        <Container>
          <header className="mb-10 max-w-2xl">
            <h2 className="heading-lg text-ink">{t.servicesTitle}</h2>
            <span className="mt-4 block h-1 w-14 rounded-full bg-amber-brand" />
          </header>
          <div className="rail grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.services.map((s, i) => {
              const Icon = serviceIcons[i];
              return (
                <Reveal key={s.title} delay={(i % 3) * 80}>
                  <div className="group relative h-full overflow-hidden rounded-3xl bg-surface p-7 transition duration-300 hover:-translate-y-1 hover:bg-brand-950 hover:text-white">
                    <span className="absolute -top-8 -right-8 size-32 rounded-full bg-amber-brand/15 transition-transform duration-500 group-hover:scale-150" />
                    <span className="relative grid size-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm transition group-hover:bg-amber-brand group-hover:text-ink">
                      <Icon className="size-6" />
                    </span>
                    <h3 className="relative mt-5 text-xl font-bold">{s.title}</h3>
                    <p className="relative mt-2 leading-relaxed text-muted transition group-hover:text-white/75">
                      {s.text}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ========== TUYẾN PHỔ BIẾN ========== */}
      <section className="bg-[#f6f1e8] py-14 lg:py-[4.5rem]">
        <Container>
          <header className="mb-10 max-w-2xl">
            <h2 className="heading-lg text-ink">{t.routesTitle}</h2>
            <p className="mt-3 text-lg text-muted">{t.routesSubtitle}</p>
          </header>
          <RoutesExplorer areas={areas} routes={routes} classes={classes} t={t} />
        </Container>
      </section>

      {/* ========== KHU VỰC PHỤC VỤ TOÀN QUỐC ========== */}
      <section className="py-14 lg:py-[4.5rem]">
        <Container>
          <header className="mb-10 max-w-2xl">
            <h2 className="heading-lg text-ink">{t.areasTitle}</h2>
            <p className="mt-3 text-lg text-muted">{t.areasSubtitle}</p>
            <span className="mt-4 block h-1 w-14 rounded-full bg-amber-brand" />
          </header>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {carAreas.map((a, i) => (
              <div
                key={a.key}
                className={`group relative overflow-hidden rounded-3xl ${i === 0 ? "col-span-2 row-span-2 min-h-72" : "min-h-44"}`}
              >
                <Image
                  src={a.image}
                  alt={tr(a.name, lang)}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-[#0b1b2b]/85 via-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span className="block text-xl font-bold">{tr(a.name, lang)}</span>
                  <span className="flex items-center gap-1.5 text-sm text-white/80">
                    <Plane className="size-3.5 text-amber-brand" /> {a.airport} ·{" "}
                    {carRoutes.filter((r) => r.area === a.key).length} {t.routesCount}
                  </span>
                </span>
              </div>
            ))}
            <div className="col-span-2 flex min-h-44 flex-col justify-center rounded-3xl bg-amber-brand/15 p-6">
              <Globe2 className="size-8 text-[#a26a00]" />
              <p className="mt-3 font-bold text-ink">{t.areasMore}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ========== GIÁ ĐÃ BAO GỒM ========== */}
      <section className="relative isolate overflow-hidden pt-8 pb-14 lg:pt-10 lg:pb-[4.5rem]">
        <BgImage src="/images/rent-car/1061814248554042666108-1.jpg" tone="light" />
        <Container>
          <header className="mb-10 max-w-2xl">
            <h2 className="heading-lg text-ink">{t.includedTitle}</h2>
            <span className="mt-4 block h-1 w-14 rounded-full bg-amber-brand" />
          </header>
          <div className="rail grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.included.map((x, i) => {
              const Icon = includedIcons[i];
              return (
                <div
                  key={x.title}
                  className="relative overflow-hidden rounded-3xl border border-border bg-white p-7"
                >
                  <span className="absolute top-3 right-5 text-6xl font-extrabold text-amber-brand/15">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="grid size-12 place-items-center rounded-xl bg-amber-brand/15 text-[#a26a00]">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{x.title}</h3>
                  <p className="mt-1.5 text-muted">{x.text}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ========== ẢNH ĐỘI XE THẬT (marquee) ========== */}
      <section className="overflow-hidden bg-surface py-14 lg:py-[4.5rem]">
        <Container className="mb-8 text-center lg:mb-10">
          <h2 className="heading-lg text-ink">{t.galleryTitle}</h2>
          <p className="mt-3 text-lg text-muted">{t.gallerySubtitle}</p>
        </Container>
        {/* 3 dải ảnh chạy ngược chiều nhau: 2 dải ngoại thất + 1 dải nội thất; bấm ảnh để xem lớn */}
        <FleetMarquee
          rows={[
            { images: exterior.slice(0, half), alt: "Vietlook Travel fleet" },
            { images: interior, alt: t.gallery },
            { images: exterior.slice(half), alt: "Vietlook Travel fleet" },
          ]}
        />
      </section>

      {/* ========== CÁCH ĐẶT XE ========== */}
      <section className="relative isolate overflow-hidden bg-[#0b1b2b] py-14 text-white lg:py-[4.5rem]">
        <BgImage src="/images/rent-car/152217964357731898522-copy.jpg" tone="night" />
        <div className="absolute -top-40 -right-40 size-[520px] rounded-full bg-amber-brand/10 blur-3xl" />
        <Container className="relative">
          <h2 className="heading-lg">{t.howTitle}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {t.how.map((s, i) => {
              const Icon = [CalendarCheck, MapPinned, ShieldCheck][i];
              return (
                <Reveal
                  key={s.title}
                  delay={i * 120}
                  className="relative rounded-3xl bg-white/5 p-7 ring-1 ring-white/10"
                >
                  <span className="relative inline-grid size-14 place-items-center rounded-2xl bg-white/10 text-amber-brand">
                    <Icon className="size-6" />
                    <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-amber-brand text-sm font-bold text-ink">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-6 text-2xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-white/70">{s.text}</p>
                  {i < 2 && (
                    <span className="route-dash absolute top-14 -right-6 hidden h-0.5 w-6 text-amber-brand md:block" />
                  )}
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ========== KHÁCH HÀNG NÓI GÌ ========== */}
      <section className="bg-[#f6f1e8] py-14 lg:py-[4.5rem]">
        <Container>
          <SectionHeading title={t.reviewsTitle} subtitle={t.reviewsSub} />
          <div className="rail grid gap-6 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <figure
                key={r.title.en}
                className="relative flex flex-col rounded-3xl bg-white p-7 shadow-sm ring-1 ring-black/5"
              >
                <span className="absolute top-5 right-7 font-serif text-7xl leading-none text-amber-brand/30">
                  “
                </span>
                <Stars
                  value={5}
                  className="w-fit rounded-full bg-amber-brand/15 px-3 py-1"
                  size={13}
                />
                <blockquote className="mt-5 flex-1 leading-relaxed text-ink/85">
                  {tr(r.text, lang)}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-full ring-2 ring-amber-brand/40">
                    <Image
                      src={r.avatar || r.photo}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-semibold text-ink">{tr(r.title, lang)}</span>
                    <span className="text-sm text-muted">● {tr(r.trip, lang)}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      {/* ========== CÂU HỎI THƯỜNG GẶP ========== */}
      <section className="py-14 lg:py-[4.5rem]">
        <Container className="grid items-start gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="lg:sticky lg:top-32">
            <h2 className="heading-lg text-ink">{t.faqTitle}</h2>
            <p className="mt-3 text-lg text-muted">{t.faqSub}</p>
            <a
              href={siteConfig.messaging.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-amber-brand px-6 font-bold text-ink hover:brightness-105"
            >
              {dict.common.chatWhatsApp}
            </a>
          </div>
          <div className="space-y-3">
            {t.faq.map((f, i) => (
              <details
                key={f.q}
                className="group rounded-2xl bg-[#f6f1e8] ring-1 ring-black/5 open:bg-white open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 p-5 font-semibold text-ink">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-sm font-bold text-[#a26a00] ring-1 ring-amber-brand/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{f.q}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-brand/20 text-[#a26a00] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 pl-[4.75rem] leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ========== FORM BÁO GIÁ + KÊNH LIÊN HỆ ========== */}
      <section id="quote" className="scroll-mt-28 pt-6 pb-14 lg:pt-8 lg:pb-[4.5rem]">
        <Container className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="heading-lg text-ink">{t.formTitle}</h2>
            <p className="mt-3 mb-6 text-lg text-muted">{t.formSubtitle}</p>
            <div className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,62,95,0.5)] ring-1 ring-border sm:p-7">
              <CarQuoteForm lang={lang} t={t} c={c} vehicles={vehicles} />
            </div>
          </div>
          <aside className="lg:sticky lg:top-32 lg:mt-24 lg:self-start">
            <div className="relative overflow-hidden rounded-3xl bg-white p-8 text-ink shadow-[0_30px_80px_-40px_rgba(60,40,10,0.35)] ring-1 ring-sand-300/70">
              <div className="absolute inset-0 bg-[radial-gradient(rgba(197,115,59,0.10)_1px,transparent_1px)] bg-[size:16px_16px]" />
              <div className="relative">
                <h3 className="text-2xl font-extrabold">{t.talkTitle}</h3>
                <p className="mt-2 text-muted">{t.talkText}</p>
                <a
                  href={`tel:${siteConfig.contact.hotlineRaw}`}
                  className="mt-6 flex items-center gap-4 rounded-2xl bg-cream-50 p-4 ring-1 ring-sand-300/70 transition hover:bg-cream-100 hover:ring-clay-500"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-amber-brand text-ink">
                    <Phone className="size-5" />
                  </span>
                  <span>
                    <span className="block text-xs text-muted">{t.hotline}</span>
                    <span className="text-xl font-extrabold text-forest-900">
                      {siteConfig.contact.hotline}
                    </span>
                  </span>
                </a>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    {
                      icon: WhatsAppIcon,
                      label: "WhatsApp",
                      color: "bg-[#25d366]",
                      href: siteConfig.messaging.whatsapp,
                    },
                    {
                      icon: ZaloIcon,
                      label: "Zalo",
                      color: "bg-white ring-1 ring-sand-300/70",
                      href: siteConfig.messaging.zalo,
                    },
                    {
                      icon: WeChatIcon,
                      label: "WeChat",
                      color: "bg-[#07c160]",
                      href: `${lp(lang)}/contact#wechat`,
                    },
                  ].map((m) => (
                    <a
                      key={m.label}
                      href={m.href}
                      target={m.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 rounded-2xl bg-cream-50 p-4 ring-1 ring-sand-300/70 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                    >
                      <span className={`grid size-11 place-items-center rounded-xl ${m.color}`}>
                        <m.icon className="size-6 text-white" />
                      </span>
                      <span className="text-sm font-semibold text-ink">{m.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative mt-6 h-56 overflow-hidden rounded-3xl">
              <Image
                src="/images/rent-car/1061814248554042666103-1.jpg"
                alt="Vietlook Kia Carnival fleet"
                fill
                sizes="(min-width: 1024px) 35vw, 100vw"
                className="object-cover"
              />
            </div>
          </aside>
        </Container>
      </section>
    </CarQuoteProvider>
  );
}
