"use client";

import {
  Accessibility,
  ArrowRight,
  Briefcase,
  CalendarSync,
  Car,
  Ear,
  GraduationCap,
  HandHeart,
  Handshake,
  Heart,
  Hotel,
  MapPin,
  MessagesSquare,
  Stamp,
  Star,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { Container, SectionHeading } from "@/components/ui";
import TripPlannerForm from "@/components/forms/TripPlannerForm";
import Reviews from "@/components/home/Reviews";
import { cn } from "@/lib/utils";
import { subgrid } from "@/lib/subgrid";
import { AutoNote } from "../../home/shared";
import { BgEdit, ListOf, Photo, Txt } from "../blocks";
import BrushHeroPreview from "./BrushHeroPreview";
import { Auto, Loading, SitePage, Zone, useCatalog, useDict, useReviews } from "./site-frame";
import { FaqItem } from "./faq";

/**
 * Bản xem trước trang Tour nhóm & thiết kế riêng — dựng y như app/[lang]/group-tailor-made-tours/page.js.
 * Đánh giá (mục Đánh giá) và form lên kế hoạch: đúng component + dữ liệu website, không sửa ở đây.
 */

const includedIcons = [Users, Hotel, Car, Wrench, Stamp, MessagesSquare];
const pillarIcons = [Wrench, Star, MapPin, MessagesSquare];
const groupIcons = [UsersRound, Briefcase, GraduationCap, Handshake];
const accessIcons = [Accessibility, Ear, HandHeart];

export default function GroupToursPreview({ lang }) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  const reviews = useReviews("group");

  return (
    <SitePage lang={lang} path="/group-tailor-made-tours">
      <BrushHeroPreview
        image="heroImage"
        title="heroTitle"
        subtitle="heroSubtitle"
        cta={{ href: "#", label: <Txt f="heroCta" dark /> }}
      />

      <Zone name="Giới thiệu & dải không rào cản">
        <Container className="py-10 text-center">
          <p className="mx-auto max-w-5xl text-xl leading-snug font-medium whitespace-pre-line text-ink sm:text-2xl">
            <Txt f="intro" />
          </p>
          <div className="mx-auto mt-8 flex max-w-5xl flex-col gap-4 rounded-2xl bg-brand-50/70 p-5 text-left ring-1 ring-brand-100 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
            <span className="flex shrink-0 items-center gap-1.5" aria-hidden>
              {accessIcons.map((Icon, i) => (
                <span
                  key={i}
                  className="grid size-11 place-items-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-brand-100"
                >
                  <Icon className="size-5" />
                </span>
              ))}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">
                <Txt f="accessTitle" />
              </p>
              <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-line text-ink/75">
                <Txt f="accessText" />
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-semibold text-brand-700 sm:self-center">
              <Txt f="accessCta" /> <ArrowRight className="size-4" />
            </span>
          </div>
          <AutoNote
            className="mt-2 [zoom:var(--pz,1)]"
            href={`${ADMIN_BASE}/pages?key=access`}
            linkText="Khối du lịch không rào cản"
          >
            Sửa ở đây = chỉ đổi dải trên trang này. Chữ chung (cả Trang chủ, Giới thiệu) sửa ở Giao
            diện trang → Toàn website →
          </AutoNote>
        </Container>
      </Zone>

      {/* Thanh tab */}
      <Zone name="Thanh mục lục" at="top-1/2 left-2 -translate-y-1/2">
        <div className="z-30 bg-[#dff3f1]">
          <Container>
            <nav className="flex scrollbar-none gap-1 overflow-x-auto py-1 md:justify-center">
              <ListOf f="tabs">
                {(i) => (
                  <span key={i} className="shrink-0 px-4 py-3 text-[0.95rem] font-medium text-ink">
                    <Txt f={`tabs.${i}`} />
                  </span>
                )}
              </ListOf>
            </nav>
          </Container>
        </div>
      </Zone>

      <Zone name="Luôn bao gồm" hide="included">
        <section className="relative isolate overflow-hidden bg-[#d3e9e6] py-14 lg:py-[4.5rem]">
          <BgEdit f="includedImage" tone="mist" />
          <Container>
            <h2 className="heading-lg mx-auto mb-12 max-w-4xl text-center text-ink">
              <Txt f="includedTitle" />
            </h2>
            <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
              <ListOf f="included">
                {(i) => {
                  const Icon = includedIcons[i] ?? Users;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-5 md:row-span-2 md:grid md:grid-cols-[auto_1fr] md:grid-rows-subgrid md:gap-y-0"
                    >
                      <Icon
                        className="mt-1 size-12 shrink-0 text-[#4a5a63] md:row-span-2"
                        strokeWidth={1.6}
                      />
                      <div className="md:contents">
                        <h3 className="text-2xl font-semibold text-ink">
                          <Txt f={`included.${i}.title`} />
                        </h3>
                        <p className="mt-1 text-lg leading-relaxed whitespace-pre-line text-ink/70">
                          <Txt f={`included.${i}.text`} />
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

      <Zone name="Dải cam kết" hide="pillars" dark>
        <div className="relative isolate overflow-hidden bg-[#16a777] py-10 text-white">
          <BgEdit f="pillarsImage" tone="dark" />
          <Container className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            <ListOf f="pillars">
              {(i) => {
                const Icon = pillarIcons[i] ?? Star;
                return (
                  <div key={i}>
                    <Icon className="mx-auto size-9" />
                    <p className="mt-2 text-xl font-semibold sm:text-2xl">
                      <Txt f={`pillars.${i}`} dark />
                    </p>
                  </div>
                );
              }}
            </ListOf>
          </Container>
        </div>
      </Zone>

      <Zone name="Loại nhóm">
        <section className="py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={<Txt f="groupTitle" />} />
            <div className="rail grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <ListOf f="groups">
                {(i) => {
                  const Icon = groupIcons[i] ?? UsersRound;
                  return (
                    <div key={i} className={subgrid(3, "sm")}>
                      <div
                        className={cn(
                          "group h-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border",
                          subgrid(3, "sm"),
                        )}
                      >
                        <div className="relative h-44 overflow-hidden bg-slate-100">
                          <Photo f={`groupImages.${i}`} sizes="(min-width: 1024px) 25vw, 50vw" />
                          <span className="absolute bottom-3 left-3 grid size-11 place-items-center rounded-xl bg-white text-brand-600 shadow">
                            <Icon className="size-5" />
                          </span>
                        </div>
                        <h3 className="px-5 pt-5 text-lg font-bold text-ink">
                          <Txt f={`groups.${i}.title`} />
                        </h3>
                        <p className="mt-1.5 px-5 pb-5 whitespace-pre-line text-muted">
                          <Txt f={`groups.${i}.text`} />
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

      <Zone name="Cách làm việc" hide="how">
        <section className="relative isolate overflow-hidden bg-surface py-14 lg:py-[4.5rem]">
          <BgEdit f="howImage" tone="light" />
          <Container>
            <SectionHeading title={<Txt f="howTitle" />} />
            <ol className="relative grid gap-8 md:grid-cols-4">
              <span className="route-dash absolute top-8 right-[12%] left-[12%] hidden h-0.5 text-brand-300 md:block" />
              <ListOf f="how">
                {(i) => (
                  <li key={i} className={cn("relative text-center", subgrid(3, "md"))}>
                    <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-brand-600 text-2xl font-extrabold text-white shadow-lg ring-8 ring-surface">
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-xl font-bold text-ink">
                      <Txt f={`how.${i}.title`} />
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-muted">
                      <Txt f={`how.${i}.text`} />
                    </p>
                  </li>
                )}
              </ListOf>
            </ol>
          </Container>
        </section>
      </Zone>

      <Zone name="Form lên kế hoạch" dark>
        <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
          <Photo f="planImage" className="-z-10" />
          <div className="absolute inset-0 -z-10 bg-brand-950/80" />
          <Container className="max-w-4xl">
            <SectionHeading
              title={<Txt f="plannerTitle" dark />}
              subtitle={<Txt f="plannerSubtitle" dark />}
              light
            />
            {dict && catalog ? (
              <Auto dark label="Form giữ nguyên như website" at="-top-3 right-0">
                <TripPlannerForm
                  lang={lang}
                  t={{ ...dict.planner, ...dict.tour }}
                  c={dict.common}
                  destinationOptions={catalog.plannerOptions(lang)}
                />
              </Auto>
            ) : (
              <Loading dark className="min-h-[640px]" />
            )}
          </Container>
        </section>
      </Zone>

      <Zone name="Đánh giá" hide="reviews" dark>
        {dict && reviews.length > 0 ? (
          <Auto
            dark
            href={`${ADMIN_BASE}/reviews`}
            label="Đánh giá chọn ở mục Đánh giá"
            at="top-24 right-4"
            live
          >
            <Reviews
              lang={lang}
              dict={{
                ...dict,
                home: {
                  ...dict.home,
                  reviewsEyebrow: <Txt f="reviewsEyebrow" dark />,
                  reviewsTitle: <Txt f="reviewsTitle" dark />,
                  reviewsSubtitle: <Txt f="reviewsSubtitle" dark />,
                },
              }}
              reviews={reviews}
            />
          </Auto>
        ) : (
          <section className="bg-forest-900 py-14 text-white">
            <Container>
              <SectionHeading
                eyebrow={<Txt f="reviewsEyebrow" dark />}
                title={<Txt f="reviewsTitle" dark />}
                subtitle={<Txt f="reviewsSubtitle" dark />}
                light
              />
              <p className="mx-auto max-w-xl rounded-2xl border border-dashed border-white/25 p-4 text-center text-sm text-white/70">
                {dict
                  ? "Chưa chọn đánh giá nào cho trang này → trên website khối đánh giá đang ẩn. Chọn ở mục Đánh giá."
                  : "Đang tải dữ liệu website…"}
              </p>
            </Container>
          </section>
        )}
      </Zone>

      <Zone name="Câu hỏi thường gặp" hide="faq">
        <section className="py-14 lg:py-[4.5rem]">
          <Container className="max-w-4xl">
            <SectionHeading title={<Txt f="faqTitle" />} />
            <div className="space-y-3">
              <ListOf f="faq">
                {(i) => (
                  <FaqItem
                    key={i}
                    f={`faq.${i}`}
                    className="group rounded-2xl bg-white ring-1 ring-border open:shadow-md"
                    summaryClassName="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-lg font-semibold text-ink"
                    qClassName=""
                    answerClassName="px-5 pb-5 leading-relaxed whitespace-pre-line text-muted"
                    after={
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-open:rotate-45">
                        +
                      </span>
                    }
                  />
                )}
              </ListOf>
            </div>
            <p className="mt-8 flex items-center justify-center gap-2 text-muted">
              <Heart className="size-4 text-sun-500" />{" "}
              <CalendarSync className="size-4 text-brand-500" /> <Txt f="faqNote" />
            </p>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
