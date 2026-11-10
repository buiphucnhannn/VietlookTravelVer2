import { Router } from "express";
import { uploadController } from "../controllers/upload.controller.js";
import { requireStaff } from "../middlewares/auth.middleware.js";
import { limiter } from "../middlewares/rate-limit.middleware.js";
import { uploadImages } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  deleteImageSchema,
  driveVideoJobParams,
  driveVideoSchema,
  folderQuery,
  imageFromUrlSchema,
} from "../validators/upload.validator.js";

/** Ảnh (Cloudinary) — admin + editor */
const router = Router();
router.use(requireStaff);
router.use(limiter({ windowMs: 60 * 1000, limit: 60, message: "Tải ảnh quá nhanh, chờ 1 phút" }));

// POST /api/v1/uploads/images?folder=tours   (multipart/form-data, field "files", tối đa 10 ảnh)
router.post(
  "/images",
  uploadImages.array("files", 10),
  validate({ query: folderQuery }),
  uploadController.images,
);

// POST /api/v1/uploads/images/from-url   body: { url, folder } — Cloudinary tự tải ảnh từ link về
router.post(
  "/images/from-url",
  limiter({ windowMs: 60 * 1000, limit: 20, message: "Thêm ảnh từ link quá nhanh, chờ 1 phút" }),
  validate({ body: imageFromUrlSchema }),
  uploadController.fromUrl,
);
// (Không có endpoint chữ ký upload thẳng từ trình duyệt: mọi ảnh đều qua kiểm tra chữ ký file ở máy chủ.)

// POST /api/v1/uploads/videos/from-drive   body: { url } — video nền trang chủ: Cloudinary chép file Drive đã chia sẻ
router.post(
  "/videos/from-drive",
  limiter({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    message: "Chép video quá nhiều lần, chờ ít phút",
  }),
  validate({ body: driveVideoSchema }),
  uploadController.driveVideo,
);
// GET /api/v1/uploads/videos/from-drive/:jobId — hỏi lại khi video lớn chép chưa xong (202 ở trên)
router.get(
  "/videos/from-drive/:jobId",
  validate({ params: driveVideoJobParams }),
  uploadController.driveVideoJob,
);

// DELETE /api/v1/uploads/images   body: { publicId }
router.delete("/images", validate({ body: deleteImageSchema }), uploadController.remove);

export default router;
