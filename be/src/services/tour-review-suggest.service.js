import { trusted } from "../repositories/base.repository.js";
import {
  destinationRepository,
  reviewRepository,
  settingRepository,
} from "../repositories/content.repository.js";
import { foldText } from "../utils/search.js";
import { JOB_KEY } from "./review-import.service.js";

/**
 * Gợi ý đánh giá cho 1 tour (CMS → Tour → 9. Đánh giá của khách → "Tìm đánh giá phù hợp").
 *
 * Tripadvisor / Google không gắn đánh giá với từng tour → dò trong KHO đánh giá của công ty
 * (mục "Đánh giá khách" + lần "Lấy đánh giá" gần nhất, kể cả bài chưa thêm), chấm điểm theo các từ khoá
 * của tour (điểm đến, các chặng, tên tour, mã tour) rồi trả danh sách xếp hạng để NHÂN VIÊN chọn.
 * Không gọi Apify → không tốn hạn mức.
 */

const MAX_KEYWORDS = 16;
const MAX_ITEMS = 40;

// Chữ chung chung trong tên tour / chặng — không dùng làm từ khoá
const STOP = new Set(
  `tour tours day days night nights ngay dem private group trip trips vietnam viet nam cruise cruises
  full half week weeks the and of in to from with by on for best classic highlights highlight discovery
  explore experience adventure journey package luxury budget deluxe premium kham pha hanh trinh du lich
  tron goi chuyen di va den tu tai mien bac trung north south central city welcome arrival arrive
  departure depart transfer airport hotel free leisure farewell goodbye home pick up drop off overnight flight flights train bus check
  chao mung don tien khach san bay tu do nghi ngoi khoi hanh tham quan bua trua`
    .split(/\s+/)
    .filter(Boolean),
);

// Tên gọi khác của cùng 1 nơi (bản không dấu, cách nhau khoảng trắng)
const ALIASES = {
  "ho chi minh": ["saigon", "sai gon", "hcmc"],
  "sai gon": ["ho chi minh", "saigon"],
  "ha long": ["halong bay", "vinh ha long"],
  "sa pa": ["sapa"],
  "mekong delta": ["mekong"],
};

/** Chữ → dạng so khớp: bỏ dấu, chữ thường, mọi ký tự không phải chữ / số thành 1 khoảng trắng */
const spaced = (s) =>
  ` ${foldText(s)
    .replace(/[^a-z0-9㐀-鿿]+/g, " ")
    .trim()} `;
const compact = (s) => spaced(s).replace(/\s+/g, "");

/**
 * Tên nơi → dạng gốc để so khớp: bỏ chữ chỉ loại địa danh ở đầu / cuối ("vịnh Hạ Long", "Ha Long Bay",
 * "Da Nang City", "phố cổ Hội An") → "ha long" / "da nang" / "hoi an" — bài chỉ ghi "Ha Long" vẫn khớp.
 */
const placeKey = (k) =>
  spaced(k)
    .trim()
    .replace(/^(vinh|thanh pho|tp|pho co|dao|tinh|quan dao|khu du lich) /, "")
    .replace(/ (bay|city|town|ancient town|old town|old quarter|province|island|islands)$/, "")
    .trim();

/** "Ha Long – Ninh Binh & Hoi An 10 Days" → ["ha long", "ninh binh", "hoi an"] */
function phrasesOf(text) {
  return String(text ?? "")
    .split(/[–—\-,&/|+→>()·:;]+|\s+(?:and|và|to|đến)\s+/i)
    .map((p) =>
      spaced(p)
        .trim()
        .split(" ")
        .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w))
        .join(" "),
    )
    .filter((p) => p.length >= 3 && p.split(" ").length <= 4);
}

/** Từ khoá mặc định của tour: điểm đến (tên 3 ngôn ngữ) → các chặng → cụm địa danh trong tên tour */
export { placeKey };

export async function defaultKeywords({ titles = [], route = [], destinations = [] }) {
  const out = [];
  const add = (k) => {
    const v = placeKey(k);
    // bỏ trùng theo dạng viết liền: "ha noi" = "hanoi", "ha long" = "halong"
    if (
      v.length >= 3 &&
      !STOP.has(v) &&
      !out.some((x) => x.replace(/ /g, "") === v.replace(/ /g, ""))
    )
      out.push(v);
  };
  if (destinations.length) {
    const docs = await destinationRepository.find(
      // sanitizeFilter bật toàn cục → $in phải bọc trusted()
      { slug: trusted({ $in: destinations.slice(0, 30) }) },
      { select: "slug name" },
    );
    for (const slug of destinations) {
      const d = docs.find((x) => x.slug === slug);
      add(d?.name?.en || slug.replace(/-/g, " "));
      if (d?.name?.vi) add(d.name.vi);
    }
  }
  route.forEach((r) => phrasesOf(r).forEach(add));
  titles.forEach((t) => phrasesOf(t).forEach(add));
  return out.slice(0, MAX_KEYWORDS);
}

