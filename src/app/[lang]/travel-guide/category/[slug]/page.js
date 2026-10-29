import { Suspense } from "react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { locales, tr } from "@/i18n/config";
import { pageMetadata, notFoundMetadata } from "@/lib/seo";
import { getGuideCategory, guideCategories } from "@/data/guide-categories";
import GuideIndex from "@/components/guide/GuideIndex";

export function generateStaticParams() {
  return locales.flatMap((lang) => guideCategories.map((c) => ({ lang, slug: c.slug })));
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const cat = getGuideCategory(slug);
  if (!cat) return notFoundMetadata();
  return pageMetadata({
    lang,
    path: `/travel-guide/category/${slug}`,
    title: tr(cat.name, lang),
    description:
      lang === "zh"
        ? `${tr(cat.description, lang)}来自河内本地团队的越南旅游攻略。`
        : `${tr(cat.description, lang)} Vietnam travel guide by our local team in Hanoi.`,
  });
}

async function GuideCategoryPageContent({ params }) {
  const { lang, slug } = await params;
  const category = getGuideCategory(slug);
  if (!category) notFound();
  const dict = await getDictionary(lang);
  return <GuideIndex lang={lang} dict={dict} category={category} />;
}

// Đọc params bên trong <Suspense> để điều hướng hiển thị tức thì (khung chờ),
// nội dung vẫn được prerender sẵn nhờ generateStaticParams.
export default function GuideCategoryPage(props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuideCategoryPageContent {...props} />
    </Suspense>
  );
}
