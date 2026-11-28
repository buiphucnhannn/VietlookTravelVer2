import { Router } from "express";
import { enquiryController } from "../controllers/site.controller.js";
import { requireStaff } from "../middlewares/auth.middleware.js";
import { requireEnquiryAccess } from "../middlewares/enquiry-access.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam } from "../validators/common.validator.js";

/**
 * Thùng rác của đơn / yêu cầu — gắn tại /enquiries TRƯỚC enquiryRoutes (site.routes.js).
 *   POST /:id/restore   khôi phục đơn từ Thùng rác        toàn quyền ở đúng nhóm đơn
 * (Chuyển vào Thùng rác = DELETE /:id, xoá hẳn = DELETE /:id?hard=1 — route xoá sẵn có ở site.routes.js.)
 */
const router = Router();
router.post(
  "/:id/restore",
  requireStaff,
  validate({ params: idParam }),
  requireEnquiryAccess("full"),
  enquiryController.restore,
);

export default router;
