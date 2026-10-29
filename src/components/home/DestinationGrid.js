import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { tr, lp } from "@/i18n/config";
import { Container, Reveal, SectionHeading } from "@/components/ui";

/**
 * Lưới điểm đến kiểu bento (mẫu khách gửi): thẻ ảnh lớn có tên vùng, tag điểm nổi bật (+n),
 * mô tả ngắn, nút "Discover now"; thẻ cuối "32+ Other location" (avatar tròn + View all).
 * `featured`: 5 điểm đến chính đã kèm tags/count; `others`: các điểm còn lại (lấy avatar).
 */
export default function DestinationGrid({ lang, dict, featured, others, total }) {
  const t = dict.home;
  // 3 cột × 2 hàng: 4 thẻ bên trái bằng nhau (2×2), Hạ Long cao 2 hàng bên phải;
  // thẻ "Other locations" là dải ngang dưới cùng, rộng bằng cả lưới
  const spans = ["", "", "lg:row-span-2", "", ""];
  const shown = others.slice(0, 6);
  const more = Math.max(0, total - shown.length);
  return (
    <section className="relative isolate overflow-hidden bg-cream-50 py-14 lg:py-[4.5rem]">
      <Container>
        <SectionHeading eyebrow={t.gridEyebrow} title={t.gridTitle} subtitle={t.gridSubtitle} />
        <div className="grid gap-4 sm:grid-cols-2 lg:auto-rows-[270px] lg:grid-cols-[1fr_1fr_0.9fr]">
          {featured.map((d, i) => (
            <Reveal
              key={d.slug}
              delay={i * 70}
              className={cn(
                // Khung bo mềm (mục 6.6): thẻ ngang bo đỉnh vừa phải (không cắt chữ); thẻ cao (Hạ Long) vòm tròn hẳn
                "group relative min-h-[280px] overflow-hidden rounded-t-[3rem] rounded-b-3xl bg-forest-900 text-white ring-1 ring-sand-300/70 lg:min-h-0",
                i === 2 && "lg:rounded-t-[999px]",
                spans[i],
              )}
            >
              <Image
                src={d.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              {/* Nội dung gọn ở nửa dưới: tên + số tour · tag · 1 dòng mô tả · Discover now */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-2xl leading-tight font-bold tracking-tight drop-shadow sm:text-[1.65rem]">
                    {d.name}
                  </h3>
                  {d.count > 0 && (
                    <span className="rounded-full bg-amber-brand px-2.5 py-0.5 text-[0.7rem] font-bold whitespace-nowrap text-ink">
                      +{d.count} {t.gridTours}
                    </span>
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {d.tags.slice(0, 3).map((tag) => (
                    <li
                      key={tag}
                      className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[0.7rem] font-medium whitespace-nowrap backdrop-blur"
                    >
                      <MapPin className="size-3" /> {tag}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 line-clamp-1 max-w-md text-sm text-white/85">{d.intro}</p>
                <Link
                  href={d.href}
                  className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/60 px-4 py-1.5 text-sm font-semibold transition after:absolute after:inset-0 hover:bg-white hover:text-forest-900"
                >
                  {t.gridDiscover} <ArrowRight className="size-4" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        {/* Dải cuối: "N+ Other locations" – rộng hết lưới, nằm dưới cùng */}
        <Reveal
          delay={featured.length * 70}
          className="relative mt-4 flex flex-col gap-5 overflow-hidden rounded-3xl bg-forest-900 p-5 text-white sm:p-6 lg:flex-row lg:items-center lg:gap-8 lg:px-8 lg:py-5"
        >
          <div className="flex shrink-0 items-baseline gap-3">
            <p className="text-5xl leading-none font-bold tracking-tight text-amber-brand">
              {total}+
            </p>
            <p className="text-lg font-semibold text-white">{t.gridOther}</p>
          </div>
          {/* hàng ảnh tròn + tên các điểm còn lại */}
          {/* căn giữa giữa khối số bên trái và nút View all bên phải */}
          <ul className="flex min-w-0 flex-1 flex-wrap gap-2 lg:flex-nowrap lg:justify-center">
            {shown.map((d, i) => (
              <li key={d.slug} className={cn("shrink-0", i >= 5 && "lg:hidden xl:block")}>
                <Link
                  href={`${lp(lang)}/destinations/${d.slug}`}
                  className="flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-sm font-medium whitespace-nowrap text-white/90 ring-1 ring-white/10 transition hover:bg-white/20"
                >
                  <span className="relative size-7 overflow-hidden rounded-full">
                    <Image src={d.image} alt="" fill sizes="28px" className="object-cover" />
                  </span>
                  {tr(d.name, lang)}
                </Link>
              </li>
            ))}
            {more > 0 && (
              <li className="shrink-0">
                <Link
                  href={`${lp(lang)}/destinations`}
                  className="flex h-9 items-center rounded-full bg-amber-brand/20 px-3.5 text-sm font-bold whitespace-nowrap text-amber-brand ring-1 ring-amber-brand/40 transition hover:bg-amber-brand hover:text-ink"
                >
                  +{more}…
                </Link>
              </li>
            )}
          </ul>
          <Link
            href={`${lp(lang)}/destinations`}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-clay-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-600 lg:self-center"
          >
            {t.gridViewAll} <ArrowRight className="size-4" />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}

/** Chuẩn hoá dữ liệu điểm đến cho lưới: tên, tags, intro theo ngôn ngữ. */
export function toGridItem(d, lang, count) {
  const tags = (d.highlights || []).map((h) => tr(h, lang));
  return {
    slug: d.slug,
    name: tr(d.name, lang),
    image: d.hero || d.image,
    intro: tr(d.intro, lang),
    tags,
    count,
    href: `${lp(lang)}/destinations/${d.slug}`,
  };
}
