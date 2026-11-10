import Image from "next/image";
import { cn } from "@/lib/utils";
import Breadcrumbs from "./Breadcrumbs";
import Button from "./Button";
import Container from "./Container";

/**
 * Hero đầu trang dùng chung (kiểu trang Package / Tailor-made của localvietnam):
 * dải 1–3 ảnh ghép thẳng, phủ tối nhẹ, tiêu đề trên nét cọ xanh, header trong suốt phủ lên.
 * - subtitle: dòng phụ (ngắn) hoặc đoạn giới thiệu.
 * - compact: tiêu đề dài (bài viết) → chữ nhỏ hơn, không nét cọ.
 * - children: thông tin thêm dưới tiêu đề (meta bài viết, nút…).
 */
export function BrushHero({
  title,
  subtitle,
  images,
  cta,
  breadcrumbs,
  baseUrl,
  compact,
  children,
}) {
  const list = [...new Set(images.filter(Boolean))].slice(0, 3);
  const n = list.length;
  return (
    <section className="relative isolate overflow-hidden bg-brand-950">
      <div className="absolute inset-0 -z-10 flex gap-[3px] bg-brand-950">
        {list.map((src, i) => (
          <div key={src} className={cn("relative h-full flex-1", i > 0 && "hidden md:block")}>
            <Image
              src={src}
              alt=""
              fill
              priority={i < 2}
              sizes={n > 1 ? "(min-width: 768px) 34vw, 100vw" : "100vw"}
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />
      <Container className="flex min-h-[360px] flex-col items-center justify-center pt-24 pb-12 text-center text-white sm:min-h-[420px] lg:min-h-[460px] lg:pt-32">
        {breadcrumbs && (
          <Breadcrumbs items={breadcrumbs} baseUrl={baseUrl} light className="mb-5" />
        )}
        <h1
          className={cn(
            "drop-shadow-md",
            compact
              ? "max-w-4xl text-3xl leading-tight font-bold tracking-tight sm:text-5xl"
              : "brush text-4xl font-extrabold tracking-tight [--brush-color:var(--color-clay-600)] sm:text-6xl",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-3xl text-base font-semibold drop-shadow-md sm:text-xl">
            {subtitle}
          </p>
        )}
        {children}
        {cta && (
          <Button href={cta.href} variant={cta.variant || "cta"} className="mt-6">
            {cta.label}
          </Button>
        )}
      </Container>
    </section>
  );
}

/** Giữ API cũ: banner 1 ảnh (hoặc nhiều ảnh) → dùng chung BrushHero. */
export function BannerHero({ title, subtitle, image, images, breadcrumbs }) {
  return (
    <BrushHero
      title={title}
      subtitle={subtitle}
      images={images || [image]}
      breadcrumbs={breadcrumbs}
    />
  );
}

/** Giữ API cũ cho trang điểm đến → dùng chung BrushHero. */
export function BlobHero({ title, text, image, images, link, breadcrumbs, children }) {
  return (
    <BrushHero
      title={title}
      subtitle={text}
      images={images || [image]}
      breadcrumbs={breadcrumbs}
      cta={link && { href: link.href, label: link.label, variant: "outline-white" }}
    >
      {children}
    </BrushHero>
  );
}

/** Hộp "Not sure which tour to choose?" kiểu localvietnam. */
export function AdviceBox({ title, text, cta, href }) {
  return (
    // Dải ngang gọn: chữ bên trái, nút bên phải
    <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-border sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h2>
        <p className="mt-2 max-w-4xl leading-relaxed text-ink/75">{text}</p>
      </div>
      <Button href={href} variant="primary" className="shrink-0 self-start lg:self-center">
        {cta}
      </Button>
    </div>
  );
}
