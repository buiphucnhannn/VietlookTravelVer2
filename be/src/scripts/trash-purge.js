/**
 * Xoá hẳn tour / bài viết / đơn đã nằm trong Thùng rác quá 30 ngày (server cũng tự chạy mỗi ngày ~03:30 giờ VN).
 *   npm run trash:purge                 chỉ báo cáo (không xoá gì)
 *   npm run trash:purge -- --apply      xoá hẳn thật
 *   --days=45                           đổi số ngày giữ cho lần chạy này (tối thiểu 1)
 *   --list                              in đầy đủ danh sách (mặc định tối đa 30 dòng mỗi loại)
 */
import { configureCloudinary } from "../config/cloudinary.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { logger } from "../config/logger.js";
import { TRASH_DAYS } from "../models/soft-delete.plugin.js";
import { purgeTrash } from "../services/trash.service.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const days = opt("days") != null ? Number(opt("days")) : TRASH_DAYS;
const vnDate = (d) =>
  new Date(d).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" });

try {
  if (!Number.isFinite(days) || days < 1) throw new Error("--days must be >= 1");
  configureCloudinary();
  await connectDatabase();
  const r = await purgeTrash({ apply: flag("apply"), days });
  console.log(`Mục nằm trong Thùng rác từ trước ${vnDate(r.cutoff)} (quá ${days} ngày):`);
  for (const k of r.kinds) {
    console.log(`\n${k.label}: ${k.found}${r.apply ? ` — đã xoá hẳn ${k.deleted}` : ""}`);
    const shown = flag("list") ? k.items : k.items.slice(0, 30);
    for (const it of shown) console.log(`  ${vnDate(it.deletedAt)}\t${it.name}`);
    if (shown.length < k.items.length)
      console.log(`  … và ${k.items.length - shown.length} mục khác (thêm --list để xem hết)`);
  }
  console.log(
    r.apply
      ? `\nĐã xoá hẳn ${r.deleted} mục.`
      : `\nChưa xoá gì (thêm --apply để xoá hẳn ${r.total} mục).`,
  );
} catch (err) {
  logger.error({ err }, "[trash:purge] thất bại");
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
