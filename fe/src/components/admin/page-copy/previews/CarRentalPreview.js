"use client";

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
import { ADMIN_BASE } from "@/config/urls.mjs";
import { lp, tr } from "@/i18n/config";
import { carRoutes, quoteRoutes } from "@/data/cars";
import { carPageData, fleetPhotos } from "@/data/car-gallery";
import { Breadcrumbs, Container, SectionHeading, Stars } from "@/components/ui";
import { CarQuoteForm, CarQuoteProvider, QuickQuote } from "@/components/car/CarQuote";
import FleetStage from "@/components/car/FleetStage";
import FleetMarquee from "@/components/car/FleetMarquee";
import RoutesExplorer from "@/components/car/RoutesExplorer";
import ReviewSource from "@/components/home/ReviewSource";
import { WeChatIcon, WhatsAppIcon, ZaloIcon } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/utils";
import { subgrid } from "@/lib/subgrid";
import { Pic } from "../../home/shared";
import { BgEdit, ImagePill, ListOf, Photo, Shown, Txt, useCopyField } from "../blocks";
import {
  Auto,
  Loading,
  SitePage,
  Zone,
  useCatalog,
  useDict,
  useReviews,
  useSiteInfo,
} from "./site-frame";
import { FaqItem } from "./faq";

/**
 * Bản xem trước trang Thuê xe — dựng y như app/[lang]/car-rental/page.js (cùng bố cục, cỡ chữ, màu, ảnh).
 * Chữ & ảnh sửa được bấm vào là sửa; đội xe, tuyến & giá, khu vực, đánh giá, form báo giá dựng bằng đúng
 * component + dữ liệu website (không sửa ở đây — nhãn "Tự động" chỉ chỗ sửa).
 */

const CARS = `${ADMIN_BASE}/cars`;
const trustIcons = [Plane, Clock, Languages, Ticket];
const serviceIcons = [Plane, Map, Signpost, CalendarCheck, Users, Globe2];
const includedIcons = [Ticket, Plane, Clock, BadgeCheck, Gem, Languages];
const howIcons = [CalendarCheck, MapPinned, ShieldCheck];

