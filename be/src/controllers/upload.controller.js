import { auditService } from "../services/audit.service.js";
import { discardPending, uploadService } from "../services/upload.service.js";
import { created, noContent, ok } from "../utils/response.js";

export const uploadController = {
  async images(req, res) {
    const { folder } = req.validated.query;
    const images = await uploadService.uploadImages(req.files, folder, { owner: req.user.id });
    auditService.record(req, "media.upload", { meta: { folder, count: images.length } });
    created(res, images);
  },

  /** Ảnh từ link → trả nguyên file ảnh để xem trước / cắt trên máy (chưa lưu vào kho ảnh) */
  async linkPreview(req, res) {
    const { buffer, format } = await uploadService.fetchLinkImage(req.validated.body.url);
    res.set({
      "Content-Type": `image/${format}`,
      "Cache-Control": "no-store",
      "Content-Disposition": "inline",
    });
    res.send(buffer);
  },

  /** Video nền từ Drive: xong nhanh → 201 { video }; file lớn → 202 { jobId } rồi hỏi lại driveVideoJob */
  async driveVideo(req, res) {
    // trình duyệt bỏ đi trước khi nhận kết quả (đóng trang / huỷ) → chép xong thì bỏ luôn file
    let gone = false;
    res.on("close", () => {
      if (!res.writableFinished) gone = true;
    });
    const { video, jobId } = await uploadService.startDriveImport(
      req.validated.body.url,
      req.user.id,
      (v) =>
        auditService.record(req, "media.drive_video", {
          target: { type: "media", id: v.publicId },
          meta: { bytes: v.bytes, duration: v.duration },
        }),
      { abandoned: () => gone },
    );
    if (video) return created(res, { status: "done", video });
    res.status(202).json({ success: true, data: { status: "pending", jobId } });
  },

  driveVideoJob(req, res) {
    ok(res, uploadService.driveImportJob(req.validated.params.jobId, req.user.id));
  },

  /** Huỷ chép video Drive đang chạy (nhân viên gỡ video / rời trang) */
  cancelDriveVideo(req, res) {
    uploadService.cancelDriveImport(req.validated.params.jobId, req.user.id);
    noContent(res);
  },

  /** Bỏ ảnh / video vừa tải mà chưa lưu (chỉ xoá file chưa từng được lưu, không còn ai dùng) */
  async discard(req, res) {
    const discarded = await discardPending(req.validated.body.urls, req.user);
    if (discarded) auditService.record(req, "media.discard", { meta: { count: discarded } });
    ok(res, { discarded });
  },

  async remove(req, res) {
    const { publicId } = req.validated.body;
    await uploadService.deleteImage(publicId);
    auditService.record(req, "media.delete", { target: { type: "media", id: publicId } });
    noContent(res);
  },
};
