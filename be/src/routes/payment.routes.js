import { Router } from "express";
import { z } from "zod";
import { paymentController } from "../controllers/payment.controller.js";
import { limiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { lookupCodeParam } from "../validators/enquiry.validator.js";
import { formLang, formMessage } from "../utils/form-messages.js";

/**
 * /payments — thanh toán online qua 9Pay (công khai, giới hạn tần suất).
 *   POST /:code/start   trình duyệt vừa gửi đơn (kèm payToken) → link sang cổng 9Pay
 *   GET  /return        9Pay đưa khách quay về → kiểm tra → chuyển sang trang cảm ơn
 *   POST /ipn           máy chủ 9Pay báo kết quả (đăng ký URL này trong trang quản lý 9Pay)
 *   GET  /fake/portal   cổng giả lập — CHỈ khi NINEPAY_FAKE trên máy dev
 */
const router = Router();

const startLimiter = limiter({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  message: (req) => formMessage(formLang(req), "tooMany"),
});
// 9Pay có thể gửi lại kết quả nhiều lần — đủ rộng cho cổng, vẫn chặn dò quét
const callbackLimiter = limiter({ windowMs: 60 * 1000, limit: 60 });

const startSchema = {
  params: lookupCodeParam,
  body: z.object({
    token: z.string().trim().min(10).max(500),
    lang: z.enum(["en", "zh", "vi"]).optional(),
  }),
};

router.post("/:code/start", startLimiter, validate(startSchema), paymentController.start);
router.get("/return", callbackLimiter, paymentController.returnUrl);
router.post("/ipn", callbackLimiter, paymentController.ipn);
router.get("/fake/portal", paymentController.fakePortal); // 404 khi không ở chế độ giả lập

export default router;
