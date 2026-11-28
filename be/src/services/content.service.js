import { deletedSlug, originalSlug } from "../models/soft-delete.plugin.js";
import { trusted } from "../repositories/base.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { afterSave as cleanupMedia } from "./media-cleanup.service.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { searchRegex } from "../utils/search.js";

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  order: { order: 1, createdAt: 1 },
  rank: { rank: 1, createdAt: -1 },
  price: { price: 1 },
  // CMS hiển thị tên tiếng Việt trước → sắp theo tên tiếng Việt, rồi tiếng Anh
  name: { "name.vi": 1, "name.en": 1 },
};

/**
 * Service CRUD dùng chung cho nội dung quản lý trong CMS (điểm đến, chủ đề, xe, visa, chuyên mục…).
 * Nghiệp vụ riêng của từng loại đưa vào qua các hook:
 *   prepare(data, existing)   chuẩn hoá trước khi lưu (lọc HTML, tính trường suy ra…)
 *   beforeCreate(data)        kiểm tra thêm khi tạo (vd. tối đa 8 chủ đề)
 *   afterUpdate(next, prev)   đồng bộ chỗ khác khi đổi slug…
 *   beforeRemove(doc)         chặn xoá khi đang được dùng
 *   filters(query)            điều kiện lọc riêng của trang danh sách
 * idField "_id": loại không có đường dẫn / mã riêng (vd. đánh giá khách) → không kiểm tra trùng, không tìm theo mã.
 * Tuỳ chọn: sorts (ghi đè cách sắp xếp mặc định, vd. bài viết "Mới nhất" theo ngày đăng), listSelect (chỉ lấy các trường cần cho trang danh sách — nhẹ hơn),
 *   trackOldSlugs (loại có slug cũ để chuyển hướng 301: tour, bài viết),
 *   softDelete (xoá = chuyển vào Thùng rác, giữ 30 ngày, khôi phục được — model phải có softDeletePlugin).
 */
