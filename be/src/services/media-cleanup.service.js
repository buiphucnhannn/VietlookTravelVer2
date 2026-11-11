import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Dọn ảnh / video không còn dùng trên Cloudinary.
 *
 * 1. Sau mỗi lần lưu (afterSave): ảnh bị thay / bỏ khỏi bản ghi → nếu không còn chỗ nào khác dùng thì xoá.
 *    Chạy nền sau khi đã trả kết quả cho người dùng, lỗi chỉ ghi log.
 * 2. Quét định kỳ (runSweep — `npm run media:cleanup`, hoặc job hằng ngày khi bật MEDIA_CLEANUP_DAILY):
 *    liệt kê file trong thư mục CMS, xoá file không còn được tham chiếu và cũ hơn 24 giờ
 *    (ảnh vừa tải lên nhưng chưa kịp lưu bản ghi không bị xoá nhầm).
 *
 * "Được tham chiếu" = public_id xuất hiện ở BẤT KỲ đâu trong dữ liệu (mọi collection trừ nhật ký / phiên đăng nhập),
 * kể cả trong HTML bài viết — quét chuỗi nên thà giữ nhầm còn hơn xoá nhầm.
 * Không bao giờ đụng: ảnh hệ thống của website (`<folder>/site/`) và file ngoài thư mục CMS.
 */

/** Collection KHÔNG tính là "đang dùng ảnh" (nhật ký ghi lại cả ảnh đã xoá, phiên đăng nhập) */
const IGNORED_COLLECTIONS = new Set(["auditlogs", "sessions"]);
export const MIN_AGE_MS = 24 * 60 * 60 * 1000;
export const MAX_DELETE_RATIO = 0.3;
const BATCH = 100; // Cloudinary nhận tối đa 100 public_id mỗi lần xoá

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** public_id có thuộc vùng được phép dọn không (trong thư mục CMS, không phải ảnh hệ thống) */
export function isManaged(publicId, folder = env.cloudinary.folder) {
  return (
    typeof publicId === "string" &&
    !!folder &&
    publicId.startsWith(`${folder}/`) &&
    !publicId.startsWith(`${folder}/site/`)
  );
}

/**
 * Mọi public_id (dạng `<folder>/…`) nhắc tới trong 1 giá trị bất kỳ (chuỗi, object, mảng, HTML…).
 * URL `https://res.cloudinary.com/x/image/upload/c_fill,w_400/v123/vietlook/tours/abc.webp` → `vietlook/tours/abc`.
 * @param {unknown} value
 * @param {string} [folder]
 * @returns {Set<string>}
 */
export function extractRefs(value, folder = env.cloudinary.folder) {
  const out = new Set();
  if (!folder || value == null) return out;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return out;
  // trước tên thư mục không được là chữ / số / gạch (tránh khớp "myvietlook/…"); sau là các đoạn tên file
  const rx = new RegExp(`(?<![\\w-])${escapeRx(folder)}/[\\w-]+(?:/[\\w-]+)*`, "g");
  for (const m of text.matchAll(rx)) out.add(m[0]);
  return out;
}

/** public_id có trong `prev` mà không còn trong `next` (chỉ trong vùng được dọn) */
export function removedRefs(prev, next, folder = env.cloudinary.folder) {
  const after = extractRefs(next, folder);
  return [...extractRefs(prev, folder)].filter((id) => !after.has(id) && isManaged(id, folder));
}

/**
 * Lên kế hoạch xoá (thuần — không gọi mạng, dễ kiểm thử).
 * @param {{ assets: { publicId: string, resourceType?: string, createdAt?: string|Date }[], refs: Set<string>,
 *   now?: number, minAgeMs?: number, maxRatio?: number, force?: boolean, folder?: string }} p
 * @returns {{ total: number, referenced: number, young: number, toDelete: object[], aborted: boolean, reason?: string }}
 */
export function planSweep({
  assets,
  refs,
  now = Date.now(),
  minAgeMs = MIN_AGE_MS,
  maxRatio = MAX_DELETE_RATIO,
  force = false,
  folder = env.cloudinary.folder,
}) {
  const managed = assets.filter((a) => isManaged(a.publicId, folder));
  let referenced = 0;
  let young = 0;
  const toDelete = [];
  for (const a of managed) {
    if (refs.has(a.publicId)) referenced++;
    else if (!a.createdAt || now - new Date(a.createdAt).getTime() < minAgeMs) young++;
    else toDelete.push(a);
  }
  const plan = { total: managed.length, referenced, young, toDelete, aborted: false };
  // Chống lỗi xoá hàng loạt (vd. quét dữ liệu thiếu, nhầm cơ sở dữ liệu): quá ngưỡng thì dừng
  if (!force && managed.length && toDelete.length / managed.length > maxRatio) {
    plan.aborted = true;
    plan.reason = `would delete ${toDelete.length}/${managed.length} (> ${Math.round(maxRatio * 100)}%)`;
  }
  // Không có tham chiếu nào mà vẫn có file → gần như chắc chắn quét sai cơ sở dữ liệu
  if (!force && !refs.size && toDelete.length) {
    plan.aborted = true;
    plan.reason = "no references found in database";
  }
  return plan;
}

/* ------------------------------------------------------------------------- */

/** Toàn bộ public_id đang được dữ liệu website dùng (quét mọi collection) */
export async function collectReferences(db = mongoose.connection.db) {
  if (!db) throw new Error("database not connected");
  const refs = new Set();
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  if (!collections.length) throw new Error("no collections");
  for (const { name } of collections) {
    if (IGNORED_COLLECTIONS.has(name) || name.startsWith("system.")) continue;
    for await (const doc of db.collection(name).find({}))
      for (const id of extractRefs(doc)) refs.add(id);
  }
  return refs;
}

