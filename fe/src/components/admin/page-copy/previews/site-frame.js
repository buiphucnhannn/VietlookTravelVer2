"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { buildCatalog } from "@/lib/catalog-build";
import { contactView } from "@/lib/contact.mjs";
import { fillReviewStats, normalizeReviewStats } from "@/lib/review-stats";
import { pageCopyOf } from "@/lib/page-copy/registry.mjs";
import { resolvePage } from "@/lib/page-copy/resolve.mjs";
import { loadDataSources } from "@/lib/page-copy/sources";
import { buildNavigation } from "@/data/navigation";
import { HeaderPreview } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SuccessPanel } from "@/components/forms/fields";
import { StillMotion } from "@/components/ui/motion";
import Link from "../../Link";
import { Txt } from "../blocks";
import { useSiteDict } from "./site-shared";
import { PREVIEW_CSS } from "../chrome";
import { BlockSwitch, DIM_TRANSITION, HIDDEN_DIM, usePageCopyHidden } from "../../block-visibility";

/**
 * KHUNG "TRANG WEB THẬT" cho bản xem trước Giao diện trang — để phần sửa được và phần KHÔNG sửa được trông y như
 * trên website:
 *   <SitePage lang path>…</SitePage>   header thật (trong suốt / nền trắng đúng như trang) + chân trang thật,
 *                                       font chữ website; header / chân trang chỉ xem (sửa ở Đầu & chân trang)
 *   <Zone name="Đầu trang">…</Zone>    1 khối của trang: giữ nguyên khoảng cách thật, chỉ thêm nhãn tên khối nhỏ ở góc
 *   <Auto href label>…</Auto>          phần dữ liệu tự động (tour, xe, gói visa, form…) dựng bằng đúng component website
 *                                       + dữ liệu thật; không bấm được, có nhãn "Tự động · sửa ở …"
 * Dữ liệu chỉ xem lấy từ đúng API công khai website đang dùng (useCatalog / useReviews / useSiteInfo).
 */

/* ---------- Dữ liệu công khai (đúng nguồn website đang hiện) ---------- */

const cache = new Map();
function fetchPublic(path) {
  if (!cache.has(path))
    cache.set(
      path,
      api(`/public${path}`)
        .then((r) => r.data)
        .catch((err) => {
          cache.delete(path); // lần sau thử lại
          throw err;
        }),
    );
  return cache.get(path);
}

/** Dữ liệu 1 API công khai (`/tours`, `/site`…) — null khi đang tải / lỗi / chưa có đường dẫn */
export function usePublic(path) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    fetchPublic(path)
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path]);
  return path ? data : null;
}

const CATALOG_PARTS = [
  ["tours", "/tours", []],
  ["destinations", "/destinations", []],
  ["themes", "/themes", []],
  ["articles", "/articles", []],
  ["taxonomy", "/taxonomy", { categories: [], authors: [] }],
  ["services", "/services", { cars: [], carAreas: [], visaTypes: [], fastTrack: [] }],
  ["pages", "/pages", []],
  ["home", "/home", {}],
];
let catalogPromise = null;
function loadCatalog() {
  catalogPromise ??= Promise.all(
    CATALOG_PARTS.map(([, path, empty]) => fetchPublic(path).then((d) => d ?? empty)),
  )
    .then((parts) => buildCatalog(Object.fromEntries(CATALOG_PARTS.map(([k], i) => [k, parts[i]]))))
    .catch((err) => {
      catalogPromise = null;
      throw err;
    });
  return catalogPromise;
}

