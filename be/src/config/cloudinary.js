import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
import { logger } from "./logger.js";

/**
 * Cấu hình Cloudinary SDK. Chưa điền key → API upload trả 503 thay vì làm sập app.
 * API secret CHỈ nằm ở backend — frontend upload qua API hoặc bằng chữ ký do backend cấp.
 */
export function configureCloudinary() {
  if (!env.cloudinary.enabled) {
    logger.warn("Cloudinary not configured (CLOUDINARY_*) - image uploads disabled");
    return;
  }
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
  logger.debug("Cloudinary configured");
}

export { cloudinary };
