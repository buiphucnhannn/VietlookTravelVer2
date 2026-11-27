"use client";

import { useContext, useMemo, useState } from "react";
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
import { HOME_IMAGE_CROPS, homeImages } from "@/components/home/images";
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
import { HomeImagesContext, ImageSlot, useHomeImage } from "./ImageSlot";
import { EditBar, ListStrip } from "./ListStrip";
import { InlineText, MAX_DESTINATIONS, MAX_THEMES, MAX_TOURS, Pic, T } from "./shared";

/**
 * BẢN XEM TRƯỚC TRANG CHỦ = TRANG WEB THẬT: mọi khối dựng bằng đúng component của website (components/home/*),
 * cùng dữ liệu website đang dùng (API công khai) → bố cục, cỡ chữ, màu, ảnh nền, thẻ… y hệt trang chủ, kể cả
 * phần không sửa ở đây (bản đồ, đánh giá, bài viết, form…).
 * - Chữ sửa được: câu chữ trong từ điển được thay bằng ô sửa tại chỗ (<T/>) rồi đưa vào component website.
 * - Ảnh sửa được: nút đổi ảnh phủ trong suốt lên đúng ảnh (imageSlot / frameSlot của component website).
 * - Danh sách (tour, chủ đề, điểm đến) và ảnh ngôi sao: thanh sửa màu xanh ngay dưới khối (EditBar).
 * - Phần tự động có nhãn "Tự động · sửa ở …". Bấm link / gửi form trong bản xem trước không rời trang.
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
function leaf(path, node) {
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
  out.node = node;
  return out;
}

const isLoc = (v) =>
  v && typeof v === "object" && !Array.isArray(v) && ["en", "zh", "vi"].some((l) => l in v);

/** Cây câu chữ CMS ({en,zh,vi} ở lá) → cây cùng hình dạng với dict.home, mỗi lá là 1 ô sửa tại chỗ */
function editable(base, copy, path) {
  if (isLoc(copy)) return leaf(path, copy);
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

/* ---------- Nút đổi ảnh phủ trong suốt lên ảnh của website ---------- */

/**
 * Lớp phủ đúng bằng khung ảnh: ảnh website vẫn hiện bên dưới (kèm lớp tối, huy hiệu…), lớp phủ chỉ có viền xanh +
 * nhãn "Bấm để đổi ảnh" + các nút khi rê chuột. Giữ cỡ nút thật (bù độ thu nhỏ của khung xem trước).
 */
const OVER =
  "absolute inset-0 z-10 [zoom:var(--pz,1)] [&>div]:h-full [&_.group]:rounded-none [&_.group]:ring-0 [&_.group:hover]:ring-[3px] [&_.group:hover]:ring-blue-500 [&_.group:hover]:ring-inset [&_.group_img]:opacity-0 [&_.group_.bg-slate-100]:bg-transparent";

function ImageOver({ path, label, className }) {
  return <ImageSlot path={path} aspect="size-full" label={label} className={cn(OVER, className)} />;
}

/** Khung đối tác: 3 ảnh đổi luân phiên trên web → chọn ảnh (1·2·3) rồi đổi ngay trên khung */
function B2BFrame({ group, i, setI }) {
  return (
    <div className="relative size-full">
      <ImageOver
        path={`${group}.${i}`}
        label={group === "b2bNorth" ? "Ảnh khung lớn" : "Ảnh khung nhỏ"}
      />
      <div
        role="group"
        aria-label="Chọn ảnh để đổi (trên web 3 ảnh đổi luân phiên)"
        className="absolute top-[12%] right-[14%] z-20 flex [zoom:var(--pz,1)] gap-1 rounded-full bg-slate-950/60 p-1 backdrop-blur-sm"
      >
        {[0, 1, 2].map((k) => (
          <FrameThumb key={k} group={group} k={k} on={k === i} onClick={() => setI(k)} />
        ))}
      </div>
    </div>
  );
}

function FrameThumb({ group, k, on, onClick }) {
  const src = useHomeImage(`${group}.${k}`);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={`Ảnh ${k + 1} (trên web 3 ảnh đổi luân phiên)`}
      className={cn(
        "relative size-8 overflow-hidden rounded-full ring-2 transition",
        on ? "ring-white" : "opacity-70 ring-transparent hover:opacity-100",
      )}
    >
      <Pic src={src} sizes="64px" />
      <span className="absolute inset-0 grid place-items-center bg-black/25 text-[11px] font-bold text-white">
        {k + 1}
      </span>
    </button>
  );
}

