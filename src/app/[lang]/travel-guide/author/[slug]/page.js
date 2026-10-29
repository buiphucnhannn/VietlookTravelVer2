import { Suspense } from "react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { locales, tr } from "@/i18n/config";
import { pageMetadata, notFoundMetadata } from "@/lib/seo";
import { allPosts, authors } from "@/data/posts";
import { getGuideCategory } from "@/data/guide-categories";
import { Container } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import PostCard from "@/components/guide/PostCard";

export function generateStaticParams() {
  return locales.flatMap((lang) => Object.keys(authors).map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const author = authors[slug];
  if (!author) return notFoundMetadata();
  return pageMetadata({
    lang,
    path: `/travel-guide/author/${slug}`,
    title: tr(author.name, lang),
    description: tr(author.bio, lang),
  });
}

/** Trang tác giả: giới thiệu + toàn bộ bài viết của tác giả. */
async function GuideAuthorPageContent({ params }) {
  const { lang, slug } = await params;
  const author = authors[slug];
  if (!author) notFound();
  const dict = await getDictionary(lang);
  const posts = allPosts.filter((p) => p.author === slug);

  return (
    <>
      <BrushHero
        title={tr(author.name, lang)}
        subtitle={tr(author.role, lang)}
        images={posts.map((p) => p.image)}
        breadcrumbs={[
          { label: "Vietlook", href: "/" + lang },
          { label: dict.guide.title, href: "/" + lang + "/travel-guide" },
          { label: tr(author.name, lang) },
        ]}
      >
        <Image
          src={author.avatar}
          alt=""
          width={80}
          height={80}
          className="mt-5 size-16 rounded-full bg-white object-contain p-1.5 shadow-lg"
        />
        <p className="mt-4 max-w-2xl text-white/85">{tr(author.bio, lang)}</p>
        <p className="mt-2 text-sm font-semibold text-amber-brand">
          {posts.length} {dict.guide.articles}
        </p>
      </BrushHero>
      <section className="py-14 lg:py-[4.5rem]">
        <Container className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((p) => (
            <PostCard
              key={p.slug}
              post={p}
              lang={lang}
              categoryName={tr(getGuideCategory(p.category)?.name, lang)}
            />
          ))}
        </Container>
      </section>
    </>
  );
}

// Đọc params bên trong <Suspense> để điều hướng hiển thị tức thì (khung chờ),
// nội dung vẫn được prerender sẵn nhờ generateStaticParams.
export default function GuideAuthorPage(props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuideAuthorPageContent {...props} />
    </Suspense>
  );
}
