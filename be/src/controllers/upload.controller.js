import { auditService } from "../services/audit.service.js";
import { uploadService } from "../services/upload.service.js";
import { created, noContent, ok } from "../utils/response.js";

export const uploadController = {
  async images(req, res) {
    const { folder } = req.validated.query;
    const images = await uploadService.uploadImages(req.files, folder);
    auditService.record(req, "media.upload", { meta: { folder, count: images.length } });
    created(res, images);
  },

  async fromUrl(req, res) {
    const { url, folder } = req.validated.body;
    const image = await uploadService.uploadFromUrl(url, folder);
    // chỉ ghi tên miền nguồn vào nhật ký (không ghi cả link — có thể chứa token)
    auditService.record(req, "media.from_url", { meta: { folder, host: new URL(url).hostname } });
    created(res, image);
  },

  /** Video nền từ Drive: xong nhanh → 201 { video }; file lớn → 202 { jobId } rồi hỏi lại driveVideoJob */
  async driveVideo(req, res) {
    const { video, jobId } = await uploadService.startDriveImport(
      req.validated.body.url,
      req.user.id,
      (v) =>
        auditService.record(req, "media.drive_video", {
          target: { type: "media", id: v.publicId },
          meta: { bytes: v.bytes, duration: v.duration },
        }),
    );
    if (video) return created(res, { status: "done", video });
    res.status(202).json({ success: true, data: { status: "pending", jobId } });
  },

  driveVideoJob(req, res) {
    ok(res, uploadService.driveImportJob(req.validated.params.jobId, req.user.id));
  },

  async remove(req, res) {
    const { publicId } = req.validated.body;
    await uploadService.deleteImage(publicId);
    auditService.record(req, "media.delete", { target: { type: "media", id: publicId } });
    noContent(res);
  },
};
