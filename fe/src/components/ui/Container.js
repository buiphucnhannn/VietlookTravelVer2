import { cn } from "@/lib/utils";

export default function Container({ as: Tag = "div", className, ...props }) {
  return (
    <Tag
      className={cn("mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10", className)}
      {...props}
    />
  );
}
