"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { BACKEND_URL, backendHeaders } from "@/config/urls.mjs";

/** Thẻ cache website (lib/catalog.js gắn cacheTag tương ứng) */
const TAGS = new Set([
  "tours",
  "destinations",
  "themes",
  "articles",
  "taxonomy",
  "services",
  "pages",
  "settings",
]);

/**
 * CMS lưu xong gọi hàm này → xoá cache đúng thẻ, website hiện dữ liệu mới ngay (không chờ cache hết hạn).
 * Chỉ người đã đăng nhập CMS: hỏi backend /auth/me bằng cookie đăng nhập của trình duyệt.
 * @param {string[]} tags vd. ["tours"], ["destinations", "tours"]
 */
export async function refreshPublicContent(tags) {
  const list = (Array.isArray(tags) ? tags : [tags]).filter((t) => TAGS.has(t));
  if (!list.length) return false;
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
    headers: {
      cookie: (await cookies()).toString(),
      accept: "application/json",
      ...backendHeaders(),
    },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return false;
  list.forEach((t) => updateTag(t));
  return true;
}