/** Kho đánh giá: mục "Đánh giá khách" + kết quả lần "Lấy đánh giá" gần nhất (bỏ trùng) */
async function pool() {
  const [saved, job] = await Promise.all([
    reviewRepository.find({}, { select: "name title text rating source url date trip language" }),
    settingRepository.get(JOB_KEY).catch(() => null),
  ]);
  const fetched = Array.isArray(job?.result?.items) ? job.result.items : [];
  const seen = new Set();
  const list = [];
  for (const [r, origin] of [
    ...saved.map((r) => [r, "saved"]),
    ...fetched.map((r) => [r, "fetched"]),
  ]) {
    const text = String(r?.text ?? "").trim();
    if (!text) continue;
    const key = `${r.source}|${foldText(r.name).trim()}|${compact(text).slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({
      id: String(r._id ?? key),
      origin,
      name: String(r.name ?? "").trim(),
      title: String(r.title ?? "").trim(),
      text,
      rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))),
      source: r.source || "",
      url: r.url || "",
      date: String(r.date ?? ""),
      trip: [r.trip?.en, r.trip?.vi].filter(Boolean).join(" "),
    });
  }
  return list;
}

/** 1 từ khoá có trong bài không: cụm nhiều chữ so khớp bỏ khoảng trắng ("ha long" = "halong"), 1 chữ so theo từ */
function hits(keyword, s, c) {
  const forms = [keyword, ...(ALIASES[keyword] ?? [])];
  return forms.some((k) =>
    // cụm nhiều chữ / chữ dài (≥ 5, vd. "halong") so khớp bỏ khoảng trắng: "halong" = "Ha Long"; chữ ngắn ("hue") so theo từ
    k.includes(" ") || k.length >= 5 ? c.includes(k.replace(/ /g, "")) : s.includes(` ${k} `),
  );
}

/** Chấm điểm + xếp hạng các bài theo từ khoá (đã chuẩn hoá) và mã tour — chỉ giữ bài có ít nhất 1 từ khớp */
export function rankReviews(all, kw, code = "") {
  const codeKey = compact(code);
  const items = [];
  for (const r of all) {
    const s = spaced(`${r.title} ${r.text} ${r.trip}`);
    const c = s.replace(/\s+/g, "");
    const matches = kw.filter((k) => hits(k, s, c));
    const byCode = codeKey.length >= 3 && c.includes(codeKey);
    if (!matches.length && !byCode) continue;
    const score =
      matches.length * 10 +
      (matches.length >= 2 ? matches.length * 5 : 0) +
      (byCode ? 40 : 0) +
      (spaced(r.trip).trim() && matches.some((k) => spaced(r.trip).includes(` ${k} `)) ? 8 : 0) +
      (r.rating >= 5 ? 2 : 0) +
      (r.text.length >= 160 ? 1 : 0);
    items.push({ ...r, matches, score });
  }
  items.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
  return items;
}

/**
 * Gợi ý đánh giá: { keywords, pool, sources, items[] } — items xếp theo độ phù hợp, mỗi bài kèm `matches`
 * (các từ khoá có trong bài, để tô sáng). `keywords` gửi lên (nhân viên đã sửa) được ưu tiên hơn từ khoá mặc định.
 */
export async function suggestTourReviews({
  titles = [],
  route = [],
  destinations = [],
  code = "",
  keywords,
}) {
  const kw = (
    Array.isArray(keywords) && keywords.length
      ? [...new Set(keywords.map(placeKey))].filter((k) => k.length >= 2)
      : await defaultKeywords({ titles, route, destinations })
  ).slice(0, MAX_KEYWORDS + 4);
  const all = await pool();
  const items = rankReviews(all, kw, code);
  const sources = {};
  for (const r of all) sources[r.source || "other"] = (sources[r.source || "other"] ?? 0) + 1;
  return { keywords: kw, pool: all.length, sources, items: items.slice(0, MAX_ITEMS) };
}
