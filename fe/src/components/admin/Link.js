"use client";

import NextLink from "next/link";

/**
 * Link trong khu quản trị: tải trước (prefetch) theo mặc định của Next — chỉ tải khung trang dựng sẵn của trang
 * đích (giống nhau cho mọi người, không có dữ liệu). Proxy KHÔNG hỏi backend cho các lượt tải trước / chuyển tab
 * (xem guardAdmin trong src/proxy.js) → không tốn lượt gọi API, không chạm giới hạn chống spam.
 *
 * Form đang có nội dung chưa lưu (useUnsavedGuard) → bấm link bất kỳ trong CMS cũng hỏi trước
 * (sự kiện "vl-admin-leave" → AdminShell hiện hộp xác nhận), không chỉ link ở thanh menu.
 */
export default function Link({ onClick, ...props }) {
  const handleClick = (e) => {
    onClick?.(e);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      props.target === "_blank" ||
      !window.__vlHasUnsaved?.()
    )
      return;
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent("vl-admin-leave", { detail: e.currentTarget.getAttribute("href") }),
    );
  };
  return <NextLink {...props} onClick={handleClick} />;
}
