/**
 * Sao lưu TOÀN BỘ database ra 1 file JSON nén gzip (Extended JSON → giữ đúng ObjectId, ngày giờ…).
 *   npm run db:backup                    → lưu vào BACKUP_DIR (mặc định be/backups), giữ 7 ngày gần nhất
 *   npm run db:backup -- --dir D:/bk     → chọn thư mục khác
 *   npm run db:backup -- --no-rotate     → không xoá bản cũ
 * Đặt lịch chạy mỗi ngày bằng cron (Linux) hoặc Task Scheduler (Windows) — xem be/README.md.
 * Chỉ ĐỌC database, không ghi gì.
 */
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { createGzip } from "node:zlib";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { BACKUP_PREFIX, backupFileName, planRotation } from "../utils/backup.js";

const { EJSON } = mongoose.mongo.BSON;

/** Ghi toàn bộ collection của DB đang kết nối ra file .json.gz → trả về { file, counts } */
export async function dumpDatabase(dir, prefix = BACKUP_PREFIX) {
  fs.mkdirSync(dir, { recursive: true });
  const db = mongoose.connection.db;
  const file = path.join(dir, backupFileName(new Date(), prefix));
  const tmp = `${file}.part`;
  const gz = createGzip({ level: 9 });
  const out = fs.createWriteStream(tmp);
  gz.pipe(out);
  const write = async (s) => {
    if (!gz.write(s)) await once(gz, "drain");
  };
  const counts = {};
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();
  await write(
    `{"meta":${JSON.stringify({ db: db.databaseName, createdAt: new Date().toISOString(), collections })},"collections":{`,
  );
  for (const [i, name] of collections.entries()) {
    await write(`${i ? "," : ""}${JSON.stringify(name)}:[`);
    let n = 0;
    for await (const doc of db.collection(name).find({})) {
      await write(`${n ? "," : ""}${EJSON.stringify(doc, { relaxed: false })}`);
      n++;
    }
    await write("]");
    counts[name] = n;
  }
  gz.end("}}");
  await once(out, "finish");
  fs.renameSync(tmp, file); // chỉ xuất hiện file hoàn chỉnh (lỗi giữa chừng → không để lại file hỏng)
  return { file, counts };
}

/** Xoá bản cũ theo planRotation → trả về danh sách file đã xoá */
export function rotateBackups(dir, keep) {
  const { remove } = planRotation(fs.readdirSync(dir), keep);
  for (const name of remove) fs.rmSync(path.join(dir, name), { force: true });
  return remove;
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isMain) {
  const args = process.argv.slice(2);
  const argValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const dir = path.resolve(argValue("--dir") || process.env.BACKUP_DIR || "backups");
  const keep = Number(process.env.BACKUP_KEEP) || 7;
  try {
    await connectDatabase();
    const started = Date.now();
    const { file, counts } = await dumpDatabase(dir);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const size = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
    console.log(
      `Đã sao lưu ${Object.keys(counts).length} bảng · ${total} bản ghi → ${file} (${size} MB, ${((Date.now() - started) / 1000).toFixed(1)}s)`,
    );
    if (!args.includes("--no-rotate")) {
      const removed = rotateBackups(dir, keep);
      if (removed.length)
        console.log(`Đã xoá ${removed.length} bản cũ (giữ ${keep} ngày gần nhất)`);
    }
  } catch (err) {
    console.error("[db:backup] thất bại:", err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
