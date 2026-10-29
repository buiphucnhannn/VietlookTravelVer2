"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { localeMeta, locales, switchLocalePath } from "@/i18n/config";
import { cn } from "@/lib/utils";
import Flag from "./Flag";

export default function LanguageSwitcher({ lang, variant = "light", compact }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      clearTimeout(timer.current);
    };
  }, []);

  // Rê chuột để mở; đóng trễ một chút để kịp di chuột xuống danh sách
  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
    >
      <button
        type="button"
        // Chuột: đã mở bằng hover nên click giữ mở; cảm ứng: click bật/tắt
        onClick={(e) => (e.nativeEvent.pointerType === "mouse" ? show() : setOpen((v) => !v))}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Language"
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors",
          compact ? "h-10 px-2.5 text-sm sm:px-3" : "h-7 px-2.5 text-xs",
          variant === "dark"
            ? "bg-white/10 text-white hover:bg-white/20"
            : "border border-border text-ink hover:border-brand-300",
        )}
      >
        <Flag code={lang} />
        {localeMeta[lang].short}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>
      <div
        className={cn(
          "absolute top-full right-0 z-[70] pt-2 transition duration-200",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <ul className="w-44 overflow-hidden rounded-xl border border-border bg-white py-1 text-sm text-ink shadow-xl">
          {locales.map((l) => (
            <li key={l}>
              <Link
                href={switchLocalePath(pathname, l)}
                hrefLang={localeMeta[l].hreflang}
                onClick={() => {
                  // Ghi nhớ lựa chọn để trang chủ không tự chuyển theo ngôn ngữ trình duyệt nữa
                  document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-brand-50",
                  l === lang && "font-semibold text-brand-700",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Flag code={l} className="text-base" />
                  {localeMeta[l].label}
                </span>
                {l === lang && <Check className="size-4" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
