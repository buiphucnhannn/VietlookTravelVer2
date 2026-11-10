import { Suspense } from "react";
import EnquiriesPage from "@/components/admin/EnquiriesPage";
import { LoadingBlock } from "@/components/admin/ui";

export const metadata = { title: "Yêu cầu từ form" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <EnquiriesPage kind="requests" />
    </Suspense>
  );
}
