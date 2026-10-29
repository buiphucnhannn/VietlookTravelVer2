import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hàng 5 sao, hỗ trợ điểm lẻ (vd. 4.7 → 4 sao đầy + sao thứ 5 tô 70%). */
export default function Stars({ value = 5, className, size = 16 }) {
  return (
    <span
      className={cn("inline-flex gap-0.5 text-amber-brand", className)}
      aria-label={`${value}/5`}
      role="img"
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star
              width={size}
              height={size}
              className="absolute inset-0 fill-transparent opacity-40"
            />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star width={size} height={size} className="fill-current" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
