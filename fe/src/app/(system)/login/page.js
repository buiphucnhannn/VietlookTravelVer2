import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/layout/Logo";
import LoginForm from "./LoginForm";

export const metadata = { title: "Đăng nhập quản trị" };

/**
 * Trang đăng nhập quản trị — 2 cột: ảnh thương hiệu (trái) · form căn giữa (phải).
 * Điện thoại: ẩn cột ảnh, form vừa 1 màn hình + logo phía trên.
 */
export default function LoginPage() {
  return (
    // Màn rộng: khoá đúng 1 màn hình (không thanh cuộn) — nội dung đã gọn để vừa cả màn thấp ~640px
    <main className="grid min-h-svh bg-white lg:h-svh lg:grid-cols-2 lg:overflow-hidden">
      {/* Cột ảnh: logo trên cùng · lời giới thiệu dồn xuống đáy (vùng nước phẳng) · du thuyền nằm bên phải, không bị chữ che */}
      <aside className="relative isolate hidden h-full flex-col overflow-hidden p-10 text-white lg:flex xl:p-12">
        <Image
          src="/images/tours/v2/halong-bay-5041966.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          quality={90}
          className="-z-10 object-cover object-[28%_35%]"
        />
        {/* Phủ nhẹ: tối dần ở đáy (chỗ có chữ) + dải mỏng phía trên cho logo; giữa ảnh giữ rõ nét, đúng màu */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-950/90 via-brand-950/25 to-brand-950/35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/45 via-transparent to-transparent" />

        {/* Logo như header website trên nền ảnh: đĩa trắng viền vàng + chữ trắng có bóng — không cần khung bao */}
        <Logo lang="en" light className="self-start" />

        <div className="mt-auto max-w-[27rem]">
          <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.3em] text-sun-400 uppercase">
            <span className="h-px w-8 bg-sun-400" /> Hệ thống quản trị
          </p>
          <h2 className="mt-4 text-[32px] leading-[1.1] font-bold tracking-tight xl:text-[36px] 2xl:text-[40px]">
            Vietlook Travel
            <span className="block font-[family-name:var(--font-admin)] text-white/75">
              Tour Operator & DMC
            </span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">
            Quản lý đơn đặt tour, yêu cầu tư vấn, tour, điểm đến, dịch vụ và nội dung website tại
            một nơi.
          </p>
        </div>

        <p className="mt-10 border-t border-white/15 pt-5 text-[11px] tracking-[0.2em] text-white/55 uppercase">
          © Vietlook Travel and Trading Co., Ltd · Since 2009
        </p>
      </aside>

      <section className="relative flex min-h-svh items-center justify-center px-5 py-16 sm:px-10 lg:h-full lg:min-h-0 lg:py-10">
        <Link
          href="/"
          className="absolute top-5 left-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand-700 sm:top-8 sm:left-10 xl:left-14"
        >
          <ArrowLeft className="size-4" /> Về website
        </Link>

        <div className="w-full max-w-[400px]">
          <div className="flex flex-col items-center text-center">
            {/* Biểu tượng thương hiệu: chỉ hiện khi không có cột ảnh (điện thoại / màn hẹp) — màn rộng đã có logo bên trái */}
            <span className="mb-6 grid size-16 place-items-center rounded-full bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] ring-4 ring-amber-brand/25 lg:hidden">
              <Image
                src="/images/logo/vietlook-icon.png"
                unoptimized
                alt="Vietlook Travel"
                width={210}
                height={210}
                priority
                className="h-auto w-[46px]"
              />
            </span>
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">
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
