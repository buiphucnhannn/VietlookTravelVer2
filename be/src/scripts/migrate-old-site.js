/**
 * Chuyển nội dung website WordPress cũ (vietlooktravel.com) sang CMS mới: tour + bài viết.
 *
 *   node --env-file=.env src/scripts/migrate-old-site.js --src <thư mục sao lưu web cũ> \
 *     --tours-sheet <tab tour .tsv> --articles-sheet <tab bài viết .tsv> --report <thư mục báo cáo> [--dry]
 *
 * Thư mục sao lưu (tạo bằng bản tải WP REST): tours.json, posts.json (kèm _embed), html/tour|post/<slug>.html
 * (trang đã dựng — lấy lịch trình tour + meta Rank Math).
 *
 * Quy tắc (theo bảng "Thống kê tour web cũ" khách duyệt):
 * - Bỏ: dòng "Bỏ" trong bảng, bản trùng 100% / 99% (giữ 1 bản), bài spam, tour thực chất là DỊCH VỤ
 *   (thuê xe, fast track, khách sạn, visa) — các URL này chuyển hướng tới trang gần nhất (xem mapping.json).
 * - Còn lại (kể cả chưa chọn) → nhập. Tour không có lịch trình → nhập nhưng ẨN.
 * - Tour / bài tiếng Việt là bản dịch của tour / bài tiếng Anh (cùng mã tour, hoặc cột "Bản dịch") → gộp vào bản vi.
 *
 * Chạy lại an toàn: cập nhật đúng bản ghi theo slug, không tạo trùng. Bản ghi KHÔNG do script này tạo
 * (có sẵn trong CMS) chỉ được bổ sung SEO còn trống, slug cũ, link nguồn — không đụng nội dung.
 * Bản ghi do script tạo nhưng nhân viên đã sửa trong CMS (updatedAt khác lần nhập trước) → cũng chỉ bổ sung như trên.
 * Ảnh: chép về Cloudinary (thư mục CMS <folder>/tours | <folder>/articles), mã ảnh cố định theo link gốc → không nhân bản.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DomUtils, parseDocument } from "htmlparser2";
import { cloudinary, configureCloudinary } from "../config/cloudinary.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { Article } from "../models/article.model.js";
import { Author } from "../models/taxonomy.model.js";
import { Tour } from "../models/tour.model.js";
import { prepareArticle, prepareTour } from "../services/modules.service.js";
import { slugify } from "../utils/slugify.js";
import { articleSchema, tourSchema } from "../validators/content.validator.js";

/* ============================== tham số ============================== */

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const SRC = arg("--src");
const REPORT = path.resolve(arg("--report", "migrate-report"));
const DRY = flag("--dry");
const NO_IMAGES = flag("--no-images");
const ONLY = arg("--only")?.split(",") ?? ["tours", "articles"];
const LIMIT = Number(arg("--limit", 0)) || Infinity;
const PICK = arg("--slug"); // chạy thử 1 mục
const OLD_HOST = /^(?:https?:)?\/\/(?:www\.)?vietlooktravel\.com/i;
const FALLBACK_ORIGIN = "http://vietlooktravel.com"; // web cũ trả lời qua http
if (!SRC) {
  console.error("Thiếu --src <thư mục sao lưu web cũ>");
  process.exit(1);
}
fs.mkdirSync(REPORT, { recursive: true });
const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : d);
const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1));

/* ============================== tiện ích chữ / HTML ============================== */

const fold = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
const squash = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
const isVietnamese = (s) => /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(s ?? "");
const decode = (s) => squash(DomUtils.textContent(parseDocument(String(s ?? ""))));
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);

/** "HANOI - CATBA NATIONAL PARK" → "Hanoi - Catba National Park" (chỉ đổi khi cả câu viết HOA) */
const SMALL = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
  "with",
]);
function tidyCase(s) {
  // phần "(Lunch, Dinner)" ở cuối xét riêng (thường viết thường)
  const tail = s.match(/^(.*?)(\s*\([^()]*\)\s*\.?\s*)$/);
  if (tail && tail[1].trim()) return tidyCase(tail[1]) + tail[2];
  // phần lớn chữ cái viết HOA
  const letters = s.replace(/[^\p{L}]/gu, "");
  const upper = s.replace(/[^\p{Lu}]/gu, "");
  if (!letters || upper.length < letters.length * 0.7) return s;
  return s
    .toLocaleLowerCase("vi")
    .split(/(\s+)/)
    .map((w, i) =>
      i > 0 && SMALL.has(w)
        ? w
        : w.replace(/^(\P{L}*)(\p{L})/u, (_, p, c) => p + c.toLocaleUpperCase("vi")),
    )
    .join("");
}

const text = (node) => squash(DomUtils.textContent(node));
const outer = (node) => DomUtils.getOuterHTML(node, { encodeEntities: "utf8" });
const inner = (node) => DomUtils.getInnerHTML(node, { encodeEntities: "utf8" });
const isTag = (n) => n?.type === "tag";
const findAll = (nodes, test) => DomUtils.findAll((e) => test(e), [].concat(nodes));
const hasClass = (e, c) => (e.attribs?.class ?? "").split(/\s+/).includes(c);

/** Các khối cấp cao của 1 đoạn HTML (bỏ khoảng trắng; 1 thẻ div bọc ngoài → đi vào trong) */
function blocksOf(html) {
  let nodes = parseDocument(html, { decodeEntities: true }).children;
  for (;;) {
    const real = nodes.filter((n) => isTag(n) || (n.type === "text" && n.data.trim()));
    if (real.length === 1 && isTag(real[0]) && ["div", "section", "article"].includes(real[0].name))
      nodes = real[0].children;
    else return real;
  }
}

/** Ảnh thật của thẻ img (bản lazy-load để ảnh ở data-lazy-src / data-src) */
const imgSrc = (e) =>
  [e.attribs["data-lazy-src"], e.attribs["data-src"], e.attribs.src].find(
    (s) => s && !s.startsWith("data:"),
  ) ?? "";

/* ============================== ảnh → Cloudinary ============================== */

const CACHE_FILE = path.join(REPORT, "image-cache.json");
const imageCache = readJson(CACHE_FILE, {});
let cacheDirty = 0;
const saveCache = () => {
  if (cacheDirty) writeJson(CACHE_FILE, imageCache);
  cacheDirty = 0;
};
const brokenImages = [];

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
const uploadSlot = limiter(6);

/** Link ảnh gốc (tuyệt đối, http như web cũ) */
function sourceUrl(raw) {
  let u = String(raw ?? "").trim();
  if (!u || u.startsWith("data:")) return "";
  if (u.startsWith("/") && !u.startsWith("//")) u = FALLBACK_ORIGIN + u;
  if (u.startsWith("//")) u = `http:${u}`;
  u = u.replace(OLD_HOST, FALLBACK_ORIGIN);
  return /^https?:\/\//i.test(u) ? u : "";
}

