/**
 * MỘT LẦN: dựng bảng giá có cấu trúc `pricing.groupTiers` từ bảng giá dạng chữ (content.en.priceTables,
 * nhập từ web WordPress cũ) → khung đặt tour tính đúng giá theo số khách & hạng khách sạn.
 *   node --env-file=.env src/scripts/tiers-from-price-tables.js            → chạy thử (mặc định), chỉ in đề xuất
 *   node --env-file=.env src/scripts/tiers-from-price-tables.js --apply    → sao lưu `pricing` + `price` rồi ghi
 *   … --backup-dir <thư mục>                                               → nơi lưu bản sao lưu (mặc định be/backups)
 *   … --vnd   → CHỈ xử lý bảng giá VND: đổi sang USD theo tỷ giá đang lưu trong CMS (Setting "fx"),
 *               làm tròn đô la (≥ 0,5 làm tròn lên). Chưa có tỷ giá hợp lệ → dừng, không ghi gì.
 *
 * Quy tắc:
 * - Chỉ tour có groupTiers đang RỖNG. Tour đã có giá cấu trúc → không đụng.
 * - Mặc định chỉ bảng ghi rõ USD ("USD" ở tiêu đề / "$" trong ô). Bảng VND chỉ xử lý khi chạy với --vnd.
 * - Bậc số khách lấy từ cột ("2–3 Pax | 4 Pax …") hoặc dòng ("2 pax", "3–4 pax"…). "N+" / "trở lên" → maxPax 99
 *   (TourEditor / PriceTable hiểu ≥ 99 là "N+"). Không có giá 1 khách thì không tự thêm.
 *   "04 guests/room" = số khách mỗi PHÒNG, không phải số khách đoàn → không dùng.
 * - Bậc nhỏ nhất phải bắt đầu từ ≤ 2 khách: bảng chỉ có giá đoàn đông (10+ khách) → bỏ qua (nếu điền, khách đi
 *   2 người sẽ bị báo giá đoàn đông → báo thấp).
 * - Hạng khách sạn: 3★ → price, 4★ → price4, 5★ → price5; nhiều dòng cùng hạng → lấy dòng RẺ NHẤT (giá "từ").
 *   Không ghi hạng → price; nhiều cột lựa chọn dịch vụ / ngôn ngữ hướng dẫn viên → cột rẻ nhất.
 * - Mỗi hạng 1 bảng: hạng lấy từ chú thích bảng (heading "3★ Hotels – First Eden / …").
 * - Cùng mùa nhiều bảng có chú thích khác nhau (vd. 2 bảng 4★ hướng biển khác nhau, Option A / B) → cùng hạng lấy
 *   bảng RẺ hơn (giá "từ"). Nhiều bảng khác mùa (period khác nhau) → mỗi ô lấy giá CAO hơn (không báo giá thấp).
 * - Nhiều bảng không phân biệt được (cùng mùa, không nhãn) → bỏ qua, ghi lý do.
 * - `price` (giá "từ" trên thẻ tour) chỉ điền khi đang trống / 0.
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const VND = args.includes("--vnd");
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const BACKUP_DIR = argValue("--backup-dir") ?? path.resolve(import.meta.dirname, "../../backups");

/** Bỏ qua thủ công — bảng đọc được nhưng nội dung không đáng tin */
const MANUAL_SKIP = {
  "hanoi-food-tour-and-incense-stick-making-village-experience":
    "column headers (Hair Wash / Massage) are copied from another tour — unclear which column is this tour's price",
};

const OPEN_MAX = 99;
let RATE = null; // VND / 1 USD (chế độ --vnd)
const clean = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

/** "2–3 Pax" → {min:2,max:3}; "6 Pax" → 6..6; "5 pax and above" / "8+" → 5..99; khác → null */
export function parsePax(cell, { bare = false } = {}) {
  let s = clean(cell).toLowerCase();
  if (/room|phòng/.test(s)) return null; // số khách MỖI PHÒNG, không phải số khách đoàn
  s = s.split("/")[0].trim(); // "10-12 guests / 16-seat vehicle" → "10-12 guests"
  const m =
    /^(?:group of\s*)?(\d{1,2})\s*(?:[–\-—~]|to)?\s*(\d{1,2})?\s*(\+)?\s*(pax|guests?|people|persons?|người|khách)?\s*(\+|trở lên|and above|or more|and up)?$/.exec(
      s,
    );
  if (!m) return null;
  if (!m[4] && !bare && !m[3] && !m[5]) return null; // số trần chỉ chấp nhận khi tiêu đề nói rõ "group size"
  const min = Number(m[1]);
  const open = Boolean(m[3] || m[5]);
  const max = open ? OPEN_MAX : m[2] ? Number(m[2]) : min;
  if (min < 1 || max < min) return null;
  return { min, max };
}

