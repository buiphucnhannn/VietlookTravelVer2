import { siteConfig } from "@/constants/site";
import { defaultLocale, href, localeMeta, locales } from "@/i18n/config";

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
    title: "404",
    robots: { index: false, follow: true },
    alternates: { canonical: null, languages: {} },
  };
}

/** Metadata chuẩn SEO: canonical, hreflang (en / zh-Hans / x-default), Open Graph. */
export function pageMetadata({ lang, path = "", title, description, image, type = "website" }) {
  description = clampDescription(description, lang);
  // Tiếng Anh ở gốc (/tours), tiếng Trung có /zh (/zh/tours)
  const url = (l) => href(l, path || "/");
  const languages = Object.fromEntries(locales.map((l) => [localeMeta[l].hreflang, url(l)]));
  languages["x-default"] = url(defaultLocale);
  const img = image || "/images/tours/hd/ha-long.jpg";

  // Tiêu đề dài: bỏ hậu tố " | Vietlook Travel" để Google không cắt mất nội dung chính (~65 ký tự)
  const pageTitle = typeof title === "string" && title.length > 47 ? { absolute: title } : title;

  return {
    title: pageTitle,
    description,
    alternates: { canonical: url(lang), languages },
    openGraph: {
      type,
      locale: localeMeta[lang].ogLocale,
      siteName: siteConfig.name,
      title,
      description,
      url: url(lang),
      images: [{ url: img }],
    },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}

export function JsonLd({ data }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
