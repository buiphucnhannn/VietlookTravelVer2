import Image from "next/image";
import Link from "next/link";
import { CircleCheck, Eye } from "lucide-react";
import { lp, tr } from "@/i18n/config";
import { formatUSD } from "@/lib/utils";
import { Button } from "@/components/ui";

/**
 * 1 dòng gói tour trên trang Gói tour 1–3 tuần (app/[lang]/packages) — dùng chung với bản xem trước trong CMS
 * (Giao diện trang → Gói tour 1–3 tuần).
 */
export default function PackageRow({ tour, lang, dict, getDestination }) {
  const c = dict.common;
  const url = `${lp(lang)}/tours/${tour.slug}`;
  const stops = tour.destinations.map((d) => tr(getDestination(d)?.name, lang)).filter(Boolean);
  return (
    <article className="grid gap-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-border sm:grid-cols-[220px_1fr] sm:p-8">
      <Link
        href={url}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[4/3] overflow-hidden rounded-xl sm:aspect-square"
      >
        <Image
          src={tour.image}
          alt=""
          fill
          sizes="220px"
          className="object-cover transition-transform duration-700 hover:scale-105"
        />
      </Link>
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          <Link href={url} className="hover:text-brand-600">
            {tr(tour.title, lang)}
          </Link>
        </h3>
        <p className="mt-2 text-lg font-semibold text-brand-600">
          {tour.price ? (
            <>
              {c.from}: {formatUSD(tour.price)}
              {tour.originalPrice && (
                <span className="ml-2 text-base font-normal text-muted line-through">
                  {formatUSD(tour.originalPrice)}
                </span>
              )}
            </>
          ) : (
            c.priceOnRequest
          )}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {stops.map((s) => (
            <li key={s} className="flex items-center gap-1.5 text-ink/80">
              <CircleCheck className="size-4 text-brand-500" /> {s}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <details className="group text-sm text-muted">
            <summary className="flex cursor-pointer list-none items-center gap-2 hover:text-brand-600">
              <Eye className="size-4" /> {dict.packages.quickView}
            </summary>
            <ol className="mt-3 space-y-1.5 border-l-2 border-brand-100 pl-4">
              {(tr(tour.route, lang) || []).map((r, i) => (
                <li key={i}>
                  <strong className="text-brand-600">
                    {c.day} {i + 1}:
                  </strong>{" "}
                  {r}
                </li>
              ))}
            </ol>
          </details>
          <Button href={url} variant="primary" className="ml-auto">
            {c.viewTour}
          </Button>
        </div>
      </div>
    </article>
  );
}
