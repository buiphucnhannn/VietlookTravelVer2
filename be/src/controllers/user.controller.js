import { auditService } from "../services/audit.service.js";
import { userService } from "../services/user.service.js";
import { created, noContent, ok } from "../utils/response.js";

const target = (id) => ({ type: "user", id: String(id) });

export const userController = {
  async list(req, res) {
    const { items, meta } = await userService.list(req.validated.query);
    ok(res, items, meta);
  },

  async get(req, res) {
    ok(res, await userService.getById(req.validated.params.id));
  },

  async create(req, res) {
    const user = await userService.create(req.validated.body);
    auditService.record(req, "user.create", { target: target(user.id), meta: { role: user.role } });
    created(res, user);
  },

  async update(req, res) {
    const { id } = req.validated.params;
    const user = await userService.update(id, req.validated.body, req.user.id);
    auditService.record(req, "user.update", {
      target: target(id),
      meta: { fields: Object.keys(req.validated.body) },
    });
    ok(res, user);
  },

  async resetPassword(req, res) {
    const { id } = req.validated.params;
    const user = await userService.resetPassword(id, req.validated.body.newPassword);
    auditService.record(req, "user.password_reset", { target: target(id) });
    ok(res, user);
  },

  async unlock(req, res) {
    const { id } = req.validated.params;
    const user = await userService.unlock(id);
    auditService.record(req, "user.unlock", { target: target(id) });
    ok(res, user);
  },

  async remove(req, res) {
    const { id } = req.validated.params;
    await userService.remove(id, req.user.id);
    auditService.record(req, "user.delete", { target: target(id) });
    noContent(res);
  },
};
