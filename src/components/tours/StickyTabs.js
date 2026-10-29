"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Thanh mục lục dính (Overview / Itinerary / Included...) có đánh dấu mục đang xem. */
export default function StickyTabs({ tabs, cta }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tabs]);

  return (
    <div className="border-y border-border bg-brand-50/95">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 sm:px-6 lg:px-10">
        <nav className="-mb-px flex flex-1 scrollbar-none gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={cn(
                "shrink-0 border-b-[3px] px-3 py-4 text-sm font-semibold whitespace-nowrap transition-colors sm:px-4",
                active === t.id
                  ? "border-sun-500 text-brand-700"
                  : "border-transparent text-ink/80 hover:text-brand-600",
              )}
            >
              {t.label}
            </a>
          ))}
        </nav>
        {cta && (
          <a
            href={cta.href}
            className="hidden h-11 shrink-0 items-center gap-2 rounded-md bg-sun-500 px-5 text-sm font-semibold text-white shadow hover:bg-sun-600 md:flex"
          >
            {cta.label} <ArrowRight className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}
