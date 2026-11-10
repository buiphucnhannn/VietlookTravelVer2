import { auditService } from "../services/audit.service.js";
import { created, noContent, ok } from "../utils/response.js";

/**
 * Controller CRUD dùng chung — chỉ: lấy dữ liệu đã validate → gọi service → trả phản hồi + ghi nhật ký.
 * @param {ReturnType<import("../services/content.service.js").createContentService>} service
 * @param {string} type tên loại cho nhật ký: "tour", "destination"…
 */
export function createContentController(service, type) {
  const target = (doc) => ({ type, id: String(doc?._id ?? doc?.id ?? "") });
  const ident = (doc) => doc?.slug ?? doc?.key ?? "";

  return {
    async list(req, res) {
      const { items, meta } = await service.list(req.validated.query);
      ok(res, items, meta);
    },

    async get(req, res) {
      ok(res, await service.get(req.validated.params.id));
    },

    async create(req, res) {
      const doc = await service.create(req.validated.body);
      auditService.record(req, `${type}.create`, {
        target: target(doc),
        meta: { slug: ident(doc) },
      });
      created(res, doc);
    },

    async update(req, res) {
      const doc = await service.update(req.validated.params.id, req.validated.body);
      auditService.record(req, `${type}.update`, {
        target: target(doc),
        meta: { slug: ident(doc) },
      });
      ok(res, doc);
    },

    async visibility(req, res) {
      const doc = await service.setVisibility(req.validated.params.id, req.validated.body.isActive);
      auditService.record(req, `${type}.${doc.isActive ? "show" : "hide"}`, {
        target: target(doc),
        meta: { slug: ident(doc) },
      });
      ok(res, doc);
    },

    async remove(req, res) {
      const doc = await service.remove(req.validated.params.id);
      auditService.record(req, `${type}.delete`, {
        target: target(doc),
        meta: { slug: ident(doc) },
      });
      noContent(res);
    },

    async reorder(req, res) {
      await service.reorder(req.validated.body.items);
      auditService.record(req, `${type}.reorder`, {
        meta: { count: req.validated.body.items.length },
      });
      noContent(res);
    },
  };
}
