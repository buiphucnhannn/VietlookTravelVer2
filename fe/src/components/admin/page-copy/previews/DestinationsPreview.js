"use client";

import { ADMIN_BASE } from "@/config/urls.mjs";
import { lp, tr } from "@/i18n/config";
import { Container, SectionHeading } from "@/components/ui";
import { DestinationTile } from "@/components/tours/TourCard";
import { ListOf, Shown, Txt } from "../blocks";
import BrushHeroPreview from "./BrushHeroPreview";
import { Auto, Loading, SitePage, Zone, useCatalog, useDict } from "./site-frame";

/**
 * Bản xem trước trang Tất cả điểm đến — dựng y như app/[lang]/destinations/page.js.
 * Tên miền, thẻ điểm đến (ảnh, tên, số tour): dữ liệu mục Điểm đến (chỉ xem). Sửa được: đầu trang, chữ sau số
 * lượng điểm đến, lời giới thiệu từng miền.
 */

const DESTS = `${ADMIN_BASE}/destinations`;

export default function DestinationsPreview({ lang }) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  const regions = catalog?.regions ?? [];

  return (
    <SitePage lang={lang} path="/destinations">
      <BrushHeroPreview images="heroImages" title="heroTitle" subtitle="heroIntro" />

      <Zone name="Thanh chọn miền" at="top-1/2 left-2 -translate-y-1/2">
        <nav className="border-b border-sand-300/60 bg-cream-50">
          <Container className="flex justify-center gap-2 py-3">
            {regions.map((r) => (
              <span
                key={r.slug}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-forest-700 ring-1 ring-sand-300"
              >
                {tr(r.short || r.name, lang)}
              </span>
            ))}
          </Container>
        </nav>
      </Zone>

      <ListOf f="regionIntros">
        {(ri) => {
          const r = regions[ri];
          const list = catalog?.destinationsByRegion(r?.slug) ?? [];
          return (
            <Zone key={ri} name={r ? tr(r.name, lang) : `Miền ${ri + 1}`}>
              <section
                className={`py-14 lg:py-[4.5rem] ${ri % 2 ? "bg-cream-100" : "bg-cream-50"}`}
              >
                <Container>
                  <SectionHeading
                    eyebrow={
                      <>
                        {list.length} <Txt f="placesCount" />
                      </>
                    }
                    title={r ? tr(r.name, lang) : <Shown f={`regionIntros.${ri}.intro`} />}
                    subtitle={<Txt f={`regionIntros.${ri}.intro`} />}
                  />
                  {catalog && dict ? (
                    <Auto
                      href={DESTS}
                      label="Điểm đến, ảnh & số tour · sửa ở mục Điểm đến"
                      at="-top-3 right-0"
                      className="flex flex-wrap justify-center gap-4 lg:gap-6"
                    >
                      {list.map((x) => (
                        <div
                          key={x.slug}
                          className="w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-1.125rem)]"
                        >
                          <DestinationTile
                            href={`${lp(lang)}/destinations/${x.slug}`}
                            name={tr(x.name, lang)}
                            count={catalog.countFor(x.slug)}
                            image={x.image}
                            tripsLabel={dict.common.trips}
                            className="aspect-[3/4]"
                            sizes="(min-width: 1024px) 50vw, (min-width: 768px) 66vw, 100vw"
                          />
                        </div>
                      ))}
                    </Auto>
                  ) : (
                    <Loading className="min-h-[520px]" />
                  )}
                </Container>
              </section>
            </Zone>
          );
        }}
      </ListOf>
    </SitePage>
  );
}
