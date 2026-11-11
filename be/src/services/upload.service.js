import { createHash, randomUUID } from "node:crypto";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/ApiError.js";
import {
  extractRefs,
  isManaged,
  orphanStore,
  pendingStore,
  scanReferences,
} from "./media-cleanup.service.js";
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
    throw ApiError.unavailable(
      "Chức năng tải ảnh chưa được bật — vui lòng báo bộ phận kỹ thuật",
      "CLOUDINARY_NOT_CONFIGURED",
    );
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
 * Tên file trên Cloudinary theo NỘI DUNG ảnh (sha256): bấm Lưu lại sau lỗi mạng, chọn trùng 1 ảnh 2 lần…
 * → cùng 1 file, không sinh bản trùng (tải lên với overwrite: false → Cloudinary trả lại file đã có).
 */
export const imagePublicId = (buffer) =>
  `h-${createHash("sha256").update(buffer).digest("hex").slice(0, 32)}`;

/** Kho "chờ lưu" + danh sách đánh dấu dọn — thay thế được khi kiểm thử */
export const mediaDeps = {
  pending: () => pendingStore(),
  orphans: () => orphanStore(),
  references: async () => (await scanReferences()).refs,
  destroy: (publicId, resourceType) =>
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true }),
};

/**
 * Ghi nhận file vừa tải lên / chép về (CHƯA lưu vào bản ghi): file mới → "chờ lưu";
 * file đã có (cùng nội dung) → chỉ làm mới nếu đang chờ lưu, và bỏ đánh dấu dọn (sắp được dùng lại).
 * Lỗi chỉ ghi log: không ghi nhận được thì file được coi như "từng lưu" → chờ đủ ngày (an toàn).
 */
export async function recordUpload(publicId, { existed, owner }, deps = mediaDeps) {
  if (!isManaged(publicId)) return;
  try {
    if (existed) {
      await deps.pending().touch(publicId, { owner });
      await deps.orphans().unmark([publicId]);
    } else await deps.pending().add(publicId, { owner });
  } catch (err) {
    logger.warn({ err, publicId }, "[upload] không ghi nhận được file chờ lưu");
  }
}

/** public_id của file Cloudinary thuộc website (đúng tài khoản, trong thư mục CMS) từ link, hoặc null */
export function managedPublicId(url) {
  const s = String(url ?? "");
  const cloud = env.cloudinary.cloudName;
  if (!cloud || !s.startsWith(`https://res.cloudinary.com/${cloud}/`)) return null;
  const [id] = extractRefs(s);
  return id && isManaged(id) ? id : null;
}

/**
 * Nhân viên bỏ file vừa tải / vừa chép mà CHƯA lưu (gỡ video, đóng form, rời trang) → xoá ngay.
 * Chỉ xoá khi: file đang "chờ lưu" (chưa từng được lưu), người bỏ là người đã tải (hoặc admin), không còn form
 * nào khác giữ, và không bản ghi nào đang dùng. Trường hợp khác → bỏ qua (lần dọn hằng ngày lo).
 * @param {string[]} urls
 * @param {{ id: string, role?: string }} user
 * @returns {Promise<number>} số file đã xoá
 */
export async function discardPending(urls, user, deps = mediaDeps) {
  if (!env.cloudinary.enabled && deps === mediaDeps) return 0;
  const ids = [...new Set(urls.map(managedPublicId).filter(Boolean))];
  if (!ids.length) return 0;
  const store = deps.pending();
  let refs = null;
  let removed = 0;
  for (const id of ids) {
    const doc = await store.get(id);
    if (!doc) continue; // đã được lưu / không do CMS tải lên lúc soạn → không bao giờ xoá ở đây
    const mine = (doc.owners ?? []).includes(String(user?.id)) || user?.role === ROLES.ADMIN;
    if (!mine) continue;
    if ((await store.release(id)) > 0) continue; // form khác (tab khác) vẫn đang giữ
    refs ??= await deps.references();
    if (refs.has(id)) {
      await store.clear([id]); // đã nằm trong bản ghi → từ giờ chờ đủ ngày như mọi file đã lưu
      continue;
    }
    try {
      await deps.destroy(id, doc.resourceType ?? "image");
      await store.clear([id]);
      removed++;
    } catch (err) {
      logger.warn({ err, publicId: id }, "[upload] không xoá được file bỏ dở"); // lần dọn hằng ngày lo
    }
  }
  return removed;
}

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

