"use client";

import { createContext, memo, useCallback, useContext, useMemo, useState } from "react";
import { ImagePlus } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { lp, tr } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { cardLabels } from "@/lib/labels";
import { buildCatalog } from "@/lib/catalog-build";
import { destinationCoords } from "@/data/vietnam-map";
import { DEFAULT_GRID, pairOf } from "@/data/destination-grid";
import { Container, SectionHeading } from "@/components/ui";
import Hero from "@/components/home/Hero";
import TrustStrip from "@/components/home/TrustStrip";
import ServicesTrio from "@/components/home/ServicesTrio";
import FeaturedTours from "@/components/home/FeaturedTours";
import { B2BBlock, WhyUs } from "@/components/home/WhyAndB2B";
import VietnamMap from "@/components/home/VietnamMap";
import DestinationGrid, { toGridItem } from "@/components/home/DestinationGrid";
import DrumStatsView, { buildDrumStats } from "@/components/home/DrumStatsView";
import LongTours from "@/components/home/LongTours";
import BookingSteps from "@/components/home/BookingSteps";
import ThemesMasonry from "@/components/home/ThemesMasonry";
import CustomTrip from "@/components/home/CustomTrip";
import PartnerStrip from "@/components/home/PartnerStrip";
import PartnersBlock from "@/components/home/PartnersBlock";
import Reviews from "@/components/home/Reviews";
import GuideAndMonths from "@/components/home/GuideAndMonths";
import PlannerView from "@/components/home/PlannerView";
import AboutBlob from "@/components/home/AboutBlob";
import { STAR_DEFAULT_NAMES } from "@/components/home/RibbonStar";
import { homeImages } from "@/components/home/images";
import { durationLabel } from "@/components/tours/TourCard";
import {
  AutoChip,
  Loading,
  SitePage,
  Zone,
  useDict,
  usePublic,
  useReviews,
  useSiteInfo,
} from "../page-copy/previews/site-frame";
import { AccessSection } from "../pages/about";
import { usePublicData } from "../pages/live";
import { anyLang } from "../ui";
import MiniHero from "./MiniHero";
import { HomeImage } from "./EditableImage";
import { HomeImagesContext, useHomeImage } from "./ImageSlot";
import { useListEdit } from "./ListEdit";
import { InlineText, MAX_DESTINATIONS, MAX_THEMES, MAX_TOURS, Pic, T } from "./shared";
import { HOME_BLOCKS } from "@/lib/hidden-blocks.mjs";
import { BlockSwitch } from "../block-visibility";

/**
 * BẢN XEM TRƯỚC TRANG CHỦ = TRANG WEB THẬT: mọi khối dựng bằng đúng component của website (components/home/*),
 * cùng dữ liệu website đang dùng (API công khai) → bố cục, cỡ chữ, màu, ảnh, thẻ… y hệt trang chủ.
 * MỌI THỨ SỬA NGAY TRÊN TRANG (cùng một kiểu thao tác):
 * - Chữ: rê chuột → viền xanh nét đứt + "Bấm để sửa · tên ô"; bấm → gõ trực tiếp (viền cam) — InlineText.
 * - Ảnh: rê chuột → viền xanh + "Bấm để đổi ảnh"; bấm → hộp đổi ảnh; nút "Cắt ảnh" / "Về ảnh mặc định" — EditableImage.
 * - Danh sách (tour, điểm đến, chủ đề): rê chuột lên thẻ → nút kéo · ← · → · Đổi · ×; thẻ "＋ Thêm" — ListEdit.
 * - Banner: thanh "Banner" ngay TRÊN trang (dải slide, "Đổi ảnh / video", mô tả ngắn trên điện thoại) — MiniHero;
 *   thanh nằm ngoài banner nên không che chữ của banner.
 * - Phần tự động: nhãn "⚡ Tự động · sửa ở …" hiện khi rê chuột vào khối.
 * Bản xem trước đứng yên (không trượt, không tự chạy, không phát video nền) cho nhẹ máy và dễ sửa.
 * Bấm link / gửi form trong bản xem trước không rời trang.
 */

const A = ADMIN_BASE;

/* ---------- Câu chữ sửa được đưa vào component website ---------- */

const DARK = /^(heritage|themes|reviews|planner)/;
const SINGLE =
  /(Eyebrow|Title|Cta|^trust\.\d+\.t|\.title|\.cta|b2bAudiences|\.size|\.time|\.place)$/;
const LABELS = [
  [/Eyebrow$/, "Dòng chữ nhỏ phía trên tiêu đề"],
  [/Title$/, "Tiêu đề khối"],
  [/Subtitle$/, "Dòng mô tả dưới tiêu đề"],
  [/Cta$|\.cta$/, "Chữ trên nút"],
  [/Text$|\.text$|\.d$/, "Đoạn mô tả"],
  [/Points\.\d+$/, "Điểm nổi bật"],
  [/b2bAudiences/, "Nhóm đối tác"],
  [/\.label$/, "Chú thích của con số"],
  [/\.t$|\.title$/, "Tiêu đề"],
];
const labelOf = (path) => LABELS.find(([re]) => re.test(path))?.[1];

