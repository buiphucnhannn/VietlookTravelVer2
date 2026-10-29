import { useId } from "react";
import { cn } from "@/lib/utils";

/** Đường ngôi sao 5 cánh; `rot` là góc (độ) mà một cánh hướng tới. */
function star(cx, cy, r, rot = -90) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.382 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(3)} ${(cy + rr * Math.sin(a)).toFixed(3)}`);
  }
  return `M${pts.join("L")}Z`;
}

// Quốc kỳ Trung Quốc (lưới 30×20): 4 sao nhỏ xoay một cánh về phía sao lớn
const bigStar = star(5, 5, 3);
const smallStars = [
  [10, 2],
  [12, 4],
  [12, 7],
  [10, 9],
].map(([x, y]) => star(x, y, 1, (Math.atan2(5 - y, 5 - x) * 180) / Math.PI));

/** Cờ SVG (emoji cờ không hiển thị trên Windows). */
export default function Flag({ code, className }) {
  const clip = "uk" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const cls = cn(
    "inline-block h-[0.9em] w-[1.35em] shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
    className,
  );

  if (code === "zh") {
    return (
      <svg viewBox="0 0 30 20" preserveAspectRatio="none" className={cls} aria-hidden>
        <rect width="30" height="20" fill="#ee1c25" />
        <g fill="#ffde00">
          <path d={bigStar} />
          {smallStars.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>
    );
  }

  // Union Jack
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className={cls} aria-hidden>
      <clipPath id={clip}>
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0l60 30M60 0L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0l60 30M60 0L0 30" clipPath={`url(#${clip})`} stroke="#c8102e" strokeWidth="4" />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}
