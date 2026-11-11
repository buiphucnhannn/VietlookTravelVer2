"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/admin/Link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Columns3,
  Compass,
  ExternalLink,
  Image as ImageIcon,
  Info,
  ListChecks,
  ListPlus,
  MessageSquareQuote,
  Plane,
  Plus,
  Rows3,
  Save,
  Search as SearchIcon,
  SlidersHorizontal,
  Star,
  Tag,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { api, errorMessage } from "@/lib/api";
import { estimatePrice } from "@/lib/pricing";
import { cn, slugify } from "@/lib/utils";
import { fmtDate, isISODate } from "@/lib/dates";
import { priceLineVi } from "@/lib/pricing-labels";
import { useMutation, useOptions } from "./hooks";
import RichText from "./RichTextLazy";
import { DragHandle, Sortable } from "./Sortable";
import { AutoTranslate, pickSource, slugSource, useAutoFill } from "./translate";
import {
  Badge,
  Button,
  Card,
  ChipSelect,
  Field,
  GalleryField,
  ImageField,
  DateInput,
  Input,
  LANGS,
  LangTabs,
  LoadingBlock,
  Notice,
  Select,
  StringList,
  Textarea,
  DEFAULT_LANG,
  Toggle,
  anyLang,
  VideoHelp,
  VideoListField,
  filledOf,
  fmtUSD,
  locText,
  useUi,
  useUnsavedGuard,
} from "./ui";
import { canonicalVideo, parseVideo } from "@/lib/video";
import { REGIONS } from "./DestinationsPage";
import { usePendingImages } from "./pendingImages";
import { NoAccess, ReadOnlyArea, usePermission } from "./permissions";

const PATH = "/admin/tours";
const TAGS = ["tours"];
const LANG_KEYS = LANGS.map((l) => l.key);

/* =========================================================================
 * Chuẩn hoá dữ liệu: máy chủ → state của form → dữ liệu gửi lại khi lưu
 * ========================================================================= */

let keySeq = 0;
/** khoá React ổn định cho từng phần tử danh sách (ngày lịch trình, FAQ, bảng giá) — bỏ khi gửi */
const newKey = () => `k${++keySeq}`;

const str = (v) => (v == null ? "" : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const numOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const intOr = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const strList = (v) => arr(v).map(str);
const cleanList = (v) =>
  arr(v)
    .map((x) => str(x).trim())
    .filter(Boolean);
const emptyToNull = (v) => (str(v).trim() ? str(v).trim() : null);

const pctOrNull = (v) => {
  const n = numOrNull(v);
  return n == null ? null : Math.min(100, Math.max(0, n));
};
const priceOrNull = (v) => {
  const n = numOrNull(v);
  return n == null ? null : Math.max(0, n);
};

export const DEPARTURES = [
  { value: "daily", label: "Hằng ngày" },
  { value: "weekly", label: "Các thứ trong tuần" },
  { value: "dates", label: "Ngày cố định" },
  { value: "on-request", label: "Theo yêu cầu của khách" },
];

export const TOUR_TYPES = [
  { value: "private", label: "Tour riêng" },
  { value: "group", label: "Tour ghép" },
];

/** Thứ trong tuần: 0 = Chủ nhật … 6 = Thứ bảy (hiển thị bắt đầu từ Thứ hai) */
const WEEKDAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];
const cleanWeekdays = (v) =>
  [...new Set(arr(v).map(Number))].filter((n) => Number.isInteger(n) && n >= 0 && n <= 6).sort();

/** Bữa ăn trong ngày: B = sáng, L = trưa, D = tối (dùng chung cho cả 3 ngôn ngữ) */
const MEALS = [
  { value: "B", label: "Sáng" },
  { value: "L", label: "Trưa" },
  { value: "D", label: "Tối" },
];
const cleanMeals = (v) => MEALS.map((m) => m.value).filter((k) => arr(v).includes(k));

const DEFAULT_CHILD_RATES = [
  { minAge: 0, maxAge: 4, percent: 0 },
  { minAge: 5, maxAge: 10, percent: 75 },
  { minAge: 11, maxAge: 17, percent: 100 },
];

const emptyLang = () => ({
  title: "",
  summary: "",
  route: [],
  highlights: [],
  itinerary: [],
  included: [],
  excluded: [],
  childPolicy: "",
  notes: "",
  priceTables: [],
  faqs: [],
});

function normalizeLang(c = {}) {
  return {
    title: str(c.title),
    summary: str(c.summary),
    route: strList(c.route),
    highlights: strList(c.highlights),
    itinerary: arr(c.itinerary).map((d, i) => ({
      _k: newKey(),
      day: d?.day ?? i + 1,
      title: str(d?.title),
      html: str(d?.html),
      meals: cleanMeals(d?.meals),
      overnight: str(d?.overnight),
    })),
    included: strList(c.included),
    excluded: strList(c.excluded),
    childPolicy: str(c.childPolicy),
    notes: str(c.notes),
    priceTables: arr(c.priceTables).map((t) => ({
      _k: newKey(),
      heading: str(t?.heading),
      period: str(t?.period),
      rows: arr(t?.rows).map((r) => arr(r).map(str)),
    })),
    faqs: arr(c.faqs).map((f) => ({ _k: newKey(), q: str(f?.q), a: str(f?.a) })),
  };
}

/** Dữ liệu từ máy chủ (hoặc rỗng khi tạo mới) → state đầy đủ trường cho form */
export function normalizeTour(d = {}) {
  const p = d.pricing ?? {};
  return {
    id: d.id ?? null,
    slug: str(d.slug),
    code: str(d.code),
    days: d.days ?? 1,
    nights: d.nights ?? 0,
    halfDay: !!d.halfDay,
    destinations: strList(d.destinations),
    themes: strList(d.themes),
    cruise: !!d.cruise,
    tourType: d.tourType === "group" ? "group" : "private",
    price: d.price ?? "",
    originalPrice: d.originalPrice ?? "",
    image: str(d.image),
    gallery: strList(d.gallery),
    videos: strList(d.videos),
    departure: d.departure || "daily",
    departureDays: cleanWeekdays(d.departureDays),
    departureDates: strList(d.departureDates),
    content: Object.fromEntries(LANG_KEYS.map((l) => [l, normalizeLang(d.content?.[l])])),
    pricing: {
      groupTiers: arr(p.groupTiers).map((x) => ({
        minPax: x?.minPax ?? "",
        maxPax: x?.maxPax ?? "",
        price: x?.price ?? "",
        price4: x?.price4 ?? "",
        price5: x?.price5 ?? "",
      })),
      childRates: arr(p.childRates).map((x) => ({
        minAge: x?.minAge ?? "",
        maxAge: x?.maxAge ?? "",
        percent: x?.percent ?? "",
      })),
      singleSupplement: p.singleSupplement ?? "",
      holidaySurcharge: p.holidaySurcharge ?? "",
      holidayPercent: p.holidayPercent ?? "",
      holidayDates: strList(p.holidayDates),
    },
    reviews: arr(d.reviews).map((r) => ({
      _k: newKey(),
      name: str(r?.name),
      country: str(r?.country),
      rating: r?.rating ?? 5,
      text: str(r?.text),
      date: str(r?.date),
      source: str(r?.source),
    })),
    seo: Object.fromEntries(
      LANG_KEYS.map((l) => [
        l,
        { title: str(d.seo?.[l]?.title), description: str(d.seo?.[l]?.description) },
      ]),
    ),
    featured: !!d.featured,
    featuredLong: !!d.featuredLong,
    rank: d.rank ?? 1000,
    isActive: d.isActive ?? true,
  };
}

const SLUG_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isMedia = (v) =>
  !v ||
  /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//.test(v) ||
  /^\/images\/[\w./ ()-]+$/.test(v);

function cleanPricing(p) {
  return {
    // price = giá khách sạn 3★ (hoặc giá duy nhất); price4 / price5 bỏ trống → null
    groupTiers: arr(p?.groupTiers)
      .filter((x) => [x.price, x.price4, x.price5].some((v) => str(v).trim() !== ""))
      .map((x) => ({
        minPax: intOr(x.minPax, 1),
        maxPax: intOr(x.maxPax, intOr(x.minPax, 1)),
        price: priceOrNull(x.price) ?? 0,
        price4: priceOrNull(x.price4),
        price5: priceOrNull(x.price5),
      })),
    childRates: arr(p?.childRates)
      .filter((x) => str(x.percent).trim() !== "")
      .map((x) => ({
        minAge: intOr(x.minAge, 0),
        maxAge: intOr(x.maxAge, 17),
        percent: Number(x.percent) || 0,
      })),
    singleSupplement: numOrNull(p?.singleSupplement),
    holidaySurcharge: numOrNull(p?.holidaySurcharge),
    holidayPercent: pctOrNull(p?.holidayPercent),
    holidayDates: [...new Set(cleanList(p?.holidayDates))],
  };
}

function cleanLang(c) {
  return {
    title: str(c.title).trim(),
    summary: str(c.summary).trim(),
    route: cleanList(c.route),
    highlights: cleanList(c.highlights),
    itinerary: arr(c.itinerary)
      .filter((d) => str(d.title).trim() || str(d.html).trim() || str(d.overnight).trim())
      .map((d, i) => ({
        day: intOr(d.day, i + 1),
        title: str(d.title).trim(),
        html: str(d.html),
        meals: cleanMeals(d.meals),
        overnight: str(d.overnight).trim(),
      })),
    included: cleanList(c.included),
    excluded: cleanList(c.excluded),
    childPolicy: emptyToNull(c.childPolicy),
    notes: emptyToNull(c.notes),
    priceTables: arr(c.priceTables)
      .map((t) => ({
        heading: emptyToNull(t.heading),
        period: emptyToNull(t.period),
        rows: arr(t.rows)
          .map((r) => arr(r).map(str))
          .filter((r) => r.some((cell) => cell.trim())),
      }))
      .filter((t) => t.heading || t.period || t.rows.length),
    faqs: arr(c.faqs)
      .filter((f) => str(f.q).trim() || str(f.a).trim())
      .map((f) => ({ q: str(f.q).trim(), a: str(f.a) })),
  };
}