/* ---------- Ảnh + tên địa điểm của ngôi sao dải lụa ---------- */

const STAR_PETALS = [
  "Cánh trên",
  "Cánh trái trên",
  "Cánh phải trên",
  "Cánh phải dưới",
  "Cánh trái dưới",
  "Cánh dưới",
];

function StarBar({ lang }) {
  const ctx = useContext(HomeImagesContext);
  const [k, setK] = useState(0);
  return (
    <EditBar
      title="Ảnh ngôi sao dải lụa"
      hint="Chọn cánh, đổi ảnh và tên địa điểm (tên hiện khi khách rê chuột vào cánh)."
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-wrap gap-1.5">
          {STAR_PETALS.map((name, i) => (
            <StarThumb key={i} k={i} name={name} on={i === k} onClick={() => setK(i)} />
          ))}
        </div>
        <div className="w-40 shrink-0">
          <ImageSlot
            key={k}
            path={`star.${k}`}
            aspect="aspect-[4/3]"
            label={STAR_PETALS[k]}
            className="[&_.group]:rounded-lg"
          />
        </div>
        <label className="min-w-56 flex-1">
          <span className="mb-1 block text-[11px] font-semibold text-slate-600">
            Tên địa điểm · {STAR_PETALS[k]}
          </span>
          <input
            value={ctx?.starLabels?.[k]?.[lang] ?? ""}
            maxLength={60}
            placeholder={tr(STAR_DEFAULT_NAMES[k], lang)}
            onChange={(e) =>
              ctx?.setStarLabels((list) =>
                (list ?? []).map((l, i) => (i === k ? { ...l, [lang]: e.target.value } : l)),
              )
            }
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            Ảnh được cắt theo đúng khung của cánh ({HOME_IMAGE_CROPS.star[k].width}px).
          </span>
        </label>
      </div>
    </EditBar>
  );
}

function StarThumb({ k, name, on, onClick }) {
  const src = useHomeImage(`star.${k}`);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={name}
      className={cn(
        "relative h-12 w-16 overflow-hidden rounded-lg ring-2 transition",
        on ? "ring-blue-600" : "opacity-75 ring-slate-200 hover:opacity-100",
      )}
    >
      <Pic src={src} sizes="64px" />
      <span className="absolute inset-0 grid place-items-center bg-black/25 text-[11px] font-bold text-white">
        {k + 1}
      </span>
    </button>
  );
}

/* ---------- Dữ liệu website ---------- */

const EMPTY = [];
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

