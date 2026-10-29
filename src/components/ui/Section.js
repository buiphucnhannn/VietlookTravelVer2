import { cn } from "@/lib/utils";
import Container from "./Container";

/** Mũi tên vẽ tay đi kèm ghi chú (như localvietnam.com). */
export function HandArrow({ className, flip }) {
  return (
    <svg
      viewBox="0 0 120 70"
      fill="none"
      aria-hidden
      className={cn("h-12 w-24", flip && "-scale-x-100", className)}
    >
      <path
        d="M112 6C104 34 74 58 14 60"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M26 48 12 60l15 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ghi chú viết tay, đặt tuyệt đối ở góc khối (ẩn trên mobile). */
export function HandNote({ children, className, arrow = "below", light }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute hidden font-hand text-[1.7rem] leading-[1.15] lg:block",
        light ? "text-amber-brand" : "text-clay-600",
        className,
      )}
      aria-hidden
    >
      <p className="whitespace-pre-line">{children}</p>
      {arrow === "below" && <HandArrow className="mt-1 ml-auto" />}
      {arrow === "below-left" && <HandArrow flip className="mt-1" />}
    </div>
  );
}

/**
 * Tiêu đề khối kiểu localvietnam: dòng nhỏ in hoa, tiêu đề rất đậm,
 * phụ đề, gạch ngắn bên dưới.
 */
export function SectionHeading({ eyebrow, title, subtitle, align = "center", light, className }) {
  const centered = align === "center";
  return (
    <header className={cn("mb-8 lg:mb-10", centered && "mx-auto max-w-3xl text-center", className)}>
      {eyebrow && (
        <p
          className={cn(
            "mb-3 text-xs font-bold tracking-[0.18em] uppercase sm:text-sm",
            light ? "text-amber-brand" : "text-clay-600",
          )}
        >
          {eyebrow}
        </p>
      )}
      {title && <h2 className={cn("heading-lg", light ? "text-white" : "text-ink")}>{title}</h2>}
      {subtitle && (
        <p
          className={cn(
            "mt-4 text-base text-balance sm:text-lg",
            light ? "text-white/80" : "text-ink/75",
          )}
        >
          {subtitle}
        </p>
      )}
      <span
        aria-hidden
        className={cn(
          "mt-6 block h-[3px] w-16 rounded-full",
          centered && "mx-auto",
          light ? "bg-amber-brand" : "bg-clay-500",
        )}
      />
    </header>
  );
}

export default function Section({
  eyebrow,
  title,
  subtitle,
  align,
  light,
  note,
  className,
  containerClassName,
  children,
  ...props
}) {
  return (
    <section className={cn("relative py-14 lg:py-[4.5rem]", className)} {...props}>
      <Container className={cn("relative", containerClassName)}>
        {note && <HandNote className="top-0 right-0">{note}</HandNote>}
        {(title || subtitle) && (
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            align={align}
            light={light}
          />
        )}
        {children}
      </Container>
    </section>
  );
}