/** Chép 1 ảnh về Cloudinary → link Cloudinary hoặc "" (ảnh hỏng → bỏ) */
async function rehost(raw, sub, context) {
  const src = sourceUrl(raw);
  if (!src) return "";
  if (/^https:\/\/res\.cloudinary\.com\//.test(src)) return src;
  const hit = imageCache[src];
  if (typeof hit === "string" && hit.startsWith("https://")) return hit;
  if (hit) {
    brokenImages.push({ src, context, reason: hit });
    return "";
  }
  if (NO_IMAGES || DRY) return "";
  const publicId = `old-${crypto.createHash("sha1").update(src).digest("hex").slice(0, 20)}`;
  return uploadSlot(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await cloudinary.uploader.upload(src, {
          folder: `${env.cloudinary.folder}/${sub}`,
          public_id: publicId,
          overwrite: false,
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp", "avif", "gif"],
          timeout: 120_000,
        });
        imageCache[src] = r.secure_url;
        if (++cacheDirty >= 20) saveCache();
        return r.secure_url;
      } catch (err) {
        const code = err?.http_code ?? err?.error?.http_code ?? 0;
        const msg = String(err?.message ?? err?.error?.message ?? err).slice(0, 160);
        // 4xx (ảnh không tồn tại / không phải ảnh) → hỏng hẳn; lỗi mạng → thử lại
        if ((code >= 400 && code < 500) || /not found|404|Invalid image|format/i.test(msg)) {
          imageCache[src] = `FAIL ${msg}`;
          cacheDirty++;
          brokenImages.push({ src, context, reason: msg });
          return "";
        }
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      }
    }
    brokenImages.push({ src, context, reason: "network" });
    return ""; // lỗi mạng: không ghi cache → lần chạy sau thử lại
  });
}

/**
 * HTML web cũ → HTML sạch cho CMS: ảnh chép về Cloudinary (ảnh hỏng bị bỏ), bỏ srcset / lazy-load,
 * bỏ màu chữ & thẻ span của theme cũ, link nội bộ → đường dẫn tương đối (đi qua chuyển hướng 301).
 * Sau đó service (prepareTour / prepareArticle) lọc lại bằng cleanHtml.
 */
async function cleanOldHtml(html, sub, context) {
  const doc = parseDocument(String(html ?? ""), { decodeEntities: true });
  for (const ns of findAll(doc.children, (e) => e.name === "noscript")) DomUtils.removeElement(ns);
  for (const e of findAll(doc.children, (e) =>
    ["script", "style", "form", "button", "input"].includes(e.name),
  ))
    DomUtils.removeElement(e);
  const imgs = findAll(doc.children, (e) => e.name === "img");
  await Promise.all(
    imgs.map(async (img) => {
      const url = await rehost(imgSrc(img), sub, context);
      if (!url) {
        // ảnh hỏng: bỏ luôn link / figure bọc ngoài nếu chỉ còn rỗng
        DomUtils.removeElement(img);
        return;
      }
      const { alt = "", width, height } = img.attribs;
      img.attribs = {
        src: url,
        alt: squash(alt),
        ...(width && { width }),
        ...(height && { height }),
      };
    }),
  );
  for (const e of findAll(doc.children, () => true)) {
    // link tới file ảnh của web cũ (bấm để phóng to) → bỏ link, giữ ảnh
    if (e.name === "a") {
      const href = e.attribs.href ?? "";
      if (/\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(href) && OLD_HOST.test(href)) {
        e.attribs = {};
        e.name = "span";
      } else if (OLD_HOST.test(href)) e.attribs.href = href.replace(OLD_HOST, "") || "/";
    }
    const style = e.attribs?.style;
    if (style !== undefined) {
      const align = style.match(/text-align:\s*(left|right|center|justify)/i);
      if (align && align[1] !== "left" && align[1] !== "justify")
        e.attribs.style = `text-align: ${align[1]}`;
      else delete e.attribs.style;
    }
    if (e.attribs)
      for (const k of ["class", "id", "srcset", "sizes", "decoding", "data-lazy-src"])
        delete e.attribs[k];
  }
  let out = DomUtils.getOuterHTML(doc.children, { encodeEntities: "utf8" });
  out = out
    .replace(/<\/?span>/g, "")
    .replace(/<\/?font[^>]*>/g, "")
    .replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/g, "")
    .replace(/<a>(.*?)<\/a>/g, "$1")
    .trim();
  return out;
}

/* ============================== meta Rank Math (từ HTML đã dựng) ============================== */

function headMeta(html) {
  const head = html.slice(0, html.indexOf("</head>") + 7 || 200_000);
  const doc = parseDocument(head, { decodeEntities: true });
  const title = findAll(doc.children, (e) => e.name === "title")[0];
  const meta = (attr, val) =>
    findAll(doc.children, (e) => e.name === "meta" && e.attribs[attr] === val)[0]?.attribs
      .content ?? "";
  return {
    title: title ? text(title) : "",
    description: squash(meta("name", "description")),
    ogImage: meta("property", "og:image"),
  };
}

/* ============================== bảng khách duyệt ============================== */

function readSheet(file, { urlCol, choiceCol, noteCol, langCol }) {
  if (!file) return new Map();
  const rows = fs.readFileSync(file, "utf8").split(/\r?\n/).slice(1).filter(Boolean);
  const out = new Map();
  for (const line of rows) {
    const c = line.split("\t");
    const url = c[urlCol]?.trim();
    if (!url) continue;
    const slug = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() ?? "");
    out.set(slug, {
      stt: Math.round(Number(c[0])),
      title: c[1],
      choice: (c[choiceCol] ?? "").trim(), // Giữ / Bỏ / ""
      note: (c[noteCol] ?? "").trim(),
      lang: /Việt/i.test(c[langCol] ?? "") ? "vi" : "en",
      url,
    });
  }
  return out;
}
const tourSheet = readSheet(arg("--tours-sheet"), {
  urlCol: 3,
  choiceCol: 2,
  noteCol: 5,
  langCol: 8,
});
const articleSheet = readSheet(arg("--articles-sheet"), {
  urlCol: 3,
  choiceCol: 2,
  noteCol: 5,
  langCol: 7,
});
const bySttOf = (sheet) => new Map([...sheet].map(([slug, r]) => [r.stt, slug]));

/* ============================== phân loại điểm đến / chủ đề ============================== */

