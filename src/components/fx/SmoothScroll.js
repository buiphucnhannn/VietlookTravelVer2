"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";

/**
 * Cuộn mượt toàn trang (Lenis) – trôi chậm, có quán tính (giống dự án ButStudio).
 * - lerp thấp: trang "đuổi theo" con lăn chậm hơn → mềm, trôi nhẹ.
 * - wheelMultiplier < 1: mỗi nấc cuộn đi quãng ngắn hơn.
 * - Điện thoại giữ cuộn native để không khựng.
 * - Link #anchor cuộn êm, chừa chỗ cho header dính.
 * Vùng cuộn riêng (popup, menu di động…) đặt data-lenis-prevent.
 */
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
/**
 * Khoảng chừa phía trên khi cuộn tới một khối: header (đã thu gọn khi cuộn: 72px desktop / 64px mobile)
 * + các thanh dính khác đang có trên trang (đánh dấu data-scroll-offset, vd. tab Overview/Itinerary)
 * + 24px khoảng thở để tiêu đề khối không sát mép.
 */
const headerOffset = () => {
  const header = window.innerWidth >= 1024 ? 72 : 64;
  const bars = [...document.querySelectorAll("[data-scroll-offset]")].reduce(
    (sum, el) => sum + el.offsetHeight,
    0,
  );
  return header + bars + 24;
};
const ease = { duration: 1.6, easing: easeOutExpo };

/**
 * Tìm phần tử theo "#id" hoặc bộ chọn CSS. Dùng getElementById cho #hash vì id bắt đầu bằng số
 * (vd. #2-weeks) không phải bộ chọn CSS hợp lệ – querySelector sẽ ném lỗi.
 */
function findTarget(target) {
  if (typeof target !== "string" || !target) return null;
  if (target.startsWith("#")) return document.getElementById(decodeURIComponent(target.slice(1)));
  try {
    return document.querySelector(target);
  } catch {
    return null;
  }
}

/**
 * Toạ độ cuộn tới phần tử, tự tính bằng số. Không đưa phần tử thẳng cho Lenis vì Lenis tự trừ thêm
 * scroll-margin-top + scroll-padding-top của CSS → cộng dồn với offset header, dừng hụt ~240px.
 */
function yOf(el, lenis, block = "start") {
  const rect = el.getBoundingClientRect();
  const offset = block === "center" ? (window.innerHeight - rect.height) / 2 : headerOffset();
  return Math.max(0, rect.top + lenis.animatedScroll - offset);
}

/** Cuộn tới phần tử; xong thì đo lại và căn bù nếu ảnh/font phía trên làm trang đổi chiều cao. */
function glideTo(lenis, el, block = "start", tries = 2) {
  lenis.scrollTo(yOf(el, lenis, block), {
    ...ease,
    onComplete: () => {
      const drift = yOf(el, lenis, block) - lenis.animatedScroll;
      if (tries > 0 && Math.abs(drift) > 4) glideTo(lenis, el, block, tries - 1);
    },
  });
}

export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.06,
      wheelMultiplier: 0.78,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.2,
      ...ease,
      // Link #anchor do mình tự xử lý bên dưới (tính đúng offset header)
      anchors: false,
      // Luôn bật, kể cả khi Windows tắt "Animation effects" (prefers-reduced-motion)
      respectReducedMotion: false,
    });
    window.__lenis = lenis;

    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Bấm link #hash trỏ tới chính trang đang xem → cuộn êm tới khối, cập nhật URL
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = e.target.closest?.("a[href*='#']");
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      const el = findTarget(url.hash);
      if (!el) return;
      e.preventDefault();
      if (url.hash !== location.hash) history.pushState(history.state, "", url.hash);
      glideTo(lenis, el);
    };
    window.addEventListener("click", onClick, true);

    // Chỉ đổi #hash trên cùng trang (gõ URL, Back/Forward) → trình duyệt tự nhảy theo CSS, căn lại cho đúng
    const onHash = () => {
      const el = findTarget(location.hash);
      if (el) glideTo(lenis, el);
    };
    window.addEventListener("hashchange", onHash);

    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHash);
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  // Đổi trang: về đầu trang ngay; có #hash thì cuộn êm tới khối đó
  useEffect(() => {
    const lenis = window.__lenis;
    if (!lenis) return;
    const target = findTarget(window.location.hash);
    lenis.scrollTo(0, { immediate: true, force: true });
    if (!target) return;
    const t = setTimeout(() => glideTo(lenis, target), 300);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}

/** Khoá/mở cuộn trang (khi mở popup, menu di động, lightbox). */
export function lockScroll(lock) {
  if (typeof document === "undefined") return;
  document.documentElement.style.overflow = lock ? "hidden" : "";
  document.body.style.overflow = lock ? "hidden" : "";
  if (lock) window.__lenis?.stop();
  else window.__lenis?.start();
}

/** Cuộn êm tới vị trí/phần tử qua Lenis (dự phòng: cuộn native). */
export function smoothScrollTo(target, { block = "start" } = {}) {
  const lenis = typeof window !== "undefined" ? window.__lenis : null;
  const el = typeof target === "string" ? findTarget(target) : target;
  if (lenis) {
    if (typeof target === "number") lenis.scrollTo(target, ease);
    else if (el) glideTo(lenis, el, block);
    return;
  }
  if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else el?.scrollIntoView?.({ behavior: "smooth", block });
}