/**
 * 1 câu sửa được: mảng 1 phần tử (React vẽ được như chữ) có toString() = đường dẫn câu → component website
 * dùng làm `key` / alt / aria-label vẫn ổn định, không trùng nhau.
 */
function leaf(path) {
  const el = (
    <T
      key={path}
      k={path}
      dark={DARK.test(path)}
      multiline={!SINGLE.test(path)}
      label={labelOf(path)}
    />
  );
  const out = [el];
  out.toString = () => path;
  return out;
}

const isLoc = (v) =>
  v && typeof v === "object" && !Array.isArray(v) && ["en", "zh", "vi"].some((l) => l in v);

/** Khung của cây câu chữ (lá = 1): đổi chữ không đổi khung → không phải dựng lại các ô sửa */
const skeleton = (copy) => JSON.stringify(copy, (_, v) => (isLoc(v) ? 1 : v));

/** Khung câu chữ CMS (lá = 1) → cây cùng hình dạng với dict.home, mỗi lá là 1 ô sửa tại chỗ (<T/>) */
function editable(base, copy, path) {
  if (copy === 1) return leaf(path);
  if (Array.isArray(copy))
    return copy.map((c, i) => editable(base?.[i], c, path ? `${path}.${i}` : String(i)));
  if (copy && typeof copy === "object") {
    const out = base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};
    for (const [k, c] of Object.entries(copy))
      out[k] = editable(base?.[k], c, path ? `${path}.${k}` : k);
    return out;
  }
  return base;
}

/* ---------- Chặn rời trang khi bấm trong bản xem trước ---------- */

const stayHere = (e) => {
  const a = e.target.closest?.("a[href]");
  if (!a || !e.currentTarget.contains(a)) return;
  if ((a.getAttribute("href") ?? "").startsWith(A)) return; // nhãn "sửa ở …" → mở trang quản trị
  e.preventDefault();
};
const noSubmit = (e) => e.preventDefault();

/**
 * Bản xem trước đứng yên, không giật:
 * - phần tử "hiện dần khi cuộn tới" (Reveal) hiện ngay;
 * - rê chuột không phóng to ảnh / nhấc thẻ (website có hiệu ứng này; ở đây làm ảnh "nhảy");
 * (tắt chuyển động chung: quy tắc .site-preview trong globals.css).
 */
const STILL_CSS = `
.home-preview .translate-y-\\[18px\\].opacity-0{opacity:1!important;translate:none!important;scale:none!important}
.home-preview [class*="hover:scale-"]:hover,.home-preview .group:hover [class*="group-hover:scale-"]{scale:none!important}
.home-preview [class*="hover:-translate-"]:hover,.home-preview [class*="hover:translate-"]:hover,.home-preview .group:hover [class*="group-hover:translate-"],.home-preview .group:hover [class*="group-hover:-translate-"]{--tw-translate-x:0!important;--tw-translate-y:0!important}
.home-preview [class*="has-[a:hover]:-translate"]{--tw-translate-y:0!important}
`;

/** Khối nằm ngoài màn hình: trình duyệt bỏ qua phần vẽ cho tới khi cuộn tới (trang dài, nhiều ảnh → đỡ lag) */
const LAZY = { contentVisibility: "auto", containIntrinsicSize: "auto 900px" };

/**
 * Khối đang tắt trên website: { hidden: { <khoá>: true }, setHidden(khoá, ẩn) } — qua context để các khối (React.memo)
 * không phải nhận thêm props; bật / tắt 1 khối chỉ vẽ lại khung các khối, không vẽ lại nội dung bên trong.
 */
const HiddenBlocksContext = createContext(null);

/**
 * 1 khối trang chủ: nhãn tên khối + (tuỳ chọn) nhãn sửa danh sách ở góc phải trên.
 * `hide`: khoá khối bật / tắt được trên website (lib/hidden-blocks.mjs) → công tắc "Hiện / Ẩn trên website" ở góc
 * trên trái (cùng hàng với nhãn sửa danh sách, không chồng lên nhau); khối đang ẩn hiện mờ, vẫn sửa được.
 */
