import { Router } from "express";
import { auditLogController } from "../controllers/audit-log.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { listAuditLogsQuery } from "../validators/audit-log.validator.js";

/** Nhật ký thao tác — chỉ admin xem */
const router = Router();
router.use(requireAdmin);

router.get("/", validate({ query: listAuditLogsQuery }), auditLogController.list);

export default router;
