import { z } from "zod";
import { objectId, pageQuery, searchQuery } from "./common.validator.js";

const actionCode = z
  .string()
  .trim()
  .regex(/^[a-z_.]{1,60}$/);
// Mẫu mã thao tác, `*` = phần bất kỳ: "auth.*", "*.delete"
const actionPatterns = z
  .string()
  .max(1000)
  .optional()
  .transform((v) => (v ? v.split(",").filter(Boolean) : []))
  .pipe(
    z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-z_.*]{1,60}$/),
      )
      .max(30),
  );
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")
  .optional();

export const listAuditLogsQuery = pageQuery.extend({
  action: actionCode.optional(),
  actor: objectId.optional(),
  // Ô tìm kiếm: khớp tên người thao tác, mã đơn / đường dẫn trang …
  q: searchQuery,
  // …hoặc các thao tác có nhãn tiếng Việt khớp chữ đã gõ (trang quản trị tự đổi chữ → mã thao tác)
  actions: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : []))
    .pipe(z.array(actionCode).max(60)),
  match: actionPatterns, // nhóm "Loại thao tác": khớp ít nhất 1 mẫu
  exclude: actionPatterns, // bỏ các mẫu này, vd. "auth.*" = ẩn đăng nhập / đăng xuất
  from: day, // YYYY-MM-DD, tính từ 0h (giờ Việt Nam)
  to: day, // YYYY-MM-DD, hết ngày (giờ Việt Nam)
});
