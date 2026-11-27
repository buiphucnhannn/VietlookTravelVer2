"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Accessibility,
  Compass,
  Ear,
  Eye,
  Film,
  HandHeart,
  Handshake,
  Headphones,
  HeartHandshake,
  ImagePlus,
  Languages,
  Layers,
  MapPinned,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/constants/site";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { ABOUT_COLLAGE, ABOUT_MAX_REASONS } from "@/data/about";
import BgImage from "@/components/ui/BgImage";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import VideoEmbed from "@/components/ui/VideoEmbed";
import Reviews from "@/components/home/Reviews";
import { Sortable } from "../Sortable";
import { Button as AdminButton, ImageField, Modal, VideoField, VideoHelp } from "../ui";
import {
  AddButton,
  AutoChip,
  CardTools,
  InlineChips,
  InlineText,
  LocText,
  emptyLoc,
  otherList,
} from "./canvas";
import { usePublicData } from "./live";

/* =========================================================================
 * Trang Giới thiệu — y như website (app/[lang]/about/page.js), cùng thứ tự khối:
 * đầu trang · câu chuyện + 4 ảnh · tầm nhìn – sứ mệnh – giá trị · vì sao chọn Vietlook ·
 * du lịch không rào cản (dùng chung) · video + con số · đánh giá của khách (tự động)
 * ========================================================================= */

const MAX_VALUES = 12;
const MAX_STATS = 8;

/** Danh sách theo ngôn ngữ: nếu ngôn ngữ này chưa có gì → hiện các ô trống theo số dòng của ngôn ngữ khác */
const rowsOf = (list, lang) => {
  const own = list[lang] ?? [];
  if (own.length) return own;
  const english = otherList(list, lang);
  return english.length ? english.map(() => "") : [""];
};

const VALUE_ICONS = [Rocket, HeartHandshake, Sparkles];
const REASON_ICONS = [Layers, Wallet, MapPinned, ShieldCheck, Headphones, Handshake];
const ACCESS_ICONS = [Accessibility, Ear, HandHeart];
/** Khoảng cách trên/dưới mỗi khối — giống website */
const SECTION = "py-14 lg:py-[4.5rem]";

export function AboutBody({ data, lang, setData }) {
  const live = usePublicData(lang);
  const loc = (key) => ({
    lang,
    value: data[key],
    onChange: (v) => setData({ [key]: v }),
  });
  const props = { data, lang, setData, loc };
  return (
    <>
      <StorySection {...props} />
      <ValuesSection {...props} />
      <WhySection {...props} />
      <AccessSection live={live} lang={lang} />
      <NumbersSection {...props} />
      <ReviewsSection live={live} lang={lang} />
    </>
  );
}

/* ----- Câu chuyện + 4 ảnh ----- */

