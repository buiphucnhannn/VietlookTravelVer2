import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import {
  cloudinaryVideo,
  cloudinaryVideoUrl,
  driveDownloadUrl,
  parseVideo,
} from "../utils/video.js";

/**
 * Ảnh trong CMS — 2 cách, đều lưu về Cloudinary của website:
 *   1. Tải từ thiết bị (multer → bộ nhớ → Cloudinary)
 *   2. Thêm từ link (Cloudinary tự tải link về) — website KHÔNG nhúng thẳng ảnh ngoài
 *      (ảnh ngoài có thể bị xoá / đổi nội dung / dùng để theo dõi người xem).
 * Video: KHÔNG tải file lên máy chủ — chỉ dán link YouTube / Google Drive (xem utils/video.js).
 *   Riêng video nền trang chủ dán link Drive: Cloudinary chép file Drive về (importDriveVideo) để tự phát làm nền.
 *
 * Bảo mật nhiều lớp: đăng nhập + quyền (route) → giới hạn tần suất → định dạng cho phép + dung lượng (multer)
 * → chữ ký file thật (magic bytes, chặn file đổi đuôi) → Cloudinary kiểm tra lại nội dung là ảnh (resource_type image
 * + allowed_formats). SVG bị chặn (có thể chứa script).
 */
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "avif", "gif"];

function ensureEnabled() {
  if (!env.cloudinary.enabled)
    throw ApiError.unavailable("Chưa cấu hình Cloudinary", "CLOUDINARY_NOT_CONFIGURED");
}

const folderOf = (subfolder) => `${env.cloudinary.folder}/${subfolder}`;

/** Đẩy buffer (từ multer memoryStorage) lên Cloudinary bằng stream — không ghi file tạm ra đĩa. */
function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result),
    );
    stream.end(buffer);
  });
}

const toImage = (r) => ({
  url: r.secure_url,
  publicId: r.public_id,
  width: r.width,
  height: r.height,
  format: r.format,
  bytes: r.bytes,
});

/**
 * Nhận diện ảnh theo CHỮ KÝ FILE (vài byte đầu), không tin đuôi file / Content-Type trình duyệt gửi.
 * @returns {"jpeg"|"png"|"gif"|"webp"|"avif"|null}
 */
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "png";
  const ascii = (a, b) => buf.subarray(a, b).toString("latin1");
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && /^(avif|avis|mif1|msf1)$/.test(ascii(8, 12))) return "avif";
  return null;
}

/** Tên máy / IP nội bộ — không cho dùng làm nguồn ảnh (chống lợi dụng dò mạng nội bộ / metadata cloud) */
function isPrivateHost(host) {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  )
    return true;
  const v = isIP(h);
  if (v === 4) {
    const [a, b] = h.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (v === 6)
    return h === "::1" || h === "::" || /^(fc|fd|fe80)/.test(h) || h.startsWith("::ffff:");
  return !h.includes("."); // tên máy không có tên miền
}