// Danh mục tour web cũ → điểm đến mới (danh sách điểm đến khách đã duyệt trong CMS)
const CAT_DEST = {
  "ha-noi-tour": ["hanoi"],
  "ha-long-tour": ["halong-bay"],
  "cruise-tour": ["halong-bay"],
  "tour-du-lich-ha-long": ["halong-bay"],
  "sapa-tour": ["sapa"],
  "ha-giang-tour": ["ha-giang"],
  "ninh-binh-tour": ["ninh-binh"],
  "tour-du-lich-ninh-binh": ["ninh-binh"],
  "cao-bang-tour": ["cao-bang"],
  "nha-trang-tour": ["nha-trang"],
  "da-nang-tour": ["da-nang"],
  "tour-du-lich-da-nang": ["da-nang"],
  "hoi-an": ["hoi-an"],
  "hue-tour": ["hue"],
  "quang-binh-tour": ["quang-binh"],
  "ho-chi-minh-tour": ["ho-chi-minh-city"],
  "phu-quoc-tour": ["phu-quoc"],
  "mui-ne-tour": ["mui-ne"],
  "tour-du-lich-moc-chau": ["moc-chau"],
  "tour-du-lich-mien-tay": ["mekong-delta"],
};
// Nhận ra điểm đến trong tên (không dấu)
const DEST_WORDS = [
  // điểm đi trong ngày quanh Hà Nội (Chùa Hương, Đường Lâm, Tam Đảo…) xếp vào Hà Nội
  [
    "hanoi",
    /\b(ha ?noi|chua huong|perfume pagoda|duong lam|son tay|ba vi|tan da|tam dao|tay thien)\b/,
  ],
  [
    "halong-bay",
    /\b(ha ?long|lan ha|cat ba|bai tu long|co to|quan lan|van don|quang ninh|yen tu|tra co|mong cai)\b/,
  ],
  ["ninh-binh", /\b(ninh binh|trang an|tam coc|bai dinh|hoa lu|hang mua|van long|tam chuc)\b/],
  ["sapa", /\b(sa ?pa|fansipan|cat cat|lao chai|ta van|y ty|bac ha)\b/],
  ["ha-giang", /\b(ha giang|dong van|lung cu|ma pi leng|meo vac)\b/],
  ["cao-bang", /\b(cao bang|ban gioc|ba be)\b/],
  ["moc-chau", /\b(moc chau|mai chau|pu luong)\b/],
  ["hue", /\b(hue|dmz)\b/],
  ["da-nang", /\b(da ?nang|ba na|son tra|my son)\b/],
  ["hoi-an", /\b(hoi an|cu lao cham|cam thanh|tra que)\b/],
  ["nha-trang", /\b(nha trang|binh ba|binh hung|ninh van)\b/],
  ["dalat", /\b(da ?lat)\b/],
  ["quang-binh", /\b(quang binh|phong nha|son doong|tu lan|thien duong|dong hoi)\b/],
  ["ho-chi-minh-city", /\b(ho chi minh|sai ?gon|cu chi|hcm|tay ninh|nui ba den)\b/],
  ["mekong-delta", /\b(mekong|mien tay|can tho|my tho|ben tre|chau doc|cai be|cai rang)\b/],
  ["phu-quoc", /\b(phu quoc|an thoi)\b/],
  ["mui-ne", /\b(mui ne|phan thiet)\b/],
  ["vung-tau", /\b(vung tau)\b/],
];
const OUTBOUND =
  /\b(bali|indonesia|campuchia|cambodia|siem reap|dubai|han quoc|korea|seoul|jeju|lao|laos|luang prabang|vientiane|myanmar|nhat ban|japan|tokyo|singapore|malaysia|thai lan|thailand|bangkok|pattaya|phuket|trung quoc|china|bac kinh|thuong hai|phuong hoang|truong gia gioi|le giang|con minh|dai ly|hong kong|dai loan|taiwan|chau au|uc|europe)\b/;

function destinationsFromText(s) {
  // "… từ Hà Nội" / "from Hanoi" là điểm khởi hành, không phải điểm đến
  const f = ` ${fold(s)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(tu|from|departing from|khoi hanh tu) (ha ?noi|ho chi minh|hai phong|sai ?gon)\b/g,
      " ",
    )} `;
  return DEST_WORDS.filter(([, rx]) => rx.test(f)).map(([slug]) => slug);
}

/* ============================== dịch vụ (không phải tour) ============================== */

const SERVICE_TARGET = (terms, slug, title) => {
  if (
    terms.some((t) => /private-cars?$|^private-car-rental$/.test(t)) ||
    slug === "private-car-rental"
  )
    return { kind: "car", to: "/car-rental" };
  if (terms.includes("fast-track") || /^fast-track/.test(slug))
    return { kind: "fast-track", to: "/visa-fast-track" };
  if (slug === "visa") return { kind: "visa", to: "/visa-fast-track" };
  if (terms.some((t) => t.startsWith("khach-san"))) {
    const d = destinationsFromText(title)[0];
    return { kind: "hotel", to: d ? `/destinations/${d}` : "/tours" };
  }
  return null;
};

/* ============================== tách nội dung tour ============================== */

const MEAL_WORDS = [
  ["B", /\b(breakfast|sang|b)\b/],
  ["L", /\b(lunch|trua|l)\b/],
  ["D", /\b(dinner|toi|d)\b/],
];
function splitMeals(title) {
  const m = title.match(/\(([^()]*)\)\s*\.?\s*$/);
  if (!m) return { title, meals: [] };
  const f = ` ${fold(m[1]).replace(/[^a-z]+/g, " ")} `;
  if (
    !/(breakfast|lunch|dinner|an |sang|trua|toi|\bb\b|\bl\b|\bd\b)/.test(f) ||
    /no meal|khong an|tu tuc/.test(f)
  )
    return { title, meals: [] };
  const meals = MEAL_WORDS.filter(([, rx]) => rx.test(f)).map(([k]) => k);
  return { title, meals };
}
const dayHeading = (s) => {
  const m = fold(s).match(/^\s*(?:day|ngay)\s*0?(\d{1,2})\b/);
  return m ? Number(m[1]) : null;
};
/** Bỏ "DAY 1:" / "NGÀY 01" ở đầu tên ngày, viết lại chữ HOA */
const cleanDayTitle = (s) =>
  tidyCase(
    squash(s)
      .replace(/^\s*(?:day|ngày|ngay)\s*0?\d{1,2}\s*(?:[:.\-–—|]\s*)?/i, "")
      .replace(/^[:.\-–—|\s]+/, ""),
  ).replace(/\s*\(/, " (");
const routeOf = (title) =>
  squash(title.replace(/\([^)]*\)\s*\.?\s*$/, "").replace(/[.:]+$/, "")).slice(0, 240);

/** Loại mục theo tiêu đề (không dấu) */
function sectionKind(h) {
  const f = fold(h);
  if (dayHeading(h) != null) return "day";
  if (/exclu|not includ|khong bao gom|chua bao gom|excludes/.test(f)) return "excluded";
  if (/inclu|bao gom|benefits/.test(f)) return "included";
  if (
    /chinh sach tre em|quy dinh tre em|^tre em|children policy|child policy|children'?s? polic/.test(
      f,
    )
  )
    return "child";
  if (/itinerar|lich trinh|chuong trinh|schedule|program|hanh trinh/.test(f)) return "itinerary";
  if (/price|gia tour|bang gia|gia ve|gia tron goi|^gia\b|rates?\b|cost|chi phi/.test(f))
    return "price";
  if (/highlight|diem nhan|noi bat|why choose|experience highlights/.test(f)) return "highlights";
  if (
    /note|luu y|what to bring|important|cancel|huy tour|dieu kien|terms|chuan bi|mang theo|policy|quy dinh/.test(
      f,
    )
  )
    return "notes";
  return "other";
}

/** Khối là tiêu đề? (h1–h6, hoặc đoạn ngắn in đậm toàn bộ) */
function headingText(node) {
  if (!isTag(node)) return null;
  if (/^h[12]$/.test(node.name)) return text(node) ? { text: text(node), major: true } : null;
  if (/^h[3-6]$/.test(node.name)) return text(node) ? { text: text(node), major: false } : null;
  if (!["p", "div"].includes(node.name)) return null;
  if (findAll(node, (e) => ["img", "table", "ul", "ol"].includes(e.name)).length) return null;
  // chỉ xét dòng đầu (tiêu đề in đậm + <br> + nội dung trong cùng 1 đoạn)
  const first = parseDocument(inner(node).split(/<br\s*\/?>/i)[0]);
  const t = text(first);
  if (!t || t.length > 160) return null;
  const bold = squash(
    findAll(first.children, (e) => ["strong", "b"].includes(e.name))
      .map(text)
      .join(" "),
  );
  const allBold = bold && bold.replace(/\s/g, "").length >= t.replace(/\s/g, "").length * 0.9;
  const caps = t.replace(/[^\p{L}]/gu, "").length > 3 && t === t.toLocaleUpperCase("vi");
  if (allBold) return { text: t, major: caps };
  // "DAY 1: …" không in đậm vẫn là tiêu đề ngày
  if (dayHeading(t) != null && t.length < 140) return { text: t, major: true };
  return null;
}

