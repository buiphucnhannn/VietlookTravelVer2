"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MAX = 15 * 60;
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Đếm ngược theo ?retry= rồi mới cho thử lại */
export default function RetryButton({ seconds, href }) {
  const [left, setLeft] = useState(() => Math.min(MAX, Math.max(0, Number(seconds) || 60)));
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const ready = left <= 0;
  return (
    <a
      href={ready ? href : "#"}
      aria-disabled={!ready}
      onClick={(e) => !ready && e.preventDefault()}
      className={cn(
        "inline-flex h-12 min-w-48 items-center justify-center rounded-full px-7 text-xs font-semibold tracking-[0.16em] uppercase transition",
        ready
          ? "bg-white text-brand-900 hover:bg-brand-50"
          : "cursor-wait bg-white/10 text-white/70",
      )}
    >
      {ready ? "Thử lại" : <span className="tabular-nums">Thử lại sau {fmt(left)}</span>}
    </a>
  );
}
