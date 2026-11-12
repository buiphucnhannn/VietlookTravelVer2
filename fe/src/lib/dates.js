/**
 * Định dạng ngày DÙNG CHUNG toàn hệ thống (website en/zh/vi + CMS) — ngày theo NGÔN NGỮ:
 *  - en: mm/dd/yyyy (11/14/2026) · thứ + ngày "Sat · 11/14/2026"
 *  - vi (website tiếng Việt + toàn bộ CMS): dd/mm/yyyy (14/11/2026) · "T7 · 14/11/2026"
 *  - zh: yyyy年m月d日 (2026年11月14日) · "周六 · 2026年11月14日"
 * Ngày + giờ → thêm " HH:mm" (24h). Không dùng tên tháng.
 * Ô nhập ngày (DatePicker) gõ dạng số: en mm/dd/yyyy · vi dd/mm/yyyy · zh yyyy/mm/dd (đọc được cả "2026年11月14日").
 * Lưu trữ / API vẫn là ISO (YYYY-MM-DD) — file này chỉ lo phần hiển thị + đọc chữ người dùng gõ.
 *
 * Múi giờ:
 *  - ngày thuần "YYYY-MM-DD" → đọc thẳng từ chuỗi (không qua Date → không lệch 1 ngày ở châu Mỹ);
 *  - thời điểm (Date / ISO có giờ) → giờ Việt Nam (Asia/Ho_Chi_Minh), giống nhau ở server và mọi trình duyệt.
 * Bản tương ứng phía backend (email): be/src/emails/format.js.
 */

export const VN_TZ = "Asia/Ho_Chi_Minh";

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n) => String(n).padStart(2, "0");

/** Ngày dương lịch có thật không (VD 02/30 → không) */
const realDay = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/** "2026-11-27" (ngày có thật) → true */
export const isISODate = (s) => {
  const m = ISO_DAY.exec(String(s ?? ""));
  return Boolean(m && realDay(+m[1], +m[2], +m[3]));
};

/** y, m (1–12), d → "YYYY-MM-DD" */
export const toISODate = (y, m, d) => `${String(y).padStart(4, "0")}-${pad(m)}-${pad(d)}`;

const vnFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: VN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Thời điểm → các phần theo giờ Việt Nam ({ y, m, d, H, M } dạng chuỗi 2 chữ số) | null */
function vnParts(value) {
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  const p = Object.fromEntries(vnFmt.formatToParts(dt).map((x) => [x.type, x.value]));
  return { y: p.year, m: p.month, d: p.day, H: p.hour === "24" ? "00" : p.hour, M: p.minute };
}

/** Ngôn ngữ hiển thị ngày: "vi" | "zh" | "en" (khác → "en") */
const dl = (lang) => (lang === "vi" || lang === "zh" ? lang : "en");

/** Ngày đầy đủ theo ngôn ngữ (y, m, d là chuỗi 2 chữ số) */
function ymd(y, m, d, lang) {
  const l = dl(lang);
  if (l === "zh") return `${y}年${+m}月${+d}日`;
  if (l === "vi") return `${d}/${m}/${y}`;
  return `${m}/${d}/${y}`;
}

/** Ngày + tháng (không năm) theo ngôn ngữ: en "11/14" · vi "14/11" · zh "11月14日" */
function md(m, d, lang) {
  const l = dl(lang);
  if (l === "zh") return `${+m}月${+d}日`;
  if (l === "vi") return `${d}/${m}`;
  return `${m}/${d}`;
}

/**
 * Ngày → chữ theo ngôn ngữ: "2026-11-27" → en "11/27/2026" · vi "27/11/2026" · zh "2026年11月27日".
 * "12-24" (ngày lễ lặp hằng năm) → en "12/24" · vi "24/12" · zh "12月24日". Date / ISO có giờ → theo giờ VN.
 * Không đọc được → trả lại nguyên chữ (không bao giờ in "Invalid Date").
 */
export function fmtDate(value, lang = "en") {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const m = ISO_DAY.exec(value);
    if (m) return ymd(m[1], m[2], m[3], lang);
    const r = /^(\d{2})-(\d{2})$/.exec(value);
    if (r) return md(r[1], r[2], lang);
  }
  const p = vnParts(value);
  return p ? ymd(p.y, p.m, p.d, lang) : String(value);
}

/** Ngày + tháng không kèm năm: "2026-11-14" → en "11/14" · vi "14/11" · zh "11月14日" */
export function fmtDayMonth(value, lang = "en") {
  if (value == null || value === "") return "";
  const m = typeof value === "string" ? ISO_DAY.exec(value) : null;
  if (m) return md(m[2], m[3], lang);
  const p = vnParts(value);
  return p ? md(p.m, p.d, lang) : String(value);
}

/** Thời điểm → ngày theo ngôn ngữ + " HH:mm" (giờ Việt Nam, 24h). VD vi "27/11/2026 14:05" */
export function fmtDateTime(value, lang = "en") {
  if (value == null || value === "") return "";
  const p = vnParts(value);
  return p ? `${ymd(p.y, p.m, p.d, lang)} ${p.H}:${p.M}` : String(value);
}