/** Danh sách dòng chữ trong 1 nhóm khối (li, hoặc đoạn tách theo <br>) */
function linesOf(nodes) {
  const lines = [];
  for (const n of nodes) {
    if (!isTag(n)) {
      if (n.data?.trim()) lines.push(squash(n.data));
      continue;
    }
    const lis = findAll(n, (e) => e.name === "li");
    if (lis.length) {
      lines.push(...lis.map(text));
      continue;
    }
    if (n.name === "table") continue;
    const html = inner(n).split(/<br\s*\/?>/i);
    for (const part of html) lines.push(decode(part));
  }
  return lines
    .map((l) => squash(l.replace(/^[•\-–—*✔✓☑►▪·+]+\s*/, "")))
    .filter((l) => l && l.length > 1);
}

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

/** Giá USD / người lớn đầu tiên trong phần giá (bỏ phụ thu, giá trẻ em…) */
function findUsdPrice(s) {
  const t = squash(s);
  const start = t.search(/price|giá/i);
  if (start < 0) return null;
  const rx =
    /(?:US\$|USD|\$)\s?(\d{1,3}(?:[.,]\d{3})*|\d{1,5})(?![\d])|(\d{1,3}(?:[.,]\d{3})*|\d{1,5})\s?(?:US\$|USD|\$)/gi;
  rx.lastIndex = start;
  for (let m; (m = rx.exec(t));) {
    const before = t.slice(Math.max(0, m.index - 70), m.index);
    if (
      /child|children|kid|infant|surcharge|supplement|single|cabin|cable car|ticket|extra|additional/i.test(
        before,
      )
    )
      continue;
    const n = Number(String(m[1] ?? m[2]).replace(/[.,]/g, ""));
    if (n >= 5 && n <= 20000) return n;
  }
  return null;
}

/**
 * Tách tour từ trang đã dựng (lịch trình theo ngày của theme cũ) + nội dung bài (content.rendered:
 * ảnh, bao gồm / không bao gồm, chính sách trẻ em, bảng giá…). Tour mới hơn viết cả lịch trình trong nội dung.
 */
async function parseTour(wp, pageHtml, lang) {
  const ctx = `tour ${wp.slug}`;
  const doc = parseDocument(pageHtml, { decodeEntities: true });
  const h1 = findAll(doc.children, (e) => e.name === "h1" && hasClass(e, "page-title"))[0];
  const title = squash(
    h1 ? text(findAll(h1, (e) => e.name === "span")[0] ?? h1) : decode(wp.title.rendered),
  );
  const small = h1 && findAll(h1, (e) => e.name === "small")[0];
  const code = small ? squash(text(small).replace(/[()]/g, "")).slice(0, 30) : "";
  const dateBox = findAll(doc.children, (e) => hasClass(e, "page-header-tour-date"))[0];
  const dn = dateBox ? text(dateBox).match(/(\d+)\s*days?\s*\/\s*(\d*)\s*nights?/i) : null;
  let days = dn ? Number(dn[1]) || 1 : 1;
  let nights = dn ? Number(dn[2]) || 0 : 0;

  // 1. lịch trình của theme (khối .full-itinerary)
  const itinerary = [];
  for (const block of findAll(doc.children, (e) => hasClass(e, "full-itinerary"))) {
    const h4 = findAll(block, (e) => e.name === "h4")[0];
    const body = findAll(block, (e) => hasClass(e, "entry-content"))[0];
    const raw = h4 ? text(h4) : "";
    const n = dayHeading(raw) ?? itinerary.length + 1;
    const t = cleanDayTitle(raw);
    const html = body ? await cleanOldHtml(inner(body), "tours", ctx) : "";
    itinerary.push({ day: n, title: t.slice(0, 300), html, ...splitMeals(t), overnight: "" });
  }

  // 2. nội dung bài → các mục
  const sections = [];
  let cur = { kind: "intro", heading: "", nodes: [] };
  for (const node of blocksOf(wp.content.rendered)) {
    const hd = headingText(node);
    const kind = hd && sectionKind(hd.text);
    // tiêu đề phụ (in đậm / h3: "Pearl Farm", "08:45") nằm trong mục hiện tại; chỉ tiêu đề lớn / loại đã biết mới tách mục
    if (hd && (hd.major || kind !== "other")) {
      const h = hd.text;
      sections.push(cur);
      cur = { kind, heading: h, nodes: [] };
      // "<p><strong>INCLUSION</strong><br>- a<br>- b</p>": tiêu đề kèm nội dung
      const rest = inner(node)
        .split(/<br\s*\/?>/i)
        .slice(1)
        .map(decode)
        .filter(Boolean);
      if (rest.length) cur.nodes.push(...parseDocument(`<p>${rest.join("<br>")}</p>`).children);
      continue;
    }
    cur.nodes.push(node);
  }
  sections.push(cur);

  const included = [];
  const excluded = [];
  const highlights = [];
  const child = [];
  const notes = [];
  const priceTables = [];
  const gallery = [];
  const otherHtml = [];
  let introText = "";
  let priceText = "";
  const contentDays = [];

  for (const s of sections) {
    const imgs = findAll(s.nodes, (e) => e.name === "img")
      .map(imgSrc)
      .filter(Boolean);
    if (s.kind === "day" || s.kind === "itinerary" || s.kind === "other" || s.kind === "intro")
      gallery.push(...imgs.slice(0, 6));
    else gallery.push(...imgs);
    const tables = findAll(s.nodes, (e) => e.name === "table");
    const nodesNoImg = () => s.nodes;
    switch (s.kind) {
      case "day": {
        const t = cleanDayTitle(s.heading);
        contentDays.push({
          day: dayHeading(s.heading),
          title: t.slice(0, 300),
          html: await cleanOldHtml(s.nodes.map(outer).join(""), "tours", ctx),
          ...splitMeals(t),
          overnight: "",
        });
        break;
      }
      case "included":
        // web cũ hay đặt nhầm 2 lần "INCLUSION" (lần 2 là không bao gồm)
        (included.length && !excluded.length && /inclusion/i.test(s.heading)
          ? excluded
          : included
        ).push(...linesOf(nodesNoImg()));
        break;
      case "excluded":
        excluded.push(...linesOf(nodesNoImg()));
        break;
      case "child":
        child.push(...linesOf(nodesNoImg()));
        break;
      case "highlights":
        highlights.push(...linesOf(nodesNoImg()));
        break;
      case "notes":
        notes.push(
          ...(s.heading ? [`${tidyCase(s.heading).replace(/:$/, "")}:`] : []),
          ...linesOf(nodesNoImg()),
        );
        break;
      case "price": {
        priceText += ` ${s.heading} ${s.nodes.map(text).join(" ")}`;
        for (const tb of tables) {
          const rows = tableRows(tb);
          if (rows.length)
            priceTables.push({ heading: tidyCase(s.heading).slice(0, 300), period: null, rows });
        }
        if (!tables.length) {
          const rows = linesOf(s.nodes).map((l) => {
            const i = l.indexOf(":");
            return i > 0 && i < l.length - 1 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l];
          });
          if (rows.length)
            priceTables.push({
              heading: tidyCase(s.heading).slice(0, 300),
              period: null,
              rows: rows.slice(0, 60),
            });
        }
        break;
      }
      default: {
        // intro / itinerary / other: bảng giá VNĐ nằm ngay trên đầu (tour tiếng Việt) → bảng giá
        for (const tb of tables) {
          const rows = tableRows(tb);
          if (
            rows.length &&
            rows.flat().some((c) => /\d{1,3}(\.\d{3}){1,}|usd|\$|vn[dđ]/i.test(c))
          ) {
            priceTables.push({
              heading: tidyCase(s.heading || (lang === "vi" ? "Bảng giá" : "Price")).slice(0, 300),
              period: null,
              rows,
            });
            DomUtils.removeElement(tb);
          }
        }
        const t = s.nodes.map(text).join(" ");
        if (s.kind === "intro" && !introText) introText = squash(t);
        if (/gi[aá] tour|price/i.test(s.heading + t.slice(0, 200))) priceText += ` ${t}`;
        const html = s.nodes.map(outer).join("");
        if (squash(t).length > 20 || /<img/.test(html))
          otherHtml.push({ kind: s.kind, heading: s.heading, html });
      }
    }
  }

  // 3. lịch trình: theme → theo ngày trong nội dung → 1 khối "chương trình"
  let finalItinerary = itinerary.filter((d) => d.title || d.html);
  const lenOf = (list) => squash(list.map((d) => decode(d.html)).join(" ")).length;
  // lịch trình của theme chỉ là 1 dòng tóm tắt, lịch trình thật viết trong nội dung → dùng nội dung
  if (lenOf(finalItinerary) < 250) finalItinerary = [];
  if (!finalItinerary.length && contentDays.length) finalItinerary = contentDays;
  if (!finalItinerary.length) {
    const prog = otherHtml.filter((o) => o.kind !== "intro" || otherHtml.length === 1);
    const textLen = squash(prog.map((o) => decode(o.html)).join(" ")).length;
    if (textLen >= 300) {
      const html = prog
        .map(
          (o) =>
            (o.heading && o.kind !== "intro" ? `<h3>${escapeHtml(tidyCase(o.heading))}</h3>` : "") +
            o.html,
        )
        .join("");
      finalItinerary = [
        {
          day: 1,
          title: lang === "vi" ? "Chương trình tour" : "Tour program",
          html: await cleanOldHtml(html, "tours", ctx),
          meals: [],
          overnight: "",
        },
      ];
    }
  }
  finalItinerary = finalItinerary.slice(0, 120).map((d, i) => ({ ...d, day: d.day ?? i + 1 }));
  if (finalItinerary.length > days && finalItinerary.every((d) => d.day))
    days = Math.max(days, ...finalItinerary.map((d) => d.day));
  if (nights > days) nights = Math.max(0, days - 1);

  const halfDay = /half[- ]day|nửa ngày|nua ngay|\b4 hours\b/i.test(title);
  // tour tiếng Việt báo giá VNĐ (bảng giá giữ nguyên) → không đoán giá USD
  const price =
    lang === "en" ? (findUsdPrice(priceText) ?? findUsdPrice(decode(wp.content.rendered))) : null;

  return {
    title,
    code,
    days,
    nights,
    halfDay,
    itinerary: finalItinerary,
    included: included.slice(0, 80).map((l) => l.slice(0, 500)),
    excluded: excluded.slice(0, 80).map((l) => l.slice(0, 500)),
    highlights: highlights.slice(0, 40).map((l) => l.slice(0, 300)),
    childPolicy: child.length ? clip(child.map((l) => `• ${l}`).join(" "), 5000) : null,
    notes: notes.length ? clip(notes.join(" ").replace(/: •/g, ":"), 10_000) : null,
    priceTables: priceTables.slice(0, 20),
    introText,
    gallery,
    price,
  };
}
const escapeHtml = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ============================== trạng thái các lần chạy ============================== */

