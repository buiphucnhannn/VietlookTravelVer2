"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// Chọn bản video mobile/desktop theo cỡ màn hình (server: null → chưa biết)
const MQ = "(max-width: 767px)";
const subscribeMq = (cb) => {
  const m = window.matchMedia(MQ);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const getMq = () => window.matchMedia(MQ).matches;

/** Điện thoại: chờ thêm sau khi trang tải xong (hoặc tới khi khách chạm / cuộn) rồi mới tải video */
const MOBILE_DELAY = 3000;
const WAKE_EVENTS = ["pointerdown", "touchstart", "scroll", "keydown"];

/**
 * Trang đã tải xong (sự kiện load) + trình duyệt rảnh → mới bắt đầu tải video nền.
 * Trước đó chỉ hiện ảnh poster (nhẹ) → video không giành băng thông/CPU với ảnh, chữ, JS lúc mở trang
 * (điện thoại 4G: video ~0,7MB làm chậm hiển thị nội dung chính vài giây). Điện thoại chờ thêm
 * MOBILE_DELAY (hoặc tới lần chạm/cuộn đầu tiên) để trang kịp phản hồi thao tác trước.
 */
function useAfterLoad() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let idle;
    let timer;
    const done = () => setReady(true);
    const go = () => {
      const ric = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 200));
      idle = ric(done, { timeout: 1500 });
    };
    const afterLoad = () => {
      if (!getMq()) return go();
      timer = setTimeout(go, MOBILE_DELAY);
      WAKE_EVENTS.forEach((e) => window.addEventListener(e, done, { once: true, passive: true }));
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      window.removeEventListener("load", afterLoad);
      WAKE_EVENTS.forEach((e) => window.removeEventListener(e, done));
      clearTimeout(timer);
      if (idle) (window.cancelIdleCallback ?? clearTimeout)(idle);
    };
  }, []);
  return ready;
}

/**
 * Video nền hero chạy luân phiên (cross-fade).
 * - Poster <picture> (nhẹ, chọn bản mobile/desktop ngay từ HTML) hiện trước, làm ảnh LCP.
 * - Clip ĐẦU: gắn khi trang đã tải xong (useAfterLoad), tự phát bản mobile/desktop theo màn hình
 *   → video không làm chậm lúc mở trang; khung hình đầu hiện đè lên poster.
 * - Clip sau: chỉ tải khi clip trước đã chạy (không giành băng thông với clip đầu); clip kế tiếp được
 *   tải sẵn → chuyển cảnh không khựng.
 * - Chuyển khi clip hiện tại còn ~1.1s → 2 video chồng mờ lúc cả hai đang chạy.
 * - Slide là video Google Drive (CMS): đã được chép về Cloudinary → phát như clip mp4 thường (thẻ <video>).
 * - Slide là link YouTube (CMS): phát bằng iframe YouTube tự phát / tắt tiếng / lặp, phủ kín nền; chỉ nạp
 *   khi tới lượt (không tải trước) và chuyển slide theo thời gian (maxMs). Link nhúng dựng từ mã video (lib/video).
 */
