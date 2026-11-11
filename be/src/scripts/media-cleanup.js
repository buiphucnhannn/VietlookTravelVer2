/**
 * Dọn ảnh / video không còn dùng trên Cloudinary (thư mục CMS, trừ ảnh hệ thống `<folder>/site/`).
 * File không dùng được ĐÁNH DẤU trước, chỉ xoá khi đã đánh dấu đủ MEDIA_ORPHAN_GRACE_DAYS ngày (mặc định 21).
 *   npm run media:cleanup                      chỉ báo cáo (không ghi / xoá gì)
 *   npm run media:cleanup -- --apply           chạy như job hằng ngày: đánh dấu + bỏ đánh dấu + xoá file hết hạn chờ
 *   npm run media:cleanup -- --apply --force   bỏ qua chốt an toàn (> 30% không dùng / DB trống / không có tham chiếu)
 *   --list                                     in đầy đủ danh sách (mặc định tối đa 30 dòng)
 *   --min-age-hours=48                         chỉ tính file cũ hơn N giờ (mặc định 24)
 *   --grace-days=0                             đổi thời gian chờ cho lần chạy này (0 = xoá ngay file không dùng)
 */
import { configureCloudinary } from "../config/cloudinary.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { DAY, MIN_AGE_MS, runSweep } from "../services/media-cleanup.service.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const minAgeMs =
  opt("min-age-hours") != null ? Number(opt("min-age-hours")) * 3600_000 : MIN_AGE_MS;
const graceDays =
  opt("grace-days") != null ? Number(opt("grace-days")) : env.cloudinary.orphanGraceDays;
const vnDate = (d) =>
  new Date(d).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" });

try {
  if (!Number.isFinite(minAgeMs) || minAgeMs < 3600_000)
    throw new Error("--min-age-hours must be >= 1");
  if (!Number.isFinite(graceDays) || graceDays < 0) throw new Error("--grace-days must be >= 0");
  configureCloudinary();
  await connectDatabase();
  const r = await runSweep({
    apply: flag("apply"),
    force: flag("force"),
    minAgeMs,
    graceMs: graceDays * DAY,
  });
  if (r.skipped) {
    console.log("Đang có lần dọn khác chạy — bỏ qua.");
  } else {
    const mb = (b) => `${((b ?? 0) / 1024 / 1024).toFixed(1)} MB`;
    console.log(
      [
        `Tổng file trong thư mục CMS: ${r.total}`,
        `Đang được dùng: ${r.referenced}`,
        `Mới tải lên (< ${Math.round(minAgeMs / 3600_000)} giờ, bỏ qua): ${r.young}`,
        `Không còn dùng: ${r.unused} (${mb(r.unusedBytes)})`,
        `  - mới phát hiện, sẽ đánh dấu: ${r.newOrphans}`,
        `  - đã đánh dấu, đang chờ (${r.graceDays} ngày): ${r.waiting}`,
        `  - hết thời gian chờ, xoá được: ${r.deletable}`,
        `Đánh dấu hiện có: ${r.marked} · cần bỏ đánh dấu (được dùng lại / file đã mất): ${r.unmarked}`,
        r.aborted
          ? `DỪNG: ${r.reason} — kiểm tra lại, chạy kèm --force nếu chắc chắn`
          : r.apply
            ? `Đã xoá: ${r.deleted ?? 0} (${mb(r.deletedBytes)})`
            : "Chưa ghi / xoá gì (thêm --apply để chạy thật)",
      ].join("\n"),
    );
    const rows = [
      ...r.plan.toDelete.map((a) => ["xoá được", a]),
      ...r.plan.waiting.map((a) => ["đang chờ", a]),
      ...r.plan.toMark.map((a) => ["mới", a]),
    ];
    const shown = flag("list") ? rows : rows.slice(0, 30);
    if (shown.length) console.log("\nTrạng thái\tĐánh dấu từ\tXoá được từ\tFile");
    for (const [state, a] of shown)
      console.log(`${state}\t${vnDate(a.firstSeenAt)}\t${vnDate(a.deletableAt)}\t${a.publicId}`);
    if (shown.length < rows.length)
      console.log(`… và ${rows.length - shown.length} file khác (thêm --list để xem hết)`);
  }
  if (r.aborted) process.exitCode = 2;
} catch (err) {
  logger.error({ err }, "[media:cleanup] thất bại");
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
