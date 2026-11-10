import { ApiError } from "../utils/ApiError.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  order: { order: 1, createdAt: 1 },
  rank: { rank: 1, createdAt: -1 },
  price: { price: 1 },
  name: { "name.en": 1 },
};

/**
 * Service CRUD dùng chung cho nội dung quản lý trong CMS (điểm đến, chủ đề, xe, visa, chuyên mục…).
 * Nghiệp vụ riêng của từng loại đưa vào qua các hook:
 *   prepare(data, existing)   chuẩn hoá trước khi lưu (lọc HTML, tính trường suy ra…)
 *   beforeCreate(data)        kiểm tra thêm khi tạo (vd. tối đa 8 chủ đề)
 *   afterUpdate(next, prev)   đồng bộ chỗ khác khi đổi slug…
 *   beforeRemove(doc)         chặn xoá khi đang được dùng
 *   filters(query)            điều kiện lọc riêng của trang danh sách
 */
export function createContentService({
  repo,
  label,
  idField = "slug",
  searchFields = [],
  defaultSort = "order",
  prepare = (d) => d,
  beforeCreate,
  afterUpdate,
  beforeRemove,
  filters,
}) {
  async function getOr404(id) {
    const doc = await repo.findById(id);
    if (!doc) throw ApiError.notFound(`Không tìm thấy ${label}`);
    return doc;
  }

  async function assertUnique(value, exceptId) {
    const other = await repo.findByIdent(value, { select: "_id" });
    if (other && String(other._id) !== String(exceptId))
      throw ApiError.conflict(
        idField === "slug"
          ? `Đường dẫn (slug) "${value}" đã được dùng cho ${label} khác`
          : `Mã "${value}" đã được dùng cho ${label} khác`,
      );
  }

  return {
    label,
    getOr404,

    async list(query = {}) {
      const page = getPagination(query, { defaultLimit: 50, maxLimit: 200 });
      const filter = { ...(filters?.(query) ?? {}) };
      if (query.status) filter.isActive = query.status === "active";
      if (query.q) {
        const rx = new RegExp(escapeRegex(query.q), "i");
        filter.$or = [{ [idField]: rx }, ...searchFields.map((f) => ({ [f]: rx }))];
      }
      const sort = SORTS[query.sort ?? defaultSort] ?? SORTS[defaultSort];
      const { items, total } = await repo.paginate(filter, { ...page, sort });
      return { items, meta: buildPageMeta(page, total) };
    },

    get: getOr404,

    async create(data) {
      await assertUnique(data[idField]);
      await beforeCreate?.(data);
      const doc = await repo.create(await prepare(data, null));
      return doc.toJSON();
    },

    async update(id, data) {
      const prev = await getOr404(id);
      if (data[idField] !== prev[idField]) await assertUnique(data[idField], id);
      const next = await repo.updateById(id, { $set: await prepare(data, prev) });
      await afterUpdate?.(next, prev);
      return next;
    },

    async setVisibility(id, isActive) {
      await getOr404(id);
      return repo.updateById(id, { $set: { isActive } });
    },

    async remove(id) {
      const doc = await getOr404(id);
      await beforeRemove?.(doc);
      await repo.deleteById(id);
      return doc;
    },

    async reorder(items) {
      await repo.reorder(items);
    },
  };
}
