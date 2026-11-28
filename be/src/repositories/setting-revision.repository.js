import { SettingRevision } from "../models/setting-revision.model.js";
import { BaseRepository, trusted } from "./base.repository.js";

/** Lịch sử phiên bản nội dung trang (models/setting-revision.model.js) */
class SettingRevisionRepository extends BaseRepository {
  constructor() {
    super(SettingRevision);
  }

  async add(doc) {
    return (await this.model.create(doc)).toObject();
  }

  /** Danh sách phiên bản của 1 trang, mới nhất trước — KHÔNG kèm nội dung (nhẹ) */
  list(key, limit = 50) {
    return this.model
      .find({ key })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .select("-data")
      .lean();
  }

  /** 1 phiên bản (kèm nội dung) — đúng trang (không lấy nhầm bản của trang khác qua id) */
  get(key, id) {
    return this.model.findOne({ _id: id, key }).lean();
  }

  /** Chỉ giữ `keep` bản mới nhất của trang, xoá phần cũ hơn */
  async prune(key, keep) {
    const old = await this.model
      .find({ key })
      .sort({ createdAt: -1, _id: -1 })
      .skip(keep)
      .select("_id")
      .lean();
    if (!old.length) return 0;
    const r = await this.model.deleteMany({ _id: trusted({ $in: old.map((d) => d._id) }) });
    return r.deletedCount ?? old.length;
  }

  /** Mọi phiên bản (kèm nội dung) của 1 trang — dùng khi cần biết bản cũ còn dùng video nào */
  all(key) {
    return this.model.find({ key }).select("data").lean();
  }
}

export const settingRevisionRepository = new SettingRevisionRepository();