/** Link ảnh ngoài hợp lệ: http(s), không kèm tài khoản, không trỏ vào máy / mạng nội bộ */
export function checkImageUrl(raw) {
  let url;
  try {
    url = new URL(String(raw ?? "").trim());
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
  if (url.port && !["80", "443"].includes(url.port)) return false;
  return !isPrivateHost(url.hostname);
}

export const uploadService = {
  /**
   * @param {Express.Multer.File[]} files
   * @param {string} subfolder vd. "tours", "articles", "destinations"
   */
  async uploadImages(files, subfolder = "misc") {
    ensureEnabled();
    if (!files?.length) throw ApiError.badRequest("Chưa chọn ảnh");
    // Chữ ký file phải là ảnh thật (file .php / .html đổi đuôi thành .jpg bị chặn ngay tại đây)
    files.forEach((f, index) => {
      if (!sniffImage(f.buffer))
        throw ApiError.unprocessable(
          `File "${f.originalname || `số ${index + 1}`}" không phải ảnh hợp lệ (chỉ nhận JPG, PNG, WebP, AVIF, GIF)`,
          [{ field: "files", index, message: "invalid image signature" }],
        );
    });
    const results = await Promise.all(
      files.map((f, index) =>
        uploadBuffer(f.buffer, {
          folder: folderOf(subfolder),
          resource_type: "image", // Cloudinary kiểm tra lại nội dung thật là ảnh
          allowed_formats: ALLOWED_FORMATS,
        }).catch((err) => {
          const code = err?.http_code ?? 0;
          if (code >= 500 || !code) throw err; // lỗi mạng / cấu hình → 500
          throw ApiError.unprocessable(
            `Ảnh "${f.originalname || `số ${index + 1}`}" không đọc được (file hỏng hoặc không phải ảnh)`,
            [{ field: "files", index, message: err?.message?.slice(0, 200) ?? "invalid image" }],
          );
        }),
      ),
    );
    return results.map(toImage);
  },

  /**
   * Thêm ảnh từ link: Cloudinary tự tải link về (máy chủ website KHÔNG gọi tới link lạ → không có rủi ro SSRF
   * cho hạ tầng của mình), chỉ nhận ảnh, lưu bản sao trên Cloudinary của website.
   */
  async uploadFromUrl(url, subfolder = "misc") {
    ensureEnabled();
    if (!checkImageUrl(url))
      throw ApiError.badRequest("Link ảnh không hợp lệ — cần link http(s) công khai tới file ảnh");
    try {
      const r = await cloudinary.uploader.upload(url, {
        folder: folderOf(subfolder),
        resource_type: "image",
        allowed_formats: ALLOWED_FORMATS,
        timeout: 60_000,
      });
      return toImage(r);
    } catch (err) {
      throw ApiError.unprocessable(
        "Không lấy được ảnh từ link này — kiểm tra link mở được công khai và là file ảnh (JPG, PNG, WebP…)",
        [{ field: "body.url", message: err?.message?.slice(0, 200) ?? "fetch failed" }],
      );
    }
  },

  async deleteImage(publicId) {
    ensureEnabled();
    const { result } = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    if (result !== "ok") throw ApiError.notFound("Không tìm thấy ảnh");
  },

  /**
   * Video nền trang chủ từ Google Drive: khung xem của Drive không tự phát / tắt tiếng / lặp được,
   * nên chép file về Cloudinary của website rồi phát bằng thẻ <video>.
   * Chống SSRF: chỉ nhận MÃ file đã kiểm tra (utils/video.parseVideo) và tự dựng link tải trên máy của Google
   * (driveDownloadUrl) — không bao giờ tải link do người dùng nhập.
   * @param {string} link link Drive do nhân viên dán
   */
  async importDriveVideo(link) {
    ensureEnabled();
    const v = parseVideo(link);
    if (v?.provider !== "drive") throw ApiError.badRequest("Link chưa phải video Google Drive");
    const source = driveDownloadUrl(v.id);
    await probeDriveFile(source);
    let r;
    try {
      r = await cloudinary.uploader.upload(source, {
        resource_type: "video", // Cloudinary kiểm tra nội dung thật là video
        folder: folderOf(BANNER_SUBFOLDER),
        public_id: `drive-${v.id}`,
        overwrite: true,
        invalidate: true,
        // tạo sẵn bản phát cho máy tính (1920) và điện thoại (720) — khách không phải chờ nén lần đầu
        eager: [1920, 720].map((width) => ({
          crop: "limit",
          quality: "auto",
          width,
          format: "mp4",
        })),
        eager_async: true,
        timeout: 300_000,
      });
    } catch (err) {
      const code = err?.http_code ?? 0;
      if (!code || code >= 500) throw err; // lỗi mạng / cấu hình → 500
      throw driveError(err?.message?.slice(0, 200) ?? "fetch failed");
    }
    if (r.bytes > MAX_BANNER_VIDEO_BYTES) {
      await cloudinary.uploader
        .destroy(r.public_id, { resource_type: "video", invalidate: true })
        .catch(() => {});
      throw driveError(`too large: ${r.bytes}`);
    }
    const parts = {
      cloud: env.cloudinary.cloudName,
      version: String(r.version),
      publicId: r.public_id,
    };
    return {
      url: cloudinaryVideoUrl(parts),
      poster: cloudinaryVideoUrl(parts, { poster: true }),
      publicId: r.public_id,
      width: r.width,
      height: r.height,
      duration: r.duration,
      bytes: r.bytes,
    };
  },

  /**
   * Chép video Drive nhưng không giữ request quá lâu (proxy phía trước có thể ngắt sau ~30 giây):
   * xong trong `waitMs` → trả { video }; chưa xong → trả { jobId } để trình duyệt hỏi lại (driveImportJob).
   * @param {string} link
   * @param {string} owner id nhân viên — chỉ người tạo mới xem được kết quả
   * @param {(video: object) => void} [onDone] gọi khi chép xong (ghi nhật ký)
   */
  async startDriveImport(link, owner, onDone, { waitMs = 20_000 } = {}) {
    const job = { owner: String(owner ?? ""), status: "pending", at: Date.now() };
    job.promise = this.importDriveVideo(link).then(
      (video) => {
        Object.assign(job, { status: "done", video });
        onDone?.(video);
        return video;
      },
      (err) => {
        Object.assign(job, { status: "error", error: err });
        throw err;
      },
    );
    job.promise.catch(() => {}); // lỗi được trả khi hỏi lại — không để thành lỗi chưa xử lý
    let timer;
    const pending = Symbol("pending");
    const first = await Promise.race([
      job.promise,
      new Promise((resolve) => (timer = setTimeout(resolve, waitMs, pending))),
    ]).finally(() => clearTimeout(timer));
    if (first !== pending) return { video: first };
    for (const [id, j] of driveJobs) if (Date.now() - j.at > JOB_TTL_MS) driveJobs.delete(id);
    const jobId = randomUUID();
    driveJobs.set(jobId, job);
    return { jobId };
  },

  /** Kết quả chép video Drive đang chạy: { status: "pending" } | { status: "done", video } | ném lỗi */
  driveImportJob(jobId, owner) {
    const job = driveJobs.get(jobId);
    if (!job || job.owner !== String(owner ?? "")) throw ApiError.notFound("Không tìm thấy");
    if (job.status === "pending") return { status: "pending" };
    driveJobs.delete(jobId);
    if (job.status === "error") throw job.error;
    return { status: "done", video: job.video };
  },

  /**
   * Xoá video nền đã chép từ Drive mà trang chủ không còn dùng. Chỉ đụng video trong thư mục banner của website.
   * Không chặn thao tác chính: lỗi chỉ ghi log.
   * @param {string[]} urls link video trước đây
   * @param {{ keep?: string[] }} opts link video vẫn đang dùng (cùng file chép lại → cùng publicId → giữ)
   */
  async deleteBannerVideos(urls, { keep = [] } = {}) {
    if (!env.cloudinary.enabled) return;
    const kept = new Set(keep.map(bannerVideoPublicId));
    const ids = [...new Set(urls.map(bannerVideoPublicId))].filter((id) => id && !kept.has(id));
    await Promise.all(
      ids.map((id) =>
        cloudinary.uploader
          .destroy(id, { resource_type: "video", invalidate: true })
          .catch((err) =>
            logger.warn({ err, publicId: id }, "[upload] không xoá được video nền cũ"),
          ),
      ),
    );
  },
};

const BANNER_SUBFOLDER = "banner";
/** Việc chép video Drive chưa xong (lưu trong bộ nhớ — đủ cho 1 server, giống bộ đếm giới hạn tần suất) */
const driveJobs = new Map();
const JOB_TTL_MS = 30 * 60 * 1000;
export const MAX_BANNER_VIDEO_BYTES = 100 * 1024 * 1024;
const DRIVE_VIDEO_ERROR =
  "Video trên Drive chưa chia sẻ công khai hoặc quá lớn (tối đa 100MB) — hãy kiểm tra quyền chia sẻ hoặc tải lên YouTube";

/** Lỗi chép video Drive: nhân viên chỉ thấy câu dễ hiểu, lý do kỹ thuật ghi vào log */
function driveError(reason) {
  logger.info(
    { event: "media.drive_video_failed", reason },
    "[upload] không chép được video Drive",
  );
  return ApiError.unprocessable(DRIVE_VIDEO_ERROR);
}

/** publicId của video nền đã chép về (đúng tài khoản + thư mục banner của website), hoặc null */
export function bannerVideoPublicId(url) {
  const c = cloudinaryVideo(url);
  if (!c || !env.cloudinary.cloudName || c.cloud !== env.cloudinary.cloudName) return null;
  return c.publicId.startsWith(`${folderOf(BANNER_SUBFOLDER)}/`) ? c.publicId : null;
}

/**
 * Hỏi Google trước (chỉ lấy 1 byte): file có chia sẻ công khai không, có phải video không, nặng bao nhiêu.
 * Link do mình dựng trên máy của Google (không phải link người dùng) → không có rủi ro SSRF;
 * không theo chuyển hướng (file riêng tư bị chuyển sang trang đăng nhập → coi là chưa chia sẻ).
 */
async function probeDriveFile(source) {
  let res;
  try {
    res = await fetch(source, {
      headers: { Range: "bytes=0-0" },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return; // mạng chập chờn → để Cloudinary tự thử, lỗi sẽ báo ở bước sau
  }
  res.body?.cancel().catch(() => {});
  const type = res.headers.get("content-type") ?? "";
  if (![200, 206].includes(res.status) || !/^(video\/|application\/octet-stream)/i.test(type))
    throw driveError(`drive ${res.status} ${type.slice(0, 60)}`);
  const total = Number(
    res.headers.get("content-range")?.split("/")[1] ??
      (res.status === 200 ? res.headers.get("content-length") : NaN),
  );
  if (Number.isFinite(total) && total > MAX_BANNER_VIDEO_BYTES)
    throw driveError(`too large: ${total}`);
}
