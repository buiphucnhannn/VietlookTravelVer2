import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { lp, tr } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { fmtDate, fmtDayMonth } from "@/lib/dates";
import { subgrid } from "@/lib/subgrid";

/**
 * Thẻ bài viết cẩm nang. Trong lưới (từ sm): subgrid ảnh · chuyên mục · tiêu đề · tóm tắt · ngày →
 * tiêu đề 2–3 dòng không làm lệch tóm tắt/ngày của thẻ bên cạnh. Có truyền prop categoryName (kể cả
 * rỗng) → luôn giữ hàng chuyên mục để các thẻ cùng lưới có cùng số hàng.
 */
export default function PostCard(props) {
  const { post, lang, categoryName, className, large } = props;
  const url = `${lp(lang)}/travel-guide/${post.slug}`;
  const catRow = "categoryName" in props;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border transition hover:-translate-y-1 hover:shadow-xl",
        subgrid(catRow ? 5 : 4, "sm"),
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-cream-100 to-sand-300/40",
          large ? "aspect-[16/10]" : "aspect-[16/11]",
        )}
      >
        {post.image && (
          <Image
            src={post.image}
            alt=""
            fill
            sizes={
              large
                ? "(min-width: 1024px) 50vw, 100vw"
                : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            }
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        {post.date && (
          <span className="absolute top-3 left-3 flex flex-col items-center rounded-lg bg-white px-2.5 py-1 text-brand-700 shadow ring-1 ring-brand-100">
            {/* ngày + tháng trên (en 11/14 · vi 14/11 · zh 11月14日), năm dưới — không dùng tên tháng */}
            <span className="text-base leading-none font-bold tabular-nums">
              {fmtDayMonth(post.date, lang)}
            </span>
            <span className="mt-0.5 text-[0.65rem] font-semibold tabular-nums">
              {String(post.date).slice(0, 4)}
              {lang === "zh" ? "年" : ""}
            </span>
          </span>
        )}
      </div>
      {/* Mỗi phần tử con dưới đây = 1 hàng của subgrid */}
      {catRow && (
        <span className="px-5 pt-5 text-xs font-bold tracking-wider text-sun-500 uppercase">
          {categoryName}
        </span>
      )}
      <h3
        className={cn(
          "mt-1.5 px-5 leading-snug font-bold text-ink group-hover:text-brand-600",
          !catRow && "pt-5",
          large ? "text-2xl" : "text-lg",
        )}
      >
        <Link href={url} className="after:absolute after:inset-0">
          {tr(post.title, lang)}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 px-5 text-sm leading-relaxed text-muted">
        {tr(post.excerpt, lang)}
      </p>
      {post.date ? (
        <span className="mt-auto flex items-center gap-1.5 px-5 pt-4 pb-5 text-xs text-muted">
          <CalendarDays className="size-3.5" /> {fmtDate(post.date, lang)}
        </span>
      ) : (
        <span aria-hidden className="pb-5" />
      )}
    </article>
  );
}
