import mongoose from "mongoose";
import { includeDeleted } from "../models/soft-delete.plugin.js";

/**
 * Repository = lớp DUY NHẤT nói chuyện với MongoDB (Mongoose).
 *   controller → service (nghiệp vụ) → repository (truy vấn) → model
 * Service chỉ gọi repository → đổi DB / thêm cache sau này không phải sửa logic nghiệp vụ.
 * Repository cụ thể kế thừa lớp này và thêm truy vấn riêng.
 *
 * Lưu ý bảo mật: mongoose.set("sanitizeFilter", true) (config/database.js) bọc mọi toán tử $... trong
 * filter thành $eq để chống NoSQL injection. Truy vấn NỘI BỘ cần toán tử phải bọc TỪNG giá trị toán tử:
 *   { expiresAt: trusted({ $gt: new Date() }) }    ← đúng
 *   trusted({ expiresAt: { $gt: new Date() } })    ← SAI (toán tử lồng bên trong vẫn bị bọc $eq)
 * Chỉ dùng với giá trị do code tạo ra, KHÔNG BAO GIỜ với dữ liệu người dùng gửi lên.
 * ($and / $or / $nor ở cấp ngoài cùng được phép sẵn, không cần trusted.)
 */
export const trusted = (operators) => mongoose.trusted(operators);

export class BaseRepository {
  /** @param {import("mongoose").Model} model */
  constructor(model) {
    this.model = model;
  }

  create(data) {
    return this.model.create(data);
  }

  /** withDeleted: đọc cả mục trong Thùng rác (model có softDeletePlugin) */
  findById(id, { select, lean = true, withDeleted = false } = {}) {
    const q = this.model.findById(id);
    return (withDeleted ? includeDeleted(q) : q).select(select).lean(lean);
  }

  findOne(filter, { select, lean = true } = {}) {
    return this.model.findOne(filter).select(select).lean(lean);
  }

  find(filter = {}, { sort, select, limit } = {}) {
    return this.model.find(filter).sort(sort).select(select).limit(limit).lean();
  }

  /** Danh sách có phân trang: trả { items, total } */
  async paginate(
    filter = {},
    { skip = 0, limit = 20, sort = { createdAt: -1 }, select, collation } = {},
  ) {
    const query = this.model.find(filter).sort(sort).skip(skip).limit(limit).select(select);
    if (collation) query.collation(collation); // vd. { locale: "vi" } để sắp A → Z đúng tiếng Việt
    const [items, total] = await Promise.all([query.lean(), this.model.countDocuments(filter)]);
    return { items, total };
  }

  updateById(id, update, { select } = {}) {
    return this.model
      .findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true })
      .select(select)
      .lean();
  }

  deleteById(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  exists(filter) {
    return this.model.exists(filter);
  }

  /* ----- Thùng rác (chỉ model có softDeletePlugin: tour, bài viết, đơn / yêu cầu) ----- */

  /** 1 mục đang nằm trong Thùng rác */
  findDeletedById(id, { select } = {}) {
    return this.model
      .findOne({ _id: id, deletedAt: trusted({ $ne: null }) })
      .select(select)
      .lean();
  }

  /** Chuyển vào Thùng rác (chỉ khi chưa xoá) — `set` = trường đổi kèm (vd. slug đã gắn hậu tố) */
  softDeleteById(id, set = {}) {
    return this.model
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { ...set, deletedAt: new Date() } },
        { returnDocument: "after" },
      )
      .lean();
  }

  /** Lấy lại từ Thùng rác */
  restoreById(id, set = {}) {
    return this.model
      .findOneAndUpdate(
        { _id: id, deletedAt: trusted({ $ne: null }) },
        { $set: { ...set, deletedAt: null } },
        { returnDocument: "after" },
      )
      .lean();
  }

  /** Các mục đã nằm trong Thùng rác từ trước `date` (để xoá hẳn) */
  findDeletedBefore(date, { select } = {}) {
    return this.model
      .find({ deletedAt: trusted({ $lt: date }) })
      .select(select)
      .lean();
  }

  /**
   * Xoá hẳn nhiều mục — CHỈ những mục đang trong Thùng rác (không bao giờ đụng mục đang dùng / vừa khôi phục).
   * `before`: chỉ mục đã vào Thùng rác trước thời điểm này (tự xoá sau 30 ngày).
   */
  purgeByIds(ids, { before } = {}) {
    if (!ids.length) return Promise.resolve({ deletedCount: 0 });
    return this.model.deleteMany({
      _id: trusted({ $in: ids }),
      deletedAt: trusted(before ? { $lt: before } : { $ne: null }),
    });
  }

  count(filter = {}) {
    return this.model.countDocuments(filter);
  }
}
