import { Suspense } from "react";
import { connection } from "next/server";
import AdminShell from "@/components/admin/AdminShell";
import { LoadingBlock } from "@/components/admin/ui";

// Khu quản trị chỉ dành cho người đã đăng nhập, luôn dựng theo từng request (không dựng sẵn) → bỏ kiểm tra
// "instant navigation" của Next cho cả nhánh /admin (tránh cảnh báo "dropped from rendering" trong lúc dev).
export const instant = false;

export const metadata = {
  title: { default: "Tổng quan", template: "%s – Quản trị | Vietlook Travel" },
};

/** Khu quản trị luôn render theo từng request (sau đăng nhập) — không dựng sẵn lúc build */
async function RequestTime({ children }) {
  await connection();
  return children;
}

// Truy cập khu quản trị đã được src/proxy.js kiểm tra đăng nhập TRƯỚC khi render.
export default function PanelLayout({ children }) {
  return (
    <AdminShell>
      <Suspense fallback={<LoadingBlock />}>
        <RequestTime>{children}</RequestTime>
      </Suspense>
    </AdminShell>
  );
}