export default function CarRentalPreview({ lang }) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  const reviews = useReviews("car").slice(0, 3);
  const { info } = useSiteInfo();
  const aside = useCopyField("asideImage");
  const t = dict?.car;
  const c = dict && {
    ...dict.common,
    fullName: dict.tour.fullName,
    phone: dict.tour.phone,
    notes: dict.tour.notes,
  };
  const data = catalog && carPageData(catalog, lang);
  const { exterior, interior } = fleetPhotos();
  const half = Math.ceil(exterior.length / 2);
  const ready = dict && data;

  return (
    <SitePage lang={lang} path="/car-rental">
      <CarQuoteProvider>
        {/* ========== HERO ========== */}
        <Zone name="Đầu trang" dark at="bottom-3 left-3">
          <section className="relative isolate flex flex-col overflow-hidden bg-[#0b1b2b] text-white lg:min-h-[min(100svh,960px)]">
            <Photo
              f="heroImage"
              className="-z-20"
              imgClassName="object-[50%_70%]"
              pill="bottom-3 right-3"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b1b2b]/90 via-[#0b1b2b]/55 to-transparent" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1b2b]/70 via-transparent to-transparent" />

            <Container className="grid flex-1 items-center gap-10 pt-28 pb-12 lg:grid-cols-[1fr_440px] lg:gap-12 lg:pt-[140px] lg:pb-14 xl:grid-cols-[1fr_460px] xl:gap-16">
              <div>
                <Breadcrumbs
                  light
                  className="mb-5"
                  items={[{ label: "Vietlook", href: "#" }, { label: <Shown f="heroEyebrow" /> }]}
                />
                <p className="flex items-center gap-2 text-sm font-bold tracking-[0.18em] text-amber-brand uppercase">
                  <Car className="size-4" /> <Txt f="heroEyebrow" dark />
                </p>
                <h1 className="mt-4 text-4xl leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-5xl xl:text-[3.4rem]">
                  <Txt f="heroTitle" dark />
                </h1>
                <p className="mt-4 max-w-xl text-lg leading-relaxed whitespace-pre-line text-white/80">
                  <Txt f="heroText" dark />
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <span className="inline-flex h-12 items-center rounded-xl bg-amber-brand px-7 font-bold text-ink shadow-lg shadow-amber-brand/25 max-sm:px-5 sm:h-13">
                    <Txt f="ctaQuote" />
                  </span>
                  <span className="inline-flex h-12 items-center rounded-xl border-2 border-white/40 px-7 font-semibold max-sm:px-5 sm:h-13">
                    <Txt f="ctaFleet" dark />
                  </span>
                </div>
                <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
                  <ListOf f="perks">
                    {(i) => (
                      <li key={i} className="flex items-center gap-2.5 font-medium">
                        <CheckCircle2 className="size-5 text-amber-brand" />{" "}
                        <Txt f={`perks.${i}`} dark />
                      </li>
                    )}
                  </ListOf>
                </ul>
              </div>
              {ready ? (
                <Auto
                  href={CARS}
                  label="Khung báo giá · tự động theo xe & tuyến"
                  at="-top-3 right-5"
                >
                  <QuickQuote
                    lang={lang}
                    t={t}
                    c={c}
                    places={data.placeList}
                    routes={quoteRoutes}
                    vehicles={data.vehicles}
                  />
                </Auto>
              ) : (
                <Loading className="min-h-[480px]" />
              )}
            </Container>
          </section>
        </Zone>

        {/* ========== DẢI ĐIỂM MẠNH ========== */}
        <Zone name="Dải điểm mạnh">
          <section className="border-t-2 border-amber-brand bg-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.3)]">
            <Container>
              <ul className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
                <ListOf f="trust">
                  {(i) => {
                    const Icon = trustIcons[i] ?? Plane;
                    return (
                      <li
                        key={i}
                        className="flex items-center gap-4 sm:row-span-2 sm:grid sm:grid-cols-[auto_1fr] sm:grid-rows-subgrid sm:items-start sm:gap-y-0 lg:px-6 lg:first:pl-0"
                      >
                        <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-amber-brand/15 text-[#a26a00] sm:row-span-2 sm:self-center">
                          <Icon className="size-5" />
                        </span>
                        <span className="leading-tight sm:contents">
                          <span className="block font-bold text-ink">
                            <Txt f={`trust.${i}.title`} />
                          </span>
                          <span className="text-sm text-muted">
                            <Txt f={`trust.${i}.text`} />
                          </span>
                        </span>
                      </li>
                    );
                  }}
                </ListOf>
              </ul>
            </Container>
          </section>
        </Zone>

        {/* ========== ĐỘI XE ========== */}
        <Zone name="Đội xe" dark>
          <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#174a73,#0b1b2b_65%)] py-14 text-white lg:py-[4.5rem]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
            <Container className="relative">
              <header className="mx-auto mb-10 max-w-2xl text-center">
                <h2 className="heading-lg text-white">
                  <Txt f="fleetTitle" dark />
                </h2>
                <p className="mt-3 text-white/70">
                  <Txt f="fleetSubtitle" dark />
                </p>
              </header>
              {ready ? (
                <Auto
                  dark
                  href={CARS}
                  label="Hạng xe, ảnh & giá · sửa ở mục Xe & khu vực"
                  at="-top-8 right-0"
                >
                  <FleetStage
                    lang={lang}
                    fleet={data.fleetData}
                    t={{ ...t, contactPrice: dict.common.contactPrice }}
                  />
                </Auto>
              ) : (
                <Loading dark className="min-h-[520px]" />
              )}
            </Container>
          </section>
        </Zone>

        {/* ========== DỊCH VỤ ========== */}
        <Zone name="Dịch vụ">
          <section className="py-14 lg:py-[4.5rem]">
            <Container>
              <header className="mb-10 max-w-2xl">
                <h2 className="heading-lg text-ink">
                  <Txt f="servicesTitle" />
                </h2>
                <span className="mt-4 block h-1 w-14 rounded-full bg-amber-brand" />
              </header>
              <div className="rail grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ListOf f="services">
                  {(i) => {
                    const Icon = serviceIcons[i] ?? Plane;
                    return (
                      <div key={i} className={subgrid(3, "sm")}>
                        <div
                          className={cn(
                            "group relative h-full overflow-hidden rounded-3xl bg-surface p-7",
                            subgrid(3, "sm"),
                          )}
                        >
                          <span className="absolute -top-8 -right-8 size-32 rounded-full bg-amber-brand/15" />
                          <span className="relative grid size-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                            <Icon className="size-6" />
                          </span>
                          <h3 className="relative mt-5 text-xl font-bold">
                            <Txt f={`services.${i}.title`} />
                          </h3>
                          <p className="relative mt-2 leading-relaxed whitespace-pre-line text-muted">
                            <Txt f={`services.${i}.text`} />
                          </p>
                        </div>
                      </div>
                    );
                  }}
                </ListOf>
              </div>
            </Container>
          </section>
        </Zone>

        {/* ========== TUYẾN PHỔ BIẾN ========== */}
        <Zone name="Tuyến phổ biến">
          <section className="bg-[#f6f1e8] py-14 lg:py-[4.5rem]">
            <Container>
              <header className="mb-10 max-w-2xl">
                <h2 className="heading-lg text-ink">
                  <Txt f="routesTitle" />
                </h2>
                <p className="mt-3 text-lg text-muted">
                  <Txt f="routesSubtitle" />
                </p>
              </header>
              {ready ? (
                <Auto href={CARS} label="Tuyến & giá · sửa ở mục Xe & khu vực" at="-top-8 right-0">
                  <RoutesExplorer
                    areas={data.areas}
                    routes={data.routes}
                    classes={data.classes}
                    t={t}
                    lang={lang}
                  />
                </Auto>
              ) : (
                <Loading className="min-h-[420px]" />
              )}
            </Container>
          </section>
        </Zone>

        {/* ========== KHU VỰC PHỤC VỤ TOÀN QUỐC ========== */}
        <Zone name="Khu vực phục vụ">
          <section className="py-14 lg:py-[4.5rem]">
            <Container>
              <header className="mb-10 max-w-2xl">
                <h2 className="heading-lg text-ink">
                  <Txt f="areasTitle" />
                </h2>
                <p className="mt-3 text-lg text-muted">
                  <Txt f="areasSubtitle" />
                </p>
                <span className="mt-4 block h-1 w-14 rounded-full bg-amber-brand" />
              </header>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {(catalog?.carAreas ?? []).map((a, i) => {
                  const Tile = i === 0 ? Auto : "div";
                  return (
                    <Tile
                      key={a.key}
                      {...(i === 0 && {
                        href: CARS,
                        label: "Khu vực · sửa ở mục Xe & khu vực",
                        dark: true,
                        at: "top-3 left-3",
                      })}
                      className={cn(
                        "group relative overflow-hidden rounded-3xl",
                        i === 0 ? "col-span-2 row-span-2 min-h-72" : "min-h-44",
                      )}
                    >
                      <Pic src={a.image} sizes="(min-width: 768px) 25vw, 50vw" />
                      <span className="absolute inset-0 bg-gradient-to-t from-[#0b1b2b]/85 via-transparent" />
                      <span className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <span className="block text-xl font-bold">{tr(a.name, lang)}</span>
                        <span className="flex items-center gap-1.5 text-sm text-white/80">
                          <Plane className="size-3.5 text-amber-brand" /> {a.airport} ·{" "}
                          {carRoutes.filter((r) => r.area === a.key).length} {t?.routesCount}
                        </span>
                      </span>
                    </Tile>
                  );
                })}
                <div className="col-span-2 flex min-h-44 flex-col justify-center rounded-3xl bg-amber-brand/15 p-6">
                  <Globe2 className="size-8 text-[#a26a00]" />
                  <p className="mt-3 font-bold whitespace-pre-line text-ink">
                    <Txt f="areasMore" />
                  </p>
                </div>
              </div>
            </Container>
          </section>
        </Zone>

        {/* ========== GIÁ ĐÃ BAO GỒM ========== */}
        <Zone name="Giá đã bao gồm">
          <section className="relative isolate overflow-hidden pt-8 pb-14 lg:pt-10 lg:pb-[4.5rem]">
            <BgEdit f="includedImage" tone="light" />
            <Container>
              <header className="mb-10 max-w-2xl">
                <h2 className="heading-lg text-ink">
                  <Txt f="includedTitle" />
                </h2>
                <span className="mt-4 block h-1 w-14 rounded-full bg-amber-brand" />
              </header>
              <div className="rail grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ListOf f="included">
                  {(i) => {
                    const Icon = includedIcons[i] ?? Ticket;
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
                        <h3 className="mt-5 text-lg font-bold text-ink">
                          <Txt f={`included.${i}.title`} />
                        </h3>
                        <p className="mt-1.5 whitespace-pre-line text-muted">
                          <Txt f={`included.${i}.text`} />
                        </p>
                      </div>
                    );
                  }}
                </ListOf>
              </div>
            </Container>
          </section>
        </Zone>

        {/* ========== DẢI ẢNH ĐỘI XE (marquee) ========== */}
        <Zone name="Dải ảnh đội xe">
          <section className="overflow-hidden bg-surface py-14 lg:py-[4.5rem]">
            <Container className="mb-8 text-center lg:mb-10">
              <h2 className="heading-lg text-ink">
                <Txt f="galleryTitle" />
              </h2>
              <p className="mt-3 text-lg text-muted">
                <Txt f="gallerySubtitle" />
              </p>
            </Container>
            <Auto label="Ảnh đội xe có sẵn của website" at="-top-1 right-4">
              <FleetMarquee
                rows={[
                  { images: exterior.slice(0, half), alt: "Vietlook Travel fleet" },
                  { images: interior, alt: t?.gallery ?? "" },
                  { images: exterior.slice(half), alt: "Vietlook Travel fleet" },
                ]}
              />
            </Auto>
          </section>
        </Zone>

        {/* ========== CÁCH ĐẶT XE ========== */}
        <Zone name="Cách đặt xe" dark>
          <section className="relative isolate overflow-hidden bg-[#0b1b2b] py-14 text-white lg:py-[4.5rem]">
            <BgEdit f="howImage" tone="night" />
            <div className="absolute -top-40 -right-40 size-[520px] rounded-full bg-amber-brand/10 blur-3xl" />
            <Container className="relative">
              <h2 className="heading-lg">
                <Txt f="howTitle" dark />
              </h2>
              <div className="mt-10 grid gap-6 md:grid-cols-3">
                <ListOf f="how">
                  {(i) => {
                    const Icon = howIcons[i] ?? CalendarCheck;
                    return (
                      <div
                        key={i}
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
                        <h3 className="mt-6 text-2xl font-bold">
                          <Txt f={`how.${i}.title`} dark />
                        </h3>
                        <p className="mt-2 whitespace-pre-line text-white/70">
                          <Txt f={`how.${i}.text`} dark />
                        </p>
                        {i < 2 && (
                          <span className="route-dash absolute top-14 -right-6 hidden h-0.5 w-6 text-amber-brand md:block" />
                        )}
                      </div>
                    );
                  }}
                </ListOf>
              </div>
            </Container>
          </section>
        </Zone>

        {/* ========== KHÁCH HÀNG NÓI GÌ ========== */}
        <Zone name="Đánh giá">
          <section className="bg-[#f6f1e8] py-14 lg:py-[4.5rem]">
            <Container>
              <SectionHeading title={<Txt f="reviewsTitle" />} subtitle={<Txt f="reviewsSub" />} />
              {reviews.length > 0 && dict ? (
                <Auto
                  href={`${ADMIN_BASE}/reviews`}
                  label="3 đánh giá chọn ở mục Đánh giá"
                  at="-top-3 right-0"
                  className="rail grid gap-6 md:grid-cols-3"
                >
                  {reviews.map((r) => (
                    <figure
                      key={r.id}
                      className={cn(
                        "relative flex flex-col rounded-3xl bg-white p-7 shadow-sm ring-1 ring-black/5",
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
                </Auto>
              ) : (
                <p className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-500">
                  Chưa chọn đánh giá nào cho trang Thuê xe → trên website khối này đang ẩn. Chọn ở
                  mục Đánh giá.
                </p>
              )}
            </Container>
          </section>
        </Zone>

        {/* ========== CÂU HỎI THƯỜNG GẶP ========== */}
        <Zone name="Câu hỏi thường gặp">
          <section className="py-14 lg:py-[4.5rem]">
            <Container className="grid items-start gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div className="lg:sticky lg:top-32">
                <h2 className="heading-lg text-ink">
                  <Txt f="faqTitle" />
                </h2>
                <p className="mt-3 text-lg text-muted">
                  <Txt f="faqSub" />
                </p>
                <span className="mt-6 inline-flex h-12 items-center rounded-xl bg-amber-brand px-6 font-bold text-ink">
                  {dict?.common.chatWhatsApp}
                </span>
              </div>
              <div className="space-y-3">
                <ListOf f="faq">
                  {(i) => (
                    <FaqItem
                      key={i}
                      f={`faq.${i}`}
                      className="group rounded-2xl bg-[#f6f1e8] ring-1 ring-black/5 open:bg-white open:shadow-md"
                      summaryClassName="flex cursor-pointer list-none items-center gap-4 p-5 font-semibold text-ink"
                      answerClassName="px-5 pb-5 pl-[4.75rem] leading-relaxed whitespace-pre-line text-muted"
                      before={
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-sm font-bold text-[#a26a00] ring-1 ring-amber-brand/30">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      }
                      after={
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-brand/20 text-[#a26a00] transition group-open:rotate-45">
                          +
                        </span>
                      }
                    />
                  )}
                </ListOf>
              </div>
            </Container>
          </section>
        </Zone>

        {/* ========== FORM BÁO GIÁ + KÊNH LIÊN HỆ ========== */}
        <Zone name="Form báo giá & liên hệ">
          <section className="pt-6 pb-14 lg:pt-8 lg:pb-[4.5rem]">
            <Container className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <h2 className="heading-lg text-ink">
                  <Txt f="formTitle" />
                </h2>
                <p className="mt-3 mb-6 text-lg text-muted">
                  <Txt f="formSubtitle" />
                </p>
                <div className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,62,95,0.5)] ring-1 ring-border sm:p-7">
                  {ready ? (
                    <Auto label="Form báo giá giữ nguyên như website" at="-top-3 right-0">
                      <CarQuoteForm lang={lang} t={t} c={c} vehicles={data.vehicles} />
                    </Auto>
                  ) : (
                    <Loading className="min-h-[520px]" />
                  )}
                </div>
              </div>
              <aside className="lg:mt-24 lg:self-start">
                <div className="relative overflow-hidden rounded-3xl bg-white p-8 text-ink shadow-[0_30px_80px_-40px_rgba(60,40,10,0.35)] ring-1 ring-sand-300/70">
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(197,115,59,0.10)_1px,transparent_1px)] bg-[size:16px_16px]" />
                  <div className="relative">
                    <h3 className="text-2xl font-extrabold">
                      <Txt f="talkTitle" />
                    </h3>
                    <p className="mt-2 text-muted">
                      <Txt f="talkText" />
                    </p>
                    <Auto
                      href={`${ADMIN_BASE}/settings#contact`}
                      label="Hotline & kênh chat · sửa ở Cài đặt"
                      at="-top-3 right-0"
                    >
                      <span className="mt-6 flex items-center gap-4 rounded-2xl bg-cream-50 p-4 ring-1 ring-sand-300/70">
                        <span className="grid size-12 place-items-center rounded-xl bg-amber-brand text-ink">
                          <Phone className="size-5" />
                        </span>
                        <span>
                          <span className="block text-xs text-muted">{t?.hotline}</span>
                          <span className="text-xl font-extrabold text-forest-900">
                            {info.contact.hotline}
                          </span>
                        </span>
                      </span>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {[
                          { icon: WhatsAppIcon, label: "WhatsApp", color: "bg-[#25d366]" },
                          {
                            icon: ZaloIcon,
                            label: "Zalo",
                            color: "bg-white ring-1 ring-sand-300/70",
                          },
                          { icon: WeChatIcon, label: "WeChat", color: "bg-[#07c160]" },
                        ].map((m) => (
                          <a
                            key={m.label}
                            href={`${lp(lang)}/contact`}
                            className="flex flex-col items-center gap-2 rounded-2xl bg-cream-50 p-4 ring-1 ring-sand-300/70"
                          >
                            <span
                              className={`grid size-11 place-items-center rounded-xl ${m.color}`}
                            >
                              <m.icon className="size-6 text-white" />
                            </span>
                            <span className="text-sm font-semibold text-ink">{m.label}</span>
                          </a>
                        ))}
                      </div>
                    </Auto>
                  </div>
                </div>
                <div className="relative mt-6 h-56 overflow-hidden rounded-3xl bg-slate-100">
                  <Pic src={aside.value || aside.def} sizes="(min-width: 1024px) 35vw, 100vw" />
                  <ImagePill f="asideImage" className="top-3 right-3" />
                </div>
              </aside>
            </Container>
          </section>
        </Zone>
      </CarQuoteProvider>
    </SitePage>
  );
}
