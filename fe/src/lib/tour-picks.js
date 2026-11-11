/**
 * Tự chọn tour cho 2 khối trang chủ khi nhân viên CHƯA chọn tay (CMS → Trang chủ):
 *   - "Tour nổi bật": 8 tour "đáng khoe" nhất, đa dạng miền, không trùng lịch trình.
 *   - "Hành trình dài ngày": tour ≥ 7 ngày, chia đều 3 nhóm 1 tuần / 2 tuần / 3 tuần trở lên
 *     để tab nào cũng có tour.
 * Dùng chung cho website (lib/catalog.js, ở server) và bản xem trước trong CMS (dữ liệu /public/tours)
 * → hai nơi luôn ra cùng một kết quả. Hàm thuần, không phụ thuộc server/client.
 *
 * Tour cần các trường của thẻ tour công khai: slug, days, price, originalPrice, image, rank, featured,
 * featuredLong, regions, destinations, photos (số ảnh album), reviewCount, rating.
 */

export const AUTO_FEATURED = 8;
export const AUTO_LONG = 8; // khớp khối "Hành trình dài ngày" trên trang chủ (tối đa 8 thẻ)
export const LONG_MIN_DAYS = 7;

/** Nhóm tuần — PHẢI giống bộ lọc của components/home/LongTours.js */
export const weekBucket = (days) => (days >= 16 ? "w3" : days >= 9 ? "w2" : "w1");
const BUCKETS = ["w1", "w2", "w3"];

/** Điểm "đáng nổi bật" của 1 tour (càng cao càng nên đưa lên trang chủ) */
export function tourScore(t) {
  let s = 0;
  if (t.featured) s += 40; // nhân viên đã đánh dấu "nổi bật"
  if (t.price > 0) s += 12;
  else s -= 15; // chưa có giá → khách khó quyết định
  if (t.originalPrice > t.price && t.price > 0) {
    const off = (t.originalPrice - t.price) / t.originalPrice;
    s += 8 + Math.min(10, Math.round(off * 50)); // đang giảm giá
  }
  const photos = t.photos ?? 0;
  s += photos >= 6 ? 10 : photos; // album đủ ảnh đẹp
  if (!t.image) s -= 30;
  const rank = Number.isFinite(t.rank) ? t.rank : 1000;
  s += 15 / (1 + rank / 10); // thứ tự ưu tiên trong mục Tour (số nhỏ = ưu tiên)
  if (t.reviewCount > 0) s += Math.min(8, t.reviewCount * 2) + ((t.rating ?? 5) - 4) * 4;
  return s;
}

/**
 * Hai tour gần như cùng lịch trình: số ngày chênh ≤ 2 và trùng ≥ 60% điểm đến, hoặc cùng số điểm đến (≥ 3)
 * chỉ khác 1 điểm (vd. "Sài Gòn – Mũi Né – Mekong" và "Sài Gòn – Mũi Né – Vũng Tàu" cùng 5 ngày).
 */
export function similarTours(a, b) {
  if (Math.abs((a.days ?? 0) - (b.days ?? 0)) > 2) return false;
  const A = new Set(a.destinations ?? []);
  const B = new Set(b.destinations ?? []);
  if (!A.size || !B.size) return false;
  let both = 0;
  for (const d of A) if (B.has(d)) both++;
  if (both / (A.size + B.size - both) >= 0.6) return true;
  return A.size === B.size && A.size >= 3 && both >= A.size - 1;
}

const mainRegion = (t) => t.regions?.[0] ?? "";

/**
 * Chọn tham lam: mỗi lượt lấy tour điểm cao nhất sau khi trừ điểm "lặp miền" (đa dạng Bắc–Trung–Nam)
 * và bỏ qua tour trùng lịch trình với tour đã chọn. `taken`: tour đã chọn trước đó (cùng tính đa dạng).
 */