const STATE_FILE = path.join(REPORT, "state.json");
const state = readJson(STATE_FILE, { tours: {}, articles: {} }); // slug → { updatedAt } bản do script tạo / ghi
const report = {
  startedAt: new Date().toISOString(),
  dry: DRY,
  tours: [],
  articles: [],
  mapping: [], // { old: "/tour/x/", to: "/tours/x", status, reason }
};

/** Bản ghi do script tạo và chưa ai sửa → được ghi đè toàn bộ; ngược lại chỉ bổ sung */
function ownedByScript(kind, doc) {
  const s = state[kind][doc.slug];
  return !!s && doc.updatedAt && new Date(doc.updatedAt).toISOString() === s.updatedAt;
}

/** Bổ sung cho bản ghi có sẵn: SEO còn trống, slug cũ, link nguồn — không đụng nội dung */
async function enrichExisting(Model, doc, { seo, oldSlugs = [], sourceUrl }) {
  const $set = {};
  for (const l of ["en", "zh", "vi"]) {
    const s = seo?.[l];
    if (!s) continue;
    if (s.title && !doc.seo?.[l]?.title) $set[`seo.${l}.title`] = s.title.slice(0, 200);
    if (s.description && !doc.seo?.[l]?.description)
      $set[`seo.${l}.description`] = s.description.slice(0, 500);
  }
  if (sourceUrl && !doc.sourceUrl) $set.sourceUrl = sourceUrl;
  const add = oldSlugs.filter((s) => s && s !== doc.slug && !(doc.oldSlugs ?? []).includes(s));
  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (add.length) update.$addToSet = { oldSlugs: { $each: add } };
  if (!Object.keys(update).length || DRY)
    return Object.keys(update).length ? "would-enrich" : "unchanged";
  await Model.collection.updateOne({ _id: doc._id }, update); // giữ updatedAt (không coi là nhân viên sửa)
  return "enriched";
}

/** Ghi bản ghi do script quản lý (tạo mới / cập nhật bản script tạo trước đó) */
async function writeOwned(Model, kind, slug, doc) {
  if (DRY) return "would-write";
  const r = await Model.findOneAndUpdate(
    { slug },
    { $set: doc },
    { upsert: true, returnDocument: "after", runValidators: true, lean: true },
  );
  state[kind][slug] = { updatedAt: new Date(r.updatedAt).toISOString() };
  writeJson(STATE_FILE, state);
  return r.createdAt && Math.abs(new Date(r.createdAt) - new Date(r.updatedAt)) < 5
    ? "created"
    : "updated";
}

/* ============================== TOUR ============================== */

const termsOf = (wp) =>
  (wp._embedded?.["wp:term"] ?? [])
    .flat()
    .filter((t) => t.taxonomy === "tour_types")
    .map((t) => t.slug);
const featuredOf = (wp) => wp._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? "";
const pagePath = (link) => new URL(link).pathname;

