"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { href } from "@/i18n/config";
import { smoothScrollTo } from "@/components/fx/SmoothScroll";

/**
 * Logo ngang: biểu tượng chim hạc + chữ VIETLOOK TRAVEL (cắt từ logo gốc).
 * light: chữ chuyển trắng (trên nền ảnh/tối). compact: cỡ nhỏ cho header thấp.
 */
export default function Logo({
  lang = "en",
  small,
  compact,
  light,
  tagline = true,
  taglineClassName,
  className,
  onNavigate,
}) {
  const home = href(lang);
  return (
    <Link
      prefetch={false}
      href={home}
      // Đang ở trang chủ: lướt mượt lên đầu hero thay vì tải lại
      onClick={(e) => {
        onNavigate?.();
        // đọc đường dẫn lúc bấm (không dùng usePathname → không chặn việc dựng sẵn trang tĩnh)
        const pathname = window.location.pathname;
        if (pathname === home || pathname === `/${lang}`) {
          e.preventDefault();
          smoothScrollTo(0);
        }
      }}
      className={cn("group/logo flex shrink-0 items-center gap-2.5", className)}
      aria-label="Vietlook Travel – Home"
    >
      {/* Logo nổi hơn (yêu cầu khách): to hơn, đĩa trắng + viền sáng tách khỏi nền video/ảnh */}
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-white shadow-[0_6px_18px_-6px_rgba(0,0,0,0.45)] ring-2 ring-amber-brand/70 transition-transform duration-500 group-hover/logo:rotate-6",
          small ? "size-11" : compact ? "size-11 lg:size-13" : "size-14 lg:size-16",
        )}
      >
        <Image
          src="/images/logo/vietlook-icon.png"
          alt=""
          width={210}
          height={210}
          priority
          className={cn("h-auto", small ? "w-8" : compact ? "w-8 lg:w-10" : "w-10 lg:w-12")}
        />
      </span>
      <Image
        src="/images/logo/vietlook-wordmark.png"
        alt="Vietlook Travel"
        width={527}
        height={59}
        priority
        className={cn(
          "h-auto transition-[filter] duration-500",
          small ? "w-36" : compact ? "w-32 min-[380px]:w-36 lg:w-44" : "w-44 lg:w-52",
          light && "brightness-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] invert",
        )}
      />
      {/* Yêu cầu khách 31/10: thêm "Vietnam DMC" + "Since 2009" cạnh logo cho khối logo đỡ đơn điệu */}
      {tagline && (
        <span
          className={cn(
            "hidden flex-col justify-center border-l-2 pl-2.5 leading-none sm:flex",
            light ? "border-white/40" : "border-sun-500/70",
            taglineClassName,
          )}
        >
          <span
            className={cn(
              "text-[0.8rem] font-extrabold tracking-[0.08em] whitespace-nowrap uppercase",
              light ? "text-white" : "text-sun-500",
            )}
          >
            Vietnam DMC
          </span>
          <span
            className={cn(
              "mt-1 text-[0.68rem] font-semibold tracking-[0.22em] whitespace-nowrap uppercase",
              light ? "text-white/75" : "text-brand-600",
            )}
          >
            Since 2009
          </span>
        </span>
      )}
    </Link>
  );
}