/** "$398" / "327" / "1,200 USD" / "144$" → số USD; ô VND / chữ → null */
export function parseUsd(cell) {
  const s = clean(cell);
  if (!s || /vn[dđ]|đ\b|₫/i.test(s)) return null;
  if (/^\$?\s*\d{1,3}(\.\d{3})+\s*$/.test(s)) return null; // "425.000" kiểu VN = VND
  const m =
    /^(?:usd\s*)?\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:\$|usd)?\s*(?:\/\s*(?:pax|person|guest))?$/i.exec(
      s,
    );
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return n > 0 && n < 20000 ? n : null;
}

/** "2.960.000 vnd/pax" / "1,470,000 VND/guest" / "425.000" / "1.185 .000" → số VND; khác → null */
export function parseVnd(cell) {
  const s = clean(cell)
    .replace(/(\d)\s+([.,]\d{3})/g, "$1$2") // "1.185 .000" (gõ thừa dấu cách)
    .replace(/\s*\/\s*(pax|guests?|khách|person|người|01 guest)\b.*$/i, "")
    .replace(/\s*(vn[dđ]|₫|đ)\s*$/i, "");
  const m = /^(\d{1,3}(?:[.,]\d{3})+)$/.exec(s);
  if (!m) return null;
  const n = Number(m[1].replace(/[.,]/g, ""));
  return n >= 50_000 && n < 200_000_000 ? n : null;
}

/** Giá 1 ô theo chế độ đang chạy → USD (VND đổi theo tỷ giá CMS, làm tròn đô la, ≥ 0,5 lên) */
const money = (cell) => {
  if (!VND) return parseUsd(cell);
  const v = parseVnd(cell);
  return v == null ? null : Math.round(v / RATE);
};

/** Hạng khách sạn trong nhãn: "3* – First Eden…" / "4★ Army…" / "5-star" / "3-Star Hotel" → 3|4|5|null */
export function parseClass(label) {
  const m = /(?:^|[^\d])([345])\s*(?:\*|★|-?\s*stars?\b|\s*sao\b)/i.exec(clean(label));
  return m ? Number(m[1]) : null;
}

const tableText = (t) => clean([t.heading, t.period, ...(t.rows ?? []).flat()].join(" "));
const isUsdTable = (t) => {
  const txt = tableText(t);
  if (/vn[dđ]|₫/i.test(txt)) return false;
  return /\busd\b/i.test(txt) || /\$/.test(txt);
};
const isVndTable = (t) => {
  const txt = tableText(t);
  if (/\busd\b|\$/i.test(txt)) return false;
  return /vn[dđ]|₫/i.test(txt) || /\b\d{1,3}(?:[.,]\d{3}){1,2}\b/.test(txt);
};

// "1.255.000 / KHÁCH (nhóm 2 khách)" — nhiều giá viết liền trong 1 ô
const INLINE = /(\d[\d., ]*\d)\s*\/\s*KHÁCH\s*\(\s*nhóm\s*(từ\s*)?(\d+)?\s*khách\s*\)/gi;

/**
 * 1 bảng → { cells: Map("min-max" → {minPax,maxPax,price,price4,price5}), notes[] } | { error }
 * Hỗ trợ 3 dạng: bậc khách theo CỘT (dòng tiêu đề), theo DÒNG (ô đầu mỗi dòng), hoặc viết liền trong ô.
 */
