import { Router } from "express";
import {
  enquiryController,
  publicController,
  settingsController,
} from "../controllers/site.controller.js";
import { paymentController } from "../controllers/payment.controller.js";
import { requireAdmin, requirePermission, requireStaff } from "../middlewares/auth.middleware.js";
import {
  requireEnquiryAccess,
  requireEnquiryList,
} from "../middlewares/enquiry-access.middleware.js";
import { requireCaptcha } from "../middlewares/captcha.middleware.js";
import { publicFormLimiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam, slug } from "../validators/common.validator.js";
import {
  enquiryListQuery,
  enquiryUpdateSchema,
  homeSettingsSchema,
  noteParam,
  noteSchema,
  notificationSettingsSchema,
  pageKeyParam,
  pageSchema,
  paymentSettingsSchema,
  smallGroupSettingsSchema,
  trackingSettingsSchema,
} from "../validators/content.validator.js";
import { lookupCodeParam, publicEnquirySchema } from "../validators/enquiry.validator.js";
import { formLang, formMessage, localizeFormDetails } from "../utils/form-messages.js";
import { z } from "zod";

const slugParam = validate({ params: z.object({ slug }) });

/* ---------- /public — website đọc (không cần đăng nhập) ---------- */
export const publicRoutes = Router();
publicRoutes.get("/tours", publicController.tours);
publicRoutes.get("/tours/:slug", slugParam, publicController.tour);
publicRoutes.get("/destinations", publicController.destinations);
publicRoutes.get("/themes", publicController.themes);
publicRoutes.get("/articles", publicController.articles);
publicRoutes.get("/articles/:slug", slugParam, publicController.article);
publicRoutes.get("/taxonomy", publicController.taxonomy);
publicRoutes.get("/services", publicController.services);
publicRoutes.get("/pages", publicController.pages);
publicRoutes.get("/home", publicController.home);
publicRoutes.get("/slugs", publicController.slugs);
publicRoutes.get("/site", publicController.site);
publicRoutes.get("/payment-config", paymentController.publicConfig);

/* ---------- /enquiries — khách gửi form; CMS quản lý ---------- */
export const enquiryRoutes = Router();
// Lỗi dữ liệu form công khai → câu dễ hiểu theo ngôn ngữ khách (website hiện thẳng cho khách)
const validateEnquiry = (req, res, next) =>
  validate({ body: publicEnquirySchema })(req, res, (err) => {
    if (!err) return next();
    const lang = formLang(req);
    err.message = formMessage(lang, "invalid");
    err.details = localizeFormDetails(err.details, lang);
    next(err);
  });

// Form công khai: giới hạn tần suất → captcha → kiểm tra dữ liệu
enquiryRoutes.post(
  "/",
  publicFormLimiter,
  requireCaptcha,
  validateEnquiry,
  publicController.submitEnquiry,
);
// CMS: quyền theo nhóm đơn — "Đơn đặt tour" (bookings) / "Yêu cầu từ form" (requests).
// Theo :id → tra loại đơn rồi kiểm tra đúng nhóm (nhóm không được xem → 404, không lộ đơn tồn tại).
// Xem = xem; đổi trạng thái / ghi chú / gửi lại email = sửa; xoá đơn = toàn quyền.
enquiryRoutes.get(
  "/",
  requireStaff,
  validate({ query: enquiryListQuery }),
  requireEnquiryList,
  enquiryController.list,
);
enquiryRoutes.get("/stats", requireStaff, requireEnquiryList, enquiryController.stats);
enquiryRoutes.get(
  "/code/:code",
  requireStaff,
  requireEnquiryList,
  validate({ params: lookupCodeParam }),
  enquiryController.byCode,
);
enquiryRoutes.get(
  "/:id",
  requireStaff,
  validate({ params: idParam }),
  requireEnquiryAccess("view"),
  enquiryController.get,
);
enquiryRoutes.patch(
  "/:id",
  requireStaff,
  validate({ params: idParam, body: enquiryUpdateSchema }),
  requireEnquiryAccess("edit"),
  enquiryController.update,
);
enquiryRoutes.post(
  "/:id/notes",
  requireStaff,
  validate({ params: idParam, body: noteSchema }),
  requireEnquiryAccess("edit"),
  enquiryController.addNote,
);
enquiryRoutes.delete(
  "/:id/notes/:noteId",
  requireStaff,
  validate({ params: noteParam }),
  requireEnquiryAccess("edit"),
  enquiryController.removeNote,
);
enquiryRoutes.post(
  "/:id/resend-email",
  requireStaff,
  validate({ params: idParam }),
  requireEnquiryAccess("edit"),
  enquiryController.resendEmail,
);
enquiryRoutes.delete(
  "/:id",
  requireStaff,
  validate({ params: idParam }),
  requireEnquiryAccess("full"),
  enquiryController.remove,
);

/* ---------- /settings — trang chủ, trang nội dung (theo quyền); email, 9Pay, mã đo lường (chỉ admin) ---------- */
export const settingsRoutes = Router();
const home = (level) => [requireStaff, requirePermission("home", level)];
const pages = (level) => [requireStaff, requirePermission("pages", level)];
settingsRoutes.get("/home", home("view"), settingsController.getHome);
settingsRoutes.put(
  "/home",
  home("edit"),
  validate({ body: homeSettingsSchema }),
  settingsController.saveHome,
);
settingsRoutes.get("/pages", pages("view"), settingsController.pages);
settingsRoutes.get(
  "/pages/:key",
  pages("view"),
  validate({ params: pageKeyParam }),
  settingsController.page,
);
settingsRoutes.put(
  "/pages/:key",
  pages("edit"),
  validate({ params: pageKeyParam, body: pageSchema }),
  settingsController.savePage,
);
settingsRoutes.get("/notifications", requireAdmin, settingsController.getNotifications);
settingsRoutes.put(
  "/notifications",
  requireAdmin,
  validate({ body: notificationSettingsSchema }),
  settingsController.saveNotifications,
);
settingsRoutes.get("/tracking", requireAdmin, settingsController.getTracking);
settingsRoutes.put(
  "/tracking",
  requireAdmin,
  validate({ body: trackingSettingsSchema }),
  settingsController.saveTracking,
);
// Phụ thu nhóm nhỏ: nhân viên được xem (ô "Giá tạm tính thử" khi sửa tour), chỉ admin được sửa
settingsRoutes.get("/small-group", requireStaff, settingsController.getSmallGroup);
settingsRoutes.put(
  "/small-group",
  requireAdmin,
  validate({ body: smallGroupSettingsSchema }),
  settingsController.saveSmallGroup,
);
settingsRoutes.get("/payment", requireAdmin, settingsController.getPayment);
settingsRoutes.put(
  "/payment",
  requireAdmin,
  validate({ body: paymentSettingsSchema }),
  settingsController.savePayment,
);
