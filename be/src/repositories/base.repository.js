import mongoose from "mongoose";

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

  findById(id, { select, lean = true } = {}) {
    return this.model.findById(id).select(select).lean(lean);
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

  count(filter = {}) {
    return this.model.countDocuments(filter);
  }
}
