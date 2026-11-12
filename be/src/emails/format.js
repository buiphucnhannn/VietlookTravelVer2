import {
  AIRPORT_NAME,
  ENUM,
  FIELD_LABEL,
  ON_REQUEST,
  OPTION_LISTS,
  PACKAGE_WORD,
  PLACES,
  PLANNER_OPTIONS,
  REGION_NAME,
  TYPE_FIELD_LABEL,
  VEHICLE_NAME,
  WORDS,
} from "./labels.js";

/**
 * Biến 1 đơn / yêu cầu thành dữ liệu dễ đọc cho email (không bao giờ in tên trường gốc / mã thô).
 * Kết quả CHƯA escape — lớp HTML (templates.js) escape khi in.
 */

export const LANGS = ["vi", "en", "zh"];
export const pickLang = (l) => (LANGS.includes(l) ? l : "en");

/** Chuỗi đa ngôn ngữ { en, zh, vi } → đúng ngôn ngữ (trống → tiếng Anh → bất kỳ) */
export const tr = (obj, lang) =>
  obj && typeof obj === "object"
    ? obj[lang] || obj.en || Object.values(obj).find(Boolean) || ""
    : String(obj ?? "");

/** "returnTime" / "pickup_point" → "Return time" / "Pickup point" */
export const humanize = (key) =>
  String(key)
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

/** Đường dẫn "hanoi-to-halong-bay-private-car-transfer" → "Hanoi to halong bay private car transfer" */
export const humanizeSlug = (slug) => humanize(String(slug).replace(/-/g, " "));

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_KEYS = new Set(["date", "returnDate", "entryDate", "arrival", "departureDate"]);

/*
 * Ngày trong email theo ngôn ngữ người đọc (khớp website — fe/src/lib/dates.js):
 *  vi (và mọi email gửi nhân viên công ty) dd/mm/yyyy · en mm/dd/yyyy · zh yyyy年m月d日.
 * Ngày + giờ → thêm " HH:mm" (24h, giờ Việt Nam).
 */

/** y, m, d (chuỗi 2 chữ số) → chữ ngày theo ngôn ngữ */
function ymdText(y, m, d, lang) {
  if (lang === "zh") return `${y}年${Number(m)}月${Number(d)}日`;
  if (lang === "en") return `${m}/${d}/${y}`;
  return `${d}/${m}/${y}`;
}

/**
 * "2026-12-20" → vi "20/12/2026" · en "12/20/2026" · zh "2026年12月20日"
 * (đọc thẳng từ chuỗi → không lệch ngày theo múi giờ)
 */
export function fmtDate(iso, lang = "vi") {
  const s = String(iso ?? "");
  if (!ISO_DATE.test(s)) return s;
  const [y, m, d] = s.split("-");
  return ymdText(y, m, d, lang);
}

const VN_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Thời điểm (giờ Việt Nam) → vi "27/11/2026 14:05" · en "11/27/2026 14:05 (GMT+7)"
 * · zh "2026年11月27日 14:05（越南时间）"
 */