/** State của form → đúng các trường máy chủ nhận (số đã ép kiểu, ô trống → null) */
export function toTourPayload(t) {
  return {
    slug: slugify(str(t.slug)).slice(0, 120),
    code: str(t.code).trim(),
    days: intOr(t.days, 1),
    nights: intOr(t.nights, 0),
    halfDay: !!t.halfDay,
    destinations: [...new Set(t.destinations)],
    themes: [...new Set(t.themes)].slice(0, 8),
    cruise: !!t.cruise,
    tourType: t.tourType === "group" ? "group" : "private",
    price: numOrNull(t.price),
    originalPrice: numOrNull(t.originalPrice),
    image: str(t.image).trim(),
    gallery: cleanList(t.gallery),
    videos: [...new Set(cleanList(t.videos).map((v) => canonicalVideo(v) ?? v))],
    departure: t.departure,
    departureDays: t.departure === "weekly" ? cleanWeekdays(t.departureDays) : [],
    departureDates: [...new Set(cleanList(t.departureDates))].sort(),
    content: Object.fromEntries(
      LANG_KEYS.map((l) => [l, cleanLang(t.content?.[l] ?? emptyLang())]),
    ),
    pricing: cleanPricing(t.pricing),
    reviews: arr(t.reviews)
      .filter((r) => str(r.name).trim() || str(r.text).trim())
      .map((r) => ({
        name: str(r.name).trim(),
        country: str(r.country).trim(),
        rating: Math.min(5, Math.max(1, intOr(r.rating, 5))),
        text: str(r.text).trim(),
        date: str(r.date).trim(),
        source: str(r.source).trim(),
      })),
    seo: Object.fromEntries(
      LANG_KEYS.map((l) => [
        l,
        { title: str(t.seo?.[l]?.title).trim(), description: str(t.seo?.[l]?.description).trim() },
      ]),
    ),
    featured: !!t.featured,
    featuredLong: !!t.featuredLong,
    rank: Math.max(0, intOr(t.rank, 1000)),
    isActive: !!t.isActive,
  };
}

/** Kiểm tra nhanh trước khi gửi → câu báo lỗi đầu tiên (hoặc null) */
function validate(p) {
  if (!LANG_KEYS.some((l) => p.content[l].title))
    return "Vui lòng nhập tên tour ở ít nhất một ngôn ngữ (mục 2. Tên tour & thông tin chính).";
  if (p.nights > p.days)
    return "Số đêm không được nhiều hơn số ngày (mục 2. Tên tour & thông tin chính) — VD: 3 ngày 2 đêm, tour trong ngày 1 ngày 0 đêm.";
  if (!p.slug) return "Vui lòng nhập đường dẫn trang (mục Cài đặt hiển thị).";
  if (!SLUG_RX.test(p.slug))
    return "Đường dẫn trang chỉ gồm chữ thường không dấu, số và dấu gạch ngang.";
  if (p.originalPrice != null && (p.price == null || p.originalPrice <= p.price))
    return "Giá gốc (gạch ngang) phải lớn hơn giá bán.";
  const badImg = [p.image, ...p.gallery].find((u) => !isMedia(u));
  if (badImg)
    return `Ảnh không hợp lệ: ${badImg.slice(0, 80)} — chỉ nhận ảnh đã tải lên hoặc ảnh có sẵn.`;
  const badVid = p.videos.find((v) => !parseVideo(v));
  if (badVid) return `Link video không hợp lệ (chỉ YouTube / Google Drive): ${badVid.slice(0, 60)}`;
  if (p.pricing.groupTiers.some((x) => x.minPax < 1 || x.maxPax < x.minPax))
    return "Bảng giá theo số khách: số khách “từ” phải từ 1 trở lên và không lớn hơn “đến”.";
  if (p.pricing.childRates.some((x) => x.maxAge < x.minAge || x.maxAge > 17 || x.percent > 100))
    return "Giá trẻ em: độ tuổi 0–17, “từ tuổi” không lớn hơn “đến tuổi”, tối đa 100%.";
  if (p.departureDates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d)))
    return "Có ngày khởi hành không hợp lệ — vui lòng xoá và chọn lại.";
  if (p.pricing.holidayDates.some((d) => !/^(\d{4}-)?\d{2}-\d{2}$/.test(d)))
    return "Có ngày lễ Tết không hợp lệ — vui lòng xoá và chọn lại.";
  return null;
}

/** 2027-02-06 → 02/06/2027 · 12-24 → 12/24 hằng năm (mm/dd như toàn hệ thống) */
const fmtDay = (d) => (d.length === 5 ? `${fmtDate(d)} hằng năm` : fmtDate(d));

/** Chữ của trường `key` ở một ngôn ngữ KHÁC đã có (để gợi ý trong ô đang trống) */
const otherText = (t, lang, key) =>
  LANG_KEYS.filter((l) => l !== lang)
    .map((l) => t.content[l]?.[key])
    .find((v) => typeof v === "string" && v.trim()) ?? "";

/** Gợi ý trong ô trống: ngôn ngữ khác đã có chữ → khi lưu sẽ tự dịch sang ô này */
const phOf = (v, fallback) => (v ? `(trống — sẽ tự dịch khi lưu) ${v.slice(0, 70)}` : fallback);

/** memo theo danh sách trường của tour (t) + so sánh nông các prop khác */
const memoOn = (Comp, keys) =>
  memo(Comp, (a, b) => {
    for (const k of Object.keys(a)) if (k !== "t" && a[k] !== b[k]) return false;
    return keys.every((k) => a.t[k] === b.t[k]);
  });

const htmlPreview = (html, n = 140) =>
  str(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);

/** định danh ổn định của phần tử khi kéo – thả */
const byKey = (x) => x._k;

/* ---- Dịch tự động: chỉ dịch phần chữ (nội dung 3 ngôn ngữ + tiêu đề / mô tả Google) ---- */

/** Không dịch: khoá nội bộ, số thứ tự ngày (bữa ăn, ảnh, link… đã được bỏ qua sẵn) */
const TRANSLATE_SKIP = ["_k", "day"];

/**
 * Dữ liệu đưa cho nút dịch. Lịch trình của 2 ngôn ngữ kia được bù cho đủ số ngày của ngôn ngữ đang soạn
 * (ngày bù lấy sẵn số ngày + bữa ăn) → sau khi dịch, ngày thứ i của cả 3 bản luôn khớp nhau.
 */
function translationSource(t, from) {
  const src = t.content[from].itinerary;
  const content = Object.fromEntries(
    LANG_KEYS.map((l) => {
      const c = t.content[l];
      if (l === from || c.itinerary.length >= src.length) return [l, c];
      const extra = src.slice(c.itinerary.length).map((d) => ({
        _k: newKey(),
        day: d.day,
        title: "",
        html: "",
        meals: cleanMeals(d.meals),
        overnight: "",
      }));
      return [l, { ...c, itinerary: [...c.itinerary, ...extra] }];
    }),
  );
  return { content, seo: t.seo };
}

/** Bản dịch trả về → mỗi phần tử danh sách có khoá riêng (không trùng khoá với bản nguồn) */
function rekeyTranslated(content, from) {
  const fresh = (list) => list.map((x) => ({ ...x, _k: newKey() }));
  return Object.fromEntries(
    LANG_KEYS.map((l) => {
      const c = content[l];
      if (l === from) return [l, c];
      return [
        l,
        {
          ...c,
          itinerary: fresh(c.itinerary),
          faqs: fresh(c.faqs),
          priceTables: fresh(c.priceTables),
        },
      ];
    }),
  );
}

/** Tên tour của 3 ngôn ngữ → { en, zh, vi } */
const titlesOf = (t) => Object.fromEntries(LANG_KEYS.map((l) => [l, t.content[l]?.title ?? ""]));

/** Gộp bản dịch (dữ liệu từ translationSource đã dịch) vào tour; chưa có đường dẫn thì tạo từ tên */
function withTranslation(tour, translated, from) {
  const next = {
    ...tour,
    content: rekeyTranslated(translated.content, from),
    seo: translated.seo,
  };
  if (!next.slug) next.slug = slugify(slugSource(titlesOf(next))).slice(0, 120);
  return next;
}

/* =========================================================================
 * Trang soạn tour
 * ========================================================================= */

/**
 * Thứ tự các mục đi đúng thứ tự trang tour trên website (từ trên xuống) để dễ đối chiếu khi sửa.
 * Các mục `extra` (cài đặt — khách không nhìn thấy) luôn ở cuối.
 */
const SECTIONS = [
  { id: "anh", label: "1. Ảnh bìa & album", icon: ImageIcon },
  { id: "thong-tin", label: "2. Tên tour & thông tin chính", icon: Info },
  { id: "tong-quan", label: "3. Tổng quan", icon: Compass },
  { id: "lich-trinh", label: "4. Lịch trình theo ngày", icon: CalendarDays },
  { id: "bao-gom", label: "5. Bao gồm / Không bao gồm", icon: ListChecks },
  { id: "gia", label: "6. Giá tour", icon: Tag },
  { id: "khoi-hanh", label: "7. Ngày khởi hành", icon: Plane },
  { id: "hoi-dap", label: "8. Câu hỏi thường gặp", icon: CircleHelp },
  { id: "danh-gia", label: "9. Đánh giá của khách", icon: Star },
  { id: "video", label: "10. Video", icon: Video },
  { id: "tuy-chon", label: "Cài đặt hiển thị", icon: SlidersHorizontal, extra: true },
  { id: "google", label: "Hiển thị trên Google", icon: SearchIcon, extra: true },
];

