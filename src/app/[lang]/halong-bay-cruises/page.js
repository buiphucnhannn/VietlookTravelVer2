import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";
import { cruiseTours } from "@/data/tours";
import { Container } from "@/components/ui";
import { AdviceBox, BannerHero } from "@/components/ui/PageHero";
import TourListing from "@/components/tours/TourListing";
import { href, lp } from "@/i18n/config";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/halong-bay-cruises",
    title: dict.cruises.title,
    description: dict.cruises.intro,
    image: "/images/tours/v2/halong-bay-58597.jpg",
  });
}

export default async function CruisesPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return (
    <>
      <BannerHero
        title={dict.cruises.title}
        subtitle={dict.cruises.intro}
        images={[
          "/images/tours/v2/halong-bay-58597.jpg",
          "/images/tours/hd/ha-long.jpg",
          "/images/tours/v2/halong-bay-5041966.jpg",
        ]}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: dict.cruises.title }]}
      />
      <section className="bg-surface py-14 lg:py-[4.5rem]">
        <Container>
          <TourListing lang={lang} dict={dict} tours={cruiseTours()} hide={["destination"]} />
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
