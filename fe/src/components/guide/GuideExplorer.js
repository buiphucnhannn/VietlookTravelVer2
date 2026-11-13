"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn, foldSearch } from "@/lib/utils";
import PostCard from "./PostCard";

// Bỏ dấu + bỏ khoảng trắng như ô tìm tour: "ha noi" = "Hà Nội" = "hanoi", "da nang" = "Đà Nẵng"
const norm = foldSearch;

/**
 * Danh sách bài cẩm nang + tìm kiếm + lọc chuyên mục (phía client).
 * Từ khoá lưu trên URL (?q=) → chia sẻ / quay lại được kết quả tìm kiếm.
 */
export default function GuideExplorer({ lang, posts, categories, t, initialCategory = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const typing = useRef(null);
  const [q, setQState] = useState(() => params.get("q") || "");
  const [cat, setCat] = useState(initialCategory);
  const setQ = (v) => {
    setQState(v);
    setLimit(8);
    clearTimeout(typing.current);
    typing.current = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (v.trim()) next.set("q", v.trim());
      else next.delete("q");
      router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
    }, 500);
  };
  const [limit, setLimit] = useState(8);

  const list = useMemo(() => {
    const k = norm(q);
    return posts.filter(
      (p) => (!cat || p.category === cat) && (!k || norm(`${p.title} ${p.excerpt}`).includes(k)),
    );
  }, [posts, q, cat]);

  const catName = Object.fromEntries(categories.map((c) => [c.slug, c.name]));

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          {[{ slug: "", name: t.allCategories }, ...categories].map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => (setCat(c.slug), setLimit(8))}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                cat === c.slug
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-border bg-white text-ink hover:border-brand-300",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        <label className="flex h-12 items-center gap-2 rounded-full border border-border bg-white px-4 focus-within:border-brand-500 lg:w-80">
          <Search className="size-4 text-muted" />
          <span className="sr-only">{t.searchPlaceholder}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </label>
      </div>

      {list.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.slice(0, limit).map((p) => (
            <PostCard key={p.slug} post={p} lang={lang} categoryName={catName[p.category]} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl bg-surface p-10 text-center text-muted">{t.noResults}</p>
      )}

      {list.length > limit && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + 8)}
            className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            {t.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
