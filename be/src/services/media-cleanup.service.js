import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AuditLog } from "../models/audit-log.model.js";

/**
 * Dọn ảnh / video không còn dùng trên Cloudinary — xoá CHẬM và có thời gian chờ để không bao giờ xoá nhầm.
 *
 * Mỗi file không còn dùng trước hết chỉ được ĐÁNH DẤU (collection `mediaorphans`). Chỉ xoá thật khi:
 *   - đã bị đánh dấu ≥ MEDIA_ORPHAN_GRACE_DAYS ngày (mặc định 21) và suốt thời gian đó vẫn không được dùng lại,
 *   - bản thân file đã tải lên hơn 24 giờ,
 *   - và lần kiểm tra lại ngay trước khi xoá vẫn không thấy chỗ nào dùng.
 * File được dùng lại (khôi phục bản sao lưu, hoàn tác, chèn lại vào bài…) → tự bỏ đánh dấu.
 *
 * Nguồn đánh dấu:
 * 1. afterSave: ảnh bị thay / bỏ khỏi bản ghi khi lưu (chạy nền, không xoá gì).
 * 2. runSweep (job hằng ngày ~03:00 giờ VN, bật mặc định ở production; hoặc `npm run media:cleanup`):
 *    liệt kê file trong thư mục CMS → đánh dấu file không dùng & cũ hơn 24 giờ (kể cả ảnh tải lên rồi bỏ dở,
 *    không bao giờ lưu), bỏ đánh dấu file được dùng lại, xoá file đã hết thời gian chờ.
 *    Chốt an toàn: dừng nếu > 30% file không dùng, không tìm thấy tham chiếu nào, hoặc cơ sở dữ liệu gần như trống.
 *    Khoá chạy 1 lần (collection `medialocks`, tự hết hạn) → nhiều máy / khởi động lại không chạy chồng.
 *
 * "Được dùng" = public_id xuất hiện ở BẤT KỲ đâu trong dữ liệu (mọi collection trừ nhật ký / phiên đăng nhập /
 * chính danh sách đánh dấu), kể cả trong HTML bài viết — quét chuỗi nên thà giữ nhầm còn hơn xoá nhầm.
 * Không bao giờ đụng: ảnh hệ thống của website (`<folder>/site/`) và file ngoài thư mục CMS.
 *
 * File "CHỜ LƯU" (collection `mediapending`): ảnh tải lên lúc bấm Lưu / video Drive vừa chép, CHƯA từng nằm
 * trong bản ghi nào đã lưu. Bỏ dấu "chờ lưu" ngay khi 1 lần lưu thành công nhắc tới file (confirmSavedMedia),
 * khi lần quét thấy file đang được dùng, hoặc khi file bị bỏ khỏi bản ghi (markOrphans).
 *   - Chưa từng được lưu → không thể nằm trong bản sao lưu nào → xoá sau 24 giờ, KHÔNG chờ 21 ngày
 *     (lưu hỏng giữa chừng, đóng form không lưu, nhân viên bấm bỏ video vừa chép…).
 *   - Từng được lưu → luôn chờ đủ thời gian chờ như trên.
 * File cũ (trước khi có danh sách chờ lưu) không có dấu → luôn được coi là "từng được lưu" (an toàn).
 */

export const ORPHANS = "mediaorphans";
export const LOCKS = "medialocks";
export const PENDING = "mediapending";
/** Collection KHÔNG tính là "đang dùng ảnh" (nhật ký ghi lại cả ảnh đã xoá, phiên đăng nhập, danh sách đánh dấu) */
const IGNORED_COLLECTIONS = new Set(["auditlogs", "sessions", ORPHANS, LOCKS, PENDING]);
const HOUR = 3600_000;
export const DAY = 24 * HOUR;
export const MIN_AGE_MS = DAY;
export const MAX_DELETE_RATIO = 0.3;
/** Cơ sở dữ liệu có ít hơn chừng này bản ghi (ngoài nhật ký…) → nghi quét nhầm / DB trống, không dọn */
export const MIN_REFERENCE_DOCS = 10;
const LOCK_NAME = "media-sweep";
const LOCK_TTL_MS = 30 * 60_000;
const BATCH = 100; // Cloudinary nhận tối đa 100 public_id mỗi lần xoá
const VN_OFFSET_MS = 7 * HOUR; // Asia/Ho_Chi_Minh, không có giờ mùa hè
export const SWEEP_HOUR_VN = 3;

