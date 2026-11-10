"use client";

import NextLink from "next/link";

/**
 * Link trong khu quản trị: KHÔNG tải trước (prefetch).
 * Mỗi lượt tải trước đều đi qua bước kiểm tra đăng nhập → một trang có 20 link sẽ tốn 20 lượt gọi,
 * người quản trị làm việc nhanh sẽ chạm giới hạn chống spam và bị tạm khoá.
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
  return <NextLink prefetch={false} {...props} onClick={handleClick} />;
}
