import { siteConfig } from "@/constants/site";

/**
 * Favicon: file tĩnh trong public/, URL CỐ ĐỊNH (không dùng quy ước app/icon của Next — URL kèm mã băm đổi mỗi
 * lần build → Google phải đọc lại). Theo yêu cầu favicon của Google Search: khai báo <link rel="icon"> ở trang
 * chủ, ảnh vuông bội số của 48px, URL ổn định, không chuyển hướng, robots.txt cho phép.
 * favicon.ico chứa 16/32/48/256 (256 → Google đọc nhanh, nét trên màn hình độ phân giải cao).
 * Chỉ ICO + PNG (Google không đọc SVG). /favicon.ico & /apple-touch-icon.png cũng là đường dẫn trình duyệt tự tìm.
 * Đổi logo → thay 3 file public/favicon.ico, icon-192.png, apple-touch-icon.png (giữ nguyên tên);
 * biểu tượng cài app (manifest) ở public/icons/.
 */
export const ICONS = {
  icon: [
    { url: "/favicon.ico", sizes: "16x16 32x32 48x48 256x256", type: "image/x-icon" },
    { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
  ],
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
};
import { defaultLocale, fallbackLangs, href, isBlank, localeMeta, locales } from "@/i18n/config";

/**
 * Chuẩn hoá description cho Google: bỏ HTML/khoảng trắng thừa, cắt gọn ở ranh giới từ
 * (~160 ký tự tiếng Anh, ~80 ký tự tiếng Trung – mức Google thường hiển thị).
 */
export function clampDescription(text, lang = "en") {
  const clean = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const max = lang === "zh" ? 80 : 160;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const at = lang === "zh" ? cut.search(/[，。；、][^，。；、]*$/) : cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:–-]+$/, "")}…`;
}

/** Metadata cho slug không tồn tại: không index, không canonical (tránh canonical về trang chủ). */
export function notFoundMetadata() {
  return {
    // cùng tiêu đề với trang 404 chung (global-not-found.js)
    title: { absolute: "404 – Page not found | Vietlook Travel" },
    robots: { index: false, follow: true },
    alternates: { canonical: null, languages: {} },
  };
}

/** Đuôi thương hiệu có sẵn trong tiêu đề SEO web cũ (Rank Math): " - VIETLOOK TRAVEL", "| Vietlook Travel"… */
const BRAND_TAIL = /\s*[-–—|:·]\s*vietlook(\s*travel)?\s*$/i;
/** Bỏ đuôi thương hiệu (website tự thêm " | Vietlook Travel" một lần) */
export function cleanSeoTitle(v) {
  let out = String(v ?? "").trim();
  while (BRAND_TAIL.test(out)) out = out.replace(BRAND_TAIL, "").trim();
  return out;
}
/** Tiêu đề viết hoa toàn bộ ("HA GIANG EASY RIDER – 3 DAYS") */
const isShouting = (v) => {
  const letters = String(v).replace(/[^\p{L}]/gu, "");
  return (
    letters.length > 8 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()
  );
};

/**
 * Tiêu đề / mô tả Google nhập trong CMS cho tour, bài viết, trang — CHỈ lấy đúng ngôn ngữ đang xem.
 * Trống (hoặc tiêu đề viết hoa toàn bộ từ web cũ) → trả "" để trang dùng tên / tóm tắt của chính ngôn ngữ đó,
 * không mượn bản tiếng Anh cho trang tiếng Việt / tiếng Trung.
 */
export function seoField(seo, lang, key) {
  const raw = String(seo?.[lang]?.[key] ?? "").trim();
  if (!raw) return "";
  if (key !== "title") return raw;
  const t = cleanSeoTitle(raw);
  return t && !isShouting(t) ? t : "";
}

/**
 * Các ngôn ngữ có nội dung thật (đã nhập / đã dịch) của một tour, bài viết, trang chính sách.
 * Ngôn ngữ chưa có → trang đó chỉ hiện chữ thay thế từ ngôn ngữ khác: không khai báo hreflang,
 * không đưa vào sitemap, canonical trỏ về bản có nội dung. Dịch xong → tự có lại.
 * Không ngôn ngữ nào đủ điều kiện (dữ liệu thiếu) → coi như đủ cả 3, giữ cách cũ.
 */
function contentLangs(has) {
  const ok = locales.filter((l) => has(l));
  return ok.length ? ok : locales;
}
const filled = (obj, l) => !isBlank(obj?.[l]);
/** Tour: có tiêu đề + tóm tắt ở ngôn ngữ đó (dữ liệu danh sách hoặc chi tiết `content`) */
export const tourLangs = (t) =>
  contentLangs((l) =>
    t.content
      ? filled(t.content[l], "title") && filled(t.content[l], "summary")
      : filled(t.title, l) && filled(t.summary, l),
  );
/** Bài viết: có tiêu đề + đoạn mô tả ngắn (luôn đi cùng nội dung bài khi nhập / dịch) */
export const postLangs = (p) => contentLangs((l) => filled(p.title, l) && filled(p.excerpt, l));
/** Trang chính sách: có tiêu đề + nội dung */
export const policyLangs = (p) => contentLangs((l) => filled(p.title, l) && filled(p.body, l));
/** Ngôn ngữ bản chính: ngôn ngữ đang xem nếu có nội dung, không thì en → vi → zh */
export const primaryLang = (lang, langs = locales) =>
  fallbackLangs(lang).find((l) => langs.includes(l));

/**
 * Metadata chuẩn SEO: canonical, hreflang (en / zh-Hans / vi / x-default), Open Graph.
 * `langs`: các ngôn ngữ có nội dung thật (tourLangs / postLangs…) — bỏ trống = cả 3.
 */
export function pageMetadata({
  lang,
  path = "",
  title,
  description,
  image,
  type = "website",
  langs = locales,
}) {
  description = clampDescription(description, lang);
  if (typeof title === "string") title = cleanSeoTitle(title);
  // Tiếng Anh ở gốc (/tours), tiếng Trung có /zh (/zh/tours), tiếng Việt có /vi (/vi/tours)
  const url = (l) => href(l, path || "/");
  const languages = Object.fromEntries(langs.map((l) => [localeMeta[l].hreflang, url(l)]));
  languages["x-default"] = url(primaryLang(defaultLocale, langs));
  const canonical = url(primaryLang(lang, langs));
  const img = image || "/images/tours/hd/ha-long.jpg";

  // Tiêu đề dài: bỏ hậu tố " | Vietlook Travel" để Google không cắt mất nội dung chính (~65 ký tự)
  const pageTitle = typeof title === "string" && title.length > 47 ? { absolute: title } : title;

  return {
    title: pageTitle,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type,
      locale: localeMeta[lang].ogLocale,
      siteName: siteConfig.name,
      title,
      description,
      url: canonical,
      images: [{ url: img }],
    },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}

export function JsonLd({ data }) {
  // Thoát "<" để nội dung CMS có "</script>" không thể đóng thẻ sớm (chống chèn mã)
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
