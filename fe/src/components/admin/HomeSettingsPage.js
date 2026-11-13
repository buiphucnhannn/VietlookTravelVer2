"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, Save } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/constants/site";
import { fillReviewStats, formatScore, normalizeReviewStats } from "@/lib/review-stats";
import { defaultHomeCopy, fillCopy, stripCopy } from "@/components/home/copy";
import { useMutation, useOptions, useOptionsState } from "./hooks";
import { AutoTranslate, useAutoFill } from "./translate";
import {
  Badge,
  Button,
  LangTabs,
  LoadingBlock,
  Notice,
  DEFAULT_LANG,
  PageHeader,
  Spinner,
  anyLang,
  filledOf,
  fmtUSD,
  locText,
  useUi,
  useUnsavedGuard,
} from "./ui";
import MiniHero from "./home/MiniHero";
import { HomeImagesContext } from "./home/ImageSlot";
import { autoFeaturedTours, autoLongTours } from "@/lib/tour-picks";
import {
  AboutSection,
  B2BSection,
  CustomTripSection,
  GuideSection,
  MapSection,
  MonthsSection,
  PartnerStripSection,
  PlannerSection,
  ProjectsSection,
  ReviewsSection,
  ServicesSection,
  StatsSection,
  StepsSection,
  TrustSection,
  WhySection,
} from "./home/CopySections";
import {
  DestinationTiles,
  FeaturedToursSection,
  LongToursSection,
  ThemeTiles,
} from "./home/Sections";
import { CopyContext, EMPTY_SLIDE, L, validBannerVideo, validImage } from "./home/shared";
import { usePendingImages } from "./pendingImages";
import { usePendingVideos } from "./pendingVideos";
import { ReadOnlyArea, usePermission } from "./permissions";

const PATH = "/settings/home";
const TAGS = ["settings"];
const STATS = 6;

/**
 * Câu mặc định của website theo 3 ngôn ngữ (chữ đang hiện trên trang chủ khi chưa ai sửa), đã điền điểm &
 * số lượt đánh giá đang dùng (Cài đặt → Điểm & số lượt đánh giá) để nhân viên thấy đúng như trên website.
 * `reviewStats`: số liệu đó (huy hiệu banner, con số nổi bật).
 */
const loadDefaults = async () => {
  const [en, zh, vi, site] = await Promise.all([
    import("@/i18n/dictionaries/en"),
    import("@/i18n/dictionaries/zh"),
    import("@/i18n/dictionaries/vi"),
    api("/public/site").catch(() => null),
  ]);
  const reviewStats = normalizeReviewStats(site?.data?.reviewStats);
  const copy = (mod, l) => fillReviewStats(defaultHomeCopy(mod.default.home, l), reviewStats, l);
  return { en: copy(en, "en"), zh: copy(zh, "zh"), vi: copy(vi, "vi"), reviewStats };
};

const slots = (arr, n) => Array.from({ length: n }, (_, i) => arr?.[i] ?? "");

const normalize = (s = {}, defs) => ({
  banner: {
    eyebrow: { ...L(), ...s.banner?.eyebrow },
    titleTop: { ...L(), ...s.banner?.titleTop },
    titleMain: { ...L(), ...s.banner?.titleMain },
    description: { ...L(), ...s.banner?.description },
    descriptionShort: { ...L(), ...s.banner?.descriptionShort },
    slides: (s.banner?.slides ?? []).map((x) => ({
      ...EMPTY_SLIDE,
      ...x,
      caption: { ...L(), ...x.caption },
    })),
  },
  featuredTours: (s.featuredTours ?? []).slice(0, 8),
  longTours: (s.longTours ?? []).slice(0, 8),
  homeThemes: s.homeThemes ?? [],
  featuredDestinations: s.featuredDestinations ?? [],
  // câu chữ các khối: ô chưa sửa được điền sẵn câu mặc định để thấy đúng chữ đang hiện trên web
  copy: fillCopy(defs, s.copy),
  statValues: Array.from({ length: STATS }, (_, i) => s.statValues?.[i] ?? ""),
  // ảnh các khối (ô trống = website dùng ảnh có sẵn) — đủ ô để sửa từng ô không tạo mảng thủng
  images: {
    services: { tours: "", car: "", visa: "", ...s.images?.services },
    star: slots(s.images?.star, 6),
    b2bNorth: slots(s.images?.b2bNorth, 3),
    b2bSouth: slots(s.images?.b2bSouth, 3),
    about: s.images?.about ?? "",
  },
  // tên địa điểm 6 cánh ngôi sao (đủ 6 ô, mỗi ô 3 ngôn ngữ)
  starLabels: Array.from({ length: 6 }, (_, i) => ({
    en: "",
    zh: "",
    vi: "",
    ...s.starLabels?.[i],
  })),
});