function StorySection({ data, lang, setData, loc }) {
  const [focusAt, setFocusAt] = useState(-1);
  const story = rowsOf(data.story, lang);
  const setStory = (next) => setData({ story: { ...data.story, [lang]: next } });
  const english = otherList(data.story, lang);

  return (
    <section className={SECTION}>
      <Container className="grid gap-12 lg:grid-cols-2">
        <div className="min-w-0 self-center">
          <LocText
            {...loc("storyEyebrow")}
            singleLine
            label="Dòng chữ nhỏ phía trên tiêu đề"
            hint="Dòng chữ nhỏ"
            className="text-xs font-bold tracking-[0.2em] text-sun-500 uppercase"
          />
          <LocText
            {...loc("storyTitle")}
            singleLine
            label="Tiêu đề khối câu chuyện"
            hint="Tiêu đề"
            className="heading-lg mt-2 text-ink"
          />
          <Sortable
            items={story}
            onReorder={setStory}
            className="mt-6 space-y-4 text-base leading-relaxed text-ink/80 sm:text-justify sm:text-lg sm:hyphens-auto"
          >
            {(p, i, drag) => (
              <div
                className={cn(
                  "group/item relative rounded-lg",
                  drag.dragging && "bg-white ring-1 ring-brand-200",
                )}
              >
                <CardTools
                  drag={drag}
                  name={`đoạn ${i + 1}`}
                  onRemove={() => setStory(story.filter((_, k) => k !== i))}
                  className="-top-5 right-0"
                />
                <InlineText
                  label={`Đoạn ${i + 1}`}
                  value={p}
                  autoFocus={i === focusAt}
                  onChange={(v) => setStory(story.map((x, k) => (k === i ? v : x)))}
                  placeholder={english[i] || "Viết một đoạn kể về Vietlook…"}
                />
              </div>
            )}
          </Sortable>
          <AddButton
            className="mt-3 px-3 py-1"
            onClick={() => {
              setFocusAt(story.length);
              setStory([...story, ""]);
            }}
          >
            Thêm đoạn
          </AddButton>

          <div
            className="mt-6 flex flex-wrap items-center gap-2"
            title="Ngôn ngữ của hướng dẫn viên — hiện giống nhau ở cả ba bản EN, 中文, VI"
          >
            <Languages className="size-5 text-brand-600" />
            <InlineChips
              name="Ngôn ngữ hướng dẫn viên"
              value={data.languages}
              onChange={(languages) => setData({ languages })}
              addLabel="Thêm ngôn ngữ"
              newHint="VD: English"
              chipClass="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
            />
          </div>
        </div>

        <Collage value={data.collage} onChange={(collage) => setData({ collage })} />
      </Container>
    </section>
  );
}

/** Lưới 2×2 ảnh cạnh câu chuyện (cao bằng khối chữ bên cạnh): bấm để đổi ảnh, giữ và kéo để đổi chỗ */
function Collage({ value, onChange }) {
  const [editing, setEditing] = useState(-1);
  return (
    <>
      <Sortable
        items={value}
        onReorder={onChange}
        layout="grid"
        className="grid h-[420px] grid-cols-2 grid-rows-2 gap-4 sm:h-[560px] lg:h-full"
      >
        {(src, i, drag) => (
          <button
            type="button"
            {...drag.handle}
            onClick={() => setEditing(i)}
            aria-label={`Ảnh ${i + 1}: bấm để đổi ảnh, giữ và kéo để đổi chỗ`}
            className={cn(
              "group absolute inset-0 overflow-hidden rounded-3xl bg-slate-200 shadow-lg ring-brand-400 transition focus-visible:ring-4 focus-visible:outline-none",
              drag.dragging && "ring-4",
            )}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover"
            />
            <span className="absolute right-3 bottom-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-slate-800 opacity-0 shadow-md transition group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
              <ImagePlus className="size-3.5" />
              Đổi ảnh
            </span>
          </button>
        )}
      </Sortable>

      <Modal
        open={editing >= 0}
        onClose={() => setEditing(-1)}
        size="sm"
        icon={ImagePlus}
        title={`Ảnh ${editing + 1} cạnh câu chuyện`}
        description="Nên chọn ảnh rõ nét. Bỏ ảnh thì website dùng lại ảnh có sẵn."
        footer={<AdminButton onClick={() => setEditing(-1)}>Xong</AdminButton>}
      >
        <div className="flex justify-center">
          {editing >= 0 && (
            <ImageField
              value={value[editing]}
              onChange={(image) =>
                onChange(value.map((x, k) => (k === editing ? image || ABOUT_COLLAGE[k] : x)))
              }
              folder="pages"
              aspect="aspect-square"
              crop={{ width: 1000 }}
            />
          )}
        </div>
      </Modal>
    </>
  );
}

/* ----- Tầm nhìn – sứ mệnh – giá trị cốt lõi – phẩm chất ----- */

