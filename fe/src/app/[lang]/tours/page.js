import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import TourListing from "@/components/tours/TourListing";
import { href, lp } from "@/i18n/config";
import { getCatalog } from "@/lib/catalog";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/tours",
    title: dict.tours.allTitle,
    description: dict.tours.allIntro,
  });
}

export default async function ToursPage({ params }) {
  const { allTours } = await getCatalog();
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.tours;

  return (
    <>
      <BrushHero
        title={t.allTitle}
        subtitle={t.allIntro}
        images={[
          "/images/tours/cao-bang.jpg",
          "/images/tours/v2/hoi-an-92090.jpg",
          "/images/tours/v2/phu-quoc-14012373.jpg",
        ]}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: t.allTitle }]}
      />
      <section className="bg-surface pt-4 pb-14 lg:pb-[4.5rem]">
        <Container>
          {/* Hộp "Chưa chọn được tour?" cuối danh sách; lọc 1 / 2 / 3 tuần → lời giới thiệu trên danh sách
              + lời mời thiết kế riêng đúng số tuần thay cho hộp chung (TourExplorer) */}
          <TourListing
            lang={lang}
            dict={dict}
            tours={allTours}
            advice={{
              title: t.notSureTitle,
              text: t.notSureText,
              cta: t.notSureCta,
              href: `${lp(lang)}/plan-your-trip`,
            }}
            weekCopy={{ ...dict.packages.best, button: dict.packages.ctaButton }}
          />
        </Container>
      </section>
    </>
  );
}
