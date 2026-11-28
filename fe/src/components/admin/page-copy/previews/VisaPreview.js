"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  FileCheck2,
  Info,
  PlaneLanding,
  PlaneTakeoff,
  Plus,
  Send,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { tr } from "@/i18n/config";
import { airportCodes, airports, visaProcesses } from "@/data/visa";
import { Container, SectionHeading } from "@/components/ui";
import VisaForm from "@/components/forms/VisaForm";
import { PackageGrid } from "@/components/visa/PackageGroups";
import { PROCESS_ICONS } from "@/components/visa/ProcessTabs";
import { cn } from "@/lib/utils";
import { subgrid } from "@/lib/subgrid";
import { BgEdit, ListOf, Txt, usePlain } from "../blocks";
import BrushHeroPreview from "./BrushHeroPreview";
import { Auto, Loading, SitePage, Zone, useCatalog, useDict } from "./site-frame";
import { FaqItem } from "./faq";

/**
 * Bản xem trước trang Visa & Fast-track — dựng y như app/[lang]/visa-fast-track/page.js.
 * Thẻ gói fast-track & giá, bảng loại visa, form đặt: đúng component + dữ liệu website (sửa ở mục Visa & fast-track).
 * Tên nhóm gói, tab quy trình: bấm tên tab để chuyển tab và sửa chữ.
 */

const VISA = `${ADMIN_BASE}/visa`;
const groupIcons = { arrival: PlaneLanding, departure: PlaneTakeoff, addons: Plus };
const GROUPS = {
  arrival: ["groupArrival", "groupArrivalSub"],
  departure: ["groupDeparture", "groupDepartureSub"],
  addons: ["groupAddons", "groupAddonsSub"],
};
const TABS = { arrival: "tabArrival", departure: "tabDeparture", evisa: "tabEvisa" };
const STEPS = { arrival: "stepsArrival", departure: "stepsDeparture", evisa: "stepsEvisa" };

/** Tab nhóm gói + lưới thẻ gói (PackageGroups của website, tên nhóm sửa được) */
function Packages({ packages, airports: ap, labels }) {
  const [group, setGroup] = useState("arrival");
  return (
    <div>
      <div className="mx-auto flex max-w-3xl scrollbar-none overflow-x-auto rounded-full bg-cream-100 p-1.5 ring-1 ring-sand-300/70">
        {Object.keys(packages).map((g) => {
          const Icon = groupIcons[g];
          const on = g === group;
          return (
            <div
              key={g}
              role="tab"
              aria-selected={on}
              onClick={() => setGroup(g)}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition sm:text-[0.95rem]",
                on ? "bg-forest-700 text-white shadow" : "text-ink/70 hover:text-forest-700",
              )}
            >
              <Icon className="size-4" />
              <Txt f={GROUPS[g][0]} dark={on} />
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  on ? "bg-white/20" : "bg-sand-300/60 text-ink/70",
                )}
              >
                {packages[g].length}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        <Txt f={GROUPS[group][1]} />
      </p>
      <Auto
        href={VISA}
        label="Gói & giá theo sân bay · sửa ở mục Visa & fast-track"
        at="top-1 right-0"
      >
        <PackageGrid key={group} list={packages[group]} airports={ap} labels={labels} />
      </Auto>
    </div>
  );
}

