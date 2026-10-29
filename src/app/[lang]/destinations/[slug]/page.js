import { Suspense } from "react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { fill, href, locales, lp, tr } from "@/i18n/config";
import { pageMetadata, notFoundMetadata } from "@/lib/seo";
import {
  destinations,
  destinationsByRegion,
  getDestination,
  getRegion,
  regions,
} from "@/data/destinations";
import { countFor, toursByDestination } from "@/data/tours";
import { allPosts } from "@/data/posts";
import { getGuideCategory } from "@/data/guide-categories";
import { Container, SectionHeading } from "@/components/ui";
import { AdviceBox, BlobHero } from "@/components/ui/PageHero";
import TourListing from "@/components/tours/TourListing";
import { DestinationTile } from "@/components/tours/TourCard";
import PostCard from "@/components/guide/PostCard";

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    [...regions, ...destinations].map((d) => ({ lang, slug: d.slug })),
  );
}

function resolve(slug) {
  const region = getRegion(slug);
  if (region) return { item: region, isRegion: true };
  const dest = getDestination(slug);
  return dest ? { item: dest, isRegion: false } : null;
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const r = resolve(slug);
  if (!r) return notFoundMetadata();
  const dict = await getDictionary(lang);
  const name = tr(r.item.name, lang);
  return pageMetadata({
    lang,
    path: `/destinations/${slug}`,
    title: fill(dict.destination.bestTours, { name }),
    // Mô tả ngắn → thêm câu ngữ cảnh để đủ ý cho kết quả tìm kiếm
    description:
      lang === "zh"
        ? `${tr(r.item.intro, lang)}${name}私人线路与定制行程，由本地地接社 Vietlook Travel 安排。`
        : `${tr(r.item.intro, lang)} Private ${name} tours and tailor-made trips by local operator Vietlook Travel.`,
    image: r.item.hero || r.item.image,
  });
}

async function DestinationPageContent({ params }) {
  const { lang, slug } = await params;
  const r = resolve(slug);
  if (!r) notFound();
  const dict = await getDictionary(lang);
  const { item, isRegion } = r;
  const name = tr(item.name, lang);
  const tours = toursByDestination(slug);
  const region = isRegion ? item : getRegion(item.region);
  const places = destinationsByRegion(region.slug).filter((d) => d.slug !== slug);
  const guides = allPosts
    .filter((p) =>
      isRegion ? places.some((d) => d.slug === p.destination) : p.destination === slug,
    )
    .slice(0, 3);

  return (
    <>
      <BlobHero
        title={
          isRegion
            ? fill(dict.destination.regionTours, { name })
            : `${name} ${lang === "zh" ? "线路" : "Tours"}`
        }
        text={tr(item.intro, lang)}
        images={[item.hero || item.image, item.image, ...tours.flatMap((x) => x.gallery)]}
        link={{ href: "#tours", label: dict.destination.viewTours }}
        breadcrumbs={[
          { label: "Vietlook", href: href(lang) },
          ...(isRegion
            ? []
            : [{ label: tr(region.name, lang), href: `${lp(lang)}/destinations/${region.slug}` }]),
          { label: name },
        ]}
      />

      <section id="tours" className="bg-surface pb-14 lg:pb-[4.5rem]">
        <Container>
          <div className="mb-8 rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-border sm:px-8">
            <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-[2rem]">
              {fill(dict.destination.bestTours, { name })}
            </h2>
          </div>
          <TourListing
            lang={lang}
            dict={dict}
            tours={tours}
            hide={isRegion ? [] : ["destination"]}
          />

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

      <section className="py-14 lg:py-[4.5rem]">
        <Container>
          <SectionHeading title={fill(dict.destination.places, { name: tr(region.name, lang) })} />
          {/* hàng cuối thiếu ô → căn giữa */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {places.map((d) => (
              <DestinationTile
                key={d.slug}
                href={`${lp(lang)}/destinations/${d.slug}`}
                name={tr(d.name, lang)}
                count={countFor(d.slug)}
                image={d.image}
                tripsLabel={dict.common.trips}
                className="aspect-[4/3] w-[calc(50%-0.5rem)] sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)]"
              />
            ))}
          </div>
        </Container>
      </section>

      {guides.length > 0 && (
        <section className="bg-brand-50 py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={fill(dict.destination.guide, { name })} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((p) => (
                <PostCard
                  key={p.slug}
                  post={p}
                  lang={lang}
                  categoryName={tr(getGuideCategory(p.category)?.name, lang)}
                />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

// Đọc params bên trong <Suspense> để điều hướng hiển thị tức thì (khung chờ),
// nội dung vẫn được prerender sẵn nhờ generateStaticParams.
export default function DestinationPage(props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DestinationPageContent {...props} />
    </Suspense>
  );
}
