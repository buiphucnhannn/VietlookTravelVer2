/**
 * Định dạng ngày DÙNG CHUNG toàn hệ thống (website en/zh/vi + CMS).
 * Quy ước (quyết định của chủ dự án): mọi ngày hiển thị / nhập đều dạng số **mm/dd/yyyy** (VD 11/27/2026),
 * ngày + giờ → "mm/dd/yyyy HH:mm" (24h). Không dùng tên tháng, không dùng dd/mm.
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

/**
 * Ngày → "mm/dd/yyyy".
 * "2026-11-27" → "11/27/2026" · "12-24" (ngày lễ lặp hằng năm) → "12/24" · Date / ISO có giờ → theo giờ VN.
 * Không đọc được → trả lại nguyên chữ (không bao giờ in "Invalid Date").
 */
export function fmtDate(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const m = ISO_DAY.exec(value);
    if (m) return `${m[2]}/${m[3]}/${m[1]}`;
    const md = /^(\d{2})-(\d{2})$/.exec(value);
    if (md) return `${md[1]}/${md[2]}`;
  }
  const p = vnParts(value);
  return p ? `${p.m}/${p.d}/${p.y}` : String(value);
}

/** Thời điểm → "mm/dd/yyyy HH:mm" (giờ Việt Nam, 24h) */
export function fmtDateTime(value) {
  if (value == null || value === "") return "";
  const p = vnParts(value);
  return p ? `${p.m}/${p.d}/${p.y} ${p.H}:${p.M}` : String(value);
}

/** Tháng / năm (đánh giá khách: "2026-10", ngày đầy đủ…) → "10/2026"; chữ tự do giữ nguyên */
export function fmtMonthYear(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const ym = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(s);
  if (ym) return `${ym[2]}/${ym[1]}`;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  const p = vnParts(s);
  return p ? `${p.m}/${p.y}` : s;
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
  return (WEEKDAY_SHORT[lang] ?? WEEKDAY_SHORT.en)[day];
}

/**
 * Ngày khởi hành kèm thứ (chỉ dùng nơi khách chọn / xem lại ngày đi):
 * en "Mon · 11/16/2026" · zh "周一 · 11/16/2026" · vi "T2 · 11/16/2026"
 */
export function fmtDayChip(iso, lang = "en") {
  const wd = weekdayShort(iso, lang);
  return wd ? `${wd} · ${fmtDate(iso)}` : fmtDate(iso);
}

/** Chữ người dùng gõ "11/27/2026" (cho phép 1 chữ số tháng/ngày) → "2026-11-27" | null */
export function parseUSDate(text) {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(String(text ?? ""));
  if (!m) return null;
  const [mo, d, y] = [+m[1], +m[2], +m[3]];
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
