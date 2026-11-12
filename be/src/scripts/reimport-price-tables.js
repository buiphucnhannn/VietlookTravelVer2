/**
 * MỘT LẦN: nhập lại BẢNG GIÁ tour từ web WordPress cũ (vietlooktravel.com) cho đầy đủ, đúng như trang gốc.
 *
 * Lần chuyển dữ liệu đầu (migrate-old-site.js) chỉ lấy bảng trong mục "giá" của nội dung bài và gán cho mọi
 * bảng cùng 1 tiêu đề mục ("NETT RATES PER PERSON (USD)") → mất dòng chú thích riêng của từng bảng
 * (hạng khách sạn + tên khách sạn), mất bảng / mùa nằm sau một tiêu đề phụ, khách không phân biệt được các bảng.
 *
 *   node --env-file=.env src/scripts/reimport-price-tables.js              → chạy thử (mặc định): tải trang cũ, so sánh, in báo cáo
 *   node --env-file=.env src/scripts/reimport-price-tables.js --apply      → sao lưu rồi ghi
 *   … --slug <slug>        chỉ 1 tour
 *   … --refresh            tải lại trang cũ (bỏ qua bản lưu tạm)
 *   … --cache-dir <dir>    nơi lưu HTML trang cũ (mặc định: thư mục tạm của hệ điều hành / vietlook-oldtours)
 *   … --backup-dir <dir>   nơi lưu bản sao lưu (mặc định be/backups)
 *   … --report <file.json> ghi báo cáo chi tiết từng tour
 *
 * Quy tắc:
 * - Chỉ tour có `sourceUrl` trên vietlooktravel.com. Tải lịch sự: tối đa 3 trang cùng lúc, nghỉ giữa các lần tải.
 * - Bỏ qua tour nhân viên đã sửa trong CMS (nhật ký có "tour.update" / tour tạo trong CMS) — chỉ liệt kê.
 * - Chỉ ghi khi trang cũ có NHIỀU / TỐT hơn: thêm bảng, thêm mùa, thêm chú thích. Mọi bảng đang có trong DB
 *   phải tìm thấy (cùng các dòng) trên trang cũ — không thì giữ nguyên (không xoá dữ liệu chỉ có trong DB).
 * - content.en.priceTables ← bộ bảng đầy đủ (heading = chú thích bảng, period = "Travel period: …").
 *   content.vi / content.zh ← dựng lại từ bảng tiếng Anh (dịch chú thích, mùa, ô tiêu đề; tên khách sạn giữ nguyên).
 * - pricing.groupTiers: tính lại bằng tiers-from-price-tables.js (3★ → price, 4★ → price4, 5★ → price5; 2 bảng
 *   4★ cùng mùa → rẻ hơn; khác mùa → giá CAO hơn). Chỉ ghi khi groupTiers đang trống hoặc do script đó điền.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import mongoose from "mongoose";
import { DomUtils, parseDocument } from "htmlparser2";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { proposeTiers } from "./tiers-from-price-tables.js";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const REFRESH = args.includes("--refresh");
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const ONLY = argValue("--slug");
const CACHE_DIR = argValue("--cache-dir") ?? path.join(os.tmpdir(), "vietlook-oldtours");
const BACKUP_DIR = argValue("--backup-dir") ?? path.resolve(import.meta.dirname, "../../backups");
const REPORT = argValue("--report");
const OLD_HOST = /^https?:\/\/(?:www\.)?vietlooktravel\.com\//i;

/* ============================== tiện ích chữ / HTML (như migrate-old-site.js) ============================== */

const squash = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
const fold = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
const isTag = (n) => n?.type === "tag";
const text = (node) => squash(DomUtils.textContent(node));
const inner = (node) => DomUtils.getInnerHTML(node, { encodeEntities: "utf8" });
const findAll = (nodes, test) => DomUtils.findAll((e) => test(e), [].concat(nodes));

/** Ô của bảng: như migrate-old-site.js (tableRows) */
function tableRows(table) {
  return findAll(table, (e) => e.name === "tr")
    .map((tr) =>
      tr.children
        .filter((c) => isTag(c) && ["td", "th"].includes(c.name))
        .map((c) => text(c).slice(0, 2000)),
    )
    .filter((r) => r.some(Boolean))
    .slice(0, 60)
    .map((r) => r.slice(0, 12));
}

/* ============================== tải trang cũ ============================== */

