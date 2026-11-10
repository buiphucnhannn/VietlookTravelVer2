"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "@/components/admin/Link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarX2,
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  FileText,
  Info,
  PencilLine,
  Save,
  Search,
  ShieldCheck,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { siteConfig } from "@/constants/site";
import {
  ABOUT_COLLAGE,
  ABOUT_HERO_IMAGES,
  ABOUT_MISSION_TITLE,
  ABOUT_VISION_TITLE,
} from "@/data/about";
import { useMutation } from "./hooks";
import { AutoTranslate } from "./translate";
import { SeoFields } from "./ArticleEditor";
import { AboutBody, MiniHero, MiniSite, PolicyBody } from "./pages/canvas";
import {
  Badge,
  Button,
  LANGS,
  LangTabs,
  LoadingBlock,
  Notice,
  PageHeader,
  Toggle,
  filledOf,
  fmtDateTime,
  useUi,
  useUnsavedGuard,
} from "./ui";

const TAGS = ["pages"];
const BASE = `${ADMIN_BASE}/pages`;

const PAGES = [
  {
    key: "about",
    label: "Giới thiệu",
    icon: Info,
    url: "/about",
    text: "Câu chuyện, tầm nhìn, sứ mệnh và giá trị cốt lõi của Vietlook.",
  },
  {
    key: "terms",
    label: "Điều khoản sử dụng",
    icon: FileText,
    url: "/policies/terms",
    text: "Điều khoản khi khách sử dụng website và dịch vụ.",
  },
  {
    key: "privacy",
    label: "Chính sách bảo mật",
    icon: ShieldCheck,
    url: "/policies/privacy",
    text: "Cách thu thập, sử dụng và bảo vệ thông tin khách hàng.",
  },
  {
    key: "payment",
    label: "Thanh toán & hoàn tiền",
    icon: CreditCard,
    url: "/policies/payment",
    text: "Hình thức thanh toán, đặt cọc và hoàn tiền.",
  },
  {
    key: "cancellation",
    label: "Hủy / đổi tour",
    icon: CalendarX2,
    url: "/policies/cancellation",
    text: "Điều kiện và phí khi khách hủy hoặc đổi tour.",
  },
];
const pageOf = (key) => PAGES.find((p) => p.key === key);

const LANG_KEYS = ["en", "zh", "vi"];
const loc = () => ({ en: "", zh: "", vi: "" });
const locList = () => ({ en: [], zh: [], vi: [] });
const mergeLoc = (v) => ({ ...loc(), ...v });
const mergeList = (v) => ({ ...locList(), ...v });

/** Ô nào (của từng ngôn ngữ) còn trống → điền câu website đang dùng sẵn, để người sửa thấy đúng như khách thấy */
const withDefault = (v, def) => {
  const m = mergeLoc(v);
  if (!def) return m;
  return Object.fromEntries(LANG_KEYS.map((l) => [l, m[l]?.trim() ? m[l] : (def[l] ?? "")]));
};
const pairs = (list) =>
  (list ?? []).map((v) => ({ title: mergeLoc(v.title), text: mergeLoc(v.text) }));

/** Các dòng chữ đơn của trang Giới thiệu (mỗi dòng 3 ngôn ngữ) có câu mặc định trên website */
const ABOUT_TEXT_KEYS = [
  "storyEyebrow",
  "storyTitle",
  "visionTitle",
  "missionTitle",
  "valuesTitle",
  "whyTitle",
  "whySubtitle",
  "numbersTitle",
  "ctaLabel",
];

/**
 * Câu chữ / số liệu website đang dùng sẵn cho trang Giới thiệu (khi CMS chưa nhập) — lấy từ bộ chữ của
 * website để màn sửa hiện đúng như trang thật.
 */