function pickDiverse(pool, n, taken = [], { avoid = new Set(), band } = {}) {
  const out = [];
  const rest = pool.map((t) => ({ t, base: tourScore(t) - (avoid.has(t.slug) ? 25 : 0) }));
  while (out.length < n && rest.length) {
    const chosen = [...taken, ...out];
    let best = -1;
    let bestScore = -Infinity;
    rest.forEach(({ t, base }, i) => {
      if (chosen.some((c) => similarTours(c, t))) return;
      const sameRegion = chosen.filter((c) => mainRegion(c) === mainRegion(t)).length;
      // `band`: nhóm độ dài tour → khối có cả tour ngắn lẫn dài, không dồn một kiểu
      const sameBand = band ? chosen.filter((c) => band(c) === band(t)).length : 0;
      const score = base - sameRegion * 6 - sameBand * 5;
      if (score > bestScore) [best, bestScore] = [i, score];
    });
    if (best < 0) break; // còn lại toàn tour trùng lịch trình
    out.push(rest.splice(best, 1)[0].t);
  }
  return out;
}

const usable = (t) => !!t?.slug && !!t.image;

/** Đẩy các tour đã hiện ở khối "Tour nổi bật" xuống cuối (giữ lại để bộ lọc tuần vẫn đủ tour) */
export function pushBack(list, shown) {
  if (!shown?.length) return list;
  const seen = new Set(shown);
  const slug = (t) => (typeof t === "string" ? t : t.slug);
  return [...list.filter((t) => !seen.has(slug(t))), ...list.filter((t) => seen.has(slug(t)))];
}

/** Nhóm độ dài cho khối "Tour nổi bật": 1–3 ngày · 4–6 ngày · 7–9 ngày · 10 ngày trở lên */
const featuredBand = (t) => (t.days <= 3 ? 0 : t.days <= 6 ? 1 : t.days <= 9 ? 2 : 3);

/** 8 tour cho khối "Tour nổi bật" */
export function autoFeaturedTours(tours, n = AUTO_FEATURED) {
  return pickDiverse((tours ?? []).filter(usable), n, [], { band: featuredBand });
}

/**
 * Tour cho khối "Hành trình dài ngày": ≥ 7 ngày, chia đều 3 nhóm tuần (nhóm thiếu tour → nhóm khác bù),
 * xếp xen kẽ 1 tuần · 2 tuần · 3 tuần (tab "Tất cả" đủ loại). `avoid`: slug đã hiện ở khối "Tour nổi bật"
 * (bị trừ điểm để hai khối ít lặp lại).
 */
export function autoLongTours(tours, { n = AUTO_LONG, avoid = [] } = {}) {
  const pool = (tours ?? []).filter((t) => usable(t) && t.days >= LONG_MIN_DAYS);
  const skip = new Set(avoid);
  const per = Math.ceil(n / BUCKETS.length);
  const groups = Object.fromEntries(BUCKETS.map((b) => [b, []]));
  for (const b of BUCKETS) {
    const inBucket = pool.filter((t) => weekBucket(t.days) === b);
    groups[b] = pickDiverse(
      inBucket,
      per,
      BUCKETS.flatMap((x) => groups[x]),
      { avoid: skip },
    );
  }
  let picked = BUCKETS.flatMap((b) => groups[b]);
  // Nhóm thiếu tour → lấy thêm tour điểm cao từ các nhóm còn lại
  if (picked.length < n) {
    const left = pool.filter((t) => !picked.includes(t));
    const extra = pickDiverse(left, n - picked.length, picked, { avoid: skip });
    for (const t of extra) groups[weekBucket(t.days)].push(t);
    picked = BUCKETS.flatMap((b) => groups[b]);
  }
  // Trong mỗi nhóm: tour chưa hiện ở khối "Tour nổi bật" lên trước (tab "Tất cả" ít lặp khối trên)
  for (const b of BUCKETS) groups[b] = pushBack(groups[b], avoid);
  // Xen kẽ các nhóm, tour điểm cao trước
  const out = [];
  for (let i = 0; out.length < picked.length; i++)
    for (const b of BUCKETS) if (groups[b][i]) out.push(groups[b][i]);
  return out.slice(0, n);
}
