import { Suspense } from "react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { fill, href, locales, lp, tr } from "@/i18n/config";
import { pageMetadata, notFoundMetadata } from "@/lib/seo";
import { Container } from "@/components/ui";
import { AdviceBox, BannerHero } from "@/components/ui/PageHero";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXCLUSIVE_THEME } from "@/constants/themes";
import TourListing from "@/components/tours/TourListing";
import { getCatalog } from "@/lib/catalog";

/**
 * Tên chủ đề để chèn vào mẫu câu "Samples of {name} tours": bỏ chữ "tour" / "线路" đã có sẵn trong tên
 * (vd. "Exclusive tours" → "Exclusive") để không lặp "Exclusive tours tours".
 */
const inSentence = (name, lang) =>
  lang === "zh"
    ? name.replace(/线路$/, "")
    : lang === "vi"
      ? name.replace(/^tour\s+/i, "")
      : name.replace(/\s+tours?$/i, "");

export async function generateStaticParams() {
  const { themes } = await getCatalog();
  return locales.flatMap((lang) => themes.map((t) => ({ lang, slug: t.slug })));
}

export async function generateMetadata({ params }) {
  const { getTheme, themes } = await getCatalog();
  const { lang, slug } = await params;
  const theme = getTheme(slug);
  if (!theme) return notFoundMetadata();
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: `/themes/${slug}`,
    title: fill(dict.theme.samples, { name: inSentence(tr(theme.name, lang), lang) }),
    description: tr(theme.intro, lang),
    image: theme.banner || theme.image,
  });
}

/** Trang chủ đề (kiểu auroratravel.asia): banner, mô tả, danh sách tour thuộc chủ đề. */
async function ThemePageContent({ params }) {
  const { getTheme, themes, toursByTheme } = await getCatalog();
  const { lang, slug } = await params;
  const theme = getTheme(slug);
  if (!theme) notFound();
  const dict = await getDictionary(lang);
  const name = tr(theme.name, lang);
  const tours = toursByTheme(slug);

  return (
    <>
      <BannerHero
        title={fill(dict.theme.samples, {
          name: lang === "zh" ? inSentence(name, lang) : inSentence(name, lang).toUpperCase(),
        })}
        subtitle={tr(theme.tagline, lang)}
        images={[theme.banner || theme.image]}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: name }]}
      />
      <section className="py-14 lg:py-[4.5rem]">
        <Container>
          <header className="mx-auto mb-10 max-w-4xl text-center">
            <h2 className="text-2xl font-semibold tracking-wide text-ink uppercase sm:text-3xl">
              {fill(dict.theme.browse, { name: inSentence(name, lang) })}
            </h2>
            <p className="mt-4 leading-relaxed text-muted sm:text-lg">{tr(theme.intro, lang)}</p>
          </header>
          {tours.length ? (
            <TourListing lang={lang} dict={dict} tours={tours} hide={["theme"]} variant="aurora" />
          ) : (
            // Chủ đề chưa gắn tour nào (vd. "Tour độc quyền" mới tạo, chờ phòng kinh doanh gắn tour)
            <AdviceBox
              title={dict.theme.emptyTitle}
              text={dict.theme.emptyText}
              cta={dict.theme.emptyCta}
              href={href(lang, "/plan-your-trip")}
            />
          )}
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
                  className={cn(
                    "group relative block h-56 w-36 shrink-0 overflow-hidden sm:w-auto",
                    // "Tour độc quyền" nổi bật: viền vàng + sao
                    t.slug === EXCLUSIVE_THEME && "ring-2 ring-amber-brand ring-inset",
                  )}
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
                  {t.slug === EXCLUSIVE_THEME && (
                    <Star
                      className="absolute top-3 left-1/2 size-5 -translate-x-1/2 fill-amber-brand text-amber-brand"
                      aria-hidden
                    />
                  )}
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
