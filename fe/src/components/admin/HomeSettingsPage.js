"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { siteConfig } from "@/constants/site";
import { fillReviewStats, formatScore, normalizeReviewStats } from "@/lib/review-stats";
import { defaultHomeCopy, fillCopy, stripCopy } from "@/components/home/copy";
import { useMutation, useOptions, useOptionsState } from "./hooks";
import { useAutoFill } from "./translate";
import {
  Button,
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
import HomeSitePreview from "./home/SitePreview";
import { HomeImagesContext } from "./home/ImageSlot";
import { CopyContext, EMPTY_SLIDE, L, validBannerVideo, validImage } from "./home/shared";
import { usePendingImages } from "./pendingImages";
import { usePendingVideos } from "./pendingVideos";
import { ReadOnlyArea, usePermission } from "./permissions";
import { SeoCard, normalizeSeo } from "./SeoFields";
import {
  EditorFrame,
  EditorHeader,
  HUB,
  HistoryButton,
  LangTools,
  QuickHelp,
  RELOAD,
  ResetAllButton,
  SaveBar,
  ViewLiveLink,
  useConflictSave,
  useSaveShortcut,
} from "./page-copy/chrome";
import HistoryDrawer, { diffParts } from "./page-copy/HistoryDrawer";
import JumpMenu from "./page-copy/JumpMenu";

const PATH = "/settings/home";
const TAGS = ["settings"];
const STATS = 6;

/**
 * Câu mặc định của website theo 3 ngôn ngữ (chữ đang hiện trên trang chủ khi chưa ai sửa), đã điền điểm &
 * số lượt đánh giá đang dùng (Đánh giá → Điểm & số lượt đánh giá) để nhân viên thấy đúng như trên website.
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
  // tiêu đề / mô tả trang chủ trên Google khi chưa nhập (từ điển: meta)
  const meta = { en: en.default.meta, zh: zh.default.meta, vi: vi.default.meta };
  return { en: copy(en, "en"), zh: copy(zh, "zh"), vi: copy(vi, "vi"), reviewStats, meta };
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
  // tiêu đề + mô tả trên Google (trống = câu mặc định của website)
  seo: normalizeSeo(s.seo),
  // khối đang ẩn trên website — chỉ giữ cờ true (bật lại khối = như chưa từng tắt, không báo "Chưa lưu")
  hidden: Object.fromEntries(Object.entries(s.hidden ?? {}).filter(([, v]) => v === true)),
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
  const [updatedAt, setUpdatedAt] = useState(null);
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [slideIndex, setSlideIndex] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const router = useRouter();
  const guarded = useConflictSave();
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
        setUpdatedAt(r.data?.updatedAt ?? null);
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

  // patch: object, hoặc hàm (dữ liệu mới nhất) → object. Giữ nguyên hàm qua các lần vẽ → các khối của bản xem
  // trước (React.memo) không phải vẽ lại khi khối khác đổi
  const set = useCallback(
    (patch) => setData((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) })),
    [],
  );
  // patch: object, hoặc hàm (banner mới nhất) → object — dùng khi cập nhật sau một lúc chờ (video Drive)
  const setBanner = useCallback(
    (patch) =>
      setData((d) => ({
        ...d,
        banner: { ...d.banner, ...(typeof patch === "function" ? patch(d.banner) : patch) },
      })),
    [],
  );

  // Con số website tự tính cho khối "con số nổi bật" (hiện mờ khi nhân viên không tự nhập)
  // (giống website: số sân bay có giá fast-track, số chỗ xe nhỏ nhất – lớn nhất tính từ Xe & Visa)
  const tripRating = defs?.reviewStats?.tripadvisor.rating;
  const autoStats = useMemo(
    () => [
      String(siteConfig.since),
      tours.length ? `${shown(tours)}+` : "…",
      destinations.length ? String(shown(destinations)) : "…",
      services ? String(services.airports) : "…",
      services ? services.seats : "…",
      `${formatScore(tripRating ?? 5)}★`,
    ],
    [tours, destinations, services, tripRating],
  );

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
    if (!canEdit || !data || !dirty) return;
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
    const put = (b, at) =>
      api(PATH, { method: "PUT", body: { ...b, ...(at && { baseUpdatedAt: at }) } });
    const r = await run(() => guarded((at) => put(body, at), updatedAt));
    if (r === RELOAD) return load();
    if (!r) return;
    toast("Đã lưu trang chủ");
    videos.saved(body); // video vừa lấy về đã được lưu → không còn bị dọn khi rời trang
    const n = normalize(r.data ?? body, defs);
    setData(n);
    setSaved(JSON.stringify(n));
    setUpdatedAt(r.data?.updatedAt ?? null);
    if (failed)
      autoFill.offerRetry(async (t) => {
        const r2 = await put(t, r.data?.updatedAt);
        const again = normalize(r2?.data ?? t, defs);
        setData(again);
        setSaved(JSON.stringify(again));
        setUpdatedAt(r2?.data?.updatedAt ?? null);
      });
  };
  // video Drive đang chuẩn bị / đã lấy về mà chưa lưu (bỏ thì tự dọn); onReady: lưu tiếp khi đang chờ video
  const videos = usePendingVideos(data, { onReady: save });
  useSaveShortcut(save, canEdit);

  const discard = async () => {
    const ok = await confirm({
      title: "Bỏ các thay đổi chưa lưu?",
      message: "Trang chủ sẽ trở lại như lần lưu gần nhất.",
      confirmText: "Bỏ thay đổi",
      cancelText: "Sửa tiếp",
      danger: true,
    });
    if (!ok) return;
    setData(JSON.parse(saved));
    setSlideIndex(0);
  };

  /** Nội dung mặc định của cả trang chủ (website tự chọn tour / chủ đề / điểm đến, chữ & ảnh có sẵn) */
  const blank = useMemo(() => (defs ? normalize({}, defs) : null), [defs]);
  const edited =
    !!data &&
    !!blank &&
    JSON.stringify(toBody({ ...data, seo: blank.seo }, defs)) !==
      JSON.stringify(toBody(blank, defs));
  const resetAll = async () => {
    const ok = await confirm({
      title: "Đưa cả trang chủ về nội dung mặc định?",
      message:
        "Mọi chữ, ảnh, video banner và danh sách tour / chủ đề / điểm đến đã chọn (cả 3 ngôn ngữ) sẽ trở về như ban đầu — website tự chọn lại. Bạn vẫn có thể bấm “Bỏ thay đổi” trước khi lưu, hoặc dùng lại bản cũ trong Lịch sử.",
      confirmText: "Về mặc định",
      cancelText: "Thôi",
      danger: true,
    });
    if (!ok) return;
    // giữ phần "Hiển thị trên Google" và các cài đặt khác ngoài nội dung khối
    setData((d) => ({ ...d, ...blank, seo: d.seo }));
    setSlideIndex(0);
  };

  const goBack = async (e) => {
    if (!dirty) return;
    e.preventDefault();
    const ok = await confirm({
      title: "Rời trang khi chưa lưu?",
      message: "Nội dung bạn đang sửa chưa được lưu và sẽ mất nếu rời trang này.",
      confirmText: "Rời trang",
      cancelText: "Ở lại",
      danger: true,
    });
    if (ok) {
      setData(JSON.parse(saved));
      router.push(HUB);
    }
  };

  // Lịch sử: bản cũ khác bản đang lưu ở phần nào; dùng lại bản cũ → nạp vào trình sửa
  const describe = useCallback(
    (rev) => {
      if (!defs || !saved) return [];
      const a = toBody(normalize(rev, defs), defs);
      const b = toBody(JSON.parse(saved), defs);
      return diffParts(
        [
          ["Banner đầu trang", (x) => x.banner],
          ["Tour nổi bật", (x) => x.featuredTours],
          ["Tour dài ngày", (x) => x.longTours],
          ["Chủ đề tour", (x) => x.homeThemes],
          ["Điểm đến nổi bật", (x) => x.featuredDestinations],
          ["Chữ các khối", (x) => x.copy],
          ["Con số nổi bật", (x) => x.statValues],
          ["Ảnh các khối", (x) => x.images],
          ["Tên địa điểm ngôi sao", (x) => x.starLabels],
          ["Khối ẩn / hiện", (x) => x.hidden],
          ["Hiển thị trên Google", (x) => x.seo],
        ],
        a,
        b,
      );
    },
    [defs, saved],
  );
  const onRestored = useCallback(
    (doc) => {
      const n = normalize(doc, defs);
      setData(n);
      setSaved(JSON.stringify(n));
      setUpdatedAt(doc?.updatedAt ?? null);
      setSlideIndex(0);
    },
    [defs],
  );

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
  const viewUrl = lang === "en" ? "/" : `/${lang}`;
  // Dịch tự động + ngôn ngữ: 1 chỗ duy nhất — thanh lưu (chỉ xem: khung trên)
  const langTools = (
    <LangTools
      lang={lang}
      onLang={setLang}
      filled={filled}
      canEdit={canEdit}
      value={translatable}
      onTranslate={(next) => setData(normalize(next, defs))}
    />
  );

  // Trạng thái đặc biệt ở thanh lưu: đang chuẩn bị video / video, ảnh banner chưa dùng được
  const status = videos.copying ? (
    <span className="flex min-w-0 items-center gap-1.5 font-medium text-brand-700">
      <Spinner className="size-4 shrink-0" />
      <span className="line-clamp-2">Đang chuẩn bị video…</span>
    </span>
  ) : problems.length ? (
    <span className="flex min-w-0 items-center gap-1.5 font-medium text-sun-600">
      <AlertTriangle className="size-4 shrink-0" />
      <span className="line-clamp-2">{problems[0].message}</span>
    </span>
  ) : null;

  return (
    <CopyContext.Provider value={copyContext}>
      <HomeImagesContext.Provider value={imagesContext}>
        <EditorHeader
          title="Trang chủ"
          readOnly={!canEdit}
          intro="Bản xem trước trang chủ theo đúng thứ tự trên website. Bấm thẳng vào chữ, ảnh hoặc thẻ để sửa — rê chuột lên thẻ để sắp xếp, thay, gỡ — rồi bấm Lưu."
          updatedAt={updatedAt}
          onBack={goBack}
          actions={
            <>
              <ViewLiveLink href={viewUrl} dirty={dirty} />
              {canEdit && edited && <ResetAllButton onClick={resetAll} />}
            </>
          }
        />

        {/* ----- Khung "trang web thu nhỏ" ----- */}
        <ReadOnlyArea readOnly={!canEdit}>
          <EditorFrame
            name="Trang chủ"
            lang={lang}
            tools={
              <>
                <JumpMenu />
                <HistoryButton onClick={() => setHistoryOpen(true)} active={historyOpen} />
                <QuickHelp />
                {!canEdit && langTools}
              </>
            }
          >
            <HomeSitePreview
              lang={lang}
              data={data}
              set={set}
              setBanner={setBanner}
              slideIndex={slideIndex}
              setSlideIndex={setSlideIndex}
              tours={tours}
              toursStatus={toursStatus}
              themes={themes}
              themesStatus={themesStatus}
              destinations={destinations}
              destinationsStatus={destinationsStatus}
              autoStats={autoStats}
              searchTours={searchTours}
            />
          </EditorFrame>
        </ReadOnlyArea>

        <p className="mt-3 text-center text-xs text-slate-500">
          Ô để trống sẽ dùng nội dung mặc định của website.
        </p>

        {/* Hiển thị trên Google: thu gọn sẵn */}
        <ReadOnlyArea readOnly={!canEdit} notice={false}>
          <SeoCard
            value={data.seo}
            onChange={(seo) => set({ seo })}
            lang={lang}
            fallbackTitle={defs?.meta?.[lang]?.title}
            fallbackDescription={defs?.meta?.[lang]?.description}
            path=""
          />
        </ReadOnlyArea>

        {/* ----- Thanh lưu ----- */}
        {canEdit && (
          <SaveBar
            tools={langTools}
            dirty={dirty}
            status={status}
            onDiscard={discard}
            onSave={save}
            busy={busy}
            saving={busy || autoFill.busy || images.busy || videos.waiting}
            saveLabel={(videos.waiting && "Đang chuẩn bị video… vui lòng chờ") || images.label}
            extra={
              videos.waiting && (
                <Button variant="ghost" size="sm" onClick={videos.cancelWait}>
                  Huỷ lưu video
                </Button>
              )
            }
          />
        )}

        <HistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          contentKey="home"
          title="Trang chủ"
          describe={describe}
          onRestored={onRestored}
          dirty={dirty}
          canRestore={canEdit}
          tags={TAGS}
        />
      </HomeImagesContext.Provider>
    </CopyContext.Provider>
  );
}
