import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { tr, lp } from "@/i18n/config";
import { Container, Reveal, SectionHeading } from "@/components/ui";

/**
 * Lưới điểm đến (yêu cầu khách 11/2026): 6 ô ảnh bằng nhau — 3 cột × 2 hàng trên máy tính, 2 cột trên tablet,
 * 1 cột trên điện thoại. Mỗi ô: tên (ô ghép: "Huế – Đà Nẵng"), số tour, tag điểm nổi bật, mô tả ngắn,
 * nút "Discover now". Dưới cùng: dải "N điểm đến khác" (avatar tròn, Bắc → Nam) + View all.
 * `featured`: 6 ô đã chuẩn hoá (toGridItem); `others`: các điểm đến còn lại (lấy avatar).
 */
export default function DestinationGrid({ lang, dict, featured, others }) {
  const t = dict.home;
  const shown = others.slice(0, 6);
  const more = Math.max(0, others.length - shown.length);
  return (
    <section className="relative isolate overflow-hidden bg-cream-50 py-14 lg:py-[4.5rem]">
      <Container>
        <SectionHeading eyebrow={t.gridEyebrow} title={t.gridTitle} subtitle={t.gridSubtitle} />
        <div className="grid gap-4 sm:grid-cols-2 lg:auto-rows-[290px] lg:grid-cols-3">
          {featured.map((d, i) => (
            <Reveal
              key={d.slug}
              delay={i * 70}
              // Khung bo mềm (mục 6.6): bo đỉnh vừa phải, không cắt chữ
              className="group relative min-h-[280px] overflow-hidden rounded-t-[3rem] rounded-b-3xl bg-forest-900 text-white ring-1 ring-sand-300/70 lg:min-h-0"
            >
              <Image
                src={d.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw"
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
                {d.intro && (
                  <p className="mt-2 line-clamp-1 max-w-md text-sm text-white/85">{d.intro}</p>
                )}
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
              {others.length}
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

const tagsOf = (d, lang) => (d.highlights || []).map((h) => tr(h, lang)).filter(Boolean);

/**
 * Chuẩn hoá dữ liệu điểm đến cho lưới: tên, tags, intro theo ngôn ngữ.
 * Ô ghép (`partner`): tên "Huế – Đà Nẵng", ảnh của điểm chính, tag xen kẽ 2 điểm, bỏ mô tả (tránh rối chữ).
 */
export function toGridItem(d, lang, count, { partner, href } = {}) {
  const tags = tagsOf(d, lang);
  const item = {
    slug: d.slug,
    name: tr(d.name, lang),
    image: d.image || d.hero,
    intro: tr(d.intro, lang),
    tags,
    count,
    href: href || `${lp(lang)}/destinations/${d.slug}`,
  };
  if (!partner) return item;
  const other = tagsOf(partner, lang);
  return {
    ...item,
    name: `${item.name} – ${tr(partner.name, lang)}`,
    intro: "",
    tags: [tags[0], other[0], tags[1], other[1]].filter(Boolean),
  };
}