function Block({ name, dark, at, lazy = true, chip, hide, children }) {
  const vis = useContext(HiddenBlocksContext);
  const canHide = !!hide && !!vis;
  const hidden = canHide && vis.hidden[hide] === true;
  if (canHide)
    return (
      <div className="group/zone group/auto relative" style={lazy ? LAZY : undefined}>
        <Zone name={name} dark={dark} at={at} hidden={hidden}>
          {children}
        </Zone>
        <div className="pointer-events-none absolute top-2 right-2 left-2 z-30 flex flex-wrap items-start justify-between gap-2">
          <BlockSwitch
            inline
            group="zone"
            name={HOME_BLOCKS[hide] ?? name}
            hidden={hidden}
            onChange={(on) => vis.setHidden(hide, on)}
          />
          {chip && (
            // chỉ hiện khi rê chuột vào khối (màn cảm ứng: luôn hiện) → không đè lên dòng chữ đầu khối khi chỉ xem
            <div className="pointer-events-auto ml-auto max-w-full [zoom:var(--pz,1)] opacity-0 transition-opacity duration-150 group-focus-within/zone:opacity-100 group-hover/zone:opacity-100 [@media(hover:none)]:opacity-100">
              {chip}
            </div>
          )}
        </div>
      </div>
    );
  return (
    <div className="group/zone group/auto relative" style={lazy ? LAZY : undefined}>
      <Zone name={name} dark={dark} at={at}>
        {children}
      </Zone>
      {chip && (
        // chỉ hiện khi rê chuột vào khối (màn cảm ứng: luôn hiện) → không đè lên dòng chữ đầu khối khi chỉ xem
        <div className="pointer-events-none absolute top-2 right-2 left-28 z-30 flex justify-end opacity-0 transition-opacity duration-150 group-focus-within/zone:opacity-100 group-hover/zone:opacity-100 max-sm:left-2 [@media(hover:none)]:opacity-100">
          <div className="pointer-events-auto max-w-full [zoom:var(--pz,1)]">{chip}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- Component website (chỉ vẽ lại khi dữ liệu của chính khối đổi) ---------- */

const MHero = memo(Hero);
const MTrust = memo(TrustStrip);
const MServices = memo(ServicesTrio);
const MFeatured = memo(FeaturedTours);
const MB2B = memo(B2BBlock);
const MMap = memo(VietnamMap);
const MGrid = memo(DestinationGrid);
const MStats = memo(DrumStatsView);
const MLong = memo(LongTours);
const MSteps = memo(BookingSteps);
const MThemes = memo(ThemesMasonry);
const MCustom = memo(CustomTrip);
const MWhy = memo(WhyUs);
const MAccess = memo(AccessSection);
const MPartnerStrip = memo(PartnerStrip);
const MPartners = memo(PartnersBlock);
const MReviews = memo(Reviews);
const MGuide = memo(GuideAndMonths);
const MPlanner = memo(PlannerView);
const MAbout = memo(AboutBlob);

/* ---------- Banner ---------- */

/**
 * Trạng thái dùng chung giữa banner (trong trang) và thanh sửa banner (ngay trên trang): slide đang xem thử video,
 * hộp "Ảnh & video" đang mở. Giữ riêng ở đây (không ở PreviewFrame) → mở / đóng hộp không vẽ lại cả trang.
 */
const BannerUiContext = createContext(null);

function BannerUi({ children }) {
  const [playAt, setPlayAt] = useState(-1); // slide đang được xem thử video (-1: chỉ hiện ảnh)
  const [media, setMedia] = useState(false);
  const value = useMemo(() => ({ playAt, setPlayAt, media, setMedia }), [playAt, media]);
  return <BannerUiContext.Provider value={value}>{children}</BannerUiContext.Provider>;
}

/** Thanh sửa banner đặt ngay trên trang xem trước (ngoài banner → không che chữ nào) */
function BannerDock() {
  const ctx = useContext(PreviewContext);
  const { playAt, setPlayAt, media, setMedia } = useContext(BannerUiContext);
  const cur = Math.min(ctx.slideIndex, ctx.data.banner.slides.length - 1);
  return (
    <MiniHero
      banner={ctx.data.banner}
      lang={ctx.lang}
      setBanner={ctx.setBanner}
      sel={ctx.slideIndex}
      setSel={ctx.setSlideIndex}
      playing={playAt === cur && cur >= 0}
      setPlaying={(on) => setPlayAt(on ? cur : -1)}
      media={media}
      setMedia={setMedia}
    />
  );
}

const HeroSection = memo(function HeroSection({
  lang,
  edict,
  banner,
  slideIndex,
  setBanner,
  regions,
  destinations,
}) {
  const { playAt, setMedia } = useContext(BannerUiContext);
  const slides = banner.slides;
  const cur = Math.min(slideIndex, slides.length - 1);
  const slide = slides[cur];
  const playing = playAt === cur && cur >= 0;

  // Banner: chữ sửa tại chỗ; chỉ hiện slide đang chọn (để thấy đúng slide đang sửa)
  const heroBanner = useMemo(() => {
    const t = edict.home;
    const field = (key, label, fallback, multiline) => ({
      [lang]: (
        <InlineText
          value={banner[key][lang] ?? ""}
          placeholder={anyLang({ ...banner[key], [lang]: "" }) || fallback}
          onChange={(v) => setBanner((b) => ({ [key]: { ...b[key], [lang]: v } }))}
          label={label}
          multiline={multiline}
        />
      ),
    });
    const caption = slide && {
      [lang]: Object.assign(
        [
          <InlineText
            key="caption"
            value={slide.caption[lang] ?? ""}
            placeholder={
              anyLang({ ...slide.caption, [lang]: "" }) || "Chú thích, ví dụ: Vịnh Hạ Long"
            }
            onChange={(v) =>
              setBanner((b) => ({
                slides: b.slides.map((s, k) =>
                  k === cur ? { ...s, caption: { ...s.caption, [lang]: v } } : s,
                ),
              }))
            }
            label="Chú thích của slide"
          />,
        ],
        { toString: () => `caption-${cur}` },
      ),
    };
    return {
      eyebrow: field("eyebrow", "Dòng chữ nhỏ phía trên tiêu đề", t.heroEyebrow),
      titleTop: field("titleTop", "Tiêu đề dòng 1", t.heroTitleTop),
      titleMain: field("titleMain", "Tiêu đề dòng 2 (chữ lớn)", t.heroTitleMain),
      description: field("description", "Mô tả dưới tiêu đề", t.heroText, true),
      descriptionShort: field(
        "descriptionShort",
        "Mô tả ngắn cho điện thoại",
        t.heroTextShort,
        true,
      ),
      slides: slide ? [{ ...slide, caption }] : [],
    };
  }, [edict, banner, lang, setBanner, slide, cur]);

  /** Bấm vào nền banner (không phải chữ / nút / ô tìm kiếm) → hộp ảnh & video của slide */
  const onBackground = (e) => {
    if (!slide || !e.currentTarget.contains(e.target)) return;
    if (e.target.closest("textarea,input,select,button,a,form,label,[data-edit-ui]")) return;
    setMedia(true);
  };

  return (
    <Block name="Banner" dark at="hidden" lazy={false}>
      <div className="group/hero relative" onClick={onBackground}>
        <MHero
          lang={lang}
          dict={edict}
          banner={heroBanner}
          regions={regions}
          destinations={destinations}
          videoOff={!playing}
        />
        {/* rê chuột: viền xanh quanh banner + nhãn "Bấm vào nền để đổi ảnh / video" */}
        <span
          data-edit-ui
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 opacity-0 ring-2 ring-blue-500 transition-opacity duration-150 ring-inset group-hover/hero:opacity-100"
        >
          <span className="absolute right-3 bottom-3 [zoom:var(--pz,1)]">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 font-sans text-[11px] leading-none font-semibold text-white shadow-lg">
              <ImagePlus className="size-3" />
              {slide
                ? "Bấm vào nền banner để đổi ảnh / video"
                : "Bấm “Thêm” để tự chọn ảnh / video"}
            </span>
          </span>
        </span>
      </div>
    </Block>
  );
});

/* ---------- Danh sách sửa tại chỗ ---------- */

const slugs = (list) => list.map((x) => x.slug);

const FeaturedSection = memo(function FeaturedSection({
  lang,
  edict,
  labels,
  cards,
  value,
  set,
  tours,
  toursStatus,
  searchTours,
}) {
  const list = useListEdit({
    title: "Tour nổi bật",
    value,
    shown: slugs(cards),
    max: MAX_TOURS,
    onChange: (featuredTours) => set({ featuredTours }),
    options: tours,
    status: toursStatus,
    unit: "tour",
    pickerTitle: "Thêm tour vào “Tour nổi bật”",
    emptyHref: `${A}/tours`,
    searchPlaceholder: "Tìm tour theo tên hoặc mã tour…",
    onSearch: searchTours,
    manageHref: `${A}/tours`,
    manageText: "Mục Tour",
    note: "trên web: 4 thẻ mỗi lượt, có mũi tên",
  });
  return (
    <Block name="Tour nổi bật" hide="featured" chip={list.chip}>
      <MFeatured
        lang={lang}
        dict={edict}
        labels={labels}
        cards={cards}
        staticGrid
        itemSlot={list.slot}
        after={list.ghost}
      />
      {list.modal}
    </Block>
  );
});

const LongSection = memo(function LongSection({
  lang,
  edict,
  dict,
  labels,
  cards,
  value,
  set,
  tours,
  toursStatus,
  searchTours,
}) {
  const h = edict.home;
  const t = useMemo(
    () => ({
      longToursTitle: h.longToursTitle,
      longToursSubtitle: h.longToursSubtitle,
      weekTabs: dict.home.weekTabs,
      longToursCta: h.longToursCta,
    }),
    [h, dict],
  );
  const list = useListEdit({
    title: "Tour dài ngày",
    value,
    shown: slugs(cards),
    max: MAX_TOURS,
    onChange: (longTours) => set({ longTours }),
    options: tours,
    status: toursStatus,
    unit: "tour",
    pickerTitle: "Thêm tour vào “Tour dài ngày”",
    emptyHref: `${A}/tours`,
    searchPlaceholder: "Tìm tour theo tên hoặc mã tour…",
    onSearch: searchTours,
    note: "tour trùng “Tour nổi bật” tự xếp sau",
    ghostClassName: "row-span-4", // lưới chia hàng (subgrid): ô thêm cao bằng cả thẻ
  });
  return (
    <Block name="Tour dài ngày" hide="long" chip={list.chip}>
      <MLong
        lang={lang}
        t={t}
        labels={labels}
        cards={cards}
        itemSlot={list.slot}
        after={list.ghost}
      />
      {list.modal}
    </Block>
  );
});

const DestinationsSection = memo(function DestinationsSection({
  lang,
  edict,
  featured,
  others,
  value,
  set,
  destinations,
  destinationsStatus,
}) {
  const list = useListEdit({
    title: "Điểm đến nổi bật",
    value,
    shown: slugs(featured),
    max: MAX_DESTINATIONS,
    onChange: (featuredDestinations) => set({ featuredDestinations }),
    options: destinations,
    status: destinationsStatus,
    unit: "điểm đến",
    pickerTitle: "Thêm điểm đến vào lưới",
    emptyHref: `${A}/destinations`,
    searchPlaceholder: "Tìm điểm đến theo tên…",
    manageHref: `${A}/destinations`,
    manageText: "Sửa tên, ảnh điểm đến",
    note: "Huế, Nha Trang tự ghép với Đà Nẵng, Đà Lạt",
  });
  return (
    <Block name="Điểm đến nổi bật" hide="destinations" chip={list.chip}>
      <MGrid
        lang={lang}
        dict={edict}
        featured={featured}
        others={others}
        itemSlot={list.slot}
        after={list.ghost}
      />
      {list.modal}
    </Block>
  );
});

const ThemesSection = memo(function ThemesSection({
  lang,
  edict,
  themesShown,
  value,
  set,
  themes,
  themesStatus,
}) {
  const list = useListEdit({
    title: "Chủ đề tour",
    value,
    shown: slugs(themesShown),
    max: MAX_THEMES,
    onChange: (homeThemes) => set({ homeThemes }),
    options: themes,
    status: themesStatus,
    unit: "chủ đề",
    pickerTitle: "Thêm chủ đề vào trang chủ",
    emptyHref: `${A}/themes`,
    searchPlaceholder: "Tìm chủ đề theo tên…",
    manageHref: `${A}/themes`,
    manageText: "Sửa tên, ảnh chủ đề",
    note: "“Tour độc quyền” luôn đứng đầu",
    dark: true,
  });
  return (
    <Block name="Chủ đề tour" hide="themes" dark chip={list.chip}>
      <MThemes lang={lang} dict={edict} themes={themesShown} itemSlot={list.slot} />
      {list.modal}
    </Block>
  );
});

/* ---------- Khối đối tác: 2 khung ảnh, mỗi khung 3 ảnh đổi luân phiên ---------- */

function FrameThumb({ group, k, on, onClick }) {
  const src = useHomeImage(`${group}.${k}`);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={`Xem và đổi ảnh ${k + 1}`}
      className={cn(
        "relative size-6 shrink-0 overflow-hidden rounded-full ring-2 transition-[box-shadow,opacity] duration-150",
        on ? "ring-blue-500" : "opacity-75 ring-slate-200 hover:opacity-100 hover:ring-blue-300",
      )}
    >
      <Pic src={src} sizes="48px" />
      <span
        className={cn(
          "absolute inset-0 grid place-items-center text-[10px] font-bold text-white",
          on ? "bg-blue-600/50" : "bg-black/35",
        )}
      >
        {k + 1}
      </span>
    </button>
  );
}

/**
 * 1 khung ảnh khối đối tác (trên web 3 ảnh đổi luân phiên): rê chuột lên khung → viền xanh + 1 cụm ở góc ngoài của
 * khung (khung lớn: trái dưới · khung nhỏ: phải trên — 2 cụm không bao giờ chạm nhau hay chạm huy hiệu "2–200+" /
 * "15–30 phút"): nhãn "Bấm để đổi ảnh" + hàng nút "Ảnh 1 · 2 · 3" · "Cắt ảnh".
 */
function B2BFrame({ group, i, setI }) {
  const north = group === "b2bNorth";
  return (
    <HomeImage
      path={`${group}.${i}`}
      label={`${north ? "Khung lớn" : "Khung nhỏ"} · ảnh ${i + 1}`}
      at={north ? "bl" : "tr"}
    >
      <span
        data-edit-ui
        role="group"
        aria-label="Chọn ảnh để xem và đổi (trên web 3 ảnh đổi luân phiên)"
        title="Trên website 3 ảnh này đổi luân phiên"
        className="inline-flex h-7 cursor-default items-center gap-1.5 rounded-full bg-white/95 pr-1 pl-2.5 font-sans text-[11px] leading-none font-semibold whitespace-nowrap text-slate-600 shadow-md ring-1 ring-slate-900/10"
      >
        Ảnh
        {[0, 1, 2].map((k) => (
          <FrameThumb key={k} group={group} k={k} on={k === i} onClick={() => setI(k)} />
        ))}
      </span>
    </HomeImage>
  );
}

const B2BSection = memo(function B2BSection({ lang, edict, images }) {
  const [north, setNorth] = useState(0);
  const [south, setSouth] = useState(0);
  const shown = useMemo(
    () => ({
      ...images,
      b2bNorth: [images.b2bNorth[north]],
      b2bSouth: [images.b2bSouth[south]],
    }),
    [images, north, south],
  );
  const frameSlot = useCallback(
    (group) =>
      group === "b2bNorth" ? (
        <B2BFrame group={group} i={north} setI={setNorth} />
      ) : (
        <B2BFrame group={group} i={south} setI={setSouth} />
      ),
    [north, south],
  );
  return (
    <Block name="Dành cho đối tác" hide="b2b">
      <MB2B lang={lang} dict={edict} images={shown} frameSlot={frameSlot} />
    </Block>
  );
});

/* ---------- Ngôi sao dải lụa: ảnh + tên địa điểm từng cánh sửa ngay trên cánh ---------- */

const STAR_PETALS = [
  "Cánh trên",
  "Cánh trái trên",
  "Cánh phải trên",
  "Cánh phải dưới",
  "Cánh trái dưới",
  "Cánh dưới",
];

function PetalEdit({ slot, center, sliver, lang }) {
  const ctx = useContext(HomeImagesContext);
  if (sliver)
    // mảnh nhỏ nối với cánh Hội An: bấm vẫn đổi ảnh của cánh đó, không thêm nhãn
    return (
      <HomeImage
        path={`star.${slot}`}
        label={STAR_PETALS[slot]}
        tint
        center={center}
        className="[&>span]:hidden"
      />
    );
  return (
    <HomeImage path={`star.${slot}`} label={STAR_PETALS[slot]} tint center={center}>
      {/* tên địa điểm (website hiện khi khách rê chuột vào cánh) */}
      <span
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto block w-max max-w-[12rem] rounded-full bg-black/60 px-3 py-1 text-center text-xs leading-tight font-semibold text-white opacity-0 transition-opacity duration-150 group-hover/img:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <InlineText
          value={ctx?.starLabels?.[slot]?.[lang] ?? ""}
          placeholder={tr(STAR_DEFAULT_NAMES[slot], lang)}
          maxLength={60}
          onChange={(v) =>
            ctx?.setStarLabels((list) =>
              (list ?? []).map((l, i) => (i === slot ? { ...l, [lang]: v } : l)),
            )
          }
          label={`Tên địa điểm · ${STAR_PETALS[slot]}`}
        />
      </span>
    </HomeImage>
  );
}

const CustomSection = memo(function CustomSection({ lang, edict, starImages, starLabels }) {
  const petalSlot = useCallback(
    (slot, { center, sliver }) => (
      <PetalEdit slot={slot} center={center} sliver={sliver} lang={lang} />
    ),
    [lang],
  );
  return (
    <Block name="Tour thiết kế riêng" hide="custom">
      <MCustom
        lang={lang}
        dict={edict}
        starImages={starImages}
        starLabels={starLabels}
        petalSlot={petalSlot}
      />
      <AutoChip
        label="Rê chuột vào từng cánh sao để đổi ảnh và tên địa điểm"
        className="absolute bottom-3 left-3"
      />
    </Block>
  );
});

/* ---------- Dữ liệu website ---------- */

const EMPTY = [];
const NONE_HIDDEN = {};
const EMPTY_TAX = { categories: [], authors: [] };
const EMPTY_SERVICES = { cars: [], carAreas: [], visaTypes: [], fastTrack: [] };

/** Catalog y như lib/catalog.js, nhưng danh sách tour / chủ đề / điểm đến lấy theo bản đang sửa */
function useHomeCatalog(edits) {
  const tours = usePublic("/tours");
  const destinations = usePublic("/destinations");
  const themes = usePublic("/themes");
  const articles = usePublic("/articles");
  const taxonomy = usePublic("/taxonomy");
  const services = usePublic("/services");
  const pages = usePublic("/pages");
  const home = usePublic("/home");
  const ready = tours && destinations && themes && articles && services && home;
  return useMemo(
    () =>
      ready
        ? buildCatalog({
            tours,
            destinations,
            themes,
            articles,
            taxonomy: taxonomy ?? EMPTY_TAX,
            services: services ?? EMPTY_SERVICES,
            pages: pages ?? EMPTY,
            home: { ...home, ...edits },
          })
        : null,
    [ready, tours, destinations, themes, articles, taxonomy, services, pages, home, edits],
  );
}

/* ========================================================================= */

/** Dữ liệu đang sửa (đổi liên tục) đi qua context → khung trang (header, chân trang) không phải vẽ lại */
const PreviewContext = createContext(null);

export default function HomeSitePreview(props) {
  return (
    <PreviewContext.Provider value={props}>
      <PreviewFrame lang={props.lang} />
    </PreviewContext.Provider>
  );
}

const PreviewFrame = memo(function PreviewFrame({ lang }) {
  return (
    <BannerUi>
      <BannerDock />
      <div
        className="site-preview home-preview"
        onClickCapture={stayHere}
        onSubmitCapture={noSubmit}
      >
        <style>{STILL_CSS}</style>
        <SitePage lang={lang} path="/">
          <Sections />
        </SitePage>
      </div>
    </BannerUi>
  );
});

function Sections() {
  const {
    lang,
    data,
    set,
    setBanner,
    slideIndex,
    setSlideIndex,
    tours,
    toursStatus,
    themes,
    themesStatus,
    destinations,
    destinationsStatus,
    autoStats,
    searchTours,
  } = useContext(PreviewContext);
  const dict = useDict(lang);
  const { info } = useSiteInfo();
  const live = usePublicData(lang);
  const reviews = useReviews("home");

  const edits = useMemo(
    () => ({
      featuredTours: data.featuredTours,
      longTours: data.longTours,
      homeThemes: data.homeThemes,
      featuredDestinations: data.featuredDestinations,
    }),
    [data.featuredTours, data.longTours, data.homeThemes, data.featuredDestinations],
  );
  const cat = useHomeCatalog(edits);

  // Khối đang tắt trên website. Bản đang sửa chưa có cờ (vừa mở trang) → lấy theo website đang hiện
  const publicHome = usePublic("/home");
  const hiddenMap = data.hidden ?? publicHome?.hidden ?? NONE_HIDDEN;
  const vis = useMemo(
    () => ({
      hidden: hiddenMap,
      setHidden: (key, on) =>
        set((d) => {
          const next = { ...(d.hidden ?? hiddenMap) };
          if (on) next[key] = true;
          else delete next[key];
          return { hidden: next };
        }),
    }),
    [hiddenMap, set],
  );

  // dict.home với câu chữ CMS thay bằng ô sửa tại chỗ (chỉ dựng lại khi khung câu chữ đổi, không phải mỗi lần gõ)
  const shape = useMemo(() => skeleton(data.copy), [data.copy]);
  const edict = useMemo(
    () => dict && { ...dict, home: editable(dict.home, JSON.parse(shape), "") },
    [dict, shape],
  );
  const labels = useMemo(() => dict && cardLabels(dict), [dict]);
  const images = useMemo(() => homeImages(data.images), [data.images]);

  const featured = useMemo(
    () => cat?.featuredTours().map((t) => cat.toCard(t, lang)) ?? EMPTY,
    [cat, lang],
  );
  const longCards = useMemo(
    () =>
      cat?.longTours({ shown: featured.map((c) => c.slug) }).map((t) => cat.toCard(t, lang)) ??
      EMPTY,
    [cat, lang, featured],
  );
  const themesShown = useMemo(() => cat?.homeThemes() ?? EMPTY, [cat]);

  // Bản đồ Bắc → Nam (y như app/[lang]/page.js)
  const mapItems = useMemo(
    () =>
      !cat || !labels
        ? EMPTY
        : cat.destinations
            .filter((d) => destinationCoords[d.slug])
            .map((d) => ({
              slug: d.slug,
              at: destinationCoords[d.slug],
              name: tr(d.name, lang),
              region: tr(cat.getRegion(d.region)?.name, lang),
              intro: tr(d.intro, lang),
              image: d.image || d.hero,
              href: `${lp(lang)}/destinations/${d.slug}`,
              count: cat.countFor(d.slug),
              tours: cat
                .toursByDestination(d.slug)
                .slice(0, 2)
                .map((t) => {
                  const c = cat.toCard(t, lang);
                  return {
                    slug: c.slug,
                    title: c.title,
                    image: c.image,
                    price: c.price,
                    duration: durationLabel(c, labels),
                    href: `${lp(lang)}/tours/${c.slug}`,
                  };
                }),
            })),
    [cat, lang, labels],
  );
  const mapLabels = useMemo(
    () =>
      dict && {
        featured: dict.home.mapFeatured,
        hint: dict.home.mapHint,
        discover: dict.home.gridDiscover,
        tours: dict.home.gridTours,
        from: dict.common.from,
      },
    [dict],
  );

  // Lưới điểm đến (y như app/[lang]/page.js)
  const grid = useMemo(() => {
    if (!cat) return null;
    const picked = data.featuredDestinations.filter((s) => cat.getDestination(s));
    const gridSlugs = (picked.length ? picked : DEFAULT_GRID).filter((s) => cat.getDestination(s));
    const tileCount = (list) =>
      new Set(list.flatMap((s) => cat.toursByDestination(s).map((t) => t.slug))).size;
    const tiles = gridSlugs.map((s) => {
      const pair = pairOf(s, gridSlugs);
      const partner = pair && cat.getDestination(pair);
      if (!partner) return toGridItem(cat.getDestination(s), lang, cat.countFor(s));
      return toGridItem(cat.getDestination(s), lang, tileCount([s, pair]), {
        partner,
        href: `${lp(lang)}/destinations/${cat.getDestination(s).region}`,
      });
    });
    const covered = new Set(gridSlugs.flatMap((s) => [s, pairOf(s, gridSlugs)]));
    return { tiles, others: cat.destinations.filter((d) => !covered.has(d.slug)) };
  }, [cat, data.featuredDestinations, lang]);

  // Con số nổi bật: con số sửa tại chỗ (ô trống → website tự tính, hiện mờ)
  const stats = useMemo(
    () =>
      cat && edict
        ? buildDrumStats(cat, edict, lang).map((s, i) => ({
            ...s,
            text: (
              <InlineText
                value={data.statValues[i] ?? ""}
                placeholder={autoStats[i]}
                maxLength={12}
                onChange={(v) =>
                  set((d) => ({
                    statValues: d.statValues.map((x, k) => (k === i ? v.slice(0, 12) : x)),
                  }))
                }
                label="Con số — để trống thì website tự tính"
              />
            ),
          }))
        : EMPTY,
    [cat, edict, lang, data.statValues, autoStats, set],
  );

  const latestPosts = useMemo(
    () => cat?.allPosts.filter((p) => p.category !== "vietnam-by-month").slice(0, 4) ?? EMPTY,
    [cat],
  );
  const months = useMemo(() => cat?.monthPosts() ?? EMPTY, [cat]);
  const plannerOptions = useMemo(() => cat?.plannerOptions(lang) ?? EMPTY, [cat, lang]);
  const servicesSlot = useCallback(
    (key) => <HomeImage path={`services.${key}`} label="Ảnh thẻ dịch vụ" />,
    [],
  );
  const aboutSlot = useMemo(
    () => <HomeImage path="about" label="Ảnh giới thiệu" tint center={[50, 42]} />,
    [],
  );

  if (!edict || !cat || !labels)
    return (
      <div className="p-6">
        <Loading className="min-h-[60vh]" />
      </div>
    );

  const h = edict.home;

  return (
    <HiddenBlocksContext.Provider value={vis}>
      <HeroSection
        lang={lang}
        edict={edict}
        banner={data.banner}
        slideIndex={slideIndex}
        setBanner={setBanner}
        regions={cat.regions}
        destinations={cat.destinations}
      />

      <Block name="Dải uy tín" hide="trust" lazy={false}>
        <MTrust items={h.trust} stats={dict.reviewStats} />
      </Block>

      <Block name="Dịch vụ chính" hide="services" lazy={false}>
        <MServices lang={lang} dict={edict} images={images.services} imageSlot={servicesSlot} />
      </Block>

      <FeaturedSection
        lang={lang}
        edict={edict}
        labels={labels}
        cards={featured}
        value={data.featuredTours}
        set={set}
        tours={tours}
        toursStatus={toursStatus}
        searchTours={searchTours}
      />

      <B2BSection lang={lang} edict={edict} images={images} />

      <Block name="Bản đồ Việt Nam" hide="map">
        <section className="relative bg-cream-100 py-14 lg:py-[4.5rem]" id="map">
          <Container>
            <SectionHeading eyebrow={h.mapEyebrow} title={h.mapTitle} subtitle={h.mapSubtitle} />
            <div className="relative">
              <MMap items={mapItems} lang={lang} labels={mapLabels} autoPlay={false} />
              <AutoChip
                href={`${A}/destinations`}
                label="Tự động từ mục Điểm đến · sửa ở Điểm đến"
                className="absolute top-0 left-0"
              />
            </div>
          </Container>
        </section>
      </Block>

      <DestinationsSection
        lang={lang}
        edict={edict}
        featured={grid.tiles}
        others={grid.others}
        value={data.featuredDestinations}
        set={set}
        destinations={destinations}
        destinationsStatus={destinationsStatus}
      />

      <Block name="Con số nổi bật" hide="stats" dark>
        <div className="relative">
          <MStats lang={lang} t={h} stats={stats} />
          <AutoChip
            dark
            label="Bấm vào con số để nhập số riêng · để trống (chữ mờ) thì website tự tính"
            className="absolute right-3 bottom-3"
          />
        </div>
      </Block>

      <LongSection
        lang={lang}
        edict={edict}
        dict={dict}
        labels={labels}
        cards={longCards}
        value={data.longTours}
        set={set}
        tours={tours}
        toursStatus={toursStatus}
        searchTours={searchTours}
      />

      <Block name="Các bước đặt tour" hide="steps">
        <MSteps dict={edict} />
      </Block>

      <ThemesSection
        lang={lang}
        edict={edict}
        themesShown={themesShown}
        value={data.homeThemes}
        set={set}
        themes={themes}
        themesStatus={themesStatus}
      />

      <CustomSection
        lang={lang}
        edict={edict}
        starImages={images.star}
        starLabels={data.starLabels}
      />

      <Block name="Vì sao chọn Vietlook" hide="why">
        <MWhy dict={edict} />
      </Block>

      <Block name="Du lịch không rào cản" hide="access">
        <MAccess live={live} lang={lang} />
      </Block>

      <Block name="Logo đối tác" hide="partnerLogos">
        <MPartnerStrip title={h.partnerStrip} />
      </Block>

      <Block name="Dự án đã phục vụ" hide="projects">
        <MPartners lang={lang} dict={edict} />
      </Block>

      <Block name="Đánh giá của khách" hide="reviews" dark>
        <div className="relative">
          <MReviews lang={lang} dict={edict} reviews={reviews} />
          <AutoChip
            href={`${A}/reviews`}
            dark
            label="Đánh giá tự động · sửa ở mục Đánh giá"
            className="absolute top-3 right-3"
          />
        </div>
      </Block>

      <Block name="Cẩm nang · Việt Nam theo tháng" hide="guide">
        <div className="relative">
          <MGuide lang={lang} dict={edict} posts={latestPosts} months={months} />
          <AutoChip
            href={`${A}/articles`}
            label="Bài viết tự động · sửa ở mục Bài viết"
            className="absolute top-3 right-3"
          />
        </div>
      </Block>

      <Block name="Lên kế hoạch chuyến đi" hide="planner" dark>
        <div className="relative">
          <MPlanner
            lang={lang}
            dict={edict}
            destinationOptions={plannerOptions}
            contact={info.contact}
          />
          <AutoChip
            href={`${A}/contact`}
            dark
            label="Số WhatsApp, email · sửa ở Thông tin liên hệ"
            className="absolute top-3 right-3"
          />
        </div>
      </Block>

      <Block name="Về chúng tôi" hide="about">
        <MAbout lang={lang} dict={edict} image={images.about} imageSlot={aboutSlot} />
      </Block>
    </HiddenBlocksContext.Provider>
  );
}
