"use client";

import dynamic from "next/dynamic";

/**
 * Ô soạn văn bản (RichText — thư viện Tiptap, khá nặng) tải RIÊNG, sau khi trang đã hiện:
 * mở form sửa tour / bài viết / trang nội dung nhanh hơn, ô soạn thảo hiện ngay sau đó (khung chờ cùng cỡ).
 * Dùng y hệt RichText: <RichText value onChange … />
 */
const RichText = dynamic(() => import("./RichText"), {
  ssr: false,
  loading: () => (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="h-10 border-b border-slate-100 bg-slate-50/70" />
      <div className="min-h-[200px] animate-pulse bg-slate-50/40" />
    </div>
  ),
});

export default RichText;
