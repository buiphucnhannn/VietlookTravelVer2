"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Số chạy từ 0 → value khi cuộn tới (1 lần). Server render sẵn giá trị cuối (tốt cho SEO,
 * và vẫn đúng nếu JS chưa chạy).
 */
export default function CountUp({ value, decimals = 0, duration = 1200, className }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(value * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        setShown(0);
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {shown.toFixed(decimals)}
    </span>
  );
}