function limiter(n) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= n || !queue.length) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn()
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}
const slot = limiter(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(slug, url) {
  const file = path.join(CACHE_DIR, `${slug}.html`);
  if (!REFRESH && fs.existsSync(file)) return { html: fs.readFileSync(file, "utf8"), cached: true };
  return slot(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; content-migration)" },
          redirect: "follow",
          signal: AbortSignal.timeout(30_000),
        });
        if (res.status === 404 || res.status === 410) return { error: `HTTP ${res.status}` };
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        fs.writeFileSync(file, html);
        await sleep(400);
        return { html, finalUrl: res.url };
      } catch (err) {
        if (attempt === 3) return { error: String(err.message ?? err) };
        await sleep(1500 * attempt);
      }
    }
  });
}

/* ============================== tách bảng giá từ trang cũ ============================== */

const SKIP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "form",
  "nav",
  "header",
  "footer",
  "aside",
  "iframe",
  "button",
  "select",
  "svg",
]);
const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote"]);

/** Nội dung tour → dãy khối theo thứ tự đọc: { kind: "text", lines, tag, bold, em } | { kind: "table", rows } */
export function linearize(root) {
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.type === "text") {
        if (n.data.trim()) out.push({ kind: "text", tag: "#text", lines: [{ t: squash(n.data) }] });
        continue;
      }
      if (!isTag(n) || SKIP_TAGS.has(n.name)) continue;
      if (n.name === "table") {
        const rows = tableRows(n);
        if (rows.length) out.push({ kind: "table", rows });
        continue;
      }
      if (BLOCK_TAGS.has(n.name) && !findAll(n.children, (e) => e.name === "table").length) {
        const parts = inner(n).split(/<br\b[^>]*>/i);
        const lines = [];
        for (const part of parts) {
          const d = parseDocument(part, { decodeEntities: true });
          const t = text(d);
          if (!t) continue;
          const bold = squash(
            findAll(d.children, (e) => ["strong", "b"].includes(e.name))
              .map(text)
              .join(" "),
          );
          const em = squash(
            findAll(d.children, (e) => ["em", "i"].includes(e.name))
              .map(text)
              .join(" "),
          );
          lines.push({
            t,
            bold: bold.replace(/\s/g, "").length >= t.replace(/\s/g, "").length * 0.9,
            em: em.replace(/\s/g, "").length >= t.replace(/\s/g, "").length * 0.9,
          });
        }
        if (lines.length) out.push({ kind: "text", tag: n.name, lines });
        continue;
      }
      walk(n.children);
    }
  };
  walk([].concat(root));
  return out;
}

/** Vùng nội dung tour trên trang (theme Flatsome của web cũ) */
export function contentRoot(doc) {
  const main = findAll(doc.children, (e) => e.name === "main")[0] ?? doc;
  // bỏ khối "tour liên quan", bình luận, đánh giá, form liên hệ…
  for (const e of findAll(main, (x) =>
    /related|comments?|review|wpcf7|share|breadcrumb|sidebar|widget/i.test(
      `${x.attribs?.class ?? ""} ${x.attribs?.id ?? ""}`,
    ),
  ))
    DomUtils.removeElement(e);
  return main;
}

const PERIOD_RX =
  /travel(?:l?ing)? period|travel dates?|validity|valid (?:from|until|till|to)|th[oờ]i gian [aá]p d[uụ]ng|^\s*\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\s*(?:[–\-—~]|to|đến)\s*\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\s*$/i;
const PRICE_HEAD_RX =
  /\bprice|\brates?\b|\bcost|tariff|gi[aá] tour|b[aả]ng gi[aá]|\bnett?\b|per person|\/\s*pax|\/\s*person/i;
