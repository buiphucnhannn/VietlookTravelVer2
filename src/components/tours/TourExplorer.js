"use client";

import { useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { smoothScrollTo } from "@/components/fx/SmoothScroll";
import TourCard, { AuroraTourCard } from "./TourCard";

// 2 hàng mỗi trang để lưới vừa khoảng một màn hình (4 cột thường / 3 cột kiểu Aurora)
const PAGE_SIZE = { default: 8, aurora: 6 };

const durationMatch = {
  1: (d) => d <= 1,
  "2-4": (d) => d >= 2 && d <= 4,
  "5-7": (d) => d >= 5 && d <= 7,
  "8-14": (d) => d >= 8 && d <= 14,
  "15+": (d) => d >= 15,
};
const priceMatch = {
  "0-100": (p) => p != null && p < 100,
  "100-500": (p) => p != null && p >= 100 && p < 500,
  "500-1000": (p) => p != null && p >= 500 && p < 1000,
  "1000+": (p) => p != null && p >= 1000,
};

const normalize = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Danh sách tour + bộ lọc (điểm đến, chủ đề, số ngày, khoảng giá) + tìm kiếm + phân trang.
 * Trạng thái lọc lưu trên URL (?q=&destination=&theme=&duration=&price=&sort=&page=).
 */
export default function TourExplorer({
  lang,
  cards,
  labels,
  t,
  destinationOptions,
  themeOptions,
  hide = [],
  badgeFor,
  variant,
}) {
  const router = useRouter();
  const root = useRef(null);
  const qRef = useRef(null);
  const typing = useRef(null);
  const pathname = usePathname();
  const params = useSearchParams();

  const f = {
    q: params.get("q") || "",
    destination: params.get("destination") || "",
    theme: params.get("theme") || "",
    duration: params.get("duration") || "",
    price: params.get("price") || "",
    sort: params.get("sort") || "popular",
    page: Math.max(1, Number(params.get("page")) || 1),
  };

  const update = (patch) => {
    const next = new URLSearchParams(params.toString());
    Object.entries({ ...patch, page: patch.page ?? "" }).forEach(([k, v]) =>
      v ? next.set(k, String(v)) : next.delete(k),
    );
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    const q = normalize(f.q);
    const regionSlugs = new Set(destinationOptions.filter((o) => o.region).map((o) => o.value));
    let list = cards.filter((c) => {
      if (
        q &&
        !normalize(
          `${c.title} ${c.summary} ${c.destinationNames.join(" ")} ${c.code || ""}`,
        ).includes(q)
      )
        return false;
      if (f.destination) {
        const ok = regionSlugs.has(f.destination)
          ? c.regions.includes(f.destination)
          : c.destinations.includes(f.destination);
        if (!ok) return false;
      }
      if (f.theme && !c.themes.includes(f.theme)) return false;
      if (f.duration && !durationMatch[f.duration]?.(c.days)) return false;
      if (f.price && !priceMatch[f.price]?.(c.price)) return false;
      return true;
    });
    const byPrice = (dir) => (a, b) => (a.price ?? 1e9 * dir) - (b.price ?? 1e9 * dir);
    if (f.sort === "price-asc") list = [...list].sort(byPrice(1));
    if (f.sort === "price-desc") list = [...list].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    if (f.sort === "duration") list = [...list].sort((a, b) => a.days - b.days);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, f.q, f.destination, f.theme, f.duration, f.price, f.sort]);

  const size = PAGE_SIZE[variant] || PAGE_SIZE.default;
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const page = Math.min(f.page, pages);
  const shown = filtered.slice((page - 1) * size, page * size);
  const active = ["q", "destination", "theme", "duration", "price"].some((k) => f[k]);

  const pagerBtn =
    "grid size-9 place-items-center rounded-lg border border-border bg-white transition sm:size-10 hover:border-brand-300 disabled:pointer-events-none disabled:opacity-40";
  const selectCls =
    "h-12 w-full appearance-none border-0 bg-transparent px-4 pr-9 text-[0.95rem] font-medium text-ink focus:outline-none";
  const wrap =
    "relative min-w-0 flex-1 border-border bg-white after:pointer-events-none after:absolute after:top-1/2 after:right-3 after:size-2 after:-translate-y-[70%] after:rotate-45 after:border-r-2 after:border-b-2 after:border-ink/60 lg:border-l";

  // Chuyển trang: cuộn về đầu khối lọc thay vì đầu trang
  const goPage = (p) => {
    update({ page: p > 1 ? p : "" });
    if (root.current) smoothScrollTo(root.current);
  };

  return (
    <div ref={root} className="scroll-mt-32">
      {/* Thanh lọc kiểu auroratravel.asia */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border">
        <div className="flex flex-col lg:flex-row">
          <span className="flex h-12 items-center gap-2 bg-amber-brand px-5 font-bold tracking-wide text-ink uppercase lg:h-auto">
            <SlidersHorizontal className="size-4" /> {t.filters}
          </span>
          <div className="grid flex-1 grid-cols-2 divide-y divide-border lg:flex lg:divide-y-0">
            {!hide.includes("destination") && (
              <label className={wrap}>
                <span className="sr-only">{t.destination}</span>
                <select
                  className={selectCls}
                  value={f.destination}
                  onChange={(e) => update({ destination: e.target.value })}
                >
                  <option value="">
                    {t.destination}: {t.any}
                  </option>
                  {destinationOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.region ? `— ${o.label} —` : o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!hide.includes("theme") && (
              <label className={wrap}>
                <span className="sr-only">{t.theme}</span>
                <select
                  className={selectCls}
                  value={f.theme}
                  onChange={(e) => update({ theme: e.target.value })}
                >
                  <option value="">
                    {t.theme}: {t.any}
                  </option>
                  {themeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className={wrap}>
              <span className="sr-only">{t.duration}</span>
              <select
                className={selectCls}
                value={f.duration}
                onChange={(e) => update({ duration: e.target.value })}
              >
                <option value="">
                  {t.duration}: {t.any}
                </option>
                {Object.entries(t.durations).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className={wrap}>
              <span className="sr-only">{t.priceRange}</span>
              <select
                className={selectCls}
                value={f.price}
                onChange={(e) => update({ price: e.target.value })}
              >
                <option value="">
                  {t.priceRange}: {t.any}
                </option>
                {Object.entries(t.prices).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <form
            className="flex items-center gap-2 border-t border-border px-3 lg:border-t-0 lg:border-l"
            onSubmit={(e) => {
              e.preventDefault();
              clearTimeout(typing.current);
              update({ q: qRef.current.value.trim() });
            }}
          >
            <Search className="size-4 shrink-0 text-muted" />
            {/* Tự lọc sau khi ngừng gõ ~0,5 giây (không cần bấm Enter) */}
            <input
              ref={qRef}
              name="q"
              type="search"
              defaultValue={f.q}
              onChange={(e) => {
                const v = e.target.value.trim();
                clearTimeout(typing.current);
                typing.current = setTimeout(() => v !== f.q && update({ q: v }), 500);
              }}
              placeholder={t.searchPlaceholder}
              className="h-12 w-full min-w-0 bg-transparent text-sm focus:outline-none lg:w-56"
            />
          </form>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">
          <strong className="text-lg text-ink">{filtered.length}</strong> {t.results}
          {active && (
            <button
              type="button"
              onClick={() => {
                if (qRef.current) qRef.current.value = "";
                router.replace(pathname, { scroll: false });
              }}
              className="ml-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sun-500 hover:underline"
            >
              <RotateCcw className="size-3.5" /> {t.reset}
            </button>
          )}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          {t.sortBy}
          <select
            value={f.sort}
            onChange={(e) => update({ sort: e.target.value === "popular" ? "" : e.target.value })}
            className="h-10 rounded-lg border border-border bg-white px-3 font-medium text-ink"
          >
            <option value="popular">{t.sortPopular}</option>
            <option value="price-asc">{t.sortPriceAsc}</option>
            <option value="price-desc">{t.sortPriceDesc}</option>
            <option value="duration">{t.sortDuration}</option>
          </select>
        </label>
      </div>

      {shown.length > 0 ? (
        <div
          className={cn(
            "mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
            variant === "aurora" ? "gap-x-8 gap-y-10" : "xl:grid-cols-4",
          )}
        >
          {shown.map((card, i) =>
            variant === "aurora" ? (
              <AuroraTourCard key={card.slug} card={card} lang={lang} labels={labels} />
            ) : (
              <TourCard
                key={card.slug}
                card={card}
                lang={lang}
                labels={labels}
                badge={badgeFor?.(card)}
                priority={i < 4}
              />
            ),
          )}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl bg-surface p-10 text-center text-muted">{t.noResults}</p>
      )}

      {pages > 1 && (
        <nav
          className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-3"
          aria-label="Pagination"
        >
          {/* mobile: bỏ nút Đầu/Cuối (đã có ô nhảy trang) để hàng nút không tràn ngang */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {[
              { icon: ChevronsLeft, to: 1, label: "First", off: page <= 1 },
              { icon: ChevronLeft, to: page - 1, label: "Previous", off: page <= 1 },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                disabled={b.off}
                onClick={() => goPage(b.to)}
                className={cn(pagerBtn, /First|Last/.test(b.label) && "max-sm:hidden")}
                aria-label={b.label}
              >
                <b.icon className="size-4" />
              </button>
            ))}
            {/* Trang đầu, trang cuối và 2 trang mỗi bên trang hiện tại */}
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2)
              .map((p, i, arr) => (
                <span key={p} className="flex items-center gap-1 sm:gap-1.5">
                  {i > 0 && p - arr[i - 1] > 1 && <span className="px-0.5 text-muted">…</span>}
                  <button
                    type="button"
                    onClick={() => goPage(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={cn(
                      "grid size-9 place-items-center rounded-lg border text-sm font-semibold transition sm:size-10",
                      p === page
                        ? "border-amber-brand bg-amber-brand text-ink"
                        : "border-border bg-white text-ink hover:border-brand-300",
                    )}
                  >
                    {p}
                  </button>
                </span>
              ))}
            {[
              { icon: ChevronRight, to: page + 1, label: "Next", off: page >= pages },
              { icon: ChevronsRight, to: pages, label: "Last", off: page >= pages },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                disabled={b.off}
                onClick={() => goPage(b.to)}
                className={cn(pagerBtn, /First|Last/.test(b.label) && "max-sm:hidden")}
                aria-label={b.label}
              >
                <b.icon className="size-4" />
              </button>
            ))}
          </div>

          {/* Nhảy nhanh tới trang bất kỳ */}
          {pages > 5 && (
            <form
              className="flex items-center gap-2 text-sm text-muted"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(new FormData(e.currentTarget).get("p"));
                if (n >= 1 && n <= pages && n !== page) goPage(n);
              }}
            >
              <label htmlFor="pager-jump">{t.goToPage}</label>
              <input
                key={page}
                id="pager-jump"
                name="p"
                type="number"
                min={1}
                max={pages}
                defaultValue={page}
                className="h-10 w-16 [appearance:textfield] rounded-lg border border-border bg-white px-2 text-center font-semibold text-ink focus:border-brand-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span>/ {pages}</span>
              <button
                type="submit"
                className="h-10 rounded-lg bg-brand-600 px-4 font-semibold text-white transition hover:bg-brand-700"
              >
                {t.go}
              </button>
            </form>
          )}
        </nav>
      )}
    </div>
  );
}
