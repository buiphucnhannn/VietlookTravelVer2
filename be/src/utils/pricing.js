/**
 * Giá tạm tính khi đặt tour (USD) — dùng ở backend khi nhận đơn (nguồn chuẩn, không tin số trình duyệt gửi).
 * Website dùng cùng công thức (fe/src/lib/pricing.js) để hiển thị trước cho khách.
 *
 * 1. Giá / người lớn: bảng "giá theo số khách × hạng khách sạn" (groupTiers: price = 3★, price4, price5) theo
 *    tổng số khách và hạng khách chọn; không có bảng → giá bán `price`.
 * 2. Trẻ em: % giá người lớn theo độ tuổi (childRates). Chưa cấu hình → < 5 tuổi miễn phí, 5–10 tuổi 75%, ≥ 11 như người lớn.
 * 3. Phụ thu lễ Tết nếu ngày khởi hành nằm trong holidayDates (YYYY-MM-DD hoặc MM-DD lặp hằng năm):
 *    số tiền / khách (holidaySurcharge) và / hoặc % trên tiền tour (holidayPercent).
 * 4. Phụ thu phòng đơn: khi chỉ có 1 người lớn.
 */
const DEFAULT_CHILD = [
  { minAge: 0, maxAge: 4, percent: 0 },
  { minAge: 5, maxAge: 10, percent: 75 },
  { minAge: 11, maxAge: 17, percent: 100 },
];

const round = (n) => Math.round(n * 100) / 100;

/** Các hạng khách sạn tour có giá riêng: [3, 4, 5] (rỗng = không chia hạng) */
export function hotelClasses(tour) {
  const tiers = tour?.pricing?.groupTiers ?? [];
  const has = (k) => tiers.some((t) => t[k] > 0);
  if (!has("price4") && !has("price5")) return [];
  return [has("price") && 3, has("price4") && 4, has("price5") && 5].filter(Boolean);
}

const tierPrice = (tier, hotelClass) =>
  (hotelClass === 5 ? tier.price5 : hotelClass === 4 ? tier.price4 : tier.price) || null;

/** Khoảng cách từ số khách tới 1 bậc giá (0 = nằm trong bậc) */
const paxGap = (t, pax) =>
  pax < (t.minPax ?? 1) ? (t.minPax ?? 1) - pax : pax > (t.maxPax ?? Infinity) ? pax - t.maxPax : 0;

/**
 * Giá / người lớn theo bảng giá. Thiếu ô giá đúng chỗ → lấy ô GẦN NHẤT thay vì rơi về giá "từ" (có thể
 * rẻ hơn cả 3★):
 *   1. đúng bậc số khách + đúng hạng
 *   2. cùng hạng ở bậc số khách gần nhất (vd. 2 khách 5★ chưa có giá → giá 5★ của bậc 4–5 khách)
 *   3. hạng gần nhất trong bậc số khách gần nhất (ưu tiên hạng thấp hơn)
 *   4. không có bảng giá → giá bán `price`
 * Số khách nằm ngoài mọi bậc (1 khách, hoặc đông hơn bậc cuối) → dùng bậc gần nhất.
 */
export function unitPrice(tour, pax, hotelClass) {
  const tiers = (tour?.pricing?.groupTiers ?? []).filter((t) =>
    [3, 4, 5].some((c) => tierPrice(t, c) > 0),
  );
  if (!tiers.length) return tour?.price ?? null;
  const classes = hotelClasses(tour);
  const cls = classes.includes(hotelClass) ? hotelClass : (classes[0] ?? 3);
  const byGap = [...tiers].sort((a, b) => paxGap(a, pax) - paxGap(b, pax));
  const sameClass = byGap.find((t) => tierPrice(t, cls) > 0);
  if (sameClass && paxGap(sameClass, pax) === paxGap(byGap[0], pax))
    return tierPrice(sameClass, cls);
  if (sameClass) return tierPrice(sameClass, cls);
  const order = [cls, cls - 1, cls + 1, cls - 2, cls + 2].filter((c) => c >= 3 && c <= 5);
  for (const c of order) {
    const p = tierPrice(byGap[0], c);
    if (p > 0) return p;
  }
  return tour?.price ?? null;
}

export function childPercent(tour, age) {
  const rates = tour?.pricing?.childRates?.length ? tour.pricing.childRates : DEFAULT_CHILD;
  const rate = rates.find((r) => age >= (r.minAge ?? 0) && age <= (r.maxAge ?? 17));
  return rate ? rate.percent : 100;
}

export function isHoliday(tour, date) {
  if (!date) return false;
  return (tour?.pricing?.holidayDates ?? []).some((d) => d === date || d === date.slice(5));
}

/** @returns {{ total: number|null, lines: {label:string, amount:number}[] }} */
export function estimatePrice(tour, { adults = 1, childAges = [], date = "", hotelClass } = {}) {
  const pax = adults + childAges.length;
  const unit = unitPrice(tour, pax, hotelClass);
  if (!unit) return { total: null, lines: [] };

  const lines = [{ label: `${adults} adult(s) × $${unit}`, amount: round(unit * adults) }];
  childAges.forEach((age) => {
    const pct = childPercent(tour, age);
    lines.push({ label: `Child ${age}y (${pct}%)`, amount: Math.round((unit * pct) / 100) }); // làm tròn đô la như website
  });
  if (isHoliday(tour, date)) {
    const base = lines.reduce((s, l) => s + l.amount, 0);
    const surcharge = tour?.pricing?.holidaySurcharge;
    if (surcharge > 0) {
      const paying = adults + childAges.filter((a) => childPercent(tour, a) > 0).length;
      lines.push({ label: `Holiday surcharge × ${paying}`, amount: round(surcharge * paying) });
    }
    const percent = tour?.pricing?.holidayPercent;
    if (percent > 0)
      lines.push({
        label: `Holiday surcharge ${percent}%`,
        amount: Math.round((base * percent) / 100),
      });
  }
  const single = tour?.pricing?.singleSupplement;
  if (single > 0 && adults === 1 && childAges.length === 0)
    lines.push({ label: "Single supplement", amount: round(single) });

  return { total: round(lines.reduce((s, l) => s + l.amount, 0)), lines };
}
