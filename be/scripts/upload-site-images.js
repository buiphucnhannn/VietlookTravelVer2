/**
 * Đưa toàn bộ ảnh trong fe/public/images lên Cloudinary (chỉ tải ảnh CHƯA có → chạy lại bao nhiêu lần cũng được):
 *   npm run images:upload
 *
 * public_id cố định theo đường dẫn file:  /images/tours/v2/ha-long.jpg  →  <CLOUDINARY_FOLDER>/site/images/tours/v2/ha-long
 * → website đổi đường dẫn ảnh sang URL Cloudinary bằng đúng quy tắc này (fe/src/lib/image-loader.js), không cần bảng tra.
 * Ảnh hiển thị qua Cloudinary (f_auto, q_auto, đúng bề ngang) → KHÔNG dùng bộ tối ưu ảnh của Vercel (tránh hết hạn mức).
 * SVG giữ nguyên ở /public (vector, không cần tối ưu).
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudinary, configureCloudinary } from "../src/config/cloudinary.js";
import { env } from "../src/config/env.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fe/public");
const EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const CONCURRENCY = 6;

/** Quy tắc đặt public_id — PHẢI giống hàm sitePublicId trong fe/src/lib/image-loader.js */
export const sitePublicId = (webPath) =>
  `${env.cloudinary.folder}/site/${webPath
    .replace(/^\//, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^A-Za-z0-9/_-]/g, "_")}`;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function existingIds() {
  const ids = new Set();
  let next_cursor;
  do {
    const r = await cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      prefix: `${env.cloudinary.folder}/site/`,
      max_results: 500,
      next_cursor,
    });
    r.resources.forEach((x) => ids.add(x.public_id));
    next_cursor = r.next_cursor;
  } while (next_cursor);
  return ids;
}

async function main() {
  if (!env.cloudinary.enabled) throw new Error("Chưa cấu hình CLOUDINARY_* trong be/.env");
  configureCloudinary();
  const files = await walk(path.join(ROOT, "images"));
  const have = await existingIds();
  const todo = files
    .map((f) => ({ file: f, web: `/${path.relative(ROOT, f).split(path.sep).join("/")}` }))
    .filter((x) => !have.has(sitePublicId(x.web)));

  console.log(
    `Ảnh trong /public/images: ${files.length} · đã có trên Cloudinary: ${files.length - todo.length} · cần tải: ${todo.length}`,
  );
  let done = 0;
  let failed = 0;
  let bytes = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        try {
          await cloudinary.uploader.upload(item.file, {
            public_id: sitePublicId(item.web),
            resource_type: "image",
            overwrite: false,
            unique_filename: false,
            use_filename: false,
            timeout: 120_000,
          });
          bytes += (await stat(item.file)).size;
          done++;
          if (done % 25 === 0) console.log(`  … ${done}/${todo.length}`);
        } catch (err) {
          failed++;
          console.error(`  ✗ ${item.web}: ${err?.message ?? err?.error?.message ?? err}`);
        }
      }
    }),
  );
  console.log(`Xong: tải ${done} ảnh (${(bytes / 1048576).toFixed(1)} MB), lỗi ${failed}.`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
