import { cn } from "@/lib/utils";

export default function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700",
        className,
      )}
      {...props}
    />
  );
}