/** Quy trình 5 bước (ProcessTabs của website): bấm tên tab để chuyển tab, chữ từng bước sửa được */
function Process() {
  const [tab, setTab] = useState("arrival");
  return (
    <div>
      <div className="mx-auto flex w-fit gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-sand-300/70">
        {Object.keys(TABS).map((k) => (
          <div
            key={k}
            role="tab"
            aria-selected={k === tab}
            onClick={() => setTab(k)}
            className={cn(
              "cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition",
              k === tab ? "bg-clay-500 text-white shadow" : "text-ink/70 hover:text-clay-600",
            )}
          >
            <Txt f={TABS[k]} dark={k === tab} />
          </div>
        ))}
      </div>

      <ol key={tab} className="relative mt-10 grid animate-fade-up gap-6 md:grid-cols-5 md:gap-4">
        <span
          aria-hidden
          className="absolute top-7 right-[10%] left-[10%] hidden border-t-2 border-dashed border-sand-300 md:block"
        />
        <ListOf f={STEPS[tab]}>
          {(i) => {
            const Icon = PROCESS_ICONS[visaProcesses[tab]?.[i]?.icon] || Send;
            return (
              <li
                key={i}
                className="relative flex gap-4 md:row-span-3 md:grid md:grid-rows-subgrid md:justify-items-center md:gap-y-0 md:text-center"
              >
                <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-forest-700 text-white shadow-lg ring-4 ring-cream-50">
                  <Icon className="size-6" />
                  <span className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-amber-brand text-xs font-bold text-ink">
                    {i + 1}
                  </span>
                </span>
                <div className="md:contents">
                  <h3 className="text-base font-bold text-ink md:mt-4">
                    <Txt f={`${STEPS[tab]}.${i}.title`} />
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    <Txt f={`${STEPS[tab]}.${i}.text`} />
                  </p>
                </div>
              </li>
            );
          }}
        </ListOf>
      </ol>
    </div>
  );
}

