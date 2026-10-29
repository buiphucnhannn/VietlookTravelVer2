import BgImage from "@/components/ui/BgImage";
import { AlertTriangle, CalendarDays, Clock3, FileCheck2, Info } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { tr } from "@/i18n/config";
import { JsonLd, pageMetadata } from "@/lib/seo";
import {
  airportCodes,
  airports,
  allPackages,
  fastTrackPackages,
  visaFaq,
  visaNotes,
  visaProcesses,
  visaTerms,
  visaTypes,
} from "@/data/visa";
import { Container, Reveal, SectionHeading } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import VisaForm from "@/components/forms/VisaForm";
import PackageGroups from "@/components/visa/PackageGroups";
import ProcessTabs from "@/components/visa/ProcessTabs";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/visa-fast-track",
    title: dict.visa.title,
    description: dict.visa.intro,
    image: "/images/tours/welcome-vietlook.png",
  });
}

/**
 * Trang Visa & Fast-track theo brief khách (mục 21–25):
 * 3 nhóm gói (Arrival 7 / Departure 5 / Add-ons 3) với giá theo 5 sân bay → quy trình 5 bước
 * (nhập cảnh / xuất cảnh / e-visa) → 2 lưu ý → thuật ngữ EN/ZH → bảng visa → form đặt.
 */
