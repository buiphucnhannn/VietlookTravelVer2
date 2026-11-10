import { Suspense } from "react";
import ContentPagesPage from "@/components/admin/ContentPagesPage";
import { LoadingBlock } from "@/components/admin/ui";

export const metadata = { title: "Giới thiệu & chính sách" };

export default function Page() {
  // useSearchParams (?key=) cần Suspense
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ContentPagesPage />
    </Suspense>
  );
}
