"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { siteConfig } from "@/constants/site";
import {
  ABOUT_COLLAGE,
  ABOUT_HERO_IMAGES,
  ABOUT_MISSION_TITLE,
  ABOUT_VISION_TITLE,
} from "@/data/about";
import { useMutation } from "./hooks";
import { useAutoFill } from "./translate";
import { SeoCard } from "./SeoFields";
import { MiniHero, MiniSite } from "./pages/canvas";
import { AboutBody } from "./pages/about";
import { PolicyBody } from "./pages/policy";
import {
  LoadingBlock,
  Notice,
  PageHeader,
  DEFAULT_LANG,
  Toggle,
  anyLang,
  filledOf,
  useUi,
  useUnsavedGuard,
} from "./ui";
import { usePendingImages } from "./pendingImages";
import { ReadOnlyArea, usePermission } from "./permissions";
import { pageCopyOf } from "@/lib/page-copy/registry.mjs";
import { CONTENT_PAGES } from "./pages/list";
import PageCopyEditor from "./page-copy/PageCopyEditor";
import PagesHub from "./page-copy/PagesHub";
import {
  BackLink,
  EditorHeader,
  HistoryButton,
  LangTools,
  QuickHelp,
  RELOAD,
  SaveBar,
  ViewLiveLink,
  useConflictSave,
  useSaveShortcut,
} from "./page-copy/chrome";
import HistoryDrawer, { diffParts } from "./page-copy/HistoryDrawer";
import JumpMenu from "./page-copy/JumpMenu";

const TAGS = ["pages"];
const ABOUT_HERO_IMAGES_REST = ABOUT_HERO_IMAGES.slice(1);
const NO_IMAGES = [];
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
  const [nonce, setNonce] = useState(0);

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
  }, [page.key, isAbout, nonce]);
  // "Tải lại bản mới" (có người khác vừa lưu): tải lại từ máy chủ, dựng lại trình sửa
  const reload = useCallback(() => {
    setState({ loading: true, error: "", doc: null });
    setNonce((n) => n + 1);
  }, []);

  if (state.loading) return <LoadingBlock text="Đang tải nội dung…" />;
  if (!state.doc)
    return (
      <>
        <PageHeader title={page.label} back={<BackLink />} />
        <Notice tone="error">{state.error}</Notice>
      </>
    );
  return (
    <PageCanvas
      key={nonce}
      page={page}
      initial={state.doc}
      all={state.all}
      defaults={state.defaults}
      onReload={reload}
    />
  );
}

/** Các phần của trang để báo bản cũ trong Lịch sử khác bản đang lưu ở đâu */
const PAGE_PARTS = [
  ["Tiêu đề trang", (x) => x.title],
  ["Dòng giới thiệu", (x) => x.subtitle],
  ["Ảnh đầu trang", (x) => x.image],
  ["Nội dung", (x) => x.body],
  ["Các khối của trang", (x) => x.data],
  ["Hiển thị trên Google", (x) => x.seo],
  ["Hiện / ẩn trên website", (x) => x.isActive],
];

