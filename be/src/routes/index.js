import { Router } from "express";
import { healthController } from "../controllers/health.controller.js";
import { confirmSavedMedia } from "../services/media-cleanup.service.js";
import auditLogRoutes from "./audit-log.routes.js";
import authRoutes from "./auth.routes.js";
import contentRoutes from "./content.routes.js";
import paymentRoutes from "./payment.routes.js";
import { enquiryRoutes, publicRoutes, settingsRoutes } from "./site.routes.js";
import translateRoutes from "./translate.routes.js";
import uploadRoutes from "./upload.routes.js";
import userRoutes from "./user.routes.js";

/**
 * Gom toàn bộ route của API phiên bản 1 — gắn tại /api/v1 trong app.js.
 *   /public/*     website đọc nội dung (không cần đăng nhập)
 *   /enquiries    khách gửi form (POST công khai) + CMS quản lý đơn / yêu cầu
 *   /admin/*      CMS quản lý nội dung (tour, điểm đến, chủ đề, bài viết, xe, visa…)
 *   /settings/*   trang chủ, trang nội dung, email thông báo, 9Pay
 *   /payments/*   thanh toán online 9Pay (bắt đầu, khách quay về, IPN)
 */
const router = Router();

const noStore = (_req, res, next) => {
  res.set("Cache-Control", "no-store"); // dữ liệu đăng nhập / quản trị không bao giờ được cache
  next();
};

router.get("/health", healthController.check);
// Lưu thành công có nhắc tới ảnh / video vừa tải → bỏ dấu "chờ lưu" (xem services/media-cleanup.service.js)
router.use(confirmSavedMedia);
router.use("/public", publicRoutes);
router.use("/auth", noStore, authRoutes);
router.use("/enquiries", noStore, enquiryRoutes);
router.use("/payments", noStore, paymentRoutes);
router.use("/admin", noStore, contentRoutes);
router.use("/settings", noStore, settingsRoutes);
router.use("/users", noStore, userRoutes);
router.use("/uploads", noStore, uploadRoutes);
router.use("/translate", noStore, translateRoutes);
router.use("/audit-logs", noStore, auditLogRoutes);

export default router;
