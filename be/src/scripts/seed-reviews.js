/**
 * Đưa đánh giá khách có sẵn (be/seed-data/reviews.json — 8 đánh giá Tripadvisor thật chép NGUYÊN VĂN từ widget
 * trang chủ web cũ, trước đây để cứng ở fe/src/data/reviews.js) vào mục "Đánh giá khách" của CMS:
 *   npm run reviews:seed
 *
 * - Chạy lại bao nhiêu lần cũng được: đánh giá đã có (cùng nguồn + tên + tiêu đề) được GIỮ NGUYÊN
 *   (không ghi đè chỉnh sửa trong CMS, không tạo trùng); chỉ thêm đánh giá còn thiếu.
 * - Trước khi ghi: lưu bản sao các đánh giá đang có vào be/backups/reviews-before-seed-<thời điểm>.json.
 * - Mỗi đánh giá đi qua đúng validator của CMS; lời khách phải giữ NGUYÊN VĂN (khác 1 ký tự → dừng, không ghi).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { logger } from "../config/logger.js";
import { Review } from "../models/review.model.js";
import { reviewSchema } from "../validators/review.validator.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = path.join(ROOT, "seed-data/reviews.json");
const BACKUPS = path.join(ROOT, "backups");

async function main() {
  const rows = JSON.parse(await readFile(DATA, "utf8"));

  // Kiểm tra trước toàn bộ (chưa ghi gì): hợp lệ + nguyên văn
  const docs = rows.map((raw, i) => {
    const parsed = reviewSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(
        `Đánh giá #${i + 1} "${raw.name}": ${issue.path.join(".")} — ${issue.message}`,
      );
    }
    for (const k of ["name", "title", "text"])
      if (parsed.data[k] !== raw[k])
        throw new Error(`Đánh giá #${i + 1} "${raw.name}": trường ${k} bị thay đổi khi kiểm tra`);
    return parsed.data;
  });

  await connectDatabase();

  const existing = await Review.find({}).lean();
  await mkdir(BACKUPS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = path.join(BACKUPS, `reviews-before-seed-${stamp}.json`);
  await writeFile(backup, `${JSON.stringify(existing, null, 2)}\n`);
  logger.info(
    `[reviews] Đã sao lưu ${existing.length} đánh giá đang có → ${path.relative(ROOT, backup)}`,
  );

  let inserted = 0;
  let kept = 0;
  for (const doc of docs) {
    const r = await Review.updateOne(
      { source: doc.source, name: doc.name, title: doc.title },
      { $setOnInsert: doc },
      { upsert: true, runValidators: true },
    );
    if (r.upsertedCount) inserted++;
    else kept++;
  }
  const total = await Review.countDocuments();
  logger.info(
    `[reviews] Thêm ${inserted}, giữ ${kept} / ${docs.length} — hiện có ${total} đánh giá`,
  );
}

main()
  .catch((err) => {
    logger.error({ err }, "[reviews] thất bại");
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
