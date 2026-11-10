/**
 * Loader ảnh cho next/image — KHÔNG dùng bộ tối ưu ảnh của Vercel (/_next/image) để tránh hết hạn mức.
 * Mọi ảnh tải THẲNG từ CDN Cloudinary, Cloudinary tự đổi kích thước + định dạng (AVIF/WebP) + nén:
 *   - Ảnh upload trong CMS (URL res.cloudinary.com/…/image/upload/…) → chèn tham số biến đổi.
 *   - Ảnh có sẵn trong /public/images/… → đã đưa lên Cloudinary bằng `npm run images:upload` (be/) với public_id
 *     theo đúng đường dẫn file → đổi sang URL Cloudinary bằng quy tắc cố định (sitePublicId), không cần bảng tra.
 *   - SVG, poster video, ảnh ngoài (YouTube…) → giữ nguyên.
 * Tên cloud là thông tin công khai (có sẵn trong mọi URL ảnh).
 */
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dzpmroj28";
const FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "vietlook";
const UPLOAD = "/image/upload/";
const BASE = `https://res.cloudinary.com/${CLOUD}${UPLOAD}`;
const RASTER = /^\/images\/.+\.(jpe?g|png|webp|avif|gif)$/i;

/** PHẢI giống sitePublicId trong be/scripts/upload-site-images.js */
export const sitePublicId = (webPath) =>
  `${FOLDER}/site/${webPath
    .replace(/^\//, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^A-Za-z0-9/_-]/g, "_")}`;

export const isCloudinary = (src) =>
  typeof src === "string" && src.startsWith("https://res.cloudinary.com/") && src.includes(UPLOAD);

/** Chuỗi biến đổi: f_auto (AVIF/WebP), chất lượng, thu nhỏ đúng bề ngang cần (không phóng to) */
const transform = (width, quality) =>
  `f_auto,${quality && quality > 75 ? `q_${quality}` : "q_auto"},c_limit,w_${width}`;

/** URL ảnh đã tối ưu (dùng được cả ngoài next/image: CSS background, <img> trong HTML bài viết…) */
export function cdnImage(src, width = 1600, quality) {
  if (!src || typeof src !== "string") return src;
  if (isCloudinary(src)) {
    if (/\/image\/upload\/(f_|q_|c_|w_)/.test(src)) return src; // đã có tham số
    return src.replace(UPLOAD, `${UPLOAD}${transform(width, quality)}/`);
  }
  const path = src.split("?")[0];
  if (RASTER.test(path))
    // v1/: public_id có đoạn dạng "v2" (vd. /images/tours/v2/…) sẽ bị Cloudinary hiểu nhầm là số phiên bản → ghi rõ phiên bản
    return `${BASE}${transform(width, quality)}/v1/${encodeURI(sitePublicId(path))}`;
  return src;
}

export default function imageLoader({ src, width, quality }) {
  const out = cdnImage(src, width, quality);
  // ảnh không qua Cloudinary (svg, ảnh ngoài): gắn w để Next không cảnh báo loader bỏ qua bề ngang
  return out === src ? `${src}${src.includes("?") ? "&" : "?"}w=${width}` : out;
}
