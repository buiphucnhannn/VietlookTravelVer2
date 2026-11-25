/** Hàm chuẩn hoá dữ liệu dùng chung cho các nhà cung cấp số liệu / đánh giá */
export const str = (v) => (typeof v === "string" ? v : "");
export const clip = (s, n) => str(s).trim().slice(0, n);
export const httpsUrl = (u) =>
  /^https?:\/\/[^\s<>"']+$/i.test(str(u)) ? str(u).slice(0, 1000) : "";
export const num = (v) => (v == null || v === "" ? NaN : Number(v));
/** "1,291" / 1291 → 1291 */
export const toCount = (v) => num(String(v ?? "").replace(/[^\d]/g, ""));
export const round1 = (v) => Math.round(num(v) * 10) / 10;

/** Số sao 1–5 (không rõ → 5) */
export const stars = (v) => {
  const n = Math.round(Number(v));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 5;
};

/** "zh-Hant" → zh, "vi" → vi, "en-US" → en, ngôn ngữ khác → other, không rõ → "" */
export function mapLang(code) {
  const c = str(code).trim().toLowerCase();
  if (!c) return "";
  const base = c.split(/[-_]/)[0];
  return ["en", "zh", "vi"].includes(base) ? base : "other";
}

/** ISO / "YYYY-MM-DD" → "YYYY-MM-DD" theo giờ Việt Nam; sai / tương lai → "" */
export function toDay(iso) {
  const t = Date.parse(str(iso));
  if (!Number.isFinite(t)) return "";
  const day = new Date(t + 7 * 3600_000).toISOString().slice(0, 10);
  const today = new Date(Date.now() + 14 * 3600_000).toISOString().slice(0, 10);
  return day <= today ? day : "";
}
