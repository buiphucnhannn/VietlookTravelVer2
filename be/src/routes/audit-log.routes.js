import { Router } from "express";
import { auditLogController } from "../controllers/audit-log.controller.js";
import { requirePermission, requireStaff } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { listAuditLogsQuery } from "../validators/audit-log.validator.js";

/** Nhật ký thao tác — admin, hoặc nhân viên được cấp quyền xem "Nhật ký thao tác" */
const router = Router();
router.use(requireStaff, requirePermission("audit", "view"));

router.get("/", validate({ query: listAuditLogsQuery }), auditLogController.list);

export default router;
