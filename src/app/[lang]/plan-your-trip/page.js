import Image from "next/image";
import { CheckCircle2, Clock } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";
import { plannerOptions } from "@/data/destinations";
import { Breadcrumbs, Container } from "@/components/ui";
import TripPlannerForm from "@/components/forms/TripPlannerForm";
import { href } from "@/i18n/config";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/plan-your-trip",
    title: dict.home.plannerTitle,
    description: dict.home.plannerSubtitle,
    image: "/images/tours/v2/sapa-235925.jpg",
  });
}

export default async function PlanYourTripPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return (
    <section className="relative isolate overflow-clip bg-brand-950 pt-28 pb-16 lg:flex lg:min-h-[min(100svh,960px)] lg:items-center lg:pt-[120px] lg:pb-12">
      <Image
        src="/images/tours/v2/sapa-235925.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover opacity-50"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-950 via-brand-950/80 to-brand-900/40" />
      <Container className="grid items-start gap-10 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="text-white lg:sticky lg:top-32">
          <Breadcrumbs
            light
            items={[{ label: "Vietlook", href: href(lang) }, { label: dict.nav.planTrip }]}
          />
          <h1 className="heading-xl mt-6">{dict.home.plannerTitle}</h1>
          <p className="mt-4 text-lg text-white/80">{dict.home.plannerSubtitle}</p>
          <ul className="mt-8 space-y-3">
            {dict.home.customPoints.map((p) => (
              <li key={p} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-brand" /> {p}
              </li>
            ))}
          </ul>
          <p className="mt-8 flex items-center gap-2 text-sm text-white/70">
            <Clock className="size-4" /> {dict.common.weReply}
          </p>
        </div>
        <TripPlannerForm
          lang={lang}
          t={{ ...dict.planner, ...dict.tour }}
          c={dict.common}
          destinationOptions={plannerOptions(lang)}
        />
      </Container>
    </section>
  );
}