export function parseTable(t) {
  const rows = (t.rows ?? []).map((r) => r.map(clean));
  const notes = [];
  const cells = new Map();
  // hạng khách sạn ghi ở chú thích bảng (mỗi hạng 1 bảng) → dùng khi trong bảng không ghi hạng
  const headClass = parseClass(t.heading);
  const put = (pax, cls, price, label) => {
    const key = `${pax.min}-${pax.max}`;
    const cur = cells.get(key) ?? {
      minPax: pax.min,
      maxPax: pax.max,
      price: null,
      price4: null,
      price5: null,
    };
    const k = cls === 5 ? "price5" : cls === 4 ? "price4" : "price";
    if (cur[k] != null && cur[k] !== price) {
      if (!notes.some((n) => n.startsWith(`several ${cls}★`)))
        notes.push(
          `several ${cls ? `${cls}★` : "option"} rows → cheapest per cell used ("from" price) [${label}…]`,
        );
      cur[k] = Math.min(cur[k], price);
    } else cur[k] = price;
    cells.set(key, cur);
  };

  // Dạng VIẾT LIỀN: mỗi cột = 1 lựa chọn (vd. ngôn ngữ hướng dẫn viên) → lấy cột rẻ nhất
  const inlineCells = rows.flat().filter((c) => (c.match(INLINE) ?? []).length >= 2);
  if (inlineCells.length) {
    const header =
      rows.find((r) => r.length === inlineCells.length && !r.some((c) => c.match(INLINE))) ?? [];
    const cols = inlineCells.map((c) => {
      const out = [];
      for (const m of c.matchAll(INLINE)) {
        const v = money(m[1]);
        if (v == null) return null;
        let min = m[3] ? Number(m[3]) : null;
        if (min == null) {
          if (!m[2] || !out.length) return null; // thiếu số khách, không suy ra được
          min = out.at(-1).max + 1;
          notes.push(
            `"nhóm từ khách" (number missing) after the ${min - 1}-guest price read as ${min}+ guests`,
          );
        }
        out.push({ min, max: m[2] ? OPEN_MAX : min, v });
      }
      return out;
    });
    if (cols.some((c) => !c)) return { error: "unreadable group prices inside a cell" };
    const best = cols.reduce((a, b) => (b[0].v < a[0].v ? b : a));
    const bi = cols.indexOf(best);
    const everywhere = cols.every((c) => c.every((x, i) => !best[i] || best[i].v <= x.v));
    if (!everywhere) return { error: "no single option column is cheapest for every group" };
    if (cols.length > 1)
      notes.push(
        `one column per option (${header.join(" / ")}) → cheapest column "${header[bi] ?? bi + 1}"`,
      );
    best.forEach((x) => put(x, null, x.v, header[bi] ?? ""));
    return { cells, notes };
  }

  // Dạng CỘT: dòng có ≥ 2 ô bậc khách
  const hIdx = rows.findIndex(
    (r) =>
      r.slice(1).filter((c) => parsePax(c, { bare: /group|size|pax/i.test(r[0]) })).length >= 2,
  );
  if (hIdx >= 0) {
    const header = rows[hIdx];
    const bare = /group|size|pax/i.test(header[0]);
    const cols = header.map((c, i) => (i === 0 ? null : parsePax(c, { bare })));
    const body = rows.slice(hIdx + 1).filter((r) => r.slice(1).some((c) => money(c) != null));
    if (!body.length) return { error: "no prices under the group-size header" };
    // 1 dòng giá không ghi hạng → hạng ở chú thích bảng ("3★ Hotels – First Eden / …")
    const classes = body.map((r) => parseClass(r[0]) ?? (body.length === 1 ? headClass : null));
    if (body.length > 1 && classes.some((c) => c == null))
      return { error: "several price rows but not all have a hotel class" };
    body.forEach((r, ri) => {
      cols.forEach((pax, ci) => {
        if (!pax) return;
        const v = money(r[ci]);
        if (v != null) put(pax, classes[ri], v, r[0].slice(0, 40));
      });
    });
    return { cells, notes };
  }

  // Dạng DÒNG: ô đầu là bậc khách, các ô còn lại là giá (nhiều cột = lựa chọn dịch vụ → rẻ nhất)
  const paxRows = rows.filter((r) => parsePax(r[0]) && r.slice(1).some((c) => money(c) != null));
  if (paxRows.length >= 2) {
    const header = rows.find((r) => !parsePax(r[0]) && r.length > 1) ?? [];
    const colClass = header.map((c, i) => (i === 0 ? null : parseClass(c)));
    const byClass = colClass.some((c) => c);
    paxRows.forEach((r) => {
      const pax = parsePax(r[0]);
      if (!byClass) {
        const vals = r
          .slice(1)
          .map(money)
          .filter((v) => v != null);
        put(pax, headClass, Math.min(...vals), r[0]);
        return;
      }
      r.slice(1).forEach((c, i) => {
        const v = money(c);
        if (v != null) put(pax, colClass[i + 1], v, header[i + 1] ?? "");
      });
    });
    if (!byClass && paxRows.some((r) => r.slice(1).filter((c) => money(c) != null).length > 1))
      notes.unshift(`several option columns (${header.slice(1).join(" / ")}) → cheapest used`);
    return { cells, notes };
  }
  return { error: "no group-size columns or rows" };
}