export default function TourEditor({ id }) {
  const isNew = !id;
  const [t, setT] = useState(() => (isNew ? normalizeTour() : null));
  const [loadError, setLoadError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedSlug, setSavedSlug] = useState("");
  const [savedActive, setSavedActive] = useState(false);
  const slugTouched = useRef(!isNew);

  useUnsavedGuard(dirty);

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    api(`${PATH}/${id}`)
      .then((r) => {
        if (!alive) return;
        setT(normalizeTour(r.data));
        setSavedSlug(r.data.slug);
        setSavedActive(!!r.data.isActive);
      })
      .catch((err) => alive && setLoadError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [id, isNew]);

  const set = useCallback((patch) => {
    setT((x) => ({ ...x, ...(typeof patch === "function" ? patch(x) : patch) }));
    setDirty(true);
  }, []);

  const setSlug = useCallback(
    (slug) => {
      slugTouched.current = true;
      set({ slug });
    },
    [set],
  );

  const setContent = useCallback((lang, patch) => {
    setT((x) => {
      const next = { ...x, content: { ...x.content, [lang]: { ...x.content[lang], ...patch } } };
      if ("title" in patch && !slugTouched.current)
        next.slug = slugify(slugSource(titlesOf(next))).slice(0, 120);
      return next;
    });
    setDirty(true);
  }, []);

  /** Nhận kết quả “Dịch tự động”: thay phần chữ 3 ngôn ngữ; tour mới chưa có đường dẫn thì tạo từ tên */
  const applyTranslation = useCallback((next, from) => {
    setT((x) =>
      slugTouched.current && !x.slug
        ? { ...x, content: rekeyTranslated(next.content, from), seo: next.seo }
        : withTranslation(x, next, from),
    );
    setDirty(true);
  }, []);

  /** Bữa ăn không phụ thuộc ngôn ngữ: ghi cùng giá trị vào ngày thứ i của cả 3 bản */
  const setDayMeals = useCallback((i, meals) => {
    setT((x) => ({
      ...x,
      content: Object.fromEntries(
        LANG_KEYS.map((l) => {
          const c = x.content[l];
          if (i >= c.itinerary.length) return [l, c];
          return [
            l,
            { ...c, itinerary: c.itinerary.map((d, k) => (k === i ? { ...d, meals } : d)) },
          ];
        }),
      ),
    }));
    setDirty(true);
  }, []);

  const destinations = useOptions("/admin/destinations?limit=200&sort=order", (d) => ({
    value: d.slug,
    label: locText(d.name) || d.slug,
    region: d.region,
    hidden: d.isActive === false,
  }));
  const themes = useOptions("/admin/themes?limit=50&sort=order", (x) => ({
    value: x.slug,
    label: locText(x.name) || x.slug,
  }));
  const { canEdit } = usePermission("tours");

  if (isNew && !canEdit) return <NoAccess />;
  if (loadError)
    return (
      <div className="space-y-4">
        <BackLink />
        <Notice tone="error">{loadError}</Notice>
      </div>
    );
  if (!t) return <LoadingBlock text="Đang tải tour…" />;

  return (
    <EditorBody
      t={t}
      isNew={isNew}
      dirty={dirty}
      setDirty={setDirty}
      set={set}
      setSlug={setSlug}
      setContent={setContent}
      setDayMeals={setDayMeals}
      onTranslated={applyTranslation}
      savedSlug={savedSlug}
      savedActive={savedActive}
      onSaved={(doc) => {
        setSavedSlug(doc.slug);
        setSavedActive(!!doc.isActive);
      }}
      destinations={destinations}
      themes={themes}
    />
  );
}

function BackLink() {
  return (
    <Link
      href={`${ADMIN_BASE}/tours`}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
    >
      <ArrowLeft className="size-3.5" /> Danh sách tour
    </Link>
  );
}

