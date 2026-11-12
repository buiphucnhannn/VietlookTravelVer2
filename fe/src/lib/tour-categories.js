/**
 * Phân loại tour dùng chung cho menu, bộ lọc /tours và các trang du thuyền (mục 4.2.1 của khách).
 * Chỉ là hàm thuần (không gọi API) → dùng được cả ở server lẫn client component.
 */

/**
 * Nhóm thời lượng: khách yêu cầu "1 – 2 – 3 – 5 – 7 – 14 ngày" → chia thành các khoảng liền nhau
 * để MỖI tour thuộc đúng một nhóm (tour nửa ngày tính vào nhóm 1 ngày).
 * Giá trị (`value`) là tham số ?duration= trên URL.
 */
export const DURATION_BUCKETS = [
  { value: "1", min: 0, max: 1 },
  { value: "2", min: 2, max: 2 },
  { value: "3", min: 3, max: 3 },
  { value: "4-5", min: 4, max: 5 },
  { value: "6-7", min: 6, max: 7 },
  { value: "8-14", min: 8, max: 14 },
  { value: "15+", min: 15, max: Infinity },
];

// Đường dẫn cũ (?duration=2-4, ?duration=5-7) vẫn lọc đúng, chỉ không còn hiện trong danh sách chọn
const LEGACY_DURATIONS = {
  "2-4": { min: 2, max: 4 },
  "5-7": { min: 5, max: 7 },
};

/** Tour có thuộc nhóm thời lượng `value` không (value lạ → không lọc). */
export function matchDuration(value, days) {
  const b = DURATION_BUCKETS.find((x) => x.value === value) || LEGACY_DURATIONS[value];
  if (!b) return true;
  const d = Number(days) || 1;
  return d >= b.min && d <= b.max;
}

/** Số tour trong từng nhóm thời lượng: { "1": 138, "2": 48, … } */
export function durationCounts(tours) {
  const counts = Object.fromEntries(DURATION_BUCKETS.map((b) => [b.value, 0]));
  for (const t of tours) {
    const b = DURATION_BUCKETS.find((x) => matchDuration(x.value, t.days));
    if (b) counts[b.value]++;
  }
  return counts;
}

/* ---------- Du thuyền ---------- */

/** Điểm đến có du thuyền / tàu tham quan biển trong ngày */
export const DAY_CRUISE_DESTINATIONS = ["halong-bay", "nha-trang", "phu-quoc"];

// Tên tour (mọi ngôn ngữ) cho thấy đây là chuyến du thuyền
const CRUISE_WORDS = /cruise|du thuyền|游轮|游船/i;
// Chuyến tàu / cano ra đảo ở Nha Trang, Phú Quốc (tour "3 đảo", "4 đảo", lặn ngắm san hô…)
const BOAT_WORDS =
  /\bboat\b|speed ?boat|snorkel|island[- ]hopping|hon tam|mun island|hòn tằm|hòn mun|\b(\d|two|three|four)[- ]islands?\b|\d\s*đảo|bằng thuyền|cano|tàu cao tốc|跳岛|快艇|浮潜/i;

const textOf = (t) =>
  [
    ...Object.values(t.title ?? {}),
    // đoạn đầu phần giới thiệu tiếng Anh (vd. "island-hopping tour", "by speedboat")
    String(t.summary?.en ?? "").slice(0, 200),
  ].join(" ");

/**
 * Loại du thuyền của tour:
 * - "overnight": du thuyền Vịnh Hạ Long ngủ đêm (≥ 1 đêm trên tàu, tour chính là du thuyền)
 * - "day": du thuyền / tàu tham quan trong ngày ở Hạ Long, Nha Trang, Phú Quốc
 * - null: không phải tour du thuyền (tour ghép nhiều điểm có 1 đêm trên tàu vẫn là tour thường)
 */
export function cruiseKind(t) {
  const dest = t.destinations ?? [];
  const title = Object.values(t.title ?? {}).join(" ");
  const isCruise = t.cruise || CRUISE_WORDS.test(title);
  if ((Number(t.nights) || 0) >= 1) {
    return isCruise && dest.includes("halong-bay") ? "overnight" : null;
  }
  if (!dest.some((d) => DAY_CRUISE_DESTINATIONS.includes(d))) return null;
  if (isCruise) return "day";
  // Nha Trang / Phú Quốc: chuyến tàu ra đảo cũng là "du thuyền trải nghiệm ngày"
  const seaDest = dest.some((d) => d === "nha-trang" || d === "phu-quoc");
  return seaDest && BOAT_WORDS.test(textOf(t)) ? "day" : null;
}
