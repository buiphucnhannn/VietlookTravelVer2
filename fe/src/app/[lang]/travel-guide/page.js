import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata, seoField } from "@/lib/seo";
import { getPageSeo, getPageText } from "@/lib/page-copy/server";
import GuideIndex from "@/components/guide/GuideIndex";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = await getPageText("travel-guide", lang, dict);
  const seo = await getPageSeo("travel-guide"); // CMS → Giao diện trang → Hiển thị trên Google
  return pageMetadata({
    lang,
    path: "/travel-guide",
    title: seoField(seo, lang, "title") || p.heroTitle,
    description: seoField(seo, lang, "description") || p.heroIntro,
    image: p.shareImage,
  });
}

export default async function TravelGuidePage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return <GuideIndex lang={lang} dict={dict} />;
}
