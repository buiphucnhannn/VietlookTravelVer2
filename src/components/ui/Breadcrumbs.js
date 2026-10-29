import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** items: [{ label, href? }] – mục cuối là trang hiện tại. Kèm JSON-LD BreadcrumbList. */
export default function Breadcrumbs({ items, className, light, baseUrl }) {
  const jsonLd = baseUrl && {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href && { item: `${baseUrl}${item.href}` }),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight
                className={cn("size-3.5", light ? "text-white/60" : "text-brand-500")}
                aria-hidden
              />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "transition-colors",
                  light ? "text-white/80 hover:text-white" : "text-muted hover:text-brand-600",
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className={light ? "text-white" : "text-ink"}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </nav>
  );
}
