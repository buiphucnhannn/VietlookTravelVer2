import Image from "next/image";
import Link from "next/link";
import { lp, tr } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Container, Reveal } from "@/components/ui";

// 4 cột × 2 ô, cao thấp xen kẽ (so le kiểu Aurora) nhưng tổng chiều cao các cột bằng nhau → mép trên và dưới thẳng hàng
const heights = [
  ["lg:h-72", "lg:h-52"],
  ["lg:h-52", "lg:h-72"],
  ["lg:h-72", "lg:h-52"],
  ["lg:h-52", "lg:h-72"],
];

/** Khối chủ đề tour theo auroratravel.asia. */
export default function ThemesMasonry({ lang, dict, themes }) {
  const t = dict.home;
  const cols = [0, 2, 4, 6].map((i) => themes.slice(i, i + 2));

  return (
    <section className="relative isolate overflow-hidden bg-[#141210] py-14 text-white lg:py-[4.5rem]">
      <Image
        src="/images/tours/hd/ha-long.jpg"
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover opacity-[0.22] grayscale-[60%]"
      />
      <Container>
        <header className="mx-auto mb-8 max-w-4xl text-center lg:mb-10">
          <h2 className="inline-block text-3xl font-bold text-amber-brand uppercase sm:text-[2rem]">
            {t.themesTitle}
            <span className="mx-auto mt-1 block h-0.5 w-1/3 bg-amber-brand" />
          </h2>
          <p className="mt-4 leading-relaxed tracking-wide text-white/90 sm:text-[1.05rem]">
            {t.themesSubtitle}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-3 sm:gap-4">
              {col.map((theme, ri) => (
                <Reveal key={theme.slug} delay={(ci + ri) * 60}>
                  <Link
                    href={`${lp(lang)}/themes/${theme.slug}`}
                    className={cn(
                      "group relative block h-44 overflow-hidden rounded-md sm:h-56",
                      heights[ci][ri],
                    )}
                  >
                    <Image
                      src={theme.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-[1200ms] group-hover:scale-110"
                    />
                    <span className="absolute inset-0 bg-black/15 transition-colors duration-500 group-hover:bg-black/40" />
                    <span className="absolute inset-0 grid place-items-center px-3 text-center text-lg leading-tight font-semibold uppercase [text-shadow:0_2px_8px_rgba(0,0,0,.7)] sm:text-xl">
                      {tr(theme.name, lang)}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