/** Ảnh lấy từ link để xem trước / cắt trên máy nhân viên: tối đa 25MB, 3 lần chuyển hướng, 20 giây */
export const LINK_IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const LINK_REDIRECTS = 3;
const LINK_TIMEOUT_MS = 20_000;
const LINK_ERROR =
  "Không lấy được ảnh từ link này — kiểm tra link mở được công khai và là file ảnh (JPG, PNG, WebP…)";

/**
 * Phân giải tên miền rồi CHẶN nếu ra IP nội bộ. Dùng làm `lookup` của chính kết nối → IP đã kiểm tra là IP được
 * kết nối tới (không bị lừa bằng DNS đổi IP giữa lúc kiểm tra và lúc tải).
 */
export function safeLookup(hostname, options, callback) {
  const cb = typeof options === "function" ? options : callback;
  const opts = typeof options === "object" && options ? options : {};
  dns.lookup(hostname, { all: true, family: opts.family ?? 0 }, (err, addrs) => {
    if (err) return cb(err);
    if (!addrs?.length || addrs.some((a) => isPrivateHost(a.address)))
      return cb(Object.assign(new Error("blocked address"), { code: "EBLOCKED" }));
    if (opts.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}

/** Tải 1 lần (không tự theo chuyển hướng) → { status, location?, type?, buffer? } */
function getOnce(url, signal) {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.get(
      url,
      {
        lookup: safeLookup,
        signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ImageFetcher/1.0)",
          Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location });
        }
        if (status !== 200) {
          res.resume();
          return resolve({ status });
        }
        if (Number(res.headers["content-length"] ?? 0) > LINK_IMAGE_MAX_BYTES) {
          res.destroy();
          return reject(new Error("too large"));
        }
        const chunks = [];
        let size = 0;
        res.on("data", (c) => {
          size += c.length;
          if (size > LINK_IMAGE_MAX_BYTES) res.destroy(new Error("too large"));
          else chunks.push(c);
        });
        res.on("error", reject);
        res.on("end", () => resolve({ status, buffer: Buffer.concat(chunks) }));
      },
    );
    req.on("error", reject);
  });
}

