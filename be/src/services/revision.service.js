import { logger } from "../config/logger.js";
import { settingRevisionRepository } from "../repositories/setting-revision.repository.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Lịch sử phiên bản + chống ghi đè cho nội dung trang (Trang chủ, Giao diện trang, Giới thiệu / chính sách).
 *
 *   assertFresh(stored, base)   trình sửa gửi kèm `baseUpdatedAt` (lúc bản nó đang sửa được lưu); bản trên máy
 *                               chủ mới hơn → 409 CONTENT_CONFLICT (có người khác vừa lưu) — CMS hỏi ghi đè / tải lại
 *   snapshot(key, prev, next…)  trước khi ghi bản mới: cất bản cũ (bỏ qua khi chưa có bản cũ / nội dung không đổi),
 *                               rồi chỉ giữ MAX_REVISIONS bản mới nhất
 */

export const MAX_REVISIONS = 20;

const time = (v) => (v ? new Date(v).getTime() : NaN);

/** Tên dễ đọc của người thao tác (tên hiển thị → tên đăng nhập) */
export const actorName = (actor) => actor?.name || actor?.username || "";

/**
 * @param {{ updatedAt?: Date|string|null, updatedBy?: string }|null} stored bản đang lưu trên máy chủ
 * @param {string|undefined} base `updatedAt` của bản trình sửa đã tải (không gửi = không kiểm tra)
 */
export function assertFresh(stored, base) {
  if (!base || !stored?.updatedAt) return;
  const b = time(base);
  if (!Number.isFinite(b)) return;
  if (time(stored.updatedAt) > b)
    throw new ApiError(409, "Nội dung này vừa được người khác lưu", {
      code: "CONTENT_CONFLICT",
      details: {
        updatedAt: new Date(stored.updatedAt).toISOString(),
        by: stored.updatedBy ?? "",
      },
    });
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export const revisionService = {
  /**
   * Cất bản cũ trước khi lưu bản mới. Lỗi khi cất chỉ ghi cảnh báo — không chặn việc lưu.
   * @param {string} key
   * @param {{ data: unknown, savedAt?: Date|string|null, savedBy?: string }|null} prev bản cũ (null = chưa từng lưu)
   * @param {unknown} next nội dung sắp lưu (giống hệt bản cũ → không cất)
   * @param {{ actor?: { id?: string, name?: string, username?: string }, reason?: "save" | "restore" }} [opts]
   */
  async snapshot(key, prev, next, { actor, reason = "save" } = {}) {
    if (!prev || prev.data == null || same(prev.data, next)) return null;
    try {
      const rev = await settingRevisionRepository.add({
        key,
        data: prev.data,
        savedAt: prev.savedAt ?? null,
        savedBy: prev.savedBy ?? "",
        by: { id: actor?.id ?? null, name: actorName(actor) },
        reason,
      });
      await settingRevisionRepository.prune(key, MAX_REVISIONS);
      return rev;
    } catch (err) {
      logger.warn({ err, key }, "[revision] không cất được phiên bản cũ");
      return null;
    }
  },

  /** Danh sách (không kèm nội dung), mới nhất trước */
  async list(key) {
    const items = await settingRevisionRepository.list(key, MAX_REVISIONS);
    return items.map(view);
  },

  async get(key, id) {
    const rev = await settingRevisionRepository.get(key, id);
    if (!rev) throw ApiError.notFound("Không tìm thấy phiên bản này — có thể đã quá cũ và bị xoá");
    return { ...view(rev), data: rev.data ?? {} };
  },

  /** Mọi video nền còn nằm trong lịch sử trang chủ (không xoá khỏi kho khi lưu → khôi phục vẫn chạy) */
  async homeVideos() {
    try {
      const all = await settingRevisionRepository.all("home");
      return all.flatMap((r) =>
        (r.data?.banner?.slides ?? []).flatMap((s) => [s?.video, s?.videoMobile]),
      );
    } catch {
      return [];
    }
  },
};

const view = (r) => ({
  id: String(r._id),
  key: r.key,
  savedAt: r.savedAt ?? null,
  savedBy: r.savedBy ?? "",
  by: { id: r.by?.id ? String(r.by.id) : null, name: r.by?.name ?? "" },
  reason: r.reason ?? "save",
  createdAt: r.createdAt ?? null,
});
