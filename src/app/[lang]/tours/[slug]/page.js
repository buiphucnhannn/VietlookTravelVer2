import { Suspense } from "react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { notFound } from "next/navigation";
import { Check, Clock, Headphones, MapPin, MessageCircle, Plane, UserRound, X } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { fill, href, locales, lp, tr } from "@/i18n/config";
import { cardLabels } from "@/lib/labels";
import { formatUSD } from "@/lib/utils";
import { JsonLd, pageMetadata, notFoundMetadata } from "@/lib/seo";
import { siteConfig } from "@/constants/site";
import { getDestination } from "@/data/destinations";
import { getTheme } from "@/data/themes";
import { allTours, getTour, relatedTours, toCard, tourText } from "@/data/tours";
import { Breadcrumbs, Container, SectionHeading, Stars } from "@/components/ui";
import TourCard from "@/components/tours/TourCard";
import TourGallery from "@/components/tours/TourGallery";
import StickyTabs from "@/components/tours/StickyTabs";
import BookingWidget from "@/components/tours/BookingWidget";
import StickySide from "@/components/ui/StickySide";
import PriceTable from "@/components/tours/PriceTable";
import MobileBookBar from "@/components/tours/MobileBookBar";
import YouTubeLite from "@/components/ui/YouTubeLite";
import { GoogleIcon, TripAdvisorIcon, WeChatIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { reviews as allReviews } from "@/data/reviews";

export function generateStaticParams() {
  return locales.flatMap((lang) => allTours.map((t) => ({ lang, slug: t.slug })));
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const tour = getTour(slug);
  if (!tour) return notFoundMetadata();
  const tx = tourText(tour, lang);
  const title = tr(tour.title, lang);
  const meta = pageMetadata({
    lang,
    path: `/tours/${slug}`,
    title,
    description: tourDescription(tour, tx, lang),
    image: tour.image,
  });
  return meta;
}

/**
 * Description cho Google: dùng phần tóm tắt nếu đủ ý; nếu tóm tắt quá ngắn hoặc chỉ là dòng giờ giấc
 * ("Departure time: 12:30…") thì ghép từ dữ liệu thật của tour: số ngày, điểm đến, điểm nổi bật.
 */
function tourDescription(tour, tx, lang) {
  const summary = String(tx.summary || "").trim();
  const weak =
    summary.length < 80 || /^(\d{1,2}[:h.]\d{2}|departure|check-in|出发|\d{1,2}：)/i.test(summary);
  if (!weak) return summary;
  const card = toCard(tour, lang);
  const dest = card.destinationNames.slice(0, 4);
  // Bỏ các dòng chỉ là tiêu đề mục (vd. "Course Information")
  const hl = (tx.highlights || []).filter((h) => h.length >= 20 && !/[:：]$/.test(h)).slice(0, 2);
  if (lang === "zh") {
    return `${tx.title}——${tour.days > 1 ? `${tour.days}天` : "一日"}私人线路${
      dest.length ? `，途经${dest.join("、")}` : ""
    }。${hl.length ? `${hl.join("；")}。` : ""}由 Vietlook Travel 本地地接社安排。`;
  }
  return `${tx.title} – ${tour.days > 1 ? `${tour.days}-day` : "1-day"} private tour${
    dest.length ? ` in ${dest.join(", ")}` : ""
  }. ${hl.length ? `${hl.join("; ")}. ` : ""}Arranged by Vietlook Travel, local tour operator since 2009.`;
}

function Card({ id, eyebrow, title, children }) {
  return (
    <section
      id={id}
      className="scroll-mt-40 rounded-2xl bg-white p-6 shadow-[0_2px_20px_-10px_rgba(15,62,95,0.25)] ring-1 ring-border sm:p-8"
    >
      <p className="text-xs font-bold tracking-[0.18em] text-clay-600 uppercase">{eyebrow}</p>
      <h2 className="mt-2 mb-6 text-3xl font-bold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

async function TourPageContent({ params }) {
  const { lang, slug } = await params;
  const tour = getTour(slug);
  if (!tour) notFound();
  const dict = await getDictionary(lang);
  const t = dict.tour;
  const c = dict.common;
  const tx = tourText(tour, lang);
  const title = tx.title;
  const destNames = tour.destinations.map((d) => tr(getDestination(d)?.name, lang)).filter(Boolean);
  const duration =
    tour.days <= 1
      ? tour.halfDay
        ? c.halfDay
        : `1 ${c.day}`
      : `${tour.days} ${c.days} / ${tour.nights} ${c.nights}`;

  const tabs = [
    { id: "overview", label: t.overview },
    tx.itinerary.length > 0 && { id: "itinerary", label: t.itinerary },
    { id: "included", label: t.included },
    tx.priceTables.length > 0 && { id: "prices", label: t.pricing },
    { id: "departures", label: t.departures },
    { id: "faq", label: t.faqTitle },
    { id: "reviews", label: t.reviewsTitle },
    { id: "video", label: t.video },
  ].filter(Boolean);

  // FAQ theo tour (yêu cầu SEO: mỗi tour có FAQ + review thật)
  const faq = t.faq.map((f) => ({
    q: fill(f.q, { title, dest: destNames.join(lang === "zh" ? "、" : ", ") || "Vietnam" }),
    a: fill(f.a, { title, dest: destNames.join(lang === "zh" ? "、" : ", ") || "Vietnam" }),
  }));
  // Review thật: ưu tiên review có điểm đến trùng với tour, bổ sung cho đủ 3
  const destEn = tour.destinations.map((d) => getDestination(d)?.name?.en).filter(Boolean);
  const matched = allReviews.filter((r) => destEn.some((n) => r.trip.en.includes(n)));
  const tourReviews = [...matched, ...allReviews.filter((r) => !matched.includes(r))].slice(0, 3);

  const related = relatedTours(tour, 4).map((x) => toCard(x, lang));
  const labels = cardLabels(dict);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: title,
    description: tx.summary,
    image: tour.gallery.map((g) => `${siteConfig.url}${g}`),
    touristType: tour.themes,
    itinerary: {
      "@type": "ItemList",
      itemListElement: tx.itinerary.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: d.title,
      })),
    },
    provider: { "@type": "TravelAgency", name: siteConfig.legalName, url: siteConfig.url },
    ...(tour.price && {
      offers: {
        "@type": "Offer",
        price: tour.price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${siteConfig.url}${lp(lang)}/tours/${slug}`,
      },
    }),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <Container className="pt-6 sm:pt-8">
        <Breadcrumbs
          baseUrl={siteConfig.url}
          className="mb-5"
          items={[
            { label: "Vietlook", href: href(lang) },
            { label: dict.nav.tours, href: `${lp(lang)}/tours` },
            ...(tour.destinations[0]
              ? [{ label: destNames[0], href: `${lp(lang)}/destinations/${tour.destinations[0]}` }]
              : []),
            { label: title },
          ]}
        />
        <TourGallery images={tour.gallery} title={title} label={t.gallery} />
      </Container>

      <Container className="grid gap-8 py-8 lg:grid-cols-[1fr_400px] lg:items-center lg:py-10">
        <div>
          <div className="flex flex-wrap gap-2">
            {tour.themes.slice(0, 3).map((th) => (
              <a
                key={th}
                href={`${lp(lang)}/themes/${th}`}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
              >
                {tr(getTheme(th)?.name, lang)}
              </a>
            ))}
          </div>
          <h1 className="mt-4 text-4xl leading-[1.08] font-bold tracking-[-0.03em] text-ink sm:text-5xl">
            {title}
          </h1>
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {[
              { icon: Clock, a: duration, b: c.duration },
              { icon: UserRound, a: t.privateTour, b: t.fullyCustom },
              { icon: Headphones, a: t.localSupport, b: t.viaWhatsApp },
            ].map((f) => (
              <div key={f.b} className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <f.icon className="size-5" />
                </span>
                <span className="leading-tight">
                  <span className="block font-semibold text-ink">{f.a}</span>
                  <span className="text-sm text-muted">{f.b}</span>
                </span>
              </div>
            ))}
          </div>
          {destNames.length > 0 && (
            /* Dòng điểm đến căn giữa theo chiều ngang của cột trái */
            <p className="mt-7 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
              <MapPin className="size-5 text-sun-500" />
              {tour.destinations.map((d, i) => (
                <a
                  key={d}
                  href={`${lp(lang)}/destinations/${d}`}
                  className="font-medium text-ink hover:text-brand-600"
                >
                  {destNames[i]}
                  {i < destNames.length - 1 && <span className="ml-2 text-muted">·</span>}
                </a>
              ))}
            </p>
          )}
        </div>

        {/* Thẻ giá kiểu localvietnam */}
        <aside className="rounded-2xl bg-surface p-6 ring-1 ring-border">
          <div className="flex items-start justify-between">
            <div>
              {/* Giá gốc gạch ngang nằm cùng dòng "From" → không tăng chiều cao khối */}
              <p className="text-sm text-muted">
                {c.from}
                {tour.price && tour.originalPrice && (
                  <span className="ml-2 text-base font-medium text-muted/80 line-through decoration-sun-500/70 decoration-2">
                    {formatUSD(tour.originalPrice)}
                  </span>
                )}
              </p>
              {tour.price ? (
                <>
                  <p className="text-4xl font-extrabold tracking-tight text-sun-500">
                    {formatUSD(tour.price)}
                  </p>
                  <p className="text-sm text-muted">{c.perPerson}</p>
                </>
              ) : (
                <p className="mt-1 text-2xl font-bold text-brand-700">{c.priceOnRequest}</p>
              )}
            </div>
            <div className="flex flex-col items-center text-center">
              <TripAdvisorIcon className="size-10 text-[#00af87]" />
              <span className="text-[0.65rem] leading-tight font-semibold text-ink">
                {t.tripadvisor}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Stars value={5} />
            <span className="font-semibold text-ink">{c.ratingShort}</span>
            <span className="text-muted">({c.reviewsN})</span>
          </div>
          <a
            href="#book"
            className="mt-5 flex h-12 items-center justify-center rounded-md bg-sun-500 font-semibold text-white shadow-md transition hover:bg-sun-600"
          >
            {c.bookNow}
          </a>
          <a
            href={`${siteConfig.messaging.whatsapp}?text=${encodeURIComponent(`Hi Vietlook, I'm interested in: ${title}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-12 items-center justify-center gap-2 rounded-md border-2 border-brand-600 font-semibold text-brand-700 transition hover:bg-brand-600 hover:text-white"
          >
            <MessageCircle className="size-4" /> {c.quickAdvice}
          </a>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
            <WhatsAppIcon className="size-4 text-[#25d366]" />
            <WeChatIcon className="size-4 text-[#07c160]" /> {t.askTitle}
          </p>
        </aside>
      </Container>

      <StickyTabs tabs={tabs} cta={{ href: "#book", label: c.bookNow }} />

      <div className="bg-gradient-to-b from-surface to-white">
        <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_400px]">
          <div className="min-w-0 space-y-6">
            <Card id="overview" eyebrow={t.overview} title={t.overview}>
              <p className="text-lg leading-relaxed text-ink/85">{tx.summary}</p>
              {tx.route.length > 1 && (
                <div className="mt-8">
                  <p className="text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">
                    {t.yourJourney}
                  </p>
                  <h3 className="mt-1 mb-4 text-2xl font-bold text-ink">{t.route}</h3>
                  {/* 2 cột trên màn rộng để lộ trình dài không kéo dài trang */}
                  <ol className="grid gap-x-8 sm:grid-cols-2">
                    {tx.route.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 border-b border-border py-2.5">
                        <span className="mt-0.5 grid h-6 min-w-14 shrink-0 place-items-center rounded-full bg-brand-50 px-2 text-xs font-bold text-brand-700 capitalize">
                          {c.day} {i + 1}
                        </span>
                        <span className="text-[0.95rem] leading-snug text-ink/85">{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {tx.highlights.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-3 text-2xl font-bold text-ink">{t.highlights}</h3>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {tx.highlights.map((h) => (
                      <li key={h} className="flex gap-2.5 text-ink/85">
                        <Check className="mt-1 size-4 shrink-0 text-brand-500" /> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {tx.itinerary.length > 0 && (
              <Card id="itinerary" eyebrow={t.yourJourney} title={t.itinerary}>
                <div className="space-y-3">
                  {tx.itinerary.map((d, i) => (
                    <details
                      key={i}
                      className="group rounded-xl ring-1 ring-border open:ring-brand-200"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-4 p-3.5 sm:px-5 sm:py-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-center text-white">
                          <span className="text-[0.6rem] leading-none font-semibold uppercase">
                            {c.day}
                          </span>
                          <span className="-mt-2 text-lg leading-none font-bold">{d.day}</span>
                        </span>
                        <span className="flex-1 font-semibold text-ink">{d.title}</span>
                        <span className="grid size-8 place-items-center rounded-full bg-surface text-lg text-brand-600 transition group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      {d.html && (
                        <div
                          className="prose-guide border-t border-border px-5 pt-1 pb-5 text-base sm:px-6"
                          dangerouslySetInnerHTML={{ __html: d.html }}
                        />
                      )}
                    </details>
                  ))}
                </div>
              </Card>
            )}

            <Card id="included" eyebrow={t.included} title={t.included}>
              {tx.included.length || tx.excluded.length ? (
                <div className="grid gap-8 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-3 font-bold text-brand-700">{t.includes}</h3>
                    <ul className="space-y-2.5">
                      {tx.included.map((x) => (
                        <li key={x} className="flex gap-2.5 text-ink/85">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600">
                            <Check className="size-3.5" />
                          </span>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-3 font-bold text-sun-600">{t.excludes}</h3>
                    <ul className="space-y-2.5">
                      {tx.excluded.map((x) => (
                        <li key={x} className="flex gap-2.5 text-ink/85">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sun-100 text-sun-600">
                            <X className="size-3.5" />
                          </span>
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-ink/80">{t.inclusionsOnRequest}</p>
              )}
              {(tx.childPolicy || tx.notes) && (
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {tx.childPolicy && (
                    <div className="rounded-xl bg-surface p-4 text-sm leading-relaxed text-ink/80">
                      <p className="mb-1 font-bold text-ink">{t.childPolicyTitle}</p>
                      {tx.childPolicy}
                    </div>
                  )}
                  {tx.notes && (
                    <div className="rounded-xl bg-surface p-4 text-sm leading-relaxed text-ink/80">
                      <p className="mb-1 font-bold text-ink">{t.notesTitle}</p>
                      {tx.notes}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {tx.priceTables.length > 0 && (
              <Card id="prices" eyebrow={t.pricing} title={t.pricing}>
                <div className="space-y-6">
                  {tx.priceTables.map((tb, i) => (
                    <PriceTable key={i} table={tb} />
                  ))}
                  <p className="text-sm text-muted">{t.holidaySurcharge}</p>
                </div>
              </Card>
            )}

            <Card id="departures" eyebrow={t.departures} title={t.departures}>
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-3 rounded-xl bg-brand-50 px-5 py-4">
                  <Plane className="size-6 text-brand-600" />
                  <span>
                    <span className="block font-bold text-ink">{t.dailyDeparture}</span>
                    <span className="text-sm text-muted">{t.departureCardNote}</span>
                  </span>
                </span>
                <a href="#book" className="font-semibold text-sun-500 hover:underline">
                  {c.bookNow}
                </a>
              </div>
            </Card>

            <Card id="faq" eyebrow={t.faqEyebrow} title={t.faqTitle}>
              <div className="divide-y divide-sand-300/60 overflow-hidden rounded-xl ring-1 ring-sand-300/60">
                {faq.map((f, i) => (
                  <details key={f.q} open={i === 0} className="group bg-cream-50/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-ink">
                      {f.q}
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-clay-600 ring-1 ring-sand-300/70 transition group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="px-5 pb-5 leading-relaxed text-muted">
                      {f.a}
                      {i === 3 && (
                        <a
                          href={`${lp(lang)}/policies/payment`}
                          className="ml-1 font-semibold text-clay-600 hover:underline"
                        >
                          →
                        </a>
                      )}
                      {i === 4 && (
                        <a
                          href={`${lp(lang)}/policies/cancellation`}
                          className="ml-1 font-semibold text-clay-600 hover:underline"
                        >
                          →
                        </a>
                      )}
                    </p>
                  </details>
                ))}
              </div>
            </Card>

            <Card id="reviews" eyebrow={t.reviewsEyebrow} title={t.reviewsTitle}>
              <div className="grid gap-4 md:grid-cols-3">
                {tourReviews.map((r) => (
                  <figure
                    key={r.title.en}
                    className="flex flex-col rounded-2xl border border-sand-300/70 bg-cream-50 p-5"
                  >
                    <Stars value={r.rating} size={14} />
                    <p className="mt-2 font-bold text-forest-700">{tr(r.title, lang)}</p>
                    <blockquote className="mt-2 line-clamp-5 flex-1 text-sm leading-relaxed text-ink/80">
                      {tr(r.text, lang)}
                    </blockquote>
                    <figcaption className="mt-4 flex items-center justify-between gap-2 border-t border-sand-300/60 pt-3 text-xs text-muted">
                      <span className="truncate">{tr(r.trip, lang)}</span>
                      {r.source === "google" ? (
                        <GoogleIcon className="size-4 shrink-0" />
                      ) : (
                        <TripAdvisorIcon className="size-5 shrink-0 text-[#00af87]" />
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <a
                href={siteConfig.social.tripadvisor}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 font-semibold text-clay-600 hover:underline"
              >
                <TripAdvisorIcon className="size-5 text-[#00af87]" /> {t.reviewsMore}
              </a>
            </Card>

            <Card id="video" eyebrow={t.watchDream} title={t.videoTitle}>
              <div className="overflow-hidden rounded-xl">
                <YouTubeLite
                  id={siteConfig.youtubeIds[0]}
                  title="Discovering The Timeless Beauty With Vietlook Travel"
                />
              </div>
            </Card>
          </div>

          {/* Khối đặt tour dính bên phải */}
          <div id="book" className="scroll-mt-36">
            <StickySide className="rounded-2xl bg-white p-5 shadow-[0_24px_60px_-30px_rgba(15,62,95,0.5)] ring-1 ring-border xl:p-6 short:p-5">
              <h2 className="mb-3.5 text-xl font-bold tracking-tight text-ink">{t.bookTitle}</h2>
              <BookingWidget
                lang={lang}
                tour={{
                  slug: tour.slug,
                  title,
                  code: tour.code,
                  price: tour.price,
                  originalPrice: tour.originalPrice,
                  days: tour.days,
                }}
                t={t}
                c={c}
              />
            </StickySide>
          </div>
        </Container>
      </div>

      <MobileBookBar
        price={tour.price}
        originalPrice={tour.originalPrice}
        labels={{
          from: c.from,
          perPerson: c.perPerson,
          contactPrice: c.contactPrice,
          bookNow: c.bookNow,
        }}
      />

      <section className="py-14 lg:py-[4.5rem]">
        <Container>
          <SectionHeading title={t.related} />
          <div className="rail grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((card) => (
              <TourCard key={card.slug} card={card} lang={lang} labels={labels} />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

// Đọc params bên trong <Suspense> để điều hướng hiển thị tức thì (khung chờ),
// nội dung vẫn được prerender sẵn nhờ generateStaticParams.
export default function TourPage(props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TourPageContent {...props} />
    </Suspense>
  );
}
