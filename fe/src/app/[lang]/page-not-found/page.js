import NotFound from "../not-found";
import { lang as rootLang } from "next/root-params";
import { getDictionary } from "@/i18n/dictionaries";
import { getPageText } from "@/lib/page-copy/server";
import { hasLocale } from "@/i18n/config";

/**
 * Đích của proxy khi link sai (tour / bài viết / điểm đến không tồn tại…). Proxy rewrite kèm mã 404;
 * trang hiện đúng giao diện 404 theo ngôn ngữ ([lang]/not-found.js — sửa trong CMS → Giao diện trang),
 * có đầu & chân trang. URL ngoài mọi route vẫn dùng app/global-not-found.js.
 */
export async function generateMetadata() {
  const raw = await rootLang();
  const lang = hasLocale(raw) ? raw : "en";
  const p = await getPageText("not-found", lang, await getDictionary(lang));
  return { title: `404 – ${p.title}`, robots: { index: false, follow: false } };
}

export default function PageNotFound() {
  return <NotFound />;
}
