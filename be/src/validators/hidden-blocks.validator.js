import { z } from "zod";

/**
 * Cờ ẩn khối trên website: { <khoá khối>: true }. Chỉ nhận khoá đã khai báo (constants/hidden-blocks.js),
 * giá trị phải là true / false; khoá lạ bị bỏ; lưu gọn chỉ còn các khối đang ẩn (false = hiện → bỏ).
 * @param {readonly string[]} keys
 */
export const hiddenBlocks = (keys) =>
  z
    .object(Object.fromEntries(keys.map((k) => [k, z.boolean().optional()])))
    .transform((v) => Object.fromEntries(keys.filter((k) => v[k] === true).map((k) => [k, true])));
