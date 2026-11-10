import { Article } from "../models/article.model.js";
import { AuditLog } from "../models/audit-log.model.js";
import { Destination } from "../models/destination.model.js";
import { Enquiry } from "../models/enquiry.model.js";
import { Page } from "../models/page.model.js";
import { Car, CarArea, FastTrackPackage, VisaType } from "../models/service.model.js";
import { Author, Category } from "../models/taxonomy.model.js";
import { Theme } from "../models/theme.model.js";
import { Tour } from "../models/tour.model.js";
import { User } from "../models/user.model.js";
import { BaseRepository, trusted } from "./base.repository.js";

/** Chữ theo ngôn ngữ { vi, en, zh } (hoặc chuỗi) → ưu tiên tiếng Việt, rồi tiếng Anh */
export const localText = (v) =>
  String((typeof v === "string" ? v : v?.vi || v?.en || v?.zh) ?? "").trim();

/** Tên dễ đọc của 1 nội dung (tour: tiêu đề; bài viết / trang: tiêu đề; còn lại: tên) — không dùng đường dẫn */
export const contentName = (doc) =>
  localText(doc?.title) ||
  localText(doc?.name) ||
  localText({
    vi: doc?.content?.vi?.title,
    en: doc?.content?.en?.title,
    zh: doc?.content?.zh?.title,
  }) ||
  "";

const isObjectId = (s) => /^[0-9a-f]{24}$/i.test(s);
const named = (model, select = "name") => ({ model, select, name: contentName });

/**
 * Loại đối tượng trong nhật ký → cách tra tên hiện tại (chỉ lấy đúng trường tên).
 * `by`: trường dùng làm mã ("_id" mặc định; trang dùng "key"; đơn dùng mã đơn hoặc _id).
 */
const TARGETS = {
  tour: {
    model: Tour,
    select: "content.vi.title content.en.title content.zh.title code",
    name: (d) => contentName(d) || d.code || "",
  },
  article: named(Article, "title"),
  destination: named(Destination),
  theme: named(Theme),
  category: named(Category),
  author: named(Author),
  car: named(Car),
  car_area: named(CarArea),
  visa_type: named(VisaType),
  fast_track: named(FastTrackPackage),
  page: { model: Page, by: "key", select: "key title", name: (d) => localText(d.title) },
  user: { model: User, select: "username", name: (d) => d.username ?? "" },
  enquiry: {
    model: Enquiry,
    by: "code",
    select: "code name type",
    name: (d) => d.code,
    extra: (d) => ({
      customer: d.name ?? "",
      kind: d.type === "booking" ? "bookings" : "requests",
    }),
  },
};

export const AUDIT_TARGET_TYPES = Object.keys(TARGETS);

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  /**
   * Tra tên hiện tại của các đối tượng trong nhật ký — mỗi loại 1 truy vấn, chỉ lấy trường tên.
   * @param {{ type: string, id: string }[]} refs
   * @returns {Promise<Map<string, { name: string, customer?: string, kind?: string }>>} khoá "loại:mã";
   *   đối tượng không còn (đã xoá) thì không có trong Map
   */
  async lookupTargets(refs) {
    const byType = new Map();
    for (const { type, id } of refs) {
      if (!TARGETS[type] || !id) continue;
      if (!byType.has(type)) byType.set(type, new Set());
      byType.get(type).add(String(id));
    }
    const found = new Map();
    await Promise.all(
      [...byType].map(async ([type, set]) => {
        const t = TARGETS[type];
        const ids = [...set];
        const objIds = ids.filter(isObjectId);
        const or = [];
        if (t.by) or.push({ [t.by]: trusted({ $in: ids }) });
        if (objIds.length && type !== "page") or.push({ _id: trusted({ $in: objIds }) });
        if (!or.length) return;
        const docs = await t.model.find({ $or: or }).select(t.select).lean();
        for (const d of docs) {
          const info = { name: t.name(d), ...t.extra?.(d) };
          found.set(`${type}:${String(d._id)}`, info);
          if (t.by && d[t.by]) found.set(`${type}:${d[t.by]}`, info);
        }
      }),
    );
    return found;
  }
}

export const auditLogRepository = new AuditLogRepository();
