"use client";

import { useEffect } from "react";

/**
 * Ghim một lớp phủ `fixed` (popup) vào vùng nhìn thấy thật của màn hình (visualViewport).
 * Trên điện thoại khi bàn phím bật lên, vùng popup co lại theo → nút hành động ở chân popup
 * không bị bàn phím che, chỉ phần thân popup cuộn. Không có visualViewport → giữ `inset-0` như cũ.
 *
 * Dùng: <div ref={ref} className="fixed inset-0 …"> + useVisualViewport(ref, open)
 */
export function useVisualViewport(ref, active = true) {
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    const el = ref.current;
    if (!active || !vv || !el) return;
    const sync = () => {
      // chỉ áp khi bàn phím / thanh trình duyệt làm vùng nhìn thấy thấp hơn cửa sổ
      if (Math.abs(window.innerHeight - vv.height) < 1 && vv.offsetTop === 0) {
        el.style.top = "";
        el.style.height = "";
        el.style.bottom = "";
        return;
      }
      el.style.top = `${vv.offsetTop}px`;
      el.style.height = `${vv.height}px`;
      el.style.bottom = "auto";
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      el.style.top = "";
      el.style.height = "";
      el.style.bottom = "";
    };
  }, [ref, active]);
}