function EditorBody({
  t,
  isNew,
  dirty,
  setDirty,
  set,
  setSlug,
  setContent,
  setDayMeals,
  onTranslated,
  savedSlug,
  savedActive,
  onSaved,
  destinations,
  themes,
}) {
  const router = useRouter();
  // một ngôn ngữ đang soạn dùng chung cho mọi mục có nội dung 3 thứ tiếng
  const [lang, setLang] = useState(DEFAULT_LANG);
  const { toast } = useUi();
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const images = usePendingImages(t);
  const { canEdit } = usePermission("tours"); // chỉ xem → form chỉ đọc, không có nút Lưu
  const active = useActiveSection(SECTIONS);
  const chipRef = useRef(null);
  // điện thoại: giữ nút của mục đang xem trong tầm nhìn của thanh mục cuộn ngang
  useEffect(() => {
    const el = chipRef.current;
    const bar = el?.parentElement;
    if (!el || !bar) return;
    bar.scrollTo({ left: el.offsetLeft - bar.clientWidth / 2 + el.clientWidth / 2 });
  }, [active]);

  /** Ngôn ngữ còn trống → tự dịch từ ngôn ngữ đã viết (tab đang chọn nếu có chữ) */
  const fillLanguages = async (tour) => {
    const from = pickSource(tour.content, lang, TRANSLATE_SKIP);
    const r = await autoFill.fill(translationSource(tour, from), {
      lang: from,
      skipKeys: TRANSLATE_SKIP,
    });
    if (!r.filled.length) return { tour, failed: r.failed, from };
    return { tour: withTranslation(tour, r.value, from), failed: r.failed, from };
  };

  const save = async () => {
    if (busy || autoFill.busy || images.busy || !canEdit) return;
    if (!anyLang(titlesOf(t)))
      return toast.error(
        "Vui lòng nhập tên tour ở ít nhất một ngôn ngữ (mục 2. Tên tour & thông tin chính).",
        {
          title: "Chưa lưu được",
        },
      );
    if (Number(t.nights) > Number(t.days))
      return toast.error(
        "Số đêm không được nhiều hơn số ngày (mục 2. Tên tour & thông tin chính) — VD: 3 ngày 2 đêm, tour trong ngày 1 ngày 0 đêm.",
        { title: "Chưa lưu được" },
      );
    // ảnh vừa chọn (ảnh bìa, album, ảnh trong nội dung) chỉ được lưu vào kho ảnh lúc này — trước khi dịch
    const base = await images.prepare(t);
    if (!base) return;
    if (base !== t) set(Object.fromEntries(Object.entries(base).filter(([k, v]) => v !== t[k])));
    const { tour, failed, from } = await fillLanguages(base);
    if (tour !== base) set({ content: tour.content, seo: tour.seo, slug: tour.slug });
    const body = toTourPayload(tour);
    const problem = validate(body);
    if (problem) return toast.error(problem, { title: "Chưa lưu được" });
    const r = await run(
      () =>
        isNew
          ? api(PATH, { method: "POST", body })
          : api(`${PATH}/${t.id}`, { method: "PUT", body }),
      isNew ? "Đã tạo tour" : "Đã lưu tour",
      // đổi đường dẫn → máy chủ sửa luôn danh sách tour trên trang chủ → xoá cache trang chủ
      { extraTags: !isNew && body.slug !== savedSlug ? ["settings"] : [] },
    );
    if (!r?.data) return;
    setDirty(false);
    onSaved(r.data);
    if (failed)
      autoFill.offerRetry(async (tr) => {
        const next = withTranslation(tour, tr, from);
        await api(`${PATH}/${r.data.id}`, { method: "PUT", body: toTourPayload(next) });
        if (isNew) return; // đã chuyển sang trang sửa → trang tự tải lại khi mở lần sau
        set({ content: next.content, seo: next.seo });
        setDirty(false);
      });
    if (isNew) {
      // tắt cảnh báo rời trang trước khi chuyển sang trang sửa
      window.__vlHasUnsaved = () => false;
      router.replace(`${ADMIN_BASE}/tours/${r.data.id}`);
    }
  };

  // Ctrl/Cmd + S để lưu
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Tiêu đề trang sửa: ưu tiên tên tiếng Việt (CMS dùng tiếng Việt) → tiếng Anh → tiếng Trung
  const title = t.content.vi.title || t.content.en.title || t.content.zh.title;

  return (
    <div className="pb-16">
      {/* Thanh tiêu đề: thẻ trắng bo tròn, nổi cách mép trên 12px khi cuộn (điện thoại: dưới thanh tiêu đề 64px + 8px)
          — cùng kiểu thanh công cụ ở trang Giới thiệu & chính sách, thẳng mép với nội dung bên dưới */}
      <div
        data-section-bar
        className="sticky z-30 mb-6 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/80 backdrop-blur max-lg:top-[4.5rem] sm:px-5 lg:top-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <BackLink />
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                {isNew ? title || "Tour mới" : title || "(chưa có tên)"}
              </h1>
              {t.code && <Badge tone="gray">{t.code}</Badge>}
              {!isNew && !savedActive && <Badge tone="gray">Đang ẩn</Badge>}
              {dirty && <Badge tone="amber">Chưa lưu</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <TourTranslate
                t={t}
                lang={lang}
                onTranslated={onTranslated}
                size="md"
                variant="secondary"
                className="hidden rounded-xl px-4 sm:inline-flex"
              />
            )}
            {!isNew && savedSlug && (
              <a
                href={`/tours/${savedSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                title={
                  savedActive
                    ? "Mở trang tour trên website"
                    : "Tour đang ẩn — khách sẽ không xem được"
                }
              >
                <ExternalLink className="size-4" />
                <span className="hidden sm:inline">Xem trên website</span>
              </a>
            )}
            {canEdit && (
              <Button
                icon={Save}
                onClick={save}
                loading={busy || autoFill.busy || images.busy}
                title="Lưu (Ctrl + S)"
              >
                {images.label || (isNew ? "Tạo tour" : "Lưu")}
              </Button>
            )}
          </div>
        </div>
        <nav className="-mx-1 mt-3 flex [scrollbar-width:none] gap-1 overflow-x-auto pb-0.5 lg:hidden">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              ref={s.id === active ? chipRef : undefined}
              href={`#${s.id}`}
              aria-current={s.id === active ? "location" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
                s.id === active
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-slate-600 ring-slate-200",
              )}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8">
        <nav className="hidden lg:block">
          <ul className="sticky top-28 space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon, extra }) => (
              <li
                key={id}
                className={cn(id === "tuy-chon" && "mt-3 border-t border-slate-200 pt-3")}
              >
                <a
                  href={`#${id}`}
                  aria-current={id === active ? "location" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition hover:bg-white hover:text-brand-700 hover:shadow-sm",
                    id === active
                      ? "bg-white font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100"
                      : extra
                        ? "text-slate-400"
                        : "text-slate-600",
                  )}
                >
                  <Icon className="size-4 shrink-0" /> {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <ReadOnlyArea readOnly={!canEdit} className="space-y-6">
            {/* Các mục xếp đúng thứ tự trang tour trên website, từ trên xuống */}
            <PhotosSection t={t} set={set} />
            <GeneralSection
              t={t}
              set={set}
              setContent={setContent}
              lang={lang}
              setLang={setLang}
              onTranslated={onTranslated}
              destinations={destinations}
              themes={themes}
            />
            <OverviewSection
              t={t}
              setContent={setContent}
              lang={lang}
              setLang={setLang}
              onTranslated={onTranslated}
            />
            <ItinerarySection
              t={t}
              setContent={setContent}
              setDayMeals={setDayMeals}
              lang={lang}
              setLang={setLang}
              onTranslated={onTranslated}
            />
            <IncludesSection
              t={t}
              setContent={setContent}
              lang={lang}
              setLang={setLang}
              onTranslated={onTranslated}
            />
            <PricingSection
              t={t}
              set={set}
              setContent={setContent}
              lang={lang}
              setLang={setLang}
              onTranslated={onTranslated}
            />
            <DepartureSection t={t} set={set} />
            <FaqSection
              t={t}
              setContent={setContent}
              lang={lang}
              setLang={setLang}
              onTranslated={onTranslated}
            />
            <ReviewsSection t={t} set={set} />
            <VideoSection t={t} set={set} />

            <div className="pt-4">
              <p className="text-sm font-bold text-slate-500">Cài đặt</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Các mục dưới đây không hiện thành nội dung trên trang tour.
              </p>
            </div>
            <ExtrasSection t={t} set={set} setSlug={setSlug} isNew={isNew} />
            <SeoSection t={t} set={set} lang={lang} setLang={setLang} onTranslated={onTranslated} />
          </ReadOnlyArea>
          {canEdit && (
            <div className="flex justify-end">
              <Button icon={Save} onClick={save} loading={busy || autoFill.busy || images.busy}>
                {images.label || (isNew ? "Tạo tour" : "Lưu thay đổi")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Mục đang xem (để tô sáng trên menu mục): mục cuối cùng có mép trên đã đi qua vạch ngay dưới thanh tiêu đề dính.
 * Cuộn tới đáy trang → mục cuối cùng (mục ngắn ở cuối có thể không bao giờ chạm vạch).
 */
function useActiveSection(sections) {
  const [active, setActive] = useState(sections[0].id);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // vạch = mép dưới thanh tiêu đề dính (điện thoại cao hơn vì có thêm thanh mục) + một khoảng nhỏ
      const bar = document.querySelector("[data-section-bar]")?.getBoundingClientRect().bottom ?? 0;
      const line = Math.max(bar + 80, Math.min(window.innerHeight / 3, 260));
      let cur = sections[0].id;
      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) cur = id;
      }
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4)
        cur = sections[sections.length - 1].id;
      setActive(cur);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);
  return active;
}

/** Khung mỗi mục: Card có id để nhảy tới từ menu mục */
function Section({ id, title, description, actions, children }) {
  return (
    <div id={id} className="scroll-mt-44 lg:scroll-mt-28">
      <Card title={title} description={description} actions={actions}>
        {children}
      </Card>
    </div>
  );
}

function NumInput({ value, onChange, prefix, suffix, className, ...props }) {
  return (
    <div className={cn("relative", className)}>
      {prefix && (
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-slate-400">
          {prefix}
        </span>
      )}
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={cn(prefix && "pl-7", suffix && "pr-12")}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Nhóm nút chọn 1 trong vài lựa chọn */
function Segmented({ options, value, onChange, label }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3.5 py-2 text-[13px] font-semibold transition",
            value === o.value
              ? "bg-white text-brand-800 shadow-sm"
              : "text-slate-500 hover:text-slate-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Nút “Dịch tự động” của tour: dịch toàn bộ phần chữ từ ngôn ngữ đang soạn sang 2 ngôn ngữ kia */
function TourTranslate({ t, lang, onTranslated, className, ...props }) {
  const { content, seo } = t;
  const value = useMemo(() => translationSource({ content, seo }, lang), [content, seo, lang]);
  return (
    <AutoTranslate
      lang={lang}
      value={value}
      onChange={(next) => onTranslated(next, lang)}
      skipKeys={TRANSLATE_SKIP}
      className={cn("rounded-full", className)}
      label={
        <>
          <span className="sm:hidden">Dịch</span>
          <span className="hidden sm:inline">Dịch tự động</span>
        </>
      }
      {...props}
    />
  );
}

/**
 * Nút dịch + tab chọn ngôn ngữ đang soạn (đặt ở góc phải mỗi mục có nội dung 3 thứ tiếng).
 * Chấm xanh = bản đó đã có tên tour (hoặc theo `filled` truyền vào).
 */
function TourLangTabs({ t, lang, setLang, onTranslated, filled }) {
  const dots =
    filled ?? filledOf(Object.fromEntries(LANG_KEYS.map((l) => [l, t.content[l].title])));
  return (
    <div className="flex items-center gap-2">
      <TourTranslate t={t} lang={lang} onTranslated={onTranslated} />
      <LangTabs value={lang} onChange={setLang} filled={dots} />
    </div>
  );
}

const langLabel = (lang) => LANGS.find((l) => l.key === lang)?.label ?? lang;

function Counter({ n, max }) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold tabular-nums",
        n > max ? "text-sun-600" : "text-slate-400",
      )}
    >
      {n}/{max}
    </span>
  );
}

/* =========================================================================
 * 2. Tên tour & thông tin chính (phần chữ đầu trang tour, cạnh khung giá)
 * ========================================================================= */

const GeneralSection = memoOn(
  function GeneralSection({
    t,
    set,
    setContent,
    lang,
    setLang,
    onTranslated,
    destinations,
    themes,
  }) {
    const c = t.content[lang];
    const hasOther = LANG_KEYS.some((l) => l !== lang && t.content[l].title);
    const known = new Set(destinations.map((d) => d.value));
    const unknown = destinations.length ? t.destinations.filter((s) => !known.has(s)) : [];
    const knownThemes = new Set(themes.map((x) => x.value));
    const themeOptions = [
      ...themes,
      ...(themes.length
        ? t.themes
            .filter((s) => !knownThemes.has(s))
            .map((s) => ({ value: s, label: `${s} (đã xoá)` }))
        : []),
    ];
    const setDest = (destinations) => set({ destinations });

    return (
      <Section
        id="thong-tin"
        title="2. Tên tour & thông tin chính"
        description="Phần chữ đầu trang tour, ngay dưới album ảnh. Viết bằng ngôn ngữ nào cũng được — khi lưu, các ngôn ngữ còn trống tự được dịch."
        actions={<TourLangTabs t={t} lang={lang} setLang={setLang} onTranslated={onTranslated} />}
      >
        <div className="space-y-5">
          {hasOther && !c.title && (
            <Notice>
              Bản {langLabel(lang)} còn trống — khi lưu sẽ tự dịch từ ngôn ngữ đã viết.
            </Notice>
          )}
          <Field
            label={
              <span className="flex w-full items-center justify-between gap-2">
                {`Tên tour (${langLabel(lang)})`}
                <Counter n={c.title.length} max={250} />
              </span>
            }
            required
          >
            <Input
              value={c.title}
              maxLength={250}
              placeholder={phOf(otherText(t, lang, "title"), "VD: Hà Nội – Vịnh Hạ Long 3 ngày")}
              onChange={(e) => setContent(lang, { title: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-[140px_140px_minmax(0,1fr)]">
            <Field label="Số ngày">
              <NumInput
                value={t.days}
                min={0}
                max={120}
                step={1}
                onChange={(days) => set({ days })}
              />
            </Field>
            <Field
              label="Số đêm"
              error={
                Number(t.nights) > Number(t.days)
                  ? "Số đêm không được nhiều hơn số ngày"
                  : undefined
              }
            >
              <NumInput
                value={t.nights}
                min={0}
                max={120}
                step={1}
                onChange={(nights) => set({ nights })}
              />
            </Field>
            <div className="col-span-2 flex min-h-[42px] items-center self-end sm:col-span-1">
              <Toggle
                checked={t.halfDay}
                onChange={(halfDay) => set({ halfDay })}
                label="Tour nửa ngày"
              />
            </div>
          </div>

          <Field label="Tour ghép hay tour riêng">
            <Segmented
              label="Tour ghép hay tour riêng"
              options={TOUR_TYPES}
              value={t.tourType}
              onChange={(tourType) => set({ tourType })}
            />
          </Field>

          <Field
            label={`Điểm đến (${t.destinations.length})`}
            hint="Hiện thành dòng điểm đến dưới tên tour."
          >
            {!destinations.length ? (
              <p className="text-xs text-slate-400">Đang tải danh sách điểm đến…</p>
            ) : (
              <div className="space-y-3 rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-100">
                {REGIONS.map((r) => {
                  const opts = destinations
                    .filter((d) => d.region === r.value)
                    .map((d) => ({
                      value: d.value,
                      label: d.hidden ? `${d.label} (ẩn)` : d.label,
                    }));
                  if (!opts.length) return null;
                  return (
                    <div key={r.value}>
                      <p className="mb-1.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                        {r.label}
                      </p>
                      <ChipSelect options={opts} value={t.destinations} onChange={setDest} />
                    </div>
                  );
                })}
                {unknown.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold tracking-wide text-sun-600 uppercase">
                      Điểm đến đã xoá — bấm để bỏ
                    </p>
                    <ChipSelect
                      options={unknown.map((s) => ({ value: s, label: s }))}
                      value={t.destinations}
                      onChange={setDest}
                    />
                  </div>
                )}
              </div>
            )}
          </Field>

          <Field
            label={`Loại tour / chủ đề (${t.themes.length}/8)`}
            hint="3 chủ đề đầu hiện thành nhãn nhỏ phía trên tên tour."
          >
            {!themes.length ? (
              <p className="text-xs text-slate-400">Đang tải danh sách chủ đề…</p>
            ) : (
              <ChipSelect
                options={themeOptions}
                value={t.themes}
                max={8}
                onChange={(themes) => set({ themes })}
              />
            )}
          </Field>
        </div>
      </Section>
    );
  },
  ["content", "seo", "days", "nights", "halfDay", "destinations", "themes", "tourType"],
);

/* =========================================================================
 * 3. Tổng quan (khung “Tổng quan”: mô tả ngắn → chặng đường → điểm nổi bật)
 * ========================================================================= */

const OverviewSection = memoOn(
  function OverviewSection({ t, setContent, lang, setLang, onTranslated }) {
    const c = t.content[lang];
    const setL = useCallback((patch) => setContent(lang, patch), [lang, setContent]);
    return (
      <Section
        id="tong-quan"
        title="3. Tổng quan"
        description="Khung đầu tiên bên dưới phần tên tour."
        actions={<TourLangTabs t={t} lang={lang} setLang={setLang} onTranslated={onTranslated} />}
      >
        <div className="space-y-6">
          <Field label="Mô tả ngắn (2–3 câu)">
            <Textarea
              value={c.summary}
              rows={4}
              maxLength={3000}
              placeholder={phOf(otherText(t, lang, "summary"))}
              onChange={(e) => setL({ summary: e.target.value })}
            />
          </Field>
          <div className="grid gap-6 xl:grid-cols-2">
            <Field label="Chặng đường" hint="Mỗi ngày một chặng. VD: Hanoi → Halong Bay">
              <StringList
                value={c.route}
                onChange={(route) => setL({ route })}
                addLabel="Thêm chặng"
                placeholder="Tên chặng"
              />
            </Field>
            <Field label="Điểm nổi bật">
              <StringList
                value={c.highlights}
                onChange={(highlights) => setL({ highlights })}
                addLabel="Thêm điểm nổi bật"
              />
            </Field>
          </div>
        </div>
      </Section>
    );
  },
  ["content", "seo"],
);

/* =========================================================================
 * 4. Lịch trình theo ngày
 * ========================================================================= */

const ItinerarySection = memoOn(
  function ItinerarySection({ t, setContent, setDayMeals, lang, setLang, onTranslated }) {
    const setL = useCallback((patch) => setContent(lang, patch), [lang, setContent]);
    // bản ngôn ngữ khác có nhiều ngày nhất → dùng làm khung (số ngày, bữa ăn) cho bản đang soạn
    const ref = LANG_KEYS.filter((l) => l !== lang).sort(
      (a, b) => t.content[b].itinerary.length - t.content[a].itinerary.length,
    )[0];
    return (
      <Section
        id="lich-trinh"
        title={`4. Lịch trình theo ngày (${t.content[lang].itinerary.length} ngày)`}
        description="Mỗi ngày một dòng. Giữ nút 6 chấm ở đầu dòng và kéo để đổi thứ tự."
        actions={<TourLangTabs t={t} lang={lang} setLang={setLang} onTranslated={onTranslated} />}
      >
        <ItineraryEditor
          key={`it-${lang}`}
          value={t.content[lang].itinerary}
          onChange={setL}
          onMeals={setDayMeals}
          enDays={t.content[ref].itinerary}
          refName={langLabel(ref)}
        />
      </Section>
    );
  },
  ["content", "seo"],
);

/* =========================================================================
 * 6. Giá tour (khung giá đầu trang + khung “Bảng giá”)
 * ========================================================================= */

/** Bảng nhỏ: mỗi dòng nhiều ô số */
function RowsEditor({ rows, onChange, columns, addLabel, makeRow }) {
  const setCell = (i, key, v) => onChange(rows.map((r, k) => (k === i ? { ...r, [key]: v } : r)));
  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div
          className="hidden gap-2 pr-11 sm:grid"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr))` }}
        >
          {columns.map((c) => (
            <span key={c.key} className="text-center text-[11px] font-semibold text-slate-500">
              {c.label}
            </span>
          ))}
        </div>
      )}
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-2">
          <div
            className="grid flex-1 grid-cols-3 gap-2"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr))` }}
          >
            {columns.map((c) => (
              <NumInput
                key={c.key}
                value={r[c.key]}
                prefix={c.prefix}
                suffix={c.suffix}
                min={c.min}
                max={c.max}
                placeholder={c.label}
                aria-label={c.label}
                onChange={(v) => setCell(i, c.key, v)}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 text-sun-600"
            aria-label="Xoá dòng"
            onClick={() => onChange(rows.filter((_, k) => k !== i))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        icon={Plus}
        onClick={() => onChange([...rows, makeRow(rows)])}
      >
        {addLabel}
      </Button>
    </div>
  );
}

/** Danh sách ngày dạng thẻ: thêm / xoá. `holiday` = ngày lễ Tết, có thể lặp lại hằng năm */
function DateChips({ value, onChange, holiday }) {
  const [draft, setDraft] = useState("");
  const [yearly, setYearly] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const add = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft)) return;
    const v = holiday && yearly ? draft.slice(5) : draft;
    if (!value.includes(v)) onChange([...value, v].sort());
    setDraft("");
  };
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <DateInput
          value={draft}
          aria-label="Chọn ngày"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          wrapperClassName="w-48 max-w-full"
        />
        {holiday && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 select-none">
            <input
              type="checkbox"
              checked={yearly}
              onChange={(e) => setYearly(e.target.checked)}
              className="size-4 accent-brand-700"
            />
            Lặp lại hằng năm
          </label>
        )}
        <Button variant="secondary" icon={Plus} onClick={add} disabled={!isISODate(draft)}>
          Thêm ngày
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((d) => {
            const past = d.length > 5 && d < today;
            return (
              <span
                key={d}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-2.5 text-xs font-semibold tabular-nums ring-1",
                  past
                    ? "bg-slate-100 text-slate-400 line-through ring-slate-200"
                    : "bg-brand-50 text-brand-800 ring-brand-100",
                )}
                title={past ? "Ngày đã qua" : undefined}
              >
                {fmtDay(d)}
                <button
                  type="button"
                  aria-label={`Bỏ ngày ${fmtDay(d)}`}
                  onClick={() => onChange(value.filter((x) => x !== d))}
                  className="grid size-5 place-items-center rounded-full hover:bg-white"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
          {value.some((d) => d.length > 5 && d < today) && (
            <button
              type="button"
              onClick={() => onChange(value.filter((d) => d.length <= 5 || d >= today))}
              className="text-xs font-semibold text-slate-500 underline hover:text-sun-600"
            >
              Bỏ các ngày đã qua
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Chưa có ngày nào.</p>
      )}
    </div>
  );
}

