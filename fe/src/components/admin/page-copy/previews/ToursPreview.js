"use client";

import { Container } from "@/components/ui";
import { SitePage, Zone, useCatalog, useDict } from "./site-frame";
import { AdviceEdit, TourHero, TourListPreview } from "./tours-shared";

/**
 * Bản xem trước trang Tất cả tour — dựng y như app/[lang]/tours/page.js.
 * Bộ lọc + lưới thẻ tour: dữ liệu mục Tour (chỉ xem). Lời giới thiệu khi lọc 1 / 2 / 3 tuần: trang Gói tour.
 */
const allTours = (c) => c.allTours;

export default function ToursPreview({ lang }) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  return (
    <SitePage lang={lang} path="/tours">
      <TourHero />
      <Zone name="Danh sách tour" at="bottom-2 left-2">
        <section className="bg-surface pt-4 pb-14 lg:pb-[4.5rem]">
          <Container>
            <TourListPreview
              lang={lang}
              dict={dict}
              catalog={catalog}
              tours={allTours}
              label="Bộ lọc & mọi tour đang mở bán · sửa ở mục Tour"
            />
            <div className="mt-10">
              <AdviceEdit lang={lang} title="adviceTitle" text="adviceText" cta="adviceCta" />
            </div>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
