import { Router } from "express";
import { translateController } from "../controllers/translate.controller.js";
import { requireStaff } from "../middlewares/auth.middleware.js";
import { limiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { translateSchema } from "../validators/translate.validator.js";

/** Dịch tự động nội dung CMS (admin + editor) */
const router = Router();
router.use(requireStaff);
router.use(
  limiter({ windowMs: 60 * 1000, limit: 30, message: "Dịch quá nhanh, vui lòng chờ 1 phút" }),
);

// POST /api/v1/translate   body: { from: "en", to: ["zh","vi"], texts: ["…", "<p>…</p>"] }
router.post("/", validate({ body: translateSchema }), translateController.translate);

export default router;
