/**
 * Khôi phục database từ 1 file sao lưu của `npm run db:backup`.
 *   npm run db:restore -- <file.json.gz>                    → CHỈ xem trước (số bản ghi từng bảng), không ghi
 *   npm run db:restore -- <file.json.gz> --yes              → khôi phục thật
 *   npm run db:restore -- <file.json.gz> --yes --only tours,articles   → chỉ vài bảng
 * ⚠ Khôi phục = XOÁ dữ liệu hiện tại của từng bảng có trong file rồi nạp lại từ file.
 *   Trước khi ghi, script tự sao lưu dữ liệu hiện tại ra "pre-restore-….json.gz" trong BACKUP_DIR
 *   (không bị xoay vòng xoá) để quay lại được nếu chọn nhầm file.
 */
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { dumpDatabase } from "./db-backup.js";

const { EJSON } = mongoose.mongo.BSON;
const args = process.argv.slice(2);
const argValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--only");
const YES = args.includes("--yes");
const ONLY = argValue("--only")?.split(",");

if (!file || !fs.existsSync(file)) {
  console.error("Cách dùng: npm run db:restore -- <file.json.gz> [--yes] [--only tours,articles]");
  process.exit(1);
}

const data = EJSON.parse(gunzipSync(fs.readFileSync(file)).toString("utf8"), { relaxed: false });
if (!data?.collections || typeof data.collections !== "object") {
  console.error("File không phải bản sao lưu của db:backup");
  process.exit(1);
}
const names = Object.keys(data.collections).filter((n) => !ONLY || ONLY.includes(n));
console.log(`Bản sao lưu: ${data.meta?.db ?? "?"} lúc ${data.meta?.createdAt ?? "?"}`);
for (const n of names) console.log(`  ${n.padEnd(24)} ${data.collections[n].length} bản ghi`);

if (!YES) {
  console.log(
    "\nCHẠY THỬ — chưa ghi gì. Thêm --yes để khôi phục (dữ liệu hiện tại của các bảng trên sẽ bị thay).",
  );
  process.exit(0);
}

try {
  await connectDatabase();
  const safety = await dumpDatabase(
    path.resolve(process.env.BACKUP_DIR || "backups"),
    "pre-restore-",
  );
  console.log(`Đã sao lưu dữ liệu hiện tại → ${safety.file}`);
  const db = mongoose.connection.db;
  for (const n of names) {
    const docs = data.collections[n];
    const col = db.collection(n);
    await col.deleteMany({});
    for (let i = 0; i < docs.length; i += 1000) await col.insertMany(docs.slice(i, i + 1000));
    console.log(`  ✓ ${n}: ${docs.length}`);
  }
  console.log("Khôi phục xong. Nên khởi động lại API để làm mới bộ nhớ đệm.");
} catch (err) {
  console.error("[db:restore] thất bại:", err.message);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
