import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo tròn xoay kiểu trống đồng (gộp yêu cầu 16 + 18 của khách):
 * - vòng ngoài: hoa văn trống đồng (SVG vẽ bằng code – chim lạc cách điệu, tia mặt trời) xoay chậm
 * - vòng chữ "VIETLOOK TRAVEL · SINCE 2009" chạy quanh logo, xoay ngược chiều
 * - tâm: logo chim hạc của Vietlook trên đĩa trắng
 * Mọi thứ là SVG/CSS, không ảnh ngoài → nhẹ, sắc nét ở mọi cỡ.
 */
export default function DrumLogo({
  size = 320,
  className,
  text = "VIETLOOK TRAVEL · SINCE 2009 · HANOI · VIETNAM · ",
}) {
  const rays = Array.from({ length: 16 });
  const birds = Array.from({ length: 12 });
  return (
    <div
      className={cn("relative shrink-0 select-none", className)}
      style={{ width: size, height: size }}
      aria-label="Vietlook Travel"
      role="img"
    >
      {/* Vòng hoa văn ngoài – xoay chậm */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 animate-spin-slower text-clay-500">
        <circle cx="100" cy="100" r="97" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle
          cx="100"
          cy="100"
          r="88"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeDasharray="2 2.5"
        />
        {/* chim lạc cách điệu */}
        {birds.map((_, i) => (
          <g key={i} transform={`rotate(${(360 / birds.length) * i} 100 100)`}>
            <path
              d="M100 8 l6 5 -3 1 4 4 -5-1 1 5 -3-3 -3 3 1-5 -5 1 4-4 -3-1z"
              fill="currentColor"
              opacity="0.9"
            />
          </g>
        ))}
        <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* tia mặt trời */}
        {rays.map((_, i) => (
          <polygon
            key={i}
            points="100,24 103,33 97,33"
            fill="currentColor"
            opacity="0.8"
            transform={`rotate(${(360 / rays.length) * i} 100 100)`}
          />
        ))}
        <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.6" />
      </svg>

      {/* Vòng chữ – xoay ngược chiều */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 animate-spin-reverse">
        <defs>
          <path id="drum-text-path" d="M100,100 m-60,0 a60,60 0 1,1 120,0 a60,60 0 1,1 -120,0" />
        </defs>
        <text
          className="fill-forest-700 font-sans text-[9.2px] font-bold tracking-[0.28em]"
          dominantBaseline="middle"
        >
          <textPath href="#drum-text-path" startOffset="0">
            {text}
          </textPath>
        </text>
      </svg>

      {/* Đĩa trung tâm + logo */}
      <div className="absolute inset-[29%] grid place-items-center rounded-full bg-white shadow-[0_14px_40px_-16px_rgba(60,40,10,0.45)] ring-1 ring-sand-300/70">
        <Image
          src="/images/logo/vietlook-icon.png"
          alt=""
          width={210}
          height={210}
          className="h-auto w-[62%]"
        />
      </div>
    </div>
  );
}
