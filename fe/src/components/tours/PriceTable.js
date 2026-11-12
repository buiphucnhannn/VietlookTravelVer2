// Bảng giá lấy từ website cũ có cấu trúc không đều (ô gộp dọc, dòng chú thích, không có dòng tiêu đề).
// Chuẩn hoá trước khi hiển thị để mọi bảng đều thẳng hàng, dễ đọc.
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

// Là giá khi có số đi kèm đơn vị tiền ("28 USD", "144$", "$95") hoặc số từ 3 chữ số;
// "Price (USD/PAX)" (tiêu đề cột) không phải giá
const hasPrice = (c) => /\d[\d.,]*\s*(USD|\$)|\$\s*\d|\d{3}/i.test(c || "");

/**
 * - Dòng đầu chỉ có 1 ô trong khi bảng nhiều cột → coi là chú thích (caption).
 * - Dòng thiếu ô (do ô gộp dọc ở bảng gốc) → các ô còn lại được đặt vào cột giá,
 *   các cột khác gộp với dòng trên (rowSpan).
 * - Dòng đầu chứa giá → bảng không có dòng tiêu đề.
 */
export function normalizeTable(rows) {
  let body = rows.filter((r) => r.some((c) => String(c).trim()));
  // Cột đầu chỉ toàn số thứ tự (1, 2, 3…) của bảng gốc → bỏ
  const multi = body.filter((r) => r.length > 1);
  if (multi.length > 1 && multi.every((r) => /^\d{1,2}$/.test(String(r[0]).trim()))) {
    body = body.map((r) => (r.length > 1 ? r.slice(1) : r));
  }
  const width = Math.max(...body.map((r) => r.length));
  let caption = null;
  if (width > 1 && body[0]?.length === 1) {
    caption = body[0][0];
    body = body.slice(1);
  }

  // Lưới ô: { text, rowSpan } hoặc null (ô bị gộp vào dòng trên)
  const grid = [];
  body.forEach((row, i) => {
    if (row.length >= width || i === 0) {
      grid.push(Array.from({ length: width }, (_, j) => ({ text: row[j] ?? "", rowSpan: 1 })));
      return;
    }
    const prev = body[i - 1].length >= width ? body[i - 1] : body.find((r) => r.length >= width);
    const start = Math.max(0, prev ? prev.findIndex(hasPrice) : 0);
    const cells = Array.from({ length: width }, (_, j) =>
      j >= start && j < start + row.length ? { text: row[j - start], rowSpan: 1 } : null,
    );
    // Cột không có dữ liệu → kéo dài ô gần nhất phía trên
    cells.forEach((c, j) => {
      if (c) return;
      for (let k = grid.length - 1; k >= 0; k--) {
        if (grid[k][j]) {
          grid[k][j].rowSpan += 1;
          break;
        }
      }
    });
    grid.push(cells);
  });

  const header = grid.length > 1 && !body[0].some(hasPrice) ? grid[0] : null;
  return { caption, header, rows: header ? grid.slice(1) : grid };
}

/** Cột có ô chữ dài (> 40 ký tự, vd. ghi chú / điều kiện) → căn trái; còn lại căn giữa */
const longCol = (rows, k) => rows.some((r) => (r[k]?.text?.length ?? 0) > 40);

/**
 * Chú thích bảng "3★ Hotels – First Eden / Verle Lotus Classic Cruise / …" → hạng khách sạn (đậm) + danh sách
 * khách sạn (chữ nhỏ, nhạt hơn). Chú thích không có " – " → 1 dòng như cũ.
 */
function splitHeading(text) {
  const i = text.indexOf(" – ");
  return i > 0 && i <= 80 ? [text.slice(0, i), text.slice(i + 3)] : [text, ""];
}