const graceMsDefault = () => env.cloudinary.orphanGraceDays * DAY;
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const time = (d) => (d == null ? NaN : new Date(d).getTime());

/** public_id có thuộc vùng được phép dọn không (trong thư mục CMS, không phải ảnh hệ thống) */
export function isManaged(publicId, folder = env.cloudinary.folder) {
  return (
    typeof publicId === "string" &&
    !!folder &&
    publicId.startsWith(`${folder}/`) &&
    !publicId.startsWith(`${folder}/site/`)
  );
}

export const resourceTypeOf = (publicId, folder = env.cloudinary.folder) =>
  publicId.startsWith(`${folder}/banner/`) ? "video" : "image";

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
 * Lên kế hoạch (thuần — không gọi mạng, dễ kiểm thử).
 * @param {{ assets: { publicId: string, resourceType?: string, createdAt?: string|Date, bytes?: number }[],
 *   refs: Set<string>, candidates?: { publicId: string, firstSeenAt: Date|string, reason?: string }[],
 *   pending?: { publicId: string, uploadedAt?: Date|string }[], docCount?: number,
 *   now?: number, minAgeMs?: number, graceMs?: number, maxRatio?: number, minDocs?: number, force?: boolean,
 *   folder?: string }} p
 * @returns {{ total: number, referenced: number, young: number, unused: object[], toMark: object[],
 *   waiting: object[], toDelete: object[], toUnmark: string[], toClear: string[], neverSaved: number,
 *   aborted: boolean, reason?: string }}
 *   unused   = mọi file không dùng & cũ hơn 24 giờ (= toMark + waiting + toDelete)
 *   toMark   = mới phát hiện, chưa đánh dấu · waiting = đã đánh dấu, chưa hết thời gian chờ
 *   toDelete = xoá được: hết thời gian chờ, hoặc chưa từng được lưu (`fast`) & đã quá 24 giờ
 *   toUnmark = đánh dấu cần bỏ (được dùng lại / file đã mất)
 *   toClear  = dấu "chờ lưu" cần bỏ (file đang được dùng → từng được lưu / file đã mất)
 */
export function planSweep({
  assets,
  refs,
  candidates = [],
  pending = [],
  docCount = Infinity,
  now = Date.now(),
  minAgeMs = MIN_AGE_MS,
  graceMs = graceMsDefault(),
  maxRatio = MAX_DELETE_RATIO,
  minDocs = MIN_REFERENCE_DOCS,
  force = false,
  folder = env.cloudinary.folder,
}) {
  const managed = assets.filter((a) => isManaged(a.publicId, folder));
  const known = new Map(candidates.map((c) => [c.publicId, c]));
  const waitingSave = new Map(pending.map((p) => [p.publicId, p]));
  const seen = new Set();
  const plan = {
    total: managed.length,
    referenced: 0,
    young: 0,
    unused: [],
    toMark: [],
    waiting: [],
    toDelete: [],
    toUnmark: [],
    toClear: [],
    neverSaved: 0,
    aborted: false,
  };
  for (const a of managed) {
    seen.add(a.publicId);
    const c = known.get(a.publicId);
    const p = waitingSave.get(a.publicId);
    if (refs.has(a.publicId)) {
      plan.referenced++;
      if (c) plan.toUnmark.push(a.publicId); // được dùng lại → bỏ đánh dấu
      if (p) plan.toClear.push(a.publicId); // đang được dùng → đã được lưu, hết "chờ lưu"
      continue;
    }
    // Chưa từng được lưu: chờ lưu & không bị đánh dấu "bỏ khỏi bản ghi khi lưu" (dấu đó = từng được lưu)
    const neverSaved = !!p && c?.reason !== "removed-on-save";
    const created = Math.max(time(a.createdAt), neverSaved ? time(p.uploadedAt) || 0 : 0);
    if (!Number.isFinite(created) || now - created < minAgeMs) {
      plan.young++; // vừa tải lên / vừa dùng lại, có thể đang soạn dở → chưa tính
      continue;
    }
    plan.unused.push(a);
    if (neverSaved) {
      plan.neverSaved++;
      plan.toDelete.push({
        ...a,
        fast: true,
        uploadedAt: p.uploadedAt ? new Date(p.uploadedAt) : null,
        deletableAt: new Date(created + minAgeMs),
      });
      continue;
    }
    const firstSeen = c ? time(c.firstSeenAt) : now;
    const deletableAt = Math.max(firstSeen + graceMs, created + minAgeMs);
    const item = {
      ...a,
      marked: !!c,
      firstSeenAt: new Date(firstSeen),
      deletableAt: new Date(deletableAt),
    };
    if (now >= deletableAt)
      plan.toDelete.push(item); // file mới chỉ vào đây khi thời gian chờ = 0
    else if (!c) plan.toMark.push(item);
    else plan.waiting.push(item);
  }
  // Đánh dấu / "chờ lưu" của file không còn trên Cloudinary (đã xoá tay…) → bỏ
  for (const c of candidates) if (!seen.has(c.publicId)) plan.toUnmark.push(c.publicId);
  for (const p of pending) if (!seen.has(p.publicId)) plan.toClear.push(p.publicId);

  // Chốt an toàn chống xoá hàng loạt (quét dữ liệu thiếu, nhầm cơ sở dữ liệu…): dừng cả đánh dấu lẫn xoá
  if (!force && plan.unused.length) {
    if (!refs.size) plan.reason = "no references found in database";
    else if (docCount < minDocs) plan.reason = `database looks empty (${docCount} documents)`;
    else if (plan.unused.length / managed.length > maxRatio)
      plan.reason = `${plan.unused.length}/${managed.length} files unused (> ${Math.round(maxRatio * 100)}%)`;
    plan.aborted = Boolean(plan.reason);
  }
  return plan;
}

