"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Accessibility,
  CalendarDays,
  Check,
  Clock,
  Ear,
  Headphones,
  ListOrdered,
  MapPin,
  MessageCircle,
  Star,
  UserRound,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { EXCLUSIVE_THEME } from "@/constants/themes";
import { fill, lp, tr } from "@/i18n/config";
import { cardLabels } from "@/lib/labels";
import { normalizeTour, readingTime, tourText } from "@/lib/catalog-build";
import { fmtDate } from "@/lib/dates";
import { formatCount, formatScore } from "@/lib/review-stats";
import { cn, formatUSD, slugify } from "@/lib/utils";
import { Breadcrumbs, Container, SectionHeading, Stars } from "@/components/ui";
import AdviceBox from "@/components/ui/AdviceBox";
import Button from "@/components/ui/Button";
import { BrushHero } from "@/components/ui/PageHero";
import PostCard from "@/components/guide/PostCard";
import TourCard, { DestinationTile } from "@/components/tours/TourCard";
import TourGallery from "@/components/tours/TourGallery";
import StickyTabs from "@/components/tours/StickyTabs";
import TourSide from "@/components/tours/TourSide";
import BookingWidget from "@/components/tours/BookingWidget";
import { TripAdvisorIcon, WeChatIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { PreviewImage, Txt, usePlain } from "../blocks";
import {
  Auto,
  Loading,
  SitePage,
  Zone,
  useCatalog,
  useDict,
  usePageText,
  usePublic,
  useSiteInfo,
} from "./site-frame";
import { TourListPreview } from "./tours-shared";

/**
 * Bản xem trước "Chữ chung trên trang chi tiết" (lib/page-copy/registry/detail.mjs): chữ lặp lại trên MỌI trang
 * chủ đề / điểm đến / bài viết / tour. Mỗi tab dựng 1 trang mẫu thật của website (dữ liệu thật: tour, bài viết,
 * điểm đến…) — chữ chung bấm vào là sửa, phần còn lại là nội dung riêng của từng trang (chỉ xem).
 * Chữ có {name}: trên trang hiện tên thật; rê chuột / bấm vào để sửa mẫu câu (giữ nguyên {name}).
 */

const TOURS = `${ADMIN_BASE}/tours`;
const TABS = [
  { key: "theme", label: "Trang chủ đề" },
  { key: "destination", label: "Trang điểm đến" },
  { key: "guide", label: "Bài viết cẩm nang" },
  { key: "tour", label: "Trang tour" },
];

/** Tên chủ đề chèn vào mẫu câu: bỏ chữ "tour" đã có trong tên (giống app/[lang]/themes/[slug]/page.js) */
const inSentence = (name, lang) =>
  lang === "zh"
    ? name.replace(/线路$/, "")
    : lang === "vi"
      ? name.replace(/^tour\s+/i, "")
      : name.replace(/\s+tours?$/i, "");

/**
 * Mẫu câu có {name}: bình thường hiện câu đã điền tên (đúng như website), rê chuột / bấm vào → ô sửa mẫu câu.
 * `upper`: website in hoa tên (tiêu đề trang chủ đề).
 */
function TxtName({ f, name, dark, upper }) {
  const plain = usePlain();
  const shown = fill(plain(f), { name: upper ? name.toUpperCase() : name });
  return (
    <span className="group/n relative inline-grid max-w-full">
      <span
        aria-hidden
        className="col-start-1 row-start-1 group-focus-within/n:invisible group-hover/n:invisible"
      >
        {shown}
      </span>
      <span className="invisible col-start-1 row-start-1 group-focus-within/n:visible group-hover/n:visible">
        <Txt f={f} dark={dark} />
      </span>
    </span>
  );
}

/* ---------- Trang chủ đề ---------- */

function ThemeSample({ lang, dict, catalog }) {
  const theme =
    catalog.themes.find((t) => t.slug !== EXCLUSIVE_THEME && catalog.toursByTheme(t.slug).length) ??
    catalog.themes[0];
  const name = tr(theme?.name, lang);
  const tours = catalog.toursByTheme(theme?.slug);
  const byTheme = useMemo(() => () => tours, [tours]);
  if (!theme) return <Loading />;
  return (
    <SitePage
      lang={lang}
      path={`/themes/${theme.slug}`}
      extras={
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="mb-3 text-xs font-semibold text-slate-600">
            Hộp hiện thay danh sách tour khi chủ đề chưa có tour nào
          </p>
          <AdviceBox
            title={<Txt f="themeEmptyTitle" />}
            text={<Txt f="themeEmptyText" />}
            cta={<Txt f="themeEmptyCta" dark />}
            href="#"
          />
        </div>
      }
    >
      <Zone name="Đầu trang chủ đề" dark at="left-3 bottom-3">
        <BrushHero
          ImageComponent={PreviewImage}
          title={
            <TxtName f="themeSamples" name={inSentence(name, lang)} upper={lang !== "zh"} dark />
          }
          subtitle={tr(theme.tagline, lang)}
          images={[theme.banner || theme.image]}
          collage={[theme.banner || theme.image, ...tours.slice(0, 4).map((t) => t.image)]}
          breadcrumbs={[{ label: "Vietlook", href: "#" }, { label: name }]}
        />
      </Zone>
      <Zone name="Danh sách tour">
        <section className="py-14 lg:py-[4.5rem]">
          <Container>
            <header className="mx-auto mb-10 max-w-4xl text-center">
              <h2 className="text-2xl font-semibold tracking-wide text-ink uppercase sm:text-3xl">
                <TxtName f="themeBrowse" name={inSentence(name, lang)} />
              </h2>
              <p className="mt-4 leading-relaxed text-muted sm:text-lg">{tr(theme.intro, lang)}</p>
            </header>
            <TourListPreview
              lang={lang}
              dict={dict}
              catalog={catalog}
              tours={byTheme}
              hide={["theme"]}
              variant="aurora"
              label="Tour của chủ đề · sửa ở mục Tour"
            />
          </Container>
        </section>
      </Zone>
      <Zone name="Chủ đề khác" dark>
        <section className="bg-[#0d1114] py-12 text-white lg:py-14">
          <Container>
            <h2 className="mb-8 text-center text-2xl font-bold tracking-wide text-amber-brand uppercase">
              <Txt f="themeOthers" dark />
            </h2>
            <Auto
              dark
              href={`${ADMIN_BASE}/themes`}
              label="Chủ đề · sửa ở mục Chủ đề"
              at="top-2 right-2"
              className="-mx-4 flex scrollbar-none gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-7"
            >
              {catalog.themes
                .filter((t) => t.slug !== theme.slug)
                .map((t) => (
                  <span
                    key={t.slug}
                    className={cn(
                      "group relative block h-56 w-36 shrink-0 overflow-hidden sm:w-auto",
                      t.slug === EXCLUSIVE_THEME && "ring-2 ring-amber-brand ring-inset",
                    )}
                  >
                    <Image src={t.image} alt="" fill sizes="200px" className="object-cover" />
                    <span className="absolute inset-0 bg-black/35" />
                    <span className="absolute inset-0 grid place-items-center px-2 text-center font-bold tracking-wider uppercase">
                      {tr(t.name, lang)}
                    </span>
                    {t.slug === EXCLUSIVE_THEME && (
                      <Star
                        className="absolute top-3 left-1/2 size-5 -translate-x-1/2 fill-amber-brand text-amber-brand"
                        aria-hidden
                      />
                    )}
                  </span>
                ))}
            </Auto>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}

/* ---------- Trang điểm đến (trang miền Bắc) ---------- */

function DestinationSample({ lang, dict, catalog }) {
  const item = catalog.getRegion("north-vietnam") ?? catalog.regions[0];
  const all = usePageText("destinations", lang, dict);
  const name = tr(item.name, lang);
  const tours = catalog.toursByDestination(item.slug);
  const byDest = useMemo(() => () => tours, [tours]);
  const places = catalog.destinationsByRegion(item.slug);
  const guides = catalog.allPosts
    .filter((p) => places.some((d) => d.slug === p.destination))
    .slice(0, 3);
  const ri = catalog.regions.findIndex((x) => x.slug === item.slug);
  return (
    <SitePage lang={lang} path={`/destinations/${item.slug}`}>
      <Zone name="Đầu trang điểm đến" dark at="left-3 bottom-3">
        <BrushHero
          ImageComponent={PreviewImage}
          title={<TxtName f="destRegionTours" name={name} dark />}
          subtitle={all?.regionIntros[ri]?.intro || tr(item.intro, lang)}
          images={[item.hero || item.image]}
          collage={[item.hero || item.image, ...tours.slice(0, 4).map((t) => t.image)]}
          cta={{ href: "#", label: <Txt f="destViewTours" dark />, variant: "outline-white" }}
          breadcrumbs={[{ label: "Vietlook", href: "#" }, { label: name }]}
        />
      </Zone>

      <Zone name="Danh sách tour">
        <section className="bg-surface pb-14 lg:pb-[4.5rem]">
          <Container>
            <div className="mb-8 rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-border sm:px-8">
              <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-[2rem]">
                <TxtName f="destBestTours" name={name} />
              </h2>
            </div>
            <TourListPreview
              lang={lang}
              dict={dict}
              catalog={catalog}
              tours={byDest}
              label="Tour của điểm đến · sửa ở mục Tour"
            />
            <div className="mt-10">
              <AdviceBox
                title={<Txt f="adviceTitle" />}
                text={<Txt f="adviceText" />}
                cta={<Txt f="adviceCta" dark />}
                href="#"
              />
            </div>
          </Container>
        </section>
      </Zone>

      <Zone name="Điểm đến cùng miền">
        <section className="py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={<TxtName f="destPlaces" name={name} />} />
            <Auto
              href={`${ADMIN_BASE}/destinations`}
              label="Điểm đến · sửa ở mục Điểm đến"
              at="-top-4 right-0"
              className="flex flex-wrap justify-center gap-4 sm:gap-6"
            >
              {places.map((d) => (
                <DestinationTile
                  key={d.slug}
                  href={`${lp(lang)}/destinations/${d.slug}`}
                  name={tr(d.name, lang)}
                  count={catalog.countFor(d.slug)}
                  image={d.image}
                  tripsLabel={dict.common.trips}
                  className="aspect-[4/3] w-[calc(50%-0.5rem)] sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)]"
                />
              ))}
            </Auto>
          </Container>
        </section>
      </Zone>

      {guides.length > 0 && (
        <Zone name="Bài viết cẩm nang">
          <section className="bg-brand-50 py-14 lg:py-[4.5rem]">
            <Container>
              <SectionHeading title={<TxtName f="destGuide" name={name} />} />
              <Auto
                href={`${ADMIN_BASE}/articles`}
                label="Bài viết · sửa ở mục Bài viết"
                at="-top-4 right-0"
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {guides.map((p) => (
                  <PostCard
                    key={p.slug}
                    post={p}
                    lang={lang}
                    categoryName={tr(catalog.getGuideCategory(p.category)?.name, lang)}
                  />
                ))}
              </Auto>
            </Container>
          </section>
        </Zone>
      )}
    </SitePage>
  );
}

/* ---------- Bài viết cẩm nang ---------- */

const withTableWrap = (html) =>
  html
    .replace(/<table\b/g, '<div class="table-wrap"><table')
    .replace(/<\/table>/g, "</table></div>");
function withAnchors(html) {
  const toc = [];
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = slugify(text) || `section-${toc.length + 1}`;
    toc.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

function GuideSample({ lang, dict, catalog }) {
  // bài mẫu: bài mới nhất có gắn điểm đến (có đủ khối tour gợi ý)
  const sample = useMemo(
    () =>
      [...catalog.allPosts]
        .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
        .find((p) => p.destination) ?? catalog.allPosts[0],
    [catalog],
  );
  const full = usePublic(sample ? `/articles/${encodeURIComponent(sample.slug)}` : null);
  const gp = usePageText("travel-guide", lang, dict);
  if (!sample) return <Loading />;
  const post = full
    ? { ...full, date: full.publishedAt ? String(full.publishedAt).slice(0, 10) : "" }
    : null;
  const title = tr(sample.title, lang);
  const category = catalog.getGuideCategory(sample.category);
  const authors = catalog.authors;
  const authorSlug = authors[sample.author] ? sample.author : "vietlook-team";
  const author = authors[authorSlug] ?? { name: dict.common.team };
  const authorAvatar = author.avatar || "/images/logo/vietlook-icon.png";
  const rawBody = post ? tr(post.body, lang) || "" : "";
  const { html, toc } = withAnchors(withTableWrap(rawBody));
  const related = catalog.relatedPosts(sample, 3);
  const dest = sample.destination && catalog.getDestination(sample.destination);
  const tours = (dest ? catalog.toursByDestination(dest.slug) : catalog.allTours)
    .filter((t) => t.price)
    .slice(0, 3)
    .map((t) => catalog.toCard(t, lang));
  const labels = cardLabels(dict);

  return (
    <SitePage lang={lang} path={`/travel-guide/${sample.slug}`}>
      <Zone name="Đầu bài viết" dark at="left-3 top-20 lg:top-[7.25rem]">
        <BrushHero
          ImageComponent={PreviewImage}
          compact
          title={title}
          images={sample.image ? [sample.image] : []}
          breadcrumbs={[
            { label: gp?.heroTitle ?? "", href: "#" },
            ...(category ? [{ label: tr(category.name, lang), href: "#" }] : []),
            { label: title },
          ]}
        >
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/85">
            <span className="flex items-center gap-2">
              <Image
                src={authorAvatar}
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-full bg-white object-contain p-0.5"
              />
              {dict.common.by} <b className="font-bold text-white">{tr(author.name, lang)}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" /> {fmtDate(sample.date, lang)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" /> {readingTime(rawBody)} {dict.common.minRead}
            </span>
          </div>
        </BrushHero>
      </Zone>

      <Zone name="Nội dung bài & cột phải">
        <Container className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-12">
          <article className="min-w-0">
            <Auto
              href={`${ADMIN_BASE}/articles`}
              label="Nội dung bài · sửa ở mục Bài viết"
              at="-top-7 right-0"
            >
              <p className="text-xl leading-relaxed text-ink/85">{tr(sample.excerpt, lang)}</p>
              <p className="mt-4 text-sm text-muted italic">
                {dict.common.lastUpdated}: {fmtDate(sample.date, lang)}
              </p>
            </Auto>

            <details open className="group mt-6 rounded-xl border border-border">
              <summary
                className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-ink"
                onClick={(e) => e.preventDefault()}
              >
                <span className="flex items-center gap-2">
                  <ListOrdered className="size-4 text-brand-500" /> <Txt f="guideToc" />
                </span>
                <span className="transition group-open:rotate-180">⌃</span>
              </summary>
              <ol
                inert
                className="list-decimal space-y-1.5 border-t border-border px-10 py-4 marker:text-brand-500"
              >
                {(toc.length ? toc : [{ id: "x", text: "…" }]).map((x) => (
                  <li key={x.id}>
                    <span className="text-brand-700">{x.text}</span>
                  </li>
                ))}
              </ol>
            </details>

            <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border-2 border-ink bg-[#fffbe6] p-5 sm:flex-row">
              <Image
                src="/images/logo/vietlook-icon.png"
                alt=""
                width={64}
                height={64}
                className="size-16"
              />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-lg font-bold text-brand-700">
                  <Txt f="guideEbookTitle" />
                </p>
                <p className="text-sm text-muted">
                  <Txt f="guideEbookText" />
                </p>
              </div>
              <Button href="#" variant="primary">
                <Txt f="guideEbookButton" dark />
              </Button>
            </div>

            {post ? (
              <Auto
                href={`${ADMIN_BASE}/articles`}
                label="Nội dung bài · sửa ở mục Bài viết"
                at="top-7 right-0 -translate-y-full"
              >
                {/* nội dung bài lấy từ máy chủ (mục Bài viết) — hiện y như website */}
                <div className="prose-guide mt-8" dangerouslySetInnerHTML={{ __html: html }} />
              </Auto>
            ) : (
              <Loading className="mt-8 min-h-[600px]" />
            )}

            <div className="mt-12 flex gap-5 rounded-2xl bg-surface p-6">
              <Image
                src={authorAvatar}
                alt=""
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-full bg-white object-contain p-1 ring-1 ring-border"
              />
              <div>
                <p className="text-xs font-bold tracking-wider text-sun-500 uppercase">
                  <Txt f="guideAboutAuthor" />
                </p>
                <span className="mt-1 block text-lg font-bold text-ink">
                  {tr(author.name, lang)}
                </span>
                <p className="text-sm text-brand-600">{tr(author.role, lang)}</p>
                <p className="mt-2 text-muted">{tr(author.bio, lang)}</p>
              </div>
            </div>
          </article>

          <aside className="space-y-5 lg:self-start">
            <p className="text-xl font-semibold text-ink">
              <Txt f="guideSidebarTitle" />
            </p>
            {catalog.regions.map((r) => (
              <div key={r.slug} className="rounded-3xl bg-surface p-6">
                <p className="mb-3 font-bold text-ink">{tr(r.name, lang)}</p>
                <ul className="divide-y divide-border">
                  {catalog
                    .destinationsByRegion(r.slug)
                    .slice(0, 6)
                    .map((d) => (
                      <li key={d.slug} className="block py-2 text-muted">
                        {tr(d.name, lang)}
                      </li>
                    ))}
                  <li className="block py-2 font-medium text-ink">
                    <TxtName f="destRegionTours" name={tr(r.name, lang)} />
                  </li>
                </ul>
              </div>
            ))}
          </aside>
        </Container>
      </Zone>

      {tours.length > 0 && (
        <Zone name="Tour gợi ý">
          <section className="bg-brand-50 py-14 lg:py-[4.5rem]">
            <Container>
              <SectionHeading title={<Txt f="guideRelatedTours" />} />
              <Auto
                href={TOURS}
                label="Tour cùng điểm đến · sửa ở mục Tour"
                at="-top-4 right-0"
                className="rail grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {tours.map((c) => (
                  <TourCard key={c.slug} card={c} lang={lang} labels={labels} />
                ))}
              </Auto>
            </Container>
          </section>
        </Zone>
      )}

      <Zone name="Bài viết liên quan">
        <section className="py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={<Txt f="guideRelated" />} />
            <Auto
              href={`${ADMIN_BASE}/articles`}
              label="Bài viết liên quan · tự chọn"
              at="-top-4 right-0"
              className="rail grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {related.map((p) => (
                <PostCard
                  key={p.slug}
                  post={p}
                  lang={lang}
                  categoryName={tr(catalog.getGuideCategory(p.category)?.name, lang)}
                />
              ))}
            </Auto>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}

