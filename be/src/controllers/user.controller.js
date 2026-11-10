import { LEVEL_LABELS, MODULE_LABELS } from "../constants/permissions.js";
import { auditService } from "../services/audit.service.js";
import { userService } from "../services/user.service.js";
import { created, noContent, ok } from "../utils/response.js";

const target = (id) => ({ type: "user", id: String(id) });
/** ["Tour: Chỉ xem", …] — các mục được cấp (bỏ "Không truy cập") */
const grantedSummary = (perms = {}) =>
  Object.entries(perms)
    .filter(([, l]) => l !== "none")
    .map(([m, l]) => `${MODULE_LABELS[m]}: ${LEVEL_LABELS[l]}`);

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
    auditService.record(req, "user.create", {
      target: target(user.id),
      meta: {
        name: user.username,
        role: user.role,
        ...(user.role !== "admin" && { changes: grantedSummary(user.permissions) }),
      },
    });
    created(res, user);
  },

  async update(req, res) {
    const { id } = req.validated.params;
    const { user, permissionChanges } = await userService.update(
      id,
      req.validated.body,
      req.user.id,
    );
    const fields = Object.keys(req.validated.body).filter((k) => k !== "permissions");
    if (fields.length)
      auditService.record(req, "user.update", {
        target: target(id),
        meta: { name: user.username, fields },
      });
    if (permissionChanges.length)
      auditService.record(req, "user.permissions", {
        target: target(id),
        meta: { name: user.username, changes: permissionChanges },
      });
    ok(res, user);
  },

  async resetPassword(req, res) {
    const { id } = req.validated.params;
    const user = await userService.resetPassword(id, req.validated.body.newPassword);
    auditService.record(req, "user.password_reset", {
      target: target(id),
      meta: { name: user.username },
    });
    ok(res, user);
  },

  async unlock(req, res) {
    const { id } = req.validated.params;
    const user = await userService.unlock(id);
    auditService.record(req, "user.unlock", { target: target(id), meta: { name: user.username } });
    ok(res, user);
  },

  async remove(req, res) {
    const { id } = req.validated.params;
    // lấy tên tài khoản trước khi xoá → nhật ký vẫn ghi rõ đã xoá ai
    const { username } = await userService.getById(id);
    await userService.remove(id, req.user.id);
    auditService.record(req, "user.delete", { target: target(id), meta: { name: username } });
    noContent(res);
  },
};