export function fmtDateTime(value, lang = "vi") {
  const dt = value ? new Date(value) : null;
  if (!dt || Number.isNaN(dt.getTime())) return "";
  const p = Object.fromEntries(VN_PARTS.formatToParts(dt).map((x) => [x.type, x.value]));
  const hm = `${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
  const text = `${ymdText(p.year, p.month, p.day, lang)} ${hm}`;
  if (lang === "zh") return `${text}（越南时间）`;
  if (lang === "en") return `${text} (GMT+7)`;
  return text;
}

/** 1120 → "$1,120" */
export const fmtMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v)
    ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : String(n ?? "");
};

/** Chữ của danh sách lựa chọn (gửi theo ngôn ngữ trang) → đúng ngôn ngữ người đọc */
export function translateOption(s, lang) {
  for (const list of OPTION_LISTS)
    for (const l of LANGS) {
      const i = list[l].indexOf(s);
      if (i >= 0) return list[lang][i] ?? s;
    }
  return s;
}

/**
 * Lựa chọn của form thiết kế tour (tripType / interests) → mã cố định: nhận cả mã lẫn chữ cũ theo
 * ngôn ngữ khách (đơn cũ, trang web cũ còn mở). Không nhận ra → giữ nguyên.
 */
export function optionCode(key, s) {
  const options = PLANNER_OPTIONS[key];
  if (!options || typeof s !== "string" || Object.hasOwn(options, s)) return s;
  return Object.keys(options).find((code) => LANGS.some((l) => options[code][l] === s)) ?? s;
}

const isEmpty = (v) =>
  v == null ||
  v === "" ||
  (Array.isArray(v) && !v.length) ||
  (typeof v === "number" && Number.isNaN(v));

/** Nhãn trường */
export function fieldLabel(key, lang, type) {
  return (
    TYPE_FIELD_LABEL[type]?.[key]?.[lang] ??
    FIELD_LABEL[lang]?.[key] ??
    FIELD_LABEL.en[key] ??
    humanize(key)
  );
}

const place = (key, lang) => (PLACES[key] ? tr(PLACES[key], lang) : humanizeSlug(key));

/** "halong" / "Ha-Long" → "halong" (so khớp đường dẫn cũ với đường dẫn hiện tại) */
const compact = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Điểm đến của form thiết kế tour → tên: miền → tên trong CMS → đường dẫn cũ / viết tắt khớp đầu đường dẫn
 * hiện tại (vd. "halong" ↔ "halong-bay") → tên địa danh của báo giá xe → chữ in hoa đầu từ.
 */
export function destinationName(slug, lang, names = {}) {
  const s = String(slug);
  if (REGION_NAME[s]) return tr(REGION_NAME[s], lang);
  if (names[s]) return tr(names[s], lang);
  const c = compact(s);
  const near = c.length >= 3 && Object.keys(names).find((k) => compact(k).startsWith(c));
  if (near) return tr(names[near], lang);
  if (PLACES[s]) return tr(PLACES[s], lang);
  return s.replace(/[-_]+/g, " ").replace(/(^|\s)\p{L}/gu, (x) => x.toUpperCase());
}

/** Mã gói fast-track đã xoá khỏi CMS: "arr-voa-vip" → "Nhập cảnh · visa tại cửa khẩu · làn VIP" */
export function packageName(code, lang) {
  const parts = String(code)
    .toLowerCase()
    .split(/[-_\s]+/);
  if (!parts.every((p) => PACKAGE_WORD[p])) return humanizeSlug(code);
  return parts
    .map((p) => tr(PACKAGE_WORD[p], lang))
    .filter(Boolean)
    .join(" · ");
}

/** Giá trị 1 trường → chữ dễ đọc */
export function formatValue(key, v, { lang, type, lookups = {} }) {
  const w = WORDS[lang];
  if (isEmpty(v)) return "";
  if (Array.isArray(v)) {
    if (key === "destinations")
      return v.map((s) => destinationName(s, lang, lookups.destinations)).join(", ");
    return v
      .map((x) => formatValue(key, x, { lang, type, lookups }))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof v === "boolean") return v ? w.yes : w.no;
  const s = type === "planner" ? optionCode(key, String(v).trim()) : String(v).trim();
  if (ENUM[key]?.[s] && !(key === "airport" && type === "visa")) return tr(ENUM[key][s], lang);
  if (s === "on request") return ON_REQUEST[lang];
  if (key === "destinations") return destinationName(s, lang, lookups.destinations);
  switch (key) {
    case "from":
    case "to":
      return place(s, lang);
    case "airport":
      return AIRPORT_NAME[s.toUpperCase()] ? tr(AIRPORT_NAME[s.toUpperCase()], lang) : s;
    case "vehicle":
      return lookups.vehicle?.[s]
        ? tr(lookups.vehicle[s], lang)
        : VEHICLE_NAME[s]
          ? tr(VEHICLE_NAME[s], lang)
          : humanize(s);
    case "level":
      return lookups.level?.[s] ? tr(lookups.level[s], lang) : packageName(s, lang);
    case "routeSlug":
      return humanizeSlug(s);
    case "priceUSD":
      return Number.isFinite(Number(s)) ? fmtMoney(s) : s;
    case "hotel":
    case "hotelClass":
      return /^[345]$/.test(s) ? `${s}★` : s;
    case "travellers":
    case "travelers":
    case "passengers":
      return /^\d+$/.test(s) ? w.people(Number(s)) : s;
    case "days":
      return /^\d+$/.test(s) ? w.days(Number(s)) : s;
    case "budget": {
      const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) return `${fmtMoney(m[1])} – ${fmtMoney(m[2])} ${w.perPerson}`;
      const plus = s.match(/^(\d+)\+$/);
      if (plus) return `${fmtMoney(plus[1])}+ ${w.perPerson}`;
      return s;
    }
    case "lang":
      return s;
    default:
      if (DATE_KEYS.has(key) || ISO_DATE.test(s)) return fmtDate(s, lang);
      return translateOption(s, lang);
  }
}

/** "2 người lớn · 1 trẻ em (5 tuổi)" */
export function guestsText(adults, childAges, lang, children) {
  const w = WORDS[lang];
  const parts = [];
  if (adults) parts.push(w.adult(Number(adults)));
  const ages = (childAges ?? []).filter((a) => a != null && a !== "");
  if (ages.length) parts.push(`${w.child(ages.length)} (${w.ages(ages)})`);
  else if (Number(children) > 0) parts.push(w.child(Number(children)));
  return parts.join(" · ");
}

/** Dòng giá tạm tính (pricing.js ghi tiếng Anh) → đúng ngôn ngữ */
export function priceLineLabel(label, lang) {
  const w = WORDS[lang];
  const s = String(label ?? "");
  let m = s.match(/^(\d+) adult\(s\) × \$([\d.,]+)/);
  if (m) return w.adultLine(Number(m[1]), fmtMoney(m[2].replace(/,/g, "")));
  m = s.match(/^Child (\d+)y \((\d+)%\)/);
  if (m) return w.childLine(m[1], m[2]);
  m = s.match(/^Holiday surcharge (?:× (\d+)|(\d+)%)/);
  if (m) return m[1] ? `${w.holiday} × ${m[1]}` : `${w.holiday} ${m[2]}%`;
  if (/^Single supplement/.test(s)) return w.single;
  m = s.match(/^Small-group supplement \((\d+) guests?\) \+(\d+)%/);
  if (m) return w.smallGroup(Number(m[1]), m[2]);
  return s;
}

/** Trường không bao giờ in ra (trùng thông tin / kỹ thuật) */
const HIDDEN = new Set([
  "summary", // tóm tắt chữ của form xe — đã có đủ từng trường bên dưới
  "website_url",
  "captchaToken",
  "honeypot",
  "tourSlug",
  "tourCode",
  "estimateUSD",
  "type",
  "lang",
  "page",
]);

/** Chữ dài → khối lời nhắn riêng */
const LONG = ["message", "requests"];

/** Thứ tự + "thông tin chính" theo loại */
const FACTS = {
  booking: ["tour", "departureDate", "guests", "hotelClass", "estimate"],
  car: ["journey", "pickup", "return", "passengers", "vehicle", "priceUSD"],
  visa: ["service", "level", "airport", "entryDate", "travellers"],
  planner: ["destinations", "arrival", "days", "guests", "hotel", "budget"],
  contact: ["subject"],
  partner: ["company", "country", "website", "volume"],
};
const ORDER = [
  "tripType",
  "route",
  "airport",
  "flight",
  "payment",
  "service",
  "level",
  "entryDate",
  "travellers",
  "flexible",
  "interests",
  "contactVia",
  "subject",
];

/**
 * @returns {{
 *   facts: {key:string,label:string,text:string}[],
 *   rows: {key:string,label:string,text:string}[],
 *   long: {key:string,label:string,text:string}[],
 *   price: null | { lines:{label:string,amount:string}[], total:string },
 * }}
 */
export function describeEnquiry(e, langIn, lookups = {}) {
  const lang = pickLang(langIn);
  const type = e.type;
  const d = { ...(e.details ?? {}) };
  const ctx = { lang, type, lookups };
  const w = WORDS[lang];
  /** key → chữ đã định dạng (theo thứ tự thêm vào) */
  const out = new Map();
  const put = (key, text) => {
    if (text != null && String(text).trim() !== "") out.set(key, String(text));
  };

  // --- đặt tour ---
  if (type === "booking" || e.tour?.title) {
    const title = lookups.tourTitle ? tr(lookups.tourTitle, lang) : e.tour?.title;
    if (title) put("tour", `${title}${e.tour?.code ? ` (${e.tour.code})` : ""}`);
    put("departureDate", e.departureDate ? fmtDate(e.departureDate, lang) : "");
    put("guests", guestsText(e.adults, e.childAges, lang));
    put("hotelClass", e.hotelClass ? `${e.hotelClass}★` : "");
  }
  let price = null;
  if (e.estimate && (e.estimate.total != null || e.tour?.title)) {
    const total = e.estimate.total != null ? fmtMoney(e.estimate.total) : ON_REQUEST[lang];
    put("estimate", total);
    if (e.estimate.total != null && e.estimate.lines?.length)
      price = {
        lines: e.estimate.lines.map((l) => ({
          label: priceLineLabel(l.label, lang),
          amount: fmtMoney(l.amount),
        })),
        total,
      };
  }

  // --- xe: gộp điểm đón/đến, ngày giờ đón / về ---
  if (type === "car") {
    if (d.from || d.to) {
      const same = d.from && d.from === d.to;
      put(
        "journey",
        same
          ? place(d.from, lang)
          : [d.from, d.to]
              .filter(Boolean)
              .map((k) => place(k, lang))
              .join(" → "),
      );
    } else if (d.routeSlug) put("journey", humanizeSlug(d.routeSlug));
    if (d.date) put("pickup", [fmtDate(d.date, lang), d.time].filter(Boolean).join(" · "));
    if (d.tripType === "roundTrip" && d.returnDate)
      put("return", [fmtDate(d.returnDate, lang), d.returnTime].filter(Boolean).join(" · "));
    if (d.passengers) put("passengers", w.people(Number(d.passengers)));
    for (const k of [
      "from",
      "to",
      "routeSlug",
      "date",
      "time",
      "returnDate",
      "returnTime",
      "passengers",
    ])
      delete d[k];
  }

  // --- thiết kế tour: người lớn + trẻ em, ngày linh hoạt ---
  if (type === "planner") {
    put("guests", guestsText(d.adults, [], lang, d.children));
    if (d.arrival)
      put(
        "arrival",
        `${fmtDate(d.arrival, lang)}${d.flexible === true ? ` · ${lang === "vi" ? "linh hoạt" : lang === "zh" ? "可调整" : "flexible"}` : ""}`,
      );
    if (d.flexible === true && !d.arrival) put("flexible", w.yes);
    for (const k of ["adults", "children", "arrival", "flexible"]) delete d[k];
  }
  if (Number(d.children) === 0) delete d.children;

  // --- số khách visa ---
  if (type === "visa" && d.travellers) {
    put("travellers", w.people(Number(d.travellers)));
    delete d.travellers;
  }

  // --- các trường còn lại (theo thứ tự ưu tiên, rồi thứ tự form) ---
  const keys = [
    ...ORDER.filter((k) => k in d),
    ...Object.keys(d).filter((k) => !ORDER.includes(k)),
  ];
  for (const k of keys) {
    if (HIDDEN.has(k) || LONG.includes(k) || out.has(k)) continue;
    put(k, formatValue(k, d[k], ctx));
  }

  const entry = (key) => ({ key, label: fieldLabel(key, lang, type), text: out.get(key) });
  // có bảng giá chi tiết → không lặp lại tổng tiền ở ô thông tin chính
  if (price) out.delete("estimate");
  const factKeys = (FACTS[type] ?? []).filter((k) => out.has(k));
  const facts = factKeys.map(entry);
  const rows = [...out.keys()].filter((k) => !factKeys.includes(k)).map(entry);
  const long = [];
  const msg = String(e.message ?? "").trim();
  if (msg) long.push({ key: "message", label: fieldLabel("message", lang, type), text: msg });
  for (const k of LONG.slice(1)) {
    const v = String(d[k] ?? "").trim();
    if (v) long.push({ key: k, label: fieldLabel(k, lang, type), text: v });
  }
  return { facts, rows, long, price };
}
