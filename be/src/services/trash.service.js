import { logger } from "../config/logger.js";
import { AuditLog } from "../models/audit-log.model.js";
import { TRASH_DAYS, originalSlug } from "../models/soft-delete.plugin.js";
import {
  articleRepository,
  enquiryRepository,
  tourRepository,
} from "../repositories/content.repository.js";
import { DAY, markOrphans, nextRunAt, removedRefs } from "./media-cleanup.service.js";

/**
 * Thùng rác: tour, bài viết, đơn / yêu cầu bị xoá được giữ TRASH_DAYS ngày (30) rồi mới xoá hẳn.
 * - `npm run trash:purge` (mặc định chỉ báo cáo) / `-- --apply` xoá thật.
 * - Job hằng ngày ~03:30 giờ VN (sau lần dọn ảnh 03:00) khi chạy server.
 * Xoá hẳn → ảnh của mục đó được ĐÁNH DẤU chờ dọn (media-cleanup vẫn chờ đủ thời gian rồi kiểm tra lại mới xoá).
 */

const title = (loc) => loc?.vi || loc?.en || loc?.zh || "";

export const TRASH_KINDS = [
  {
    key: "tours",
    label: "Tour",
    repo: tourRepository,
    name: (d) =>
      title({ vi: d.content?.vi?.title, en: d.content?.en?.title, zh: d.content?.zh?.title }) ||
      originalSlug(d.slug),
  },
  {
    key: "articles",
    label: "Bài viết",
    repo: articleRepository,
    name: (d) => title(d.title) || originalSlug(d.slug),
  },
  {
    key: "enquiries",
    label: "Đơn / yêu cầu",
    repo: enquiryRepository,
    name: (d) => [d.code, d.name].filter(Boolean).join(" · "),
  },
];

/**
 * Xoá hẳn mục đã nằm trong Thùng rác quá `days` ngày. Mặc định chỉ báo cáo (apply = false).
 * @returns {Promise<{ cutoff: Date, apply: boolean, total: number, deleted: number,
 *   kinds: { key: string, label: string, found: number, deleted: number,
 *     items: { id: string, name: string, deletedAt: Date }[] }[] }>}
 */
export async function purgeTrash({
  apply = false,
  days = TRASH_DAYS,
  now = Date.now(),
  kinds = TRASH_KINDS,
  mark = markOrphans,
  audit = writeAudit,
} = {}) {
  const cutoff = new Date(now - days * DAY);
  const out = { cutoff, apply, total: 0, deleted: 0, kinds: [] };
  for (const k of kinds) {
    const docs = await k.repo.findDeletedBefore(cutoff);
    let deleted = 0;
    if (apply && docs.length) {
      const r = await k.repo.purgeByIds(
        docs.map((d) => d._id),
        { before: cutoff },
      );
      deleted = r?.deletedCount ?? 0;
      const refs = docs.flatMap((d) => removedRefs(d, null));
      if (refs.length)
        await Promise.resolve(mark(refs)).catch((err) =>
          logger.warn({ err }, "[trash] không đánh dấu được ảnh của mục đã xoá hẳn"),
        );
    }
    out.total += docs.length;
    out.deleted += deleted;
    out.kinds.push({
      key: k.key,
      label: k.label,
      found: docs.length,
      deleted,
      items: docs.map((d) => ({ id: String(d._id), name: k.name(d), deletedAt: d.deletedAt })),
    });
  }
  if (apply && out.deleted) {
    const counts = Object.fromEntries(out.kinds.map((k) => [k.key, k.deleted]));
    await Promise.resolve(audit({ count: out.deleted, days, ...counts })).catch((err) =>
      logger.warn({ err }, "[trash] không ghi được nhật ký"),
    );
    logger.info({ event: "trash.purge", ...counts }, "[trash] đã xoá hẳn mục quá hạn");
  }
  return out;
}

const writeAudit = (meta) =>
  AuditLog.create({
    actor: null,
    actorName: "",
    action: "trash.purge",
    target: { type: "trash", id: "" },
    meta,
  });

/** Giờ chạy hằng ngày: 03:30 giờ VN (sau lần dọn ảnh 03:00) */
const PURGE_HOUR_VN = 3;
const PURGE_OFFSET_MS = 30 * 60_000;
export const nextPurgeAt = (now = Date.now()) =>
  new Date(nextRunAt(now - PURGE_OFFSET_MS, PURGE_HOUR_VN).getTime() + PURGE_OFFSET_MS);

/**
 * Job hằng ngày xoá hẳn mục quá hạn trong Thùng rác (chuỗi setTimeout, không giữ tiến trình sống).
 * Chạy nhiều máy cùng lúc cũng an toàn: xoá theo điều kiện, lần sau không còn gì để xoá.
 * @returns {() => void} hàm dừng lịch
 */
export function scheduleDailyTrashPurge({
  run = () => purgeTrash({ apply: true }),
  clock = () => Date.now(),
} = {}) {
  let handle = null;
  let stopped = false;
  const plan = () => {
    if (stopped) return;
    const at = nextPurgeAt(clock());
    handle = setTimeout(
      async () => {
        try {
          await run();
        } catch (err) {
          logger.warn({ err }, "[trash] xoá hẳn định kỳ lỗi");
        }
        plan();
      },
      Math.max(1000, at.getTime() - clock()),
    );
    handle.unref?.();
  };
  plan();
  return () => {
    stopped = true;
    clearTimeout(handle);
  };
}
