"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, RotateCcw, Save, Undo2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ADMIN_BASE } from "@/config/urls.mjs";
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
import Link from "../Link";
import { useMutation } from "../hooks";
import { AutoTranslate, useAutoFill } from "../translate";
import {
  Badge,
  Button,
  DEFAULT_LANG,
  LangTabs,
  LoadingBlock,
  Notice,
  fmtDateTime,
  useUi,
  useUnsavedGuard,
} from "../ui";
import { usePendingImages } from "../pendingImages";
import { ReadOnlyArea, usePermission } from "../permissions";
import { PageCopyContext } from "./blocks";
import { PREVIEWS } from "./previews";

export const HUB = `${ADMIN_BASE}/pages`;
const ALL_FILLED = { en: true, zh: true, vi: true }; // ô nào cũng có chữ (mặc định) ở cả 3 ngôn ngữ
const LANG_NAME = { en: "tiếng Anh", zh: "tiếng Trung", vi: "tiếng Việt" };

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

  if (state.loading) return <LoadingBlock text="Đang tải nội dung trang…" />;
  if (state.error)
    return (
      <>
        <BackLink />
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">{entry.name}</h1>
        <Notice tone="error">
          {state.error}{" "}
          <button
            type="button"
            onClick={() => {
              setState({ loading: true, error: "" });
              setNonce((n) => n + 1);
            }}
            className="font-semibold underline"
          >
            Thử lại
          </button>
        </Notice>
      </>
    );
  return <Editor pageKey={pageKey} entry={entry} doc={state.doc} defs={state.defs} />;
}

/**
 * Thanh lưu dính đáy màn hình không được che ô đang sửa: khi bấm Tab / bấm vào ô / mở thanh đổi ảnh, trình duyệt
 * cuộn ô vào vùng nhìn thấy — chừa đúng chiều cao thanh lưu ở đáy (và thanh tiêu đề dính trên điện thoại ở đầu)
 * qua scroll-padding của trang. Thanh đổi chiều cao (xuống 2 dòng) → đo lại.
 */
