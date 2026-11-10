import { Suspense } from "react";
import { Hourglass } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import RetryButton from "./RetryButton";

export const metadata = { title: "Thao tác quá nhanh" };

/** Proxy trả trang này (HTTP 429) khi backend tạm giới hạn yêu cầu của khu quản trị */
async function Retry({ searchParams }) {
  const { next, retry } = await searchParams;
  const safe =
    String(next ?? "").startsWith(ADMIN_BASE) && !String(next).startsWith("//") ? next : ADMIN_BASE;
  return <RetryButton seconds={retry} href={safe} />;
}

export default function TooManyRequestsPage({ searchParams }) {
  return (
    <main className="grid min-h-svh place-items-center bg-brand-950 px-6 text-center text-white">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10 text-sun-400">
          <Hourglass className="size-7" />
        </span>
        <p className="mt-6 text-[11px] font-semibold tracking-[0.3em] text-sun-400 uppercase">
          429 · Tạm dừng một chút
        </p>
        <h1 className="mt-3 text-3xl font-bold">Bạn thao tác hơi nhanh</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Để bảo vệ tài khoản, hệ thống tạm giới hạn yêu cầu. Vui lòng chờ trong giây lát rồi thử
          lại.
        </p>
        <div className="mt-8">
          <Suspense fallback={<RetryButton seconds={60} href={ADMIN_BASE} />}>
            <Retry searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