/** Bậc khách chồng lấn (vd. "5–6" & "6–12") → số khách chung thuộc bậc GIÁ CAO hơn */
function fixOverlaps(tiers, notes) {
  tiers.sort((a, b) => a.minPax - b.minPax || a.maxPax - b.maxPax);
  for (let i = 1; i < tiers.length; i++) {
    const prev = tiers[i - 1];
    const cur = tiers[i];
    if (cur.minPax > prev.maxPax) continue;
    const p = (t) => t.price ?? t.price4 ?? t.price5 ?? 0;
    const before = `${prev.minPax}–${prev.maxPax} & ${cur.minPax}–${cur.maxPax}`;
    if (p(prev) >= p(cur)) cur.minPax = prev.maxPax + 1;
    else prev.maxPax = cur.minPax - 1;
    notes.push(`overlapping ranges ${before} → shared pax get the higher price`);
  }
  return tiers.filter((t) => t.maxPax >= t.minPax);
}

/** Tour → { tiers, notes } | { skip } */
export function proposeTiers(tour) {
  if (MANUAL_SKIP[tour.slug]) return { skip: MANUAL_SKIP[tour.slug] };
  const tables = tour.content?.en?.priceTables ?? [];
  if (VND && tables.some(isUsdTable)) return { skip: "has a USD table (handled without --vnd)" };
  const usable = tables.filter(VND ? isVndTable : isUsdTable);
  if (!usable.length) {
    if (VND) return { skip: "no VND price table" };
    const anyVnd = tables.some(isVndTable);
    return { skip: anyVnd ? "prices in VND only (run with --vnd)" : "no USD price table" };
  }
  const cur = VND ? "VND" : "USD";
  const parsed = usable.map((t) => ({ t, ...parseTable(t) })).filter((p) => !p.error);
  if (!parsed.length)
    return { skip: `${cur} table(s) without group sizes: ${parseTable(usable[0]).error}` };

  const notes = [];
  // Gom theo mùa (period). Cùng mùa nhiều bảng → phải phân biệt được bằng chú thích (vd. "3★ Hotels – …",
  // "4★ Hotels (Full Ocean View) – …", "Option A …"): cùng hạng → giá RẺ hơn (giá "từ"). Khác mùa → giá CAO hơn.
  const seasons = new Map();
  for (const p of parsed) {
    const k = clean(p.t.period);
    seasons.set(k, [...(seasons.get(k) ?? []), p]);
  }
  for (const [period, list] of seasons) {
    if (list.length < 2) continue;
    const heads = list.map((p) => clean(p.t.heading));
    if (heads.some((h) => !h) || new Set(heads).size !== heads.length)
      return {
        skip: `${list.length} unlabelled ${cur} tables for ${period ? `period "${period}"` : "the same period"} — cannot tell which variant each is`,
      };
  }
  const mergeInto = (target, cells, pick) => {
    for (const [key, c] of cells) {
      const m = target.get(key);
      if (!m) target.set(key, { ...c });
      else for (const k of ["price", "price4", "price5"]) m[k] = pick(m[k], c[k]);
    }
  };
  const lower = (a, b) => (a > 0 && b > 0 ? Math.min(a, b) : a || b || null);
  const higher = (a, b) => Math.max(a ?? 0, b ?? 0) || null;
  const merged = new Map();
  const perSeason = [];
  for (const [period, list] of seasons) {
    const cells = new Map();
    for (const p of list) {
      notes.push(...p.notes.map((n) => (seasons.size > 1 ? `[${period}] ${n}` : n)));
      mergeInto(cells, p.cells, lower);
    }
    if (list.length > 1) {
      const byClass = new Map();
      for (const p of list)
        for (const c of p.cells.values())
          for (const [k, n] of [
            ["price", 3],
            ["price4", 4],
            ["price5", 5],
          ])
            if (c[k] != null) byClass.set(n, (byClass.get(n) ?? new Set()).add(clean(p.t.heading)));
      for (const [n, hs] of byClass)
        if (hs.size > 1)
          notes.push(
            `${period ? `[${period}] ` : ""}${hs.size} tables for ${n === 3 ? "3★/base" : `${n}★`} (${[...hs].map((h) => h.split(" – ")[0]).join(" | ")}) → cheaper per cell`,
          );
    }
    perSeason.push([...cells.keys()].sort().join(","));
    mergeInto(merged, cells, higher);
  }
  if (seasons.size > 1) {
    notes.push(`seasonal tables (${[...seasons.keys()].join(" | ")}) → higher price per cell`);
    if (new Set(perSeason).size > 1) notes.push("seasons have different group sizes — union used");
  }
  const tiers = fixOverlaps([...merged.values()], notes);
  if (!tiers.length) return { skip: "no usable prices" };
  if (tiers[0].minPax > 2)
    return {
      skip: `prices only for groups of ${tiers[0].minPax}+ (${tiers.map((x) => `${x.minPax}–${x.maxPax}`).join(", ")}) — no small-group price; filling would under-quote 2 guests`,
    };
  if (VND) notes.push(`converted from VND at ${RATE} VND/USD, rounded to whole dollars`);
  return { tiers, notes: [...new Set(notes)] };
}

