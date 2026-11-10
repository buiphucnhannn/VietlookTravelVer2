import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParam } from "../validators/common.validator.js";
import {
  createUserSchema,
  listUsersQuery,
  resetPasswordSchema,
  updateUserSchema,
} from "../validators/user.validator.js";

/** Quản lý tài khoản quản trị — chỉ admin */
const router = Router();
router.use(requireAdmin);

router.get("/", validate({ query: listUsersQuery }), userController.list);
router.post("/", validate({ body: createUserSchema }), userController.create);
router.get("/:id", validate({ params: idParam }), userController.get);
router.patch("/:id", validate({ params: idParam, body: updateUserSchema }), userController.update);
router.post(
  "/:id/reset-password",
  validate({ params: idParam, body: resetPasswordSchema }),
  userController.resetPassword,
);
router.post("/:id/unlock", validate({ params: idParam }), userController.unlock);
router.delete("/:id", validate({ params: idParam }), userController.remove);

export default router;