async function loadAboutDefaults() {
  const mods = await Promise.all([
    import("@/i18n/dictionaries/en"),
    import("@/i18n/dictionaries/zh"),
    import("@/i18n/dictionaries/vi"),
  ]);
  const dict = Object.fromEntries(LANG_KEYS.map((l, i) => [l, mods[i].default]));
  const per = (pick) => Object.fromEntries(LANG_KEYS.map((l) => [l, pick(dict[l]) ?? ""]));
  return {
    subtitle: per((t) => t.about.subtitle),
    storyEyebrow: per((t) => `${t.common.since} ${siteConfig.since}`),
    storyTitle: per((t) => t.about.storyTitle),
    visionTitle: ABOUT_VISION_TITLE,
    missionTitle: ABOUT_MISSION_TITLE,
    valuesTitle: per((t) => t.about.valuesTitle),
    whyTitle: per((t) => t.home.whyTitle),
    whySubtitle: per((t) => t.home.whySubtitle),
    numbersTitle: per((t) => t.about.numbersTitle),
    ctaLabel: per((t) => t.nav.contact),
    reasons: dict.en.home.why.map((_, i) => ({
      title: per((t) => t.home.why[i]?.title),
      text: per((t) => t.home.why[i]?.text),
    })),
    stats: dict.en.home.stats.map((s, i) => ({
      value: s.value,
      label: per((t) => t.home.stats[i]?.label),
    })),
  };
}

/** Phần riêng của trang Giới thiệu */
const aboutData = (data, def) => ({
  ...data,
  story: mergeList(data.story),
  vision: mergeLoc(data.vision),
  mission: mergeLoc(data.mission),
  values: pairs(data.values),
  people: mergeList(data.people),
  languages: data.languages ?? [],
  ...Object.fromEntries(ABOUT_TEXT_KEYS.map((k) => [k, withDefault(data[k], def?.[k])])),
  reasons: pairs(data.reasons?.length ? data.reasons : def?.reasons),
  stats: (data.stats?.length ? data.stats : (def?.stats ?? [])).map((s) => ({
    value: s.value ?? "",
    label: mergeLoc(s.label),
  })),
  collage: ABOUT_COLLAGE.map((src, i) => data.collage?.[i] || src),
  video: data.video ?? "",
});

/** Dữ liệu đã lưu (hoặc trang chưa tạo) → dữ liệu đang soạn. `def`: câu mặc định của trang Giới thiệu */
const fromDoc = (doc = {}, isAbout = false, def = null) => {
  const seo = {};
  for (const l of LANG_KEYS) seo[l] = { title: "", description: "", ...doc.seo?.[l] };
  const data = doc.data ?? {};
  return {
    title: mergeLoc(doc.title),
    subtitle: withDefault(doc.subtitle, isAbout ? def?.subtitle : null),
    body: mergeLoc(doc.body),
    image: doc.image ?? "",
    data: isAbout ? aboutData(data, def) : data,
    seo,
    isActive: doc.isActive !== false,
    updatedAt: doc.updatedAt ?? null,
  };
};

const cleanList = (l) =>
  Object.fromEntries(LANG_KEYS.map((k) => [k, (l[k] ?? []).filter((x) => x.trim())]));
const hasText = (v) => LANG_KEYS.some((k) => v?.[k]?.trim());
const filledPair = (v) => hasText(v.title) || hasText(v.text);

const toPayload = (d, isAbout) => ({
  title: d.title,
  subtitle: d.subtitle,
  body: d.body,
  image: d.image,
  data: isAbout
    ? {
        ...d.data,
        story: cleanList(d.data.story),
        // bỏ các ô còn trống hoàn toàn (vừa bấm thêm nhưng chưa gõ gì)
        values: d.data.values.filter(filledPair),
        reasons: d.data.reasons.filter(filledPair),
        stats: d.data.stats.filter((s) => s.value.trim() || hasText(s.label)),
        people: cleanList(d.data.people),
        languages: d.data.languages.map((x) => x.trim()).filter(Boolean),
      }
    : d.data,
  seo: d.seo,
  isActive: d.isActive,
});

export default function ContentPagesPage() {
  const params = useSearchParams();
  const key = params.get("key");
  return pageOf(key) ? <PageEditor key={key} page={pageOf(key)} /> : <PageList />;
}

/* =========================================================================
 * Danh sách 5 trang
 * ========================================================================= */

