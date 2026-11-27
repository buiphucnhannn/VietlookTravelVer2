"use client";

import { useMemo } from "react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { lp, tr } from "@/i18n/config";
import { cardLabels } from "@/lib/labels";
import AdviceBox from "@/components/ui/AdviceBox";
import TourExplorer from "@/components/tours/TourExplorer";
import { HeroImagePills, ImagePill, Txt } from "../blocks";
import BrushHeroPreview from "./BrushHeroPreview";
import { Auto, Loading } from "./site-frame";

/**
 * Khối dùng chung cho bản xem trước nhóm "Tour & du thuyền" (Tất cả tour, 3 trang du thuyền, Gói tour):
 * đầu trang BrushHero (3 ảnh + tiêu đề nét cọ, trang Gói tour có khung 3 ảnh ghép), hộp tư vấn (AdviceBox),
 * danh sách tour có bộ lọc (TourExplorer của website + dữ liệu thật mục Tour, chỉ xem).
 */

export const TOURS_ADMIN = `${ADMIN_BASE}/tours`;

/** Đầu trang 3 ảnh + tiêu đề + giới thiệu. `collage`: khung 3 ảnh ghép bên phải (màn hình lớn chỉ giữ ảnh nền đầu) */
export function TourHero({ collage }) {
  return (
    <BrushHeroPreview
      images="heroImages"
      title="heroTitle"
      subtitle="heroIntro"
      collage={collage ? "collageImages" : undefined}
      pills={false}
    >
      <HeroImagePills f="heroImages" extraClassName={collage && "lg:invisible"} />
      {collage && (
        <div className="absolute right-4 bottom-1.5 z-20 hidden items-center gap-1 lg:flex">
          {[0, 1, 2].map((i) => (
            <ImagePill
              key={i}
              f={`collageImages.${i}`}
              title={`Ảnh ghép ${i + 1}`}
              floating={false}
            />
          ))}
        </div>
      )}
    </BrushHeroPreview>
  );
}

/** Hộp tư vấn của website (AdviceBox), chữ sửa được (title / text / cta: đường dẫn ô) */
export function AdviceEdit({ lang, title, text, cta }) {
  return (
    <AdviceBox
      title={<Txt f={title} />}
      text={<Txt f={text} />}
      cta={<Txt f={cta} dark />}
      href={`${lp(lang)}/plan-your-trip`}
    />
  );
}

/**
 * Danh sách tour có bộ lọc — đúng như components/tours/TourListing.js (thẻ tour, bộ lọc, phân trang) với dữ liệu
 * thật; chỉ xem (sửa tour ở mục Tour). `tours(catalog)`: danh sách tour của trang.
 */
export function TourListPreview({ lang, dict, catalog, tours, hide, badge, variant, label }) {
  const data = useMemo(() => {
    if (!dict || !catalog) return null;
    const { destinationsByRegion, regions, themes, toCard } = catalog;
    return {
      labels: cardLabels(dict),
      cards: tours(catalog).map((t) => toCard(t, lang)),
      destinationOptions: regions.flatMap((r) => [
        { value: r.slug, label: tr(r.name, lang), region: true },
        ...destinationsByRegion(r.slug).map((d) => ({ value: d.slug, label: tr(d.name, lang) })),
      ]),
      themeOptions: themes.map((t) => ({ value: t.slug, label: tr(t.name, lang) })),
    };
  }, [dict, catalog, tours, lang]);
  if (!data) return <Loading className="min-h-[900px]" />;
  return (
    <Auto
      href={TOURS_ADMIN}
      label={label ?? "Danh sách tour tự động · sửa ở mục Tour"}
      at="-top-3 right-0"
    >
      <TourExplorer
        lang={lang}
        cards={data.cards}
        labels={data.labels}
        t={dict.tours}
        destinationOptions={data.destinationOptions}
        themeOptions={data.themeOptions}
        hide={hide}
        badgeFor={badge}
        variant={variant}
      />
    </Auto>
  );
}