export default function VisaPreview({ lang }) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  const plain = usePlain();
  const v = dict?.visa;
  const c = dict && { ...dict.common, fullName: dict.tour.fullName, phone: dict.tour.phone };
  const groups = {
    arrival: plain("groupArrival"),
    departure: plain("groupDeparture"),
    addons: plain("groupAddons"),
  };
  const localize = (pkg) => ({ ...pkg, label: tr(pkg.name, lang), text: tr(pkg.desc, lang) });
  const packages =
    catalog &&
    Object.fromEntries(
      Object.entries(catalog.fastTrackPackages).map(([g, list]) => [g, list.map(localize)]),
    );
  const levels = catalog?.allPackages().map(localize);
  const ap = airportCodes
    .map((code) => airports.find((a) => a.code === code))
    .map((a) => ({ ...a, label: tr(a.name, lang) }));
  const ready = dict && catalog;

  return (
    <SitePage lang={lang} path="/visa-fast-track">
      <BrushHeroPreview images="heroImages" title="heroTitle" subtitle="heroIntro">
        <p className="mt-3 text-lg font-bold text-amber-brand drop-shadow">
          <Txt f="heroTagline" dark />
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <span className="inline-flex h-12 items-center rounded-md bg-clay-500 px-6 font-semibold shadow-lg">
            <Txt f="ctaFast" dark />
          </span>
          <span className="inline-flex h-12 items-center rounded-md border-2 border-white/70 px-6 font-semibold">
            <Txt f="ctaTypes" dark />
          </span>
        </div>
      </BrushHeroPreview>

      {/* 1. Gói fast-track theo 3 nhóm */}
      <Zone name="Gói fast-track">
        <section className="bg-cream-50 py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={<Txt f="fastTitle" />} subtitle={<Txt f="fastSubtitle" />} />
            {ready ? (
              <Packages
                packages={packages}
                airports={ap}
                labels={{
                  groups,
                  priceByAirport: v.priceByAirport,
                  perPax: v.perPax,
                  book: v.bookPackage,
                  popular: v.popular,
                  contactPrice: v.contactPrice,
                  from: dict.common.from,
                }}
              />
            ) : (
              <Loading className="min-h-[640px]" />
            )}
            <p className="mt-4 text-center text-xs text-muted">
              <Txt f="dashNote" />
            </p>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
              <Info className="size-4" /> <Txt f="priceNote" />
            </p>
          </Container>
        </section>
      </Zone>

      {/* 2. Quy trình 5 bước + 3. Hai lưu ý */}
      <Zone name="Quy trình & lưu ý" hide="process">
        <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
          <BgEdit f="processImage" tone="light" />
          <Container>
            <SectionHeading
              title={<Txt f="processTitle" />}
              subtitle={<Txt f="processSubtitle" />}
            />
            <Process />
            <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
              <ListOf f="notes">
                {(i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-2xl border border-amber-brand/40 bg-amber-brand/10 p-5"
                  >
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-clay-600" />
                    <p className="text-sm leading-relaxed text-ink">
                      <span className="mr-1 font-bold text-clay-600">
                        <Txt f="notesTitle" />:
                      </span>
                      <Txt f={`notes.${i}`} />
                    </p>
                  </div>
                )}
              </ListOf>
            </div>
          </Container>
        </section>
      </Zone>

      {/* 4. Thuật ngữ chuẩn EN / ZH */}
      <Zone name="Thuật ngữ" hide="terms">
        <section className="bg-cream-100 py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={<Txt f="termsTitle" />} subtitle={<Txt f="termsSubtitle" />} />
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ListOf f="terms">
                {(i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-2xl bg-white p-5 ring-1 ring-sand-300/70",
                      subgrid(2, "sm"),
                    )}
                  >
                    <dt className="font-bold text-forest-700">
                      <Txt f={`terms.${i}.term`} />
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink/75">
                      <Txt f={`terms.${i}.meaning`} />
                    </dd>
                  </div>
                )}
              </ListOf>
            </dl>
          </Container>
        </section>
      </Zone>

      {/* 5. Các loại visa */}
      <Zone name="Các loại visa">
        <section className="py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={<Txt f="typesTitle" />} />
            {ready ? (
              <Auto
                href={VISA}
                label="Loại visa, thời hạn & phí · sửa ở mục Visa & fast-track"
                at="-top-3 right-4"
              >
                <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-sand-300/70">
                  <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-6 border-b border-sand-300/60 bg-cream-100 px-6 py-3.5 text-xs font-bold tracking-[0.12em] text-forest-700 uppercase md:grid">
                    <span>{v.typeCol}</span>
                    <span>{v.stay}</span>
                    <span>{v.processing}</span>
                    <span>{v.fee}</span>
                  </div>
                  {catalog.visaTypes.map((x) => {
                    const [feeMain, feeSub] = tr(x.fee, lang).split(" · ");
                    return (
                      <div
                        key={x.key}
                        className="grid items-start gap-3 border-t border-sand-300/50 px-6 py-5 first:border-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)] md:gap-6"
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
                          <span className="mb-1 block text-xs text-muted md:hidden">
                            {v.processing}
                          </span>
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
              </Auto>
            ) : (
              <Loading className="min-h-[420px]" />
            )}
            <p className="mt-4 flex items-start gap-2 text-sm text-muted">
              <Info className="mt-0.5 size-4 shrink-0" /> <Txt f="typesNote" />
            </p>
          </Container>
        </section>
      </Zone>

      {/* 6. Form đặt + FAQ */}
      <Zone name="Form đặt & câu hỏi">
        <section className="relative isolate overflow-clip bg-cream-50 py-14 lg:py-[4.5rem]">
          <BgEdit f="formImage" tone="mist" />
          <Container className="grid items-start gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sand-300/70 sm:p-8">
              <h2 className="mb-6 text-3xl font-bold tracking-tight text-ink">
                <Txt f="formTitle" />
              </h2>
              {ready ? (
                <Auto label="Form đặt giữ nguyên như website" at="-top-3 right-0">
                  <VisaForm
                    lang={lang}
                    t={v}
                    c={c}
                    airports={ap}
                    levels={levels}
                    groupLabels={groups}
                  />
                </Auto>
              ) : (
                <Loading className="min-h-[560px]" />
              )}
            </div>
            <div>
              <h2 className="mb-5 text-2xl font-bold text-ink">
                <Txt f="faqTitle" />
              </h2>
              <div className="space-y-3">
                <ListOf f="faq">
                  {(i) => (
                    <FaqItem
                      key={i}
                      f={`faq.${i}`}
                      className="group rounded-2xl bg-white ring-1 ring-sand-300/70"
                      summaryClassName="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-semibold text-ink"
                      qClassName=""
                      answerClassName="px-5 pb-5 whitespace-pre-line text-muted"
                      after={
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cream-100 text-clay-600 transition group-open:rotate-45">
                          +
                        </span>
                      }
                    />
                  )}
                </ListOf>
              </div>
            </div>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