export default function PriceTable({ table }) {
  const { caption, header, rows } = normalizeTable(table.rows);
  const heading = [table.heading !== "Price" && table.heading, caption].filter(Boolean).join(" · ");
  const [title, sub] = splitHeading(heading);
  const cols = Math.max(header?.length ?? 0, ...rows.map((r) => r.length));

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-border">
      {heading && (
        <div className="bg-brand-600 px-4 py-2.5 text-white">
          <p className="text-sm font-semibold">{title}</p>
          {sub && <p className="mt-0.5 text-xs leading-relaxed text-white/80">{sub}</p>}
        </div>
      )}
      {/* Ô ngắn (số khách, giá, hạng…) căn giữa cho cân đối; ô chữ dài (ghi chú, điều kiện) căn trái cho dễ đọc.
          Bảng ≤ 3 cột vừa màn hình điện thoại → không ép rộng tối thiểu (khỏi phải cuộn ngang). */}
      <table className={cn("w-full text-sm", cols > 3 && "min-w-[520px]")}>
        {header && (
          <thead className="bg-brand-50 text-brand-800">
            <tr>
              {header.map((h, j) => (
                <th
                  key={j}
                  className={cn(
                    "px-4 py-3 align-middle font-semibold",
                    longCol(rows, j) ? "text-left" : "text-center",
                  )}
                >
                  {h.text}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border first:border-t-0">
              {r.map((cell, k) =>
                cell ? (
                  <td
                    key={k}
                    rowSpan={cell.rowSpan}
                    className={cn(
                      "px-4 py-3 align-middle",
                      longCol(rows, k) ? "text-left" : "text-center",
                      hasPrice(cell.text) && cell.text.length < 40
                        ? "font-semibold whitespace-nowrap text-sun-600"
                        : k === 0
                          ? "font-medium text-ink"
                          : "min-w-56 text-ink/80",
                    )}
                  >
                    {cell.text}
                  </td>
                ) : null,
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Các bảng giá của tour, gom theo mùa (period). Mỗi mùa 1 tiêu đề phụ ("Travel period: 01/04 – 31/08") + ghi chú
 * chung (phần sau " · ", vd. "Based on twin/double/triple sharing"), rồi các bảng của mùa đó (mỗi bảng có chú thích
 * hạng khách sạn riêng) → khách phân biệt được 3★ / 4★ / 5★ và từng mùa.
 */
export function PriceTables({ tables }) {
  const groups = [];
  for (const t of tables ?? []) {
    const key = (t.period ?? "").trim();
    const last = groups.at(-1);
    if (last && last.key === key) last.tables.push(t);
    else groups.push({ key, tables: [t] });
  }
  return groups.map((g, gi) => {
    const [period, ...notes] = g.key.split(" · ");
    return (
      <section key={gi} className="space-y-3">
        {g.key && (
          <div className={cn(groups.length > 1 && "border-l-4 border-brand-500 pl-3")}>
            {period && (
              <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                <CalendarDays aria-hidden className="size-4 shrink-0 text-brand-600" />
                {period}
              </h3>
            )}
            {notes.length > 0 && <p className="mt-0.5 text-sm text-muted">{notes.join(" · ")}</p>}
          </div>
        )}
        {g.tables.map((tb, i) => (
          <PriceTable key={i} table={tb} />
        ))}
      </section>
    );
  });
}

/* ───────── Bảng giá nhập trong CMS (theo "Mẫu thông tin tour") ───────── */

const PL = {
  group: { en: "Group size", zh: "人数", vi: "Số khách" },
  pax: { en: "pax", zh: "人", vi: "khách" },
  perPerson: { en: "Price per person (USD)", zh: "每人价格（美元）", vi: "Giá mỗi khách (USD)" },
  hotel: { en: "{n}★ hotel", zh: "{n}星酒店", vi: "KS {n} sao" },
  price: { en: "Price", zh: "价格", vi: "Giá" },
  children: { en: "Children", zh: "儿童价格", vi: "Giá trẻ em" },
  age: { en: "{a} years", zh: "{a}岁", vi: "{a} tuổi" },
  free: { en: "Free", zh: "免费", vi: "Miễn phí" },
  ofAdult: { en: "{p}% of adult price", zh: "成人价的{p}%", vi: "{p}% giá người lớn" },
  surcharges: { en: "Supplements", zh: "附加费用", vi: "Phụ thu" },
  single: { en: "Single room supplement", zh: "单房差", vi: "Phụ thu phòng đơn" },
  holiday: {
    en: "Holiday & peak-season surcharge",
    zh: "节假日及旺季附加费",
    vi: "Phụ thu ngày lễ & cao điểm",
  },
  perPax: { en: "per person", zh: "/人", vi: "/khách" },
  ofTour: { en: "{p}% of the tour price", zh: "团费的{p}%", vi: "{p}% giá tour" },
};
const pl = (k, lang, vars = {}) =>
  Object.entries(vars).reduce((s, [v, x]) => s.replace(`{${v}}`, x), PL[k][lang] ?? PL[k].en);
const usd = (n) => `$${Number(n).toLocaleString("en-US")}`;
const range = (a, b) => (b == null || b >= 99 ? `${a}+` : a === b ? `${a}` : `${a}–${b}`);

/** Tour có bảng giá có cấu trúc (nhập trong CMS) để hiển thị không */
export const hasStructuredPricing = (p) =>
  !!(
    p?.groupTiers?.some((t) => t.price > 0 || t.price4 > 0 || t.price5 > 0) ||
    p?.childRates?.length ||
    p?.singleSupplement > 0 ||
    p?.holidaySurcharge > 0 ||
    p?.holidayPercent > 0
  );

/** Bảng giá theo số khách × hạng khách sạn, giá trẻ em theo tuổi, phụ thu (phòng đơn, ngày lễ & cao điểm) */
export function PricingGrid({ pricing, lang }) {
  const tiers = (pricing?.groupTiers ?? []).filter(
    (t) => t.price > 0 || t.price4 > 0 || t.price5 > 0,
  );
  const cols = [
    ["price", 3],
    ["price4", 4],
    ["price5", 5],
  ].filter(([k]) => tiers.some((t) => t[k] > 0));
  const multi = cols.length > 1 || cols.some(([k]) => k !== "price");
  const kids = pricing?.childRates ?? [];
  const extras = [
    pricing?.singleSupplement > 0 && [
      pl("single", lang),
      `${usd(pricing.singleSupplement)} ${pl("perPax", lang)}`,
    ],
    (pricing?.holidaySurcharge > 0 || pricing?.holidayPercent > 0) && [
      pl("holiday", lang),
      [
        pricing.holidaySurcharge > 0 && `${usd(pricing.holidaySurcharge)} ${pl("perPax", lang)}`,
        pricing.holidayPercent > 0 && pl("ofTour", lang, { p: pricing.holidayPercent }),
      ]
        .filter(Boolean)
        .join(" + "),
    ],
  ].filter(Boolean);
  const th = "px-3 py-3 font-semibold sm:px-4";
  return (
    <div className="space-y-6">
      {tiers.length > 0 && (
        <div className="overflow-x-auto rounded-xl ring-1 ring-border">
          <p className="bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
            {pl("perPerson", lang)}
          </p>
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-brand-800">
              <tr>
                <th scope="col" className={`${th} text-center`}>
                  {pl("group", lang)}
                </th>
                {cols.map(([k, n]) => (
                  <th key={k} scope="col" className={`${th} text-center`}>
                    {multi ? pl("hotel", lang, { n }) : pl("price", lang)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => (
                <tr key={i} className="border-t border-border">
                  <th
                    scope="row"
                    className="px-3 py-3 text-center font-medium whitespace-nowrap text-ink sm:px-4"
                  >
                    {range(t.minPax ?? 1, t.maxPax)} {pl("pax", lang)}
                  </th>
                  {cols.map(([k]) => (
                    <td
                      key={k}
                      className="px-3 py-3 text-center font-semibold whitespace-nowrap text-sun-600 sm:px-4"
                    >
                      {t[k] > 0 ? usd(t[k]) : "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(kids.length > 0 || extras.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {kids.length > 0 && (
            <div className="rounded-xl bg-surface p-4 text-sm">
              <p className="mb-2 font-bold text-ink">{pl("children", lang)}</p>
              <ul className="space-y-1.5 text-ink/80">
                {kids.map((r, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{pl("age", lang, { a: range(r.minAge ?? 0, r.maxAge) })}</span>
                    <b className="text-right text-ink">
                      {r.percent > 0 ? pl("ofAdult", lang, { p: r.percent }) : pl("free", lang)}
                    </b>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {extras.length > 0 && (
            <div className="rounded-xl bg-surface p-4 text-sm">
              <p className="mb-2 font-bold text-ink">{pl("surcharges", lang)}</p>
              <ul className="space-y-1.5 text-ink/80">
                {extras.map(([label, value]) => (
                  <li key={label} className="flex justify-between gap-3">
                    <span>{label}</span>
                    <b className="text-right text-ink">{value}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Tóm tắt giá trẻ em theo bảng trong CMS (gợi ý dưới ô chọn tuổi khi đặt tour) */
export function childRatesSummary(rates, lang) {
  if (!rates?.length) return null;
  return rates
    .map(
      (r) =>
        `${pl("age", lang, { a: range(r.minAge ?? 0, r.maxAge) })}: ${
          r.percent > 0 ? `${r.percent}%` : pl("free", lang)
        }`,
    )
    .join(" · ");
}