export function createContentService({
  repo,
  label,
  idField = "slug",
  searchFields = [],
  defaultSort = "order",
  sorts = {},
  listSelect,
  trackOldSlugs = false,
  softDelete = false,
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

  const hasIdent = idField !== "_id";

  async function assertUnique(value, exceptId) {
    if (!hasIdent) return;
    const other = await repo.findByIdent(value, { select: "_id" });
    if (other && String(other._id) !== String(exceptId))
      throw ApiError.conflict(
        idField === "slug"
          ? `Đường dẫn "${value}" đã được dùng cho ${label} khác — hãy đổi đường dẫn`
          : `Mã "${value}" đã được dùng cho ${label} khác — hãy đổi mã`,
      );
  }

  /** Slug mới có thể đang nằm trong danh sách slug cũ của mục khác (tour / bài viết) → gỡ ra */
  const releaseOldSlug = (doc) =>
    trackOldSlugs && doc?.slug ? repo.releaseOldSlug(doc.slug, doc._id) : null;

  return {
    label,
    softDelete,
    getOr404,

    async list(query = {}) {
      const page = getPagination(query, { defaultLimit: 50, maxLimit: 200 });
      const filter = { ...(filters?.(query) ?? {}) };
      // Thùng rác: chỉ mục đã xoá, mới xoá trước (mặc định mọi truy vấn đọc đã bỏ mục đã xoá)
      const trash = softDelete && query.trash === "1";
      if (trash) filter.deletedAt = trusted({ $ne: null });
      if (query.status) filter.isActive = query.status === "active";
      // không phân biệt dấu / hoa thường / khoảng trắng: "ha noi" = "hà nội" = "hanoi"
      const rx = searchRegex(query.q);
      if (rx)
        filter.$or = [
          ...(hasIdent ? [{ [idField]: rx }] : []),
          ...searchFields.map((f) => ({ [f]: rx })),
        ];
      const sortKey = query.sort ?? defaultSort;
      const sort = trash
        ? { deletedAt: -1, _id: -1 }
        : (sorts[sortKey] ?? SORTS[sortKey] ?? SORTS[defaultSort]);
      const select =
        trash && listSelect
          ? typeof listSelect === "string"
            ? `${listSelect} deletedAt`
            : { ...listSelect, deletedAt: 1 }
          : listSelect;
      const { items, total } = await repo.paginate(filter, {
        ...page,
        sort,
        select,
        ...(!trash && sortKey === "name" && { collation: { locale: "vi" } }), // A → Z đúng thứ tự tiếng Việt
      });
      return { items, meta: buildPageMeta(page, total) };
    },

    get: getOr404,

    async create(data) {
      await assertUnique(data[idField]);
      await beforeCreate?.(data);
      const doc = await repo.create(await prepare(data, null));
      await releaseOldSlug(doc);
      return doc.toJSON();
    },

    async update(id, data) {
      const prev = await getOr404(id);
      if (hasIdent && data[idField] !== prev[idField]) await assertUnique(data[idField], id);
      const next = await repo.updateById(id, { $set: await prepare(data, prev) });
      if (next.slug !== prev.slug) await releaseOldSlug(next);
      await afterUpdate?.(next, prev);
      cleanupMedia(prev, next); // ảnh bị thay / bỏ → dọn nền nếu không còn chỗ nào dùng
      return next;
    },

    async setVisibility(id, isActive) {
      await getOr404(id);
      return repo.updateById(id, { $set: { isActive } });
    },

    /**
     * Xoá. softDelete → chuyển vào Thùng rác: slug gắn hậu tố "--deleted-<thời điểm>" để đường dẫn được
     * dùng lại ngay cho mục mới; ảnh GIỮ NGUYÊN (chỉ dọn khi xoá hẳn). Trả bản ghi lúc trước khi xoá (để ghi nhật ký).
     */
    async remove(id) {
      const doc = await getOr404(id);
      await beforeRemove?.(doc);
      if (!softDelete) {
        await repo.deleteById(id);
        cleanupMedia(doc, null);
        return doc;
      }
      const renamed = idField === "slug" && doc.slug ? { slug: deletedSlug(doc.slug) } : {};
      if (!(await repo.softDeleteById(id, renamed)))
        throw ApiError.notFound(`Không tìm thấy ${label}`);
      return doc;
    },

    /**
     * Khôi phục từ Thùng rác. Đường dẫn cũ còn trống → lấy lại đúng đường dẫn cũ; đã có mục khác dùng
     * → thêm "-2", "-3"… Trả bản ghi + slugChanged / originalSlug để CMS báo cho người dùng.
     */
    async restore(id) {
      const doc = await repo.findDeletedById(id);
      if (!doc) throw ApiError.notFound(`Không tìm thấy ${label} trong Thùng rác`);
      const set = {};
      const wanted = originalSlug(doc.slug);
      if (idField === "slug" && doc.slug) {
        let slug = wanted;
        for (let n = 2; await repo.findByIdent(slug, { select: "_id" }); n++) {
          if (n > 50)
            throw ApiError.conflict(
              `Đường dẫn "${wanted}" đang được dùng — hãy đổi đường dẫn của ${label} kia trước`,
            );
          slug = `${wanted}-${n}`.slice(0, 120);
        }
        set.slug = slug;
      }
      const next = await repo.restoreById(id, set);
      if (!next) throw ApiError.notFound(`Không tìm thấy ${label} trong Thùng rác`);
      await releaseOldSlug(next);
      return set.slug && set.slug !== wanted
        ? { ...next, slugChanged: true, originalSlug: wanted }
        : next;
    },

    /** Xoá hẳn 1 mục ĐANG TRONG Thùng rác (không khôi phục được nữa) → dọn ảnh nền */
    async purge(id) {
      const doc = await repo.findDeletedById(id);
      if (!doc) {
        if (await repo.exists({ _id: id }))
          throw ApiError.conflict(`Hãy xoá ${label} vào Thùng rác trước khi xoá hẳn`);
        throw ApiError.notFound(`Không tìm thấy ${label} trong Thùng rác`);
      }
      await repo.purgeByIds([doc._id]);
      cleanupMedia(doc, null);
      return { ...doc, slug: originalSlug(doc.slug) };
    },

    async reorder(items) {
      await repo.reorder(items);
    },
  };
}