function PageList() {
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  useEffect(() => {
    let alive = true;
    api("/settings/pages")
      .then((r) => alive && setState({ loading: false, error: "", items: r.data ?? [] }))
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err), items: [] }));
    return () => {
      alive = false;
    };
  }, []);

  const docOf = (key) => state.items.find((x) => x.key === key);

  return (
    <>
      <PageHeader
        title="Giới thiệu & chính sách"
        description="Chọn một trang để sửa chữ và ảnh ngay trên bản xem trước."
      />
      {state.error && (
        <Notice tone="error" className="mb-4">
          {state.error}
        </Notice>
      )}
      {state.loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-8">
          {/* Trang Giới thiệu: thẻ lớn nằm ngang · 4 trang chính sách: một hàng đều nhau */}
          <section>
            <ListHeading>Trang giới thiệu</ListHeading>
            <PageCard wide page={PAGES[0]} doc={docOf(PAGES[0].key)} />
          </section>
          <section>
            <ListHeading>Các trang chính sách</ListHeading>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {PAGES.slice(1).map((p) => (
                <PageCard key={p.key} page={p} doc={docOf(p.key)} />
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function ListHeading({ children }) {
  return (
    <h2 className="mb-3 flex items-center gap-3 text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">
      {children}
      <span className="h-px flex-1 bg-slate-200" />
    </h2>
  );
}

function PageCard({ page, doc, wide }) {
  const Icon = page.icon;
  const isAbout = page.key === "about";
  // "đã có nội dung" theo từng ngôn ngữ: trang Giới thiệu xét tiêu đề + câu chuyện, chính sách xét bài viết
  const filled = Object.fromEntries(
    LANG_KEYS.map((l) => [
      l,
      isAbout
        ? Boolean(doc?.title?.[l]?.trim() || doc?.data?.story?.[l]?.length)
        : Boolean(doc?.body?.[l]?.trim()),
    ]),
  );
  const image = doc?.image || (isAbout ? ABOUT_HERO_IMAGES[0] : "");
  return (
    <Link
      href={`${BASE}?key=${page.key}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-200 focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none",
        wide && "md:flex-row",
      )}
    >
      {/* Ảnh thu nhỏ của trang */}
      <div
        className={cn(
          "relative isolate flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br from-brand-800 to-brand-950 px-5 text-center text-white",
          wide && "md:aspect-auto md:min-h-[230px] md:w-[46%] md:shrink-0",
        )}
      >
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="-z-10 object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/25 to-black/55" />
        <span className="flex flex-col items-center gap-2">
          <Icon className="size-6 opacity-90" />
          <span
            className={cn(
              "line-clamp-2 text-lg leading-tight font-extrabold tracking-tight drop-shadow-md",
              wide && "md:text-2xl",
            )}
          >
            {doc?.title?.vi || doc?.title?.en || page.label}
          </span>
        </span>
        <span className="absolute top-3 right-3">
          {!doc ? (
            <Badge tone="amber">Chưa có nội dung</Badge>
          ) : doc.isActive === false ? (
            <Badge>Đang ẩn</Badge>
          ) : (
            <Badge tone="green">Đang hiện</Badge>
          )}
        </span>
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col p-5", wide && "md:justify-center md:p-7")}>
        <p
          className={cn(
            "font-bold text-slate-900 group-hover:text-brand-700",
            wide && "md:text-xl",
          )}
        >
          {page.label}
        </p>
        <p
          className={cn(
            "mt-1 text-sm leading-relaxed text-slate-500",
            wide ? "md:max-w-xl md:text-[15px]" : "flex-1",
          )}
        >
          {wide
            ? "Đầu trang, câu chuyện và 4 ảnh, tầm nhìn – sứ mệnh, giá trị cốt lõi, lý do chọn Vietlook, video và những con số."
            : page.text}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {LANGS.map((l) => (
            <span
              key={l.key}
              title={
                filled[l.key]
                  ? `Đã có bản ${l.label}`
                  : `Chưa có bản ${l.label} — website hiện bản tiếng Anh`
              }
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                filled[l.key] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400",
              )}
            >
              {filled[l.key] && <Check className="size-3" />}
              {l.short}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
            <PencilLine className="size-3.5" />
            Sửa trang
          </span>
        </div>
        {doc?.updatedAt && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
            Cập nhật {fmtDateTime(doc.updatedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}

/* =========================================================================
 * Sửa 1 trang
 * ========================================================================= */

function PageEditor({ page }) {
  const isAbout = page.key === "about";
  const [state, setState] = useState({ loading: true, error: "", doc: null });

  useEffect(() => {
    let alive = true;
    // Tải cả 5 trang (menu chính sách cần tên + ảnh các trang khác); trang chưa từng lưu → bắt đầu từ trang trống
    Promise.all([api("/settings/pages"), isAbout ? loadAboutDefaults() : null])
      .then(([r, defaults]) => {
        if (!alive) return;
        const all = r.data ?? [];
        const doc = fromDoc(
          all.find((x) => x.key === page.key),
          isAbout,
          defaults,
        );
        setState({ loading: false, error: "", doc, all, defaults });
      })
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err), doc: null }));
    return () => {
      alive = false;
    };
  }, [page.key, isAbout]);

  if (state.loading) return <LoadingBlock text="Đang tải nội dung…" />;
  if (!state.doc)
    return (
      <>
        <PageHeader title={page.label} back={<BackLink />} />
        <Notice tone="error">{state.error}</Notice>
      </>
    );
  return <PageCanvas page={page} initial={state.doc} all={state.all} defaults={state.defaults} />;
}

function BackLink({ onClick }) {
  return (
    <Link
      href={BASE}
      onClick={onClick}
      className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
    >
      <ArrowLeft className="size-3.5" />
      Giới thiệu & chính sách
    </Link>
  );
}

function PageCanvas({ page, initial, all = [], defaults }) {
  const isAbout = page.key === "about";
  const router = useRouter();
  const { toast, confirm } = useUi();
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [lang, setLang] = useState("en");
  const [seoOpen, setSeoOpen] = useState(false);
  const { run, busy } = useMutation(TAGS);
  const set = useCallback((patch) => setD((x) => ({ ...x, ...patch })), []);
  const setData = useCallback(
    (patch) => setD((x) => ({ ...x, data: { ...x.data, ...patch } })),
    [],
  );

  const dirty = useMemo(
    () => JSON.stringify(toPayload(d, isAbout)) !== JSON.stringify(toPayload(saved, isAbout)),
    [d, saved, isAbout],
  );
  useUnsavedGuard(dirty);

  const save = useCallback(async () => {
    if (!d.title.en.trim()) {
      setLang("en");
      return toast("Vui lòng nhập tiêu đề trang bằng tiếng Anh trước khi lưu", "error");
    }
    const r = await run(
      () => api(`/settings/pages/${page.key}`, { method: "PUT", body: toPayload(d, isAbout) }),
      `Đã lưu trang ${page.label}`,
    );
    if (!r?.data) return;
    const next = fromDoc(r.data, isAbout, defaults);
    setSaved(next);
    setD(next);
  }, [d, isAbout, defaults, page, run, toast]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  /** Rời sang trang khác trong mục này: còn thay đổi chưa lưu thì hỏi lại */
  const leaveTo = (to) => async (e) => {
    if (!dirty) return;
    e.preventDefault();
    const ok = await confirm({
      title: "Rời trang mà chưa lưu?",
      message: "Những gì bạn vừa sửa chưa được lưu và sẽ bị mất nếu rời trang.",
      confirmText: "Rời trang",
      cancelText: "Ở lại",
      danger: true,
    });
    if (ok) {
      setD(saved);
      router.push(to);
    }
  };
  const goBack = leaveTo(BASE);

  // Trang chính sách: menu 4 chính sách + ảnh ghép đầu trang lấy từ các trang chính sách khác (như website)
  const policies = PAGES.filter((p) => p.key !== "about").map((p) => {
    const other = all.find((x) => x.key === p.key);
    const active = p.key === page.key;
    const title = active ? d.title : other?.title;
    const href = `${BASE}?key=${p.key}`;
    return {
      key: p.key,
      href,
      icon: p.icon,
      active,
      title: title?.[lang] || title?.en || p.label,
      image: active ? "" : (other?.image ?? ""),
      onClick: leaveTo(href),
    };
  });

  const discard = async () => {
    const ok = await confirm({
      title: "Bỏ các thay đổi?",
      message: "Trang sẽ trở về như lần lưu gần nhất.",
      confirmText: "Bỏ thay đổi",
      cancelText: "Sửa tiếp",
      danger: true,
    });
    if (ok) setD(saved);
  };

  const viewUrl = `${lang === "en" ? "" : `/${lang}`}${page.url}`;

  return (
    <div className="w-full">
      <BackLink onClick={goBack} />
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
        {page.label}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
        Bấm vào dòng chữ bất kỳ bên dưới để sửa.
        {saved.updatedAt && ` Lưu lần cuối ${fmtDateTime(saved.updatedAt)}.`}
      </p>

      {/* Thanh chọn ngôn ngữ + bật/tắt hiển thị: luôn nằm trên cùng khi cuộn */}
      <div className="sticky top-16 z-30 -mx-2 mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-slate-50/90 px-2 py-2.5 backdrop-blur lg:top-0">
        <Toggle
          checked={d.isActive}
          onChange={(isActive) => set({ isActive })}
          label="Hiện trên website"
          hint={d.isActive ? "Khách xem được trang này" : "Trang đang ẩn với khách"}
        />
        {/* Dịch tự động nằm ngay bên trái các tab ngôn ngữ, cùng hàng, cùng chiều cao */}
        <div className="flex max-w-full items-center gap-2">
          <AutoTranslate
            lang={lang}
            value={d}
            onChange={setD}
            className="h-9 rounded-full px-3 sm:px-3.5"
          />
          <LangTabs value={lang} onChange={setLang} filled={filledOf(d.title)} />
        </div>
      </div>

      <div className="mt-3">
        <MiniSite name={page.label}>
          <MiniHero
            d={d}
            lang={lang}
            set={set}
            fallbackImage={isAbout ? ABOUT_HERO_IMAGES[0] : ""}
            extraImages={isAbout ? ABOUT_HERO_IMAGES.slice(1) : policies.map((p) => p.image)}
          />
          {isAbout ? (
            <AboutBody data={d.data} lang={lang} setData={setData} />
          ) : (
            <PolicyBody d={d} lang={lang} set={set} menu={policies} />
          )}
        </MiniSite>
      </div>

      {/* Hiển thị trên Google: thu gọn sẵn */}
      <section className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
        <button
          type="button"
          aria-expanded={seoOpen}
          onClick={() => setSeoOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 sm:px-5"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Search className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-slate-900">Hiển thị trên Google</span>
            <span className="block text-xs leading-relaxed text-slate-500">
              Tiêu đề và mô tả khách nhìn thấy khi tìm ra trang này. Không bắt buộc.
            </span>
          </span>
          <ChevronDown
            className={cn("size-5 shrink-0 text-slate-400 transition", seoOpen && "rotate-180")}
          />
        </button>
        {seoOpen && (
          <div className="border-t border-slate-100 p-4 sm:p-5">
            <SeoFields
              value={d.seo}
              onChange={(seo) => set({ seo })}
              lang={lang}
              fallbackTitle={d.title[lang] || d.title.en}
              fallbackDescription={d.subtitle[lang] || d.subtitle.en}
              path={page.url.slice(1)}
            />
          </div>
        )}
      </section>

      {/* Thanh lưu */}
      <div className="sticky bottom-0 z-30 mt-6 -mb-2 pb-2">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/95 px-3 py-2.5 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 backdrop-blur sm:gap-3 sm:px-5 sm:py-3">
          <p
            className={cn(
              "flex min-w-0 items-center gap-2 text-sm",
              dirty ? "font-semibold text-amber-700" : "text-slate-500",
            )}
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                dirty ? "bg-amber-500" : "bg-emerald-500",
              )}
            />
            <span className="truncate">{dirty ? "Chưa lưu" : "Đã lưu"}</span>
          </p>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Xem trên website"
              title={dirty ? "Website đang hiện bản đã lưu gần nhất" : undefined}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">Xem trên website</span>
            </a>
            {dirty && (
              <Button variant="ghost" className="px-3" onClick={discard}>
                Bỏ<span className="hidden sm:inline"> thay đổi</span>
              </Button>
            )}
            <Button
              icon={Save}
              className="px-4 sm:px-5"
              onClick={save}
              loading={busy}
              disabled={!dirty}
            >
              Lưu<span className="hidden sm:inline"> thay đổi</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
