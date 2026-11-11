import { Suspense } from "react";
import Link from "next/link";
import { href, lp, tr } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { getCatalog } from "@/lib/catalog";
import { Container } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import GuideExplorer from "./GuideExplorer";
import PostCard from "./PostCard";

/** Trang danh sách cẩm nang (dùng chung cho /travel-guide và /travel-guide/category/[slug]). */
export default async function GuideIndex({ lang, dict, category }) {
  const { guideCategories, allPosts } = await getCatalog();
  const g = dict.guide;
  const cats = guideCategories.map((c) => ({ slug: c.slug, name: tr(c.name, lang) }));
  // Chỉ gửi xuống trình duyệt đúng các trường thẻ bài viết cần, chữ đã chọn sẵn theo ngôn ngữ
  // (hàng trăm bài × 3 ngôn ngữ → giảm mạnh dung lượng trang)
  const posts = allPosts.map((p) => ({
    slug: p.slug,
    category: p.category,
    image: p.image,
    date: p.date,
    title: tr(p.title, lang),
    excerpt: tr(p.excerpt, lang),
  }));
  const inCat = category ? posts.filter((p) => p.category === category.slug) : posts;
  const title = category ? tr(category.name, lang) : g.title;

  return (
    <>
      <BrushHero
        title={title}
        subtitle={category ? tr(category.description, lang) : g.intro}
        images={inCat.map((p) => p.image).filter(Boolean)}
        breadcrumbs={[
          { label: "Vietlook", href: href(lang) },
          ...(category ? [{ label: g.title, href: `${lp(lang)}/travel-guide` }] : []),
          { label: title },
        ]}
      >
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {cats.map((c) => (
            <Link
              key={c.slug}
              href={`${lp(lang)}/travel-guide/category/${c.slug}`}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur transition",
                category?.slug === c.slug
                  ? "bg-white text-brand-800"
                  : "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25",
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </BrushHero>

      <section className="py-14 lg:py-[4.5rem]">
        <Container>
          {/* Phần dựng sẵn trên server (đọc ?q= chỉ có ở trình duyệt): liệt kê bài để công cụ tìm kiếm đọc được */}
          <Suspense
            fallback={
              <div className="mt-[4.5rem] grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inCat.slice(0, 8).map((p) => (
                  <PostCard key={p.slug} post={p} lang={lang} />
                ))}
              </div>
            }
          >
            <GuideExplorer
              lang={lang}
              posts={posts}
              categories={cats}
              t={g}
              initialCategory={category?.slug || ""}
            />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
