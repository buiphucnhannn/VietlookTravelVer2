import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";
import { allTours } from "@/data/tours";
import { Container } from "@/components/ui";
import { AdviceBox, BrushHero } from "@/components/ui/PageHero";
import TourListing from "@/components/tours/TourListing";
import { href, lp } from "@/i18n/config";

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
          <TourListing lang={lang} dict={dict} tours={allTours} />
          <div className="mt-10">
            <AdviceBox
              title={t.notSureTitle}
              text={t.notSureText}
              cta={t.notSureCta}
              href={`${lp(lang)}/plan-your-trip`}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