function useStickyBarRoom(ref) {
  useEffect(() => {
    const bar = ref.current;
    const root = document.documentElement;
    if (!bar) return;
    const mobileHeader = window.matchMedia("(max-width: 1023.98px)"); // AdminShell: header dính h-16 dưới lg
    const apply = () => {
      root.style.scrollPaddingBottom = `${Math.ceil(bar.offsetHeight) + 28}px`;
      root.style.scrollPaddingTop = mobileHeader.matches ? "80px" : "16px";
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(bar);
    mobileHeader.addEventListener("change", apply);
    return () => {
      ro.disconnect();
      mobileHeader.removeEventListener("change", apply);
      root.style.scrollPaddingBottom = "";
      root.style.scrollPaddingTop = "";
    };
  }, [ref]);
}

function BackLink({ onClick }) {
  return (
    <Link
      href={HUB}
      onClick={onClick}
      className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
    >
      <ArrowLeft className="size-3.5" />
      Giao diện trang
    </Link>
  );
}

function Editor({ pageKey, entry, doc, defs }) {
  const router = useRouter();
  const { confirm } = useUi();
  const { canEdit } = usePermission("pages"); // chỉ xem → bản xem trước chỉ đọc, không có thanh Lưu
  const [data, setData] = useState(() => fillPage(entry, doc.data, defs));
  const [savedBody, setSavedBody] = useState(() =>
    JSON.stringify(stripPage(entry, fillPage(entry, doc.data, defs), defs)),
  );
  const [updatedAt, setUpdatedAt] = useState(doc.updatedAt);
  const [lang, setLang] = useState(DEFAULT_LANG);
  const { run, busy } = useMutation(["pages", `page:${pageKey}`]);
  const autoFill = useAutoFill();
  const images = usePendingImages(data);
  const barRef = useRef(null);
  useStickyBarRoom(barRef);

  // bản sẽ lưu: chỉ các ô khác mặc định (dùng cho Lưu, Dịch tự động, đếm số ô đã sửa)
  const body = useMemo(() => stripPage(entry, data, defs), [entry, data, defs]);
  const dirty = JSON.stringify(body) !== savedBody;
  const edited = countEdited(entry, body);
  useUnsavedGuard(dirty);

  const apply = useCallback(
    (saved) => {
      const next = fillPage(entry, saved, defs);
      setData(next);
      setSavedBody(JSON.stringify(stripPage(entry, next, defs)));
    },
    [entry, defs],
  );

  const save = useCallback(async () => {
    if (!canEdit || !dirty) return;
    // ảnh vừa chọn chỉ được tải lên kho ảnh lúc bấm Lưu
    const withImages = await images.prepare(body);
    if (!withImages) return;
    // ô đã sửa ở 1 ngôn ngữ → tự dịch sang 2 ngôn ngữ còn lại rồi mới lưu
    const { value, failed } = await autoFill.fill(withImages, { lang });
    const url = `/settings/page-copy/${pageKey}`;
    const r = await run(
      () => api(url, { method: "PUT", body: { data: value } }),
      `Đã lưu trang ${entry.name}`,
    );
    if (!r?.data) return;
    apply(r.data.data);
    setUpdatedAt(r.data.updatedAt);
    if (failed)
      autoFill.offerRetry(async (t) => {
        const r2 = await api(url, { method: "PUT", body: { data: t } });
        apply(r2.data.data);
        setUpdatedAt(r2.data.updatedAt);
      });
  }, [canEdit, dirty, images, body, autoFill, lang, pageKey, run, entry.name, apply]);

  // Ctrl/⌘ + S = Lưu
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
    if (ok) setData(fillPage(entry, {}, defs));
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

  const ctx = useMemo(
    () => ({ entry, state: data, setState: setData, defs, lang }),
    [entry, data, defs, lang],
  );
  const Preview = PREVIEWS[pageKey];
  const viewUrl = `${lang === "en" ? "" : `/${lang}`}${entry.path}`;

  const langTools = (compact) => (
    <div className="flex shrink-0 items-center gap-2">
      {canEdit && (
        <AutoTranslate
          lang={lang}
          value={body}
          onChange={(next) => setData(fillPage(entry, next, defs))}
          className={cn("px-3 ring-1 ring-brand-200/70", compact && "max-sm:hidden")}
          label={
            <>
              <span className="max-[430px]:hidden">Dịch tự động</span>
              <span className="min-[431px]:hidden">Dịch</span>
            </>
          }
        />
      )}
      <LangTabs value={lang} onChange={setLang} filled={ALL_FILLED} className="bg-white" />
    </div>
  );

  return (
    <PageCopyContext.Provider value={ctx}>
      <BackLink onClick={goBack} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            {entry.name}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            {canEdit
              ? "Bản xem trước giống hệt trang trên website (thu nhỏ vừa khung). Bấm vào chữ để sửa, dùng nút trên ảnh để đổi ảnh, rồi bấm Lưu. Phần có nhãn “Tự động” lấy từ mục khác — bấm nhãn để sang mục đó sửa."
              : "Bạn đang ở chế độ chỉ xem."}
            {updatedAt && ` Lưu lần cuối ${fmtDateTime(updatedAt)}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={dirty ? "Website đang hiện bản đã lưu gần nhất" : undefined}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900"
          >
            <ExternalLink className="size-4" />
            Xem trang thật
          </a>
          {canEdit && edited > 0 && (
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetAll}>
              Về mặc định cả trang
            </Button>
          )}
        </div>
      </div>

      {/* ----- Khung "trang web thu nhỏ" ----- */}
      <ReadOnlyArea readOnly={!canEdit}>
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-100 px-3.5 py-2">
            <span className="flex gap-1.5 max-sm:hidden" aria-hidden>
              <span className="size-2.5 rounded-full bg-sun-400" />
              <span className="size-2.5 rounded-full bg-amber-brand" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="min-w-0 flex-1 truncate rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200 max-sm:hidden">
              {entry.name} · đang sửa nội dung <b className="text-slate-700">{LANG_NAME[lang]}</b>
            </span>
            <div className="max-sm:flex max-sm:flex-1 max-sm:justify-between">{langTools()}</div>
          </div>
          {Preview ? (
            <Preview lang={lang} />
          ) : (
            <p className="p-10 text-center text-sm text-slate-500">
              Trang này chưa có bản xem trước.
            </p>
          )}
        </div>
      </ReadOnlyArea>

      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-xs text-slate-500">
        <span className="inline-block size-2.5 rounded-full bg-amber-400" aria-hidden /> Ô đã sửa so
        với mặc định. Xoá trống một ô = dùng lại nội dung mặc định của website.
      </p>

      {/* ----- Thanh lưu ----- */}
      {canEdit && (
        <div
          ref={barRef}
          className="sticky bottom-3 z-30 mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-[0_12px_40px_-12px_rgba(10,37,60,0.4)] ring-1 ring-slate-200 backdrop-blur sm:bottom-4 sm:px-4"
        >
          {langTools(true)}
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs max-sm:hidden">
            {dirty ? (
              <Badge tone="amber">Chưa lưu</Badge>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-slate-500">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                Đã lưu mọi thay đổi
              </span>
            )}
            {/* khung hẹp (vd. 1024px có thanh menu): bỏ dòng phụ, giữ "Đã lưu" trên 1 dòng */}
            <span className="truncate text-slate-400 max-xl:hidden">
              {edited ? `· Đã chỉnh sửa ${edited} mục` : "· Đang dùng nội dung mặc định"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                icon={Undo2}
                onClick={discard}
                disabled={busy}
                aria-label="Bỏ thay đổi"
              >
                <span className="max-sm:hidden">Bỏ thay đổi</span>
              </Button>
            )}
            <Button
              icon={Save}
              onClick={save}
              loading={busy || autoFill.busy || images.busy}
              disabled={!dirty}
            >
              {images.label || (
                <>
                  <span className="max-sm:hidden">Lưu thay đổi</span>
                  <span className="sm:hidden">Lưu</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </PageCopyContext.Provider>
  );
}
