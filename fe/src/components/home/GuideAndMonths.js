import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { lp, tr } from "@/i18n/config";
import { Button, Container, HandNote, SectionHeading } from "@/components/ui";
import Carousel from "@/components/ui/Carousel";
import BgImage from "@/components/ui/BgImage";

/** Thẻ bài cẩm nang kiểu localvietnam: ảnh + tiêu đề đậm + nút mũi tên tròn. */
function GuideCard({ post, lang }) {
  return (
    <Link
      href={`${lp(lang)}/travel-guide/${post.slug}`}
      className="group flex h-full w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border transition hover:-translate-y-1 hover:shadow-lg sm:w-auto"
    >
      <span className="relative block aspect-[16/10] overflow-hidden">
        <Image
          src={post.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </span>
      <span className="flex flex-1 items-start gap-3 p-5">
        <span className="line-clamp-3 flex-1 leading-snug font-bold text-ink group-hover:text-forest-700">
          {tr(post.title, lang)}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream-100 text-forest-700 transition group-hover:bg-forest-700 group-hover:text-white">
          <ArrowRight className="size-4" />
        </span>
      </span>
    </Link>
  );
}

/** Cẩm nang mới nhất + "Vietnam per month" (theo localvietnam.com). */
export default function GuideAndMonths({ lang, dict, posts, months }) {
  const t = dict.home;
  return (
    <>
      <section className="relative py-14 lg:py-[4.5rem]">
        <Container className="relative">
          <HandNote className="top-0 right-0 text-right">{t.guideNote}</HandNote>
          <SectionHeading
            eyebrow={t.guideEyebrow}
            title={t.guideTitle}
            subtitle={t.guideSubtitle}
          />
          {/* Mobile: vuốt ngang; từ tablet: lưới */}
          <div className="-mx-4 flex snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {posts.map((p) => (
              <GuideCard key={p.slug} post={p} lang={lang} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button href={`${lp(lang)}/travel-guide`} variant="primary">
              {t.guideCta}
            </Button>
          </div>
        </Container>
      </section>

      <section className="relative isolate overflow-hidden">
        <BgImage src="/images/tours/hd/doi-che-moc-chau.jpg" tone="light" />
        <Container className="relative pt-6 pb-14 lg:pt-8 lg:pb-[4.5rem]">
          <HandNote className="top-10 left-0" arrow="below-left">
            {t.monthNote}
          </HandNote>
          <SectionHeading
            eyebrow={t.monthEyebrow}
            title={t.monthTitle}
            subtitle={t.monthSubtitle}
          />
          <Carousel
            itemClassName="basis-[80%] sm:basis-1/2 lg:basis-1/4"
            autoplay={7000}
            label={t.monthTitle}
          >
            {months.map((m, i) => (
              <article
                key={m.slug}
                className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5"
              >
                <span className="relative block aspect-[3/2]">
                  <Image
                    src={m.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 80vw"
                    className="object-cover"
                  />
                </span>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-2xl font-bold text-ink">{dict.guide.months[i]}</h3>
                  <p className="mt-2 flex-1 text-muted">{t.monthShort[i]}</p>
                  <Link
                    href={`${lp(lang)}/travel-guide/${m.slug}`}
                    className="mt-5 inline-flex items-center gap-2 font-semibold text-forest-700 hover:text-sun-500"
                  >
                    {dict.common.readMore} <ArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </Carousel>
        </Container>
      </section>
    </>
  );
}
