import { Article } from "../models/article.model.js";
import { Destination } from "../models/destination.model.js";
import { Counter, Enquiry } from "../models/enquiry.model.js";
import { Page } from "../models/page.model.js";
import { Car, CarArea, FastTrackPackage, VisaType } from "../models/service.model.js";
import { Setting } from "../models/setting.model.js";
import { Author, Category } from "../models/taxonomy.model.js";
import { Theme } from "../models/theme.model.js";
import { Tour } from "../models/tour.model.js";
import { BaseRepository, trusted } from "./base.repository.js";

/**
 * Repository cho các loại nội dung quản lý trong CMS.
 * Phần chung (tìm theo slug / key, danh sách đang hiển thị) ở ContentRepository;
 * truy vấn riêng của từng loại khai báo ở lớp con.
 */
class ContentRepository extends BaseRepository {
  /** @param {import("mongoose").Model} model @param {string} idField "slug" | "key" */
  constructor(model, idField = "slug") {
    super(model);
    this.idField = idField;
  }

  findByIdent(value, { select } = {}) {
    return this.model
      .findOne({ [this.idField]: value })
      .select(select)
      .lean();
  }

  /** Nhiều bản ghi theo danh sách slug / key */
  findByIdents(values, { select } = {}) {
    if (!values?.length) return Promise.resolve([]);
    return this.model
      .find({ [this.idField]: trusted({ $in: values }) })
      .select(select)
      .lean();
  }

  /** Nội dung đang hiển thị trên website, theo thứ tự */
  listActive({ sort = { order: 1, createdAt: 1 }, select, filter = {} } = {}) {
    return this.model
      .find({ ...filter, isActive: true })
      .sort(sort)
      .select(select)
      .lean();
  }

  /** Ghi đè toàn bộ theo slug / key (dùng cho script chuyển dữ liệu — chạy lại không tạo trùng) */
  upsertByIdent(value, doc) {
    return this.model
      .findOneAndUpdate(
        { [this.idField]: value },
        { $set: doc },
        { upsert: true, returnDocument: "after", runValidators: true },
      )
      .lean();
  }

  /** Cập nhật thứ tự hiển thị hàng loạt: [{ id, order }] */
  async reorder(items) {
    if (!items.length) return;
    await this.model.bulkWrite(
      items.map(({ id, order }) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order } } },
      })),
    );
  }
}

class TourRepository extends ContentRepository {
  constructor() {
    super(Tour);
  }

  findBySlugOrOld(slug) {
    return this.model.findOne({ $or: [{ slug }, { oldSlugs: slug }] }).lean();
  }

  /** Tour đang bán dùng điểm đến / chủ đề này (chặn xoá điểm đến đang được dùng) */
  countUsing(field, value) {
    return this.model.countDocuments({ [field]: value });
  }

  /** Đổi slug điểm đến / chủ đề trong mọi tour (khi CMS đổi slug) */
  renameRef(field, from, to) {
    return this.model.updateMany({ [field]: from }, { $set: { [`${field}.$`]: to } });
  }

  pullRef(field, value) {
    return this.model.updateMany({ [field]: value }, { $pull: { [field]: value } });
  }
}

class ArticleRepository extends ContentRepository {
  constructor() {
    super(Article);
  }

  findBySlugOrOld(slug) {
    return this.model.findOne({ $or: [{ slug }, { oldSlugs: slug }] }).lean();
  }

  countUsing(field, value) {
    return this.model.countDocuments({ [field]: value });
  }

  renameRef(field, from, to) {
    return this.model.updateMany({ [field]: from }, { $set: { [field]: to } });
  }
}

class EnquiryRepository extends BaseRepository {
  constructor() {
    super(Enquiry);
  }

  findByCode(code) {
    return this.model.findOne({ code }).lean();
  }

  /** Số đơn / yêu cầu theo trạng thái, tách đặt tour và form khác */
  async stats() {
    const rows = await this.model.aggregate([
      {
        $group: {
          _id: { booking: { $eq: ["$type", "booking"] }, status: "$status" },
          n: { $sum: 1 },
        },
      },
    ]);
    const out = { bookings: {}, requests: {} };
    for (const r of rows) out[r._id.booking ? "bookings" : "requests"][r._id.status] = r.n;
    return out;
  }

  addNote(id, note) {
    return this.model
      .findByIdAndUpdate(id, { $push: { notes: note } }, { returnDocument: "after" })
      .lean();
  }

  removeNote(id, noteId) {
    return this.model
      .findByIdAndUpdate(id, { $pull: { notes: { _id: noteId } } }, { returnDocument: "after" })
      .lean();
  }

  setEmailStatus(id, emailStatus) {
    return this.model.updateOne({ _id: id }, { $set: { emailStatus } });
  }

  recentSince(date) {
    return this.model.countDocuments({ createdAt: trusted({ $gte: date }) });
  }
}

class CounterRepository extends BaseRepository {
  constructor() {
    super(Counter);
  }

  /** Tăng bộ đếm nguyên tử, trả số mới */
  async next(name) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after" },
      )
      .lean();
    return doc.seq;
  }
}

class SettingRepository extends BaseRepository {
  constructor() {
    super(Setting);
  }

  async get(key) {
    return (await this.model.findOne({ key }).lean())?.value ?? null;
  }

  set(key, value, updatedBy = "") {
    return this.model
      .findOneAndUpdate(
        { key },
        { $set: { value, updatedBy } },
        { upsert: true, returnDocument: "after" },
      )
      .lean();
  }
}

export const tourRepository = new TourRepository();
export const articleRepository = new ArticleRepository();
export const destinationRepository = new ContentRepository(Destination);
export const themeRepository = new ContentRepository(Theme);
export const categoryRepository = new ContentRepository(Category);
export const authorRepository = new ContentRepository(Author);
export const carRepository = new ContentRepository(Car, "key");
export const carAreaRepository = new ContentRepository(CarArea, "key");
export const visaTypeRepository = new ContentRepository(VisaType, "key");
export const fastTrackRepository = new ContentRepository(FastTrackPackage, "key");
export const pageRepository = new ContentRepository(Page, "key");
export const enquiryRepository = new EnquiryRepository();
export const counterRepository = new CounterRepository();
export const settingRepository = new SettingRepository();