/* ---------- Trang tour ---------- */

function TourSample({ lang, dict, catalog }) {
  const card = useMemo(() => catalog.featuredTours()[0] ?? catalog.allTours[0], [catalog]);
  const raw = usePublic(card ? `/tours/${encodeURIComponent(card.slug)}` : null);
  const site = usePublic("/site");
  const payment = usePublic("/payment-config");
  const { info, reviewStats } = useSiteInfo();
  if (!card) return <Loading />;
  const tour = raw
    ? {
        ...normalizeTour(raw),
        title: Object.fromEntries(
          ["en", "zh", "vi"].map((l) => [l, raw.content?.[l]?.title ?? ""]),
        ),
      }
    : null;
  const t = dict.tour;
  const c = dict.common;
  const ta = reviewStats.tripadvisor;
  const tx = tour && tourText(tour, lang);
  const title = tx?.title || tr(card.title, lang);
  const destNames = card.destinations
    .map((d) => tr(catalog.getDestination(d)?.name, lang))
    .filter(Boolean);
  const duration =
    card.days <= 1
      ? card.halfDay
        ? c.halfDay
        : `1 ${c.day}`
      : `${card.days} ${c.days} / ${card.nights} ${c.nights}`;
  const photos = tour?.gallery?.length ? tour.gallery : [card.image].filter(Boolean);
  const related = catalog.relatedTours(card, 4).map((x) => catalog.toCard(x, lang));
  const labels = cardLabels(dict);
  const tabs = [
    { id: "overview", label: t.overview },
    { id: "itinerary", label: t.itinerary },
    { id: "included", label: t.included },
    { id: "departures", label: t.departures },
  ];

  return (
    <SitePage lang={lang} path={`/tours/${card.slug}`}>
      <Zone name="Đầu trang tour" at="left-3 top-20 lg:top-[7.25rem]">
        {/* trang tour: header nền trắng → nội dung bắt đầu dưới header */}
        <div className="h-16 lg:h-[108px]" />
        <Auto href={TOURS} label="Ảnh & tên tour · sửa ở mục Tour" at="top-8 right-12">
          <Container className="pt-6 sm:pt-8">
            <Breadcrumbs
              className="mb-5"
              items={[
                { label: "Vietlook", href: "#" },
                { label: dict.nav.tours, href: "#" },
                ...(destNames[0] ? [{ label: destNames[0], href: "#" }] : []),
                { label: title },
              ]}
            />
            <TourGallery images={photos} title={title} label={t.gallery} />
          </Container>
        </Auto>

        <Container className="grid gap-8 py-8 lg:grid-cols-[1fr_400px] lg:items-center lg:py-10">
          <div>
            <div className="flex flex-wrap gap-2">
              {card.themes.slice(0, 3).map((th) => (
                <span
                  key={th}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                >
                  {tr(catalog.getTheme(th)?.name, lang)}
                </span>
              ))}
            </div>
            <h1 className="mt-4 text-4xl leading-[1.08] font-bold tracking-[-0.03em] text-ink sm:text-5xl">
              {title}
            </h1>
            <div className="mt-7 grid gap-5 sm:grid-cols-3">
              {[
                { icon: Clock, a: duration, b: c.duration },
                { icon: UserRound, a: t.privateTour, b: t.fullyCustom },
                { icon: Headphones, a: t.localSupport, b: t.viaWhatsApp },
              ].map((x) => (
                <div
                  key={x.b}
                  className="flex items-center gap-3 sm:row-span-2 sm:grid sm:grid-cols-[auto_1fr] sm:grid-rows-subgrid sm:items-start sm:gap-y-0"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600 sm:row-span-2 sm:self-center">
                    <x.icon className="size-5" />
                  </span>
                  <span className="leading-tight sm:contents">
                    <span className="block font-semibold text-ink">{x.a}</span>
                    <span className="text-sm text-muted">{x.b}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-3 rounded-xl bg-brand-50/70 px-4 py-2.5 text-sm ring-1 ring-brand-100">
              <span className="flex shrink-0 items-center gap-1 text-brand-600" aria-hidden>
                <Accessibility className="size-5" />
                <Ear className="size-4" />
              </span>
              <span className="min-w-0 leading-snug">
                <span className="font-semibold text-ink">
                  <Txt f="tourAccessBadge" />
                </span>
                <span className="ml-2 inline-block font-semibold whitespace-nowrap text-brand-600">
                  <Txt f="tourAccessCta" /> →
                </span>
              </span>
            </p>
            {destNames.length > 0 && (
              <p className="mt-7 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
                <MapPin className="size-5 text-sun-500" />
                {destNames.map((n, i) => (
                  <span key={n} className="font-medium text-ink">
                    {n}
                    {i < destNames.length - 1 && <span className="ml-2 text-muted">·</span>}
                  </span>
                ))}
              </p>
            )}
          </div>

          <aside className="rounded-2xl bg-surface p-6 ring-1 ring-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted">
                  {c.from}
                  {card.price && card.originalPrice && (
                    <span className="ml-2 text-base font-medium text-muted/80 line-through decoration-sun-500/70 decoration-2">
                      {formatUSD(card.originalPrice)}
                    </span>
                  )}
                </p>
                {card.price ? (
                  <>
                    <p className="text-4xl font-extrabold tracking-tight text-sun-500">
                      {formatUSD(card.price)}
                    </p>
                    <p className="text-sm text-muted">{c.perPerson}</p>
                  </>
                ) : (
                  <p className="mt-1 text-2xl font-bold text-brand-700">{c.priceOnRequest}</p>
                )}
              </div>
              <div className="flex flex-col items-center text-center">
                <TripAdvisorIcon className="size-10 text-[#00af87]" />
                <span className="text-[0.65rem] leading-tight font-semibold text-ink">
                  {t.tripadvisor}
                </span>
              </div>
            </div>
            <span className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <Stars value={ta.rating} className="text-[#34E0A1]" />
              <span className="font-semibold text-ink">
                {tr(
                  {
                    en: "Vietlook on Tripadvisor",
                    zh: "Vietlook 猫途鹰评分",
                    vi: "Đánh giá Vietlook trên Tripadvisor",
                  },
                  lang,
                )}
              </span>
              <span className="text-muted">
                {fill(
                  tr(
                    {
                      en: "{score}/5 · {n} reviews",
                      zh: "{score}/5 · {n}条评价",
                      vi: "{score}/5 · {n} đánh giá",
                    },
                    lang,
                  ),
                  { score: formatScore(ta.rating), n: formatCount(ta.count, lang) },
                )}
              </span>
            </span>
            <span className="mt-5 flex h-12 items-center justify-center rounded-md bg-sun-500 font-semibold text-white shadow-md">
              {c.bookNow}
            </span>
            <span className="mt-3 flex h-12 items-center justify-center gap-2 rounded-md border-2 border-brand-600 font-semibold text-brand-700">
              <MessageCircle className="size-4" /> {c.quickAdvice}
            </span>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
              <WhatsAppIcon className="size-4 text-[#25d366]" />
              <WeChatIcon className="size-4 text-[#07c160]" /> <Txt f="tourAskTitle" />
            </p>
          </aside>
        </Container>
      </Zone>

      <div inert>
        <StickyTabs tabs={tabs} cta={{ href: "#book", label: c.bookNow }} />
      </div>

      <Zone name="Nội dung tour & khung đặt tour">
        <div className="bg-gradient-to-b from-surface to-white">
          <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_400px]">
            <div className="min-w-0 space-y-6">
              <Auto
                href={TOURS}
                label="Nội dung riêng từng tour · sửa ở mục Tour"
                at="-top-3 right-0"
              >
                <section className="rounded-2xl bg-white p-6 shadow-[0_2px_20px_-10px_rgba(15,62,95,0.25)] ring-1 ring-border sm:p-8">
                  <p className="text-xs font-bold tracking-[0.18em] text-clay-600 uppercase">
                    {t.overviewEyebrow}
                  </p>
                  <h2 className="mt-2 mb-6 text-3xl font-bold tracking-tight text-ink">
                    {t.overview}
                  </h2>
                  <p className="text-lg leading-relaxed text-ink/85">
                    {tx?.summary || tr(card.summary, lang)}
                  </p>
                  {tx?.highlights?.length > 0 && (
                    <div className="mt-8">
                      <h3 className="mb-3 text-2xl font-bold text-ink">{t.highlights}</h3>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {tx.highlights.map((h) => (
                          <li key={h} className="flex gap-2.5 text-ink/85">
                            <Check className="mt-1 size-4 shrink-0 text-brand-500" /> {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
                <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-center font-sans text-sm text-slate-500">
                  … lịch trình từng ngày, bảng giá, ngày khởi hành, câu hỏi, đánh giá, video của
                  tour (nội dung riêng từng tour, sửa ở mục Tour)
                </p>
              </Auto>
            </div>

            <div className="relative min-w-0 lg:flex lg:flex-col">
              {tour && site !== null ? (
                <Auto live label="Khung đặt tour giữ nguyên như website" at="-top-3 right-0">
                  <TourSide
                    cardClassName="rounded-2xl bg-white p-5 shadow-[0_24px_60px_-30px_rgba(15,62,95,0.5)] ring-1 ring-border lg:flex lg:flex-col xl:p-6"
                    contact={{
                      title: <Txt f="tourAskTitle" />,
                      text: <Txt f="tourContactText" />,
                      signoff: <Txt f="tourContactSignoff" />,
                      team: <Txt f="tourContactTeam" />,
                      emailLabel: "Email",
                      channelsNote: tr(info.contact.channels.hotline, lang),
                      labels: {
                        whatsapp: dict.floating.whatsapp,
                        zalo: dict.floating.zalo,
                        wechat: dict.floating.wechat,
                        line: dict.floating.line,
                      },
                      hotline: info.contact.hotline,
                      hotlineRaw: info.contact.hotlineRaw,
                      email: info.contact.email,
                      whatsapp: info.messaging.whatsapp,
                      zalo: info.messaging.zalo,
                    }}
                  >
                    <h2 className="mt-0.5 mb-4 shrink-0 text-xl leading-none font-bold tracking-tight text-ink">
                      {t.bookTitle}
                    </h2>
                    <BookingWidget
                      lang={lang}
                      tour={{
                        slug: tour.slug,
                        title,
                        code: tour.code,
                        price: tour.price,
                        originalPrice: tour.originalPrice,
                        days: tour.days,
                        pricing: tour.pricing,
                        departure: tour.departure,
                        departureDates: tour.departureDates,
                        departureDays: tour.departureDays,
                      }}
                      t={t}
                      c={c}
                      payment={{ ...(payment ?? { enabled: false }), labels: dict.payment }}
                      smallGroup={site?.smallGroup ?? null}
                    />
                  </TourSide>
                </Auto>
              ) : (
                <Loading className="min-h-[640px]" />
              )}
              <p className="mt-3 font-sans text-xs text-slate-500">
                Nhãn nút gửi email cho người khiếm thị (không hiện chữ trên trang):{" "}
                <b className="text-slate-700">
                  <Txt f="tourContactEmail" />
                </b>
              </p>
            </div>
          </Container>
        </div>
      </Zone>

      <Zone name="Tour gợi ý cuối trang">
        <section className="py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={<Txt f="tourRelated" />} />
            <Auto
              href={TOURS}
              label="Tour gợi ý tự chọn · sửa ở mục Tour"
              at="-top-4 right-0"
              className="rail grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {related.map((x) => (
                <TourCard key={x.slug} card={x} lang={lang} labels={labels} />
              ))}
            </Auto>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}

export default function DetailPreview({ lang }) {
  const [tab, setTab] = useState("theme");
  const dict = useDict(lang);
  const catalog = useCatalog();
  const Sample = {
    theme: ThemeSample,
    destination: DestinationSample,
    guide: GuideSample,
    tour: TourSample,
  }[tab];
  return (
    <>
      {/* chọn trang mẫu — chữ chung giống nhau trên mọi trang cùng loại */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3.5 py-2.5">
        <span className="text-xs font-semibold text-slate-500">Xem trên trang mẫu:</span>
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setTab(x.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              tab === x.key
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
            )}
          >
            {x.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-400 max-sm:hidden">
          Chữ có {"{name}"}: rê chuột vào để sửa mẫu câu — website tự điền tên
        </span>
      </div>
      {dict && catalog ? (
        <Sample lang={lang} dict={dict} catalog={catalog} />
      ) : (
        <Loading className="m-4 min-h-[600px]" />
      )}
    </>
  );
}
