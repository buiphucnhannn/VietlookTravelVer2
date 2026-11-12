import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui";
import Carousel from "@/components/ui/Carousel";
import TourCard from "@/components/tours/TourCard";
import { lp } from "@/i18n/config";

/**
 * Khối "Tour nổi bật" trang chủ (CMS → Trang chủ → Tour nổi bật; chưa chọn → tour đánh dấu "nổi bật").
 * Khác hẳn khối tour dài ngày bên dưới: thẻ vòm dọc 4:5 có mô tả ngắn, xếp thành dải trượt
 * (4 thẻ desktop · 2 tablet · 1 thẻ + mép thẻ kế bên trên mobile). Không có tour nào → ẩn cả khối.
 */
export default function FeaturedTours({ lang, dict, cards, labels }) {
  if (!cards.length) return null;
  const t = dict.home;
  const few = cards.length <= 4; // ít thẻ → lưới tĩnh, không cần dải trượt

  return (
    <section className="bg-white py-14 lg:py-[4.5rem]" id="featured-tours">
      <Container>
        <SectionHeading
          eyebrow={t.featuredEyebrow}
          title={t.featuredTitle}
          subtitle={t.featuredSubtitle}
        />

        {few ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {cards.map((card) => (
              <TourCard key={card.slug} lang={lang} card={card} labels={labels} />
            ))}
          </div>
        ) : (
          <Carousel itemClassName="basis-[82%] sm:basis-1/2 lg:basis-1/4" label={t.featuredTitle}>
            {cards.map((card) => (
              <TourCard
                key={card.slug}
                lang={lang}
                card={card}
                labels={labels}
                alignAt={false}
                className="h-full"
              />
            ))}
          </Carousel>
        )}

        <div className="mt-8 text-center lg:mt-10">
          <Link
            href={`${lp(lang)}/tours`}
            className="inline-flex items-center gap-2 rounded-full border-2 border-clay-500 px-6 py-2.5 font-semibold text-clay-600 transition-colors hover:bg-clay-500 hover:text-white"
          >
            {t.featuredCta}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
