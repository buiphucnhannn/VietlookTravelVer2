/**
 * Điền bản dịch còn trống (TIẾNG VIỆT hoặc TIẾNG TRUNG) cho nội dung trong database bằng dịch tự động
 * (từ bản tiếng Anh).
 *   npm run i18n:fill -- --to zh --dry              chỉ đếm, không ghi
 *   npm run i18n:fill -- --to zh --backup <thư mục> sao lưu JSON trước rồi ghi
 *   npm run i18n:fill -- --to vi --only tours,articles   chỉ chạy vài nhóm
 *   npm run i18n:fill -- --from vi --to zh          mục chỉ có bản tiếng Việt (nhập từ web cũ) → tiếng Trung
 *
 * - CHỈ điền ô ngôn ngữ đích đang TRỐNG; ô đã có chữ (kể cả do nhân viên tự soạn) giữ nguyên.
 * - Không dịch: đường dẫn, link, ảnh, video, mã, giá, ngày, bữa ăn (B/L/D)…
 * - HTML (nội dung bài viết, chính sách): chỉ dịch phần chữ, giữ nguyên thẻ (xem translate.service.js).
 * - Danh sách (lịch trình, bao gồm…) tiếng Việt đã có nhưng khác số dòng với bản tiếng Anh → giữ nguyên.
 * - Chạy lại nhiều lần an toàn: lần sau chỉ còn những ô vẫn trống.
 */
import fs from "node:fs";
import path from "node:path";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Article } from "../models/article.model.js";
import { Destination } from "../models/destination.model.js";
import { Page } from "../models/page.model.js";
import { Car, CarArea, FastTrackPackage, VisaType } from "../models/service.model.js";
import { Setting } from "../models/setting.model.js";
import { Author, Category } from "../models/taxonomy.model.js";
import { Theme } from "../models/theme.model.js";
import { Tour } from "../models/tour.model.js";
import { translateService } from "../services/translate.service.js";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const BACKUP = argValue("--backup");
const ONLY = argValue("--only")?.split(",");

// Nguồn mặc định: tiếng Anh. `--from vi` dùng cho nội dung chỉ có bản tiếng Việt (tour / bài nhập từ web cũ):
// chỉ điền ô đích còn trống ở những mục CÓ bản tiếng Việt mà chưa có bản đích.
const FROM = argValue("--from") ?? "en";
const TO = argValue("--to") ?? "vi";
const LANGS = ["en", "zh", "vi"];
const LANG_NAME = { vi: "TIẾNG VIỆT", zh: "TIẾNG TRUNG", en: "TIẾNG ANH" };
if (!LANG_NAME[TO] || !LANGS.includes(FROM) || FROM === TO) {
  console.error(
    `[i18n:fill] --to vi | zh | en, --from en | vi | zh và khác nhau (nhận: ${FROM} → ${TO})`,
  );
  process.exit(1);
}

const GROUPS = {
  tours: { model: Tour },
  articles: { model: Article },
  destinations: { model: Destination },
  themes: { model: Theme },
  categories: { model: Category },
  authors: { model: Author, skipKeys: ["name"] }, // tên người: không dịch
  cars: { model: Car },
  carAreas: { model: CarArea },
  visaTypes: { model: VisaType },
  fastTrack: { model: FastTrackPackage },
  pages: { model: Page },
  home: { model: Setting, filter: { key: "home" } },
};

// Khoá không bao giờ dịch (định danh, đường dẫn, media, mã, số liệu)
const SKIP = new Set([
  "_id",
  "id",
  "__v",
  "slug",
  "oldSlugs",
  "sourceUrl",
  "code",
  "key",
  "priceKey",
  "accent",
  "url",
  "href",
  "link",
  "image",
  "images",
  "hero",
  "cover",
  "gallery",
  "photo",
  "photos",
  "avatar",
  "icon",
  "video",
  "videos",
  "videoMobile",
  "videoLink",
  "poster",
  "posterMobile",
  "collage",
  "meals",
  "email",
  "phone",
  "publicId",
  "canonical",
  "ogImage",
  "createdAt",
  "updatedAt",
  "updatedBy",
]);

const isPlain = (v) =>
  v != null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