/** File trên Cloudinary trong thư mục CMS: mọi ảnh + video nền đã chép về */
export async function listAssets(api = cloudinary.api) {
  const folder = env.cloudinary.folder;
  const out = [];
  const scan = async (resourceType, prefix) => {
    let cursor;
    do {
      const r = await api.resources({
        type: "upload",
        resource_type: resourceType,
        prefix,
        max_results: 500,
        ...(cursor && { next_cursor: cursor }),
      });
      for (const x of r.resources ?? [])
        out.push({
          publicId: x.public_id,
          resourceType,
          createdAt: x.created_at,
          bytes: x.bytes,
        });
      cursor = r.next_cursor;
    } while (cursor);
  };
  await scan("image", `${folder}/`);
  await scan("video", `${folder}/banner/`);
  return out;
}

/** Xoá theo lô (100 / lần), tách ảnh / video */
export async function deleteAssets(assets, api = cloudinary.api) {
  let deleted = 0;
  for (const type of ["image", "video"]) {
    const ids = assets.filter((a) => (a.resourceType ?? "image") === type).map((a) => a.publicId);
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH).filter((id) => isManaged(id));
      if (!chunk.length) continue;
      const r = await api.delete_resources(chunk, { resource_type: type, invalidate: true });
      deleted += Object.values(r?.deleted ?? {}).filter((v) => v === "deleted").length;
    }
  }
  return deleted;
}

/**
 * Quét dọn toàn bộ. Mặc định chỉ báo cáo (dry-run).
 * @param {{ apply?: boolean, force?: boolean, minAgeMs?: number }} opts
 */
export async function runSweep({ apply = false, force = false, minAgeMs = MIN_AGE_MS } = {}) {
  if (!env.cloudinary.enabled) throw new Error("Cloudinary not configured");
  const refs = await collectReferences();
  const assets = await listAssets();
  const plan = planSweep({ assets, refs, minAgeMs, force });
  const bytes = plan.toDelete.reduce((s, a) => s + (a.bytes ?? 0), 0);
  const summary = {
    event: "media.sweep",
    apply,
    total: plan.total,
    referenced: plan.referenced,
    young: plan.young,
    unused: plan.toDelete.length,
    unusedBytes: bytes,
    aborted: plan.aborted,
    reason: plan.reason,
  };
  if (apply && !plan.aborted && plan.toDelete.length)
    summary.deleted = await deleteAssets(plan.toDelete);
  logger.info(summary, "[media] quét ảnh không dùng");
  return { ...summary, toDelete: plan.toDelete };
}

/* ------------------------------------------------------------------------- */

let pending = new Set();
let timer = null;
const AFTER_SAVE_DELAY_MS = 5_000;

/** Xoá ngay những file trong `candidates` mà dữ liệu không còn dùng (đã quét lại toàn bộ trước khi xoá) */
export async function deleteIfUnused(candidates) {
  const ids = [...new Set(candidates)].filter((id) => isManaged(id));
  if (!ids.length || !env.cloudinary.enabled) return 0;
  const refs = await collectReferences();
  const unused = ids.filter((id) => !refs.has(id));
  if (!unused.length) return 0;
  const isVideo = (id) => id.startsWith(`${env.cloudinary.folder}/banner/`);
  const deleted = await deleteAssets(
    unused.map((publicId) => ({ publicId, resourceType: isVideo(publicId) ? "video" : "image" })),
  );
  logger.info(
    { event: "media.cleanup_after_save", candidates: ids.length, deleted },
    "[media] đã xoá ảnh không còn dùng",
  );
  return deleted;
}

/**
 * Gọi sau khi lưu / xoá thành công: ảnh của bản cũ không còn trong bản mới → xếp hàng kiểm tra & xoá (chạy nền,
 * gộp nhiều lần lưu liên tiếp thành 1 lần quét). Không bao giờ ném lỗi ra ngoài.
 * @param {unknown} prev bản ghi trước khi lưu
 * @param {unknown} [next] bản ghi sau khi lưu (không có = đã xoá bản ghi)
 */
export function afterSave(prev, next) {
  try {
    if (env.isTest || !env.cloudinary.enabled || !prev) return;
    const plain = (d) => (typeof d?.toJSON === "function" ? d.toJSON() : d);
    const gone = removedRefs(plain(prev), next ? plain(next) : null);
    if (!gone.length) return;
    gone.forEach((id) => pending.add(id));
    clearTimeout(timer);
    timer = setTimeout(() => {
      const batch = [...pending];
      pending = new Set();
      deleteIfUnused(batch).catch((err) =>
        logger.warn({ err, count: batch.length }, "[media] không dọn được ảnh cũ"),
      );
    }, AFTER_SAVE_DELAY_MS);
    timer.unref?.();
  } catch (err) {
    logger.warn({ err }, "[media] không dọn được ảnh cũ");
  }
}

/** Job hằng ngày (MEDIA_CLEANUP_DAILY=true): chạy lần đầu sau 10 phút, sau đó mỗi 24 giờ */
export function scheduleDailySweep() {
  const run = () =>
    runSweep({ apply: true }).catch((err) => logger.warn({ err }, "[media] quét định kỳ lỗi"));
  const first = setTimeout(run, 10 * 60 * 1000);
  const every = setInterval(run, 24 * 60 * 60 * 1000);
  first.unref();
  every.unref();
  return () => (clearTimeout(first), clearInterval(every));
}