async function migrateTours() {
  const wpTours = readJson(path.join(SRC, "tours.json"), []);
  const sttSlug = bySttOf(tourSheet);
  const existing = new Map((await Tour.find({}).lean()).map((t) => [t.slug, t]));
  const plans = [];

  // ---- bước 1: quyết định từng tour
  for (const wp of wpTours) {
    const slug = wp.slug;
    const title = decode(wp.title.rendered);
    const terms = termsOf(wp);
    const sheet = tourSheet.get(slug) ?? {};
    const lang = sheet.lang ?? (isVietnamese(title) ? "vi" : "en");
    const plan = { wp, slug, title, terms, sheet, lang, old: pagePath(wp.link) };
    Object.defineProperty(plan, "html", {
      get: () => fs.readFileSync(path.join(SRC, "html", "tour", `${slug}.html`), "utf8"),
    });
    const service = SERVICE_TARGET(terms, slug, title);
    const dup = sheet.note?.match(/Giống\s*(\d+)%\s*với STT\s*(\d+)/i);
    if (sheet.choice === "Bỏ") plan.action = "drop";
    else if (service) plan.action = "service";
    else plan.action = "import";
    plan.service = service;
    plan.dup = dup
      ? { pct: Number(dup[1]), stt: Number(dup[2]), slug: sttSlug.get(Number(dup[2])) }
      : null;
    plans.push(plan);
  }
  // trùng 100%: giữ 1 bản (bản kia "Bỏ" thì giữ bản này; không thì giữ bản sửa gần nhất)
  for (const p of plans) {
    if (p.action !== "import" || !p.dup || p.dup.pct < 95) continue;
    const other = plans.find((x) => x.slug === p.dup.slug);
    if (!other || other.action !== "import") continue;
    const keepOther = existing.has(other.slug) || other.wp.modified > p.wp.modified;
    if (keepOther) Object.assign(p, { action: "duplicate", dupOf: other.slug });
  }

  // ---- bước 2: tách nội dung tour được nhập
  const byPick = PICK ? plans.filter((p) => p.slug === PICK) : plans;
  let n = 0;
  for (const p of byPick) {
    if (p.action !== "import") continue;
    if (n++ >= LIMIT) break;
    p.meta = headMeta(p.html);
    const prev = existing.get(p.slug);
    if (prev && !ownedByScript("tours", prev)) {
      // tour có sẵn trong CMS: chỉ cần SEO / slug cũ — không tách nội dung, không chép ảnh
      p.existingOnly = true;
      continue;
    }
    p.parsed = await parseTour(p.wp, p.html, p.lang);
  }

  // ---- bước 3: tour tiếng Việt là bản dịch của tour tiếng Anh (cùng mã tour) → gộp
  const enByCode = new Map();
  for (const p of plans)
    if (p.parsed && p.lang === "en" && p.parsed.code) enByCode.set(p.parsed.code.toUpperCase(), p);
  // tour tiếng Anh có sẵn trong CMS (không tính tour tiếng Việt do chính script này nhập lần trước)
  for (const [slug, t] of existing)
    if (t.code && t.content?.en?.title && !state.tours[slug] && !enByCode.has(t.code.toUpperCase()))
      enByCode.set(t.code.toUpperCase(), { slug, existingOnly: true });
  for (const p of plans) {
    if (!p.parsed || p.lang !== "vi" || !p.parsed.code) continue;
    const en = enByCode.get(p.parsed.code.toUpperCase());
    if (!en || en.slug === p.slug) continue;
    // cùng mã nhưng khác số ngày → không phải bản dịch
    const enDays = en.parsed?.days ?? existing.get(en.slug)?.days;
    if (enDays && enDays !== p.parsed.days) continue;
    Object.assign(p, { action: "merge-vi", mergeInto: en.slug });
    (en.viFrom ??= []).push(p);
  }

  // ---- bước 4: ghi
  const results = [];
  for (const p of byPick) {
    if (p.action !== "import") continue;
    let r;
    if (p.existingOnly) {
      const prev = existing.get(p.slug);
      const st = await enrichExisting(Tour, prev, {
        seo: { [p.lang]: { title: p.meta.title, description: p.meta.description } },
        oldSlugs: (p.viFrom ?? []).map((v) => v.slug),
        sourceUrl: p.wp.link,
      });
      r = {
        slug: p.slug,
        lang: p.lang,
        title: p.title,
        status: `existing:${st}`,
        hidden: !prev.isActive,
        destinations: prev.destinations,
      };
    } else if (p.parsed) r = await writeTour(p, existing.get(p.slug), plans);
    else continue;
    results.push(r);
    report.tours.push(r);
    console.log(
      `  tour ${r.status.padEnd(12)} ${p.slug}${r.hidden ? " (ẩn)" : ""}${r.error ? ` — ${r.error}` : ""}`,
    );
  }
  // gộp bản vi vào tour tiếng Anh có sẵn trong CMS (không ghi đè): chỉ thêm slug cũ
  for (const p of byPick.filter((x) => x.action === "merge-vi")) {
    const target = existing.get(p.mergeInto);
    if (target && !ownedByScript("tours", target)) {
      const meta = headMeta(p.html);
      const st = await enrichExisting(Tour, target, { oldSlugs: [p.slug], seo: { vi: meta } });
      report.tours.push({ slug: p.slug, status: `merge-vi→${p.mergeInto} (${st})`, lang: "vi" });
    }
  }
  // các tour không nhập
  for (const p of plans.filter((x) => x.action !== "import")) {
    if (p.action === "merge-vi") {
      if (!report.tours.some((r) => r.slug === p.slug))
        report.tours.push({ slug: p.slug, status: `merge-vi→${p.mergeInto}`, lang: "vi" });
      continue;
    }
    report.tours.push({
      slug: p.slug,
      status: p.action,
      reason: p.service?.kind ?? p.sheet.note ?? "",
      title: p.title,
    });
  }
  report.tourPlans = plans.map((p) => ({
    slug: p.slug,
    old: p.old,
    action: p.action,
    lang: p.lang,
    title: p.title,
    service: p.service,
    dup: p.dup,
    dupOf: p.dupOf,
    mergeInto: p.mergeInto,
    terms: p.terms,
    hidden: report.tours.find((r) => r.slug === p.slug)?.hidden ?? false,
    destinations: report.tours.find((r) => r.slug === p.slug)?.destinations ?? null,
  }));
  return results;
}