const isLocalized = (v) => {
  if (!isPlain(v)) return false;
  const keys = Object.keys(v);
  return keys.length > 0 && keys.every((k) => LANGS.includes(k));
};
const translatable = (s) =>
  typeof s === "string" &&
  /\p{L}/u.test(s) &&
  !/^(https?:\/\/|\/|mailto:|tel:|#)\S*$/i.test(s.trim()) &&
  !/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(s.trim());
const isEmpty = (v) =>
  v == null ||
  v === "" ||
  (typeof v === "string" && !v.replace(/<[^>]*>/g, "").trim()) ||
  (Array.isArray(v) && v.length === 0) ||
  (isPlain(v) && Object.values(v).every(isEmpty));

/** Bản đích từ bản nguồn: chuỗi cần dịch → đặt chỗ { __job: i } */
function plan(src, dst, key, ctx) {
  if (key && ctx.skip.has(key)) return dst === undefined ? src : dst;
  if (typeof src === "string") {
    if (!isEmpty(dst)) return dst;
    if (!translatable(src)) return isEmpty(dst) ? src : dst;
    const slot = { __job: ctx.jobs.length };
    ctx.jobs.push(src);
    return slot;
  }
  if (Array.isArray(src)) {
    const d = Array.isArray(dst) ? dst : [];
    if (d.length && d.length !== src.length) return dst;
    return src.map((item, i) => plan(item, d[i], key, ctx));
  }
  if (isPlain(src)) {
    const base = isPlain(dst) ? dst : {};
    const out = { ...base };
    for (const k of Object.keys(src)) out[k] = plan(src[k], base[k], k, ctx);
    return out;
  }
  return dst === undefined || dst === null ? src : dst;
}
function fill(node, done) {
  if (isPlain(node) && "__job" in node) return done[node.__job];
  if (Array.isArray(node)) return node.map((x) => fill(x, done));
  if (isPlain(node))
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, fill(v, done)]));
  return node;
}
function walk(node, key, ctx) {
  if (key && ctx.skip.has(key)) return node;
  if (isLocalized(node)) {
    if (isEmpty(node[FROM]) || !isEmpty(node[TO])) {
      // vẫn đi sâu vào cây nội dung (content.vi có thể thiếu vài mục)
      if (isPlain(node[FROM]) && isPlain(node[TO]))
        return { ...node, [TO]: plan(node[FROM], node[TO], null, ctx) };
      return node;
    }
    return { ...node, [TO]: plan(node[FROM], node[TO], null, ctx) };
  }
  if (Array.isArray(node)) return node.map((x) => walk(x, null, ctx));
  if (isPlain(node))
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v, k, ctx)]));
  return node;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAUSE = 1500; // nghỉ giữa 2 mục — nhẹ nhàng với dịch vụ dịch miễn phí
const RETRY_WAITS = [60_000, 180_000, 300_000];
const stats = { docs: 0, changed: 0, texts: 0, chars: 0, failed: 0 };

async function runGroup(name, { model, filter = {}, skipKeys = [] }) {
  const docs = await model.find(filter).lean();
  if (BACKUP) {
    fs.mkdirSync(BACKUP, { recursive: true });
    fs.writeFileSync(path.join(BACKUP, `${name}.json`), JSON.stringify(docs, null, 1));
  }
  const skip = new Set([...SKIP, ...skipKeys]);
  let groupTexts = 0;
  let groupChanged = 0;
  for (const doc of docs) {
    stats.docs++;
    const ctx = { jobs: [], skip };
    const planned = walk(doc, null, ctx);
    if (!ctx.jobs.length) continue;
    groupTexts += ctx.jobs.length;
    stats.texts += ctx.jobs.length;
    stats.chars += ctx.jobs.reduce((n, t) => n + t.length, 0);
    if (DRY) continue;
    // Dịch vụ miễn phí bị chặn tạm (quá nhiều lượt) → chờ lâu dần rồi thử lại cùng mục đó
    let ok = false;
    for (let attempt = 0; attempt < RETRY_WAITS.length + 1 && !ok; attempt++) {
      if (attempt) {
        const wait = RETRY_WAITS[attempt - 1];
        console.warn(`  … dịch vụ dịch đang bận, chờ ${wait / 1000}s rồi thử lại`);
        await sleep(wait);
      }
      ok = await translateDoc();
    }
    if (ok) console.log(`  ✓ ${name} ${doc.slug ?? doc.key ?? doc._id} (${ctx.jobs.length} đoạn)`);
    if (!ok) {
      stats.failed++;
      console.warn(
        `  ! ${name} ${doc.slug ?? doc.key ?? doc._id}: bỏ qua, chạy lại lệnh sau để điền nốt`,
      );
    }
    await sleep(PAUSE);
    continue;

    async function translateDoc() {
      try {
        // dịch theo từng lô ≤ 300 đoạn / 120.000 ký tự
        const done = [];
        for (let i = 0; i < ctx.jobs.length;) {
          let j = i;
          let size = 0;
          while (j < ctx.jobs.length && j - i < 300 && size + ctx.jobs[j].length <= 120_000)
            size += ctx.jobs[j++].length;
          if (j === i) j = i + 1;
          const r = await translateService.translate({
            from: FROM,
            to: [TO],
            texts: ctx.jobs.slice(i, j),
          });
          done.push(...r[TO]);
          i = j;
        }
        const next = fill(planned, done);
        const $set = {};
        for (const k of Object.keys(next))
          if (!["_id", "__v"].includes(k) && JSON.stringify(next[k]) !== JSON.stringify(doc[k]))
            $set[k] = next[k];
        if (Object.keys($set).length) {
          await model.collection.updateOne({ _id: doc._id }, { $set });
          groupChanged++;
          stats.changed++;
        }
        return true;
      } catch {
        return false;
      }
    }
  }
  console.log(
    `${name.padEnd(13)} ${String(docs.length).padStart(4)} mục · ${String(groupTexts).padStart(5)} đoạn cần dịch${
      DRY ? "" : ` · đã điền ${groupChanged} mục`
    }`,
  );
}

try {
  await connectDatabase();
  console.log(DRY ? `CHẠY THỬ ${LANG_NAME[TO]} (không ghi)\n` : `ĐANG ĐIỀN ${LANG_NAME[TO]}\n`);
  for (const [name, g] of Object.entries(GROUPS)) {
    if (ONLY && !ONLY.includes(name)) continue;
    await runGroup(name, g);
  }
  console.log(
    `\nTổng: ${stats.texts} đoạn (${stats.chars.toLocaleString("vi-VN")} ký tự)` +
      (DRY ? "" : ` · cập nhật ${stats.changed} mục · lỗi ${stats.failed}`),
  );
} catch (err) {
  console.error("[i18n:fill] thất bại:", err.message);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
