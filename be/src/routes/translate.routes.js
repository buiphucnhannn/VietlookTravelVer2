import { Router } from "express";
import { translateController } from "../controllers/translate.controller.js";
import { requireContentEditor, requireStaff } from "../middlewares/auth.middleware.js";
import { limiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { translateSchema } from "../validators/translate.validator.js";

/** Dịch tự động nội dung CMS — admin, hoặc nhân viên có quyền sửa ít nhất 1 mục nội dung website */
const router = Router();
router.use(requireStaff, requireContentEditor);
router.use(
  limiter({ windowMs: 60 * 1000, limit: 30, message: "Dịch quá nhanh, vui lòng chờ 1 phút" }),
);

// POST /api/v1/translate   body: { from: "en", to: ["zh","vi"], texts: ["…", "<p>…</p>"] }
router.post("/", validate({ body: translateSchema }), translateController.translate);

export default router;
