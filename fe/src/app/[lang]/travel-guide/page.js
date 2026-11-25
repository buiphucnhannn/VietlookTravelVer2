import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";
import { getPageText } from "@/lib/page-copy/server";
import GuideIndex from "@/components/guide/GuideIndex";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = await getPageText("travel-guide", lang, dict);
  return pageMetadata({
    lang,
    path: "/travel-guide",
    title: p.heroTitle,
    description: p.heroIntro,
    image: p.shareImage,
  });
}

export default async function TravelGuidePage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return <GuideIndex lang={lang} dict={dict} />;
}
