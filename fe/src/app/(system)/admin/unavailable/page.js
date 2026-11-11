import { Suspense } from "react";
import { CloudOff } from "lucide-react";
import { ADMIN_BASE, safeNext } from "@/config/urls.mjs";
import RetryButton from "../too-many-requests/RetryButton";

export const metadata = { title: "Hệ thống tạm gián đoạn" };

/** Proxy trả trang này (HTTP 503) khi máy chủ API tạm không trả lời — phiên đăng nhập vẫn giữ nguyên */
async function Retry({ searchParams }) {
  const { next } = await searchParams;
  return <RetryButton seconds={10} href={safeNext(next)} />;
}

export default function UnavailablePage({ searchParams }) {
  return (
    <main className="grid min-h-svh place-items-center bg-brand-950 px-6 text-center text-white">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10 text-sun-400">
          <CloudOff className="size-7" />
        </span>
        <p className="mt-6 text-[11px] font-semibold tracking-[0.3em] text-sun-400 uppercase">
          Tạm gián đoạn
        </p>
        <h1 className="mt-3 text-3xl font-bold">Hệ thống đang bảo trì</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Trang quản trị tạm thời chưa kết nối được — bạn vẫn đang đăng nhập, không cần nhập lại mật
          khẩu. Vui lòng thử lại sau ít giây.
        </p>
        <div className="mt-8">
          <Suspense fallback={<RetryButton seconds={10} href={ADMIN_BASE} />}>
            <Retry searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
