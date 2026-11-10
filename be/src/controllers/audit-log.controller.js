import { auditService } from "../services/audit.service.js";
import { ok } from "../utils/response.js";

export const auditLogController = {
  async list(req, res) {
    const { items, meta } = await auditService.list(req.validated.query);
    ok(res, items, meta);
  },
};
