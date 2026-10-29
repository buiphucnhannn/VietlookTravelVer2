import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { lp, tr } from "@/i18n/config";
import { cn, formatDate } from "@/lib/utils";

/** Thẻ bài viết cẩm nang. */
export default function PostCard({ post, lang, categoryName, className, large }) {
  const url = `${lp(lang)}/travel-guide/${post.slug}`;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border transition hover:-translate-y-1 hover:shadow-xl",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden", large ? "aspect-[16/10]" : "aspect-[16/11]")}>
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
        <span className="absolute top-3 left-3 flex flex-col items-center rounded-lg bg-white px-2.5 py-1 text-brand-700 shadow ring-1 ring-brand-100">
          <span className="text-lg leading-none font-bold">{new Date(post.date).getDate()}</span>
          <span className="text-[0.65rem] font-semibold uppercase">
            {new Date(post.date).toLocaleString(lang === "zh" ? "zh-CN" : "en", { month: "short" })}
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {categoryName && (
          <span className="text-xs font-bold tracking-wider text-sun-500 uppercase">
            {categoryName}
          </span>
        )}
        <h3
          className={cn(
            "mt-1.5 leading-snug font-bold text-ink group-hover:text-brand-600",
            large ? "text-2xl" : "text-lg",
          )}
        >
          <Link href={url} className="after:absolute after:inset-0">
            {tr(post.title, lang)}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
          {tr(post.excerpt, lang)}
        </p>
        <span className="mt-auto flex items-center gap-1.5 pt-4 text-xs text-muted">
          <CalendarDays className="size-3.5" /> {formatDate(post.date, lang)}
        </span>
      </div>
    </article>
  );
}
