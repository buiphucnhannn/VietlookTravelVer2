"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Cột dính thông minh: vừa màn hình thì dính ngay dưới header (top = offset);
 * cao hơn màn hình thì top âm → cột cuộn theo trang đến khi lộ hết phần đáy rồi mới dính,
 * nên luôn xem/điền được toàn bộ nội dung mà không phải chờ cột bên kia cuộn hết.
 */
export default function StickySide({ offset = 96, gap = 16, className, children }) {
  const ref = useRef(null);
  const [top, setTop] = useState(offset);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setTop(Math.min(offset, window.innerHeight - el.offsetHeight - gap));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [offset, gap]);

  return (
    <div ref={ref} className={cn("lg:sticky", className)} style={{ top }}>
      {children}
    </div>
  );
}
