"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// Chọn bản video mobile/desktop theo cỡ màn hình (server: null → chỉ poster)
const MQ = "(max-width: 767px)";
const subscribeMq = (cb) => {
  const m = window.matchMedia(MQ);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const getMq = () => window.matchMedia(MQ).matches;

/**
 * Video nền hero chạy luân phiên (cross-fade).
 * - Chỉ tải video đang phát + video kế tiếp (tiết kiệm băng thông).
 * - Hết video (hoặc tối đa `maxMs`) thì chuyển sang video sau.
 * - Poster video đầu dùng <picture> (mobile/desktop theo media query) → chỉ tải 1 ảnh đúng cỡ,
 *   hiện ngay từ HTML (ảnh LCP); poster các video sau chỉ gắn khi đã biết cỡ màn hình.
 */
export default function HeroVideos({ videos, maxMs = 10500 }) {
  const [i, setI] = useState(0);
  // null = chưa biết cỡ màn hình → chỉ hiện poster; sau khi mount chọn bản mobile/desktop
  const small = useSyncExternalStore(subscribeMq, getMq, () => null);
  // Chỉ tải video sau khi trang đã tải xong (poster hiện trước) → không giành băng thông với nội dung đầu trang
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const go = () => setTimeout(() => setReady(true), 600);
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);
  const refs = useRef([]);
  const n = videos.length;
  const next = (i + 1) % n;

  useEffect(() => {
    const v = refs.current[i];
    if (!v || small === null || !ready) return;
    v.currentTime = 0;
    v.play().catch(() => {});
    const advance = () => setI((x) => (x + 1) % n);
    v.addEventListener("ended", advance);
    const t = setTimeout(advance, maxMs);
    return () => {
      v.removeEventListener("ended", advance);
      clearTimeout(t);
    };
  }, [i, n, maxMs, small, ready]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-forest-900">
      {/* Ảnh LCP: poster video đầu, chọn bản theo màn hình ngay từ HTML */}
      <picture>
        <source media={MQ} srcSet={videos[0].posterMobile} />
        <img
          src={videos[0].poster}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </picture>
      {videos.map((vid, idx) => {
        const load = idx === i || idx === next;
        return (
          <video
            key={vid.src}
            ref={(el) => (refs.current[idx] = el)}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-out",
              idx === i ? "opacity-100" : "opacity-0",
            )}
            src={ready && load && small !== null ? (small ? vid.srcMobile : vid.src) : undefined}
            poster={small === null || !load ? undefined : small ? vid.posterMobile : vid.poster}
            muted
            playsInline
            preload={idx === i ? "auto" : "none"}
            aria-hidden
          />
        );
      })}

      {/* Chấm chuyển video + tên địa danh */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-2.5 lg:bottom-8">
        <span
          key={i}
          className="animate-fade-up text-sm font-semibold tracking-wide text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,.6)]"
        >
          {videos[i].label}
        </span>
        <div className="flex gap-2">
          {videos.map((vid, idx) => (
            <button
              key={vid.src}
              type="button"
              aria-label={vid.label}
              onClick={() => setI(idx)}
              className={cn(
                "relative h-1.5 rounded-full transition-all duration-500 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']",
                idx === i ? "w-8 bg-white" : "w-3 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
