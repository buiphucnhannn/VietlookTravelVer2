"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { fillReviewStats, normalizeReviewStats } from "@/lib/review-stats";
import {
  countEdited,
  fillPage,
  pageDefaults,
  resolvePage,
  stripPage,
} from "@/lib/page-copy/resolve.mjs";
import { pageCopyOf } from "@/lib/page-copy/registry.mjs";
import { ACCESS_LAYERED, withAccessCopy } from "@/lib/page-copy/access.mjs";
import { loadDataSources } from "@/lib/page-copy/sources";
import { useMutation } from "../hooks";
import { useAutoFill } from "../translate";
import { DEFAULT_LANG, LoadingBlock, Notice, useUi, useUnsavedGuard } from "../ui";
import { usePendingImages } from "../pendingImages";
import { ReadOnlyArea, usePermission } from "../permissions";
import { SeoCard, normalizeSeo } from "../SeoFields";
import { PageCopyContext, createCopyStore } from "./blocks";
import {
  BackLink,
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
} from "./chrome";
import HistoryDrawer, { diffParts } from "./HistoryDrawer";
import JumpMenu from "./JumpMenu";
import { PREVIEWS } from "./previews";

export { HUB };
const ALL_FILLED = { en: true, zh: true, vi: true }; // ô nào cũng có chữ (mặc định) ở cả 3 ngôn ngữ

/**
 * Nội dung mặc định của trang theo 3 ngôn ngữ (đúng như website đang hiện khi chưa ai sửa):
 * từ điển giao diện (đã điền điểm & số lượt đánh giá đang dùng) + file dữ liệu + ảnh có sẵn.
 * Trang Tour nhóm: ô dải "không rào cản" chưa sửa đi theo khối chung (khoá "access") — giống website.
 */
async function loadDefaults(pageKey, entry) {
  const layered = ACCESS_LAYERED.includes(pageKey);
  const [en, zh, vi, site, data, accessDoc] = await Promise.all([
    import("@/i18n/dictionaries/en"),
    import("@/i18n/dictionaries/zh"),
    import("@/i18n/dictionaries/vi"),
    api("/public/site").catch(() => null),
    loadDataSources(entry),
    layered ? api("/settings/page-copy/access").catch(() => null) : null,
  ]);
  const stats = normalizeReviewStats(site?.data?.reviewStats);
  const dicts = { en: en.default, zh: zh.default, vi: vi.default };
  return Object.fromEntries(
    Object.entries(dicts).map(([l, d]) => {
      let dict = fillReviewStats(d, stats, l);
      if (layered)
        dict = withAccessCopy(
          dict,
          resolvePage(pageCopyOf("access"), accessDoc?.data?.data, { dict }, l),
        );
      return [l, pageDefaults(entry, { dict, data }, l)];
    }),
  );
}

/** Sửa 1 trang: tải bản đã lưu + nội dung mặc định rồi mở bản xem trước */
export default function PageCopyEditor({ pageKey, entry }) {
  const [state, setState] = useState({ loading: true, error: "" });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.all([api(`/settings/page-copy/${pageKey}`), loadDefaults(pageKey, entry)])
      .then(([r, defs]) => alive && setState({ loading: false, doc: r.data ?? {}, defs }))
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err) }));
    return () => {
      alive = false;
    };
  }, [pageKey, entry, nonce]);
  const reload = useCallback(() => {
    setState({ loading: true, error: "" });
    setNonce((n) => n + 1);
  }, []);

  if (state.loading) return <LoadingBlock text="Đang tải nội dung trang…" />;
  if (state.error)
    return (
      <>
        <BackLink />
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">{entry.name}</h1>
        <Notice tone="error">
          {state.error}{" "}
          <button type="button" onClick={reload} className="font-semibold underline">
            Thử lại
          </button>
        </Notice>
      </>
    );
  return (
    <Editor
      key={nonce}
      pageKey={pageKey}
      entry={entry}
      doc={state.doc}
      defs={state.defs}
      onReload={reload}
    />
  );
}