// Thẻ trong lưới: từ màn md mỗi thẻ chia 3 hàng (biểu tượng · tiêu đề · mô tả) dùng chung với thẻ bên cạnh
// → tiêu đề / mô tả các thẻ cùng hàng thẳng nhau (lib/subgrid). Khung kéo-thả bọc ngoài mỗi thẻ cũng chia hàng.
const SUBGRID3 = "md:grid md:grid-cols-1 md:grid-rows-subgrid md:gap-y-0 md:row-span-3";
const WRAP_SUBGRID3 =
  "md:[&>*]:grid md:[&>*]:grid-cols-1 md:[&>*]:grid-rows-subgrid md:[&>*]:gap-y-0 md:[&>*]:row-span-3";

function ValuesSection({ data, lang, setData, loc }) {
  const [focusAt, setFocusAt] = useState(-1);
  const values = data.values;
  const setValues = (next) => setData({ values: next });
  const setValue = (i, field, v) =>
    setValues(values.map((x, k) => (k === i ? { ...x, [field]: v } : x)));
  const people = rowsOf(data.people, lang);

  return (
    <section className={cn(SECTION, "relative isolate overflow-hidden bg-brand-950 text-white")}>
      <BgImage src="/images/tours/hd/hanoi7.jpg" tone="dark" />
      <Container className="grid gap-6 md:grid-cols-2">
        {[
          { key: "vision", icon: Eye, name: "Tầm nhìn", hint: "Viết tầm nhìn của công ty…" },
          { key: "mission", icon: Compass, name: "Sứ mệnh", hint: "Viết sứ mệnh của công ty…" },
        ].map((x) => (
          <div
            key={x.key}
            className={cn("rounded-3xl bg-white/5 p-8 ring-1 ring-white/10", SUBGRID3)}
          >
            <x.icon className="size-9 text-amber-brand" />
            <LocText
              {...loc(`${x.key}Title`)}
              dark
              singleLine
              label={`Tiêu đề ô ${x.name}`}
              hint={x.name}
              className="mt-4 text-2xl font-bold"
            />
            <LocText
              {...loc(x.key)}
              dark
              label={x.name}
              hint={x.hint}
              className="mt-2 text-lg text-white/80"
            />
          </div>
        ))}
      </Container>

      <Container className="mt-14">
        <LocText
          {...loc("valuesTitle")}
          dark
          singleLine
          label="Tiêu đề khối giá trị"
          hint="Tiêu đề khối giá trị"
          className="text-center text-3xl font-bold"
        />
        <Sortable
          items={values}
          onReorder={setValues}
          layout="grid"
          className={cn("rail mt-10 grid gap-6 md:grid-cols-3", WRAP_SUBGRID3)}
        >
          {(v, i, drag) => {
            const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
            return (
              <div
                className={cn(
                  "group/item relative h-full rounded-3xl bg-white p-7 text-ink",
                  SUBGRID3,
                )}
              >
                <CardTools
                  drag={drag}
                  name={`giá trị ${i + 1}`}
                  onRemove={() => setValues(values.filter((_, k) => k !== i))}
                />
                <span className="grid size-12 place-items-center rounded-xl bg-sun-500 text-white">
                  <Icon className="size-6" />
                </span>
                <LocText
                  lang={lang}
                  value={v.title}
                  onChange={(t) => setValue(i, "title", t)}
                  singleLine
                  autoFocus={i === focusAt}
                  label={`Tên giá trị ${i + 1}`}
                  hint="Tên giá trị"
                  className="mt-4 text-xl font-bold"
                />
                <LocText
                  lang={lang}
                  value={v.text}
                  onChange={(t) => setValue(i, "text", t)}
                  label={`Mô tả giá trị ${i + 1}`}
                  hint="Mô tả ngắn một hai câu"
                  className="mt-2 text-muted"
                />
              </div>
            );
          }}
        </Sortable>
        <div className="mt-5 flex justify-center">
          {values.length < MAX_VALUES ? (
            <AddButton
              dark
              className="px-3 py-1"
              onClick={() => {
                setFocusAt(values.length);
                setValues([...values, { title: emptyLoc(), text: emptyLoc() }]);
              }}
            >
              Thêm giá trị
            </AddButton>
          ) : (
            <p className="text-xs text-white/60">
              Đã đủ {MAX_VALUES} giá trị — xoá bớt nếu muốn thêm mục mới.
            </p>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <InlineChips
            dark
            name="Phẩm chất"
            value={people}
            placeholders={otherList(data.people, lang)}
            onChange={(next) => setData({ people: { ...data.people, [lang]: next } })}
            addLabel="Thêm phẩm chất"
            newHint="VD: Tận tâm"
            chipClass="rounded-full border border-white/25 px-5 py-2 font-semibold"
          />
        </div>
      </Container>
    </section>
  );
}

/* ----- Vì sao chọn Vietlook (giống components/home/WhyAndB2B.js → WhyUs) ----- */

function WhySection({ data, lang, setData, loc }) {
  const [focusAt, setFocusAt] = useState(-1);
  const reasons = data.reasons;
  const setReasons = (next) => setData({ reasons: next });
  const setReason = (i, field, v) =>
    setReasons(reasons.map((x, k) => (k === i ? { ...x, [field]: v } : x)));

  return (
    <section className={cn(SECTION, "relative isolate overflow-hidden")}>
      <BgImage src="/images/tours/v2/sapa-6872795.jpg" tone="light" />
      <Container>
        <Heading
          title={
            <LocText
              {...loc("whyTitle")}
              singleLine
              label="Tiêu đề khối lý do"
              hint="Tiêu đề khối lý do"
              className="heading-lg text-ink"
            />
          }
          subtitle={
            <LocText
              {...loc("whySubtitle")}
              label="Dòng mô tả khối lý do"
              hint="Thêm một dòng mô tả ngắn"
              className="mt-4 text-base text-balance text-ink/75 sm:text-lg"
            />
          }
        />
        <Sortable
          items={reasons}
          onReorder={setReasons}
          layout="grid"
          className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 [&>*]:row-span-2 [&>*]:grid [&>*]:grid-rows-subgrid [&>*]:gap-y-1.5"
        >
          {(r, i, drag) => {
            const Icon = REASON_ICONS[i % REASON_ICONS.length];
            return (
              <div
                className={cn(
                  "group/item relative row-span-2 grid grid-cols-[auto_1fr] grid-rows-subgrid gap-x-4 gap-y-1.5 rounded-2xl",
                  drag.dragging && "bg-white/90 ring-1 ring-brand-200",
                )}
              >
                <CardTools
                  drag={drag}
                  name={`lý do ${i + 1}`}
                  onRemove={() => setReasons(reasons.filter((_, k) => k !== i))}
                  className="right-0"
                />
                <span className="row-span-2 grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-forest-700 to-forest-700 text-white shadow-lg shadow-forest-700/25">
                  <Icon className="size-6" />
                </span>
                <LocText
                  lang={lang}
                  value={r.title}
                  onChange={(t) => setReason(i, "title", t)}
                  singleLine
                  autoFocus={i === focusAt}
                  label={`Lý do ${i + 1}`}
                  hint="Tên lý do"
                  className="text-xl font-semibold tracking-tight text-ink"
                />
                <LocText
                  lang={lang}
                  value={r.text}
                  onChange={(t) => setReason(i, "text", t)}
                  label={`Mô tả lý do ${i + 1}`}
                  hint="Mô tả ngắn một hai câu"
                  className="leading-relaxed text-muted"
                />
              </div>
            );
          }}
        </Sortable>
        <div className="mt-8 flex justify-center">
          {reasons.length < ABOUT_MAX_REASONS ? (
            <AddButton
              className="px-3 py-1"
              onClick={() => {
                setFocusAt(reasons.length);
                setReasons([...reasons, { title: emptyLoc(), text: emptyLoc() }]);
              }}
            >
              Thêm lý do
            </AddButton>
          ) : (
            <p className="text-xs text-slate-500">
              Khối này hiện tối đa {ABOUT_MAX_REASONS} lý do — xoá bớt nếu muốn thêm mục mới.
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}

/** Tiêu đề khối + dòng phụ + gạch ngắn (giống SectionHeading của website) */
function Heading({ title, subtitle, align = "center" }) {
  const centered = align === "center";
  return (
    <header className={cn("mb-8 lg:mb-10", centered && "mx-auto max-w-3xl text-center")}>
      {title}
      {subtitle}
      <span
        aria-hidden
        className={cn("mt-6 block h-[3px] w-16 rounded-full bg-clay-500", centered && "mx-auto")}
      />
    </header>
  );
}

/* ----- Du lịch không rào cản: khối dùng chung (giống components/ui/AccessibleTravel.js) ----- */

export function AccessSection({ live, lang }) {
  const a = live?.access;
  return (
    <section className="relative scroll-mt-28 py-14 lg:py-[4.5rem]">
      <Container className="relative">
        <AutoChip
          href={`${ADMIN_BASE}/pages?key=access`}
          className="top-0 right-8 -translate-y-1/2 sm:right-10 lg:right-16"
        >
          Khối dùng chung — sửa ở Giao diện trang
        </AutoChip>
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-cream-50 p-6 ring-1 ring-brand-100 sm:p-10 lg:p-12">
          <Accessibility
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-10 -z-10 size-56 text-brand-100/70 sm:size-72"
            strokeWidth={1.2}
          />
          {a ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-clay-600 uppercase">
                  {a.eyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance text-ink sm:text-4xl">
                  {a.title}
                </h2>
                <p className="mt-4 text-lg leading-relaxed whitespace-pre-line text-ink/80">
                  {a.text}
                </p>
                <Button href="/plan-your-trip" variant="primary" className="mt-7">
                  {a.cta}
                </Button>
                {a.note && (
                  <p className="mt-3 max-w-md text-sm leading-relaxed whitespace-pre-line text-muted">
                    {a.note}
                  </p>
                )}
              </div>
              <ul className="grid gap-4">
                {(a.points ?? []).map((p, i) => {
                  const Icon = ACCESS_ICONS[i] ?? HandHeart;
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-4 rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-border"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
                        <Icon className="size-6" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight text-ink">{p.title}</h3>
                        <p className="mt-1 leading-relaxed whitespace-pre-line text-muted">
                          {p.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <Skeleton rows={3} />
          )}
        </div>
      </Container>
    </section>
  );
}

/** Khung chờ trong lúc tải dữ liệu website (chỉ thoáng qua lúc mở trang) */
function Skeleton({ rows = 3, dark }) {
  return (
    <div className="grid gap-4" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={cn("h-16 animate-pulse rounded-2xl", dark ? "bg-white/10" : "bg-slate-100")}
        />
      ))}
    </div>
  );
}

/* ----- Video + những con số + nút liên hệ ----- */

function NumbersSection({ data, lang, setData, loc }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [focusAt, setFocusAt] = useState(-1);
  const stats = data.stats;
  const setStats = (next) => setData({ stats: next });
  const setStat = (i, field, v) =>
    setStats(stats.map((x, k) => (k === i ? { ...x, [field]: v } : x)));

  return (
    <section className={cn(SECTION, "relative isolate overflow-hidden bg-surface")}>
      <BgImage src="/images/tours/v2/hanoi-32123175.jpg" tone="mist" />
      <Container className="grid items-center gap-10 lg:grid-cols-2">
        {/* Video: y như website (bấm nút phát để xem thử) */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl">
          <VideoEmbed
            url={data.video}
            fallbackId={siteConfig.youtubeIds[0]}
            title="Discovering The Timeless Beauty With Vietlook Travel"
          />
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className="absolute top-3 left-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-md transition hover:bg-white"
          >
            <Film className="size-4" />
            Đổi video
          </button>
        </div>

        {/* Con số */}
        <div className="min-w-0">
          <Heading
            align="left"
            title={
              <LocText
                {...loc("numbersTitle")}
                singleLine
                label="Tiêu đề khối con số"
                hint="Tiêu đề khối con số"
                className="heading-lg text-ink"
              />
            }
          />
          <Sortable
            items={stats}
            onReorder={setStats}
            layout="grid"
            className="grid grid-cols-2 gap-4"
          >
            {(s, i, drag) => (
              <div className="group/item relative flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-border">
                <CardTools
                  drag={drag}
                  name={`con số ${i + 1}`}
                  onRemove={() => setStats(stats.filter((_, k) => k !== i))}
                />
                <InlineText
                  singleLine
                  autoFocus={i === focusAt}
                  label={`Con số ${i + 1}`}
                  value={s.value}
                  onChange={(v) => setStat(i, "value", v)}
                  placeholder="VD: 2009"
                  className="text-3xl font-extrabold text-brand-600"
                />
                <LocText
                  lang={lang}
                  value={s.label}
                  onChange={(v) => setStat(i, "label", v)}
                  singleLine
                  label={`Chú thích con số ${i + 1}`}
                  hint="Chú thích"
                  className="text-sm text-muted"
                />
              </div>
            )}
          </Sortable>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {/* Nút dẫn sang trang Liên hệ (giống nút "cta" của website): sửa được chữ trên nút */}
            <span className="inline-flex h-11 max-w-full items-center justify-center rounded-md bg-clay-500 px-6 text-[0.95rem] font-semibold whitespace-nowrap text-white shadow-sm shadow-clay-500/25">
              <LocText
                {...loc("ctaLabel")}
                dark
                fit
                singleLine
                label="Chữ trên nút liên hệ"
                hint="Chữ trên nút"
              />
            </span>
            {stats.length < MAX_STATS && (
              <AddButton
                className="px-3 py-1"
                onClick={() => {
                  setFocusAt(stats.length);
                  setStats([...stats, { value: "", label: emptyLoc() }]);
                }}
              >
                Thêm con số
              </AddButton>
            )}
          </div>
        </div>
      </Container>

      <Modal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        size="sm"
        icon={Film}
        title="Video giới thiệu"
        description="Dán link video YouTube hoặc Google Drive. Để trống thì website dùng video có sẵn."
        footer={<AdminButton onClick={() => setVideoOpen(false)}>Xong</AdminButton>}
      >
        <div className="space-y-3">
          <VideoField value={data.video} onChange={(v) => setData({ video: v })} />
          <details className="group/help">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-sun-600 [&::-webkit-details-marker]:hidden">
              Cách lấy link video
            </summary>
            <div className="mt-2">
              <VideoHelp />
            </div>
          </details>
        </div>
      </Modal>
    </section>
  );
}

/* ----- Đánh giá của khách: khối thật của website (components/home/Reviews.js), dữ liệu thật ----- */

function ReviewsSection({ live, lang }) {
  if (!live)
    return (
      <section className={cn(SECTION, "bg-forest-900")}>
        <Container>
          <Skeleton rows={2} dark />
        </Container>
      </section>
    );
  const reviews = live.reviewsOn("about");
  return (
    <div className="relative">
      <AutoChip dark href={`${ADMIN_BASE}/reviews`}>
        Tự động — sửa ở mục Đánh giá
      </AutoChip>
      {reviews.length ? (
        <Reviews lang={lang} dict={live.dict} reviews={reviews} />
      ) : (
        // website ẩn cả khối khi không có đánh giá nào bật "hiện ở trang Giới thiệu"
        <p className="border-t border-dashed border-slate-200 bg-slate-50 px-4 py-6 pt-12 text-center text-sm text-slate-500">
          Chưa có đánh giá nào bật hiện ở trang Giới thiệu — website đang ẩn khối đánh giá.
        </p>
      )}
    </div>
  );
}
