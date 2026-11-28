/**
 * Xoá mềm (Thùng rác) cho tour, bài viết, đơn / yêu cầu.
 *
 * - Trường `deletedAt` (null = đang dùng; có ngày = đã chuyển vào Thùng rác lúc đó).
 * - MỌI truy vấn đọc (find / findOne / findById / exists / countDocuments / distinct / aggregate) tự thêm
 *   điều kiện `deletedAt: null` → website, danh sách CMS, số đếm, sitemap, tour liên quan, tra đường dẫn cũ…
 *   không bao giờ thấy mục đã xoá, kể cả chỗ code mới thêm sau này.
 * - Muốn đọc cả mục đã xoá (Thùng rác, khôi phục, 9Pay báo kết quả cho đơn đã xoá…):
 *     • filter có sẵn khoá `deletedAt` (vd. { deletedAt: trusted({ $ne: null }) }), hoặc
 *     • includeDeleted(query) / includeDeleted(Model.aggregate(...)) (cờ riêng trên đối tượng truy vấn —
 *       không gửi xuống MongoDB như các tuỳ chọn setOptions).
 * - Lệnh GHI (updateOne / updateMany / findOneAndUpdate / delete…) KHÔNG bị lọc: đổi slug điểm đến / chủ đề
 *   vẫn áp dụng cho tour trong Thùng rác → khôi phục ra vẫn đúng dữ liệu.
 * - Quét "ảnh đang được dùng" (media-cleanup) đọc thẳng collection → ảnh của mục trong Thùng rác vẫn được giữ
 *   cho tới khi xoá hẳn.
 */

export const SOFT_DELETE_READS = ["find", "findOne", "countDocuments", "distinct"];

const WITH_DELETED = Symbol("withDeleted");

/** Đánh dấu 1 truy vấn / aggregate đọc cả mục trong Thùng rác. Trả lại chính truy vấn đó (nối tiếp được). */
export function includeDeleted(query) {
  query[WITH_DELETED] = true;
  return query;
}

/** Query middleware: thêm `deletedAt: null` trừ khi đã hỏi rõ về deletedAt / includeDeleted */
export function excludeDeletedQuery() {
  if (this[WITH_DELETED]) return;
  const filter = this.getFilter();
  if (Object.hasOwn(filter, "deletedAt")) return;
  this.where({ deletedAt: null });
}

/** Aggregate middleware: chèn $match deletedAt: null lên đầu pipeline */
export function excludeDeletedAggregate() {
  if (this[WITH_DELETED]) return;
  const pipeline = this.pipeline();
  const first = pipeline[0];
  if (first?.$match && Object.hasOwn(first.$match, "deletedAt")) return;
  // $geoNear / $search… bắt buộc đứng đầu → chèn ngay sau
  const at = first && (first.$geoNear || first.$search || first.$vectorSearch) ? 1 : 0;
  pipeline.splice(at, 0, { $match: { deletedAt: null } });
}

/** @param {import("mongoose").Schema} schema */
export function softDeletePlugin(schema) {
  schema.add({ deletedAt: { type: Date, default: null, index: true } });
  schema.pre(SOFT_DELETE_READS, excludeDeletedQuery);
  schema.pre("aggregate", excludeDeletedAggregate);
}

/** Số ngày giữ trong Thùng rác trước khi tự xoá hẳn */
export const TRASH_DAYS = 30;

/** Hậu tố gắn vào slug khi xoá mềm → slug cũ được giải phóng cho tour / bài mới */
export const DELETED_SLUG_RE = /--deleted-\d+$/;
export const deletedSlug = (slug, at = Date.now()) =>
  `${String(slug).replace(DELETED_SLUG_RE, "")}--deleted-${at}`;
export const originalSlug = (slug) => String(slug ?? "").replace(DELETED_SLUG_RE, "");