/** Câu website dùng làm tiêu đề / mô tả trên Google khi chưa nhập (ô đầu trang có trong trang đó) */
const firstText = (data, keys, lang) => {
  for (const k of keys) {
    const v = data?.[k]?.[lang];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};
const SEO_TITLE_KEYS = ["heroTitle", "title", "heroEyebrow"];
const SEO_DESC_KEYS = ["heroIntro", "heroText", "intro", "heroSubtitle", "subtitle"];

/** Phần "Hiển thị trên Google" gửi lên: trống hết → không gửi */
const seoBody = (seo) => {
  const s = normalizeSeo(seo, { trim: true });
  return Object.values(s).some((x) => x.title || x.description) ? s : undefined;
};

function Editor({ pageKey, entry, doc, defs, onReload }) {
  const router = useRouter();
  const { confirm, toast } = useUi();
  const { canEdit } = usePermission("pages"); // chỉ xem → bản xem trước chỉ đọc, không có thanh Lưu
  const hasSeo = entry.seo === true; // trang có đường dẫn riêng → sửa được phần Google
  // dữ liệu đang soạn nằm trong kho riêng: gõ chữ chỉ vẽ lại đúng ô đang gõ (blocks.js → createCopyStore)
  const [store] = useState(() => createCopyStore(fillPage(entry, doc.data, defs)));
  const data = useSyncExternalStore(store.subscribe, store.get, store.get);
  // phần so sánh / đếm để báo "Chưa lưu" chạy sau phím vừa gõ (không làm chậm lúc gõ)
  const settled = useDeferredValue(data);
  const [seo, setSeo] = useState(() => normalizeSeo(doc.data?.seo));
  const withSeo = useCallback(
    (body, s) => (hasSeo && seoBody(s) ? { ...body, seo: seoBody(s) } : body),
    [hasSeo],
  );
  const [savedBody, setSavedBody] = useState(() =>
    JSON.stringify(withSeo(stripPage(entry, fillPage(entry, doc.data, defs), defs), doc.data?.seo)),
  );
  const [updatedAt, setUpdatedAt] = useState(doc.updatedAt);
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [historyOpen, setHistoryOpen] = useState(false);
  const tags = useMemo(() => ["pages", `page:${pageKey}`], [pageKey]);
  const { run, busy } = useMutation(tags);
  const autoFill = useAutoFill();
  const images = usePendingImages(data);
  const guarded = useConflictSave();

  // bản sẽ lưu: chỉ các ô khác mặc định (dùng cho Lưu, Dịch tự động, đếm số ô đã sửa)
  const body = useMemo(
    () => withSeo(stripPage(entry, settled, defs), seo),
    [entry, settled, defs, seo, withSeo],
  );
  const dirty = JSON.stringify(body) !== savedBody;
  const edited = countEdited(entry, body);
  useUnsavedGuard(dirty);

  /** Bản đã lưu (data của máy chủ) → nạp vào trình sửa */
  const apply = useCallback(
    (saved) => {
      const next = fillPage(entry, saved, defs);
      store.set(next);
      setSeo(normalizeSeo(saved?.seo));
      setSavedBody(JSON.stringify(withSeo(stripPage(entry, next, defs), saved?.seo)));
    },
    [entry, defs, store, withSeo],
  );

  const save = useCallback(async () => {
    // đọc thẳng từ kho (chữ vừa gõ có thể chưa kịp vào phần so sánh chạy sau)
    const current = withSeo(stripPage(entry, store.get(), defs), seo);
    if (!canEdit || JSON.stringify(current) === savedBody) return;
    // ảnh vừa chọn chỉ được tải lên kho ảnh lúc bấm Lưu
    const withImages = await images.prepare(current);
    if (!withImages) return;
    // ô đã sửa ở 1 ngôn ngữ → tự dịch sang 2 ngôn ngữ còn lại rồi mới lưu
    const { value, failed } = await autoFill.fill(withImages, { lang });
    const url = `/settings/page-copy/${pageKey}`;
    const put = (d, base) =>
      api(url, { method: "PUT", body: { data: d, ...(base && { baseUpdatedAt: base }) } });
    const r = await run(() => guarded((base) => put(value, base), updatedAt));
    if (r === RELOAD) return onReload();
    if (!r?.data) return;
    toast(`Đã lưu trang ${entry.name}`);
    apply(r.data.data);
    setUpdatedAt(r.data.updatedAt);
    if (failed)
      autoFill.offerRetry(async (t) => {
        const r2 = await put(t, r.data.updatedAt);
        apply(r2.data.data);
        setUpdatedAt(r2.data.updatedAt);
      });
  }, [
    canEdit,
    savedBody,
    store,
    entry,
    defs,
    seo,
    withSeo,
    images,
    autoFill,
    lang,
    pageKey,
    run,
    guarded,
    updatedAt,
    onReload,
    apply,
    toast,
  ]);

  useSaveShortcut(save, canEdit);

  const discard = async () => {
    const ok = await confirm({
      title: "Bỏ các thay đổi chưa lưu?",
      message: "Trang sẽ trở lại như lần lưu gần nhất.",
      confirmText: "Bỏ thay đổi",
      cancelText: "Sửa tiếp",
      danger: true,
    });
    if (ok) apply(JSON.parse(savedBody));
  };

  const resetAll = async () => {
    const ok = await confirm({
      title: "Đưa cả trang về nội dung mặc định?",
      message:
        "Mọi chữ và ảnh đã sửa trên trang này (cả 3 ngôn ngữ) sẽ trở về như ban đầu. Bạn vẫn có thể bấm “Bỏ thay đổi” trước khi lưu.",
      confirmText: "Về mặc định",
      cancelText: "Thôi",
      danger: true,
    });
    if (ok) store.set(fillPage(entry, {}, defs));
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
      apply(JSON.parse(savedBody));
      router.push(HUB);
    }
  };

  // Lịch sử: bản cũ khác bản đang lưu ở những ô nào
  const describe = useCallback(
    (rev) => {
      const saved = JSON.parse(savedBody);
      const old = withSeo(stripPage(entry, fillPage(entry, rev, defs), defs), rev?.seo);
      return diffParts(
        [
          ...Object.entries(entry.fields).map(([k, spec]) => [spec.label, (x) => x[k]]),
          ["Khối ẩn / hiện", (x) => x.hidden],
          ["Hiển thị trên Google", (x) => x.seo],
        ],
        old,
        saved,
      );
    },
    [savedBody, entry, defs, withSeo],
  );
  const onRestored = useCallback(
    (r) => {
      apply(r.data);
      setUpdatedAt(r.updatedAt);
    },
    [apply],
  );

  const ctx = useMemo(() => ({ entry, store, defs, lang }), [entry, store, defs, lang]);
  const Preview = PREVIEWS[pageKey];
  // bản xem trước chỉ dựng lại khi đổi ngôn ngữ — gõ chữ không vẽ lại cả trang (mỗi ô tự theo dõi giá trị của nó)
  const preview = useMemo(
    () =>
      Preview ? (
        <Preview lang={lang} />
      ) : (
        <p className="p-10 text-center text-sm text-slate-500">Trang này chưa có bản xem trước.</p>
      ),
    [Preview, lang],
  );
  const viewUrl = `${lang === "en" ? "" : `/${lang}`}${entry.path}`;

  const langTools = (
    <LangTools
      lang={lang}
      onLang={setLang}
      filled={ALL_FILLED}
      canEdit={canEdit}
      value={body}
      onTranslate={(next) => {
        store.set(fillPage(entry, next, defs));
        if (next?.seo) setSeo(normalizeSeo(next.seo));
      }}
    />
  );

  return (
    <PageCopyContext.Provider value={ctx}>
      <EditorHeader
        title={entry.name}
        readOnly={!canEdit}
        intro="Bản xem trước giống hệt trang trên website (thu nhỏ vừa khung). Bấm vào chữ để sửa, bấm vào ảnh để đổi ảnh, rồi bấm Lưu. Phần có biểu tượng ⚡ lấy từ mục khác — rê chuột để xem sửa ở đâu."
        updatedAt={updatedAt}
        onBack={goBack}
        actions={
          <>
            <ViewLiveLink href={viewUrl} dirty={dirty} />
            {canEdit && edited > 0 && <ResetAllButton onClick={resetAll} />}
          </>
        }
      />

      {/* ----- Khung "trang web thu nhỏ" ----- */}
      <ReadOnlyArea readOnly={!canEdit}>
        <EditorFrame
          name={entry.name}
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
          {preview}
        </EditorFrame>
      </ReadOnlyArea>

      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-xs text-slate-500">
        <span className="inline-block size-2.5 rounded-full bg-amber-400" aria-hidden /> Ô đã sửa so
        với mặc định. Xoá trống một ô = dùng lại nội dung mặc định của website.
      </p>

      {hasSeo && (
        <ReadOnlyArea readOnly={!canEdit} notice={false}>
          <SeoCard
            value={seo}
            onChange={setSeo}
            lang={lang}
            fallbackTitle={firstText(settled, SEO_TITLE_KEYS, lang) || entry.name}
            fallbackDescription={firstText(settled, SEO_DESC_KEYS, lang)}
            path={entry.path.slice(1)}
          />
        </ReadOnlyArea>
      )}

      {/* ----- Thanh lưu ----- */}
      {canEdit && (
        <SaveBar
          tools={langTools}
          dirty={dirty}
          note={edited ? `· Đã chỉnh sửa ${edited} mục` : "· Đang dùng nội dung mặc định"}
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
        contentKey={pageKey}
        title={entry.name}
        describe={describe}
        onRestored={onRestored}
        dirty={dirty}
        canRestore={canEdit}
        tags={tags}
      />
    </PageCopyContext.Provider>
  );
}
