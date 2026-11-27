import BgImage from "@/components/ui/BgImage";
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
import { carRoutes, quoteRoutes } from "@/data/cars";
import { carPageData, fleetPhotos } from "@/data/car-gallery";
import { getCatalog, getContactInfo, getReviews } from "@/lib/catalog";
import { getPageText } from "@/lib/page-copy/server";
import { Breadcrumbs, Container, Reveal, SectionHeading, Stars } from "@/components/ui";
import { CarQuoteForm, CarQuoteProvider, QuickQuote } from "@/components/car/CarQuote";
import FleetStage from "@/components/car/FleetStage";
import FleetMarquee from "@/components/car/FleetMarquee";
import RoutesExplorer from "@/components/car/RoutesExplorer";
import ReviewSource from "@/components/home/ReviewSource";
import { WeChatIcon, WhatsAppIcon, ZaloIcon } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/utils";
import { subgrid } from "@/lib/subgrid";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = await getPageText("car-rental", lang, dict);
  return pageMetadata({
    lang,
    path: "/car-rental",
    title: p.heroEyebrow,
    description: p.heroText,
    image: p.asideImage,
  });
}

export default async function CarRentalPage({ params }) {
  const { fleet, carAreas } = await getCatalog();
  // 3 đánh giá đầu tiên được chọn hiện ở trang Thuê xe (CMS → Đánh giá khách)
  const reviews = (await getReviews("car")).slice(0, 3);
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.car;
  // Chữ / ảnh sửa được trong CMS → Giao diện trang → Thuê xe (chưa sửa = đúng chữ trong từ điển, ảnh có sẵn)
  const p = await getPageText("car-rental", lang, dict);
  const info = await getContactInfo(); // CMS → Cài đặt → Thông tin liên hệ
  const c = {
    ...dict.common,
    fullName: dict.tour.fullName,
    phone: dict.tour.phone,
    notes: dict.tour.notes,
  };
  const { exterior, interior } = fleetPhotos();
  const half = Math.ceil(exterior.length / 2);

  const { fleetData, areas, routes, classes, vehicles, placeList } = carPageData(
    { fleet, carAreas },
    lang,
  );
  const trustIcons = [Plane, Clock, Languages, Ticket];

  const serviceIcons = [Plane, Map, Signpost, CalendarCheck, Users, Globe2];
  const includedIcons = [Ticket, Plane, Clock, BadgeCheck, Gem, Languages];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Private car hire with driver",
    provider: { "@type": "TravelAgency", name: info.legalName },
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
      {/* Hero: ẢNH THẬT xe chạy trên đèo Hà Giang (yêu cầu 31/10, mục 2 – bớt cảm giác ảnh minh hoạ).
          Ảnh: Pexels #28315416 (giấy phép miễn phí thương mại). */}
      <section className="relative isolate flex flex-col overflow-hidden bg-[#0b1b2b] text-white lg:min-h-[min(100svh,960px)]">
        <Image
          src={p.heroImage}
          alt="Private car on the Ha Giang mountain pass, Vietnam"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[50%_70%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b1b2b]/90 via-[#0b1b2b]/55 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1b2b]/70 via-transparent to-transparent" />

        <Container className="grid flex-1 items-center gap-10 pt-28 pb-12 lg:grid-cols-[1fr_440px] lg:gap-12 lg:pt-[140px] lg:pb-14 xl:grid-cols-[1fr_460px] xl:gap-16">
          <div>
            <Breadcrumbs
              light
              className="mb-5"
              items={[{ label: "Vietlook", href: href(lang) }, { label: p.heroEyebrow }]}
            />
            <p className="flex items-center gap-2 text-sm font-bold tracking-[0.18em] text-amber-brand uppercase">
              <Car className="size-4" /> {p.heroEyebrow}
            </p>
            <h1 className="mt-4 text-4xl leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-5xl xl:text-[3.4rem]">
              {p.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed whitespace-pre-line text-white/80">
              {p.heroText}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#quote"
                className="inline-flex h-12 items-center rounded-xl bg-amber-brand px-7 font-bold text-ink shadow-lg shadow-amber-brand/25 transition hover:brightness-105 max-sm:px-5 sm:h-13"
              >
                {p.ctaQuote}
              </a>
              <a
                href="#fleet"
                className="inline-flex h-12 items-center rounded-xl border-2 border-white/40 px-7 font-semibold transition hover:bg-white hover:text-ink max-sm:px-5 sm:h-13"
              >
                {p.ctaFleet}
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
              {p.perks.map((x, i) => (
                <li key={i} className="flex items-center gap-2.5 font-medium">
                  <CheckCircle2 className="size-5 text-amber-brand" /> {x}
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
      </section>

      {/* ========== DẢI ĐIỂM MẠNH (như hltcarservice.com) ========== */}
      <section className="border-t-2 border-amber-brand bg-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.3)]">
        <Container>
          <ul className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
            {p.trust.map((x, i) => {
              const Icon = trustIcons[i];
              return (
                // Từ sm: subgrid 2 hàng (tiêu đề · mô tả), biểu tượng chiếm cả 2 hàng → các ô thẳng hàng nhau
                <li
                  key={i}
                  className="flex items-center gap-4 sm:row-span-2 sm:grid sm:grid-cols-[auto_1fr] sm:grid-rows-subgrid sm:items-start sm:gap-y-0 lg:px-6 lg:first:pl-0"
                >
                  <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-amber-brand/15 text-[#a26a00] sm:row-span-2 sm:self-center">
                    <Icon className="size-5" />
                  </span>
                  <span className="leading-tight sm:contents">
                    <span className="block font-bold text-ink">{x.title}</span>
                    <span className="text-sm text-muted">{x.text}</span>
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
            <h2 className="heading-lg text-white">{p.fleetTitle}</h2>
            <p className="mt-3 text-white/70">{p.fleetSubtitle}</p>
          </header>
          <FleetStage
            lang={lang}
            fleet={fleetData}
            t={{ ...t, contactPrice: dict.common.contactPrice }}
          />
        </Container>
      </section>

      {/* ========== DỊCH VỤ ========== */}
      <section id="services" className="scroll-mt-28 py-14 lg:py-[4.5rem]">
        <Container>
          <header className="mb-10 max-w-2xl">
            <h2 className="heading-lg text-ink">{p.servicesTitle}</h2>
            <span className="mt-4 block h-1 w-14 rounded-full bg-amber-brand" />
          </header>
          <div className="rail grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {p.services.map((s, i) => {
              const Icon = serviceIcons[i];
              return (
                <Reveal key={i} delay={(i % 3) * 80} className={subgrid(3, "sm")}>
                  <div
                    className={cn(
                      "group relative h-full overflow-hidden rounded-3xl bg-surface p-7 transition duration-300 hover:-translate-y-1 hover:bg-brand-950 hover:text-white",
                      subgrid(3, "sm"),
                    )}
                  >
                    <span className="absolute -top-8 -right-8 size-32 rounded-full bg-amber-brand/15 transition-transform duration-500 group-hover:scale-150" />
                    <span className="relative grid size-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm transition group-hover:bg-amber-brand group-hover:text-ink">
                      <Icon className="size-6" />
                    </span>
                    <h3 className="relative mt-5 text-xl font-bold">{s.title}</h3>
                    <p className="relative mt-2 leading-relaxed whitespace-pre-line text-muted transition group-hover:text-white/75">
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
            <h2 className="heading-lg text-ink">{p.routesTitle}</h2>
            <p className="mt-3 text-lg text-muted">{p.routesSubtitle}</p>
          </header>
          <RoutesExplorer areas={areas} routes={routes} classes={classes} t={t} lang={lang} />
        </Container>
      </section>

      {/* ========== KHU VỰC PHỤC VỤ TOÀN QUỐC ========== */}
      <section className="py-14 lg:py-[4.5rem]">
        <Container>
          <header className="mb-10 max-w-2xl">
            <h2 className="heading-lg text-ink">{p.areasTitle}</h2>
            <p className="mt-3 text-lg text-muted">{p.areasSubtitle}</p>
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
              <p className="mt-3 font-bold whitespace-pre-line text-ink">{p.areasMore}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ========== GIÁ ĐÃ BAO GỒM ========== */}
      <section className="relative isolate overflow-hidden pt-8 pb-14 lg:pt-10 lg:pb-[4.5rem]">
        <BgImage src={p.includedImage} tone="light" />
        <Container>
          <header className="mb-10 max-w-2xl">
            <h2 className="heading-lg text-ink">{p.includedTitle}</h2>
            <span className="mt-4 block h-1 w-14 rounded-full bg-amber-brand" />
          </header>
          <div className="rail grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {p.included.map((x, i) => {
              const Icon = includedIcons[i];
              return (
                <div
                  key={i}
                  className={cn(
                    "relative overflow-hidden rounded-3xl border border-border bg-white p-7",
                    subgrid(3, "sm"),
                  )}
                >
                  <span className="absolute top-3 right-5 text-6xl font-extrabold text-amber-brand/15">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="grid size-12 place-items-center rounded-xl bg-amber-brand/15 text-[#a26a00]">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{x.title}</h3>
                  <p className="mt-1.5 whitespace-pre-line text-muted">{x.text}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ========== DẢI ẢNH ĐỘI XE (marquee) ========== */}
      <section className="overflow-hidden bg-surface py-14 lg:py-[4.5rem]">
        <Container className="mb-8 text-center lg:mb-10">
          <h2 className="heading-lg text-ink">{p.galleryTitle}</h2>
          <p className="mt-3 text-lg text-muted">{p.gallerySubtitle}</p>
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
        <BgImage src={p.howImage} tone="night" />
        <div className="absolute -top-40 -right-40 size-[520px] rounded-full bg-amber-brand/10 blur-3xl" />
        <Container className="relative">
          <h2 className="heading-lg">{p.howTitle}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {p.how.map((s, i) => {
              const Icon = [CalendarCheck, MapPinned, ShieldCheck][i];
              return (
                <Reveal
                  key={i}
                  delay={i * 120}
                  className={cn(
                    "relative rounded-3xl bg-white/5 p-7 ring-1 ring-white/10",
                    subgrid(3, "md"),
                  )}
                >
                  <span className="relative inline-grid size-14 place-items-center rounded-2xl bg-white/10 text-amber-brand">
                    <Icon className="size-6" />
                    <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-amber-brand text-sm font-bold text-ink">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-6 text-2xl font-bold">{s.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-white/70">{s.text}</p>
                  {i < 2 && (
                    <span className="route-dash absolute top-14 -right-6 hidden h-0.5 w-6 text-amber-brand md:block" />
                  )}
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ========== KHÁCH HÀNG NÓI GÌ (CMS → Đánh giá khách; không có đánh giá → ẩn khối) ========== */}
      {reviews.length > 0 && (
        <section className="bg-[#f6f1e8] py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={p.reviewsTitle} subtitle={p.reviewsSub} />
            <div className="rail grid gap-6 md:grid-cols-3">
              {reviews.map((r) => (
                <figure
                  key={r.id}
                  className={cn(
                    "relative flex flex-col rounded-3xl bg-white p-7 shadow-sm ring-1 ring-black/5 transition-transform duration-300 has-[a:hover]:-translate-y-1",
                    subgrid(3, "md"),
                  )}
                >
                  <span className="absolute top-5 right-7 font-serif text-7xl leading-none text-amber-brand/30">
                    “
                  </span>
                  <Stars
                    value={r.rating}
                    className="w-fit rounded-full bg-amber-brand/15 px-3 py-1"
                    size={13}
                  />
                  <blockquote className="mt-5 flex-1 leading-relaxed whitespace-pre-line text-ink/85">
                    {r.text}
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5 md:self-start">
                    {/* chữ cái đầu tên khách (không dùng ảnh minh hoạ ở chỗ ảnh đại diện — tránh hiểu nhầm là ảnh của khách) */}
                    <span
                      aria-hidden
                      className="grid size-12 shrink-0 place-items-center rounded-full bg-forest-700 text-lg font-bold text-white uppercase ring-2 ring-amber-brand/40"
                    >
                      {(r.name || "?").trim()[0]}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate font-semibold text-ink">{r.name}</span>
                      <span className="block text-sm text-muted">{tr(r.trip, lang)}</span>
                      <ReviewSource
                        review={r}
                        lang={lang}
                        t={{ ...dict.home, reviewsVerified: "Tripadvisor" }}
                        stretch
                      />
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ========== CÂU HỎI THƯỜNG GẶP ========== */}
      <section className="py-14 lg:py-[4.5rem]">
        <Container className="grid items-start gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="lg:sticky lg:top-32">
            <h2 className="heading-lg text-ink">{p.faqTitle}</h2>
            <p className="mt-3 text-lg text-muted">{p.faqSub}</p>
            <a
              href={info.messaging.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-amber-brand px-6 font-bold text-ink hover:brightness-105"
            >
              {dict.common.chatWhatsApp}
            </a>
          </div>
          <div className="space-y-3">
            {p.faq.map((f, i) => (
              <details
                key={i}
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
                <p className="px-5 pb-5 pl-[4.75rem] leading-relaxed whitespace-pre-line text-muted">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ========== FORM BÁO GIÁ + KÊNH LIÊN HỆ ========== */}
      <section id="quote" className="scroll-mt-28 pt-6 pb-14 lg:pt-8 lg:pb-[4.5rem]">
        <Container className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="heading-lg text-ink">{p.formTitle}</h2>
            <p className="mt-3 mb-6 text-lg text-muted">{p.formSubtitle}</p>
            <div className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,62,95,0.5)] ring-1 ring-border sm:p-7">
              <CarQuoteForm lang={lang} t={t} c={c} vehicles={vehicles} />
            </div>
          </div>
          <aside className="lg:sticky lg:top-32 lg:mt-24 lg:self-start">
            <div className="relative overflow-hidden rounded-3xl bg-white p-8 text-ink shadow-[0_30px_80px_-40px_rgba(60,40,10,0.35)] ring-1 ring-sand-300/70">
              <div className="absolute inset-0 bg-[radial-gradient(rgba(197,115,59,0.10)_1px,transparent_1px)] bg-[size:16px_16px]" />
              <div className="relative">
                <h3 className="text-2xl font-extrabold">{p.talkTitle}</h3>
                <p className="mt-2 text-muted">{p.talkText}</p>
                <a
                  href={`tel:${info.contact.hotlineRaw}`}
                  className="mt-6 flex items-center gap-4 rounded-2xl bg-cream-50 p-4 ring-1 ring-sand-300/70 transition hover:bg-cream-100 hover:ring-clay-500"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-amber-brand text-ink">
                    <Phone className="size-5" />
                  </span>
                  <span>
                    <span className="block text-xs text-muted">{t.hotline}</span>
                    <span className="text-xl font-extrabold text-forest-900">
                      {info.contact.hotline}
                    </span>
                  </span>
                </a>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    {
                      icon: WhatsAppIcon,
                      label: "WhatsApp",
                      color: "bg-[#25d366]",
                      href: info.messaging.whatsapp,
                    },
                    {
                      icon: ZaloIcon,
                      label: "Zalo",
                      color: "bg-white ring-1 ring-sand-300/70",
                      href: info.messaging.zalo,
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
                src={p.asideImage}
                alt="Private MPV with captain seats"
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
