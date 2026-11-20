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
 * - credit: ghi công tác giả ảnh { label, text, href? } → nhãn nhỏ mờ ở góc dưới bên phải ảnh.
 * - collage: [ảnh…] (tuỳ chọn, trang danh sách tour) → từ màn hình lớn: tiêu đề canh trái, bên phải là 1–3 ảnh
 *   ghép chéo trong khung "giọt nước" bo tròn (kiểu localvietnam); nền còn 1 ảnh phủ tối để khung ảnh nổi lên.
 *   Điện thoại / máy tính bảng: giữ nguyên hero canh giữa như cũ (không có khung ảnh).
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
  credit,
  collage,
}) {
  const list = [...new Set(images.filter(Boolean))].slice(0, 3);
  const n = list.length;
  const tiles = [...new Set((collage ?? []).filter(Boolean))].slice(0, 3);
  const split = tiles.length > 0;
  return (
    <section className="relative isolate overflow-hidden bg-brand-950">
      <div className="absolute inset-0 -z-10 flex gap-[3px] bg-brand-950">
        {list.map((src, i) => (
          <div
            key={src}
            className={cn(
              "relative h-full flex-1",
              i > 0 && "hidden md:block",
              // có khung ảnh ghép: màn hình lớn chỉ giữ ảnh nền đầu tiên
              i > 0 && split && "lg:hidden",
            )}
          >
            <Image
              src={src}
              alt=""
              fill
              // Chỉ ảnh đầu được tải trước (ảnh LCP); ảnh 2–3 bị ẩn trên điện thoại → không tải trước
              // (preload sẽ tải cả ảnh đang ẩn, giành băng thông với ảnh chính). Máy tính: tải ngay, ưu tiên thấp hơn.
              preload={i === 0}
              fetchPriority={i === 0 ? "high" : undefined}
              loading={i === 0 ? undefined : "lazy"}
              sizes={n > 1 ? "(min-width: 768px) 34vw, 100vw" : "100vw"}
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />
      {split && (
        <div className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/55 via-black/35 to-black/10 lg:block" />
      )}
      <Container
        className={cn(
          "flex min-h-[360px] flex-col items-center justify-center pt-24 pb-12 text-center text-white sm:min-h-[420px] lg:min-h-[460px] lg:pt-32",
          split &&
            "lg:grid lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center lg:gap-14 lg:text-left xl:grid-cols-[minmax(0,1fr)_28rem]",
        )}
      >
        <div className={split ? "flex flex-col items-center lg:items-start" : "contents"}>
          {breadcrumbs && (
            <Breadcrumbs items={breadcrumbs} baseUrl={baseUrl} light className="mb-5" />
          )}
          <h1
            className={cn(
              "drop-shadow-md",
              compact
                ? "max-w-4xl text-3xl leading-tight font-bold tracking-tight sm:text-5xl"
                : "brush text-4xl font-extrabold tracking-tight [--brush-color:var(--color-clay-600)] sm:text-6xl",
              split && !compact && "lg:-ml-[0.4em] lg:text-[3.25rem] lg:leading-[1.1]",
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
        </div>
        {split && <BlobCollage images={tiles} />}
      </Container>
      {credit?.text && n > 0 && <PhotoCredit {...credit} />}
    </section>
  );
}

// Khung "giọt nước" (toạ độ 0–1 theo khung) + các dải ảnh chéo, khe trắng giữa các dải
const BLOB =
  "M0.06,0.42 C0.1,0.18 0.36,0.03 0.66,0.01 C0.88,-0.005 1,0.1 0.985,0.3 C0.97,0.52 0.85,0.76 0.62,0.9 C0.43,1.01 0.2,1.02 0.08,0.86 C0.01,0.76 0.02,0.58 0.06,0.42 Z";
const BANDS = {
  1: ["none"],
  2: ["polygon(0 0, 100% 0, 100% 38%, 0 68%)", "polygon(0 70.5%, 100% 40.5%, 100% 100%, 0 100%)"],
  3: [
    "polygon(0 0, 100% 0, 100% 22%, 0 50%)",
    "polygon(0 52.5%, 100% 24.5%, 100% 62%, 0 90%)",
    "polygon(0 92.5%, 100% 64.5%, 100% 100%, 0 100%)",
  ],
};

/** 1–3 ảnh ghép chéo trong khung bo tròn tự nhiên + "bóng" màu đất nung lệch nhẹ phía sau (trang trí) */
function BlobCollage({ images }) {
  const bands = BANDS[images.length];
  return (
    <div
      aria-hidden
      className="relative hidden aspect-[5/4] w-full drop-shadow-[0_24px_40px_rgba(0,0,0,0.35)] lg:block"
    >
      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id="vl-hero-blob" clipPathUnits="objectBoundingBox">
            <path d={BLOB} />
          </clipPath>
        </defs>
      </svg>
      <div className="absolute inset-0 translate-x-4 translate-y-3 rotate-[8deg] bg-clay-500/85 [clip-path:url(#vl-hero-blob)]" />
      <div className="absolute inset-0 bg-white/95 [clip-path:url(#vl-hero-blob)]">
        {images.map((src, i) => (
          <div key={src} className="absolute inset-0" style={{ clipPath: bands[i] }}>
            <Image src={src} alt="" fill sizes="448px" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ghi công tác giả ảnh hero: nhãn nhỏ, nền tối mờ, góc dưới bên phải (không đè tiêu đề / breadcrumb) */
function PhotoCredit({ label, text, href }) {
  const body = (
    <>
      {label}: {text}
    </>
  );
  const cls =
    "absolute right-2 bottom-2 z-10 max-w-[calc(100%-1rem)] truncate rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] leading-4 text-white/80 backdrop-blur-sm sm:right-4 sm:bottom-3 sm:max-w-md sm:text-[11px]";
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={`${label}: ${text}`}
      className={cn(cls, "transition hover:bg-black/65 hover:text-white")}
    >
      {body}
    </a>
  ) : (
    <p className={cls} title={`${label}: ${text}`}>
      {body}
    </p>
  );
}

/** Giữ API cũ: banner 1 ảnh (hoặc nhiều ảnh) → dùng chung BrushHero. */
export function BannerHero({ title, subtitle, image, images, breadcrumbs, collage }) {
  return (
    <BrushHero
      title={title}
      subtitle={subtitle}
      images={images || [image]}
      breadcrumbs={breadcrumbs}
      collage={collage}
    />
  );
}

/** Giữ API cũ cho trang điểm đến → dùng chung BrushHero. */
export function BlobHero({ title, text, image, images, link, breadcrumbs, children, collage }) {
  return (
    <BrushHero
      title={title}
      subtitle={text}
      images={images || [image]}
      breadcrumbs={breadcrumbs}
      collage={collage}
      cta={link && { href: link.href, label: link.label, variant: "outline-white" }}
    >
      {children}
    </BrushHero>
  );
}

// Hộp "Not sure which tour to choose?" — tách riêng để dùng được cả trong client component
export { default as AdviceBox } from "./AdviceBox";
