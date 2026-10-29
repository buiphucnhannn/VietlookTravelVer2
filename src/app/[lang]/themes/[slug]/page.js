import { Suspense } from "react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { fill, href, locales, lp, tr } from "@/i18n/config";
import { pageMetadata, notFoundMetadata } from "@/lib/seo";
import { getTheme, themes } from "@/data/themes";
import { toursByTheme } from "@/data/tours";
import { Container } from "@/components/ui";
import { BannerHero } from "@/components/ui/PageHero";
import TourListing from "@/components/tours/TourListing";

export function generateStaticParams() {
  return locales.flatMap((lang) => themes.map((t) => ({ lang, slug: t.slug })));
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const theme = getTheme(slug);
  if (!theme) return notFoundMetadata();
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: `/themes/${slug}`,
    title: fill(dict.theme.samples, { name: tr(theme.name, lang) }),
    description: tr(theme.intro, lang),
    image: theme.banner,
  });
}

/** Trang chủ đề (kiểu auroratravel.asia): banner, mô tả, danh sách tour thuộc chủ đề. */
async function ThemePageContent({ params }) {
  const { lang, slug } = await params;
  const theme = getTheme(slug);
  if (!theme) notFound();
  const dict = await getDictionary(lang);
  const name = tr(theme.name, lang);

  return (
    <>
      <BannerHero
        title={fill(dict.theme.samples, { name: lang === "zh" ? name : name.toUpperCase() })}
        subtitle={tr(theme.tagline, lang)}
        images={[theme.banner, theme.image, ...toursByTheme(slug).map((x) => x.image)]}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: name }]}
      />
      <section className="py-14 lg:py-[4.5rem]">
        <Container>
          <header className="mx-auto mb-10 max-w-4xl text-center">
            <h2 className="text-2xl font-semibold tracking-wide text-ink uppercase sm:text-3xl">
              {fill(dict.theme.browse, { name })}
            </h2>
            <p className="mt-4 leading-relaxed text-muted sm:text-lg">{tr(theme.intro, lang)}</p>
          </header>
          <TourListing
            lang={lang}
            dict={dict}
            tours={toursByTheme(slug)}
            hide={["theme"]}
            variant="aurora"
          />
        </Container>
      </section>

      <section className="bg-[#0d1114] py-12 text-white lg:py-14">
        <Container>
          <h2 className="mb-8 text-center text-2xl font-bold tracking-wide text-amber-brand uppercase">
            {dict.theme.others}
          </h2>
          <div className="-mx-4 flex scrollbar-none gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-7">
            {themes
              .filter((t) => t.slug !== slug)
              .map((t) => (
                <Link
                  key={t.slug}
                  href={`${lp(lang)}/themes/${t.slug}`}
                  className="group relative block h-56 w-36 shrink-0 overflow-hidden sm:w-auto"
                >
                  <Image
                    src={t.image}
                    alt=""
                    fill
                    sizes="200px"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <span className="absolute inset-0 bg-black/35 group-hover:bg-brand-950/50" />
                  <span className="absolute inset-0 grid place-items-center px-2 text-center font-bold tracking-wider uppercase">
                    {tr(t.name, lang)}
                  </span>
                </Link>
              ))}
          </div>
        </Container>
      </section>
    </>
  );
}

// Đọc params bên trong <Suspense> để điều hướng hiển thị tức thì (khung chờ),
// nội dung vẫn được prerender sẵn nhờ generateStaticParams.
export default function ThemePage(props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ThemePageContent {...props} />
    </Suspense>
  );
}