export const uploadService = {
  /**
   * Lấy ảnh từ link về để nhân viên xem trước / cắt ngay trên máy — CHƯA lưu vào kho ảnh (chỉ lưu khi bấm Lưu).
   * Chống SSRF: chỉ http(s) cổng chuẩn, kiểm tra IP thật lúc kết nối (safeLookup), kiểm tra lại mỗi lần chuyển hướng,
   * giới hạn dung lượng / thời gian, chỉ trả về file có chữ ký ảnh thật.
   * @returns {Promise<{ buffer: Buffer, format: string }>}
   */
  async fetchLinkImage(raw) {
    let url;
    const signal = AbortSignal.timeout(LINK_TIMEOUT_MS);
    try {
      url = new URL(String(raw ?? "").trim());
      for (let hop = 0; hop <= LINK_REDIRECTS; hop++) {
        if (!checkImageUrl(url.href)) throw new Error("bad url");
        const r = await getOnce(url, signal);
        if (r.location) {
          url = new URL(r.location, url);
          continue;
        }
        if (!r.buffer) throw new Error(`status ${r.status}`);
        const format = sniffImage(r.buffer);
        if (!format) throw new Error("not an image");
        return { buffer: r.buffer, format };
      }
      throw new Error("too many redirects");
    } catch (err) {
      logger.info(
        {
          event: "media.link_fetch_failed",
          host: url?.hostname,
          reason: err?.message?.slice(0, 120),
        },
        "[upload] không lấy được ảnh từ link",
      );
      throw ApiError.unprocessable(LINK_ERROR);
    }
  },

  /**
   * Ảnh được đặt tên theo nội dung (imagePublicId) → tải lại cùng ảnh không sinh file trùng.
   * Ảnh mới được ghi nhận "chờ lưu" cho tới khi 1 bản ghi lưu thành công dùng nó.
   * @param {Express.Multer.File[]} files
   * @param {string} subfolder vd. "tours", "articles", "destinations"
   * @param {{ owner?: string }} [opts] id nhân viên tải lên
   */
  async uploadImages(files, subfolder = "misc", { owner = "" } = {}) {
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
          public_id: imagePublicId(f.buffer),
          overwrite: false, // đã có (cùng nội dung) → trả lại file cũ, không tải / tạo bản mới
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
    await Promise.all(
      results.map((r) => recordUpload(r.public_id, { existed: !!r.existing, owner })),
    );
    return results.map(toImage);
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
    const publicId = `${folderOf(BANNER_SUBFOLDER)}/drive-${v.id}`;
    // Đã có trên website (chép trước đây, có thể đang dùng) → không bao giờ coi là "chờ lưu"
    const existed = await cloudinary.api.resource(publicId, { resource_type: "video" }).then(
      () => true,
      (err) => (err?.error?.http_code ?? err?.http_code) !== 404, // lỗi khác → coi như đã có (an toàn)
    );
    let r;
    try {
      r = await cloudinary.uploader.upload(source, {
        resource_type: "video", // Cloudinary kiểm tra nội dung thật là video
        folder: folderOf(BANNER_SUBFOLDER),
        public_id: `drive-${v.id}`,
        overwrite: true,
        invalidate: true,
        // tạo sẵn bản phát cho máy tính (1920), điện thoại (720) và bản dọc nhẹ cho điện thoại
        // (= "br_1m,c_fill,h_854,q_auto:eco,w_480", fe/src/lib/video.js CLD_PHONE) — khách không phải chờ nén lần đầu
        eager: [
          ...[1920, 720].map((width) => ({ crop: "limit", quality: "auto", width, format: "mp4" })),
          {
            bit_rate: "1m",
            crop: "fill",
            height: 854,
            quality: "auto:eco",
            width: 480,
            format: "mp4",
          },
        ],
        eager_async: true,
        timeout: 300_000,
      });
    } catch (err) {
      const code = err?.http_code ?? 0;
      if (!code || code >= 500) throw err; // lỗi mạng / cấu hình → 500
      const reason = err?.message?.slice(0, 200) ?? "fetch failed";
      throw driveError(reason, /too large|file size/i.test(reason) ? "large" : "unreadable");
    }
    if (r.bytes > MAX_BANNER_VIDEO_BYTES) {
      if (!existed)
        await cloudinary.uploader
          .destroy(r.public_id, { resource_type: "video", invalidate: true })
          .catch(() => {});
      throw driveError(`too large: ${r.bytes}`, "large");
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
      existed,
    };
  },

  /**
   * Chép video Drive nhưng không giữ request quá lâu (proxy phía trước có thể ngắt sau ~30 giây):
   * xong trong `waitMs` → trả { video }; chưa xong → trả { jobId } để trình duyệt hỏi lại (driveImportJob).
   * @param {string} link
   * @param {string} owner id nhân viên — chỉ người tạo mới xem được kết quả
   * @param {(video: object) => void} [onDone] gọi khi chép xong (ghi nhật ký)
   * @param {{ waitMs?: number, abandoned?: () => boolean }} [opts] abandoned: trình duyệt đã bỏ đi trước khi
   *   nhận kết quả (đóng trang / huỷ) → chép xong thì bỏ luôn file vừa chép
   */
  async startDriveImport(link, owner, onDone, { waitMs = 20_000, abandoned } = {}) {
    const job = { owner: String(owner ?? ""), status: "pending", at: Date.now(), cancelled: false };
    job.promise = this.importDriveVideo(link).then(
      async ({ existed, ...video }) => {
        await recordUpload(video.publicId, { existed, owner: job.owner });
        if (job.cancelled || abandoned?.()) {
          Object.assign(job, { status: "cancelled" });
          await discardPending([video.url], { id: job.owner }).catch(() => {});
          return video;
        }
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
    if (!job || job.owner !== String(owner ?? "") || job.status === "cancelled")
      throw ApiError.notFound("Không tìm thấy");
    if (job.status === "pending") return { status: "pending" };
    driveJobs.delete(jobId);
    if (job.status === "error") throw job.error;
    return { status: "done", video: job.video };
  },

  /** Nhân viên huỷ lúc đang chép (gỡ video / rời trang) → chép xong tự bỏ file. Không có việc → bỏ qua. */
  cancelDriveImport(jobId, owner) {
    const job = driveJobs.get(jobId);
    if (!job || job.owner !== String(owner ?? "")) return false;
    job.cancelled = true;
    if (job.status === "done" && job.video) {
      driveJobs.delete(jobId);
      discardPending([job.video.url], { id: job.owner }).catch(() => {});
    }
    return true;
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
/** Lời báo khi không lấy được video Drive: nói rõ lý do + việc cần làm (không dùng từ kỹ thuật) */
export const DRIVE_VIDEO_ERRORS = {
  private:
    "Video chưa được chia sẻ công khai. Trên Google Drive, bấm Chia sẻ → chọn “Bất kỳ ai có đường liên kết” rồi dán lại link.",
  missing: "Không tìm thấy video trên Google Drive — link có thể sai hoặc file đã bị xoá.",
  notVideo: "File trên Google Drive không phải video — hãy kiểm tra lại link.",
  large:
    "Video quá lớn (tối đa 100 MB). Hãy cắt ngắn hoặc giảm chất lượng video, hoặc đăng lên YouTube rồi dán link YouTube.",
  unreadable:
    "Chưa lấy được video từ Google Drive — file có thể bị hỏng. Hãy thử lại, hoặc đăng lên YouTube rồi dán link YouTube.",
};

/** Lỗi chép video Drive: nhân viên chỉ thấy câu dễ hiểu, lý do kỹ thuật ghi vào log */
function driveError(reason, kind = "unreadable") {
  logger.info(
    { event: "media.drive_video_failed", reason, kind },
    "[upload] không chép được video Drive",
  );
  return ApiError.unprocessable(DRIVE_VIDEO_ERRORS[kind] ?? DRIVE_VIDEO_ERRORS.unreadable);
}

/** Phân loại phản hồi của Google khi hỏi trước file Drive → loại lỗi, hoặc null nếu dùng được */
export function driveProbeError(status, type = "", total = NaN) {
  if (status === 404) return "missing";
  if (![200, 206].includes(status)) return "private"; // chuyển sang trang đăng nhập / 401 / 403
  if (/^text\/html/i.test(type)) return "private"; // trang "cần quyền truy cập" của Google
  if (!/^(video\/|application\/octet-stream)/i.test(type)) return "notVideo";
  if (Number.isFinite(total) && total > MAX_BANNER_VIDEO_BYTES) return "large";
  return null;
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
  const total = Number(
    res.headers.get("content-range")?.split("/")[1] ??
      (res.status === 200 ? res.headers.get("content-length") : NaN),
  );
  const kind = driveProbeError(res.status, type, total);
  if (kind) throw driveError(`drive ${res.status} ${type.slice(0, 60)} ${total}`, kind);
}
