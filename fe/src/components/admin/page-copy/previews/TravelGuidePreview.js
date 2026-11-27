"use client";

import { Search } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { tr } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { BrushHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui";
import PostCard from "@/components/guide/PostCard";
import { Img, PreviewImage, Shown, Txt } from "../blocks";
import { Auto, Loading, SitePage, Zone, useCatalog } from "./site-frame";

/**
 * Bản xem trước trang Cẩm nang du lịch — dựng y như components/guide/GuideIndex.js (+ GuideExplorer).
 * Ảnh nền đầu trang = ảnh các bài viết, nút chuyên mục, thẻ bài viết: dữ liệu mục Bài viết / Chuyên mục (chỉ xem).
 * Sửa được: tiêu đề, giới thiệu, chữ thanh lọc / ô tìm kiếm / nút xem thêm; thông báo không có kết quả và ảnh chia sẻ
 * link (không có chỗ hiện trên trang) ở ô dưới chân trang.
 */

const ARTICLES = `${ADMIN_BASE}/articles`;

export default function TravelGuidePreview({ lang }) {
  const catalog = useCatalog();
  const cats = (catalog?.guideCategories ?? []).map((c) => ({
    slug: c.slug,
    name: tr(c.name, lang),
  }));
  const posts = (catalog?.allPosts ?? []).map((p) => ({
    slug: p.slug,
    category: p.category,
    image: p.image,
    date: p.date,
    title: tr(p.title, lang),
    excerpt: tr(p.excerpt, lang),
  }));
  const catName = Object.fromEntries(cats.map((c) => [c.slug, c.name]));

  return (
    <SitePage
      lang={lang}
      path="/travel-guide"
      extras={
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p className="mb-2 text-xs font-semibold text-slate-600">
              Thông báo khi khách tìm không thấy bài viết
            </p>
            <p className="rounded-2xl bg-surface p-6 text-center text-muted">
              <Txt f="noResults" />
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p className="mb-2 text-xs font-semibold text-slate-600">
              Ảnh hiện khi chia sẻ link trang (Facebook, Zalo…)
            </p>
            <Img f="shareImage" aspect="aspect-[1200/630]" />
          </div>
        </div>
      }
    >
      <Zone name="Đầu trang" dark at="left-3 top-20 lg:top-[7.25rem]">
        <BrushHero
          ImageComponent={PreviewImage}
          title={<Txt f="heroTitle" dark />}
          subtitle={<Txt f="heroIntro" dark />}
          images={posts.map((p) => p.image).filter(Boolean)}
          breadcrumbs={[{ label: "Vietlook", href: "#" }, { label: <Shown f="heroTitle" /> }]}
        >
          <Auto
            dark
            href={`${ADMIN_BASE}/taxonomy`}
            label="Chuyên mục · sửa ở mục Chuyên mục"
            at="-bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {cats.map((c) => (
                <span
                  key={c.slug}
                  className="rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white ring-1 ring-white/30 backdrop-blur"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </Auto>
        </BrushHero>
      </Zone>

      <Zone name="Danh sách bài viết">
        <section className="py-14 lg:py-[4.5rem]">
          <Container>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                <span className="shrink-0 rounded-full border border-brand-600 bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                  <Txt f="allCategories" dark />
                </span>
                {cats.map((c) => (
                  <span
                    key={c.slug}
                    className="shrink-0 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-ink"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
              <span className="flex h-12 items-center gap-2 rounded-full border border-border bg-white px-4 lg:w-80">
                <Search className="size-4 shrink-0 text-muted" />
                <span className="w-full text-sm text-muted">
                  <Txt f="searchPlaceholder" />
                </span>
              </span>
            </div>

            {catalog ? (
              <Auto
                href={ARTICLES}
                label="Bài viết mới nhất · sửa ở mục Bài viết"
                at="bottom-0 right-0 translate-y-[calc(100%+10px)]"
                className={cn("mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}
              >
                {posts.slice(0, 8).map((p) => (
                  <PostCard key={p.slug} post={p} lang={lang} categoryName={catName[p.category]} />
                ))}
              </Auto>
            ) : (
              <Loading className="mt-8 min-h-[720px]" />
            )}

            {posts.length > 8 && (
              <div className="mt-10 text-center">
                <span className="inline-block rounded-md bg-brand-600 px-6 py-3 font-semibold text-white">
                  <Txt f="loadMore" dark />
                </span>
              </div>
            )}
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
