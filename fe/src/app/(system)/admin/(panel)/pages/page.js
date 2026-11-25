import { Suspense } from "react";
import ContentPagesPage from "@/components/admin/ContentPagesPage";
import { LoadingBlock } from "@/components/admin/ui";

export const metadata = { title: "Giao diện trang" };

export default function Page() {
  // useSearchParams (?key=) cần Suspense
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ContentPagesPage />
    </Suspense>
  );
}
