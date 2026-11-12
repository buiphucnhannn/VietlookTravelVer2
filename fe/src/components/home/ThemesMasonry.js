import Image from "next/image";
import Link from "next/link";
import { lp, tr } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Container, Reveal } from "@/components/ui";
import { Star } from "lucide-react";
import { EXCLUSIVE_THEME } from "@/constants/themes";

/**
 * Khối chủ đề tour theo auroratravel.asia. "Tour độc quyền" là thẻ NỔI BẬT NHẤT (yêu cầu khách 11/2026):
 * luôn đứng đầu, rộng 2 cột (máy tính: 2 cột × 2 hàng), viền vàng + dòng giới thiệu.
 * Các thẻ còn lại lấp đầy lưới; thẻ cuối tự giãn rộng khi hàng cuối bị thiếu ô → không có ô trống.
 *   máy tính 4 cột: [Độc quyền 2×2][1][2] / [Độc quyền][3][4] / [5][6][7 — rộng 2]
 *   tablet / điện thoại 2 cột: [Độc quyền — rộng 2] rồi từng cặp, thẻ lẻ cuối rộng 2
 */
export default function ThemesMasonry({ lang, dict, themes }) {
  const t = dict.home;
  const featured = themes.find((x) => x.slug === EXCLUSIVE_THEME);
  const rest = themes.filter((x) => x !== featured);
  const ordered = featured ? [featured, ...rest] : rest;
  // số ô đã dùng (thẻ nổi bật = 4 ô trên lưới 4 cột, 2 ô trên lưới 2 cột) → ô còn thiếu ở hàng cuối
  const lgMissing = (4 - (((featured ? 4 : 0) + rest.length) % 4)) % 4;
  const smMissing = rest.length % 2;
  const lastSpan = ["lg:col-span-1", "lg:col-span-2", "lg:col-span-3", "lg:col-span-4"][lgMissing];

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

        <div className="grid grid-flow-row-dense auto-rows-[10.5rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] sm:gap-4 lg:auto-rows-[13.5rem] lg:grid-cols-4">
          {ordered.map((theme, i) => {
            const big = theme === featured;
            const last = !big && i === ordered.length - 1;
            return (
              <Reveal
                key={theme.slug}
                delay={i * 60}
                className={cn(
                  big && "col-span-2 row-span-2 sm:row-span-1 lg:row-span-2",
                  last && smMissing && "col-span-2",
                  last && (smMissing || lgMissing) && lastSpan,
                )}
              >
                <Link
                  href={`${lp(lang)}/themes/${theme.slug}`}
                  className={cn(
                    "group relative block size-full overflow-hidden rounded-md",
                    big && "ring-2 ring-amber-brand ring-offset-2 ring-offset-[#141210]",
                  )}
                >
                  <Image
                    src={theme.image}
                    alt=""
                    fill
                    sizes={
                      big ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"
                    }
                    className="object-cover transition-transform duration-[1200ms] group-hover:scale-110"
                  />
                  <span
                    className={cn(
                      "absolute inset-0 transition-colors duration-500",
                      big
                        ? "bg-gradient-to-t from-black/70 via-black/25 to-black/10 group-hover:bg-black/30"
                        : "bg-black/15 group-hover:bg-black/40",
                    )}
                  />
                  {big ? (
                    <span className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center [text-shadow:0_2px_10px_rgba(0,0,0,.75)]">
                      <span className="mb-3 grid size-10 place-items-center rounded-full bg-amber-brand text-ink shadow-lg">
                        <Star className="size-5 fill-current" aria-hidden />
                      </span>
                      <span className="text-2xl leading-tight font-bold uppercase sm:text-3xl lg:text-4xl">
                        {tr(theme.name, lang)}
                      </span>
                      {tr(theme.tagline, lang) && (
                        <span className="mt-2 max-w-sm text-sm text-white/90 sm:text-base">
                          {tr(theme.tagline, lang)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="absolute inset-0 grid place-items-center px-3 text-center text-lg leading-tight font-semibold uppercase [text-shadow:0_2px_8px_rgba(0,0,0,.7)] sm:text-xl">
                      {tr(theme.name, lang)}
                    </span>
                  )}
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
