"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/admin/Link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ExternalLink, Save, Search } from "lucide-react";
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
import { AutoTranslate, useAutoFill } from "./translate";
import { SeoFields } from "./ArticleEditor";
import { AboutBody, MiniHero, MiniSite, PolicyBody } from "./pages/canvas";
import {
  Button,
  LangTabs,
  LoadingBlock,
  Notice,
  PageHeader,
  DEFAULT_LANG,
  Toggle,
  anyLang,
  filledOf,
  fmtDateTime,
  useUi,
  useUnsavedGuard,
} from "./ui";
import { usePendingImages } from "./pendingImages";
import { ReadOnlyArea, usePermission } from "./permissions";
import { pageCopyOf } from "@/lib/page-copy/registry.mjs";
import { CONTENT_PAGES } from "./pages/list";
import PageCopyEditor from "./page-copy/PageCopyEditor";
import PagesHub from "./page-copy/PagesHub";

const TAGS = ["pages"];
const BASE = `${ADMIN_BASE}/pages`;

const PAGES = CONTENT_PAGES;
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
  const count = (path) =>
    api(path)
      .then((r) => r.data?.length ?? null)
      .catch(() => null);
  const [en, zh, vi, tourCount, postCount] = await Promise.all([
    import("@/i18n/dictionaries/en"),
    import("@/i18n/dictionaries/zh"),
    import("@/i18n/dictionaries/vi"),
    count("/public/tours"),
    count("/public/articles"),
  ]);
  const dict = Object.fromEntries(LANG_KEYS.map((l, i) => [l, [en, zh, vi][i].default]));
  // số liệu mặc định = số website tự tính từ dữ liệu CMS (giống trang Giới thiệu): số tour, số bài cẩm nang
  const liveValues = [
    undefined,
    tourCount != null ? `${tourCount}+` : undefined,
    postCount != null ? String(postCount) : undefined,
  ];
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
      value: liveValues[i] ?? s.value,
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

/**
 * CMS → Giao diện trang (/admin/pages):
 *   ?key=about | terms | privacy | payment | cancellation → trình sửa trang giới thiệu / chính sách (bên dưới)
 *   ?key=<khoá trong lib/page-copy/registry.mjs>           → PageCopyEditor (Thuê xe, Visa…)
 *   không có key                                             → danh sách mọi trang (PagesHub)
 */
export default function ContentPagesPage() {
  const params = useSearchParams();
  const key = params.get("key");
  if (pageOf(key)) return <PageEditor key={key} page={pageOf(key)} />;
  const copy = pageCopyOf(key);
  if (copy) return <PageCopyEditor key={key} pageKey={key} entry={copy} />;
  return <PagesHub />;
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
      Giao diện trang
    </Link>
  );
}

