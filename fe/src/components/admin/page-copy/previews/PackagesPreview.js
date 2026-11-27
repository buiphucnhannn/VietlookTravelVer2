"use client";

import { ArrowRight, Headphones, Languages, MapPin, Smartphone, Star, Wrench } from "lucide-react";
import { fill } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui";
import PackageRow from "@/components/tours/PackageRow";
import { BgEdit, ListOf, Txt } from "../blocks";
import { Auto, Loading, SitePage, Zone, useCatalog, useDict } from "./site-frame";
import { AdviceEdit, TOURS_ADMIN, TourHero } from "./tours-shared";

/**
 * Bản xem trước trang Gói tour 1–3 tuần — dựng y như app/[lang]/packages/page.js.
 * 3 tour mỗi nhóm tuần: dữ liệu mục Tour (tự chọn theo số ngày), chỉ xem. Lời giới thiệu & hộp mời thiết kế riêng
 * của từng nhóm cũng hiện ở trang Tất cả tour khi khách lọc 1 / 2 / 3 tuần.
 */

const whyIcons = [Smartphone, MapPin, Wrench, Languages, Star, Headphones];

export default function PackagesPreview({ lang }) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  return (
    <SitePage lang={lang} path="/packages">
      <TourHero collage />

      <Zone name="Lý do chọn">
        <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
          <BgEdit f="whyImage" tone="light" />
          <Container>
            <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              <Txt f="whyTitle" />
            </h2>
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              <ListOf f="why">
                {(i) => {
                  const Icon = whyIcons[i] ?? Star;
                  return (
                    <div
                      key={i}
                      className="row-span-2 grid grid-cols-[auto_1fr] grid-rows-subgrid gap-x-4 gap-y-1"
                    >
                      <Icon
                        className="row-span-2 mt-1 size-9 shrink-0 text-ink"
                        strokeWidth={1.8}
                      />
                      <h3 className="text-xl font-medium text-ink">
                        <Txt f={`why.${i}.title`} />
                      </h3>
                      <p className="leading-relaxed text-muted">
                        <Txt f={`why.${i}.text`} />
                      </p>
                    </div>
                  );
                }}
              </ListOf>
            </div>
          </Container>
        </section>
      </Zone>

      {[1, 2, 3].map((n, wi) => {
        const list = catalog?.packagesByWeeks(n).slice(0, 3) ?? [];
        return (
          <Zone key={n} name={`Gói ${n} tuần`}>
            <section className={cn("py-14 lg:py-[4.5rem]", wi % 2 ? "bg-white" : "bg-surface")}>
              <Container>
                {wi === 0 && (
                  <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    <Txt f="ourPackages" />
                  </h2>
                )}
                <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                  <div className="lg:self-start">
                    <span className="block text-6xl leading-none font-extrabold text-brand-200">
                      0{n}
                    </span>
                    <h3 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                      <Txt f={`week${n}Title`} />
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink/80 italic">
                      <Txt f={`week${n}Text`} />
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                      {dict && fill(dict.packages.seeAllWeek, { n })}{" "}
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-6">
                      <p className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                        <Txt f={`week${n}BestTitle`} />
                      </p>
                      <p className="mt-2 max-w-4xl leading-relaxed text-ink/75">
                        <Txt f={`week${n}BestText`} />
                      </p>
                    </div>
                    {dict && catalog ? (
                      <Auto
                        href={TOURS_ADMIN}
                        label={`3 tour ${n} tuần tự chọn · sửa ở mục Tour`}
                        at="-top-3 right-0"
                        className="rail space-y-5 max-sm:space-y-0"
                      >
                        {list.map((t) => (
                          <PackageRow
                            key={t.slug}
                            tour={t}
                            lang={lang}
                            dict={dict}
                            getDestination={catalog.getDestination}
                          />
                        ))}
                      </Auto>
                    ) : (
                      <Loading className="min-h-[600px]" />
                    )}
                    <div className="mt-8">
                      <AdviceEdit
                        lang={lang}
                        title={`week${n}CtaTitle`}
                        text={`week${n}CtaText`}
                        cta="ctaButton"
                      />
                    </div>
                  </div>
                </div>
              </Container>
            </section>
          </Zone>
        );
      })}
    </SitePage>
  );
}
