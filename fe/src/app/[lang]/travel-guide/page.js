import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";
import GuideIndex from "@/components/guide/GuideIndex";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/travel-guide",
    title: dict.guide.title,
    description: dict.guide.intro,
  });
}

export default async function TravelGuidePage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return <GuideIndex lang={lang} dict={dict} />;
}
