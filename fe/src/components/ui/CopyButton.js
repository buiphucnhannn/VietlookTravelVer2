"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nút chép nhanh 1 giá trị (VD WeChat ID) – hiện dấu tích ~1,8 giây sau khi chép. */
export default function CopyButton({ value, label, copiedLabel, className }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* trình duyệt chặn clipboard – bỏ qua */
        }
      }}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#07c160] px-3 text-sm font-semibold text-white",
        className,
      )}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