function PageCanvas({ page, initial, all = [], defaults, onReload }) {
  const isAbout = page.key === "about";
  const router = useRouter();
  const { toast, confirm } = useUi();
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const images = usePendingImages(d);
  const guarded = useConflictSave();
  const set = useCallback((patch) => setD((x) => ({ ...x, ...patch })), []);
  const setData = useCallback(
    (patch) => setD((x) => ({ ...x, data: { ...x.data, ...patch } })),
    [],
  );

  // so sánh "Chưa lưu" chạy sau phím vừa gõ (không làm chậm lúc gõ)
  const settled = useDeferredValue(d);
  const savedJson = useMemo(() => JSON.stringify(toPayload(saved, isAbout)), [saved, isAbout]);
  const dirty = useMemo(
    () => JSON.stringify(toPayload(settled, isAbout)) !== savedJson,
    [settled, savedJson, isAbout],
  );
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
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
    const put = (x, at) =>
      api(url, {
        method: "PUT",
        body: { ...toPayload(x, isAbout), ...(at && { baseUpdatedAt: at }) },
      });
    const r = await run(() => guarded((at) => put(v, at), saved.updatedAt));
    if (r === RELOAD) return onReload();
    if (!r?.data) return;
    toast(`Đã lưu trang ${page.label}`);
    const next = fromDoc(r.data, isAbout, defaults);
    setSaved(next);
    setD(next);
    if (failed)
      autoFill.offerRetry(async (t) => {
        const r2 = await put(t, next.updatedAt);
        const again = fromDoc(r2.data, isAbout, defaults);
        setSaved(again);
        setD(again);
      });
  }, [
    d,
    saved.updatedAt,
    isAbout,
    defaults,
    page,
    run,
    guarded,
    onReload,
    toast,
    canEdit,
    autoFill,
    lang,
    images,
  ]);

  useSaveShortcut(save, canEdit);

  /** Rời sang trang khác trong mục này: còn thay đổi chưa lưu thì hỏi lại */
  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  const leaveTo = useCallback(
    (to) => async (e) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      const ok = await confirm({
        title: "Rời trang khi chưa lưu?",
        message: "Nội dung bạn đang soạn chưa được lưu và sẽ mất nếu rời trang này.",
        confirmText: "Rời trang",
        cancelText: "Ở lại",
        danger: true,
      });
      if (ok) {
        setD(savedRef.current);
        router.push(to);
      }
    },
    [confirm, router],
  );
  const goBack = leaveTo(BASE);

  // Trang chính sách: menu 4 chính sách (xếp theo thứ tự website dùng: theo mã trang A→Z); chưa chọn ảnh đầu
  // trang thì website mượn ảnh của chính sách khác (chính sách đầu tiên trong menu có ảnh)
  const policies = useMemo(
    () =>
      PAGES.filter((p) => p.key !== "about")
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((p) => {
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
            // trang đang ẩn với khách thì menu chính sách trên website không có trang đó
            hidden: !active && other?.isActive === false,
            onClick: leaveTo(href),
          };
        }),
    [all, page.key, d.title, lang, leaveTo],
  );

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

  // Lịch sử: bản cũ khác bản đang lưu ở phần nào; dùng lại bản cũ → nạp vào trình sửa
  const describe = useCallback(
    (rev) =>
      diffParts(
        PAGE_PARTS,
        toPayload(fromDoc(rev, isAbout, defaults), isAbout),
        toPayload(saved, isAbout),
      ),
    [saved, isAbout, defaults],
  );
  const onRestored = useCallback(
    (doc) => {
      const next = fromDoc(doc, isAbout, defaults);
      setSaved(next);
      setD(next);
    },
    [isAbout, defaults],
  );

  const viewUrl = `${lang === "en" ? "" : `/${lang}`}${page.url}`;
  const langTools = (
    <LangTools
      lang={lang}
      onLang={setLang}
      filled={filledOf(d.title)}
      canEdit={canEdit}
      value={d}
      onTranslate={setD}
    />
  );

  return (
    <div className="w-full">
      <EditorHeader
        title={page.label}
        readOnly={!canEdit}
        intro="Bản xem trước giống trang trên website. Bấm vào chữ để sửa, bấm vào ảnh để đổi ảnh, rồi bấm Lưu. Phần có biểu tượng ⚡ lấy từ mục khác — rê chuột để xem sửa ở đâu."
        updatedAt={saved.updatedAt}
        onBack={goBack}
        actions={
          <>
            {/* Bật / tắt hiển thị: thẻ nhỏ cạnh nút xem trang thật (cùng hàng tiêu đề, như Giao diện trang) */}
            <div className="flex h-11 items-center rounded-xl bg-white px-3 ring-1 ring-slate-200">
              <Toggle
                checked={d.isActive}
                onChange={(isActive) => set({ isActive })}
                disabled={!canEdit}
                label="Hiện trên website"
                hint={d.isActive ? "Khách xem được trang này" : "Trang đang ẩn với khách"}
              />
            </div>
            <ViewLiveLink href={viewUrl} dirty={dirty} className="h-11" />
          </>
        }
      />

      <ReadOnlyArea readOnly={!canEdit} notice={false}>
        <MiniSite
          name={page.label}
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
          <div data-jump="Đầu trang">
            <MiniHero
              title={d.title}
              subtitle={d.subtitle}
              image={d.image}
              lang={lang}
              set={set}
              fallbackImage={
                isAbout
                  ? ABOUT_HERO_IMAGES[0]
                  : (policies.find((p) => p.image && !p.hidden)?.image ?? "")
              }
              extraImages={isAbout && !d.image ? ABOUT_HERO_IMAGES_REST : NO_IMAGES}
            />
          </div>
          {isAbout ? (
            <AboutBody data={d.data} lang={lang} setData={setData} />
          ) : (
            <PolicyBody body={d.body} lang={lang} set={set} menu={policies} />
          )}
        </MiniSite>

        {/* Hiển thị trên Google: thu gọn sẵn */}
        <SeoCard
          value={d.seo}
          onChange={(seo) => set({ seo })}
          lang={lang}
          fallbackTitle={anyLang(d.title, lang)}
          fallbackDescription={anyLang(d.subtitle, lang)}
          path={page.url.slice(1)}
        />
      </ReadOnlyArea>

      {/* Thanh lưu: cùng kiểu với Giao diện trang */}
      {canEdit && (
        <SaveBar
          tools={langTools}
          dirty={dirty}
          note={d.isActive ? "· Trang đang hiện trên website" : "· Trang đang ẩn với khách"}
          onDiscard={discard}
          onSave={save}
          busy={busy}
          saving={busy || autoFill.busy || images.busy}
          saveLabel={images.label}
        />
      )}

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        contentKey={page.key}
        title={page.label}
        describe={describe}
        onRestored={onRestored}
        dirty={dirty}
        canRestore={canEdit}
        tags={TAGS}
      />
    </div>
  );
}
