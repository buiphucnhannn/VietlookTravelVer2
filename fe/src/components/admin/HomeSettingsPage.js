"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, Save } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { siteConfig } from "@/constants/site";
import { defaultHomeCopy, fillCopy, stripCopy } from "@/components/home/copy";
import { useMutation, useOptions } from "./hooks";
import { AutoTranslate } from "./translate";
import {
  Badge,
  Button,
  LangTabs,
  LoadingBlock,
  Notice,
  PageHeader,
  filledOf,
  fmtUSD,
  locText,
  useUi,
  useUnsavedGuard,
} from "./ui";
import MiniHero from "./home/MiniHero";
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

const PATH = "/settings/home";
const TAGS = ["settings"];
const STATS = 6;

/** Câu mặc định của website theo 3 ngôn ngữ (chữ đang hiện trên trang chủ khi chưa ai sửa) */
const loadDefaults = async () => {
  const [en, zh, vi] = await Promise.all([
    import("@/i18n/dictionaries/en"),
    import("@/i18n/dictionaries/zh"),
    import("@/i18n/dictionaries/vi"),
  ]);
  return {
    en: defaultHomeCopy(en.default.home, "en"),
    zh: defaultHomeCopy(zh.default.home, "zh"),
    vi: defaultHomeCopy(vi.default.home, "vi"),
  };
};

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
  featuredTours: s.featuredTours ?? [],
  longTours: s.longTours ?? [],
  homeThemes: s.homeThemes ?? [],
  featuredDestinations: s.featuredDestinations ?? [],
  // câu chữ các khối: ô chưa sửa được điền sẵn câu mặc định để thấy đúng chữ đang hiện trên web
  copy: fillCopy(defs, s.copy),
  statValues: Array.from({ length: STATS }, (_, i) => s.statValues?.[i] ?? ""),
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

const mapTour = (t) => ({
  value: t.slug,
  label: t.content?.en?.title || t.slug,
  sub: [t.days ? `${t.days} ngày` : "", t.price ? `từ ${fmtUSD(t.price)}` : ""]
    .filter(Boolean)
    .join(" · "),
  days: t.days,
  price: t.price,
  priceText: fmtUSD(t.price),
  image: t.image,
  summary: t.content?.en?.summary || "",
  featured: !!t.featured,
  hidden: t.isActive === false,
});
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
        message: `Slide ${n}: video nền chưa dùng được — hãy dán link YouTube hoặc Google Drive và chờ chép xong.`,
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
  const [lang, setLang] = useState("en");
  const [slideIndex, setSlideIndex] = useState(0);
  const { run, busy } = useMutation(TAGS);
  const { toast, confirm } = useUi();

  const tours = useOptions("/admin/tours?limit=200&sort=rank", mapTour);
  const themes = useOptions("/admin/themes?limit=50&sort=order", mapNamed);
  const destinations = useOptions("/admin/destinations?limit=200&sort=order", mapNamed);

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
  const load = () => {
    setLoadError("");
    setNonce((n) => n + 1);
  };

  const dirty = !!data && JSON.stringify(data) !== saved;
  useUnsavedGuard(dirty);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const setBanner = (patch) => setData((d) => ({ ...d, banner: { ...d.banner, ...patch } }));

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

  const save = async () => {
    if (problems.length) {
      setSlideIndex(problems[0].slide);
      toast(problems[0].message, "error");
      return;
    }
    const body = toBody(data, defs);
    const r = await run(() => api(PATH, { method: "PUT", body }), "Đã lưu trang chủ");
    if (r) {
      const n = normalize(r.data ?? body, defs);
      setData(n);
      setSaved(JSON.stringify(n));
    }
  };

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
  const langTools = (tabsClass) => (
    <div className="flex shrink-0 items-center gap-2">
      <AutoTranslate
        lang={lang}
        value={translatable}
        onChange={(next) => setData(normalize(next, defs))}
        className="px-3 ring-1 ring-brand-200/70"
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
  const autoStats = [
    String(siteConfig.since),
    tours.length ? `${shown(tours)}+` : "…",
    destinations.length ? String(shown(destinations)) : "…",
    "5",
    "4–45",
    `${siteConfig.tripadvisorRating.score.toFixed(1)}★`,
  ];

  return (
    <CopyContext.Provider value={copyContext}>
      <PageHeader
        title="Trang chủ"
        description="Đây là bản thu nhỏ của trang chủ, đúng thứ tự các khối trên website. Bấm thẳng vào chữ, ảnh hoặc ô bất kỳ để sửa; giữ và kéo thẻ để đổi thứ tự."
      />

      {/* ----- Khung "trang web thu nhỏ" ----- */}
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
        />
        <TrustSection />
        <ServicesSection />
        <FeaturedToursSection
          options={tours}
          value={data.featuredTours}
          onChange={(featuredTours) => set({ featuredTours })}
        />
        <B2BSection />
        <MapSection />
        <DestinationTiles
          options={destinations}
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
          value={data.longTours}
          onChange={(longTours) => set({ longTours })}
        />
        <StepsSection />
        <ThemeTiles
          options={themes}
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

      <p className="mt-3 text-center text-xs text-slate-500">
        Ô nào để trống, website sẽ tự dùng câu có sẵn.
      </p>

      {/* ----- Thanh lưu ----- */}
      <div className="sticky bottom-3 z-30 mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-[0_12px_40px_-12px_rgba(10,37,60,0.4)] ring-1 ring-slate-200 backdrop-blur sm:bottom-4 sm:px-4">
        {langTools()}
        <div className="flex min-w-0 flex-1 items-center gap-2 text-xs">
          {problems.length ? (
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
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={discard} disabled={busy}>
              Hoàn tác
            </Button>
          )}
          <Button icon={Save} onClick={save} loading={busy} disabled={!dirty}>
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </CopyContext.Provider>
  );
}
