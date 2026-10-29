"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Hiện dần phần tử khi cuộn tới (IntersectionObserver). */
export default function Reveal({ as: Tag = "div", delay = 0, className, children, ...props }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(.2,.7,.2,1)]",
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
