/**
 * Nạp dữ liệu ban đầu (chuyển từ website cũ + nội dung đã biên soạn) vào MongoDB:
 *   npm run seed            → chỉ THÊM bản ghi còn thiếu (không ghi đè nội dung đã sửa trong CMS)
 *   npm run seed -- --force → ghi đè toàn bộ theo be/seed-data (cẩn thận: mất chỉnh sửa trong CMS)
 *
 * Mỗi bản ghi đi qua ĐÚNG validator + hook của CMS (lọc HTML, suy ra miền, slug…) → dữ liệu khớp form CMS.
 * Ảnh dạng /images/... đã được đưa lên Cloudinary bằng `npm run images:upload`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { logger } from "../config/logger.js";
import {
  articleRepository,
  authorRepository,
  carAreaRepository,
  carRepository,
  categoryRepository,
  destinationRepository,
  fastTrackRepository,
  pageRepository,
  settingRepository,
  themeRepository,
  tourRepository,
  visaTypeRepository,
} from "../repositories/content.repository.js";
import { prepareArticle, prepareTour } from "../services/modules.service.js";
import { cleanHtml } from "../utils/sanitize.js";
import {
  articleSchema,
  authorSchema,
  carAreaSchema,
  carSchema,
  categorySchema,
  destinationSchema,
  fastTrackSchema,
  homeSettingsSchema,
  pageSchema,
  themeSchema,
  tourSchema,
  visaTypeSchema,
} from "../validators/content.validator.js";

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../seed-data");
const FORCE = process.argv.includes("--force");
const read = async (name) => JSON.parse(await readFile(path.join(DATA, `${name}.json`), "utf8"));

async function upsert(repo, idField, doc) {
  const filter = { [idField]: doc[idField] };
  if (FORCE) {
    await repo.model.updateOne(filter, { $set: doc }, { upsert: true, runValidators: true });
    return "written";
  }
  const r = await repo.model.updateOne(filter, { $setOnInsert: doc }, { upsert: true });
  return r.upsertedCount ? "inserted" : "kept";
}

/** Chạy 1 nhóm: validate bằng schema của CMS → chuẩn hoá → upsert */
async function seed(label, file, repo, schema, { idField = "slug", prepare } = {}) {
  const rows = await read(file);
  const count = { inserted: 0, kept: 0, written: 0, invalid: 0 };
  for (const raw of rows) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      count.invalid++;
      const issue = parsed.error.issues[0];
      logger.warn(
        `[seed] ${label} "${raw[idField]}" bỏ qua: ${issue.path.join(".")} — ${issue.message}`,
      );
      continue;
    }
    const doc = prepare ? await prepare(parsed.data, null) : parsed.data;
    count[await upsert(repo, idField, doc)]++;
  }
  logger.info(
    `[seed] ${label}: thêm ${count.inserted}, giữ ${count.kept}, ghi đè ${count.written}, lỗi ${count.invalid} / ${rows.length}`,
  );
}

async function main() {
  await connectDatabase();
  if (FORCE) logger.warn("[seed] --force: GHI ĐÈ nội dung theo be/seed-data");

  // thứ tự quan trọng: tour cần điểm đến + chủ đề có trước
  await seed("Điểm đến", "destinations", destinationRepository, destinationSchema);
  await seed("Chủ đề", "themes", themeRepository, themeSchema);
  await seed("Chuyên mục", "categories", categoryRepository, categorySchema);
  await seed("Tác giả", "authors", authorRepository, authorSchema);
  await seed("Tour", "tours", tourRepository, tourSchema, { prepare: prepareTour });
  await seed("Bài viết", "articles", articleRepository, articleSchema, { prepare: prepareArticle });
  await seed("Loại xe", "cars", carRepository, carSchema, { idField: "key" });
  await seed("Khu vực xe", "car-areas", carAreaRepository, carAreaSchema, { idField: "key" });
  await seed("Loại visa", "visa-types", visaTypeRepository, visaTypeSchema, { idField: "key" });
  await seed("Gói fast-track", "fast-track", fastTrackRepository, fastTrackSchema, {
    idField: "key",
  });

  // Trang giới thiệu + 4 trang chính sách
  for (const raw of await read("pages")) {
    const data = pageSchema.parse(raw);
    const doc = {
      ...data,
      key: raw.key,
      body: Object.fromEntries(["en", "zh", "vi"].map((l) => [l, cleanHtml(data.body[l])])),
    };
    const r = await upsert(pageRepository, "key", doc);
    logger.info(`[seed] Trang "${raw.key}": ${r}`);
  }

  // Cài đặt trang chủ + email nhận thông báo
  for (const [key, value] of [
    ["home", homeSettingsSchema.parse(await read("home"))],
    [
      "notifications",
      { recipients: ["infovietlooktravel@gmail.com"], replyTo: "", sendCustomerConfirmation: true },
    ],
  ]) {
    const exists = await settingRepository.get(key);
    if (!exists || FORCE) {
      await settingRepository.set(key, value, "seed");
      logger.info(`[seed] Cài đặt "${key}": ${exists ? "ghi đè" : "thêm"}`);
    } else logger.info(`[seed] Cài đặt "${key}": giữ`);
  }
}

main()
  .catch((err) => {
    logger.error({ err }, "[seed] thất bại");
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
