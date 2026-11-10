import Link from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  // Bảng màu ấm theo brief khách: xanh rừng cho nút chính, đất nung cho CTA
  primary:
    "bg-forest-700 text-white shadow-sm hover:bg-forest-900 focus-visible:outline-forest-700",
  cta: "bg-clay-500 text-white shadow-sm shadow-clay-500/25 hover:bg-clay-600 focus-visible:outline-clay-500",
  outline: "border-2 border-forest-700 text-forest-700 hover:bg-forest-700 hover:text-white",
  "outline-white": "border-2 border-white/80 text-white hover:bg-white hover:text-forest-900",
  white: "bg-white text-forest-900 shadow-sm hover:bg-cream-100",
  ghost: "text-foreground hover:bg-black/5",
  link: "px-0! text-brand-600 underline-offset-4 hover:underline",
};

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[0.95rem]",
  lg: "h-13 px-8 text-base",
};

/** Truyền `href` để render thành Link, ngược lại là <button>. */
export default function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  external,
  ...props
}) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-all duration-200",
    "focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  if (href && external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props} />
    );
  }
  if (href) return <Link href={href} className={classes} {...props} />;
  return <button type="button" className={classes} {...props} />;
}