export default async function VisaPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const v = dict.visa;
  const c = { ...dict.common, fullName: dict.tour.fullName, phone: dict.tour.phone };

  const localize = (p) => ({
    ...p,
    label: tr(p.name, lang),
    text: tr(p.desc, lang),
  });
  const packages = Object.fromEntries(
    Object.entries(fastTrackPackages).map(([g, list]) => [g, list.map(localize)]),
  );
  const levels = allPackages().map(localize);
  const ap = airportCodes
    .map((code) => airports.find((a) => a.code === code))
    .map((a) => ({ ...a, label: tr(a.name, lang) }));
  const processes = Object.fromEntries(
    Object.entries(visaProcesses).map(([k, steps]) => [
      k,
      steps.map((s) => ({ icon: s.icon, title: tr(s.title, lang), text: tr(s.text, lang) })),
    ]),
  );
  const faq = visaFaq[lang] || visaFaq.en;

  return (
    <>
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

      <BrushHero
        title={v.title}
        subtitle={v.intro}
        images={[
          "/images/tours/welcome-vietlook.png",
          "/images/tours/v2/hanoi-34405373.jpg",
          "/images/tours/v2/ho-chi-minh-city-1018478.jpg",
        ]}
        breadcrumbs={[{ label: "Vietlook", href: "/" + lang }, { label: v.title }]}
      >
        <p className="mt-3 text-lg font-bold text-amber-brand drop-shadow">{v.subtitle}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="#fast-track"
            className="inline-flex h-12 items-center rounded-md bg-clay-500 px-6 font-semibold shadow-lg hover:bg-clay-600"
          >
            {v.fastTitle}
          </a>
          <a
            href="#visa"
            className="inline-flex h-12 items-center rounded-md border-2 border-white/70 px-6 font-semibold hover:bg-white hover:text-forest-900"
          >
            {v.typesTitle}
          </a>
        </div>
      </BrushHero>

      {/* 1. Gói fast-track theo 3 nhóm */}
      <section id="fast-track" className="scroll-mt-32 bg-cream-50 py-14 lg:py-[4.5rem]">
        <Container>
          <SectionHeading title={v.fastTitle} subtitle={v.fastSubtitle} />
          <PackageGroups
            packages={packages}
            airports={ap}
            labels={{
              groups: v.groups,
              groupSub: v.groupSub,
              priceByAirport: v.priceByAirport,
              perPax: v.perPax,
              book: v.bookPackage,
              popular: v.popular,
              contactPrice: v.contactPrice,
              from: dict.common.from,
            }}
          />
          <p className="mt-4 text-center text-xs text-muted">{v.dashNote}</p>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <Info className="size-4" /> {v.priceNote}
          </p>
        </Container>
      </section>

      {/* 2. Quy trình 5 bước: nhập cảnh / xuất cảnh / e-visa */}
      <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
        <BgImage src="/images/tours/v2/hanoi-34405373.jpg" tone="light" />
        <Container>
          <SectionHeading title={v.processTitle} subtitle={v.processSubtitle} />
          <ProcessTabs processes={processes} tabs={v.processTabs} />

          {/* 3. Hai lưu ý bắt buộc */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
            {visaNotes.map((n, i) => (
              <Reveal
                key={i}
                delay={i * 90}
                className="flex gap-3 rounded-2xl border border-amber-brand/40 bg-amber-brand/10 p-5"
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-clay-600" />
                <p className="text-sm leading-relaxed text-ink">
                  <span className="mr-1 font-bold text-clay-600">{v.notesTitle}:</span>
                  {tr(n, lang)}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. Thuật ngữ chuẩn EN / ZH */}
      <section className="bg-cream-100 py-14 lg:py-[4.5rem]">
        <Container>
          <SectionHeading title={v.termsTitle} subtitle={v.termsSubtitle} />
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visaTerms.map((x, i) => (
              <Reveal
                as="div"
                key={x.term.en}
                delay={(i % 4) * 70}
                className="rounded-2xl bg-white p-5 ring-1 ring-sand-300/70"
              >
                <dt className="font-bold text-forest-700">{tr(x.term, lang)}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink/75">{tr(x.def, lang)}</dd>
              </Reveal>
            ))}
          </dl>
        </Container>
      </section>

      {/* 5. Các loại visa */}
      <section id="visa" className="scroll-mt-32 py-14 lg:py-[4.5rem]">
        <Container>
          <SectionHeading title={v.typesTitle} />
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-sand-300/70">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-6 border-b border-sand-300/60 bg-cream-100 px-6 py-3.5 text-xs font-bold tracking-[0.12em] text-forest-700 uppercase md:grid">
              <span>{v.typeCol}</span>
              <span>{v.stay}</span>
              <span>{v.processing}</span>
              <span>{v.fee}</span>
            </div>
            {visaTypes.map((x) => {
              const [feeMain, feeSub] = tr(x.fee, lang).split(" · ");
              return (
                <div
                  key={x.key}
                  className="grid items-start gap-3 border-t border-sand-300/50 px-6 py-5 transition-colors first:border-0 hover:bg-cream-50 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)] md:gap-6"
                >
                  <div className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cream-100 text-forest-700">
                      <FileCheck2 className="size-5" />
                    </span>
                    <div>
                      <p className="font-bold text-ink">{tr(x.name, lang)}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">
                        {tr(x.note, lang)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted md:hidden">{v.stay}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1 text-sm font-medium text-forest-700">
                      <CalendarDays className="size-3.5" /> {tr(x.stay, lang)}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted md:hidden">{v.processing}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-brand/15 px-3 py-1 text-sm font-medium text-clay-600">
                      <Clock3 className="size-3.5 shrink-0" /> {tr(x.processing, lang)}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted md:hidden">{v.fee}</span>
                    <p className="font-bold text-ink">{feeMain}</p>
                    {feeSub && <p className="text-sm text-muted">{feeSub}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 size-4 shrink-0" /> {v.note}
          </p>
        </Container>
      </section>

      {/* 6. Form đặt + FAQ */}
      <section
        id="book-visa"
        className="relative isolate scroll-mt-32 overflow-clip bg-cream-50 py-14 lg:py-[4.5rem]"
      >
        <BgImage src="/images/tours/v2/ho-chi-minh-city-1018478.jpg" tone="mist" />
        <Container className="grid items-start gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sand-300/70 sm:p-8">
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-ink">{v.formTitle}</h2>
            <VisaForm
              lang={lang}
              t={v}
              c={c}
              airports={ap}
              levels={levels}
              groupLabels={v.groups}
            />
          </div>
          <div className="lg:sticky lg:top-32">
            <h2 className="mb-5 text-2xl font-bold text-ink">{v.faqTitle}</h2>
            <div className="space-y-3">
              {faq.map((f, i) => (
                <details
                  key={f.q}
                  open={i === 0}
                  className="group rounded-2xl bg-white ring-1 ring-sand-300/70"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-semibold text-ink">
                    {f.q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cream-100 text-clay-600 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
