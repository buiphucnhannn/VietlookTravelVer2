import { MapPin, Search } from "lucide-react";
import { fill, lp, tr } from "@/i18n/config";
import { siteConfig } from "@/constants/site";
import { Stars } from "@/components/ui";
import { GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";
import { destinationsByRegion, regions } from "@/data/destinations";
import { Container } from "@/components/ui";
import HeroVideos from "./HeroVideos";

// Video nền tông ấm, ít xanh dương (brief khách): nguồn gốc 4K trên Pexels (miễn phí thương mại).
// Desktop 1080p ~3.5–4.8MB; mobile 960p ≤1.8MB + poster nhẹ (yêu cầu SEO: hero mobile ≤2–3MB).
const videos = [
  {
    src: "/videos/phu-quoc-sunset.mp4",
    srcMobile: "/videos/phu-quoc-sunset-m.mp4",
    poster: "/videos/phu-quoc-sunset.webp",
    posterMobile: "/videos/phu-quoc-sunset-m.webp",
    label: { en: "Sunset over the sea, Phu Quoc", zh: "富国岛海上日落" },
  },
  {
    src: "/videos/rice-terraces-sunrise.mp4",
    srcMobile: "/videos/rice-terraces-sunrise-m.mp4",
    poster: "/videos/rice-terraces-sunrise.webp",
    posterMobile: "/videos/rice-terraces-sunrise-m.webp",
    label: { en: "Rice terraces at sunrise, North Vietnam", zh: "北越梯田日出" },
  },
  {
    src: "/videos/hoi-an-lanterns.mp4",
    srcMobile: "/videos/hoi-an-lanterns-m.mp4",
    poster: "/videos/hoi-an-lanterns.webp",
    posterMobile: "/videos/hoi-an-lanterns-m.webp",
    label: { en: "Hoi An lantern night", zh: "会安灯笼之夜" },
  },
];

/**
 * Banner chính: video nền luân phiên, vừa đúng 1 màn hình (header trong suốt phủ lên trên).
 * Cỡ chữ co theo chiều cao màn hình để nội dung luôn nằm gọn trong khung đầu tiên.
 */
export default function Hero({ lang, dict }) {
  const t = dict.home;
  return (
    <section className="relative isolate flex h-[min(100svh,1100px)] min-h-[600px] items-center overflow-hidden text-white">
      <HeroVideos videos={videos.map((v) => ({ ...v, label: tr(v.label, lang) }))} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1208]/45 via-[#2a1a08]/15 to-[#1a1208]/65" />

      <Container className="relative z-10 flex flex-col items-center pt-16 pb-20 text-center lg:pt-[108px] lg:pb-32">
        <p className="animate-fade-up text-xs font-bold tracking-[0.35em] text-amber-brand uppercase sm:text-sm">
          {t.heroEyebrow}
        </p>
        <h1 className="mt-[clamp(0.5rem,1.5vh,1rem)] animate-fade-up [animation-delay:120ms]">
          <span className="block text-[clamp(2rem,5.2vh,3.75rem)] leading-none font-extrabold tracking-[-0.04em] drop-shadow-lg">
            {t.heroTitleTop}
          </span>
          <span className="block text-[clamp(3.5rem,min(15vh,22vw),9rem)] leading-[0.95] font-extrabold tracking-[-0.06em] drop-shadow-xl">
            {t.heroTitleMain}
          </span>
        </h1>
        <p className="mt-[clamp(0.75rem,2vh,1.25rem)] max-w-2xl animate-fade-up text-base text-white/90 [animation-delay:220ms] sm:text-lg">
          {t.heroText}
        </p>

        {/* Ô tìm kiếm tour theo từ khóa & điểm đến */}
        <form
          action={`${lp(lang)}/tours`}
          method="get"
          role="search"
          className="mt-[clamp(1.25rem,3.5vh,2.25rem)] grid w-full max-w-3xl animate-fade-up gap-2 rounded-2xl bg-white/95 p-2 text-left shadow-2xl ring-1 ring-white/40 backdrop-blur [animation-delay:320ms] sm:grid-cols-[1.4fr_1fr_auto]"
        >
          <label className="flex items-center gap-3 rounded-xl px-4 py-1.5 focus-within:bg-surface">
            <Search className="size-5 shrink-0 text-forest-700" />
            <span className="sr-only">{t.searchPlaceholder}</span>
            <input
              name="q"
              placeholder={t.searchPlaceholder}
              className="h-10 w-full bg-transparent text-ink placeholder:text-muted focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-3 rounded-xl px-4 py-1.5 focus-within:bg-surface sm:border-l sm:border-border">
            <MapPin className="size-5 shrink-0 text-forest-700" />
            <span className="sr-only">{t.searchDestination}</span>
            <select
              name="destination"
              defaultValue=""
              className="h-10 w-full appearance-none bg-transparent text-ink focus:outline-none"
            >
              <option value="">{t.searchAny}</option>
              {regions.map((r) => (
                <optgroup key={r.slug} label={tr(r.name, lang)}>
                  <option value={r.slug}>{tr(r.name, lang)}</option>
                  {destinationsByRegion(r.slug).map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {tr(d.name, lang)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="flex h-13 items-center justify-center gap-2 rounded-xl bg-sun-500 px-7 font-semibold text-white transition hover:bg-sun-600"
          >
            <Search className="size-5" />
            {t.searchButton}
          </button>
        </form>

        {/* Huy hiệu đánh giá thật (yêu cầu 15): số sao + số lượt, bấm mở trang review */}
        <div className="mt-[clamp(1rem,3vh,2rem)] flex animate-fade-up flex-wrap items-center justify-center gap-x-10 gap-y-4 [animation-delay:420ms]">
          <RatingBadge
            href={siteConfig.social.google}
            logo={<GoogleIcon className="size-7" />}
            name="Google"
            stars={siteConfig.googleRating}
            text={fill(t.ratingBadge, {
              score: siteConfig.googleRating.toFixed(1),
              n: siteConfig.googleReviews,
            })}
          />
          <RatingBadge
            href={siteConfig.social.tripadvisor}
            logo={<TripAdvisorIcon className="size-7 text-[#34e0a1]" />}
            name="Tripadvisor"
            stars={siteConfig.tripadvisorRating.score}
            text={fill(t.ratingBadge, {
              score: siteConfig.tripadvisorRating.score.toFixed(1),
              n: siteConfig.tripadvisorRating.reviews,
            })}
            green
          />
        </div>
      </Container>
    </section>
  );
}

/** Huy hiệu đánh giá trên banner: logo, số sao thật, "Based on N+ reviews" – bấm mở trang review. */
function RatingBadge({ href, logo, name, stars, text, green }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-1 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition hover:scale-[1.03]"
    >
      <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
        {logo}
        {name}
      </span>
      <Stars value={stars} size={15} className={green ? "text-[#34e0a1]" : "text-amber-brand"} />
      <span className="text-xs font-semibold text-white/85 group-hover:underline">{text}</span>
    </a>
  );
}
