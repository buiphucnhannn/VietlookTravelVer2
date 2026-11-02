"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Kích hoạt ngay khi mép phần tử vừa lộ khỏi đáy màn hình (cách đáy ~40px) → cảm giác "nhạy".
const ROOT_MARGIN = "0px 0px -40px 0px";
// Độ trễ so le giữa các phần tử: rút gọn & giới hạn để phần tử cuối hàng không phải chờ lâu.
const STAGGER_SCALE = 0.7;
const STAGGER_MAX = 260;

/**
 * Hiện dần phần tử khi cuộn tới (IntersectionObserver).
 * Chỉ chuyển động transform + opacity (mượt, không gây reflow); easing kiểu "expo-out":
 * lướt nhanh rồi dừng êm. Phần tử đã nằm trong màn hình lúc tải trang hiện ngay, không trễ.
 */
export default function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  style,
  children,
  ...props
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = performance.now();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // Lần quan sát đầu (ngay khi tải trang) mà đã thấy → hiện ngay, bỏ độ trễ so le
        if (performance.now() - start < 120) setInstant(true);
        setShown(true);
        io.disconnect();
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stagger = instant ? 0 : Math.min(Math.round(delay * STAGGER_SCALE), STAGGER_MAX);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: shown ? `${stagger}ms` : "0ms", ...style }}
      className={cn(
        "transition-[opacity,translate,scale] duration-[550ms] ease-[cubic-bezier(.16,1,.3,1)] will-change-[opacity,transform]",
        shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-[18px] scale-[0.98] opacity-0",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
