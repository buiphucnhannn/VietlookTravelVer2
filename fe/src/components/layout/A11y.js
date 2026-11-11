"use client";

import { createContext, useContext } from "react";

/**
 * Nhãn cho trình đọc màn hình theo ngôn ngữ trang (dict.a11y). Layout [lang] bọc A11yProvider →
 * component client gọi useA11y(); component server dùng A11yNav / A11yBusy (chỉ gắn nhãn, nội dung vẫn dựng ở server).
 * Ngoài website (trang đăng nhập quản trị…) không có provider → dùng nhãn tiếng Anh.
 */
const FALLBACK = {
  skipToContent: "Skip to main content",
  close: "Close",
  previous: "Previous",
  next: "Next",
  slide: "Slide {n}",
  pagination: "Pagination",
  first: "First page",
  last: "Last page",
  language: "Language",
  loading: "Loading",
  breadcrumb: "Breadcrumb",
  home: "Vietlook Travel – Home",
};
const A11yCtx = createContext(FALLBACK);

export function A11yProvider({ labels, children }) {
  return <A11yCtx.Provider value={{ ...FALLBACK, ...labels }}>{children}</A11yCtx.Provider>;
}

export const useA11y = () => useContext(A11yCtx);

/** <nav> có nhãn theo ngôn ngữ — `label`: khoá trong dict.a11y (vd. "breadcrumb") */
export function A11yNav({ label, ...props }) {
  return <nav aria-label={useA11y()[label]} {...props} />;
}

/** Khung đang tải (skeleton) có nhãn "Đang tải" theo ngôn ngữ */
export function A11yBusy(props) {
  return <div aria-busy="true" aria-label={useA11y().loading} {...props} />;
}
