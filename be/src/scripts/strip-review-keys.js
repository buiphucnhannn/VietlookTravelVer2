/**
 * MỘT LẦN: xoá các trường cũ khỏi cài đặt `reviewStats` sau khi chuyển sang tự cập nhật qua Apify.
 * Trước đây CMS lưu khoá API Tripadvisor / Google (mã hoá), mã địa điểm, công tắc tự động, người / lúc đổi khoá.
 * Nay chỉ còn { tripadvisor: {rating,count,url,updatedAt}, google: {…}, lastSync }.
 *   node --env-file=.env src/scripts/strip-review-keys.js            → chạy thử (mặc định): chỉ in trường sẽ xoá
 *   node --env-file=.env src/scripts/strip-review-keys.js --apply    → ghi (chỉ khi bản ghi chưa bị sửa từ lúc đọc)
 * Không bao giờ in giá trị khoá — chỉ in tên trường.
 * (Lần tự cập nhật thành công đầu tiên cũng tự bỏ các trường này; script giúp dọn ngay, kể cả khi chưa cài mã Apify.)
 */
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Setting } from "../models/setting.model.js";

const APPLY = process.argv.includes("--apply");
const KEEP = ["rating", "count", "url", "updatedAt"];
const SOURCES = ["tripadvisor", "google"];

async function main() {
  await connectDatabase();
  try {
    const doc = await Setting.findOne({ key: "reviewStats" }).lean();
    if (!doc) {
      console.log("Không có cài đặt reviewStats — không cần dọn.");
      return;
    }
    const v = doc.value ?? {};
    const unset = {};
    for (const src of SOURCES)
      for (const f of Object.keys(v[src] ?? {}))
        if (!KEEP.includes(f)) unset[`value.${src}.${f}`] = "";
    for (const f of Object.keys(v))
      if (![...SOURCES, "lastSync"].includes(f)) unset[`value.${f}`] = "";

    const fields = Object.keys(unset);
    if (!fields.length) {
      console.log("reviewStats đã gọn — không có trường cũ.");
      return;
    }
    console.log(`Trường sẽ xoá (${fields.length}):`);
    for (const f of fields) console.log(`  - ${f.replace(/^value\./, "")}`);
    if (!APPLY) {
      console.log("\nChạy thử — chưa ghi gì. Thêm --apply để xoá.");
      return;
    }
    const res = await Setting.updateOne(
      { _id: doc._id, updatedAt: doc.updatedAt }, // chỉ ghi nếu không ai sửa trong lúc chạy
      { $unset: unset },
    );
    if (res.modifiedCount === 1) console.log("\nĐã xoá các trường cũ.");
    else console.log("\nBản ghi vừa thay đổi trong lúc chạy — chưa ghi gì, hãy chạy lại.");
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error("Lỗi:", err?.message ?? err);
  process.exitCode = 1;
});