export default function HomeSitePreview({
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
  autoFeatured,
  autoLong,
  autoStats,
  searchTours,
}) {
  const dict = useDict(lang);
  const { info } = useSiteInfo();
  const live = usePublicData(lang);
  const reviews = useReviews("home");
  const [north, setNorth] = useState(0);
  const [south, setSouth] = useState(0);

  const edits = useMemo(
    () => ({
      featuredTours: data.featuredTours,
      longTours: data.longTours,
      homeThemes: data.homeThemes,
      featuredDestinations: data.featuredDestinations,
      statValues: data.statValues,
    }),
    [
      data.featuredTours,
      data.longTours,
      data.homeThemes,
      data.featuredDestinations,
      data.statValues,
    ],
  );
  const cat = useHomeCatalog(edits);

  // dict.home với câu chữ CMS thay bằng ô sửa tại chỗ
  const edict = useMemo(
    () => dict && { ...dict, home: editable(dict.home, data.copy, "") },
    [dict, data.copy],
  );

  const banner = data.banner;
  const slide = banner.slides[Math.min(slideIndex, banner.slides.length - 1)];
  // Banner: chữ sửa tại chỗ; chỉ phát slide đang chọn (để thấy đúng slide đang sửa)
  const heroBanner = useMemo(() => {
    if (!edict) return null;
    const t = edict.home;
    const field = (key, label, fallback, multiline) => ({
      [lang]: (
        <InlineText
          value={banner[key][lang] ?? ""}
          placeholder={anyLang({ ...banner[key], [lang]: "" }) || fallback}
          onChange={(v) => setBanner({ [key]: { ...banner[key], [lang]: v } })}
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
                slides: b.slides.map((s) =>
                  s === slide ? { ...s, caption: { ...s.caption, [lang]: v } } : s,
                ),
              }))
            }
            label="Chú thích của slide"
          />,
        ],
        { toString: () => `caption-${slideIndex}` },
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
  }, [edict, banner, lang, setBanner, slide, slideIndex]);

  if (!edict || !cat || !heroBanner)
    return (
      <div className="p-6">
        <Loading className="min-h-[60vh]" />
      </div>
    );

  const labels = cardLabels(dict);
  const images = homeImages(data.images);
  const featured = cat.featuredTours().map((t) => toCard(cat, t, lang));

  // Bản đồ Bắc → Nam (y như app/[lang]/page.js)
  const mapItems = cat.destinations
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
          const c = toCard(cat, t, lang);
          return {
            slug: c.slug,
            title: c.title,
            image: c.image,
            price: c.price,
            duration: durationLabel(c, labels),
            href: `${lp(lang)}/tours/${c.slug}`,
          };
        }),
    }));

  // Lưới điểm đến (y như app/[lang]/page.js)
  const picked = data.featuredDestinations.filter((s) => cat.getDestination(s));
  const gridSlugs = (picked.length ? picked : DEFAULT_GRID).filter((s) => cat.getDestination(s));
  const tileCount = (slugs) =>
    new Set(slugs.flatMap((s) => cat.toursByDestination(s).map((t) => t.slug))).size;
  const gridFeatured = gridSlugs.map((s) => {
    const pair = pairOf(s, gridSlugs);
    const partner = pair && cat.getDestination(pair);
    if (!partner) return toGridItem(cat.getDestination(s), lang, cat.countFor(s));
    return toGridItem(cat.getDestination(s), lang, tileCount([s, pair]), {
      partner,
      href: `${lp(lang)}/destinations/${cat.getDestination(s).region}`,
    });
  });
  const covered = new Set(gridSlugs.flatMap((s) => [s, pairOf(s, gridSlugs)]));
  const gridOthers = cat.destinations.filter((d) => !covered.has(d.slug));

  // Con số nổi bật: con số / chú thích sửa tại chỗ (ô trống → website tự tính, hiện mờ)
  const stats = buildDrumStats(cat, edict, lang).map((s, i) => ({
    ...s,
    text: (
      <InlineText
        value={data.statValues[i] ?? ""}
        placeholder={autoStats[i]}
        onChange={(v) =>
          set({ statValues: data.statValues.map((x, k) => (k === i ? v.slice(0, 12) : x)) })
        }
        label="Con số — để trống thì website tự tính"
      />
    ),
  }));

  const latestPosts = cat.allPosts.filter((p) => p.category !== "vietnam-by-month").slice(0, 4);
  const h = edict.home;

  return (
    <div onClickCapture={stayHere} onSubmitCapture={noSubmit}>
      <SitePage lang={lang} path="/">
        <Zone name="Banner" dark at="top-[4.5rem] left-3 lg:top-[7.25rem]">
          <Hero
            lang={lang}
            dict={edict}
            banner={heroBanner}
            regions={cat.regions}
            destinations={cat.destinations}
          />
        </Zone>
        <MiniHero
          banner={banner}
          lang={lang}
          setBanner={setBanner}
          sel={slideIndex}
          setSel={setSlideIndex}
        />

        <Zone name="Dải uy tín">
          <TrustStrip items={h.trust} stats={dict.reviewStats} />
        </Zone>

        <Zone name="Dịch vụ chính">
          <ServicesTrio
            lang={lang}
            dict={edict}
            images={images.services}
            imageSlot={(key) => <ImageOver path={`services.${key}`} label="Ảnh thẻ dịch vụ" />}
          />
        </Zone>

        <Zone name="Tour nổi bật">
          <FeaturedTours lang={lang} dict={edict} labels={labels} cards={featured} />
        </Zone>
        <EditBar
          title="Tour nổi bật"
          hint="Website hiện 4 tour mỗi lượt, khách bấm mũi tên để xem thêm."
          href={`${A}/tours`}
          linkText="Mở mục Tour"
        >
          <ListStrip
            value={data.featuredTours}
            onChange={(featuredTours) => set({ featuredTours })}
            options={tours}
            status={toursStatus}
            max={MAX_TOURS}
            unit="tour"
            pickerTitle="Thêm tour vào “Tour nổi bật”"
            emptyHref={`${A}/tours`}
            searchPlaceholder="Tìm tour theo tên hoặc mã tour…"
            onSearch={searchTours}
            auto={autoFeatured}
            autoText={`Chưa chọn tour — website đang tự động hiện ${autoFeatured.length} tour nổi bật (như phía trên).`}
          />
        </EditBar>

        <Zone name="Dành cho đối tác">
          <B2BBlock
            lang={lang}
            dict={edict}
            images={{
              ...images,
              b2bNorth: [images.b2bNorth[north]],
              b2bSouth: [images.b2bSouth[south]],
            }}
            frameSlot={(group) =>
              group === "b2bNorth" ? (
                <B2BFrame group={group} i={north} setI={setNorth} />
              ) : (
                <B2BFrame group={group} i={south} setI={setSouth} />
              )
            }
          />
        </Zone>

        <Zone name="Bản đồ Việt Nam">
          <section className="relative bg-cream-100 py-14 lg:py-[4.5rem]" id="map">
            <Container>
              <SectionHeading eyebrow={h.mapEyebrow} title={h.mapTitle} subtitle={h.mapSubtitle} />
              <div className="relative">
                <VietnamMap
                  items={mapItems}
                  lang={lang}
                  labels={{
                    featured: dict.home.mapFeatured,
                    hint: dict.home.mapHint,
                    discover: dict.home.gridDiscover,
                    tours: dict.home.gridTours,
                    from: dict.common.from,
                  }}
                />
                <AutoChip
                  href={`${A}/destinations`}
                  label="Tự động từ mục Điểm đến · sửa ở Điểm đến"
                  className="absolute top-0 left-0"
                />
              </div>
            </Container>
          </section>
        </Zone>

        <Zone name="Điểm đến nổi bật">
          <DestinationGrid lang={lang} dict={edict} featured={gridFeatured} others={gridOthers} />
        </Zone>
        <EditBar
          title="Điểm đến nổi bật (6 ô)"
          hint="Huế và Nha Trang tự ghép với Đà Nẵng / Đà Lạt. Các điểm còn lại tự hiện ở dải dưới cùng."
          href={`${A}/destinations`}
          linkText="Sửa tên, ảnh điểm đến"
        >
          <ListStrip
            value={data.featuredDestinations}
            onChange={(featuredDestinations) => set({ featuredDestinations })}
            options={destinations}
            status={destinationsStatus}
            max={MAX_DESTINATIONS}
            unit="điểm đến"
            pickerTitle="Thêm điểm đến vào lưới"
            emptyHref={`${A}/destinations`}
            searchPlaceholder="Tìm điểm đến theo tên…"
            auto={DEFAULT_GRID}
            adoptText="Tự chọn và sắp xếp"
            autoText="Chưa chọn — website đang hiện 6 điểm đến mặc định (như phía trên)."
            swap
          />
        </EditBar>

        <Zone name="Con số nổi bật" dark>
          <div className="relative">
            <DrumStatsView lang={lang} t={h} stats={stats} />
            <AutoChip
              dark
              label="Bấm vào con số để nhập số riêng · để trống (chữ mờ) thì website tự tính"
              className="absolute right-3 bottom-3"
            />
          </div>
        </Zone>

        <Zone name="Tour dài ngày">
          <LongTours
            lang={lang}
            t={{
              longToursTitle: h.longToursTitle,
              longToursSubtitle: h.longToursSubtitle,
              weekTabs: dict.home.weekTabs,
              longToursCta: h.longToursCta,
            }}
            labels={labels}
            cards={cat
              .longTours({ shown: featured.map((c) => c.slug) })
              .map((t) => toCard(cat, t, lang))}
          />
        </Zone>
        <EditBar
          title="Tour dài ngày"
          hint="Tour đã có trong “Tour nổi bật” được xếp sau để tránh trùng lặp."
        >
          <ListStrip
            value={data.longTours}
            onChange={(longTours) => set({ longTours })}
            options={tours}
            status={toursStatus}
            max={MAX_TOURS}
            unit="tour"
            pickerTitle="Thêm tour vào “Tour dài ngày”"
            emptyHref={`${A}/tours`}
            searchPlaceholder="Tìm tour theo tên hoặc mã tour…"
            onSearch={searchTours}
            auto={autoLong}
            autoText="Chưa chọn tour — website đang tự động hiện các tour từ 7 ngày trở lên (như phía trên)."
          />
        </EditBar>

        <Zone name="Các bước đặt tour">
          <BookingSteps dict={edict} />
        </Zone>

        <Zone name="Chủ đề tour" dark>
          <ThemesMasonry lang={lang} dict={edict} themes={cat.homeThemes()} />
        </Zone>
        <EditBar
          title="Chủ đề tour"
          hint="“Tour độc quyền” luôn đứng đầu, rộng gấp đôi."
          href={`${A}/themes`}
          linkText="Sửa tên, ảnh chủ đề"
        >
          <ListStrip
            value={data.homeThemes}
            onChange={(homeThemes) => set({ homeThemes })}
            options={themes}
            status={themesStatus}
            max={MAX_THEMES}
            unit="chủ đề"
            pickerTitle="Thêm chủ đề vào trang chủ"
            emptyHref={`${A}/themes`}
            searchPlaceholder="Tìm chủ đề theo tên…"
            auto={themes.slice(0, MAX_THEMES).map((o) => o.value)}
            adoptText="Tự chọn và sắp xếp"
            autoText="Đang hiện toàn bộ chủ đề theo thứ tự trong mục Chủ đề tour."
          />
        </EditBar>

        <Zone name="Tour thiết kế riêng">
          <CustomTrip
            lang={lang}
            dict={edict}
            starImages={images.star}
            starLabels={data.starLabels}
          />
        </Zone>
        <StarBar lang={lang} />

        <Zone name="Vì sao chọn Vietlook">
          <WhyUs dict={edict} />
        </Zone>

        <Zone name="Du lịch không rào cản">
          <AccessSection live={live} lang={lang} />
        </Zone>

        <Zone name="Logo đối tác">
          <PartnerStrip title={h.partnerStrip} />
        </Zone>

        <Zone name="Dự án đã phục vụ">
          <PartnersBlock lang={lang} dict={edict} />
        </Zone>

        <Zone name="Đánh giá của khách" dark>
          <div className="relative">
            <Reviews lang={lang} dict={edict} reviews={reviews} />
            <AutoChip
              href={`${A}/reviews`}
              dark
              label="Đánh giá tự động · sửa ở mục Đánh giá"
              className="absolute top-3 right-3"
            />
          </div>
        </Zone>

        <Zone name="Cẩm nang · Việt Nam theo tháng">
          <div className="relative">
            <GuideAndMonths
              lang={lang}
              dict={edict}
              posts={latestPosts}
              months={cat.monthPosts()}
            />
            <AutoChip
              href={`${A}/articles`}
              label="Bài viết tự động · sửa ở mục Bài viết"
              className="absolute top-3 right-3"
            />
          </div>
        </Zone>

        <Zone name="Lên kế hoạch chuyến đi" dark>
          <div className="relative">
            <PlannerView
              lang={lang}
              dict={edict}
              destinationOptions={cat.plannerOptions(lang)}
              contact={info.contact}
            />
            <AutoChip
              href={`${A}/settings`}
              dark
              label="Số WhatsApp, email · sửa ở Cài đặt"
              className="absolute top-3 right-3"
            />
          </div>
        </Zone>

        <Zone name="Về chúng tôi">
          <AboutBlob
            lang={lang}
            dict={edict}
            image={images.about}
            imageSlot={<ImageOver path="about" label="Ảnh giới thiệu" />}
          />
        </Zone>
      </SitePage>
    </div>
  );
}

const toCard = (cat, t, lang) => cat.toCard(t, lang);
