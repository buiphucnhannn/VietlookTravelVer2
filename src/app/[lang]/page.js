import { getDictionary } from "@/i18n/dictionaries";
import { lp, tr } from "@/i18n/config";
import { cardLabels } from "@/lib/labels";
import { pageMetadata } from "@/lib/seo";
import { destinations, getRegion, plannerOptions, regions } from "@/data/destinations";
import { themes } from "@/data/themes";
import { countFor, longTourCovers, longTours, toCard, toursByDestination } from "@/data/tours";
import { allPosts, monthPosts } from "@/data/posts";
import { reviews } from "@/data/reviews";
import { Container, SectionHeading } from "@/components/ui";
import TrustStrip from "@/components/home/TrustStrip";
import Hero from "@/components/home/Hero";
import ServicesTrio from "@/components/home/ServicesTrio";
import LongTours from "@/components/home/LongTours";
import CustomTrip from "@/components/home/CustomTrip";
import ThemesMasonry from "@/components/home/ThemesMasonry";
import VietnamMap from "@/components/home/VietnamMap";
import { destinationCoords } from "@/data/vietnam-map";
import { durationLabel } from "@/components/tours/TourCard";
import { B2BBlock, WhyUs } from "@/components/home/WhyAndB2B";
import Reviews from "@/components/home/Reviews";
import GuideAndMonths from "@/components/home/GuideAndMonths";
import { AboutBlob, PlannerBlock } from "@/components/home/PlannerAndAbout";
import BookingSteps from "@/components/home/BookingSteps";
import DestinationGrid, { toGridItem } from "@/components/home/DestinationGrid";
import PartnersBlock from "@/components/home/PartnersBlock";
import PartnerStrip from "@/components/home/PartnerStrip";
import HeritageDrum from "@/components/home/HeritageDrum";
import { getDestination } from "@/data/destinations";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    title: { absolute: dict.meta.title },
    description: dict.meta.description,
  });
}

export default async function HomePage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const labels = cardLabels(dict);

  // Bản đồ Bắc → Nam: mọi điểm đến có toạ độ + 2 tour nổi bật
  const mapItems = destinations
    .filter((d) => destinationCoords[d.slug])
    .map((d) => ({
      slug: d.slug,
      at: destinationCoords[d.slug],
      name: tr(d.name, lang),
      region: tr(getRegion(d.region)?.name, lang),
      intro: tr(d.intro, lang),
      image: d.hero || d.image,
      href: `${lp(lang)}/destinations/${d.slug}`,
      count: countFor(d.slug),
      tours: toursByDestination(d.slug)
        .slice(0, 2)
        .map((t) => {
          const c = toCard(t, lang);
          return {
            slug: c.slug,
            title: c.title,
            image: c.image,
            price: c.price,
            duration: durationLabel(c, labels),
            href: `${lp(lang)}/tours/${c.slug}`,
          };
        }),
    }));

  const latestPosts = allPosts.filter((p) => p.category !== "vietnam-by-month").slice(0, 4);

  // Lưới điểm đến (yêu cầu 20): 5 điểm chính + các điểm còn lại cho thẻ "Other locations"
  const featuredSlugs = ["da-nang", "phu-quoc", "halong-bay", "hanoi", "ho-chi-minh-city"];
  const gridFeatured = featuredSlugs.map((s) => toGridItem(getDestination(s), lang, countFor(s)));
  const gridOthers = destinations.filter((d) => !featuredSlugs.includes(d.slug));

  return (
    <>
      <Hero lang={lang} dict={dict} />
      <TrustStrip items={dict.home.trust} />
      <ServicesTrio lang={lang} dict={dict} />
      <B2BBlock lang={lang} dict={dict} />
      <section className="bg-cream-100 py-14 lg:py-[4.5rem]" id="map">
        <Container>
          <SectionHeading
            eyebrow={dict.home.mapEyebrow}
            title={dict.home.mapTitle}
            subtitle={dict.home.mapSubtitle}
          />
          <VietnamMap
            items={mapItems}
            lang={lang}
            labels={{
              featured: dict.home.mapFeatured,
              discover: dict.home.gridDiscover,
              tours: dict.home.gridTours,
              from: dict.common.from,
            }}
          />
        </Container>
      </section>
      <DestinationGrid
        lang={lang}
        dict={dict}
        featured={gridFeatured}
        others={gridOthers}
        total={destinations.length + regions.length}
      />
      <HeritageDrum lang={lang} dict={dict} />
      <LongTours
        lang={lang}
        dict={dict}
        labels={labels}
        cards={longTours().map((t) => ({
          ...toCard(t, lang),
          image: longTourCovers[t.slug] || toCard(t, lang).image,
        }))}
      />
      <BookingSteps dict={dict} />
      <ThemesMasonry lang={lang} dict={dict} themes={themes} />
      <CustomTrip lang={lang} dict={dict} />

      <WhyUs dict={dict} />
      <PartnerStrip title={dict.home.partnerStrip} />
      <PartnersBlock lang={lang} dict={dict} />
      <Reviews lang={lang} dict={dict} reviews={reviews} />
      <GuideAndMonths lang={lang} dict={dict} posts={latestPosts} months={monthPosts()} />
      <PlannerBlock lang={lang} dict={dict} destinationOptions={plannerOptions(lang)} />
      <AboutBlob lang={lang} dict={dict} />
    </>
  );
}