const STOP_HEAD_RX =
  /^\W*(?:the |tour |price |what'?s? )?(?:inclu|exclu|bao g[oồ]m|kh[oô]ng bao g[oồ]m|notes?\b|l[uư]u [yý]|policy|child|ch[ií]nh s[aá]ch|cancel|highlight|itinerar|l[iị]ch tr[iì]nh|(?:day|ng[aà]y)\s*\d|faq|what to bring|terms|useful information|th[uự]c [dđ][oơ]n|menu|sample menu)/i;
const CLASS_RX = /[345]\s*(?:★|\*|-?\s*stars?\b|\s*sao\b)/i;
const isPriceTable = (rows) => rows.flat().some((c) => /\d{2,}|usd|\$|vn[dđ]|₫/i.test(c));
/** Ghi chú chung của mục giá: "(Based on twin/double/triple sharing)" hoặc dòng nghiêng "Based on …" */
const isNote = (l) =>
  l.t.length <= 200 &&
  !CLASS_RX.test(l.t) &&
  (/^\(.*\)$/.test(l.t) || (l.em && /^(?:based on|appl(?:y|ies)|valid)/i.test(l.t)));
const isPeriod = (t) => PERIOD_RX.test(t) && t.length <= 160 && !CLASS_RX.test(t);
/** "TRAVEL PERIOD: 01/04 – 31/08" / "Traveling Period: 01 April – 31 August" → "Travel period: …" */
export const tidyPeriod = (t) =>
  squash(t)
    .replace(/^travel(?:l?ing)? period\s*:?\s*/i, "Travel period: ")
    .replace(/\s*[-–—]\s*/g, " – ")
    .replace(/:\s*$/, "");

/**
 * Trang cũ → [{ section, note, period, caption, rows }]
 * Đọc lần lượt các khối của nội dung tour:
 *   tiêu đề mục giá ("NETT RATES PER PERSON (USD)", "TOUR PRICE", "PRICE/PERSON:")
 *   → ghi chú trong ngoặc "(Based on twin/double/triple sharing)"
 *   → mùa "TRAVEL PERIOD: 01/04 – 31/08"
 *   → chú thích riêng của bảng = khối ngắn NGAY TRƯỚC bảng, dòng đầu in đậm ("3★ Hotels" + dòng tên khách sạn)
 *   → bảng.
 * Lần nhập đầu chỉ giữ tiêu đề mục (mọi bảng cùng 1 tên) và bỏ chú thích → nguồn gốc lỗi.
 */
export function parseOldPriceTables(html) {
  const doc = parseDocument(html, { decodeEntities: true });
  const blocks = linearize(contentRoot(doc));
  const tables = [];
  let section = null;
  let note = null;
  let period = null;
  let caption = null; // khối ngắn ngay trước bảng
  for (const b of blocks) {
    if (b.kind === "table") {
      if (isPriceTable(b.rows))
        tables.push({ section, note, period, caption, rows: b.rows, inSection: !!section });
      caption = null;
      continue;
    }
    const heading = /^h[1-6]$/.test(b.tag);
    const lines = [];
    for (const l of b.lines) {
      const t = l.t;
      if (isPeriod(t)) {
        period = tidyPeriod(t);
        caption = null;
      } else if (isNote(l) && (section || period)) {
        note = t.replace(/^\((.*)\)$/, "$1").trim();
        caption = null;
      } else lines.push(l);
    }
    if (!lines.length) continue;
    const all = squash(lines.map((l) => l.t).join(" "));
    const boldHead = lines.length === 1 && lines[0].bold && all.length <= 90;
    if ((heading || boldHead) && all.length <= 160 && !CLASS_RX.test(all)) {
      if (STOP_HEAD_RX.test(all)) {
        section = note = period = caption = null;
        continue;
      }
      if (PRICE_HEAD_RX.test(all)) {
        section = all.replace(/:\s*$/, "");
        note = period = caption = null;
        continue;
      }
    }
    // chú thích bảng: ngắn, dòng đầu in đậm / là tiêu đề nhỏ
    if (all.length <= 300 && (heading || lines[0].bold) && b.lines.length <= 3) {
      caption = {
        title: lines[0].t,
        sub: squash(
          lines
            .slice(1)
            .map((l) => l.t)
            .join(" / "),
        ),
      };
    } else caption = null;
  }
  return tables;
}

/* ============================== bộ bảng mới (en) ============================== */

const norm = (s) => fold(squash(s)).replace(/[^a-z0-9]+/g, "");
// "$85" ≡ "85 USD" ≡ "85USD" (giá trong DB đã được chuẩn hoá về dạng "$85" sau lần nhập đầu)
const rowsKey = (rows) =>
  (rows ?? [])
    .map((r) => r.map((c) => norm(String(c).replace(/usd|\$/gi, ""))).join("|"))
    .join("\n");
/** Ô giá của bảng MỚI theo cùng kiểu với DB: "463USD" / "28 USD/PAX" → "$463" / "$28/PAX" */
const tidyPrice = (c) =>
  String(c).replace(/^(\+?)\s*(\d[\d,]*)\s*USD\b/i, (_, plus, n) => `${plus}$${n}`);
const isVietnamese = (s) => /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(s ?? "");

/** Chú thích bảng → heading: "3★ Hotels – First Eden / Verle Lotus Classic Cruise / …" */
const captionText = (c) => (c ? (c.sub ? `${c.title} – ${c.sub}` : c.title) : null);
/** Mùa + ghi chú chung → period: "Travel period: 01/04 – 31/08 · Based on twin/double/triple sharing" */
const periodText = (o) => [o.period, o.note].filter(Boolean).join(" · ") || null;

/* ============================== dịch chú thích / mùa / ô tiêu đề (en → vi, zh) ============================== */

/** Cụm cố định. Tên khách sạn / du thuyền KHÔNG dịch. */
const PHRASES = {
  // "Group Size" → bản dịch đang dùng trên web (bộ nhớ dịch): "Quy mô nhóm" / "团队人数"
  "NETT RATE PER PERSON IN USD": { vi: "Giá net mỗi khách (USD)", zh: "每人净价（美元）" },
  "NETT RATES PER PERSON (USD)": { vi: "Giá net mỗi khách (USD)", zh: "每人净价（美元）" },
  "Price (USD/pax)": { vi: "Giá (USD/khách)", zh: "价格（美元/人）" },
  "USD/pax": { vi: "USD/khách", zh: "美元/人" },
  "Based on twin/double/triple sharing": {
    vi: "Giá tính cho khách ở phòng đôi / phòng ba",
    zh: "按双人间 / 三人间入住计价",
  },
  "Based on twin/double/triple sharing room": {
    vi: "Giá tính cho khách ở phòng đôi / phòng ba",
    zh: "按双人间 / 三人间入住计价",
  },
  "Full Ocean View": { vi: "hướng biển toàn cảnh", zh: "全海景" },
  "Partial Seaview": { vi: "hướng biển một phần", zh: "部分海景" },
  "Option A (Lunch Not Included)": {
    vi: "Lựa chọn A (không gồm bữa trưa)",
    zh: "方案A（不含午餐）",
  },
  "Option B (Lunch Included)": { vi: "Lựa chọn B (gồm bữa trưa)", zh: "方案B（含午餐）" },
  "PRICE/PERSON": { vi: "Giá/khách", zh: "每人价格" },
  "3* hotel & 3* cruise": { vi: "Khách sạn 3* & du thuyền 3*", zh: "三星酒店及三星游船" },
  "Da Nang: Sekong Hotel ( superior room) Ha Noi: Diamond Nostalgia Hotel ( superior) Ha Long: Cozy Bay Cruise ( deluxe) Ho Chi Minh: Elios hotel":
    {
      vi: "Đà Nẵng: Sekong Hotel (phòng Superior) Hà Nội: Diamond Nostalgia Hotel (Superior) Hạ Long: Cozy Bay Cruise (Deluxe) TP. Hồ Chí Minh: Elios Hotel",
      zh: "岘港：Sekong Hotel（高级房） 河内：Diamond Nostalgia Hotel（高级房） 下龙湾：Cozy Bay Cruise（豪华舱） 胡志明市：Elios Hotel",
    },
};

/** Trang gốc tiếng Việt, DB chưa có bảng → ô tiếng Việt giữ nguyên (bản vi), dịch sang en / zh */
const VI_SOURCE = {
  "": { vi: "Bảng giá", en: "Price List", zh: "价格表" }, // tiêu đề khi trang cũ không có
  "BÀNG GIÁ GHÉP LẺ": { vi: "BẢNG GIÁ GHÉP LẺ", en: "JOIN-IN TOUR PRICES", zh: "散客拼团价格表" },
  "ĐƠN GIÁ": { en: "PRICE", zh: "单价" },
  "KHÁCH SẠN": { en: "HOTEL", zh: "酒店" },
  XE: { en: "VEHICLE", zh: "车型" },
  "U29 HOẶC U45 CHỖ": { vi: "U29 hoặc U45 chỗ", en: "U29 or U45 seats", zh: "U29或U45座" },
  "Lưu ý: Hộ chiếu phải còn hạn trên 6 tháng Số tuổi của trẻ em được tính theo hộ chiếu": {
    vi: "Lưu ý: Hộ chiếu phải còn hạn trên 6 tháng. Số tuổi của trẻ em được tính theo hộ chiếu.",
    en: "Note: Passports must be valid for more than 6 months. Children's ages are counted according to their passports.",
    zh: "注意：护照有效期须在6个月以上。儿童年龄以护照为准。",
  },
};
/** Ô tiếng Việt → bản ngôn ngữ lang (số / giá / hạng sao giữ nguyên); không có → null */
const fromVi = (c, lang) => {
  const s = squash(c);
  if (!/\p{L}/u.test(s) || /^[\d.,*+\s]+$/.test(s)) return s;
  const e = VI_SOURCE[s];
  return e ? (e[lang] ?? (lang === "vi" ? s : null)) : null;
};
const ZH_NUM = { 3: "三", 4: "四", 5: "五" };
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "01 April – 31 August" / "01/04 – 31/08" → vi "01/04 – 31/08", zh "4月1日 – 8月31日" */
function trDates(s, lang) {
  const out = s.split(/\s+–\s+/).map((p) => {
    let m = /^(\d{1,2})\s+([a-z]+)$/i.exec(p.trim());
    let d;
    let mo;
    if (m && MONTHS.includes(m[2].toLowerCase())) {
      d = Number(m[1]);
      mo = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    } else if ((m = /^(\d{1,2})\/(\d{1,2})$/.exec(p.trim()))) {
      d = Number(m[1]);
      mo = Number(m[2]);
    } else return null;
    return lang === "zh"
      ? `${mo}月${d}日`
      : `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}`;
  });
  return out.length && out.every(Boolean) ? out.join(" – ") : null;
}

/** Bộ nhớ dịch từ các bảng đã dịch trong DB: ô tiếng Anh → bản dịch dùng nhiều nhất */
function buildMemory(tours) {
  const mem = {};
  for (const t of tours) {
    const en = t.content?.en?.priceTables ?? [];
    for (const lang of ["vi", "zh"]) {
      const other = t.content?.[lang]?.priceTables ?? [];
      if (other.length !== en.length) continue;
      en.forEach((tb, i) =>
        tb.rows.forEach((r, j) =>
          r.forEach((c, k) => {
            const v = other[i].rows?.[j]?.[k];
            if (!c || v == null || !/\p{L}/u.test(c)) return;
            const slot = ((mem[squash(c)] ??= {})[lang] ??= {});
            slot[v] = (slot[v] ?? 0) + 1;
          }),
        ),
      );
    }
  }
  const best = {};
  for (const [k, langs] of Object.entries(mem))
    for (const [lang, counts] of Object.entries(langs))
      (best[k] ??= {})[lang] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  return best;
}

/** Dịch 1 cụm; không dịch được → null (tour đó không được ghi, báo cáo cụm còn thiếu) */
function makeTranslator(memory) {
  const memoryCi = {};
  for (const [k, v] of Object.entries(memory)) memoryCi[k.toLowerCase()] ??= v;
  const tr = (raw, lang) => {
    const s = squash(raw);
    if (!s || !/\p{L}/u.test(s)) return s;
    if (PHRASES[s]) return PHRASES[s][lang];
    if (/^\$?\s*[\d.,]+\s*(?:usd|\$)?$/i.test(s)) return s; // giá
    let m = /^([345])\s*[★*]\s*Hotels?(?:\s*\((.+)\))?$/i.exec(s); // "4★ Hotels (Full Ocean View)"
    if (m) {
      const extra = m[2] ? tr(m[2], lang) : "";
      if (extra == null) return null;
      return lang === "zh"
        ? `${ZH_NUM[m[1]]}星酒店${extra ? `（${extra}）` : ""}`
        : `Khách sạn ${m[1]}★${extra ? ` (${extra})` : ""}`;
    }
    if ((m = /^Travel period:\s*(.+)$/i.exec(s))) {
      const d = trDates(m[1], lang);
      if (!d) return null;
      return lang === "zh" ? `适用日期：${d}` : `Thời gian áp dụng: ${d}`;
    }
    if ((m = /^(\d{1,2}(?:\s*[–-]\s*\d{1,2})?)\s*pax$/i.exec(s)))
      return memory[s]?.[lang] ?? (lang === "zh" ? `${m[1]}人` : `${m[1]} khách`);
    return memory[s]?.[lang] ?? memoryCi[s.toLowerCase()]?.[lang] ?? null;
  };
  /** Danh sách khách sạn: giữ tên, chỉ dịch phần trong ngoặc "(Full Ocean View)" */
  const hotels = (s, lang) => {
    let ok = true;
    const out = s.replace(/\s*\(([^()]+)\)/g, (whole, inside) => {
      const t = PHRASES[squash(inside)]?.[lang];
      if (!t) {
        ok = false;
        return whole;
      }
      return lang === "zh" ? `（${t}）` : ` (${t})`;
    });
    return ok ? out : null;
  };
  const heading = (s, lang) => {
    const i = s.indexOf(" – ");
    if (i < 0) return tr(s, lang);
    const head = tr(s.slice(0, i), lang);
    const list = hotels(s.slice(i + 3), lang);
    return head == null || list == null ? null : `${head} – ${list}`;
  };
  const period = (s, lang) => {
    const parts = s.split(" · ").map((p) => tr(p, lang));
    return parts.some((p) => p == null) ? null : parts.join(" · ");
  };
  return { tr, heading, period };
}

/* ============================== so sánh & dựng bộ bảng ============================== */

/**
 * Tour + bảng trên trang cũ → { action: "update", en, vi, zh, changes } | { action: "same" } | { action: "skip", reason }
 * Mọi bảng đang có trong DB phải có trên trang cũ (cùng các dòng) — không thì không ghi.
 */
function plan(tour, old, T) {
  const dbEn = tour.content?.en?.priceTables ?? [];
  if (!old.length && !dbEn.length) return { action: "none" };
  if (!old.length)
    return {
      action: "skip",
      reason: "no price table on the old page (DB tables were built from text lines) — DB kept",
    };
  const oldText = old
    .flatMap((o) => [o.section, o.note, o.period, captionText(o.caption), ...o.rows.flat()])
    .join(" ");
  const viSource = isVietnamese(oldText);
  if (viSource && dbEn.length)
    return {
      action: "skip",
      reason:
        old.length > dbEn.length
          ? `Vietnamese source page with ${old.length - dbEn.length} more table(s) than DB — check manually`
          : "Vietnamese source page; DB English tables are translations of the same tables",
    };
  const used = new Set();
  const matchOf = dbEn.map((d) => {
    const i = old.findIndex((o, k) => !used.has(k) && rowsKey(o.rows) === rowsKey(d.rows));
    if (i >= 0) used.add(i);
    return i;
  });
  const missing = matchOf.filter((i) => i < 0).length;
  if (missing)
    return {
      action: "skip",
      reason: `${missing}/${dbEn.length} DB table(s) not found on the old page (edited after import?) — DB kept`,
    };

  const changes = [];
  const en = old.map((o, k) => {
    const di = matchOf.indexOf(k);
    const d = di >= 0 ? dbEn[di] : null;
    const heading = captionText(o.caption) ?? d?.heading ?? o.section ?? null;
    const period = periodText(o) ?? d?.period ?? null;
    if (!d) changes.push(`+ table "${heading ?? "(no caption)"}"${period ? ` [${period}]` : ""}`);
    else {
      const have = norm(`${d.heading ?? ""} ${d.period ?? ""}`);
      const gained = [
        captionText(o.caption),
        o.note,
        o.period?.replace(/^Travel period:\s*/, ""),
      ].filter((x) => x && !have.includes(norm(x)));
      if (gained.length)
        changes.push(`~ table ${di + 1}: + ${gained.map((g) => `"${g}"`).join(", ")}`);
    }
    return {
      heading: heading?.slice(0, 300) ?? null,
      period: period?.slice(0, 300) ?? null,
      rows: d ? d.rows : o.rows.map((r) => r.map(tidyPrice)),
      db: di,
    };
  });
  if (!changes.length) return { action: "same" };
  if (viSource) {
    // DB chưa có bảng nào (đã chặn ở trên nếu có): bản vi = nguyên văn trang cũ, en / zh dịch theo VI_SOURCE
    const unknownVi = new Set();
    const out = {};
    for (const lang of ["vi", "en", "zh"])
      out[lang] = old.map((o) => {
        const conv = (c) => {
          const v = fromVi(c, lang);
          if (v == null) unknownVi.add(`${lang}: ${c}`);
          return v ?? c;
        };
        return {
          heading: conv(captionText(o.caption) ?? o.section ?? "") || VI_SOURCE[""][lang],
          period: periodText(o) ? conv(periodText(o)) : null,
          rows: o.rows.map((r) => r.map(conv)),
        };
      });
    if (unknownVi.size)
      return {
        action: "skip",
        reason: `Vietnamese source page, table(s) missing in DB — untranslated: ${[...unknownVi].join(" | ")}`,
        changes,
      };
    return { action: "update", ...out, changes };
  }

  // vi / zh: bảng không đổi giữ nguyên bản dịch; chú thích / mùa / bảng mới → dịch
  const unknown = new Set();
  const out = { en: en.map(({ db: _db, ...t }) => t) };
  for (const lang of ["vi", "zh"]) {
    const prev = tour.content?.[lang]?.priceTables ?? [];
    const aligned = prev.length === dbEn.length;
    out[lang] = en.map((t) => {
      const p = aligned && t.db >= 0 ? prev[t.db] : null;
      const d = t.db >= 0 ? dbEn[t.db] : null;
      const pick = (field, fn) => {
        if (!t[field]) return null;
        // không đổi → giữ bản dịch cũ (trừ cụm có bản dịch chuẩn ở PHRASES, vd. "NETT RATE…" từng bị dịch sai)
        if (p?.[field] && d?.[field] === t[field] && !PHRASES[t[field]]) return p[field];
        const v = fn(t[field], lang);
        if (v == null) unknown.add(`${lang}: ${t[field]}`);
        return v ?? t[field];
      };
      const rows =
        p && p.rows?.length === t.rows.length
          ? p.rows
          : t.rows.map((r) =>
              r.map((c) => {
                const v = T.tr(c, lang);
                if (v == null) unknown.add(`${lang}: ${c}`);
                return v ?? c;
              }),
            );
      return { heading: pick("heading", T.heading), period: pick("period", T.period), rows };
    });
  }
  if (unknown.size)
    return { action: "skip", reason: `untranslated: ${[...unknown].join(" | ")}`, changes };
  return { action: "update", ...out, changes };
}

/* ============================== main ============================== */

const fmtTiers = (tiers) =>
  (tiers ?? [])
    .map(
      (t) =>
        `${t.maxPax >= 99 ? `${t.minPax}+` : t.minPax === t.maxPax ? t.minPax : `${t.minPax}–${t.maxPax}`}p:` +
        [t.price && `3★$${t.price}`, t.price4 && `4★$${t.price4}`, t.price5 && `5★$${t.price5}`]
          .filter(Boolean)
          .join("/"),
    )
    .join(" ");
const tierKey = (a) =>
  JSON.stringify(
    (a ?? []).map((t) => [t.minPax, t.maxPax, t.price ?? null, t.price4 ?? null, t.price5 ?? null]),
  );

/** Tour có groupTiers do tiers-from-price-tables.js điền (đọc bản sao lưu của script đó) */
function tiersScriptSlugs() {
  const set = new Set();
  if (!fs.existsSync(BACKUP_DIR)) return set;
  for (const f of fs.readdirSync(BACKUP_DIR))
    if (/^tiers-from-price-tables.*\.json$/.test(f))
      for (const x of JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), "utf8")))
        set.add(x.slug);
  return set;
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  await connectDatabase();
  const db = mongoose.connection.db;
  const col = db.collection("tours");
  const all = await col
    .find(
      {},
      {
        projection: {
          slug: 1,
          sourceUrl: 1,
          updatedAt: 1,
          price: 1,
          pricing: 1,
          isActive: 1,
          "content.en.priceTables": 1,
          "content.vi.priceTables": 1,
          "content.zh.priceTables": 1,
        },
      },
    )
    .toArray();
  const T = makeTranslator(buildMemory(all));
  const tours = all.filter((t) => OLD_HOST.test(t.sourceUrl ?? "") && (!ONLY || t.slug === ONLY));

  // nhân viên đã sửa / tạo trong CMS → không đụng
  const staff = new Map();
  const logs = await db
    .collection("auditlogs")
    .find(
      { action: { $in: ["tour.update", "tour.create"] } },
      { projection: { action: 1, target: 1, actorName: 1, createdAt: 1 } },
    )
    .toArray();
  for (const a of logs)
    staff.set(
      a.target?.id,
      `${a.action} by ${a.actorName || "?"} on ${a.createdAt.toISOString().slice(0, 10)}`,
    );
  const fromTiersScript = tiersScriptSlugs();

  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"} — ${tours.length} tours with an old-site source (HTML cache: ${CACHE_DIR})\n`,
  );
  const results = [];
  await Promise.all(
    tours.map(async (t) => {
      const page = await fetchPage(t.slug, t.sourceUrl);
      if (page.error) {
        results.push({ t, action: "skip", reason: `old page: ${page.error}` });
        return;
      }
      const old = parseOldPriceTables(page.html);
      const summary = {
        dbTables: (t.content?.en?.priceTables ?? []).length,
        oldTables: old.length,
        oldPeriods: new Set(old.map((o) => o.period).filter(Boolean)).size,
        oldCaptions: old.filter((o) => o.caption).length,
      };
      const r = plan(t, old, T);
      if (staff.has(String(t._id)) && r.action !== "none" && r.action !== "same") {
        const has = r.changes?.length ? `; old site has: ${r.changes.join("; ")}` : "";
        results.push({
          t,
          ...summary,
          action: "skip",
          reason: `edited in CMS (${staff.get(String(t._id))}) — not touched${has}`,
        });
        return;
      }
      if (r.action === "update") {
        const cur = t.pricing?.groupTiers ?? [];
        const allowed = !cur.length || fromTiersScript.has(t.slug);
        const p = proposeTiers({ slug: t.slug, content: { en: { priceTables: r.en } } });
        r.tiers = { current: cur, proposed: p.tiers ?? null, notes: p.notes ?? [], why: p.skip };
        r.tiers.write = Boolean(p.tiers && allowed && tierKey(cur) !== tierKey(p.tiers));
        if (p.tiers && !allowed && tierKey(cur) !== tierKey(p.tiers))
          r.tiers.why = "groupTiers entered by staff — kept";
      }
      results.push({ t, ...summary, ...r });
    }),
  );
  results.sort((a, b) => a.t.slug.localeCompare(b.t.slug));

  const by = (a) => results.filter((r) => r.action === a);
  for (const r of by("update")) {
    console.log(
      `✔ ${r.t.slug}${r.t.isActive === false ? " (hidden)" : ""}  tables DB ${r.dbTables} → old site ${r.oldTables}`,
    );
    r.changes.forEach((c) => console.log(`    ${c}`));
    if (r.tiers.write) {
      console.log(
        `    groupTiers: ${fmtTiers(r.tiers.current) || "(empty)"}\n             → ${fmtTiers(r.tiers.proposed)}`,
      );
      r.tiers.notes.forEach((n) => console.log(`      · ${n}`));
    } else console.log(`    groupTiers unchanged${r.tiers.why ? `: ${r.tiers.why}` : ""}`);
  }
  const skipped = by("skip");
  console.log(`\nSkipped (${skipped.length}):`);
  for (const r of skipped)
    console.log(
      `  ✘ ${r.t.slug} [DB ${r.dbTables ?? "?"} / old ${r.oldTables ?? "?"}] — ${r.reason}`,
    );
  console.log(
    `\nChecked ${results.length}: ${by("update").length} to update, ${by("same").length} already complete, ${by("none").length} without any price table, ${skipped.length} skipped`,
  );
  if (REPORT)
    fs.writeFileSync(
      REPORT,
      JSON.stringify(
        results.map(({ t, ...r }) => ({ slug: t.slug, ...r })),
        null,
        1,
      ),
    );

  if (!APPLY) {
    console.log("\n(dry run — nothing written; add --apply to write)");
    return;
  }
  const updates = by("update");
  if (!updates.length) return;

  // sao lưu TOÀN BỘ collection tours (EJSON, nén gzip) — khôi phục: EJSON.parse rồi replaceOne theo _id
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `tours-before-reimport-price-tables-${stamp}.json.gz`);
  const docs = await col.find({}).toArray();
  fs.writeFileSync(
    file,
    zlib.gzipSync(mongoose.mongo.BSON.EJSON.stringify(docs, { relaxed: false })),
  );
  console.log(`\nBackup (${docs.length} tours): ${file}`);

  let n = 0;
  for (const u of updates) {
    const set = { "content.en.priceTables": u.en, updatedAt: new Date() };
    if (u.t.content?.vi) set["content.vi.priceTables"] = u.vi;
    if (u.t.content?.zh) set["content.zh.priceTables"] = u.zh;
    if (u.tiers.write) set["pricing.groupTiers"] = u.tiers.proposed;
    // updatedAt như lúc đọc → không ghi đè nếu có người vừa sửa trong CMS
    const res = await col.updateOne({ _id: u.t._id, updatedAt: u.t.updatedAt }, { $set: set });
    n += res.modifiedCount;
    if (!res.modifiedCount) console.log(`  ! ${u.t.slug} not modified (changed meanwhile?)`);
  }
  console.log(`Updated ${n}/${updates.length} tours.`);
}

// Chỉ chạy khi gọi trực tiếp (cho phép import để thử hàm tách bảng)
if (path.resolve(process.argv[1] ?? "") === import.meta.filename)
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
