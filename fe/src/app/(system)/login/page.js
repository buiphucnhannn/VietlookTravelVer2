import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Logo from "@/components/layout/Logo";
import LoginForm from "./LoginForm";

export const metadata = { title: "Đăng nhập quản trị" };

/**
 * Trang đăng nhập quản trị — 2 cột: ảnh thương hiệu (trái) · form căn giữa (phải).
 * Điện thoại: ẩn cột ảnh, form vừa 1 màn hình + logo phía trên.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-svh bg-white lg:grid-cols-[1.15fr_1fr]">
      <aside className="relative isolate hidden min-h-svh flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-14">
        <Image
          src="/images/tours/hd/ha-long.jpg"
          alt=""
          fill
          priority
          sizes="55vw"
          quality={85}
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/95 via-brand-950/70 to-brand-950/20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-950/85 via-transparent to-transparent" />

        {/* Logo như header website trên nền ảnh: đĩa trắng viền vàng + chữ trắng có bóng — không cần khung bao */}
        <Logo lang="en" light className="self-start" />

        <div className="max-w-md">
          <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.3em] text-sun-400 uppercase">
            <span className="h-px w-8 bg-sun-400" /> Hệ thống quản trị
          </p>
          <h2 className="mt-5 text-[46px] leading-[1.08] font-bold tracking-tight">
            Vietlook Travel
            <span className="block font-[family-name:var(--font-admin)] text-white/70">
              Tour Operator & DMC
            </span>
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/75">
            Quản lý đơn đặt tour, yêu cầu tư vấn, tour, điểm đến, dịch vụ và nội dung website tại
            một nơi.
          </p>
        </div>

        <p className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
          © Vietlook Travel and Trading Co., Ltd · Since 2009
        </p>
      </aside>

      <section className="relative flex min-h-svh items-center justify-center px-5 py-16 sm:px-10">
        <Link
          href="/"
          className="absolute top-5 left-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand-700 sm:top-7 sm:left-10"
        >
          <ArrowLeft className="size-4" /> Về website
        </Link>

        <div className="w-full max-w-[420px]">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/images/logo/vietlook-logo.png"
              alt="Vietlook Travel"
              width={180}
              height={56}
              priority
              className="mb-8 h-11 w-auto lg:hidden"
            />
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <ShieldCheck className="size-6" />
            </span>
            <p className="mt-5 text-[11px] font-semibold tracking-[0.28em] text-sun-500 uppercase">
              Khu vực bảo mật
            </p>
            <h1 className="mt-2 text-[30px] font-bold tracking-tight text-slate-900 sm:text-[36px]">
              Đăng nhập quản trị
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Dành riêng cho quản trị viên Vietlook Travel.
            </p>
          </div>
          <Suspense fallback={<div className="mt-8 h-[320px]" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
