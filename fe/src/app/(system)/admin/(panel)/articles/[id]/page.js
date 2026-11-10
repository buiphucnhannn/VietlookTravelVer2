import { Suspense } from "react";
import ArticleEditor from "@/components/admin/ArticleEditor";
import { LoadingBlock } from "@/components/admin/ui";

export const metadata = { title: "Sửa bài viết" };

/** Đọc params bên trong <Suspense> → chuyển trang tức thì (hiện khung chờ ngay, không chặn điều hướng) */
async function Editor({ params }) {
  const { id } = await params;
  return <ArticleEditor key={id} id={id} />;
}

export default function Page({ params }) {
  return (
    <Suspense fallback={<LoadingBlock text="Đang tải bài viết…" />}>
      <Editor params={params} />
    </Suspense>
  );
}