function PageCanvas({ page, initial, all = [], defaults }) {
  const isAbout = page.key === "about";
  const router = useRouter();
  const { toast, confirm } = useUi();
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [seoOpen, setSeoOpen] = useState(false);
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const images = usePendingImages(d);
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
  const { canEdit } = usePermission("pages"); // chỉ xem → bản xem trước chỉ đọc, không có nút Lưu

  const save = useCallback(async () => {
    if (!canEdit) return;
    if (!anyLang(d.title))
      return toast.error("Vui lòng nhập tiêu đề trang ở ít nhất một ngôn ngữ.", {
        title: "Chưa lưu được",
      });
    // ảnh vừa chọn (ảnh đầu trang, ảnh ghép, ảnh trong nội dung) chỉ được lưu vào kho ảnh lúc này
    const base = await images.prepare(d);
    if (!base) return;
    // ngôn ngữ còn trống → tự dịch từ ngôn ngữ đã viết rồi mới lưu
    const { value: v, failed } = await autoFill.fill(base, { lang });
    if (v !== d) setD(v);
    const url = `/settings/pages/${page.key}`;
    const r = await run(
      () => api(url, { method: "PUT", body: toPayload(v, isAbout) }),
      `Đã lưu trang ${page.label}`,
    );
    if (!r?.data) return;
    const next = fromDoc(r.data, isAbout, defaults);
    setSaved(next);
    setD(next);
    if (failed)
      autoFill.offerRetry(async (t) => {
        const r2 = await api(url, { method: "PUT", body: toPayload(t, isAbout) });
        const again = fromDoc(r2.data, isAbout, defaults);
        setSaved(again);
        setD(again);
      });
  }, [d, isAbout, defaults, page, run, toast, canEdit, autoFill, lang, images]);

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
      title: "Rời trang khi chưa lưu?",
      message: "Nội dung bạn đang soạn chưa được lưu và sẽ mất nếu rời trang này.",
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

  // Trang chính sách: menu 4 chính sách; chưa chọn ảnh đầu trang thì website mượn ảnh của chính sách khác
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
      title: anyLang(title, lang) || p.label,
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
        {canEdit ? "Bấm vào dòng chữ bất kỳ bên dưới để sửa." : "Bạn đang ở chế độ chỉ xem."}
        {saved.updatedAt && ` Lưu lần cuối ${fmtDateTime(saved.updatedAt)}.`}
      </p>

      {/* Thanh chọn ngôn ngữ + bật/tắt hiển thị: khi cuộn nổi cách mép trên 12px (điện thoại: dưới thanh tiêu đề
          64px + 8px), bo tròn đủ 4 góc, nền trắng đặc + viền mảnh + bóng nhẹ → như 1 thanh công cụ nổi, không dính sát mép */}
      <div className="sticky z-30 -mx-3 mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-white/95 px-4 py-2.5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/80 backdrop-blur max-lg:top-[4.5rem] lg:top-3">
        <Toggle
          checked={d.isActive}
          onChange={(isActive) => set({ isActive })}
          disabled={!canEdit}
          label="Hiện trên website"
          hint={d.isActive ? "Khách xem được trang này" : "Trang đang ẩn với khách"}
        />
        {/* Dịch tự động nằm ngay bên trái các tab ngôn ngữ, cùng hàng, cùng chiều cao */}
        <div className="flex max-w-full items-center gap-2">
          {canEdit && (
            <AutoTranslate
              lang={lang}
              value={d}
              onChange={setD}
              className="h-9 rounded-full px-3 sm:px-3.5"
            />
          )}
          <LangTabs value={lang} onChange={setLang} filled={filledOf(d.title)} />
        </div>
      </div>

      <ReadOnlyArea readOnly={!canEdit} notice={false}>
        <div className="mt-3">
          <MiniSite name={page.label}>
            <MiniHero
              d={d}
              lang={lang}
              set={set}
              fallbackImage={
                isAbout ? ABOUT_HERO_IMAGES[0] : (policies.find((p) => p.image)?.image ?? "")
              }
              extraImages={isAbout && !d.image ? ABOUT_HERO_IMAGES.slice(1) : []}
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
              <span className="block text-[15px] font-bold text-slate-900">
                Hiển thị trên Google
              </span>
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
                fallbackTitle={anyLang(d.title, lang)}
                fallbackDescription={anyLang(d.subtitle, lang)}
                path={page.url.slice(1)}
              />
            </div>
          )}
        </section>
      </ReadOnlyArea>

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
            {dirty && canEdit && (
              <Button variant="ghost" className="px-3" onClick={discard}>
                <span>
                  Bỏ<span className="hidden sm:inline"> thay đổi</span>
                </span>
              </Button>
            )}
            {canEdit && (
              <Button
                icon={Save}
                className="px-4 sm:px-5"
                onClick={save}
                loading={busy || autoFill.busy || images.busy}
                disabled={!dirty}
              >
                {images.label || (
                  <span>
                    Lưu<span className="hidden sm:inline"> thay đổi</span>
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