const fmtTier = (t) =>
  `${t.maxPax >= OPEN_MAX ? `${t.minPax}+` : t.minPax === t.maxPax ? t.minPax : `${t.minPax}–${t.maxPax}`} pax: ` +
  [t.price && `3★/base $${t.price}`, t.price4 && `4★ $${t.price4}`, t.price5 && `5★ $${t.price5}`]
    .filter(Boolean)
    .join(", ");

async function main() {
  await connectDatabase();
  if (VND) {
    const fx = await mongoose.connection.db.collection("settings").findOne({ key: "fx" });
    RATE = Number(fx?.value?.rate);
    if (!(RATE >= 15_000 && RATE <= 40_000)) {
      console.error('No valid USD→VND rate in settings (key "fx") — stopping, nothing written.');
      process.exitCode = 1;
      return;
    }
    console.log(
      `VND mode — rate ${RATE} VND/USD (source: ${fx.value.source}, fetched ${fx.value.fetchedAt})`,
    );
  }
  const col = mongoose.connection.db.collection("tours");
  const tours = await col
    .find(
      {},
      { projection: { slug: 1, price: 1, pricing: 1, "content.en.priceTables": 1, isActive: 1 } },
    )
    .toArray();

  const updates = [];
  const skipped = [];
  let structured = 0;
  for (const t of tours) {
    if (t.pricing?.groupTiers?.length) {
      structured++;
      continue;
    }
    if (!t.content?.en?.priceTables?.length) continue;
    const r = proposeTiers(t);
    if (r.skip) skipped.push({ slug: t.slug, reason: r.skip });
    else {
      const fromPrice = Math.min(
        ...r.tiers.flatMap((x) => [x.price, x.price4, x.price5]).filter((v) => v > 0),
      );
      updates.push({
        tour: t,
        tiers: r.tiers,
        notes: r.notes,
        setPrice: t.price > 0 ? null : fromPrice,
      });
    }
  }

  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"} — ${tours.length} tours, ${structured} already structured (untouched)\n`,
  );
  for (const u of updates) {
    console.log(
      `✔ ${u.tour.slug}${u.tour.isActive === false ? " (inactive)" : ""}  card price: ${u.tour.price ?? "—"}${u.setPrice ? ` → ${u.setPrice}` : " (kept)"}`,
    );
    u.tiers.forEach((t) => console.log(`    ${fmtTier(t)}`));
    u.notes.forEach((n) => console.log(`    · ${n}`));
  }
  console.log(`\nSkipped (${skipped.length}):`);
  skipped.forEach((s) => console.log(`  ✘ ${s.slug} — ${s.reason}`));

  if (!APPLY) {
    console.log("\n(dry run — nothing written; add --apply to write)");
    return;
  }
  if (!updates.length) return;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(
    BACKUP_DIR,
    `tiers-from-price-tables${VND ? "-vnd" : ""}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(
    file,
    JSON.stringify(
      updates.map((u) => ({
        _id: String(u.tour._id),
        slug: u.tour.slug,
        price: u.tour.price ?? null,
        pricing: u.tour.pricing ?? null,
      })),
      null,
      2,
    ),
  );
  console.log(`\nBackup: ${file}`);

  let n = 0;
  for (const u of updates) {
    const set = { "pricing.groupTiers": u.tiers, updatedAt: new Date() };
    if (u.setPrice) set.price = u.setPrice;
    // điều kiện groupTiers vẫn rỗng → không ghi đè nếu ai đó vừa nhập giá trong CMS
    const res = await col.updateOne(
      {
        _id: u.tour._id,
        $or: [{ "pricing.groupTiers": { $size: 0 } }, { "pricing.groupTiers": { $exists: false } }],
      },
      { $set: set },
    );
    n += res.modifiedCount;
    if (!res.modifiedCount)
      console.log(`  ! ${u.tour.slug} not modified (groupTiers changed meanwhile?)`);
  }
  console.log(`Updated ${n}/${updates.length} tours.`);
}

// Chỉ chạy khi gọi trực tiếp (reimport-price-tables.js dùng lại proposeTiers / parseTable)
if (path.resolve(process.argv[1] ?? "") === import.meta.filename)
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
