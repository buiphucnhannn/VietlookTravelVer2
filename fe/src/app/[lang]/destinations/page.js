import { getDictionary } from "@/i18n/dictionaries";
import { href, lp, tr } from "@/i18n/config";
import { pageMetadata, seoField } from "@/lib/seo";
import { Container, Reveal, SectionHeading } from "@/components/ui";
import { BannerHero } from "@/components/ui/PageHero";
import { DestinationTile } from "@/components/tours/TourCard";
import { getCatalog } from "@/lib/catalog";
import { getPageSeo, getPageText } from "@/lib/page-copy/server";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = await getPageText("destinations", lang, dict);
  const seo = await getPageSeo("destinations"); // CMS → Giao diện trang → Hiển thị trên Google
  return pageMetadata({
    lang,
    path: "/destinations",
    title: seoField(seo, lang, "title") || p.heroTitle,
    description: seoField(seo, lang, "description") || p.heroIntro,
    image: p.heroImages[0],
  });
}

/**
 * Trang tổng hợp mọi điểm đến (đích của thẻ "Other locations" trên trang chủ – mục 6.7):
 * 3 miền Bắc → Trung → Nam, mỗi miền là lưới thẻ khung vòm → thể hiện dịch vụ toàn Việt Nam.
 */
export default async function DestinationsPage({ params }) {
  const { destinationsByRegion, regions, countFor } = await getCatalog();
  const { lang } = await params;
  const dict = await getDictionary(lang);
  // Chữ / ảnh sửa được trong CMS → Giao diện trang → Tất cả điểm đến (chưa sửa = từ điển + data/regions.js)
  const p = await getPageText("destinations", lang, dict);

  return (
    <>
      <BannerHero
        title={p.heroTitle}
        subtitle={p.heroIntro}
        images={p.heroImages}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: p.heroTitle }]}
      />

      {/* Thanh nhảy nhanh theo miền */}
      <nav className="border-b border-sand-300/60 bg-cream-50">
        <Container className="flex justify-center gap-2 py-3">
          {regions.map((r) => (
            <a
              key={r.slug}
              href={`#${r.slug}`}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-forest-700 ring-1 ring-sand-300 transition hover:bg-forest-700 hover:text-white"
            >
              {tr(r.short || r.name, lang)}
            </a>
          ))}
        </Container>
      </nav>

      {regions.map((r, ri) => {
        const list = destinationsByRegion(r.slug);
        return (
          <section
            key={r.slug}
            id={r.slug}
            className={`scroll-mt-32 py-14 lg:py-[4.5rem] ${ri % 2 ? "bg-cream-100" : "bg-cream-50"}`}
          >
            <Container>
              <SectionHeading
                eyebrow={`${list.length} ${p.placesCount}`}
                title={tr(r.name, lang)}
                subtitle={p.regionIntros[ri]?.intro ?? tr(r.intro, lang)}
              />
              {/* hàng cuối thiếu ô → căn giữa */}
              <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
                {list.map((x, i) => (
                  <Reveal
                    key={x.slug}
                    delay={(i % 4) * 70}
                    className="w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-1.125rem)]"
                  >
                    <DestinationTile
                      href={`${lp(lang)}/destinations/${x.slug}`}
                      name={tr(x.name, lang)}
                      count={countFor(x.slug)}
                      image={x.image}
                      tripsLabel={dict.common.trips}
                      className="aspect-[3/4]"
                      // Khung dọc 3:4 với ảnh ngang → cần ảnh rộng ≈ 2× ô để không mờ
                      sizes="(min-width: 1024px) 50vw, (min-width: 768px) 66vw, 100vw"
                    />
                  </Reveal>
                ))}
              </div>
            </Container>
          </section>
        );
      })}
    </>
  );
}