async function writeTour(p, prev, plans) {
  const { parsed, meta, lang, wp } = p;
  const ctx = `tour ${p.slug}`;
  const L = lang;
  // điểm đến: danh mục cũ → điểm đến; không có thì đoán theo tên
  const fromCats = [...new Set(p.terms.flatMap((t) => CAT_DEST[t] ?? []))];
  const fromTitle = destinationsFromText(parsed.title);
  let destinations = fromCats.length
    ? [...new Set([...fromCats, ...fromTitle.filter((d) => d !== "hanoi")])]
    : fromTitle;
  if (OUTBOUND.test(` ${fold(parsed.title).replace(/[^a-z0-9]+/g, " ")} `) && !fromCats.length)
    destinations = [];
  destinations = destinations.slice(0, 30);
  const themes = [];
  if (p.terms.includes("travel-experience")) themes.push("culture");
  const ft = fold(parsed.title);
  if (/honeymoon|trang mat/.test(ft)) themes.push("honeymoon");
  if (/family|gia dinh/.test(ft)) themes.push("family");
  if (/luxury|cao cap|5 sao|5\*/.test(ft)) themes.push("luxury");
  if (/photo|chup anh/.test(ft)) themes.push("photography");

  const image = await rehost(featuredOf(wp) || meta.ogImage, "tours", ctx);
  const gallerySrc = [
    ...new Set([featuredOf(wp) || meta.ogImage, ...parsed.gallery].filter(Boolean)),
  ].slice(0, 12);
  const gallery = (await Promise.all(gallerySrc.map((u) => rehost(u, "tours", ctx)))).filter(
    Boolean,
  );
  const summarySrc =
    meta.description && !/^vietlook travel/i.test(meta.description)
      ? meta.description
      : parsed.introText;
  const langContent = {
    title: parsed.title.slice(0, 250),
    summary: clip(squash(summarySrc ?? ""), 3000),
    route:
      parsed.itinerary.length > 1
        ? parsed.itinerary
            .map((d) => routeOf(d.title))
            .filter(Boolean)
            .slice(0, 60)
        : [],
    highlights: parsed.highlights,
    itinerary: parsed.itinerary.map((d) => ({ ...d, html: d.html.slice(0, 60_000) })),
    included: parsed.included,
    excluded: parsed.excluded,
    childPolicy: parsed.childPolicy,
    notes: parsed.notes,
    priceTables: parsed.priceTables,
    faqs: [],
  };
  const content = { en: {}, zh: {}, vi: {} };
  content[L] = langContent;
  // bản tiếng Việt của tour này (gộp theo mã tour)
  const viPlans = (plans.find((x) => x.slug === p.slug)?.viFrom ?? []).filter((v) => v.parsed);
  const oldSlugs = [];
  const seo = { [L]: { title: meta.title, description: meta.description } };
  if (L === "en" && viPlans.length) {
    const v = viPlans[0];
    const vm = headMeta(v.html);
    content.vi = {
      title: v.parsed.title.slice(0, 250),
      summary: clip(squash((vm.description || v.parsed.introText) ?? ""), 3000),
      route:
        v.parsed.itinerary.length > 1
          ? v.parsed.itinerary.map((d) => routeOf(d.title)).slice(0, 60)
          : [],
      highlights: v.parsed.highlights,
      itinerary: v.parsed.itinerary,
      included: v.parsed.included,
      excluded: v.parsed.excluded,
      childPolicy: v.parsed.childPolicy,
      notes: v.parsed.notes,
      priceTables: v.parsed.priceTables,
      faqs: [],
    };
    seo.vi = { title: vm.title, description: vm.description };
    oldSlugs.push(...viPlans.map((x) => x.slug));
  }
  // chạy lại: giữ các ngôn ngữ web cũ không có (bản dịch tự động zh / vi… đã điền sau lần nhập trước)
  for (const l of ["en", "zh", "vi"]) {
    if (!content[l].title && prev?.content?.[l]?.title) content[l] = prev.content[l];
    if (!seo[l]?.title && prev?.seo?.[l]?.title) seo[l] = prev.seo[l];
  }
  const hasItinerary = langContent.itinerary.length > 0;
  const price = parsed.price ?? null;
  const hidden = !hasItinerary && price == null;

  const raw = {
    slug: p.slug,
    code: parsed.code,
    days: Math.min(parsed.days, 120),
    nights: Math.min(parsed.nights, 120),
    halfDay: parsed.halfDay,
    destinations,
    themes: [...new Set(themes)].slice(0, 8),
    cruise: p.terms.includes("cruise-tour") || /\bcruise\b|du thuyen/.test(ft),
    tourType: "private",
    price,
    originalPrice: null,
    image,
    gallery,
    videos: [],
    departure: "daily",
    content,
    seo,
    rank: 1000,
    isActive: !hidden,
  };
  const out = {
    slug: p.slug,
    lang: L,
    title: parsed.title,
    code: parsed.code,
    days: raw.days,
    destinations,
    themes: raw.themes,
    price,
    itineraryDays: langContent.itinerary.length,
    gallery: gallery.length,
    hidden,
    viMerged: viPlans.map((x) => x.slug),
  };
  if (PICK) writeJson(path.join(REPORT, `pick-${p.slug}.json`), raw);

  // có sẵn trong CMS và không phải do script tạo (hoặc nhân viên đã sửa) → chỉ bổ sung
  if (prev && !ownedByScript("tours", prev)) {
    out.status = await enrichExisting(Tour, prev, { seo, oldSlugs, sourceUrl: wp.link });
    out.status = `existing:${out.status}`;
    out.hidden = !prev.isActive;
    out.destinations = prev.destinations;
    return out;
  }
  const parsedDoc = tourSchema.safeParse(raw);
  if (!parsedDoc.success) {
    const issue = parsedDoc.error.issues[0];
    return { ...out, status: "invalid", error: `${issue.path.join(".")}: ${issue.message}` };
  }
  try {
    const doc = await prepareTour(parsedDoc.data, prev ?? null);
    doc.oldSlugs = [...new Set([...(prev?.oldSlugs ?? []), ...oldSlugs])].filter(
      (s) => s !== p.slug,
    );
    doc.sourceUrl = wp.link;
    doc.createdAt = prev?.createdAt ?? new Date(wp.date_gmt ? `${wp.date_gmt}Z` : Date.now());
    out.status = await writeOwned(Tour, "tours", p.slug, doc);
  } catch (err) {
    out.status = "error";
    out.error = err.message;
  }
  return out;
}

/* ============================== BÀI VIẾT ============================== */

const GUIDE_DEST = {
  "da-nang-travel-guide": "da-nang",
  "ha-long-travel-guide": "halong-bay",
  "ninh-binh-travel-guide": "ninh-binh",
  "cam-nang-du-lich-da-nang": "da-nang",
  "cam-nang-du-lich-ha-long": "halong-bay",
  "cam-nang-du-lich-ninh-binh": "ninh-binh",
};
const SPAM = /casino|gambling|betting|pokies|slot machine|online slots|sportsbook/i;

function articleCategory(title, wpCats) {
  const f = ` ${fold(title).replace(/[^a-z0-9]+/g, " ")} `;
  const guideDest = wpCats.map((c) => GUIDE_DEST[c]).find(Boolean);
  const dests = destinationsFromText(title);
  const destination = guideDest ?? dests.find((d) => d !== "hanoi") ?? dests[0] ?? "";
  let category;
  if (
    /\b(food|foods|dish|dishes|cuisine|eat|eats|drink|coffee|street food|restaurant|mon an|am thuc|dac san|quan an|an gi|specialties|banh mi|bun cha)\b/.test(
      f,
    )
  )
    category = "food-culture";
  else if (
    /\b(how to get|getting|transport|bus|train|flight|flights|motorbike|taxi|grab|transfer|airport|xe khach|tau hoa|may bay|di chuyen|cach di|duong di|tu ha noi di|limousine)\b/.test(
      f,
    )
  )
    category = "getting-around";
  else if (
    /\b(festival|le hoi|event|su kien|phao hoa|fireworks|news|tin tuc|khai truong|ra mat|opening)\b/.test(
      f,
    )
  )
    category = "travel-news";
  else if (
    /\b(culture|tradition|traditions|ethnic|village|lang nghe|van hoa|phong tuc|history|lich su|temple|pagoda|chua|den)\b/.test(
      f,
    ) &&
    !destination
  )
    category = "food-culture";
  else if (destination) category = "destinations";
  else category = "need-to-know";
  return { category, destination };
}

async function ensureAuthor(wpAuthor) {
  const name = squash(wpAuthor?.name ?? "");
  // tài khoản quản trị / tên chung → tác giả mặc định của website
  if (!name || /admin|vietlook|editor|seo|^user|^\w+\d+$/i.test(name) || !/\s/.test(name))
    return "vietlook-team";
  const slug = slugify(name, 60);
  if (DRY) return slug;
  await Author.updateOne(
    { slug },
    { $setOnInsert: { slug, name: { en: name, zh: name, vi: name }, isActive: true, order: 10 } },
    { upsert: true },
  );
  return slug;
}