/** Dữ liệu gửi lên: câu giống hệt mặc định thì lưu trống (website tiếp tục dùng câu mặc định) */
const toBody = (data, defs) => ({
  ...data,
  banner: {
    ...data.banner,
    slides: data.banner.slides.map((s) => ({
      ...s,
      video: s.video.trim(),
      videoMobile: s.videoMobile.trim(),
    })),
  },
  copy: stripCopy(defs, data.copy),
  statValues: data.statValues.map((v) => v.trim()),
});

/** Tour → mục chọn. Nhận cả dạng của /admin/tours (content.{en,zh,vi}.title) lẫn thẻ /public/tours (title.{en,zh,vi}) */
const localOf = (t, k) =>
  t.content
    ? Object.fromEntries(["en", "zh", "vi"].map((l) => [l, t.content[l]?.[k]]))
    : (t[k] ?? {});
const mapTour = (t) => ({
  value: t.slug,
  label: anyLang(localOf(t, "title")) || t.slug,
  sub: [t.days ? `${t.days} ngày` : "", t.price ? `từ ${fmtUSD(t.price)}` : ""]
    .filter(Boolean)
    .join(" · "),
  days: t.days,
  price: t.price,
  priceText: fmtUSD(t.price),
  image: t.image,
  summary: anyLang(localOf(t, "summary")),
  featured: !!t.featured,
  hidden: t.isActive === false,
});
const sameTour = (t) => t;
const mapNamed = (x) => ({
  value: x.slug,
  label: locText(x.name) || x.slug,
  image: x.image,
  hidden: x.isActive === false,
});

/** Lỗi video / ảnh của banner cần sửa trước khi lưu: [{ slide, message }] */
const mediaProblems = (slides) =>
  slides.flatMap((s, i) => {
    const n = i + 1;
    const out = [];
    if (!validBannerVideo(s.video.trim()))
      out.push({
        slide: i,
        message: `Slide ${n}: video nền chưa dùng được — hãy dán link YouTube hoặc Google Drive và chờ video chuẩn bị xong.`,
      });
    if (!validBannerVideo(s.videoMobile.trim()))
      out.push({
        slide: i,
        message: `Slide ${n}: còn một video cũ cho điện thoại không dùng được — hãy gỡ video đó.`,
      });
    if (!validImage(s.posterMobile.trim()))
      out.push({
        slide: i,
        message: `Slide ${n}: ảnh nền cho điện thoại chưa đúng — hãy chọn lại ảnh.`,
      });
    if (!validImage(s.poster.trim()))
      out.push({ slide: i, message: `Slide ${n}: ảnh chờ chưa đúng — hãy chọn lại ảnh.` });
    return out;
  });

const shown = (list) => list.filter((o) => !o.hidden).length;

