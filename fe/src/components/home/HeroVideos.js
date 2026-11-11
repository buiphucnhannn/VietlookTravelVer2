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
/** Video chưa chạy được sau ngần này (mạng yếu / nghẽn) → bỏ video, giữ ảnh */
const STALL_MS = 6000;

/**
 * Có nên phát video nền không: khách bật "tiết kiệm dữ liệu", mạng 2G, hoặc (điện thoại) bật "giảm chuyển
 * động" → chỉ hiện ảnh. Máy tính bỏ qua "giảm chuyển động" (Windows hay tắt hiệu ứng sẵn → giữ như cũ:
 * vẫn phát video). Trình duyệt không cho biết loại mạng (Safari, Firefox) → vẫn thử phát
 * (mạng yếu thật thì bộ đếm STALL_MS sẽ quay về ảnh).
 */
function videoAllowed() {
  if (getMq() && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const c = navigator.connection;
  if (c?.saveData) return false;
  return !/(^|-)2g$/.test(c?.effectiveType ?? "");
}

/**
 * Trang đã tải xong (sự kiện load) + trình duyệt rảnh → mới bắt đầu tải video nền.
 * Trước đó chỉ hiện ảnh poster (nhẹ, là ảnh LCP) → video không giành băng thông/CPU với ảnh, chữ, JS lúc
 * mở trang. Điện thoại chờ thêm MOBILE_DELAY (hoặc tới lần chạm/cuộn đầu tiên) để trang kịp phản hồi trước.
 * Trả về true khi đã tới lúc VÀ điều kiện mạng/thiết bị cho phép (videoAllowed).
 */
function useAfterLoad() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let idle;
    let timer;
    let fired = false;
    const done = () => {
      if (fired) return;
      fired = true;
      setReady(videoAllowed());
    };
    const go = () => {
      const ric = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 200));
      idle = ric(done, { timeout: 1500 });
    };
    const afterLoad = () => {
      if (!getMq()) return go();
      timer = setTimeout(go, MOBILE_DELAY);
      WAKE_EVENTS.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      window.removeEventListener("load", afterLoad);
      WAKE_EVENTS.forEach((e) => window.removeEventListener(e, go));
      clearTimeout(timer);
      if (idle) (window.cancelIdleCallback ?? clearTimeout)(idle);
    };
  }, []);
  return ready;
}

/** Banner đang nằm trong màn hình VÀ tab đang mở → false khi cuộn xuống dưới / chuyển tab (dừng video) */
function useOnScreen(ref) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = true;
    const update = () => setOn(inView && !document.hidden);
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      update();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [ref]);
  return on;
}

/** Nguồn video của slide trên màn hình hiện tại (điện thoại: danh sách bản nhẹ, thử lần lượt) */
const sourcesOf = (vid, small) => (small ? (vid.srcMobile ?? []) : [vid.src]).filter(Boolean);

/**
 * Video nền hero chạy luân phiên — tăng dần (progressive enhancement), máy tính và điện thoại như nhau:
 * - Ảnh poster <picture> (bản dọc cho điện thoại, chọn ngay từ HTML) hiện trước, là ảnh LCP.
 * - Sau khi trang tải xong (useAfterLoad) và mạng đủ tốt → gắn nguồn video của slide ĐANG CHẠY (điện thoại:
 *   bản nhẹ riêng), tự phát không tiếng. Video chỉ hiện dần đè lên ảnh khi đã thật sự chạy (sự kiện
 *   `playing`) → không nháy đen.
 * - Lỗi tải, không chạy được sau STALL_MS, hoặc trình duyệt chặn tự phát (iPhone chế độ nguồn điện thấp)
 *   → lặng lẽ ở lại ảnh poster.
 * - Banner ra khỏi màn hình / tab bị ẩn → dừng video; quay lại → phát tiếp.
 * - Chỉ slide đang chạy mới tải video; máy tính tải sẵn thêm clip kế tiếp (sau khi clip đầu đã chạy) để
 *   chuyển cảnh không khựng. Clip mới chỉ hiện khi đã chạy, clip cũ giữ nguyên tới lúc đó.
 * - Chuyển khi clip hiện tại còn ~1.1s → 2 video chồng mờ.
 * - Slide YouTube (CMS): máy tính phát iframe YouTube tự phát / tắt tiếng / lặp, chỉ nạp khi tới lượt,
 *   chuyển slide theo thời gian (maxMs). Điện thoại hiện ảnh của slide (không nạp iframe YouTube).
 */
