"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Iframe nặng (Google Maps…) chỉ nạp khi khách cuộn GẦN tới (cách ~300px).
 * `loading="lazy"` của trình duyệt vẫn tải sớm khi iframe cách màn hình 1–2 màn hình → bản đồ Google
 * (~600KB JavaScript) bị tải ngay lúc mở trang trên điện thoại. Trước khi nạp: khung giữ chỗ cùng cỡ.
 */
export default function LazyIframe({ className, title, ...props }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setShow(true);
        io.disconnect();
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div ref={ref} className={cn("bg-surface", className)}>
      {show && <iframe title={title} className="size-full border-0" {...props} />}
    </div>
  );
}
