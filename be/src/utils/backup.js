/**
 * Hàm thuần cho sao lưu database (scripts/db-backup.js, db-restore.js) — tách riêng để test được.
 * Tên file: vietlook-YYYY-MM-DDTHH-mm-ss.json.gz (giờ UTC) → sắp xếp theo tên = theo thời gian.
 */
export const BACKUP_PREFIX = "vietlook-";
const RX = /^vietlook-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})\.json\.gz$/;

/** Date → tên file sao lưu */
export function backupFileName(date = new Date(), prefix = BACKUP_PREFIX) {
  const iso = date.toISOString().slice(0, 19).replace(/:/g, "-");
  return `${prefix}${iso}.json.gz`;
}

/** Tên file → { day: "YYYY-MM-DD", at: Date } | null (không phải file sao lưu tự động) */
export function parseBackupName(name) {
  const m = RX.exec(name);
  if (!m) return null;
  const at = new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`);
  return Number.isNaN(at.getTime()) ? null : { day: m[1], at };
}

/**
 * Xoay vòng: giữ bản MỚI NHẤT của mỗi ngày, cho `keep` ngày gần nhất có sao lưu; còn lại xoá.
 * File không đúng mẫu tên (vd. bản "pre-restore-…" hay file người dùng tự để) không bao giờ bị xoá.
 * @param {string[]} names tên file trong thư mục sao lưu
 * @returns {{ keep: string[], remove: string[] }}
 */
export function planRotation(names, keep = 7) {
  const backups = names
    .map((name) => ({ name, info: parseBackupName(name) }))
    .filter((b) => b.info)
    .sort((a, b) => b.info.at - a.info.at); // mới → cũ
  const days = new Set();
  const kept = [];
  const remove = [];
  for (const b of backups) {
    if (!days.has(b.info.day) && days.size < Math.max(1, keep)) {
      days.add(b.info.day);
      kept.push(b.name);
    } else remove.push(b.name);
  }
  return { keep: kept, remove };
}