export default function HeroVideos({ videos, maxMs = 14000 }) {
  const rootRef = useRef(null);
  const small = useSyncExternalStore(subscribeMq, getMq, () => null);
  const ready = useAfterLoad();
  const onScreen = useOnScreen(rootRef);
  // Video lỗi / mạng quá yếu → thôi phát video, giữ ảnh poster
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  // Slide đang HIỆN trên cùng (-1 = chưa có video nào chạy → ảnh poster)
  const [shown, setShown] = useState(-1);
  // Clip đầu đã chạy được ~1.5s → máy tính mới bắt đầu tải sẵn clip kế tiếp
  const [warm, setWarm] = useState(false);
  const refs = useRef([]);
  const started = useRef(-1); // slide đã được phát từ đầu ở lượt hiện tại (để không tua lại khi phát tiếp)
  const n = videos.length;
  const next = (i + 1) % n;
  const on = ready && small !== null && !failed;
  const kindOf = (vid) =>
    !small && vid.yt ? "yt" : sourcesOf(vid, small).length ? "video" : "image";

  // Phát slide đang chạy + hẹn giờ chuyển slide
  useEffect(() => {
    if (!on || !onScreen) return;
    const vid = videos[i];
    const kind = kindOf(vid);
    let alive = true;
    const advance = () => {
      if (!alive) return;
      alive = false;
      setWarm(true);
      setI((x) => (x + 1) % n);
    };
    // Slide YouTube (máy tính) / slide chỉ có ảnh: hiện ngay, chuyển sau maxMs
    if (kind !== "video") {
      const s = setTimeout(() => setShown(i), 0);
      const t = n > 1 ? setTimeout(advance, maxMs) : null;
      return () => {
        alive = false;
        clearTimeout(s);
        clearTimeout(t);
      };
    }
    const v = refs.current[i];
    if (!v) return;
    // iPhone chỉ cho tự phát khi video tắt tiếng (đặt cả thuộc tính lẫn trạng thái)
    v.muted = true;
    v.defaultMuted = true;
    if (started.current !== i) {
      started.current = i;
      if (v.currentTime > 0) v.currentTime = 0;
    }
    let stall;
    const fail = () => {
      if (!alive) return;
      alive = false;
      setFailed(true);
      setShown(-1);
      setI(0);
    };
    const waitPlaying = () => {
      clearTimeout(stall);
      stall = setTimeout(fail, STALL_MS);
    };
    const onPlaying = () => {
      clearTimeout(stall);
      setShown(i);
    };
    const onTime = () => {
      if (v.currentTime > 1.5) setWarm(true);
      if (n > 1 && v.duration && v.duration - v.currentTime < 1.1) advance();
    };
    // Lỗi nguồn: trình duyệt tự thử nguồn kế tiếp; hết nguồn (NETWORK_NO_SOURCE) → về ảnh
    const onError = () => {
      if (v.error || v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) fail();
    };
    v.addEventListener("playing", onPlaying);
    v.addEventListener("waiting", waitPlaying);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("error", onError, true); // capture: lỗi của thẻ <source> không nổi bọt
    if (n > 1) v.addEventListener("ended", advance);
    waitPlaying();
    v.play().catch((e) => {
      // AbortError = bị ngắt do chuyển nguồn / tạm dừng → bỏ qua; còn lại (bị chặn tự phát, định dạng
      // không hỗ trợ) → về ảnh
      if (e?.name !== "AbortError") fail();
    });
    const t = n > 1 ? setTimeout(advance, maxMs) : null;
    return () => {
      alive = false;
      clearTimeout(stall);
      clearTimeout(t);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("waiting", waitPlaying);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("error", onError, true);
      v.removeEventListener("ended", advance);
    };
    // kindOf chỉ phụ thuộc small (đã có trong danh sách)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n, maxMs, small, videos, on, onScreen]);

  // Ra khỏi màn hình / ẩn tab → dừng mọi video (quay lại thì effect trên phát tiếp)
  useEffect(() => {
    if (!onScreen) refs.current.forEach((v) => v?.pause());
  }, [onScreen]);

  // Clip cũ đã mờ hẳn sau lớp clip mới → dừng cho nhẹ máy
  useEffect(() => {
    if (shown < 0) return;
    const t = setTimeout(
      () => refs.current.forEach((v, k) => k !== shown && v && !v.paused && v.pause()),
      1600,
    );
    return () => clearTimeout(t);
  }, [shown]);

  // Video lỗi / nghẽn → dừng và huỷ tải mọi clip (nguồn đã được gỡ khỏi thẻ <video>), quay về ảnh slide đầu
  useEffect(() => {
    if (!failed) return;
    refs.current.forEach((v) => {
      if (!v) return;
      v.pause();
      v.removeAttribute("src");
      v.load();
    });
  }, [failed]);

  const first = videos[0];
  const label = videos[on ? i : 0]?.label;
  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden bg-forest-900">
      {/* Ảnh LCP: poster slide đầu, chọn bản theo màn hình ngay từ HTML; luôn nằm dưới cùng làm nền dự phòng */}
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

      {videos.map((vid, idx) => {
        const kind = kindOf(vid);
        const visible = on && idx === shown;
        if (kind !== "video")
          return (
            <YouTubeBg
              key={`${kind}-${vid.yt || idx}`}
              vid={vid}
              // slide đầu chỉ có ảnh → <picture> phía dưới đã hiện đúng ảnh này
              active={visible && !(idx === 0 && kind === "image")}
              mount={kind === "yt" && on && idx === i}
            />
          );
        // Chỉ gắn nguồn cho slide đang chạy (+ máy tính: clip kế tiếp khi clip đầu đã chạy)
        const load = on && (idx === i || (!small && idx === next && warm));
        return (
          <video
            key={`v-${idx}-${small ? "m" : "d"}`}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-out",
              visible ? "opacity-100" : "opacity-0",
            )}
            muted
            loop={n === 1} // chỉ 1 slide → tự lặp (nhiều slide: chuyển sang clip kế tiếp)
            playsInline
            preload={load ? "auto" : "none"}
            poster={
              idx === 0 ? (small ? first.posterMobile : first.poster) || undefined : undefined
            }
            aria-hidden
          >
            {load && sourcesOf(vid, small).map((s) => <source key={s} src={s} type="video/mp4" />)}
          </video>
        );
      })}

      {/* Tên địa danh của slide đang chạy */}
      <div className="absolute inset-x-0 bottom-6 z-10 hidden justify-center sm:flex lg:bottom-8">
        <span
          key={label}
          className="animate-fade-up text-sm font-semibold tracking-wide text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,.6)]"
        >
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * Video nền YouTube phủ kín khung (giống object-cover): iframe 16:9 phóng to theo cạnh lớn hơn.
 * pointer-events-none → khách không bấm vào được (là ảnh nền), không có tiếng.
 * Cũng dùng làm lớp ẢNH cho slide không có video (và slide YouTube trên điện thoại).
 * mount=false → chưa nạp iframe (chưa tới lượt, hoặc điện thoại → chỉ hiện ảnh nền).
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
      {/* Ảnh nền: điện thoại hiện ảnh này thay cho video YouTube; máy tính hiện trong lúc video đang tải */}
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
