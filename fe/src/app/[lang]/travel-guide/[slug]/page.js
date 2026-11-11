import { Suspense } from "react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, ListOrdered, Languages } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { fill, localeMeta, locales, lp, tr } from "@/i18n/config";
import { cardLabels } from "@/lib/labels";
import { slugify } from "@/lib/utils";
import { fmtDate } from "@/lib/dates";
import { JsonLd, pageMetadata, notFoundMetadata, postLangs, seoField } from "@/lib/seo";
import { siteConfig } from "@/constants/site";
import { Button, Container, SectionHeading } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import PostCard from "@/components/guide/PostCard";
import TourCard from "@/components/tours/TourCard";
import { getCatalog, getPost, readingTime } from "@/lib/catalog";

export async function generateStaticParams() {
  const { allPosts } = await getCatalog();
  return locales.flatMap((lang) => allPosts.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const post = await getPost(slug);
  if (!post) return notFoundMetadata();
  return {
    ...pageMetadata({
      lang,
      path: `/travel-guide/${slug}`,
      title: seoField(post.seo, lang, "title") || tr(post.title, lang),
      description: seoField(post.seo, lang, "description") || tr(post.excerpt, lang),
      image: post.image,
      type: "article",
      langs: postLangs(post),
    }),
  };
}

/** Gắn id cho các thẻ h2 để làm mục lục. */
function withAnchors(html) {
  const toc = [];
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = slugify(text) || `section-${toc.length + 1}`;
    toc.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

async function GuidePostPageContent({ params }) {
  const {
    destinationsByRegion,
    getDestination,
    regions,
    getGuideCategory,
    authors,
    relatedPosts,
    toCard,
    toursByDestination,
    allTours,
  } = await getCatalog();
  const { lang, slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const dict = await getDictionary(lang);
  const g = dict.guide;
  const title = tr(post.title, lang);
  const category = getGuideCategory(post.category);
  // Tác giả bị ẩn trong CMS → dùng "Vietlook Travel Team" (tránh lỗi trang), link về trang cẩm nang
  const authorSlug = authors[post.author] ? post.author : "vietlook-team";
  const author = authors[authorSlug] ?? { name: dict.common.team };
  const authorAvatar = author.avatar || "/images/logo/vietlook-icon.png";
  const authorHref = authors[authorSlug]
    ? `${lp(lang)}/travel-guide/author/${authorSlug}`
    : `${lp(lang)}/travel-guide`;
  const absUrl = (u) => (/^https?:\/\//.test(u) ? u : `${siteConfig.url}${u}`);
  const rawBody = tr(post.body, lang);
  const { html, toc } = withAnchors(rawBody);
  const untranslated = !post.body[lang]?.trim() && !!rawBody;
  const related = relatedPosts(post, 3);
  const dest = post.destination && getDestination(post.destination);
  const tours = (dest ? toursByDestination(dest.slug) : allTours)
    .filter((t) => t.price)
    .slice(0, 3)
    .map((t) => toCard(t, lang));
  const labels = cardLabels(dict);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    ...(post.image && { image: [absUrl(post.image)] }),
    datePublished: post.date,
    dateModified: post.updatedAt ? String(post.updatedAt).slice(0, 10) : post.date,
    inLanguage: localeMeta[lang].hreflang,
    author: { "@type": "Organization", name: tr(author.name, lang) },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}/images/logo/vietlook-logo.png` },
    },
    mainEntityOfPage: `${siteConfig.url}${lp(lang)}/travel-guide/${slug}`,
  };

  return (
    <>
      <JsonLd data={articleLd} />

      {/* Hero dùng chung: ảnh bài viết + tiêu đề + thông tin tác giả */}
      <BrushHero
        compact
        title={title}
        images={post.image ? [post.image] : []}
        baseUrl={siteConfig.url}
        breadcrumbs={[
          { label: g.title, href: `${lp(lang)}/travel-guide` },
          // bài chưa chọn chuyên mục → bỏ mục chuyên mục trong breadcrumb
          ...(category
            ? [
                {
                  label: tr(category.name, lang),
                  href: `${lp(lang)}/travel-guide/category/${category.slug}`,
                },
              ]
            : []),
          { label: title },
        ]}
      >
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/85">
          <span className="flex items-center gap-2">
            <Image
              src={authorAvatar}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-full bg-white object-contain p-0.5"
            />
            {dict.common.by}{" "}
            <Link href={authorHref} className="font-bold text-white hover:text-amber-brand">
              {tr(author.name, lang)}
            </Link>
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" /> {fmtDate(post.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" /> {readingTime(rawBody)} {dict.common.minRead}
          </span>
        </div>
      </BrushHero>

      <Container className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-12">
        <article className="min-w-0">
          {untranslated && (
            <p className="mb-6 flex items-center gap-2 rounded-xl bg-amber-brand/15 px-4 py-3 text-sm text-ink">
              <Languages className="size-4 text-[#a26a00]" /> {g.translationPending}
            </p>
          )}
          <p className="text-xl leading-relaxed text-ink/85">{tr(post.excerpt, lang)}</p>
          <p className="mt-4 text-sm text-muted italic">
            {dict.common.lastUpdated}: {fmtDate(post.date)}
          </p>

          {toc.length > 1 && (
            <details open className="group mt-6 rounded-xl border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-ink">
                <span className="flex items-center gap-2">
                  <ListOrdered className="size-4 text-brand-500" /> {g.toc}
                </span>
                <span className="transition group-open:rotate-180">⌃</span>
              </summary>
              <ol className="list-decimal space-y-1.5 border-t border-border px-10 py-4 marker:text-brand-500">
                {toc.map((x) => (
                  <li key={x.id}>
                    <a href={`#${x.id}`} className="text-brand-700 hover:text-sun-500">
                      {x.text}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {/* Hộp CTA (thay cho ô ebook của localvietnam) */}
          <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border-2 border-ink bg-[#fffbe6] p-5 sm:flex-row">
            <Image
              src="/images/logo/vietlook-icon.png"
              alt=""
              width={64}
              height={64}
              className="size-16"
            />
            <div className="flex-1 text-center sm:text-left">
              <p className="text-lg font-bold text-brand-700">{g.ebookTitle}</p>
              <p className="text-sm text-muted">{g.ebookText}</p>
            </div>
            <Button href={`${lp(lang)}/plan-your-trip`} variant="primary">
              {dict.nav.planTrip}
            </Button>
          </div>

          <div className="prose-guide mt-8" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="mt-12 flex gap-5 rounded-2xl bg-surface p-6">
            <Image
              src={authorAvatar}
              alt=""
              width={64}
              height={64}
              className="size-16 shrink-0 rounded-full bg-white object-contain p-1 ring-1 ring-border"
            />
            <div>
              <p className="text-xs font-bold tracking-wider text-sun-500 uppercase">
                {g.aboutAuthor}
              </p>
              <Link
                href={authorHref}
                className="mt-1 block text-lg font-bold text-ink hover:text-brand-600"
              >
                {tr(author.name, lang)}
              </Link>
              <p className="text-sm text-brand-600">{tr(author.role, lang)}</p>
              <p className="mt-2 text-muted">{tr(author.bio, lang)}</p>
            </div>
          </div>
        </article>

        {/* Sidebar kiểu localvietnam */}
        <aside className="space-y-5 lg:sticky lg:top-36 lg:self-start">
          <p className="text-xl font-semibold text-ink">{g.sidebarTitle}</p>
          {regions.map((r) => (
            <div key={r.slug} className="rounded-3xl bg-surface p-6">
              <p className="mb-3 font-bold text-ink">{tr(r.name, lang)}</p>
              <ul className="divide-y divide-border">
                {destinationsByRegion(r.slug)
                  .slice(0, 6)
                  .map((d) => (
                    <li key={d.slug}>
                      <Link
                        href={`${lp(lang)}/destinations/${d.slug}`}
                        className="block py-2 text-muted hover:text-brand-600"
                      >
                        {tr(d.name, lang)}
                      </Link>
                    </li>
                  ))}
                <li>
                  <Link
                    href={`${lp(lang)}/destinations/${r.slug}`}
                    className="block py-2 font-medium text-ink hover:text-brand-600"
                  >
                    {fill(dict.destination.regionTours, { name: tr(r.name, lang) })}
                  </Link>
                </li>
              </ul>
            </div>
          ))}
        </aside>
      </Container>

      {tours.length > 0 && (
        <section className="bg-brand-50 py-14 lg:py-[4.5rem]">
          <Container>
            <SectionHeading title={g.relatedTours} />
            <div className="rail grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((c) => (
                <TourCard key={c.slug} card={c} lang={lang} labels={labels} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="py-14 lg:py-[4.5rem]">
        <Container>
          <SectionHeading title={g.related} />
          <div className="rail grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PostCard
                key={p.slug}
                post={p}
                lang={lang}
                categoryName={tr(getGuideCategory(p.category)?.name, lang)}
              />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

// Đọc params bên trong <Suspense> để điều hướng hiển thị tức thì (khung chờ),
// nội dung vẫn được prerender sẵn nhờ generateStaticParams.
export default function GuidePostPage(props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidePostPageContent {...props} />
    </Suspense>
  );
}