/**
 * Tháng / năm (đánh giá khách: "2026-10", ngày đầy đủ…) → en/vi "10/2026" · zh "2026年10月";
 * chữ tự do giữ nguyên
 */
export function fmtMonthYear(value, lang = "en") {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const out = (y, m) => (dl(lang) === "zh" ? `${y}年${+m}月` : `${m}/${y}`);
  const ym = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(s);
  if (ym) return out(ym[1], ym[2]);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  const p = vnParts(s);
  return p ? out(p.y, p.m) : s;
}

const WEEKDAY_SHORT = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  vi: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
};

/** Thứ viết tắt của ngày "YYYY-MM-DD": en "Mon" · zh "周一" · vi "T2" */
export function weekdayShort(iso, lang = "en") {
  const m = ISO_DAY.exec(String(iso ?? ""));
  if (!m) return "";
  const day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return WEEKDAY_SHORT[dl(lang)][day];
}

/**
 * Ngày kèm thứ (nơi khách chọn / xem lại ngày đi):
 * en "Mon · 11/16/2026" · vi "T2 · 16/11/2026" · zh "周一 · 2026年11月16日"
 */
export function fmtDayChip(iso, lang = "en") {
  const wd = weekdayShort(iso, lang);
  return wd ? `${wd} · ${fmtDate(iso, lang)}` : fmtDate(iso, lang);
}

/** Ô nhập ngày: mẫu gợi ý theo ngôn ngữ — en "mm/dd/yyyy" · vi "dd/mm/yyyy" · zh "yyyy/mm/dd" */
export const datePlaceholder = (lang = "en") =>
  ({ vi: "dd/mm/yyyy", zh: "yyyy/mm/dd" })[dl(lang)] ?? "mm/dd/yyyy";

/** Ô nhập ngày: ISO → chữ dạng số để sửa — en "11/27/2026" · vi "27/11/2026" · zh "2026/11/27" */
export function fmtDateInput(iso, lang = "en") {
  const m = ISO_DAY.exec(String(iso ?? ""));
  if (!m) return String(iso ?? "");
  return dl(lang) === "zh" ? `${m[1]}/${m[2]}/${m[3]}` : ymd(m[1], m[2], m[3], lang);
}

/**
 * Chữ người dùng gõ → "YYYY-MM-DD" | null (cho phép 1 chữ số tháng/ngày; "/", "-", "." đều được):
 * en "11/27/2026" · vi "27/11/2026" · zh "2026/11/27" hoặc "2026年11月27日".
 */
export function parseDate(text, lang = "en") {
  const s = String(text ?? "").trim();
  let y;
  let mo;
  let d;
  if (dl(lang) === "zh") {
    const m = /^(\d{4})\s*[/.\-年]\s*(\d{1,2})\s*[/.\-月]\s*(\d{1,2})\s*日?$/.exec(s);
    if (!m) return null;
    [y, mo, d] = [+m[1], +m[2], +m[3]];
  } else {
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
    if (!m) return null;
    [y, mo, d] = dl(lang) === "vi" ? [+m[3], +m[2], +m[1]] : [+m[3], +m[1], +m[2]];
  }
  return y >= 1000 && realDay(y, mo, d) ? toISODate(y, mo, d) : null;
}

/** "09:30" (00:00–23:59, 24 giờ) → true */
export const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s ?? ""));

/**
 * Giờ người dùng gõ → "HH:mm" | null. Nhận "9:30", "09:30", "930", "0930", "9" (→ 09:00).
 */
export function parseTime(text) {
  const s = String(text ?? "").trim();
  let h;
  let m;
  const c = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (c) [h, m] = [+c[1], +c[2]];
  else if (/^\d{1,4}$/.test(s)) {
    if (s.length <= 2) [h, m] = [+s, 0];
    else [h, m] = [+s.slice(0, s.length - 2), +s.slice(-2)];
  } else return null;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Thời gian di chuyển ước tính (giờ, có thể lẻ) → chữ dễ đọc theo ngôn ngữ:
 * < 1 giờ ghi phút ("about 45 min" / "约45分钟" / "khoảng 45 phút"); còn lại ghi giờ ("about 2.5 h" / "khoảng 2,5 giờ").
 * Không dùng dấu "~" (dễ đọc nhầm thành dấu trừ "-0.75").
 */
export function fmtDuration(hours, lang = "en") {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return "";
  if (h < 1) {
    const m = Math.round(h * 60);
    return (
      { en: `about ${m} min`, zh: `约${m}分钟`, vi: `khoảng ${m} phút` }[lang] ?? `about ${m} min`
    );
  }
  const n = Number.isInteger(h) ? String(h) : String(Math.round(h * 10) / 10);
  return (
    { en: `about ${n} h`, zh: `约${n}小时`, vi: `khoảng ${n.replace(".", ",")} giờ` }[lang] ??
    `about ${n} h`
  );
}

/** Hôm nay theo giờ Việt Nam (YYYY-MM-DD) */
export function todayVN() {
  const p = vnParts(new Date());
  return `${p.y}-${p.m}-${p.d}`;
}
