import Image from "next/image";
import { cn } from "@/lib/utils";

const tones = {
  // Lớp sáng đậm ở phần tiêu đề, mỏng dần xuống dưới để ảnh hiện rõ phía sau các thẻ
  light: "bg-gradient-to-b from-white/92 via-white/78 to-white/60",
  // Lớp sáng ngả xanh nhạt (khối nhấn nhẹ)
  mist: "bg-gradient-to-b from-[#f2f7fb]/92 via-[#f2f7fb]/80 to-[#f2f7fb]/65",
  // Chữ bên trái, ảnh lộ rõ bên phải (khối chia đôi)
  side: "bg-gradient-to-r from-[#f4f6f8]/95 via-[#f4f6f8]/85 to-[#f4f6f8]/35",
  // Lớp tối thương hiệu – chữ trắng ở bên trái, ảnh lộ rõ bên phải
  dark: "bg-gradient-to-r from-brand-950/90 via-brand-950/70 to-brand-950/30",
  // Tối trung tính (khối CTA, footer)
  night: "bg-gradient-to-r from-[#1c2630]/92 via-[#1c2630]/70 to-[#1c2630]/35",
};

/**
 * Ảnh nền phủ toàn khối + lớp màu. Đặt làm con đầu tiên của section có `relative isolate overflow-hidden`.
 */
export default function BgImage({ src, tone = "light", position = "center", className }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10", className)}>
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: position }}
      />
      <div className={cn("absolute inset-0", tones[tone])} />
    </div>
  );
}
