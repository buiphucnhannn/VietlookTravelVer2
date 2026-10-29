"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy } from "lucide-react";

/** Mã yêu cầu đọc từ URL (?code=...) – đặt trong <Suspense> để phần còn lại của trang vẫn prerender. */
export default function ThankYouCode({ labels }) {
  const code = useSearchParams().get("code");
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  return (
    <div className="mx-auto mt-8 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-dashed border-sand-300 bg-cream-50 px-4 py-2.5 sm:px-5">
      <span className="text-sm text-muted">{labels.yourRequestCode}:</span>
      <span className="font-mono text-base font-bold tracking-wider whitespace-nowrap text-forest-700 sm:text-lg">
        {code}
      </span>
      <button
        type="button"
        aria-label={labels.copy}
        onClick={() => {
          navigator.clipboard?.writeText(code).catch(() => {});
          setCopied(true);
        }}
        className="grid size-9 place-items-center rounded-lg text-clay-600 transition hover:bg-white"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
