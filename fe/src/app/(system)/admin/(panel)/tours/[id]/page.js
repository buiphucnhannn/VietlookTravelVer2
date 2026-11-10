import { Suspense } from "react";
import TourEditor from "@/components/admin/TourEditor";
import { LoadingBlock } from "@/components/admin/ui";

export const metadata = { title: "Sửa tour" };

/** Đọc params bên trong <Suspense> → chuyển trang tức thì (hiện khung chờ ngay, không chặn điều hướng) */
async function Editor({ params }) {
  const { id } = await params;
  return <TourEditor key={id} id={id} />;
}

export default function Page({ params }) {
  return (
    <Suspense fallback={<LoadingBlock text="Đang tải tour…" />}>
      <Editor params={params} />
    </Suspense>
  );
}
