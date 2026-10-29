import Image from "next/image";
import { Quote } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { tr } from "@/i18n/config";
import { Container, SectionHeading } from "@/components/ui";
import Carousel from "@/components/ui/Carousel";
import { GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";

/** Cành nguyệt quế nhỏ hai bên điểm "5★" (theo mẫu thẻ đánh giá khách gửi). */
function Laurel({ flip, className }) {
  return (
    <svg
      viewBox="0 0 12 24"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <path d="M10 23C4 19 2 13 3 3" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {[5, 9, 13, 17].map((y, i) => (
        <ellipse
          key={y}
          cx={i < 2 ? 2.4 + i * 0.6 : 3.6 + (i - 2)}
          cy={y}
          rx="2.4"
          ry="1.2"
          transform={`rotate(-40 ${3 + i * 0.5} ${y})`}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/**
 * Slider thẻ đánh giá theo mẫu khách gửi (lotuscharmtravel.com): nền xanh rừng đậm, thẻ sáng;
 * tiêu đề + nội dung phía trên, chân thẻ có avatar tròn, chuyến đi, ngày và "5★" kèm nguyệt quế.
 * Dùng cho EN + ZH.
 */
export default function Reviews({ lang, dict, reviews }) {
  const t = dict.home;
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB", {
          year: "numeric",
          month: "short",
        })
      : "";
  return (
    <section
      className="relative isolate overflow-hidden bg-forest-900 py-14 text-white lg:py-[4.5rem]"
      id="reviews"
    >
      {/* hoa văn mờ (vòng tròn đồng tâm kiểu trống đồng) */}
      <svg
        aria-hidden
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -top-32 -left-32 -z-10 size-[520px] text-white/[0.05]"
      >
        {[60, 100, 140, 180].map((r) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        ))}
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -right-40 -bottom-40 -z-10 size-[560px] text-white/[0.05]"
      >
        {[60, 100, 140, 180].map((r) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        ))}
      </svg>
      <Container>
        <SectionHeading
          eyebrow={t.reviewsEyebrow}
          title={t.reviewsTitle}
          subtitle={t.reviewsSubtitle}
          light
        />
        <Carousel
          itemClassName="basis-[90%] md:basis-1/2 lg:basis-1/3"
          autoplay={7000}
          label={t.reviewsTitle}
        >
          {reviews.map((r) => (
            <figure
              key={r.title.en}
              className="flex h-full flex-col overflow-hidden rounded-3xl bg-cream-50 text-ink shadow-[0_24px_50px_-28px_rgba(0,0,0,0.6)]"
            >
              <div className="relative flex-1 px-6 pt-7 pb-5">
                <Quote className="absolute top-5 right-5 size-8 text-amber-brand/40" />
                <h3 className="pr-8 text-lg leading-snug font-bold text-forest-700">
                  {tr(r.title, lang)}
                </h3>
                <blockquote className="mt-3 line-clamp-5 leading-relaxed text-ink/80">
                  {tr(r.text, lang)}
                </blockquote>
              </div>
              {/* chân thẻ: avatar – chuyến đi – ngày – 5★ nguyệt quế */}
              <figcaption className="mx-6 flex items-center gap-3 border-t border-sand-300/70 py-4">
                <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white">
                  <Image
                    src={r.avatar || r.photo}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate font-bold text-ink">{tr(r.trip, lang)}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    {fmtDate(r.date) || "2026"}
                    {r.source === "google" ? (
                      <GoogleIcon className="size-3.5" />
                    ) : (
                      <TripAdvisorIcon className="size-4 text-[#00af87]" />
                    )}
                  </span>
                </span>
                <span
                  className="flex items-center text-[#c9a227]"
                  aria-label={`${r.rating} / 5`}
                  title={`${r.rating} / 5`}
                >
                  <Laurel className="h-6 w-3" />
                  <span className="mx-0.5 text-sm font-bold">{r.rating}★</span>
                  <Laurel flip className="h-6 w-3" />
                </span>
              </figcaption>
            </figure>
          ))}
        </Carousel>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80">
            {t.reviewsOn}
          </span>
          <a
            href={siteConfig.social.tripadvisor}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-ink shadow-sm transition hover:shadow-md"
          >
            <TripAdvisorIcon className="size-8 text-[#00af87]" />
            <span className="leading-tight">
              <span className="block font-bold">Tripadvisor</span>
              <span className="text-xs text-muted">{dict.common.ratingText}</span>
            </span>
          </a>
          <a
            href={siteConfig.social.google}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-ink shadow-sm transition hover:shadow-md"
          >
            <GoogleIcon className="size-7" />
            <span className="leading-tight">
              <span className="block font-bold">Google</span>
              <span className="text-xs text-muted">{dict.common.mapsReviews}</span>
            </span>
          </a>
        </div>
      </Container>
    </section>
  );
}
