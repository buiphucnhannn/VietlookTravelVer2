import { Suspense } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { LoadingBlock } from "@/components/admin/ui";

export const metadata = {
  title: { default: "Tổng quan", template: "%s – Quản trị | Vietlook Travel" },
};

/**
 * Khung CMS + các trang đều là Client Component tự tải dữ liệu qua API (đã kiểm tra đăng nhập + quyền ở backend)
 * → Next dựng sẵn lúc build thành khung tĩnh, giống nhau cho mọi người, KHÔNG chứa dữ liệu nào.
 * Bấm menu: khung trang đích đã được tải trước → hiện ngay, không phải chờ máy chủ dựng lại từng lần.
 * Người chưa đăng nhập: src/proxy.js chuyển về trang đăng nhập trước khi trả trang.
 */
export default function PanelLayout({ children }) {
  return (
    <AdminShell>
      <Suspense fallback={<LoadingBlock />}>{children}</Suspense>
    </AdminShell>
  );
}
