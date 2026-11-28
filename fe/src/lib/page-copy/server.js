import "server-only";
import { getPageCopy } from "@/lib/catalog";
import { pageCopyOf } from "./registry.mjs";
import { resolvePage } from "./resolve.mjs";
import { loadDataSources } from "./sources";

export { getPageCopy };
export { pick } from "./resolve.mjs";

/**
 * Nội dung dùng thật trên website của 1 trang (CMS → Giao diện trang) theo ngôn ngữ đang xem:
 * ô đã sửa trong CMS đè lên nội dung mặc định khai báo ở registry.mjs (từ điển / dữ liệu / ảnh có sẵn).
 *
 *   const dict = await getDictionary(lang);
 *   const p = await getPageText("car-rental", lang, dict);
 *   <h1>{p.heroTitle}</h1>  ·  p.services[i].title  ·  <Image src={p.heroImage} … />
 *
 * Bản đã lưu cache theo thẻ "pages" + "page:<khoá>" (CMS lưu xong → website làm mới ngay).
 * Backend lỗi / chưa có trang này → toàn bộ mặc định (trang không bao giờ hỏng vì thiếu bản sửa).
 */
export async function getPageText(key, lang, dict) {
  const entry = pageCopyOf(key);
  if (!entry) throw new Error(`Trang "${key}" chưa khai báo trong lib/page-copy/registry.mjs`);
  const [data, sources] = await Promise.all([getPageCopy(key), loadDataSources(entry)]);
  return resolvePage(entry, data, { dict, data: sources }, lang);
}

/**
 * "Hiển thị trên Google" đã lưu trong CMS cho 1 trang ({ en, zh, vi } × { title, description }) — null khi chưa
 * sửa. Dùng trong generateMetadata: `seoField(await getPageSeo(key), lang, "title") || <tiêu đề mặc định>`.
 */
export async function getPageSeo(key) {
  return (await getPageCopy(key))?.seo ?? null;
}
