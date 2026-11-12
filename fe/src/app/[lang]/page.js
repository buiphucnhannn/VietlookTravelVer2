import { getDictionary } from "@/i18n/dictionaries";
import { lp, tr } from "@/i18n/config";
import { cardLabels } from "@/lib/labels";
import { pageMetadata } from "@/lib/seo";
import { getCatalog } from "@/lib/catalog";
import { reviews } from "@/data/reviews";
import { Container, SectionHeading } from "@/components/ui";
import TrustStrip from "@/components/home/TrustStrip";
import Hero from "@/components/home/Hero";
import ServicesTrio from "@/components/home/ServicesTrio";
import LongTours from "@/components/home/LongTours";
import FeaturedTours from "@/components/home/FeaturedTours";
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
import DrumStats from "@/components/home/DrumStats";
import { withHomeCopy } from "@/components/home/copy";
import { homeImages } from "@/components/home/images";
import { DEFAULT_GRID, pairOf } from "@/data/destination-grid";

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
  const baseDict = await getDictionary(lang);
  const {
    home,
    destinations,
    regions,
    getRegion,
    getDestination,
    plannerOptions,
    homeThemes,
    countFor,
    longTours,
    featuredTours,
    toCard,
    toursByDestination,
    allPosts,
    monthPosts,
  } = await getCatalog();
  // Câu chữ các khối: bản đã sửa trong CMS → Trang chủ đè lên câu mặc định của từ điển (ô trống → mặc định)
  const dict = { ...baseDict, home: withHomeCopy(baseDict.home, home.copy, lang) };
  const labels = cardLabels(dict);
  // Ảnh các khối: ảnh nhân viên thay trong CMS → Trang chủ, ô trống → ảnh có sẵn
  const images = homeImages(home.images);

  // Bản đồ Bắc → Nam: mọi điểm đến có toạ độ + 2 tour nổi bật
  const mapItems = destinations
    .filter((d) => destinationCoords[d.slug])
    .map((d) => ({
      slug: d.slug,
      at: destinationCoords[d.slug],
      name: tr(d.name, lang),
      region: tr(getRegion(d.region)?.name, lang),
      intro: tr(d.intro, lang),
      image: d.image || d.hero,
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

  // Tour nổi bật (ngay dưới khối dịch vụ). Khối tour dài ngày bên dưới đẩy các tour này xuống cuối
  // để tab "Tất cả" không lặp lại đúng những thẻ khách vừa thấy.
  const featured = featuredTours().map((t) => toCard(t, lang));

  const latestPosts = allPosts.filter((p) => p.category !== "vietnam-by-month").slice(0, 4);

  // Lưới điểm đến: 6 ô ảnh (chọn trong CMS → Trang chủ; Huế / Nha Trang tự ghép Đà Nẵng / Đà Lạt —
  // data/destination-grid.js) + dải "điểm đến khác" (các điểm còn lại, Bắc → Nam theo thứ tự trong CMS)
  const pickedSlugs = (home.featuredDestinations ?? []).filter((s) => getDestination(s));
  const featuredSlugs = (pickedSlugs.length ? pickedSlugs : DEFAULT_GRID).filter((s) =>
    getDestination(s),
  );
  const tileCount = (slugs) =>
    new Set(slugs.flatMap((s) => toursByDestination(s).map((t) => t.slug))).size;
  const gridFeatured = featuredSlugs.map((s) => {
    const pair = pairOf(s, featuredSlugs);
    const partner = pair && getDestination(pair);
    if (!partner) return toGridItem(getDestination(s), lang, countFor(s));
    return toGridItem(getDestination(s), lang, tileCount([s, pair]), {
      partner,
      href: `${lp(lang)}/destinations/${getDestination(s).region}`,
    });
  });
  const covered = new Set(featuredSlugs.flatMap((s) => [s, pairOf(s, featuredSlugs)]));
  const gridOthers = destinations.filter((d) => !covered.has(d.slug));

  return (
    <>
      <Hero
        lang={lang}
        dict={dict}
        banner={home.banner}
        regions={regions}
        destinations={destinations}
      />
      <TrustStrip items={dict.home.trust} />
      <ServicesTrio lang={lang} dict={dict} images={images.services} />
      <FeaturedTours lang={lang} dict={dict} labels={labels} cards={featured} />
      <B2BBlock lang={lang} dict={dict} images={images} />
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
      <DestinationGrid lang={lang} dict={dict} featured={gridFeatured} others={gridOthers} />
      <DrumStats lang={lang} dict={dict} />
      <LongTours
        lang={lang}
        t={{
          longToursTitle: dict.home.longToursTitle,
          longToursSubtitle: dict.home.longToursSubtitle,
          weekTabs: dict.home.weekTabs,
          longToursCta: dict.home.longToursCta,
        }}
        labels={labels}
        cards={longTours({ shown: featured.map((c) => c.slug) }).map((t) => toCard(t, lang))}
      />
      <BookingSteps dict={dict} />
      <ThemesMasonry lang={lang} dict={dict} themes={homeThemes()} />
      <CustomTrip lang={lang} dict={dict} starImages={images.star} starLabels={home.starLabels} />

      <WhyUs dict={dict} />
      <PartnerStrip title={dict.home.partnerStrip} />
      <PartnersBlock lang={lang} dict={dict} />
      <Reviews lang={lang} dict={dict} reviews={reviews} />
      <GuideAndMonths lang={lang} dict={dict} posts={latestPosts} months={monthPosts()} />
      <PlannerBlock lang={lang} dict={dict} destinationOptions={plannerOptions(lang)} />
      <AboutBlob lang={lang} dict={dict} image={images.about} />
    </>
  );
}
