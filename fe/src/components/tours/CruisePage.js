import Link from "next/link";
import { Ship } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui";
import { AdviceBox, BannerHero } from "@/components/ui/PageHero";
import TourListing from "@/components/tours/TourListing";
import { href, lp } from "@/i18n/config";
import { getCatalog } from "@/lib/catalog";

/**
 * Các trang du thuyền (mục 4.2.1 của khách), mỗi loại một đường dẫn riêng để Google lập chỉ mục:
 * - /halong-bay-cruises            : mọi tour Hạ Long (du thuyền + tour bộ) — trang cũ, giữ nguyên
 * - /halong-bay-overnight-cruises  : du thuyền Hạ Long ngủ đêm
 * - /day-cruises                   : du thuyền / tàu tham quan trong ngày ở Hạ Long, Nha Trang, Phú Quốc
 * Phân loại tour: lib/tour-categories.js (cruiseKind).
 */
export const CRUISE_PAGES = {
  all: {
    path: "/halong-bay-cruises",
    images: [
      "/images/tours/v2/halong-bay-58597.jpg",
      "/images/tours/hd/ha-long.jpg",
      "/images/tours/v2/halong-bay-5041966.jpg",
    ],
    hide: ["destination"],
  },
  overnight: {
    path: "/halong-bay-overnight-cruises",
    images: [
      "/images/tours/v2/halong-bay-5041966.jpg",
      "/images/tours/v2/halong-bay-58597.jpg",
      "/images/tours/hd/ha-long.jpg",
    ],
    hide: ["destination"],
  },
  day: {
    path: "/day-cruises",
    images: [
      "/images/b2b/phu-quoc.webp",
      "/images/tours/hd/tourdulichnhatranggiare.jpg",
      "/images/tours/hd/ha-long.jpg",
    ],
    hide: [],
  },
};

const copy = (c, kind) =>
  ({
    all: { title: c.title, intro: c.intro },
    overnight: { title: c.overnightTitle, intro: c.overnightIntro },
    day: { title: c.dayTitle, intro: c.dayIntro },
  })[kind];

export async function cruiseMetadata(kind, params) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { title, intro } = copy(dict.cruises, kind);
  return pageMetadata({
    lang,
    path: CRUISE_PAGES[kind].path,
    title,
    description: intro,
    image: CRUISE_PAGES[kind].images[0],
  });
}

export default async function CruisePage({ kind, params }) {
  const { cruiseTours, cruisesByKind } = await getCatalog();
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const c = dict.cruises;
  const { title, intro } = copy(c, kind);
  const lists = {
    all: cruiseTours(),
    overnight: cruisesByKind("overnight"),
    day: cruisesByKind("day"),
  };
  const page = CRUISE_PAGES[kind];

  return (
    <>
      <BannerHero
        title={title}
        subtitle={intro}
        images={page.images}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: title }]}
      />
      <section className="bg-surface py-14 lg:py-[4.5rem]">
        <Container>
          {/* Chuyển nhanh giữa các loại du thuyền (liên kết thật → mỗi loại một trang riêng) */}
          <nav aria-label={dict.nav.cruisesCol} className="mb-6 flex flex-wrap gap-2">
            {["overnight", "day", "all"].map((k) => (
              <Link
                key={k}
                href={href(lang, CRUISE_PAGES[k].path)}
                aria-current={k === kind ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors",
                  k === kind
                    ? "bg-brand-600 text-white ring-brand-600"
                    : "bg-white text-ink ring-border hover:text-brand-700 hover:ring-brand-300",
                )}
              >
                {k !== "all" && <Ship className="size-4" aria-hidden />}
                {c.tabs[k]}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    k === kind ? "bg-white/20" : "bg-surface text-muted",
                  )}
                >
                  {lists[k].length}
                </span>
              </Link>
            ))}
          </nav>
          <TourListing lang={lang} dict={dict} tours={lists[kind]} hide={page.hide} />
          <div className="mt-10">
            <AdviceBox
              title={dict.tours.notSureTitle}
              text={dict.tours.notSureText}
              cta={dict.tours.notSureCta}
              href={`${lp(lang)}/plan-your-trip`}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