const TIER_GRID =
  "grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_36px] items-center gap-2";
const TIER_PRICES = [
  { key: "price", label: "Khách sạn 3★" },
  { key: "price4", label: "Khách sạn 4★" },
  { key: "price5", label: "Khách sạn 5★" },
];

/** Bảng giá theo số khách × hạng khách sạn (USD / người) */
function TierTable({ rows, onChange }) {
  const setCell = (i, key, v) => onChange(rows.map((r, k) => (k === i ? { ...r, [key]: v } : r)));
  const add = () => {
    const last = rows[rows.length - 1];
    const from = last ? intOr(last.maxPax, 1) + 1 : 1;
    onChange([...rows, { minPax: from, maxPax: from, price: "", price4: "", price5: "" }]);
  };
  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[540px] space-y-2">
            <div className={cn(TIER_GRID, "text-center text-[11px] font-semibold text-slate-500")}>
              <span>Số khách (từ – đến)</span>
              {TIER_PRICES.map((c) => (
                <span key={c.key}>{c.label}</span>
              ))}
              <span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className={TIER_GRID}>
                <div className="flex items-center gap-1.5">
                  <NumInput
                    value={r.minPax}
                    min={1}
                    max={100}
                    step={1}
                    aria-label="Từ (số khách)"
                    className="flex-1"
                    onChange={(v) => setCell(i, "minPax", v)}
                  />
                  <span className="text-slate-400">–</span>
                  <NumInput
                    value={r.maxPax}
                    min={1}
                    max={100}
                    step={1}
                    aria-label="Đến (số khách)"
                    className="flex-1"
                    onChange={(v) => setCell(i, "maxPax", v)}
                  />
                </div>
                {TIER_PRICES.map((c) => (
                  <NumInput
                    key={c.key}
                    value={r[c.key]}
                    prefix="$"
                    min={0}
                    aria-label={`Giá ${c.label}`}
                    onChange={(v) => setCell(i, c.key, v)}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sun-600"
                  aria-label="Xoá dòng"
                  onClick={() => onChange(rows.filter((_, k) => k !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <Button variant="secondary" size="sm" icon={Plus} onClick={add}>
        Thêm dòng giá
      </Button>
    </div>
  );
}

const CHILD_COLS = [
  { key: "minAge", label: "Từ tuổi", min: 0, max: 17 },
  { key: "maxAge", label: "Đến tuổi", min: 0, max: 17 },
  { key: "percent", label: "% giá người lớn", suffix: "%", min: 0, max: 100 },
];

const PricingSection = memoOn(
  function PricingSection({ t, set, setContent, lang, setLang, onTranslated }) {
    const p = t.pricing;
    const setP = (patch) => set((x) => ({ pricing: { ...x.pricing, ...patch } }));
    const price = numOrNull(t.price);
    const original = numOrNull(t.originalPrice);
    const discount = price && original > price ? Math.round((1 - price / original) * 100) : null;
    // bảng giá dạng chữ kiểu cũ: chỉ hiện khi tour đã có sẵn
    const hasOldTables = LANG_KEYS.some((l) => t.content[l].priceTables.length > 0);
    const setL = useCallback((patch) => setContent(lang, patch), [lang, setContent]);

    return (
      <Section
        id="gia"
        title="6. Giá tour"
        description="Giá bán hiện ở khung giá đầu trang; giá trẻ em, phụ thu và giá theo số khách hiện ở khung “Bảng giá”. Tất cả tính bằng USD cho mỗi người."
        actions={
          hasOldTables && (
            <TourLangTabs t={t} lang={lang} setLang={setLang} onTranslated={onTranslated} />
          )
        }
      >
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Giá gốc (gạch ngang)"
              hint="Bỏ trống nếu không giảm giá."
              error={
                original != null && (price == null || original <= price)
                  ? "Giá gốc phải lớn hơn giá bán"
                  : undefined
              }
            >
              <div className="flex items-center gap-2">
                <NumInput
                  value={t.originalPrice}
                  prefix="$"
                  min={0}
                  className="flex-1"
                  onChange={(originalPrice) => set({ originalPrice })}
                />
                {discount != null && <Badge tone="red">−{discount}%</Badge>}
              </div>
            </Field>
            <Field label="Giá bán" hint="Bỏ trống thì website hiện “Liên hệ”.">
              <NumInput value={t.price} prefix="$" min={0} onChange={(price) => set({ price })} />
            </Field>
          </div>

          {/* 2 cột cân nhau: giá trẻ em | phụ thu */}
          <div className="grid gap-x-10 gap-y-6 border-t border-slate-100 pt-6 xl:grid-cols-2">
            <Field
              label="Giá trẻ em theo độ tuổi"
              hint={
                p.childRates.length
                  ? "Trẻ ngoài các khoảng tuổi trên tính như người lớn."
                  : "Chưa nhập thì áp dụng: dưới 5 tuổi miễn phí, 5–10 tuổi 75%, từ 11 tuổi như người lớn."
              }
            >
              <RowsEditor
                rows={p.childRates}
                columns={CHILD_COLS}
                onChange={(childRates) => setP({ childRates })}
                addLabel="Thêm khoảng tuổi"
                makeRow={(rows) => {
                  const last = rows[rows.length - 1];
                  const from = last ? Math.min(17, intOr(last.maxAge, 0) + 1) : 0;
                  return { minAge: from, maxAge: 17, percent: "" };
                }}
              />
              {!p.childRates.length && (
                <button
                  type="button"
                  onClick={() => setP({ childRates: DEFAULT_CHILD_RATES.map((x) => ({ ...x })) })}
                  className="mt-2 block text-xs font-semibold text-brand-700 transition-colors hover:text-sun-600"
                >
                  Điền sẵn mức thông dụng để sửa
                </button>
              )}
            </Field>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[13px] font-semibold text-slate-700">Phụ thu</p>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Phòng đơn">
                    <NumInput
                      value={p.singleSupplement}
                      prefix="$"
                      min={0}
                      onChange={(singleSupplement) => setP({ singleSupplement })}
                    />
                  </Field>
                  <Field label="Lễ Tết / khách">
                    <NumInput
                      value={p.holidaySurcharge}
                      prefix="$"
                      min={0}
                      onChange={(holidaySurcharge) => setP({ holidaySurcharge })}
                    />
                  </Field>
                  <Field label="Lễ Tết theo %">
                    <NumInput
                      value={p.holidayPercent}
                      suffix="%"
                      min={0}
                      max={100}
                      onChange={(holidayPercent) => setP({ holidayPercent })}
                    />
                  </Field>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Phòng đơn: khi khách đi một mình. Lễ Tết: điền số tiền hoặc %, tuỳ cách tính.
                </p>
              </div>
              <Field label={`Các ngày lễ Tết tính phụ thu (${p.holidayDates.length})`}>
                <DateChips
                  holiday
                  value={p.holidayDates}
                  onChange={(holidayDates) => setP({ holidayDates })}
                />
              </Field>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <Field
              label="Giá theo số khách và hạng khách sạn"
              hint="Bỏ trống cột không áp dụng. Tour không chia hạng khách sạn: chỉ điền cột 3★."
            >
              <TierTable rows={p.groupTiers} onChange={(groupTiers) => setP({ groupTiers })} />
            </Field>
          </div>

          <PricePreview price={t.price} pricing={p} />

          {hasOldTables && (
            <PriceTablesEditor
              key={`pt-${lang}`}
              value={t.content[lang].priceTables}
              onChange={setL}
            />
          )}
        </div>
      </Section>
    );
  },
  ["price", "originalPrice", "pricing", "content", "seo"],
);

/* =========================================================================
 * 7. Ngày khởi hành (khung “Ngày khởi hành”)
 * ========================================================================= */

const DepartureSection = memoOn(
  function DepartureSection({ t, set }) {
    return (
      <Section id="khoi-hanh" title="7. Ngày khởi hành">
        <Field label="Ngày khởi hành">
          <div className="space-y-3">
            <Segmented
              label="Ngày khởi hành"
              options={DEPARTURES}
              value={t.departure}
              onChange={(departure) => set({ departure })}
            />
            {t.departure === "weekly" && (
              <div>
                <p className="mb-1.5 text-xs text-slate-500">Chọn các thứ có khởi hành:</p>
                <ChipSelect
                  options={WEEKDAYS}
                  value={t.departureDays}
                  onChange={(days) => set({ departureDays: cleanWeekdays(days) })}
                />
              </div>
            )}
            {t.departure === "dates" && (
              <DateChips
                value={t.departureDates}
                onChange={(departureDates) => set({ departureDates })}
              />
            )}
          </div>
        </Field>
      </Section>
    );
  },
  ["departure", "departureDays", "departureDates"],
);

const HOTEL_CLASSES = [
  { value: 3, label: "3★" },
  { value: 4, label: "4★" },
  { value: 5, label: "5★" },
];

function PricePreview({ price, pricing }) {
  const [adults, setAdults] = useState("2");
  const [ages, setAges] = useState("");
  const [date, setDate] = useState("");
  const [hotelClass, setHotelClass] = useState(3);
  const tour = useMemo(
    () => ({ price: numOrNull(price), pricing: cleanPricing(pricing) }),
    [price, pricing],
  );
  const hasClasses = tour.pricing.groupTiers.some((x) => x.price4 != null || x.price5 != null);
  const childAges = ages
    .split(/[,\s;]+/)
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17);
  const est = estimatePrice(tour, {
    adults: Math.max(1, intOr(adults, 1)),
    childAges,
    date,
    hotelClass: hasClasses ? hotelClass : 3,
  });

  return (
    <div className="rounded-2xl bg-brand-50/60 p-4 ring-1 ring-brand-100 sm:p-5">
      <p className="text-sm font-bold text-brand-900">Giá tạm tính thử</p>
      <p className="mt-0.5 text-xs text-brand-800/70">
        Xem trước website sẽ báo giá cho khách thế nào với các số vừa nhập.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Người lớn">
          <NumInput value={adults} min={1} max={100} onChange={setAdults} />
        </Field>
        <Field label="Tuổi trẻ em" hint="Cách nhau dấu phẩy, VD: 4, 8">
          <Input value={ages} onChange={(e) => setAges(e.target.value)} placeholder="Không có" />
        </Field>
        <Field label="Ngày khởi hành">
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {hasClasses && (
        <Field label="Hạng khách sạn" className="mt-3">
          <Segmented
            label="Hạng khách sạn"
            options={HOTEL_CLASSES}
            value={hotelClass}
            onChange={setHotelClass}
          />
        </Field>
      )}
      {est.total == null ? (
        <p className="mt-3 text-sm text-slate-500">Chưa có giá — website sẽ hiện “Liên hệ”.</p>
      ) : (
        <div className="mt-3 rounded-xl bg-white p-3 text-sm ring-1 ring-brand-100">
          <ul className="space-y-1 text-slate-600">
            {est.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{priceLineVi(l.label)}</span>
                <span className="tabular-nums">{fmtUSD(l.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
            <span>Tổng tạm tính</span>
            <span className="tabular-nums">{fmtUSD(est.total)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * 5. Bao gồm / Không bao gồm (kèm chính sách trẻ em, ghi chú ở cuối khung)
 * ========================================================================= */

const IncludesSection = memoOn(
  function IncludesSection({ t, setContent, lang, setLang, onTranslated }) {
    const c = t.content[lang];
    return (
      <Section
        id="bao-gom"
        title="5. Bao gồm / Không bao gồm"
        description="Mỗi ý một dòng. Chính sách trẻ em và ghi chú hiện ở cuối cùng khung này."
        actions={<TourLangTabs t={t} lang={lang} setLang={setLang} onTranslated={onTranslated} />}
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <Field label="Giá tour bao gồm">
            <StringList
              value={c.included}
              onChange={(included) => setContent(lang, { included })}
              addLabel="Thêm dòng"
              multiline
            />
          </Field>
          <Field label="Không bao gồm">
            <StringList
              value={c.excluded}
              onChange={(excluded) => setContent(lang, { excluded })}
              addLabel="Thêm dòng"
              multiline
            />
          </Field>
          <Field label="Chính sách trẻ em (dạng chữ)">
            <Textarea
              value={c.childPolicy}
              rows={4}
              maxLength={5000}
              placeholder={phOf(otherText(t, lang, "childPolicy"))}
              onChange={(e) => setContent(lang, { childPolicy: e.target.value })}
            />
          </Field>
          <Field label="Ghi chú">
            <Textarea
              value={c.notes}
              rows={4}
              maxLength={10000}
              placeholder={phOf(otherText(t, lang, "notes"))}
              onChange={(e) => setContent(lang, { notes: e.target.value })}
            />
          </Field>
        </div>
      </Section>
    );
  },
  ["content", "seo"],
);

/* =========================================================================
 * 8. Câu hỏi thường gặp
 * ========================================================================= */

const FaqSection = memoOn(
  function FaqSection({ t, setContent, lang, setLang, onTranslated }) {
    const setL = useCallback((patch) => setContent(lang, patch), [lang, setContent]);
    return (
      <Section
        id="hoi-dap"
        title={`8. Câu hỏi thường gặp (${t.content[lang].faqs.length})`}
        description="Giữ nút 6 chấm ở đầu dòng và kéo để đổi thứ tự."
        actions={<TourLangTabs t={t} lang={lang} setLang={setLang} onTranslated={onTranslated} />}
      >
        <FaqEditor key={`fq-${lang}`} value={t.content[lang].faqs} onChange={setL} />
      </Section>
    );
  },
  ["content", "seo"],
);

/* =========================================================================
 * 1. Ảnh bìa & album (đầu trang tour)
 * ========================================================================= */

const MIN_PHOTOS = 6;

const PhotosSection = memoOn(
  function PhotosSection({ t, set }) {
    const missing = Math.max(0, MIN_PHOTOS - t.gallery.length);
    return (
      <Section
        id="anh"
        title="1. Ảnh bìa & album"
        description="Album hiện ngay đầu trang tour; ảnh bìa là ảnh đại diện của tour."
      >
        {/* album | ảnh bìa đặt cạnh nhau trên màn rộng; album (to hơn) đứng trước như trên trang tour */}
        <div className="grid gap-x-8 gap-y-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          <Field
            label={`Album ảnh (${t.gallery.length}/40)`}
            hint={
              missing
                ? `Hiện đầu trang tour. Nên có tối thiểu ${MIN_PHOTOS} ảnh ngang — còn thiếu ${missing} ảnh.`
                : `Hiện đầu trang tour. Nên có tối thiểu ${MIN_PHOTOS} ảnh ngang.`
            }
          >
            <GalleryField
              value={t.gallery}
              onChange={(gallery) => set({ gallery })}
              folder="tours"
              max={40}
              onSetCover={(image) => set({ image })}
            />
          </Field>
          <Field
            label="Ảnh bìa"
            hint="Hiện ở thẻ tour (khung gần vuông), khi chia sẻ link và ở đầu trang nếu album trống. Ảnh ngang, chủ thể ở giữa."
          >
            <ImageField value={t.image} onChange={(image) => set({ image })} folder="tours" />
          </Field>
        </div>
      </Section>
    );
  },
  ["image", "gallery"],
);

/* =========================================================================
 * 10. Video (khung video cuối trang tour)
 * ========================================================================= */

const VideoSection = memoOn(
  function VideoSection({ t, set }) {
    return (
      <Section
        id="video"
        title="10. Video"
        description="Khung video ở cuối trang tour, sau phần đánh giá."
      >
        <Field
          label={`Video review (${t.videos.length}/10)`}
          hint="Dán link YouTube hoặc Google Drive — video đầu tiên hiện lớn nhất trong trang tour."
        >
          <div className="space-y-3">
            <VideoListField value={t.videos} onChange={(videos) => set({ videos })} max={10} />
            <details className="group/help">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-sun-600 [&::-webkit-details-marker]:hidden">
                Cách lấy link video YouTube / Google Drive
              </summary>
              <div className="mt-2">
                <VideoHelp />
              </div>
            </details>
          </div>
        </Field>
      </Section>
    );
  },
  ["videos"],
);

/** Hàng tiêu đề nhóm con trong một mục */
function SubHead({ title, hint, children }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-6">
      <div>
        <p className="text-[13px] font-bold text-slate-800">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Nút xoá + thu gọn / mở rộng của một phần tử (đổi thứ tự bằng cách kéo tay nắm ở đầu dòng) */
function ItemTools({ i, onRemove, open, onToggle }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(i)}
        aria-label="Xoá"
        title="Xoá"
        className="text-sun-600"
      >
        <Trash2 className="size-4" />
      </Button>
      {onToggle && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={open ? "Thu gọn" : "Mở rộng"}
        >
          <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
        </Button>
      )}
    </div>
  );
}

const ItineraryEditor = memo(function ItineraryEditor({
  value,
  onChange,
  onMeals,
  enDays,
  refName,
}) {
  const { confirm } = useUi();
  const [open, setOpen] = useState(() => new Set(value.length <= 2 ? value.map((d) => d._k) : []));
  const emit = (itinerary) => onChange({ itinerary });
  const toggle = (k) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const setDay = (i, patch) => emit(value.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  const add = () => {
    const last = value[value.length - 1];
    const d = {
      _k: newKey(),
      day: last ? intOr(last.day, value.length) + 1 : 1,
      title: "",
      html: "",
      // lấy sẵn bữa ăn của ngày tương ứng bên bản ngôn ngữ khác
      meals: cleanMeals(enDays?.[value.length]?.meals),
      overnight: "",
    };
    setOpen((s) => new Set(s).add(d._k));
    emit([...value, d]);
  };
  const remove = async (i) => {
    const d = value[i];
    if (
      (d.title || d.html || d.overnight) &&
      !(await confirm({
        title: "Xoá ngày này?",
        message: `Xoá “Ngày ${d.day}${d.title ? ` – ${d.title}` : ""}” khỏi lịch trình.`,
        confirmText: "Xoá",
        danger: true,
      }))
    )
      return;
    emit(value.filter((_, k) => k !== i));
  };
  const renumber = () => emit(value.map((d, i) => ({ ...d, day: i + 1 })));
  // đang đánh số liền 1, 2, 3… thì kéo đổi chỗ xong tự đánh số lại; tự đặt số riêng thì giữ nguyên
  const sequential = value.every((d, i) => intOr(d.day, -1) === i + 1);
  const reorder = (next) => emit(sequential ? next.map((d, i) => ({ ...d, day: i + 1 })) : next);
  const copyFrame = () => {
    const days = enDays.map((d) => ({
      _k: newKey(),
      day: d.day,
      title: "",
      html: "",
      meals: cleanMeals(d.meals),
      overnight: "",
    }));
    setOpen(new Set());
    emit(days);
  };
  const allOpen = value.length > 0 && value.every((d) => open.has(d._k));

  return (
    <div>
      {value.length > 1 && (
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(allOpen ? new Set() : new Set(value.map((d) => d._k)))}
          >
            {allOpen ? "Thu gọn tất cả" : "Mở tất cả"}
          </Button>
          <Button variant="ghost" size="sm" onClick={renumber}>
            Đánh số lại 1, 2, 3…
          </Button>
        </div>
      )}
      {!value.length && enDays?.length > 0 && (
        <Notice className="mb-3">
          Bản {refName} có {enDays.length} ngày.{" "}
          <button type="button" onClick={copyFrame} className="font-semibold underline">
            Tạo sẵn {enDays.length} ngày giống bản {refName}
          </button>{" "}
          để viết từng ngày (hoặc để trống — khi lưu sẽ tự dịch).
        </Notice>
      )}
      {!value.length && !enDays?.length && (
        <p className="mb-3 text-sm text-slate-500">Chưa có ngày nào — bấm “Thêm ngày”.</p>
      )}
      <Sortable items={value} getId={byKey} onReorder={reorder} className="space-y-3">
        {(d, i, drag) => {
          const isOpen = open.has(d._k);
          const enDay = enDays?.[i];
          return (
            <div
              className={cn(
                "rounded-xl bg-white ring-1 transition",
                drag.dragging ? "ring-brand-400" : isOpen ? "ring-brand-200" : "ring-slate-200",
              )}
            >
              <div className="flex flex-wrap items-center gap-2 p-2 sm:flex-nowrap">
                <div className="flex items-center gap-1.5">
                  <DragHandle {...drag.handle} />
                  <span className="text-xs font-semibold text-slate-500">Ngày</span>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={d.day}
                    onChange={(e) => setDay(i, { day: e.target.value })}
                    className="w-16 px-2 text-center"
                    aria-label="Ngày thứ mấy"
                  />
                </div>
                <Input
                  value={d.title}
                  maxLength={300}
                  placeholder={
                    enDay?.title ? `${refName}: ${enDay.title}` : "Tiêu đề, VD: Hanoi – Halong Bay"
                  }
                  aria-label="Tiêu đề"
                  onChange={(e) => setDay(i, { title: e.target.value })}
                  className="min-w-0 flex-1 basis-48"
                />
                <ItemTools i={i} onRemove={remove} open={isOpen} onToggle={() => toggle(d._k)} />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3 pb-2.5 sm:pl-12">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Bữa ăn</span>
                  <ChipSelect
                    options={MEALS}
                    value={d.meals}
                    onChange={(meals) => onMeals(i, cleanMeals(meals))}
                  />
                </div>
                <div className="flex min-w-0 flex-1 basis-56 items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold text-slate-500">Nghỉ đêm</span>
                  <Input
                    value={d.overnight}
                    maxLength={200}
                    placeholder={enDay?.overnight || "VD: Hanoi"}
                    aria-label="Nghỉ đêm"
                    onChange={(e) => setDay(i, { overnight: e.target.value })}
                    className="min-w-0 flex-1"
                  />
                </div>
              </div>
              {isOpen ? (
                <div className="px-2 pb-2">
                  <RichText
                    value={d.html}
                    onChange={(html) => setDay(i, { html })}
                    folder="tours"
                    minHeight={160}
                    placeholder="Hoạt động trong ngày…"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(d._k)}
                  className="block w-full truncate border-t border-slate-100 px-3 py-2.5 text-left text-xs text-slate-400 hover:text-slate-600"
                >
                  {htmlPreview(d.html) || "Chưa có hoạt động — bấm để soạn"}
                </button>
              )}
            </div>
          );
        }}
      </Sortable>
      <Button variant="secondary" size="sm" icon={ListPlus} onClick={add} className="mt-3">
        Thêm ngày
      </Button>
    </div>
  );
});

const PriceTablesEditor = memo(function PriceTablesEditor({ value, onChange }) {
  const emit = (priceTables) => onChange({ priceTables });
  const setTable = (i, patch) => emit(value.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <SubHead
        title={`Bảng giá dạng chữ (${value.length})`}
        hint="Kiểu bảng cũ, hiện nguyên văn trong trang tour. Tour mới nên dùng bảng giá ở mục 3."
      />
      <Sortable items={value} getId={byKey} onReorder={(next) => emit(next)} className="space-y-4">
        {(tb, i, drag) => (
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:p-4">
            <div className="flex items-start gap-2">
              <DragHandle {...drag.handle} className="mt-1.5 -ml-1" />
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <Input
                  value={tb.heading}
                  maxLength={300}
                  placeholder="Tiêu đề bảng (VD: Superior Hotels)"
                  onChange={(e) => setTable(i, { heading: e.target.value })}
                />
                <Input
                  value={tb.period}
                  maxLength={300}
                  placeholder="Thời gian áp dụng (VD: 01/01 – 12/31/2027)"
                  onChange={(e) => setTable(i, { period: e.target.value })}
                />
              </div>
              <ItemTools i={i} onRemove={(k) => emit(value.filter((_, x) => x !== k))} />
            </div>
            <GridEditor rows={tb.rows} onChange={(rows) => setTable(i, { rows })} />
          </div>
        )}
      </Sortable>
      <Button
        variant="secondary"
        size="sm"
        icon={Plus}
        className="mt-3"
        disabled={value.length >= 20}
        onClick={() =>
          emit([
            ...value,
            {
              _k: newKey(),
              heading: "",
              period: "",
              rows: [
                ["Pax", "Price"],
                ["", ""],
              ],
            },
          ])
        }
      >
        Thêm bảng giá
      </Button>
    </div>
  );
});

/** Lưới ô chữ: thêm / xoá dòng, cột (tối đa 60 dòng × 12 cột) */
function GridEditor({ rows, onChange }) {
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const grid = rows.map((r) => Array.from({ length: cols }, (_, c) => r[c] ?? ""));
  const setCell = (ri, ci, v) =>
    onChange(grid.map((r, k) => (k === ri ? r.map((x, c) => (c === ci ? v : x)) : r)));
  const addRow = () => onChange([...grid, Array(cols).fill("")]);
  const addCol = () => onChange((grid.length ? grid : [[]]).map((r) => [...r, ""]));
  const removeRow = (ri) => onChange(grid.filter((_, k) => k !== ri));
  const removeCol = (ci) => onChange(grid.map((r) => r.filter((_, c) => c !== ci)));

  return (
    <div className="mt-3">
      {grid.length > 0 && (
        <div className="overflow-x-auto rounded-lg ring-1 ring-slate-100">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50">
                {Array.from({ length: cols }, (_, c) => (
                  <th key={c} className="p-1 text-center font-semibold text-slate-400">
                    <span className="inline-flex items-center gap-0.5">
                      Cột {c + 1}
                      {cols > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCol(c)}
                          aria-label={`Xoá cột ${c + 1}`}
                          className="grid size-5 place-items-center rounded text-slate-400 hover:bg-sun-50 hover:text-sun-600"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </span>
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {grid.map((r, ri) => (
                <tr key={ri} className={cn(ri === 0 && "bg-brand-50/40")}>
                  {r.map((cell, ci) => (
                    <td key={ci} className="min-w-28 p-1">
                      <input
                        value={cell}
                        maxLength={2000}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        className={cn(
                          "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
                          ri === 0 && "font-semibold",
                        )}
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      aria-label={`Xoá dòng ${ri + 1}`}
                      className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-sun-50 hover:text-sun-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={Rows3}
          onClick={addRow}
          disabled={grid.length >= 60}
        >
          Thêm dòng
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={Columns3}
          onClick={addCol}
          disabled={cols >= 12 && grid.length > 0}
        >
          Thêm cột
        </Button>
      </div>
    </div>
  );
}

const FaqEditor = memo(function FaqEditor({ value, onChange }) {
  const [open, setOpen] = useState(() => new Set());
  const emit = (faqs) => onChange({ faqs });
  const setItem = (i, patch) => emit(value.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const toggle = (k) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  return (
    <div>
      {!value.length && (
        <p className="mb-3 text-sm text-slate-500">Chưa có câu hỏi nào — bấm “Thêm câu hỏi”.</p>
      )}
      <Sortable items={value} getId={byKey} onReorder={(next) => emit(next)} className="space-y-3">
        {(f, i, drag) => {
          const isOpen = open.has(f._k);
          return (
            <div
              className={cn(
                "rounded-xl bg-white ring-1",
                drag.dragging ? "ring-brand-400" : isOpen ? "ring-brand-200" : "ring-slate-200",
              )}
            >
              <div className="flex items-center gap-1.5 p-2">
                <DragHandle {...drag.handle} />
                <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">
                  {i + 1}
                </span>
                <Input
                  value={f.q}
                  maxLength={500}
                  placeholder="Câu hỏi"
                  onChange={(e) => setItem(i, { q: e.target.value })}
                  className="min-w-0 flex-1"
                />
                <ItemTools
                  i={i}
                  onRemove={(k) => emit(value.filter((_, x) => x !== k))}
                  open={isOpen}
                  onToggle={() => toggle(f._k)}
                />
              </div>
              {isOpen ? (
                <div className="px-2 pb-2">
                  <RichText
                    value={f.a}
                    onChange={(a) => setItem(i, { a })}
                    folder="tours"
                    minHeight={110}
                    placeholder="Câu trả lời…"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(f._k)}
                  className="block w-full truncate px-3 pb-2.5 text-left text-xs text-slate-400 hover:text-slate-600 sm:pl-[4.75rem]"
                >
                  {htmlPreview(f.a) || "Chưa có câu trả lời — bấm để soạn"}
                </button>
              )}
            </div>
          );
        }}
      </Sortable>
      <Button
        variant="secondary"
        size="sm"
        icon={Plus}
        className="mt-3"
        disabled={value.length >= 40}
        onClick={() => {
          const f = { _k: newKey(), q: "", a: "" };
          setOpen((s) => new Set(s).add(f._k));
          emit([...value, f]);
        }}
      >
        Thêm câu hỏi
      </Button>
    </div>
  );
});

/* =========================================================================
 * Cài đặt hiển thị (khách không nhìn thấy)
 * ========================================================================= */

const ExtrasSection = memoOn(
  function ExtrasSection({ t, set, setSlug, isNew }) {
    return (
      <Section
        id="tuy-chon"
        title="Cài đặt hiển thị"
        description="Mã tour, đường dẫn trang, thứ tự và các nhãn — không hiện thành nội dung trên trang tour."
      >
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)_140px]">
            <Field label="Mã tour" hint="VD: VLT-HN03">
              <Input
                value={t.code}
                maxLength={30}
                onChange={(e) => set({ code: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field
              label="Đường dẫn trang"
              required
              hint={
                isNew
                  ? "Tự tạo từ tên tour, có thể sửa."
                  : "Khi đổi, đường dẫn cũ vẫn tự chuyển sang trang mới."
              }
            >
              <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
                <span className="flex items-center bg-slate-50 px-3 text-sm text-slate-400">
                  /tours/
                </span>
                <input
                  value={t.slug}
                  maxLength={120}
                  aria-label="Đường dẫn trang"
                  onChange={(e) =>
                    setSlug(
                      slugify(e.target.value).slice(0, 120) +
                        (/[-\s]$/.test(e.target.value) ? "-" : ""),
                    )
                  }
                  onBlur={() => setSlug(slugify(t.slug))}
                  className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none"
                />
              </div>
            </Field>
            <Field label="Thứ tự hiển thị" hint="Số nhỏ hiện trước">
              <NumInput value={t.rank} min={0} step={1} onChange={(rank) => set({ rank })} />
            </Field>
          </div>

          <div className="grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
            <Toggle
              checked={t.isActive}
              onChange={(isActive) => set({ isActive })}
              label="Hiện trên website"
              hint="Tắt để tạm ẩn tour"
            />
            <Toggle
              checked={t.cruise}
              onChange={(cruise) => set({ cruise })}
              label="Tour du thuyền"
              hint="Gắn nhãn du thuyền cho tour"
            />
            <Toggle
              checked={t.featured}
              onChange={(featured) => set({ featured })}
              label="Đánh dấu “Tour nổi bật”"
              hint="Có thể hiện ở khối “Tour nổi bật” trên trang chủ"
            />
            <Toggle
              checked={t.featuredLong}
              onChange={(featuredLong) => set({ featuredLong })}
              label="Đánh dấu “Tour dài ngày”"
              hint="Có thể hiện ở khối “Tour dài ngày” trên trang chủ"
            />
            <p className="text-xs leading-relaxed text-slate-500 sm:col-span-2">
              Trang chủ hiện các tour bạn chọn ở mục{" "}
              <Link
                href="/admin/home"
                className="font-semibold text-brand-700 underline underline-offset-2"
              >
                Trang chủ
              </Link>
              ; nếu khối đó chưa chọn tour nào, website tự hiện các tour được đánh dấu ở đây.
            </p>
          </div>
        </div>
      </Section>
    );
  },
  ["code", "slug", "rank", "isActive", "cruise", "featured", "featuredLong"],
);

/* =========================================================================
 * 9. Đánh giá của khách
 * ========================================================================= */

const ReviewsSection = memoOn(
  function ReviewsSection({ t, set }) {
    const reviews = t.reviews;
    const emit = (next) => set({ reviews: next });
    const setItem = (i, patch) => emit(reviews.map((x, k) => (k === i ? { ...x, ...patch } : x)));
    const avg = reviews.length
      ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length
      : 0;
    return (
      <Section
        id="danh-gia"
        title="9. Đánh giá của khách"
        description="Nên ghi rõ nguồn (TripAdvisor, Google…)."
        actions={
          reviews.length > 0 && (
            <Badge tone="amber">
              ★ {avg.toFixed(1)} · {reviews.length} đánh giá
            </Badge>
          )
        }
      >
        {!reviews.length && (
          <p className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <MessageSquareQuote className="size-4" /> Chưa có đánh giá nào.
          </p>
        )}
        <Sortable items={reviews} getId={byKey} onReorder={emit} className="space-y-3">
          {(r, i, drag) => (
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:p-4">
              <div className="flex items-start gap-2">
                <DragHandle {...drag.handle} className="mt-1.5 -ml-1" />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 lg:grid-cols-5">
                  <Input
                    value={r.name}
                    maxLength={100}
                    placeholder="Tên khách"
                    onChange={(e) => setItem(i, { name: e.target.value })}
                    className="col-span-2 lg:col-span-1"
                  />
                  <Input
                    value={r.country}
                    maxLength={80}
                    placeholder="Quốc gia"
                    onChange={(e) => setItem(i, { country: e.target.value })}
                  />
                  <Select
                    value={r.rating}
                    onChange={(e) => setItem(i, { rating: Number(e.target.value) })}
                    aria-label="Số sao"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {"★".repeat(n)} ({n})
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={r.date}
                    maxLength={20}
                    placeholder="Thời gian (VD: 2026-10)"
                    onChange={(e) => setItem(i, { date: e.target.value })}
                  />
                  <Input
                    value={r.source}
                    maxLength={40}
                    placeholder="Nguồn"
                    onChange={(e) => setItem(i, { source: e.target.value })}
                  />
                </div>
                <ItemTools i={i} onRemove={(k) => emit(reviews.filter((_, x) => x !== k))} />
              </div>
              <Textarea
                value={r.text}
                rows={3}
                maxLength={3000}
                placeholder="Nội dung đánh giá"
                onChange={(e) => setItem(i, { text: e.target.value })}
                className="mt-2"
              />
            </div>
          )}
        </Sortable>
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          className="mt-3"
          disabled={reviews.length >= 50}
          onClick={() =>
            emit([
              ...reviews,
              { _k: newKey(), name: "", country: "", rating: 5, text: "", date: "", source: "" },
            ])
          }
        >
          Thêm đánh giá
        </Button>
      </Section>
    );
  },
  ["reviews"],
);

/* =========================================================================
 * Hiển thị trên Google
 * ========================================================================= */

const SeoSection = memoOn(
  function SeoSection({ t, set, lang, setLang, onTranslated }) {
    const s = t.seo[lang];
    const c = t.content[lang];
    const other = { title: otherText(t, lang, "title"), summary: otherText(t, lang, "summary") };
    const setS = (patch) =>
      set((x) => ({ seo: { ...x.seo, [lang]: { ...x.seo[lang], ...patch } } }));
    const shownTitle = s.title || c.title || other.title || "Tên tour";
    const shownDesc = (s.description || c.summary || other.summary || "").slice(0, 160);
    const filled = filledOf(
      Object.fromEntries(LANG_KEYS.map((l) => [l, t.seo[l].title || t.seo[l].description])),
    );

    return (
      <Section
        id="google"
        title="Hiển thị trên Google"
        description="Bỏ trống thì tự dùng tên tour và mô tả ngắn."
        actions={
          <TourLangTabs
            t={t}
            lang={lang}
            setLang={setLang}
            onTranslated={onTranslated}
            filled={filled}
          />
        }
      >
        <div className="space-y-4">
          <Field
            label={
              <span className="flex w-full items-center justify-between gap-2">
                Tiêu đề trên Google <Counter n={s.title.length} max={60} />
              </span>
            }
          >
            <Input
              value={s.title}
              maxLength={200}
              placeholder={c.title || other.title}
              onChange={(e) => setS({ title: e.target.value })}
            />
          </Field>
          <Field
            label={
              <span className="flex w-full items-center justify-between gap-2">
                Mô tả trên Google <Counter n={s.description.length} max={160} />
              </span>
            }
          >
            <Textarea
              value={s.description}
              rows={3}
              maxLength={500}
              placeholder={(c.summary || other.summary).slice(0, 160)}
              onChange={(e) => setS({ description: e.target.value })}
            />
          </Field>
          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
              Xem trước trên Google
            </p>
            <p className="truncate text-xs text-emerald-700">
              vietlooktravel.com › tours › {t.slug || "…"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[17px] text-[#1a0dab]">{shownTitle}</p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-600">
              {shownDesc || "Chưa có mô tả."}
            </p>
          </div>
        </div>
      </Section>
    );
  },
  ["seo", "content", "slug"],
);