async function migrateArticles() {
  const posts = readJson(path.join(SRC, "posts.json"), []);
  const sttSlug = bySttOf(articleSheet);
  const existing = new Map((await Article.find({}).lean()).map((a) => [a.slug, a]));
  const plans = [];
  for (const wp of posts) {
    const slug = decodeURIComponent(wp.slug);
    const title = decode(wp.title.rendered);
    const sheet = articleSheet.get(slug) ?? {};
    const cats = (wp._embedded?.["wp:term"] ?? [])
      .flat()
      .filter((t) => t.taxonomy === "category")
      .map((t) => t.slug);
    const lang =
      sheet.lang ??
      (cats.some((c) => /tin-tuc|cam-nang/.test(c)) || isVietnamese(title) ? "vi" : "en");
    const plan = { wp, slug, title, sheet, cats, lang, old: pagePath(wp.link) };
    const dup = sheet.note?.match(/Giống\s*(\d+)%\s*với STT\s*(\d+)/i);
    const tr = sheet.note?.match(/Bản dịch của STT\s*(\d+)/i);
    if (SPAM.test(title)) plan.action = "spam";
    else if (sheet.choice === "Bỏ") plan.action = "drop";
    else plan.action = "import";
    plan.dup = dup ? { pct: Number(dup[1]), slug: sttSlug.get(Number(dup[2])) } : null;
    plan.translationOf = tr ? sttSlug.get(Number(tr[1])) : null;
    plans.push(plan);
  }
  for (const p of plans) {
    if (p.action !== "import") continue;
    if (p.dup && p.dup.pct >= 95) {
      const other = plans.find((x) => x.slug === p.dup.slug);
      if (other?.action === "import") {
        const keepOther =
          existing.has(other.slug) ||
          (!existing.has(p.slug) &&
            (other.cats.length > p.cats.length ||
              (other.cats.length === p.cats.length && other.wp.modified > p.wp.modified)));
        if (keepOther) Object.assign(p, { action: "duplicate", dupOf: other.slug });
      }
    }
    if (p.translationOf && plans.find((x) => x.slug === p.translationOf)?.action === "import")
      Object.assign(p, { action: "merge", mergeInto: p.translationOf });
  }

  const byPick = PICK ? plans.filter((p) => p.slug === PICK || p.mergeInto === PICK) : plans;
  let n = 0;
  for (const p of byPick) {
    if (p.action !== "import") continue;
    if (n++ >= LIMIT) break;
    const r = await writeArticle(p, existing.get(p.slug), plans);
    report.articles.push(r);
    console.log(`  bài  ${r.status.padEnd(12)} ${p.slug}${r.error ? ` — ${r.error}` : ""}`);
  }
  for (const p of plans.filter((x) => x.action !== "import"))
    report.articles.push({
      slug: p.slug,
      status: p.action,
      into: p.dupOf ?? p.mergeInto ?? "",
      title: p.title,
    });
  report.articlePlans = plans.map((p) => ({
    slug: p.slug,
    old: p.old,
    action: p.action,
    lang: p.lang,
    title: p.title,
    dupOf: p.dupOf,
    mergeInto: p.mergeInto,
  }));
}

async function articleLang(wp, html, ctx) {
  const meta = headMeta(html);
  const excerpt = decode(wp.excerpt?.rendered ?? "").replace(
    /\s*(\[…\]|\[\.\.\.\]|…|Read more.*|Xem thêm.*)$/i,
    "",
  );
  return {
    title: decode(wp.title.rendered).slice(0, 250),
    excerpt: clip(meta.description || excerpt, 1000),
    body: await cleanOldHtml(wp.content.rendered, "articles", ctx),
    seo: { title: meta.title, description: meta.description },
    ogImage: meta.ogImage,
  };
}

async function writeArticle(p, prev, plans) {
  const { wp, lang: L } = p;
  const ctx = `post ${p.slug}`;
  const html = fs.readFileSync(path.join(SRC, "html", "post", `${p.slug}.html`), "utf8");
  const main = await articleLang(wp, html, ctx);
  const { category, destination } = articleCategory(main.title, p.cats);
  const title = { en: "", zh: "", vi: "" };
  const excerpt = { en: "", zh: "", vi: "" };
  const body = { en: "", zh: "", vi: "" };
  const seo = {};
  title[L] = main.title;
  excerpt[L] = main.excerpt;
  body[L] = main.body;
  seo[L] = main.seo;
  const merged = plans.filter((x) => x.action === "merge" && x.mergeInto === p.slug);
  const oldSlugs = [];
  for (const m of merged) {
    if (m.lang === L) continue;
    const mh = fs.readFileSync(path.join(SRC, "html", "post", `${m.slug}.html`), "utf8");
    const t = await articleLang(m.wp, mh, `post ${m.slug}`);
    title[m.lang] = t.title;
    excerpt[m.lang] = t.excerpt;
    body[m.lang] = t.body;
    seo[m.lang] = t.seo;
    oldSlugs.push(m.slug);
  }
  // chạy lại: giữ các ngôn ngữ web cũ không có (bản dịch tự động đã điền sau lần nhập trước)
  for (const l of ["en", "zh", "vi"]) {
    if (title[l] || !prev?.title?.[l]) continue;
    title[l] = prev.title[l];
    excerpt[l] = prev.excerpt?.[l] ?? "";
    body[l] = prev.body?.[l] ?? "";
    if (prev.seo?.[l]?.title) seo[l] = prev.seo[l];
  }
  const author = await ensureAuthor(wp._embedded?.author?.[0]);
  const image = await rehost(
    wp._embedded?.["wp:featuredmedia"]?.[0]?.source_url || main.ogImage,
    "articles",
    ctx,
  );
  const out = {
    slug: p.slug,
    lang: L,
    title: main.title,
    category,
    destination,
    author,
    merged: merged.map((m) => m.slug),
  };

  if (prev && !ownedByScript("articles", prev)) {
    out.status = `existing:${await enrichExisting(Article, prev, { seo, oldSlugs, sourceUrl: wp.link })}`;
    return out;
  }
  const raw = {
    slug: p.slug,
    title,
    excerpt,
    body,
    image,
    category,
    author,
    destination,
    month: null,
    publishedAt: new Date(`${wp.date_gmt}Z`),
    seo: Object.fromEntries(
      Object.entries(seo).map(([l, s]) => [
        l,
        { title: s.title.slice(0, 200), description: s.description.slice(0, 500) },
      ]),
    ),
    isActive: true,
  };
  if (PICK) writeJson(path.join(REPORT, `pick-${p.slug}.json`), raw);
  const parsed = articleSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ...out, status: "invalid", error: `${issue.path.join(".")}: ${issue.message}` };
  }
  try {
    const doc = prepareArticle(parsed.data, prev ?? null);
    doc.oldSlugs = [...new Set([...(prev?.oldSlugs ?? []), ...oldSlugs])].filter(
      (s) => s !== p.slug,
    );
    doc.sourceUrl = wp.link;
    doc.createdAt = prev?.createdAt ?? new Date(`${wp.date_gmt}Z`);
    out.status = await writeOwned(Article, "articles", p.slug, doc);
  } catch (err) {
    out.status = "error";
    out.error = err.message;
  }
  return out;
}

/* ============================== chạy ============================== */

async function main() {
  if (!DRY && !NO_IMAGES) {
    configureCloudinary();
    if (!env.cloudinary.enabled) throw new Error("Chưa cấu hình Cloudinary (CLOUDINARY_*)");
  }
  await connectDatabase();
  console.log(DRY ? "CHẠY THỬ (không ghi)" : "ĐANG NHẬP");
  if (ONLY.includes("tours")) await migrateTours();
  if (ONLY.includes("articles")) await migrateArticles();
  saveCache();
  report.brokenImages = brokenImages;
  report.finishedAt = new Date().toISOString();
  const name = `report-${ONLY.join("-")}${DRY ? "-dry" : ""}${PICK ? `-${PICK}` : ""}.json`;
  writeJson(path.join(REPORT, name), report);
  const count = (list) =>
    list.reduce(
      (o, r) => ((o[r.status.split(/[:→ ]/)[0]] = (o[r.status.split(/[:→ ]/)[0]] ?? 0) + 1), o),
      {},
    );
  console.log("tour:", count(report.tours), "· ẩn:", report.tours.filter((r) => r.hidden).length);
  console.log("bài viết:", count(report.articles));
  console.log("ảnh hỏng:", brokenImages.length, "· báo cáo:", path.join(REPORT, name));
}

main()
  .catch((err) => {
    console.error("[migrate-old-site] thất bại:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    saveCache();
    await disconnectDatabase();
  });
