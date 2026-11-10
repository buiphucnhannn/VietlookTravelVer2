import { MapPin, Search } from "lucide-react";
import { fill, lp, tr } from "@/i18n/config";
import { siteConfig } from "@/constants/site";
import { Stars } from "@/components/ui";
import { GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";
import { Container } from "@/components/ui";
import HeroVideos from "./HeroVideos";
import { cloudinaryVideo, cloudinaryVideoUrl, embedUrl, parseVideo } from "@/lib/video";

// Video nền mặc định: 4 clip cắt từ video do khách cung cấp (public/videos/vietlooktravel_video.mp4).
// Banner (dòng chữ nhỏ, tiêu đề, mô tả, video / ảnh + chú thích) chỉnh trong CMS → Trang chủ.
const clip = (name) => ({
  src: `/videos/${name}.mp4`,
  srcMobile: `/videos/${name}-m.mp4`,
  poster: `/videos/${name}.webp`,
  posterMobile: `/videos/${name}-m.webp`,
});
const DEFAULT_VIDEOS = [
  { ...clip("vl2-halong"), caption: { en: "Ha Long Bay", zh: "下龙湾", vi: "Vịnh Hạ Long" } },
  {
    ...clip("vl2-heritage"),
    caption: {
      en: "Ha Long Bay & Hanoi heritage",
      zh: "下龙湾 · 河内古迹",
      vi: "Vịnh Hạ Long & di sản Hà Nội",
    },
  },
  {
    ...clip("vl2-mountains"),
    caption: { en: "Mountains at sunset", zh: "山间日落", vi: "Hoàng hôn trên núi" },
  },
  {
    ...clip("vl2-golden-bridge"),
    caption: { en: "Golden Bridge, Da Nang", zh: "岘港金桥", vi: "Cầu Vàng, Đà Nẵng" },
  },
];

/**
 * Slide từ CMS → định dạng HeroVideos (poster điện thoại trống → dùng poster máy tính).
 * - Link YouTube → yt = link nhúng nền (dựng từ mã video); poster trống → ảnh bìa YouTube.
 * - Video Google Drive đã chép về Cloudinary → <video> mp4 tự phát (máy tính 1920px, điện thoại 720px);
 *   poster trống → khung hình đầu của video.
 */
const toVideo = (s, lang) => {
  const src = s.video || s.src;
  const label = tr(s.caption, lang);
  const cld = cloudinaryVideo(src);
  if (cld) {
    const poster = s.poster || cloudinaryVideoUrl(cld, { poster: true });
    return {
      src: cloudinaryVideoUrl(cld),
      yt: null,
      srcMobile: cloudinaryVideoUrl(cld, { width: 720 }),
      poster,
      posterMobile: s.posterMobile || poster,
      label,
    };
  }
  const v = parseVideo(src);
  const yt = v?.provider === "youtube" ? embedUrl(src, { background: true }) : null;
  const poster = s.poster || (yt ? `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg` : "");
  return {
    src,
    yt,
    srcMobile: s.videoMobile && !parseVideo(s.videoMobile) ? s.videoMobile : s.srcMobile || src,
    poster,
    posterMobile: s.posterMobile || poster,
    label,
  };
};

/** Chữ banner: lấy từ CMS, ô trống → câu mặc định trong từ điển giao diện */
const text = (banner, key, lang, fallback) =>
  (banner?.[key] ? tr(banner[key], lang) : "") || fallback;

/**
 * Banner chính: video nền luân phiên, vừa đúng 1 màn hình (header trong suốt phủ lên trên).
 * Cỡ chữ co theo chiều cao màn hình để nội dung luôn nằm gọn trong khung đầu tiên.
 */
export default function Hero({ lang, dict, banner, regions, destinations }) {
  const t = dict.home;
  const destinationsByRegion = (slug) => destinations.filter((d) => d.region === slug);
  const slides = (banner?.slides ?? []).filter((s) => s.video || s.poster);
  const videos = (slides.length ? slides : DEFAULT_VIDEOS).map((s) => toVideo(s, lang));
  const copy = {
    eyebrow: text(banner, "eyebrow", lang, t.heroEyebrow),
    titleTop: text(banner, "titleTop", lang, t.heroTitleTop),
    titleMain: text(banner, "titleMain", lang, t.heroTitleMain),
    description: text(banner, "description", lang, t.heroText),
    descriptionShort: text(banner, "descriptionShort", lang, t.heroTextShort),
  };
  const ratings = [
    {
      href: siteConfig.social.google,
      logo: GoogleIcon,
      name: "Google",
      stars: siteConfig.googleRating,
      score: siteConfig.googleRating.toFixed(1),
      n: siteConfig.googleReviews,
    },
    {
      href: siteConfig.social.tripadvisor,
      logo: TripAdvisorIcon,
      name: "Tripadvisor",
      stars: siteConfig.tripadvisorRating.score,
      score: siteConfig.tripadvisorRating.score.toFixed(1),
      n: siteConfig.tripadvisorRating.reviews,
      green: true,
    },
  ];
  return (
    // Banner luôn VỪA ĐÚNG 1 MÀN HÌNH (điện thoại & máy tính): mọi khoảng cách/cỡ chữ co giãn theo
    // chiều cao màn hình (svh), nội dung căn giữa phần còn lại dưới header trong suốt.
    <section className="relative isolate flex h-[100svh] max-h-[1100px] min-h-[560px] overflow-hidden text-white">
      <HeroVideos videos={videos} />
      {/* Lớp phủ nhẹ – chỉ đủ để chữ trắng dễ đọc, giữ video tươi sáng */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.28),transparent_65%)]" />

      <Container className="relative z-10 flex flex-1 flex-col items-center justify-center pt-[calc(4rem+1.5svh)] pb-[3svh] text-center lg:pt-[calc(108px+1svh)] lg:pb-[6svh]">
        <p className="animate-fade-up text-[0.66rem] font-bold tracking-[0.2em] text-amber-brand uppercase sm:text-sm sm:tracking-[0.35em]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-[clamp(0.35rem,1.2svh,1rem)] animate-fade-up [animation-delay:120ms]">
          <span className="block pb-[clamp(0.15rem,0.8svh,0.5rem)] text-[clamp(1.6rem,4.6svh,3.75rem)] leading-[1.15] font-extrabold tracking-[-0.03em] drop-shadow-lg">
            {copy.titleTop}
          </span>{" "}
          <span className="block pb-[0.2em] text-[clamp(3rem,min(13.5svh,21vw),9rem)] leading-[1.05] font-extrabold tracking-[-0.05em] drop-shadow-xl">
            {copy.titleMain}
          </span>
        </h1>
        <p className="mt-[clamp(0.4rem,1.2svh,0.9rem)] max-w-2xl animate-fade-up text-[0.88rem] leading-snug text-white/90 [animation-delay:220ms] sm:text-[clamp(1rem,2.2svh,1.125rem)] sm:leading-normal [@media(max-height:620px)]:hidden">
          <span className="sm:hidden">{copy.descriptionShort || copy.description}</span>
          <span className="hidden sm:inline">{copy.description}</span>
        </p>

        {/* Ô tìm kiếm tour theo từ khóa & điểm đến */}
        <form
          action={`${lp(lang)}/tours`}
          method="get"
          role="search"
          className="mt-[clamp(1rem,3svh,2.25rem)] grid w-full max-w-3xl animate-fade-up gap-1 rounded-2xl bg-white/95 p-1.5 text-left shadow-2xl ring-1 ring-white/40 backdrop-blur [animation-delay:320ms] sm:grid-cols-[1.4fr_1fr_auto] sm:gap-2 sm:p-2"
        >
          <label className="flex items-center gap-3 rounded-xl px-3.5 focus-within:bg-surface sm:px-4 sm:py-1.5">
            <Search className="size-[1.1rem] shrink-0 text-forest-700 sm:size-5" />
            <span className="sr-only">{t.searchPlaceholder}</span>
            <input
              name="q"
              placeholder={t.searchPlaceholder}
              className="h-10 w-full bg-transparent text-[0.95rem] text-ink placeholder:text-muted focus:outline-none sm:text-base"
            />
          </label>
          <label className="flex items-center gap-3 rounded-xl border-t border-border px-3.5 focus-within:bg-surface sm:border-t-0 sm:border-l sm:px-4 sm:py-1.5">
            <MapPin className="size-[1.1rem] shrink-0 text-forest-700 sm:size-5" />
            <span className="sr-only">{t.searchDestination}</span>
            <select
              name="destination"
              defaultValue=""
              className="h-10 w-full appearance-none bg-transparent text-[0.95rem] text-ink focus:outline-none sm:text-base"
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
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-sun-500 px-7 font-semibold text-white transition hover:bg-sun-600 sm:h-13"
          >
            <Search className="size-5" />
            {t.searchButton}
          </button>
        </form>

        {/* Huy hiệu đánh giá thật: luôn nằm NGANG 1 hàng; mobile gọn trong 1 thanh kính mờ */}
        <div className="mt-[clamp(0.9rem,2.8svh,2rem)] flex w-full max-w-sm animate-fade-up items-center justify-center divide-x divide-white/25 [animation-delay:420ms] sm:w-auto sm:max-w-none sm:gap-10 sm:divide-x-0">
          {ratings.map((r) => (
            <RatingBadge
              key={r.name}
              {...r}
              text={fill(t.ratingBadge, { score: r.score, n: r.n })}
              short={fill(t.ratingShort, { score: r.score, n: r.n })}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Huy hiệu đánh giá: logo + tên, số sao thật, số lượt đánh giá – bấm mở trang review. */
function RatingBadge({ href, logo: Logo, name, stars, text, short, green }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-1 flex-col items-center gap-0.5 px-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition hover:scale-[1.03] sm:flex-none sm:gap-1 sm:px-0"
    >
      <span className="flex items-center gap-1.5 text-[0.95rem] font-bold tracking-tight sm:gap-2 sm:text-xl">
        <Logo className={`size-[1.1rem] sm:size-7 ${green ? "text-[#34e0a1]" : ""}`} />
        {name}
      </span>
      <span className="origin-center scale-[0.8] sm:scale-100">
        <Stars value={stars} size={15} className={green ? "text-[#34e0a1]" : "text-amber-brand"} />
      </span>
      <span className="text-[0.68rem] font-semibold text-white/85 group-hover:underline sm:hidden">
        {short}
      </span>
      <span className="hidden text-xs font-semibold text-white/85 group-hover:underline sm:inline">
        {text}
      </span>
    </a>
  );
}
