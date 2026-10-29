import { Suspense } from "react";
import { tr } from "@/i18n/config";
import { cardLabels } from "@/lib/labels";
import { destinationsByRegion, regions } from "@/data/destinations";
import { themes } from "@/data/themes";
import { toCard } from "@/data/tours";
import TourCard from "./TourCard";
import TourExplorer from "./TourExplorer";

/**
 * Lưới tour có bộ lọc. Phần fallback (render sẵn trên server) liệt kê 12 tour đầu
 * để công cụ tìm kiếm luôn đọc được liên kết tour.
 */
export default function TourListing({ lang, dict, tours, hide, badge, variant }) {
  const labels = cardLabels(dict);
  const cards = tours.map((t) => toCard(t, lang));
  const destinationOptions = regions.flatMap((r) => [
    { value: r.slug, label: tr(r.name, lang), region: true },
    ...destinationsByRegion(r.slug).map((d) => ({ value: d.slug, label: tr(d.name, lang) })),
  ]);
  const themeOptions = themes.map((t) => ({ value: t.slug, label: tr(t.name, lang) }));

  const fallback = (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.slice(0, 12).map((c) => (
        <TourCard key={c.slug} card={c} lang={lang} labels={labels} badge={badge} />
      ))}
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      <TourExplorer
        lang={lang}
        cards={cards}
        labels={labels}
        t={dict.tours}
        destinationOptions={destinationOptions}
        themeOptions={themeOptions}
        hide={hide}
        badgeFor={undefined}
        variant={variant}
      />
    </Suspense>
  );
}