/** Thời điểm chạy kế tiếp: `hour` giờ sáng theo giờ Việt Nam, sau `now` */
export function nextRunAt(now = Date.now(), hour = SWEEP_HOUR_VN) {
  const local = new Date(now + VN_OFFSET_MS);
  let t =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour) - VN_OFFSET_MS;
  if (t <= now) t += DAY;
  return new Date(t);
}

/* ------------------------------------------------------------------------- */

/** Quét dữ liệu: mọi public_id đang được dùng + số bản ghi đã quét */
export async function scanReferences(db = mongoose.connection.db) {
  if (!db) throw new Error("database not connected");
  const refs = new Set();
  let docs = 0;
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  if (!collections.length) throw new Error("no collections");
  for (const { name } of collections) {
    if (IGNORED_COLLECTIONS.has(name) || name.startsWith("system.")) continue;
    for await (const doc of db.collection(name).find({})) {
      docs++;
      for (const id of extractRefs(doc)) refs.add(id);
    }
  }
  return { refs, docs };
}

/** Toàn bộ public_id đang được dữ liệu website dùng (quét mọi collection) */
export async function collectReferences(db = mongoose.connection.db) {
  return (await scanReferences(db)).refs;
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
 * Danh sách đánh dấu + khoá chạy, lưu trong MongoDB (driver gốc, không cần model).
 *   mediaorphans { publicId, resourceType, firstSeenAt, lastCheckedAt, reason }
 *   medialocks   { _id: tên job, owner, host, startedAt, expiresAt }
 */
export function orphanStore(db = mongoose.connection.db) {
  if (!db) throw new Error("database not connected");
  const orphans = db.collection(ORPHANS);
  const locks = db.collection(LOCKS);
  let indexed = null;
  const ensureIndex = () =>
    (indexed ??= orphans.createIndex({ publicId: 1 }, { unique: true }).catch((err) => {
      indexed = null;
      throw err;
    }));
  return {
    async list() {
      return orphans.find({}).toArray();
    },
    /** Đánh dấu (giữ nguyên firstSeenAt nếu đã có) */
    async mark(items, { now = new Date(), reason = "unreferenced" } = {}) {
      if (!items.length) return;
      await ensureIndex();
      await orphans.bulkWrite(
        items.map((x) => ({
          updateOne: {
            filter: { publicId: x.publicId },
            update: {
              $setOnInsert: {
                firstSeenAt: now,
                reason: x.reason ?? reason,
                resourceType: x.resourceType ?? resourceTypeOf(x.publicId),
              },
              $set: { lastCheckedAt: now },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    },
    async unmark(publicIds) {
      if (publicIds.length) await orphans.deleteMany({ publicId: { $in: publicIds } });
    },
    /** Giành khoá; trả về mã chủ khoá, hoặc null nếu đang có lần chạy khác (khoá chưa hết hạn) */
    async acquireLock(name = LOCK_NAME, ttlMs = LOCK_TTL_MS) {
      const now = new Date();
      const owner = randomUUID();
      try {
        // khoá còn hạn → filter không khớp → upsert chèn trùng _id → lỗi 11000 = đang bận
        await locks.updateOne(
          { _id: name, expiresAt: { $lte: now } },
          {
            $set: { owner, host: hostname(), startedAt: now, expiresAt: new Date(+now + ttlMs) },
          },
          { upsert: true },
        );
        return owner;
      } catch (err) {
        if (err?.code === 11000) return null;
        throw err;
      }
    },
    async releaseLock(owner, name = LOCK_NAME) {
      await locks.deleteOne({ _id: name, owner });
    },
  };
}

/**
 * Danh sách file "chờ lưu" (chưa từng nằm trong bản ghi nào đã lưu):
 *   mediapending { publicId, resourceType, createdAt, uploadedAt, owners: [id nhân viên], holds }
 * holds = số form đang giữ file (cùng 1 ảnh chọn ở 2 tab → 2); bỏ ở 1 form không xoá file form kia còn dùng.
 */
export function pendingStore(db = mongoose.connection.db) {
  if (!db) throw new Error("database not connected");
  const col = db.collection(PENDING);
  let indexed = null;
  const ensureIndex = () =>
    (indexed ??= col.createIndex({ publicId: 1 }, { unique: true }).catch((err) => {
      indexed = null;
      throw err;
    }));
  return {
    async list() {
      return col.find({}).toArray();
    },
    async get(publicId) {
      return col.findOne({ publicId });
    },
    /** File MỚI vừa tải lên / chép về (chưa lưu) */
    async add(publicId, { owner = "", now = new Date() } = {}) {
      await ensureIndex();
      await col.updateOne(
        { publicId },
        {
          $setOnInsert: { createdAt: now, resourceType: resourceTypeOf(publicId) },
          $set: { uploadedAt: now },
          $addToSet: { owners: String(owner) },
          $inc: { holds: 1 },
        },
        { upsert: true },
      );
    },
    /**
     * Tải lại đúng file đã có: chỉ làm mới nếu file đang "chờ lưu".
     * KHÔNG BAO GIỜ biến file từng được lưu thành "chờ lưu" (file đó có thể nằm trong bản sao lưu).
     * @returns {Promise<boolean>} file đang chờ lưu
     */
    async touch(publicId, { owner = "", now = new Date() } = {}) {
      const r = await col.updateOne(
        { publicId },
        { $set: { uploadedAt: now }, $addToSet: { owners: String(owner) }, $inc: { holds: 1 } },
      );
      return (r?.matchedCount ?? 0) > 0;
    },
    /** 1 form thôi giữ file → số form còn giữ (null = file không chờ lưu) */
    async release(publicId) {
      const doc = await col.findOneAndUpdate(
        { publicId },
        { $inc: { holds: -1 } },
        { returnDocument: "after" },
      );
      return doc ? Math.max(0, doc.holds ?? 0) : null;
    },
    /** Bỏ dấu "chờ lưu" (đã được lưu / đã xoá file) */
    async clear(publicIds) {
      if (publicIds.length) await col.deleteMany({ publicId: { $in: publicIds } });
    },
  };
}

const writeAudit = (meta) =>
  AuditLog.create({
    actor: null,
    actorName: "",
    action: "media.cleanup",
    target: { type: "media", id: "" },
    meta,
  });

/**
 * Quét dọn toàn bộ. Mặc định chỉ báo cáo (dry-run, không ghi gì).
 * `apply`: đánh dấu file mới không dùng, bỏ đánh dấu file được dùng lại, xoá file đã hết thời gian chờ.
 * @param {{ apply?: boolean, force?: boolean, minAgeMs?: number, graceMs?: number, minDocs?: number, now?: number }} opts
 * @param {{ db?: any, api?: any, store?: ReturnType<typeof orphanStore>, audit?: (meta: object) => Promise<unknown>,
 *   enabled?: boolean }} deps  (thay thế khi kiểm thử)
 */
export async function runSweep(
  {
    apply = false,
    force = false,
    minAgeMs = MIN_AGE_MS,
    graceMs = graceMsDefault(),
    minDocs = MIN_REFERENCE_DOCS,
    now = Date.now(),
  } = {},
  {
    db = mongoose.connection.db,
    api = cloudinary.api,
    store = orphanStore(db),
    pending = pendingStore(db),
    audit = writeAudit,
    enabled = env.cloudinary.enabled,
  } = {},
) {
  if (!enabled) throw new Error("Cloudinary not configured");
  const lock = apply ? await store.acquireLock() : null;
  if (apply && !lock) {
    const skipped = {
      event: "media.sweep",
      apply,
      skipped: true,
      reason: "another sweep is running",
    };
    logger.info(skipped, "[media] bỏ qua — đang có lần dọn khác chạy");
    return skipped;
  }
  try {
    const { refs, docs } = await scanReferences(db);
    const assets = await listAssets(api);
    const candidates = await store.list();
    const waitingSave = await pending.list();
    const plan = planSweep({
      assets,
      refs,
      candidates,
      pending: waitingSave,
      docCount: docs,
      now,
      minAgeMs,
      graceMs,
      minDocs,
      force,
    });
    const sum = (list) => list.reduce((s, a) => s + (a.bytes ?? 0), 0);
    const summary = {
      event: "media.sweep",
      apply,
      total: plan.total,
      referenced: plan.referenced,
      young: plan.young,
      unused: plan.unused.length,
      unusedBytes: sum(plan.unused),
      marked: candidates.length,
      newOrphans: plan.toMark.length,
      waiting: plan.waiting.length,
      deletable: plan.toDelete.length,
      neverSaved: plan.neverSaved,
      unmarked: plan.toUnmark.length,
      pendingCleared: plan.toClear.length,
      graceDays: Math.round((graceMs / DAY) * 10) / 10,
      aborted: plan.aborted,
      reason: plan.reason,
    };
    if (apply) {
      await store.unmark(plan.toUnmark); // bỏ đánh dấu luôn an toàn, kể cả khi dừng
      await pending.clear(plan.toClear); // bỏ "chờ lưu" = chuyển sang chế độ chờ đủ ngày → luôn an toàn
      if (!plan.aborted) {
        await store.mark([...plan.toMark, ...plan.waiting], { now: new Date(now) });
        if (plan.toDelete.length) {
          // Kiểm tra lại ngay trước khi xoá: có ai vừa dùng lại / vừa tải lại / vừa lưu file không
          const { refs: fresh } = await scanReferences(db);
          const marks = new Set((await store.list()).map((c) => c.publicId));
          const stillPending = new Map((await pending.list()).map((p) => [p.publicId, p]));
          const safe = (a) => {
            if (fresh.has(a.publicId)) return false;
            if (!a.fast) return !a.marked || marks.has(a.publicId);
            const p = stillPending.get(a.publicId);
            return !!p && !(time(p.uploadedAt) > time(a.uploadedAt));
          };
          const reused = plan.toDelete.filter((a) => !safe(a));
          const go = plan.toDelete.filter(safe);
          await store.unmark(reused.filter((a) => fresh.has(a.publicId)).map((a) => a.publicId));
          summary.deleted = go.length ? await deleteAssets(go, api) : 0;
          summary.deletedBytes = sum(go);
          summary.deletedNeverSaved = go.filter((a) => a.fast).length;
          await store.unmark(go.map((a) => a.publicId));
          await pending.clear(go.filter((a) => a.fast).map((a) => a.publicId));
          if (summary.deleted)
            await audit({
              count: summary.deleted,
              bytes: summary.deletedBytes,
              graceDays: summary.graceDays,
              neverSaved: summary.deletedNeverSaved,
            }).catch((err) => logger.warn({ err }, "[media] không ghi được nhật ký dọn ảnh"));
        }
      }
    }
    (plan.aborted ? logger.warn : logger.info).call(logger, summary, "[media] quét ảnh không dùng");
    return { ...summary, plan };
  } finally {
    if (lock)
      await store
        .releaseLock(lock)
        .catch((err) => logger.warn({ err }, "[media] không nhả được khoá dọn ảnh"));
  }
}

/* ------------------------------------------------------------------------- */

let pending = new Set();
let timer = null;
const AFTER_SAVE_DELAY_MS = 5_000;

/** Đánh dấu (KHÔNG xoá) những file vừa bị bỏ khỏi bản ghi; lần quét hằng ngày sẽ kiểm tra lại & xoá sau thời gian chờ */
export async function markOrphans(
  candidates,
  { store, pending, enabled = env.cloudinary.enabled } = {},
) {
  const ids = [...new Set(candidates)].filter((id) => isManaged(id));
  if (!ids.length || !enabled) return 0;
  await (store ?? orphanStore()).mark(
    ids.map((publicId) => ({ publicId, resourceType: resourceTypeOf(publicId) })),
    { reason: "removed-on-save" },
  );
  // file vừa bị bỏ khỏi bản ghi = đã từng được lưu → không còn "chờ lưu" (chờ đủ thời gian chờ)
  await (pending ?? pendingStore()).clear(ids);
  logger.debug({ event: "media.orphan_marked", count: ids.length }, "[media] đánh dấu ảnh bị bỏ");
  return ids.length;
}

/**
 * Gọi sau khi lưu / xoá thành công: ảnh của bản cũ không còn trong bản mới → đánh dấu chờ dọn (chạy nền,
 * gộp nhiều lần lưu liên tiếp). Không xoá gì, không bao giờ ném lỗi ra ngoài.
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
      markOrphans(batch).catch((err) =>
        logger.warn({ err, count: batch.length }, "[media] không đánh dấu được ảnh cũ"),
      );
    }, AFTER_SAVE_DELAY_MS);
    timer.unref?.();
  } catch (err) {
    logger.warn({ err }, "[media] không đánh dấu được ảnh cũ");
  }
}

/**
 * 1 lần lưu thành công nhắc tới file → file đã được lưu, bỏ dấu "chờ lưu" (từ đây file luôn chờ đủ thời gian chờ).
 * @param {unknown} value dữ liệu vừa lưu (body của request)
 * @returns {Promise<number>} số file nhắc tới
 */
export async function confirmSaved(value, { pending, enabled = env.cloudinary.enabled } = {}) {
  if (!enabled) return 0;
  const ids = [...extractRefs(value)].filter((id) => isManaged(id));
  if (!ids.length) return 0;
  await (pending ?? pendingStore()).clear(ids);
  return ids.length;
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH"]);

/**
 * Middleware gắn trước mọi route: request ghi (POST / PUT / PATCH) thành công có nhắc tới file Cloudinary
 * → file đó đã được lưu vào bản ghi → bỏ dấu "chờ lưu". Áp dụng cho MỌI chỗ lưu (kể cả trang mới thêm sau này),
 * không cần sửa từng service. Bỏ qua /uploads (chính các thao tác tải lên / bỏ file).
 * Nhận nhầm (lưu thành công nhưng dữ liệu không giữ file) chỉ làm file chờ lâu hơn — không bao giờ xoá nhầm.
 */
export const makeConfirmSavedMedia =
  (confirm = confirmSaved) =>
  (req, res, next) => {
    if (WRITE_METHODS.has(req.method) && !req.path.startsWith("/uploads"))
      res.on("finish", () => {
        // chỉ nhân viên đã đăng nhập (req.user do requireAuth gắn) — form công khai của khách không tính
        if (!req.user || res.statusCode < 200 || res.statusCode >= 300) return;
        if (!req.body || typeof req.body !== "object") return;
        Promise.resolve(confirm(req.body)).catch((err) =>
          logger.warn({ err }, "[media] không bỏ được dấu chờ lưu của ảnh vừa lưu"),
        );
      });
    next();
  };
export const confirmSavedMedia = makeConfirmSavedMedia();

/**
 * Job hằng ngày lúc ~03:00 giờ Việt Nam (chuỗi setTimeout, không giữ tiến trình sống).
 * Nhiều máy / khởi động lại cùng lúc: khoá trong MongoDB đảm bảo chỉ 1 lần chạy.
 * @returns {() => void} hàm dừng lịch
 */
export function scheduleDailySweep({
  run = () => runSweep({ apply: true }),
  clock = () => Date.now(),
} = {}) {
  let handle = null;
  let stopped = false;
  const plan = () => {
    if (stopped) return;
    const at = nextRunAt(clock());
    handle = setTimeout(async () => {
      try {
        await run();
      } catch (err) {
        logger.warn({ err }, "[media] quét định kỳ lỗi");
      }
      plan();
    }, at.getTime() - clock());
    handle.unref?.();
    logger.debug({ event: "media.sweep_scheduled", at }, "[media] lần dọn ảnh kế tiếp");
  };
  plan();
  return () => {
    stopped = true;
    clearTimeout(handle);
  };
}