/** Toàn bộ dữ liệu website (tour, điểm đến, bài viết, xe, visa…) — dựng y như lib/catalog.js. null khi đang tải */
export function useCatalog() {
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    let alive = true;
    loadCatalog()
      .then((c) => alive && setCatalog(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return catalog;
}

/** Đánh giá khách đang hiện ở 1 trang ("home" | "about" | "group" | "car"), đúng thứ tự trong CMS */
export function useReviews(place) {
  const list = usePublic("/reviews");
  return useMemo(
    () => (list ?? []).filter((r) => !place || (r.showOn ?? []).includes(place)),
    [list, place],
  );
}

/** Cài đặt website: { info (thông tin liên hệ), reviewStats } */
export function useSiteInfo() {
  const site = usePublic("/site");
  return useMemo(
    () => ({
      loaded: !!site,
      info: contactView(site?.contact),
      reviewStats: normalizeReviewStats(site?.reviewStats),
    }),
    [site],
  );
}

/** Từ điển website đúng như trang thật (đã điền điểm & số lượt đánh giá — CMS → Đánh giá) — null khi đang tải */
export function useDict(lang) {
  const raw = useSiteDict(lang);
  const { reviewStats } = useSiteInfo();
  return useMemo(
    () => raw && { ...fillReviewStats(raw, reviewStats, lang), reviewStats },
    [raw, reviewStats, lang],
  );
}

/** Chữ đang dùng trên website của 1 trang khác (vd. "global" cho header / chân trang) */
export function usePageText(key, lang, dict) {
  const saved = usePublic(`/page-copy/${key}`);
  const [sources, setSources] = useState(null);
  useEffect(() => {
    let alive = true;
    loadDataSources(pageCopyOf(key)).then((s) => alive && setSources(s));
    return () => {
      alive = false;
    };
  }, [key]);
  return useMemo(
    () =>
      dict && sources
        ? resolvePage(pageCopyOf(key), saved ?? {}, { dict, data: sources }, lang)
        : null,
    [key, saved, sources, dict, lang],
  );
}

/* ---------- Nhãn nhỏ ---------- */

const PAGES = `${ADMIN_BASE}/pages`;

/**
 * Nhãn "⚡ Tự động · sửa ở …" (link sang mục quản lý) — gọn: bình thường chỉ là chấm ⚡ nhỏ mờ ở góc, rê chuột lên
 * khối (lớp `group/auto` của khung cha) hoặc lên chấm thì mới hiện đủ chữ → không đè lên nội dung trang.
 */
export function AutoChip({ href, label, dark, className }) {
  const body = (
    <>
      <Zap className="size-3 shrink-0 text-amber-500" />
      <span className="hidden truncate group-hover/auto:inline group-hover/chip:inline">
        <span className="sr-only">Tự động · </span>
        {label}
      </span>
      {href && (
        <ArrowUpRight className="hidden size-3 shrink-0 opacity-60 group-hover/auto:block group-hover/chip:block" />
      )}
    </>
  );
  const cls = cn(
    "group/chip z-30 inline-flex h-6 max-w-[calc(100%-1rem)] min-w-6 items-center justify-center gap-1 rounded-full [zoom:var(--pz,1)] px-1.5 font-sans text-[11px] leading-none font-semibold tracking-normal whitespace-nowrap normal-case opacity-70 shadow-sm backdrop-blur group-hover/auto:px-2.5 group-hover/auto:opacity-100 hover:px-2.5 hover:opacity-100",
    dark
      ? "bg-slate-950/70 text-white/90 ring-1 ring-white/15 hover:bg-slate-950/85"
      : "bg-white/95 text-slate-600 ring-1 ring-slate-900/10 hover:text-brand-700",
    className,
  );
  return href ? (
    <Link href={href} className={cls} title={label} aria-label={label} data-admin-link data-edit-ui>
      {body}
    </Link>
  ) : (
    <span className={cls} title={label} data-edit-ui>
      {body}
    </span>
  );
}

/** Chặn gửi form / bấm nút / mở link trong phần chỉ xem (form thật vẫn gõ thử được, không gửi đi đâu) */
const block = (e) => {
  e.preventDefault();
  e.stopPropagation();
};
const blockClicks = (e) => {
  if (e.target.closest?.("a[href], button")) block(e);
};

/**
 * Phần dữ liệu tự động trên trang (không sửa ở đây): dựng y như website nhưng không bấm được
 * (`inert`, nên form không gửi được), rê chuột hiện viền nét đứt; nhãn ở góc `at` nói rõ sửa ở đâu.
 * `live`: không khoá cả khối (bên trong có chữ sửa được, vd. tiêu đề form) — chỉ chặn gửi form, bấm nút, mở link.
 * `className`: lớp bố cục của khối (giữ đúng vị trí trên trang thật).
 */
export function Auto({ href, label, dark, live, className, at = "top-2 right-2", children }) {
  return (
    <div
      data-auto
      className={cn(
        "group/auto relative rounded-[inherit] outline-2 outline-offset-4 outline-transparent outline-dashed",
        dark ? "hover:outline-white/35" : "hover:outline-slate-400/60",
        className,
      )}
    >
      {live ? (
        <div className="contents" onSubmitCapture={block} onClickCapture={blockClicks}>
          {children}
        </div>
      ) : (
        <div inert className="contents">
          {children}
        </div>
      )}
      <AutoChip href={href} label={label} dark={dark} className={cn("absolute", at)} />
    </div>
  );
}

/**
 * Form thật của website + công tắc nhỏ "Form · Sau khi gửi": xem (và sửa tiêu đề / lời nhắn) màn hình báo gửi thành
 * công đúng chỗ khách sẽ thấy nó (thay cho form, như website sau khi khách bấm gửi).
 * `children`: form (đã bọc <Auto live>) · `labels`: dict.common (chữ cố định của khung báo thành công).
 */
export function FormStates({ labels, title = "successTitle", text = "successText", children }) {
  const [sent, setSent] = useState(false);
  const tab = (on, label, onClick) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 transition",
        on ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="relative">
      <div
        data-edit-ui
        className="absolute -top-3 left-0 z-30 flex [zoom:var(--pz,1)] items-center gap-0.5 rounded-full bg-white p-0.5 font-sans text-[11px] leading-none font-semibold shadow-sm ring-1 ring-slate-900/10"
      >
        {tab(!sent, "Form", () => setSent(false))}
        {tab(sent, "Sau khi gửi", () => setSent(true))}
      </div>
      {sent ? (
        <Auto live label="Mã yêu cầu tự tạo khi khách gửi" at="bottom-3 right-3">
          <SuccessPanel
            title={<Txt f={title} />}
            text={<Txt f={text} />}
            code="VL-123456"
            labels={labels ?? {}}
            onReset={() => setSent(false)}
          />
        </Auto>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * 1 khối của trang: nội dung y như trang thật (tự lo khoảng cách), thêm nhãn tên khối nhỏ.
 * Nhãn là 1 thẻ DỌC sát mép trái khối (nằm trong lề trang, không đè lên chữ của khối); `at` chỉ chọn độ cao
 * (vd. "top-20" để nằm dưới thanh menu, "bottom-3", "hidden"). Nhãn không chặn chuột và ẩn đi khi rê chuột vào khối
 * → nhường chỗ cho nhãn / nút sửa.
 * Khối bật / tắt được trên website (block-visibility.js): `hide` = khoá khối của trang (lib/hidden-blocks.mjs,
 * đọc / ghi thẳng dữ liệu đang soạn), hoặc tự truyền `hidden` + `onHiddenChange` (Trang chủ) → công tắc
 * "Hiện / Ẩn trên website" giữa mép trên khối (`switchAt` đổi chỗ); khối đang ẩn hiện mờ, vẫn sửa được.
 * Chỉ truyền `hidden` (không `onHiddenChange`): chỉ làm mờ — nơi gọi tự đặt công tắc (khối Trang chủ).
 */
export function Zone({
  name,
  dark,
  at = "top-3",
  className,
  hide,
  hidden: hiddenProp,
  onHiddenChange,
  switchAt,
  children,
}) {
  const [storeHidden, setStoreHidden] = usePageCopyHidden(hide);
  const toggle = setStoreHidden ?? onHiddenChange;
  const hidden = setStoreHidden ? storeHidden : !!hiddenProp;
  const canHide = !!toggle || hiddenProp !== undefined; // chỉ `hidden` (không công tắc): nơi gọi tự đặt công tắc
  return (
    <div
      data-jump={name}
      data-jump-hidden={(canHide && hidden) || undefined}
      className={cn("group/zl relative", className)}
    >
      {canHide ? (
        <div className={cn(DIM_TRANSITION, hidden && HIDDEN_DIM)}>{children}</div>
      ) : (
        children
      )}
      {toggle && <BlockSwitch name={name} hidden={hidden} onChange={toggle} className={switchAt} />}
      <span
        aria-hidden
        data-edit-ui
        title={name}
        className={cn(
          "pointer-events-none absolute left-0 z-30 max-h-[min(18rem,calc((100%-0.75rem)/var(--pz,1)))] rotate-180 [zoom:var(--pz,1)] truncate rounded-l-md px-px py-1.5 font-sans text-[9px] leading-3 font-semibold tracking-wide whitespace-nowrap uppercase transition-opacity duration-150 select-none [writing-mode:vertical-rl] group-hover/zl:opacity-0 max-sm:hidden",
          dark
            ? "bg-slate-950/45 text-white/80 backdrop-blur-sm"
            : "bg-slate-200/80 text-slate-500",
          // chỉ giữ vị trí theo chiều dọc: nhãn luôn sát mép trái
          at.replace(/(^|\s)(\w+:)?left-\S+/g, " "),
        )}
      >
        {name}
      </span>
    </div>
  );
}

/* ---------- Header + chân trang thật ---------- */

const stopLinks = (e) => {
  const a = e.target.closest?.("a[href]");
  if (a && !a.hasAttribute("data-admin-link")) e.preventDefault();
};

/**
 * Trang dựng rộng đúng bằng cửa sổ trình duyệt (để bố cục máy tính / điện thoại y như website đang mở ở cửa sổ này)
 * rồi thu nhỏ (CSS zoom) cho vừa khung xem trước. Nút / nhãn của trình sửa phóng lại cỡ thật qua biến --pz.
 */
function useSiteScale() {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const width = document.documentElement.clientWidth;
      const zoom = Math.min(1, el.clientWidth / width);
      setBox((b) => (b && b.width === width && b.zoom === zoom ? b : { width, zoom }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return {
    ref,
    style: box && box.zoom < 1 ? { width: box.width, zoom: box.zoom, "--pz": 1 / box.zoom } : {},
  };
}

/**
 * Trang web thật thu vào khung xem trước: header (đúng dáng ở đầu trang `path`) · nội dung · chân trang.
 * `chrome={false}`: không vẽ header / chân trang (khối dùng chung nhiều trang).
 * `extras`: ô sửa không có chỗ hiện trên trang (ảnh chia sẻ link, thông báo khi không có kết quả…) — vẽ dưới chân trang.
 */
export function SitePage({ lang, path, chrome = true, editChrome, extras, children }) {
  const { ref, style } = useSiteScale();
  return (
    // link / nút trên trang chỉ để xem: bấm không chuyển trang (trừ link sang mục quản lý trong nhãn "Tự động")
    // site-preview: tắt mọi hiệu ứng chuyển động của website (globals.css) + PREVIEW_CSS bên dưới
    <div ref={ref} className="site-preview overflow-hidden" onClickCapture={stopLinks}>
      <style>{PREVIEW_CSS}</style>
      {/* font chữ website (Be Vietnam Pro) + màu chữ gốc của website; rộng đúng bằng cửa sổ trình duyệt rồi thu nhỏ vừa khung */}
      <div
        lang={lang}
        className="relative bg-white font-sans text-ink"
        style={{ "--font-be-vietnam": "var(--font-admin)", ...style }}
      >
        <StillMotion>
          {chrome && <SiteHeader lang={lang} path={path} edit={editChrome?.header} />}
          {children}
          {chrome && <SiteFooter lang={lang} edit={editChrome?.footer} />}
        </StillMotion>
      </div>
      {extras && <EditorExtras>{extras}</EditorExtras>}
    </div>
  );
}

/** Dữ liệu chung của header / chân trang website (từ điển, menu, thông tin liên hệ, chữ Đầu & chân trang) */
function useChrome(lang) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  const { info } = useSiteInfo();
  const g = usePageText("global", lang, dict);
  const nav = useMemo(
    () => (dict && catalog ? buildNavigation(lang, dict, catalog) : null),
    [lang, dict, catalog],
  );
  return { dict, catalog, info, g, nav, ready: !!(dict && nav && g) };
}

/**
 * Header thật của website, đúng dáng ở đầu trang `path` (trong suốt trên ảnh / nền trắng).
 * `edit`: { dmc, partners, planTrip } — chữ sửa được (trình sửa Đầu & chân trang); không có → chỉ xem.
 */
export function SiteHeader({ lang, path, edit, className }) {
  const { dict, info, g, nav, ready } = useChrome(lang);
  if (!ready) return null;
  const pathname = `${lang === "en" ? "" : `/${lang}`}${path}`;
  const header = (
    <HeaderPreview
      lang={lang}
      nav={nav}
      contact={info.contact}
      pathname={pathname}
      labels={{
        ...dict.topbar,
        dmc: g.topTagline,
        partners: g.partnersLabel,
        planTrip: g.planTrip,
        menu: dict.nav.menu,
        close: dict.nav.close,
        ...edit,
      }}
    />
  );
  return (
    // transform → header "fixed" của website bám vào khung xem trước (không bám màn hình CMS)
    <div className={cn("group/auto relative z-40 h-0 [transform:translateZ(0)]", className)}>
      {edit ? header : <div inert>{header}</div>}
      {!edit && (
        // vị trí theo toạ độ trang (ngay dưới thanh menu), nhãn bên trong phóng cỡ thật
        <span className="absolute top-[4.25rem] right-3 z-[60] flex lg:top-[7.25rem]">
          <AutoChip
            href={`${PAGES}?key=global`}
            label="Đầu trang chung · sửa ở Đầu & chân trang"
            dark
          />
        </span>
      )}
    </div>
  );
}

/** Chân trang thật của website. `edit`: chữ / ảnh thay thế (trình sửa Đầu & chân trang); không có → chỉ xem */
export function SiteFooter({ lang, edit }) {
  const { dict, catalog, info, g, ready } = useChrome(lang);
  if (!ready) return null;
  const footer = (
    <Footer
      lang={lang}
      dict={dict}
      policies={catalog.policies}
      info={info}
      copy={{ ...g, ...edit }}
    />
  );
  if (edit) return footer;
  return (
    <div className="group/auto relative" data-auto>
      <div inert>{footer}</div>
      <AutoChip
        href={`${PAGES}?key=global`}
        label="Chân trang chung · sửa ở Đầu & chân trang"
        dark
        className="absolute top-3 right-3"
      />
    </div>
  );
}

/** Ô chỉ có trong trình sửa (không hiện trên trang): đặt sau chân trang, cỡ chữ thường của CMS */
function EditorExtras({ children }) {
  return (
    <div className="border-t border-dashed border-slate-300 bg-slate-50 p-4 font-sans sm:p-6">
      <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Chỉ có trong trình sửa · không hiện ở vị trí này trên trang
      </p>
      {children}
    </div>
  );
}

/** Khung chờ khi dữ liệu tự động chưa tải xong (giữ chỗ đúng chiều cao gần đúng) */
export function Loading({ className, dark }) {
  return (
    <div
      className={cn(
        "grid min-h-40 place-items-center rounded-3xl text-sm",
        dark ? "bg-white/5 text-white/60" : "bg-surface text-muted",
        className,
      )}
    >
      Đang tải dữ liệu website…
    </div>
  );
}
