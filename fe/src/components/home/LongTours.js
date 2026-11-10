"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui";
import TourCard from "@/components/tours/TourCard";
import { lp } from "@/i18n/config";

// Nhóm theo tuần – giống bộ lọc gói tour của Link 3 (khung bố cục chính)
const groups = {
  all: () => true,
  w1: (c) => c.days <= 8,
  w2: (c) => c.days >= 9 && c.days <= 15,
  w3: (c) => c.days >= 16,
};

/**
 * Khối tour dài ngày – góp ý khách cho Link 2: bản cũ là slider "phải click mới xem từng tour".
 * Nay là LƯỚI HIỆN SẴN: tối đa 8 tour bày cùng lúc (4 cột × 2 hàng desktop, 2 cột mobile),
 * thẻ khung vòm nền kem, kèm bộ lọc theo số tuần như Link 3.
 */
export default function LongTours({ lang, dict, cards, labels }) {
  const t = dict.home;
  const [tab, setTab] = useState("all");
  const list = cards.filter(groups[tab]).slice(0, 8);

  return (
    <section className="bg-cream-50 py-14 lg:py-[4.5rem]" id="long-tours">
      <Container>
        <header className="mx-auto mb-8 max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-wide text-forest-900 sm:text-[2rem]">
            {t.longToursTitle}
          </h2>
          <p className="mt-4 text-ink/70 italic">{t.longToursSubtitle}</p>
        </header>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {Object.keys(groups).map((k) => {
            const n = cards.filter(groups[k]).length;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                aria-pressed={tab === k}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold ring-1 transition",
                  tab === k
                    ? "bg-forest-700 text-white ring-forest-700"
                    : "bg-white text-ink/75 ring-sand-300 hover:text-forest-700 hover:ring-forest-700",
                )}
              >
                {t.weekTabs[k]}
                <span className={cn("ml-1.5 text-xs", tab === k ? "text-white/70" : "text-muted")}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        <div
          key={tab}
          className="grid animate-fade-up grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6"
        >
          {list.map((card) => (
            <TourCard key={card.slug} lang={lang} card={card} labels={labels} compact />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href={`${lp(lang)}/packages`}
            className="inline-block rounded-full bg-clay-500 px-7 py-3 font-semibold text-white shadow-md transition-colors hover:bg-clay-600"
          >
            {t.longToursCta}
          </Link>
        </div>
      </Container>
    </section>
  );
}
