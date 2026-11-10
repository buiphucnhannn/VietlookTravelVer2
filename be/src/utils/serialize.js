/**
 * Kết quả .lean() (object thường) → JSON gửi ra API: `_id` → `id`, bỏ `__v`.
 * Áp dụng cho bản ghi cấp ngoài cùng; mảng con giữ `_id` (vd. ghi chú cần id để xoá).
 */
export function serialize(doc) {
  if (!doc || typeof doc !== "object") return doc;
  if (Array.isArray(doc)) return doc.map(serialize);
  if (doc.toJSON && typeof doc.toJSON === "function" && doc.$__) return doc.toJSON();
  const { _id, __v, ...rest } = doc; // eslint-disable-line no-unused-vars
  return _id !== undefined ? { id: String(_id), ...rest } : rest;
}
