import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Con dấu tròn xoay (mục 6.3 – tham khảo lotuscharmtravel.com): đĩa màu Vietlook, vòng chữ
 * "VIETLOOK TRAVEL · SINCE 2009" xoay chậm, logo chim hạc ở tâm. Đặt đè lên góc ảnh/thẻ để thu hút
 * ánh nhìn. Dừng xoay khi người dùng bật giảm chuyển động.
 */
export default function SpinBadge({ className, text = "VIETLOOK TRAVEL · SINCE 2009 · " }) {
  return (
    <span
      className={cn(
        "pointer-events-none grid size-24 place-items-center rounded-full bg-clay-500 shadow-[0_12px_30px_-10px_rgba(120,60,20,0.6)] ring-4 ring-cream-50 sm:size-28",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full animate-spin-slow">
        <defs>
          <path id="spin-badge-path" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
        </defs>
        <text className="fill-white text-[10.5px] font-bold tracking-[0.2em]">
          <textPath href="#spin-badge-path">{text + text}</textPath>
        </text>
      </svg>
      <span className="relative grid size-[46%] place-items-center rounded-full bg-white">
        <Image
          src="/images/logo/vietlook-icon.png"
          alt=""
          width={80}
          height={80}
          className="h-auto w-[78%]"
        />
      </span>
    </span>
  );
}
