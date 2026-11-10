"use client";

import { useEffect, useState } from "react";
import { cn, formatUSD } from "@/lib/utils";
import { smoothScrollTo } from "@/components/fx/SmoothScroll";

/**
 * Thanh đặt tour dính đáy màn hình trên mobile (<1024px): giá + nút "Book now" cuộn tới form.
 * Tự ẩn khi khung đặt tour (#book) đang hiển thị. Đặt biến --mobile-bar để nút chat nổi nhích lên.
 */
export default function MobileBookBar({ price, originalPrice, labels }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const book = document.getElementById("book");
    const mq = window.matchMedia("(max-width: 1023px)");
    let bookVisible = false;
    const sync = () => {
      const on = mq.matches && !bookVisible && window.scrollY > 300;
      setShow(on);
      document.documentElement.style.setProperty("--mobile-bar", on ? "68px" : "0px");
    };
    const io = new IntersectionObserver(([e]) => {
      bookVisible = e.isIntersecting;
      sync();
    });
    if (book) io.observe(book);
    window.addEventListener("scroll", sync, { passive: true });
    mq.addEventListener("change", sync);
    sync();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", sync);
      mq.removeEventListener("change", sync);
      document.documentElement.style.removeProperty("--mobile-bar");
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-2.5 shadow-[0_-10px_30px_-15px_rgba(15,62,95,0.35)] backdrop-blur transition-transform duration-300 lg:hidden",
        show ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
      aria-hidden={!show}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <div className="leading-tight">
          {price ? (
            <>
              <span className="block text-xs text-muted">{labels.from}</span>
              {originalPrice && (
                <span className="mr-1.5 text-sm text-muted line-through">
                  {formatUSD(originalPrice)}
                </span>
              )}
              <span className="text-xl font-extrabold text-sun-500">{formatUSD(price)}</span>{" "}
              <span className="text-xs text-muted">/ {labels.perPerson}</span>
            </>
          ) : (
            <span className="text-sm font-semibold text-brand-700">{labels.contactPrice}</span>
          )}
        </div>
        <button
          type="button"
          tabIndex={show ? 0 : -1}
          onClick={() => smoothScrollTo("#book")}
          className="h-12 shrink-0 rounded-md bg-sun-500 px-6 font-semibold text-white shadow-md shadow-sun-500/25"
        >
          {labels.bookNow}
        </button>
      </div>
    </div>
  );
}
