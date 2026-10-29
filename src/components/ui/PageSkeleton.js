import { Container } from "@/components/ui";

/** Khung chờ (skeleton) khi chuyển trang – giúp điều hướng hiển thị tức thì. */
export default function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-[340px] bg-gradient-to-br from-brand-100 via-surface to-brand-50" />
      <Container className="py-12">
        <div className="mx-auto h-10 w-2/3 max-w-xl rounded-full bg-surface" />
        <div className="mx-auto mt-4 h-4 w-1/2 max-w-md rounded-full bg-surface" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl ring-1 ring-border">
              <div className="aspect-[4/3] bg-surface" />
              <div className="space-y-2 p-5">
                <div className="h-3 w-1/3 rounded-full bg-surface" />
                <div className="h-4 w-5/6 rounded-full bg-surface" />
                <div className="h-4 w-2/3 rounded-full bg-surface" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
