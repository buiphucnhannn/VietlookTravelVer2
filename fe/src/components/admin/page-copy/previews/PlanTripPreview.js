"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { Breadcrumbs, Container } from "@/components/ui";
import TripPlannerForm from "@/components/forms/TripPlannerForm";
import { ListOf, Photo, Txt } from "../blocks";
import { Auto, Loading, SitePage, Zone, useCatalog, useDict } from "./site-frame";

/**
 * Bản xem trước trang Lên kế hoạch chuyến đi — dựng y như app/[lang]/plan-your-trip/page.js.
 * Form thiết kế tour: đúng form của website (ô của form giữ nguyên, không sửa ở đây).
 */
export default function PlanTripPreview({ lang }) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  return (
    <SitePage lang={lang} path="/plan-your-trip">
      <Zone name="Trang lên kế hoạch" dark at="left-3 top-20 lg:top-[7.25rem]">
        <section className="relative isolate overflow-clip bg-brand-950 pt-28 pb-16 lg:flex lg:min-h-[min(100svh,960px)] lg:items-center lg:pt-[120px] lg:pb-12">
          <Photo f="heroImage" className="-z-10 [&_img]:opacity-50" hero />
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-950 via-brand-950/80 to-brand-900/40" />
          <Container className="grid items-start gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="text-white">
              <Breadcrumbs
                light
                items={[{ label: "Vietlook", href: "#" }, { label: <Txt f="crumb" dark /> }]}
              />
              <h1 className="heading-xl mt-6">
                <Txt f="title" dark />
              </h1>
              <p className="mt-4 text-lg whitespace-pre-line text-white/80">
                <Txt f="subtitle" dark />
              </p>
              <ul className="mt-8 space-y-3">
                <ListOf f="points">
                  {(i) => (
                    <li key={i} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-brand" />{" "}
                      <Txt f={`points.${i}`} dark />
                    </li>
                  )}
                </ListOf>
              </ul>
              <p className="mt-8 flex items-center gap-2 text-sm text-white/70">
                <Clock className="size-4" /> <Txt f="replyNote" dark />
              </p>
            </div>
            {dict && catalog ? (
              <Auto label="Form giữ nguyên như website" at="-bottom-3 right-4">
                <TripPlannerForm
                  lang={lang}
                  t={{ ...dict.planner, ...dict.tour }}
                  c={dict.common}
                  destinationOptions={catalog.plannerOptions(lang)}
                />
              </Auto>
            ) : (
              <Loading className="min-h-[640px]" />
            )}
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
