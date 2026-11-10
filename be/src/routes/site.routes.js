import { Router } from "express";
import {
  enquiryController,
  publicController,
  settingsController,
} from "../controllers/site.controller.js";
import { requireAdmin, requireStaff } from "../middlewares/auth.middleware.js";
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
  trackingSettingsSchema,
} from "../validators/content.validator.js";
import { lookupCodeParam, publicEnquirySchema } from "../validators/enquiry.validator.js";
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

/* ---------- /enquiries — khách gửi form; CMS quản lý ---------- */
export const enquiryRoutes = Router();
// Form công khai: giới hạn tần suất → captcha → kiểm tra dữ liệu
enquiryRoutes.post(
  "/",
  publicFormLimiter,
  requireCaptcha,
  validate({ body: publicEnquirySchema }),
  publicController.submitEnquiry,
);
enquiryRoutes.get("/", requireStaff, validate({ query: enquiryListQuery }), enquiryController.list);
enquiryRoutes.get("/stats", requireStaff, enquiryController.stats);
enquiryRoutes.get(
  "/code/:code",
  requireStaff,
  validate({ params: lookupCodeParam }),
  enquiryController.byCode,
);
enquiryRoutes.get("/:id", requireStaff, validate({ params: idParam }), enquiryController.get);
enquiryRoutes.patch(
  "/:id",
  requireStaff,
  validate({ params: idParam, body: enquiryUpdateSchema }),
  enquiryController.update,
);
enquiryRoutes.post(
  "/:id/notes",
  requireStaff,
  validate({ params: idParam, body: noteSchema }),
  enquiryController.addNote,
);
enquiryRoutes.delete(
  "/:id/notes/:noteId",
  requireStaff,
  validate({ params: noteParam }),
  enquiryController.removeNote,
);
enquiryRoutes.post(
  "/:id/resend-email",
  requireStaff,
  validate({ params: idParam }),
  enquiryController.resendEmail,
);
enquiryRoutes.delete("/:id", requireAdmin, validate({ params: idParam }), enquiryController.remove);

/* ---------- /settings — trang chủ, trang nội dung (staff); email, 9Pay (admin) ---------- */
export const settingsRoutes = Router();
settingsRoutes.get("/home", requireStaff, settingsController.getHome);
settingsRoutes.put(
  "/home",
  requireStaff,
  validate({ body: homeSettingsSchema }),
  settingsController.saveHome,
);
settingsRoutes.get("/pages", requireStaff, settingsController.pages);
settingsRoutes.get(
  "/pages/:key",
  requireStaff,
  validate({ params: pageKeyParam }),
  settingsController.page,
);
settingsRoutes.put(
  "/pages/:key",
  requireStaff,
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
settingsRoutes.post("/notifications/test", requireAdmin, settingsController.testEmail);
settingsRoutes.get("/tracking", requireAdmin, settingsController.getTracking);
settingsRoutes.put(
  "/tracking",
  requireAdmin,
  validate({ body: trackingSettingsSchema }),
  settingsController.saveTracking,
);
settingsRoutes.get("/payment", requireAdmin, settingsController.getPayment);
settingsRoutes.put(
  "/payment",
  requireAdmin,
  validate({ body: paymentSettingsSchema }),
  settingsController.savePayment,
);