export default function HomeSettingsPage() {
  const [data, setData] = useState(null);
  const [defs, setDefs] = useState(null);
  const [saved, setSaved] = useState("");
  const [loadError, setLoadError] = useState("");
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [slideIndex, setSlideIndex] = useState(0);
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const images = usePendingImages(data);
  const { toast, confirm } = useUi();
  const { canEdit } = usePermission("home"); // chỉ xem → khung chỉ đọc, không có thanh Lưu

  // 200 tour đầu (tải sẵn, hiện ngay khi mở hộp chọn) — máy chủ trả tối đa 200 mục / lần
  const { options: firstTours, status: toursStatus } = useOptionsState(
    "/admin/tours?limit=200&sort=rank",
    mapTour,
  );
  const { options: themes, status: themesStatus } = useOptionsState(
    "/admin/themes?limit=50&sort=order",
    mapNamed,
  );
  const { options: destinations, status: destinationsStatus } = useOptionsState(
    "/admin/destinations?limit=200&sort=order",
    mapNamed,
  );
  // Tour đang hiện trên web (đủ số ảnh, đánh giá…) → tính đúng bộ tour website TỰ CHỌN khi danh sách trống
  const publicTours = useOptions("/public/tours", sameTour);
  // Số sân bay có giá fast-track + số chỗ xe (khối "con số nổi bật" tự tính giống website)
  const [services, setServices] = useState(null);
  useEffect(() => {
    let alive = true;
    api("/public/services")
      .then(({ data: s }) => {
        if (!alive || !s) return;
        const codes = new Set(
          (s.fastTrack ?? []).flatMap((p) =>
            Object.entries(p.prices ?? {})
              .filter(([, v]) => v != null)
              .map(([c]) => c),
          ),
        );
        const seats = (s.cars ?? []).map((c) => c.seats).filter(Boolean);
        const lo = seats.length ? Math.min(...seats) : null;
        const hi = seats.length ? Math.max(...seats) : null;
        setServices({
          airports: codes.size,
          seats: hi ? (lo !== hi ? `${lo}–${hi}` : `${hi}`) : "—",
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  // Tour ngoài 200 tour đầu: tìm được qua ô tìm, hoặc tra theo đường dẫn của tour đã chọn → thẻ hiện đúng tên, ảnh
  const [foundTours, setFoundTours] = useState([]);
  const tours = useMemo(() => {
    const seen = new Set();
    return [...firstTours, ...foundTours, ...publicTours.map(mapTour)].filter(
      (o) => !seen.has(o.value) && seen.add(o.value),
    );
  }, [firstTours, foundTours, publicTours]);
  const rememberTours = useCallback(
    (list) =>
      setFoundTours((cur) => {
        const have = new Set(cur.map((o) => o.value));
        const add = list.filter((o) => !have.has(o.value));
        return add.length ? [...cur, ...add] : cur;
      }),
    [],
  );
  /** Ô tìm của hộp chọn tour: tìm trên TOÀN BỘ tour ở máy chủ (không phân biệt dấu, theo tên / mã / đường dẫn) */
  const searchTours = useCallback(
    async (q) => {
      const r = await api(
        `/admin/tours?q=${encodeURIComponent(q.slice(0, 100))}&sort=rank&limit=50`,
      );
      const list = (r.data ?? []).map(mapTour);
      rememberTours(list);
      return list;
    },
    [rememberTours],
  );
  const autoFeatured = useMemo(
    () => autoFeaturedTours(publicTours).map((t) => t.slug),
    [publicTours],
  );
  const shownFeatured = data?.featuredTours?.length ? data.featuredTours : autoFeatured;
  const autoLong = useMemo(
    () => autoLongTours(publicTours, { avoid: shownFeatured }).map((t) => t.slug),
    [publicTours, shownFeatured],
  );

  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.all([api(PATH), loadDefaults()])
      .then(([r, d]) => {
        if (!alive) return;
        const n = normalize(r.data, d);
        setDefs(d);
        setData(n);
        setSaved(JSON.stringify(n));
      })
      .catch((err) => alive && setLoadError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [nonce]);
  // Tour đã chọn nhưng không nằm trong 200 tour đầu / tour đang hiện (vd. tour ẩn xếp sau) → tra riêng theo đường dẫn
  const missingTours = useMemo(() => {
    if (!data || !firstTours.length) return "";
    const known = new Set(tours.map((o) => o.value));
    return [...new Set([...data.featuredTours, ...data.longTours])]
      .filter((s) => !known.has(s))
      .join(",");
  }, [data, tours, firstTours.length]);
  useEffect(() => {
    if (!missingTours) return;
    let alive = true;
    Promise.all(
      missingTours.split(",").map((slug) =>
        api(`/admin/tours?q=${encodeURIComponent(slug.slice(0, 100))}&limit=10`)
          .then((r) => (r.data ?? []).filter((t) => t.slug === slug).map(mapTour))
          .catch(() => []),
      ),
    ).then((lists) => alive && rememberTours(lists.flat()));
    return () => {
      alive = false;
    };
  }, [missingTours, rememberTours]);

  const load = () => {
    setLoadError("");
    setNonce((n) => n + 1);
  };

  const dirty = !!data && JSON.stringify(data) !== saved;
  useUnsavedGuard(dirty);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  // patch: object, hoặc hàm (banner mới nhất) → object — dùng khi cập nhật sau một lúc chờ (video Drive)
  const setBanner = (patch) =>
    setData((d) => ({
      ...d,
      banner: { ...d.banner, ...(typeof patch === "function" ? patch(d.banner) : patch) },
    }));

  const problems = useMemo(() => (data ? mediaProblems(data.banner.slides) : []), [data]);

  /** Dùng cho "Dịch tự động": chỉ những câu nhân viên đã sửa (câu mặc định đã có sẵn bản dịch chuẩn) */
  const translatable = useMemo(() => (data ? toBody(data, defs) : null), [data, defs]);
  const copyContext = useMemo(
    () => ({
      copy: data?.copy,
      defs,
      lang,
      setCopy: (fn) => setData((d) => ({ ...d, copy: fn(d.copy) })),
    }),
    [data?.copy, defs, lang],
  );
  const imagesContext = useMemo(
    () => ({
      images: data?.images,
      setImages: (fn) => setData((d) => ({ ...d, images: fn(d.images) })),
      starLabels: data?.starLabels,
      setStarLabels: (fn) => setData((d) => ({ ...d, starLabels: fn(d.starLabels) })),
    }),
    [data?.images, data?.starLabels],
  );

  const save = async () => {
    // video Drive còn đang chuẩn bị → chờ xong rồi tự lưu (nút Lưu hiện "Đang chuẩn bị video…", có nút Huỷ)
    if (videos.copying) return videos.waitAndSave();
    if (problems.length) {
      setSlideIndex(problems[0].slide);
      toast.error(problems[0].message, { title: "Chưa lưu được" });
      return;
    }
    // ảnh vừa chọn (ảnh slide, ảnh các mục trang chủ) chỉ được lưu vào kho ảnh lúc này
    const withImages = await images.prepare(toBody(data, defs));
    if (!withImages) return;
    // ngôn ngữ còn trống → tự dịch từ ngôn ngữ đã viết rồi mới lưu
    const { value: body, failed } = await autoFill.fill(withImages, { lang });
    const r = await run(() => api(PATH, { method: "PUT", body }), "Đã lưu trang chủ");
    if (r) {
      videos.saved(body); // video vừa lấy về đã được lưu → không còn bị dọn khi rời trang
      const n = normalize(r.data ?? body, defs);
      setData(n);
      setSaved(JSON.stringify(n));
      if (failed)
        autoFill.offerRetry(async (t) => {
          const r2 = await api(PATH, { method: "PUT", body: t });
          const again = normalize(r2?.data ?? t, defs);
          setData(again);
          setSaved(JSON.stringify(again));
        });
    }
  };
  // video Drive đang chuẩn bị / đã lấy về mà chưa lưu (bỏ thì tự dọn); onReady: lưu tiếp khi đang chờ video
  const videos = usePendingVideos(data, { onReady: save });

  const discard = async () => {
    const ok = await confirm({
      title: "Bỏ các thay đổi chưa lưu?",
      message: "Trang chủ sẽ trở lại như lần lưu gần nhất.",
      confirmText: "Bỏ thay đổi",
      danger: true,
    });
    if (!ok) return;
    setData(JSON.parse(saved));
    setSlideIndex(0);
  };

  if (loadError)
    return (
      <>
        <PageHeader title="Trang chủ" />
        <Notice tone="error">
          {loadError}{" "}
          <button type="button" onClick={load} className="font-semibold underline">
            Thử lại
          </button>
        </Notice>
      </>
    );
  if (!data) return <LoadingBlock />;

  const filled = filledOf(data.banner.titleMain);
  // Nút dịch + chọn ngôn ngữ: luôn đi cùng nhau, cùng hàng, cùng chiều cao
  // compact: thanh lưu trên điện thoại → ẩn nút dịch (đã có ở đầu bản xem trước) để vừa 1 hàng
  const langTools = (tabsClass, compact) => (
    <div className="flex shrink-0 items-center gap-2">
      <AutoTranslate
        lang={lang}
        value={translatable}
        onChange={(next) => setData(normalize(next, defs))}
        className={cn("px-3 ring-1 ring-brand-200/70", compact && "max-sm:hidden")}
        label={
          <>
            <span className="max-[430px]:hidden">Dịch tự động</span>
            <span className="min-[431px]:hidden">Dịch</span>
          </>
        }
      />
      <LangTabs value={lang} onChange={setLang} filled={filled} className={tabsClass} />
    </div>
  );

  // Con số website tự tính cho khối "con số nổi bật" (hiện mờ khi nhân viên không tự nhập)
  // (giống website: số sân bay có giá fast-track, số chỗ xe nhỏ nhất – lớn nhất tính từ Xe & Visa)
  const autoStats = [
    String(siteConfig.since),
    tours.length ? `${shown(tours)}+` : "…",
    destinations.length ? String(shown(destinations)) : "…",
    services ? String(services.airports) : "…",
    services ? services.seats : "…",
    `${formatScore(defs?.reviewStats?.tripadvisor.rating ?? 5)}★`,
  ];

  return (
    <CopyContext.Provider value={copyContext}>
      <HomeImagesContext.Provider value={imagesContext}>
        <PageHeader
          title="Trang chủ"
          description={`Bản xem trước trang chủ theo đúng thứ tự trên website.${canEdit ? " Bấm vào chữ hoặc ảnh để chỉnh sửa, kéo thả thẻ để sắp xếp, sau đó bấm Lưu." : ""}`}
        />

        {/* ----- Khung "trang web thu nhỏ" ----- */}
        <ReadOnlyArea readOnly={!canEdit}>
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-100 px-3.5 py-2">
              <span className="flex gap-1.5 max-sm:hidden" aria-hidden>
                <span className="size-2.5 rounded-full bg-sun-400" />
                <span className="size-2.5 rounded-full bg-amber-brand" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="min-w-0 flex-1 truncate rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200 max-sm:hidden">
                Trang chủ · đang sửa nội dung{" "}
                <b className="text-slate-700">
                  {lang === "en" ? "tiếng Anh" : lang === "zh" ? "tiếng Trung" : "tiếng Việt"}
                </b>
              </span>
              <div className="max-sm:flex max-sm:flex-1 max-sm:justify-between">
                {langTools("bg-white")}
              </div>
            </div>

            <MiniHero
              banner={data.banner}
              lang={lang}
              setBanner={setBanner}
              sel={slideIndex}
              setSel={setSlideIndex}
              reviewStats={defs?.reviewStats}
            />
            <TrustSection />
            <ServicesSection />
            <FeaturedToursSection
              options={tours}
              status={toursStatus}
              value={data.featuredTours}
              onChange={(featuredTours) => set({ featuredTours })}
              auto={autoFeatured}
              onSearch={searchTours}
            />
            <B2BSection />
            <MapSection />
            <DestinationTiles
              options={destinations}
              status={destinationsStatus}
              value={data.featuredDestinations}
              onChange={(featuredDestinations) => set({ featuredDestinations })}
            />
            <StatsSection
              values={data.statValues}
              onValues={(statValues) => set({ statValues })}
              auto={autoStats}
            />
            <LongToursSection
              options={tours}
              status={toursStatus}
              value={data.longTours}
              onChange={(longTours) => set({ longTours })}
              auto={autoLong}
              onSearch={searchTours}
            />
            <StepsSection />
            <ThemeTiles
              options={themes}
              status={themesStatus}
              value={data.homeThemes}
              onChange={(homeThemes) => set({ homeThemes })}
            />
            <CustomTripSection lang={lang} />
            <WhySection />
            <PartnerStripSection />
            <ProjectsSection />
            <ReviewsSection />
            <GuideSection />
            <MonthsSection />
            <PlannerSection />
            <AboutSection />
          </div>
        </ReadOnlyArea>

        <p className="mt-3 text-center text-xs text-slate-500">
          Ô để trống sẽ dùng nội dung mặc định của website.
        </p>

        {/* ----- Thanh lưu ----- */}
        {canEdit && (
          <div className="sticky bottom-3 z-30 mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-[0_12px_40px_-12px_rgba(10,37,60,0.4)] ring-1 ring-slate-200 backdrop-blur sm:bottom-4 sm:px-4">
            {langTools(undefined, true)}
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 text-xs",
                !problems.length && "max-sm:hidden",
              )}
            >
              {videos.copying ? (
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-brand-700">
                  <Spinner className="size-4 shrink-0" />
                  <span className="line-clamp-2">Đang chuẩn bị video…</span>
                </span>
              ) : problems.length ? (
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-sun-600">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span className="line-clamp-2">{problems[0].message}</span>
                </span>
              ) : dirty ? (
                <Badge tone="amber">Chưa lưu</Badge>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <span className="max-sm:hidden">Đã lưu mọi thay đổi</span>
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {dirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onClick={discard}
                  disabled={busy}
                  aria-label="Hoàn tác"
                >
                  <span className="max-sm:hidden">Hoàn tác</span>
                </Button>
              )}
              {videos.waiting && (
                <Button variant="ghost" size="sm" onClick={videos.cancelWait}>
                  Huỷ lưu
                </Button>
              )}
              <Button
                icon={Save}
                onClick={save}
                loading={busy || autoFill.busy || images.busy || videos.waiting}
                disabled={!dirty}
              >
                {(videos.waiting && "Đang chuẩn bị video… vui lòng chờ") || images.label || (
                  <>
                    <span className="max-sm:hidden">Lưu thay đổi</span>
                    <span className="sm:hidden">Lưu</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </HomeImagesContext.Provider>
    </CopyContext.Provider>
  );
}