export default function HeroVideos({ videos, maxMs = 14000 }) {
  const [i, setI] = useState(0);
  const small = useSyncExternalStore(subscribeMq, getMq, () => null);
  // Đã chuyển qua clip thứ 2 ít nhất 1 lần → clip đầu được phát lại từ đầu như các clip khác
  const [looped, setLooped] = useState(false);
  // Clip đầu đã chạy được ~1.5s → mới bắt đầu tải clip kế tiếp (dồn băng thông cho clip đầu)
  const [warm, setWarm] = useState(false);
  // Chỉ gắn video sau khi trang tải xong (xem useAfterLoad)
  const loaded = useAfterLoad();
  // Clip đầu đã có khung hình → hiện dần đè lên poster (không nháy đen)
  const [playing, setPlaying] = useState(false);
  const refs = useRef([]);
  const n = videos.length;
  const next = (i + 1) % n;

  useEffect(() => {
    // Chỉ 1 clip mp4: thẻ <video loop> tự lặp, không cần hẹn giờ chuyển slide
    if (!loaded || (n === 1 && !videos[0]?.yt)) return;
    // Slide YouTube / slide chỉ có ảnh: không đọc được thời lượng → chuyển sau maxMs
    if (videos[i]?.yt || !videos[i]?.src) {
      const t = setTimeout(() => {
        if (i === n - 1) setLooped(true);
        setWarm(true);
        setI((x) => (x + 1) % n);
      }, maxMs);
      return () => clearTimeout(t);
    }
    const v = refs.current[i];
    if (!v) return;
    // Clip đầu lần đầu: đang tự phát (autoPlay) → KHÔNG tua lại (tránh giật); chỉ đảm bảo đang chạy
    if (i === 0 && !looped) {
      if (v.paused) v.play().catch(() => {});
    } else {
      if (small === null) return;
      v.currentTime = 0;
      v.play().catch(() => {});
    }
    let done = false;
    const advance = () => {
      if (done) return;
      done = true;
      if (i === n - 1) setLooped(true);
      setI((x) => (x + 1) % n);
    };
    const onTime = () => {
      if (v.currentTime > 1.5) setWarm(true);
      if (v.duration && v.duration - v.currentTime < 1.1) advance();
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", advance);
    const t = setTimeout(advance, maxMs);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", advance);
      clearTimeout(t);
    };
  }, [i, n, maxMs, small, looped, videos, loaded]);

  const first = videos[0];
  return (
    <div className="absolute inset-0 overflow-hidden bg-forest-900">
      {/* Ảnh LCP: poster clip đầu, chọn bản theo màn hình ngay từ HTML */}
      <picture>
        <source media={MQ} srcSet={first.posterMobile} />
        <img
          src={first.poster}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </picture>

      {/* Clip đầu: gắn sau khi trang tải xong, tự phát (YouTube → iframe); trước đó poster ở trên */}
      {first.yt || !first.src ? (
        <YouTubeBg vid={first} active={i === 0} mount={!!first.yt && small === false && loaded} />
      ) : (
        loaded &&
        small !== null && (
          <video
            ref={(el) => (refs.current[0] = el)}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-out",
              i === 0 && playing ? "opacity-100" : "opacity-0",
            )}
            onPlaying={() => setPlaying(true)}
            autoPlay
            muted
            loop={n === 1} // chỉ 1 slide → tự lặp (nhiều slide: chuyển sang clip kế tiếp)
            playsInline
            preload="auto"
            src={small ? first.srcMobile : first.src}
            aria-hidden
          />
        )
      )}

      {/* Các clip sau: gắn nguồn khi tới lượt (đang phát hoặc kế tiếp) */}
      {videos.slice(1).map((vid, k) => {
        const idx = k + 1;
        const load = loaded && small !== null && (idx === i || (idx === next && warm));
        // slide YouTube, hoặc slide chỉ có ảnh (không có video) → lớp ảnh nền
        if (vid.yt || !vid.src)
          return (
            <YouTubeBg
              key={vid.yt || `img-${idx}`}
              vid={vid}
              active={idx === i}
              mount={!!vid.yt && small === false && loaded && idx === i}
            />
          );
        return (
          <video
            key={vid.src}
            ref={(el) => (refs.current[idx] = el)}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-out",
              idx === i ? "opacity-100" : "opacity-0",
            )}
            src={load ? (small ? vid.srcMobile : vid.src) : undefined}
            muted
            playsInline
            preload={load ? "auto" : "none"}
            aria-hidden
          />
        );
      })}

      {/* Tên địa danh của video đang chạy */}
      <div className="absolute inset-x-0 bottom-6 z-10 hidden justify-center sm:flex lg:bottom-8">
        <span
          key={i}
          className="animate-fade-up text-sm font-semibold tracking-wide text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,.6)]"
        >
          {videos[i].label}
        </span>
      </div>
    </div>
  );
}

/**
 * Video nền YouTube phủ kín khung (giống object-cover): iframe 16:9 phóng to theo cạnh lớn hơn.
 * pointer-events-none → khách không bấm vào được (là ảnh nền), không có tiếng.
 * mount=false → chưa nạp iframe (chưa tới lượt, hoặc đang xem trên điện thoại → chỉ hiện ảnh nền).
 */
function YouTubeBg({ vid, active, mount = true }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-[1400ms] ease-out",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      {/* Ảnh nền: điện thoại hiện ảnh này thay cho video (nhẹ, đúng "video máy tính + ảnh mobile");
          máy tính hiện trong lúc video YouTube đang tải */}
      {(vid.poster || vid.posterMobile) && (
        <picture>
          {vid.posterMobile && <source media={MQ} srcSet={vid.posterMobile} />}
          <img
            src={vid.poster || vid.posterMobile}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        </picture>
      )}
      {mount && (
        <iframe
          src={vid.yt}
          title=""
          tabIndex={-1}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
        />
      )}
    </div>
  );
}
