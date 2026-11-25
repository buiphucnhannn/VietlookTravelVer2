/**
 * Nguồn câu mặc định dạng "data:<tên>.<đường dẫn>" trong registry.mjs → file dữ liệu tương ứng (tải khi cần).
 * Thêm nguồn mới: thêm 1 dòng ở đây (vd. cars: () => import("@/data/cars")).
 */
import { dataSourcesOf } from "./resolve.mjs";

export const DATA_SOURCES = {
  visa: () => import("@/data/visa"),
  regions: () => import("@/data/regions"),
};

/** { visa: module, … } — chỉ các nguồn trang `entry` dùng */
export async function loadDataSources(entry) {
  const names = dataSourcesOf(entry).filter((n) => DATA_SOURCES[n]);
  const mods = await Promise.all(names.map((n) => DATA_SOURCES[n]()));
  return Object.fromEntries(names.map((n, i) => [n, mods[i]]));
}
