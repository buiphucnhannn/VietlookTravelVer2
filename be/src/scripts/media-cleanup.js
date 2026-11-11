/**
 * Dọn ảnh / video không còn dùng trên Cloudinary (thư mục CMS, trừ ảnh hệ thống `<folder>/site/`):
 *   npm run media:cleanup                 chỉ báo cáo (không xoá gì)
 *   npm run media:cleanup -- --apply      xoá thật
 *   npm run media:cleanup -- --apply --force   bỏ qua chốt an toàn "không xoá quá 30%"
 *   --list                                in danh sách file sẽ xoá
 *   --min-age-hours=48                    chỉ tính file cũ hơn N giờ (mặc định 24)
 */
import { configureCloudinary } from "../config/cloudinary.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { logger } from "../config/logger.js";
import { MIN_AGE_MS, runSweep } from "../services/media-cleanup.service.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const ageArg = args.find((a) => a.startsWith("--min-age-hours="));
const minAgeMs = ageArg ? Number(ageArg.split("=")[1]) * 3600_000 : MIN_AGE_MS;

try {
  if (!Number.isFinite(minAgeMs) || minAgeMs < 3600_000)
    throw new Error("--min-age-hours must be >= 1");
  configureCloudinary();
  await connectDatabase();
  const r = await runSweep({ apply: flag("apply"), force: flag("force"), minAgeMs });
  const mb = (r.unusedBytes / 1024 / 1024).toFixed(1);
  console.log(
    [
      `Tổng file trong thư mục CMS: ${r.total}`,
      `Đang được dùng: ${r.referenced}`,
      `Mới tải lên (< ${Math.round(minAgeMs / 3600_000)} giờ, bỏ qua): ${r.young}`,
      `Không còn dùng: ${r.unused} (${mb} MB)`,
      r.aborted
        ? `DỪNG: ${r.reason} — kiểm tra lại, chạy kèm --force nếu chắc chắn`
        : r.apply
          ? `Đã xoá: ${r.deleted ?? 0}`
          : "Chưa xoá gì (thêm --apply để xoá)",
    ].join("\n"),
  );
  if (flag("list"))
    for (const a of r.toDelete) console.log(`  ${a.resourceType}\t${a.createdAt}\t${a.publicId}`);
  if (r.aborted) process.exitCode = 2;
} catch (err) {
  logger.error({ err }, "[media:cleanup] thất bại");
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
