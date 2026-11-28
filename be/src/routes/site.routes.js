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
import { limiter, publicFormLimiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam, objectId, slug } from "../validators/common.validator.js";
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
import { contactSettingsSchema } from "../validators/contact.validator.js";
import { PAGE_COPY_VALIDATORS } from "../validators/page-copy.validator.js";
import { PAGE_COPY_KEYS } from "../constants/page-copy.js";
import { PAGE_KEYS } from "../constants/content.js";
import { ApiError } from "../utils/ApiError.js";
import { formLang, formMessage, localizeFormDetails } from "../utils/form-messages.js";
import { z } from "zod";

const slugParam = validate({ params: z.object({ slug }) });

/** Giao diện trang: chỉ các trang đã khai báo (constants/page-copy.js) — khoá lạ → 404 (website dùng mặc định) */
const requirePageCopyKey = (req, _res, next) =>
  PAGE_COPY_KEYS.includes(req.params.key)
    ? next()
    : next(ApiError.notFound("Không tìm thấy trang"));
/** Kiểm tra dữ liệu theo đúng khai báo ô của trang đó */
const validatePageCopy = (req, res, next) =>
  validate({ body: PAGE_COPY_VALIDATORS[req.params.key] })(req, res, next);

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
publicRoutes.get("/page-copy/:key", requirePageCopyKey, publicController.pageCopy);
publicRoutes.get("/reviews", publicController.reviews);
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

/* ---------- /settings — trang chủ, giao diện trang, điểm đánh giá (theo quyền); liên hệ, email, 9Pay, mã đo lường (chỉ admin) ---------- */
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
// Giao diện các trang công khai (Thuê xe, Visa…) — cùng quyền "Giao diện trang" (pages)
settingsRoutes.get("/page-copy", pages("view"), settingsController.pageCopies);
settingsRoutes.get(
  "/page-copy/:key",
  pages("view"),
  requirePageCopyKey,
  settingsController.pageCopy,
);
settingsRoutes.put(
  "/page-copy/:key",
  pages("edit"),
  requirePageCopyKey,
  validatePageCopy,
  settingsController.savePageCopy,
);
// Lịch sử phiên bản: Trang chủ (quyền "home") · Giới thiệu / chính sách / Giao diện trang (quyền "pages").
// Xem danh sách / 1 bản = xem; "Dùng lại bản này" = sửa. Khoá lạ → 404.
const revisionAccess = (level) => (req, res, next) => {
  const { key } = req.params;
  const module =
    key === "home"
      ? "home"
      : PAGE_KEYS.includes(key) || PAGE_COPY_KEYS.includes(key)
        ? "pages"
        : null;
  if (!module) return next(ApiError.notFound("Không tìm thấy trang"));
  return requirePermission(module, level)(req, res, next);
};
const revisionId = validate({ params: z.object({ key: z.string().max(60), id: objectId }) });
settingsRoutes.get(
  "/revisions/:key",
  requireStaff,
  revisionAccess("view"),
  settingsController.revisions,
);
settingsRoutes.get(
  "/revisions/:key/:id",
  requireStaff,
  revisionAccess("view"),
  revisionId,
  settingsController.revision,
);
settingsRoutes.post(
  "/revisions/:key/:id/restore",
  requireStaff,
  revisionAccess("edit"),
  revisionId,
  settingsController.restoreRevision,
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
// Thông tin liên hệ công ty (điện thoại, email, địa chỉ, mạng xã hội…): theo quyền "Thông tin liên hệ" (contact) —
// xem = xem, lưu = sửa; admin luôn được. Website đọc qua GET /public/site, không qua đây.
settingsRoutes.get(
  "/contact",
  requireStaff,
  requirePermission("contact", "view"),
  settingsController.getContact,
);
settingsRoutes.put(
  "/contact",
  requireStaff,
  requirePermission("contact", "edit"),
  validate({ body: contactSettingsSchema }),
  settingsController.saveContact,
);
// Phụ thu nhóm nhỏ: nhân viên được xem (ô "Giá tạm tính thử" khi sửa tour), chỉ admin được sửa
settingsRoutes.get("/small-group", requireStaff, settingsController.getSmallGroup);
settingsRoutes.put(
  "/small-group",
  requireAdmin,
  validate({ body: smallGroupSettingsSchema }),
  settingsController.saveSmallGroup,
);
// Điểm & số lượt đánh giá (tự cập nhật qua Apify): theo quyền "Đánh giá" (reviews) — xem số + hạn mức = xem;
// "Cập nhật ngay" tốn ~0,02 USD hạn mức Apify = sửa (giống "Lấy đánh giá" ở /admin/reviews/import).
// Service chặn bấm lại trong 5 phút + giữ hạn mức cho cập nhật tự động; thêm giới hạn 6 lần / giờ phòng bấm lặp.
const reviews = (level) => [requireStaff, requirePermission("reviews", level)];
const reviewSyncLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  message: "Bạn vừa cập nhật nhiều lần, vui lòng thử lại sau ít phút",
});
// Lưu mục có khoá bí mật (mã 9Pay): đổi / xoá khoá phải nhập lại mật khẩu (sai được tính vào
// khoá tài khoản như đăng nhập sai) + giới hạn 20 lần / 15 phút / tài khoản (chống thử mật khẩu, bấm lặp).
// Cache-Control: no-store đã áp cho cả /settings (routes/index.js).
const secretSaveLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `secret-save:${req.user?.id}`,
  message: "Bạn vừa lưu nhiều lần, vui lòng thử lại sau ít phút",
});
settingsRoutes.get("/review-stats", reviews("view"), settingsController.getReviewStats);
settingsRoutes.post(
  "/review-stats/sync",
  reviews("edit"),
  reviewSyncLimiter,
  settingsController.syncReviewStats,
);
settingsRoutes.get("/payment", requireAdmin, settingsController.getPayment);
settingsRoutes.put(
  "/payment",
  requireAdmin,
  secretSaveLimiter,
  validate({ body: paymentSettingsSchema }),
  settingsController.savePayment,
);
