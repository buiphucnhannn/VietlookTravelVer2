import { Router } from "express";
import { uploadController } from "../controllers/upload.controller.js";
import { requireContentEditor, requireStaff } from "../middlewares/auth.middleware.js";
import { limiter } from "../middlewares/rate-limit.middleware.js";
import { uploadImages } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  deleteImageSchema,
  discardPendingSchema,
  driveVideoJobParams,
  driveVideoSchema,
  folderQuery,
  linkPreviewSchema,
} from "../validators/upload.validator.js";

/** Ảnh (Cloudinary) — admin, hoặc nhân viên có quyền sửa ít nhất 1 mục nội dung website */
const router = Router();
router.use(requireStaff, requireContentEditor);
router.use(limiter({ windowMs: 60 * 1000, limit: 60, message: "Tải ảnh quá nhanh, chờ 1 phút" }));

// POST /api/v1/uploads/images?folder=tours   (multipart/form-data, field "files", tối đa 10 ảnh)
router.post(
  "/images",
  uploadImages.array("files", 10),
  validate({ query: folderQuery }),
  uploadController.images,
);

// POST /api/v1/uploads/images/link-preview   body: { url } — lấy ảnh từ link về để xem trước / cắt (CHƯA lưu kho ảnh;
// ảnh chỉ được lưu khi nhân viên bấm Lưu, qua POST /images)
router.post(
  "/images/link-preview",
  limiter({ windowMs: 60 * 1000, limit: 30, message: "Thêm ảnh từ link quá nhanh, chờ 1 phút" }),
  validate({ body: linkPreviewSchema }),
  uploadController.linkPreview,
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
// DELETE /api/v1/uploads/videos/from-drive/:jobId — huỷ chép (nhân viên gỡ video / rời trang khi đang chép)
router.delete(
  "/videos/from-drive/:jobId",
  validate({ params: driveVideoJobParams }),
  uploadController.cancelDriveVideo,
);

// DELETE /api/v1/uploads/pending   body: { urls } — bỏ ảnh / video vừa tải mà CHƯA lưu (gỡ, đóng form, rời trang).
// Chỉ xoá file "chờ lưu" do chính người đó tải (admin: mọi người), không form nào khác giữ, không bản ghi nào dùng.
router.delete("/pending", validate({ body: discardPendingSchema }), uploadController.discard);

// DELETE /api/v1/uploads/images   body: { publicId }
router.delete("/images", validate({ body: deleteImageSchema }), uploadController.remove);

export default router;
