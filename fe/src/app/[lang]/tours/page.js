import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata, seoField } from "@/lib/seo";
import { Container } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import TourListing from "@/components/tours/TourListing";
import { href, lp } from "@/i18n/config";
import { getCatalog } from "@/lib/catalog";
import { getPageSeo, getPageText } from "@/lib/page-copy/server";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = await getPageText("tours", lang, dict);
  const seo = await getPageSeo("tours"); // CMS → Giao diện trang → Hiển thị trên Google
  return pageMetadata({
    lang,
    path: "/tours",
    title: seoField(seo, lang, "title") || p.heroTitle,
    description: seoField(seo, lang, "description") || p.heroIntro,
  });
}

/** Lời giới thiệu + hộp thiết kế riêng khi lọc 1 / 2 / 3 tuần: dùng chung nội dung khối 1 / 2 / 3 tuần của trang Gói tour */
const weekCopyOf = (pk) => ({
  ...Object.fromEntries(
    [1, 2, 3].map((n) => [
      n,
      {
        title: pk[`week${n}BestTitle`],
        text: pk[`week${n}BestText`],
        ctaTitle: pk[`week${n}CtaTitle`],
        ctaText: pk[`week${n}CtaText`],
      },
    ]),
  ),
  button: pk.ctaButton,
});

export default async function ToursPage({ params }) {
  const { allTours } = await getCatalog();
  const { lang } = await params;
  const dict = await getDictionary(lang);
  // Chữ / ảnh sửa được trong CMS → Giao diện trang → Tất cả tour (+ khối 1 / 2 / 3 tuần ở trang Gói tour)
  const [p, pk] = await Promise.all([
    getPageText("tours", lang, dict),
    getPageText("packages", lang, dict),
  ]);

  return (
    <>
      <BrushHero
        title={p.heroTitle}
        subtitle={p.heroIntro}
        images={p.heroImages}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: p.heroTitle }]}
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
              title: p.adviceTitle,
              text: p.adviceText,
              cta: p.adviceCta,
              href: `${lp(lang)}/plan-your-trip`,
            }}
            weekCopy={weekCopyOf(pk)}
          />
        </Container>
      </section>
    </>
  );
}
