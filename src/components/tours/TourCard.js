import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Eye, MapPin } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import { lp } from "@/i18n/config";

export function durationLabel(card, labels) {
  if (card.days <= 1) return card.halfDay ? labels.halfDay : `1 ${labels.day}`;
  const n = card.nights === 1 ? labels.night || labels.nights : labels.nights;
  return `${card.days} ${labels.days}${card.nights ? ` / ${card.nights} ${n}` : ""}`;
}

/** Thẻ tour kiểu localvietnam: ảnh bo tròn, số ngày, tiêu đề đậm, nút viền "View tour". */
export default function TourCard({ card, lang, labels, badge, className, priority, compact }) {
  const url = `${lp(lang)}/tours/${card.slug}`;
  return (
    <article
      className={cn(
        // Khung bo vòm (arch) nền kem theo yêu cầu khách – đồng bộ với ô điểm đến
        "group arch-frame relative flex flex-col transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(60,40,10,0.45)]",
        className,
      )}
    >
      <Link
        href={url}
        className={cn(
          "arch relative block overflow-hidden bg-sand-300/40",
          // compact: ảnh vuông để lưới 8 tour trên trang chủ gọn trong 2 hàng
          compact ? "aspect-square" : "aspect-[4/5]",
        )}
        tabIndex={-1}
        aria-hidden
      >
        <Image
          src={card.image}
          alt=""
          fill
          priority={priority}
          // Ảnh nguồn đa số ngang 3:2 mà khung dọc (4:5) / vuông → object-cover phóng ảnh theo
          // chiều cao: bề rộng ảnh cần ≈ 1.9× (vuông: 1.5×) bề rộng thẻ, nếu không sẽ bị mờ
          sizes={
            compact
              ? "(min-width: 1280px) 600px, (min-width: 768px) 70vw, 150vw"
              : "(min-width: 1280px) 760px, (min-width: 768px) 90vw, 170vw"
          }
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {badge && (
          <span className="absolute top-4 right-4 rounded-full bg-clay-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
            {badge}
          </span>
        )}
        {/* Nhãn số ngày dưới ảnh (mẫu arch của khách) */}
        <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-cream-50/95 px-3 py-1 text-xs font-semibold whitespace-nowrap text-clay-600 shadow">
          <Clock className="size-3.5" />
          {durationLabel(card, labels)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col px-3 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-muted">
          {card.destinationNames?.length > 0 && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 text-forest-700" />
              {card.destinationNames.slice(0, 2).join(", ")}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[1.05rem] leading-snug font-bold text-ink transition-colors group-hover:text-clay-600">
          <Link href={url} className="after:absolute after:inset-0">
            {card.title}
          </Link>
        </h3>
        {card.summary && !compact && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{card.summary}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="min-w-0 leading-tight">
            {card.price ? (
              <>
                <span className="block text-xs text-muted">{labels.from}</span>
                <span className="flex flex-wrap items-baseline gap-x-1.5">
                  {card.originalPrice && (
                    <span className="text-xs text-muted line-through">
                      {formatUSD(card.originalPrice)}
                    </span>
                  )}
                  <span className="text-xl font-bold text-sun-500">{formatUSD(card.price)}</span>
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-clay-600">{labels.contactPrice}</span>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 items-center gap-1.5 rounded-full border-2 border-clay-500 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-clay-600 transition-colors group-hover:bg-clay-500 group-hover:text-white",
              // lưới 2 cột trên mobile hẹp → ẩn nút, cả thẻ vẫn bấm được
              compact ? "hidden sm:inline-flex" : "inline-flex",
            )}
          >
            <Eye className="size-4" />
            {labels.viewTour}
          </span>
        </div>
      </div>
    </article>
  );
}

/** Thẻ tour dài ngày kiểu lilystravelagency.com: giá gạch + giá khuyến mãi + nút "Book now". */
export function LongTourCard({ card, lang, labels }) {
  const url = `${lp(lang)}/tours/${card.slug}`;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:shadow-xl">
      <div className="relative aspect-[16/11] overflow-hidden">
        <Image
          src={card.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 85vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-forest-700 shadow">
          {card.days} {labels.days} · {card.nights} {labels.nights}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-3 text-[1.02rem] leading-snug font-semibold tracking-wide text-ink">
          <Link href={url} className="after:absolute after:inset-0 hover:text-forest-700">
            {card.title}
          </Link>
        </h3>
        {card.route?.length > 0 && (
          <p className="mt-2 line-clamp-1 text-xs text-muted">
            {card.destinationNames.join(" · ")}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="flex items-baseline gap-1.5">
            {card.originalPrice && (
              <span className="text-sm text-muted line-through">
                {formatUSD(card.originalPrice)}
              </span>
            )}
            <span className="text-xl font-bold text-sun-600">{formatUSD(card.price)}</span>
          </span>
          <span className="rounded-md border border-sun-500 px-4 py-2 text-sm font-medium text-sun-600 transition-colors group-hover:bg-sun-500 group-hover:text-white">
            {labels.bookNow}
          </span>
        </div>
      </div>
    </article>
  );
}

/** Thẻ tour kiểu auroratravel.asia (trang chủ đề): ảnh, tiêu đề in hoa có vạch vàng bên trái, gạch đậm dưới. */
export function AuroraTourCard({ card, lang, labels }) {
  const url = `${lp(lang)}/tours/${card.slug}`;
  return (
    // Thẻ cao bằng nhau trong cùng hàng: tiêu đề luôn chiếm đúng 2 dòng, gạch dưới bám đáy thẻ
    <article className="group flex h-full flex-col">
      <Link href={url} className="relative block aspect-[350/205] shrink-0 overflow-hidden">
        <Image
          src={card.image}
          alt={card.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col justify-between border-b-[3px] border-ink/80 pt-5 pb-4">
        <h3 className="border-l-[6px] border-amber-brand pl-5 text-lg leading-snug font-medium text-ink uppercase">
          <Link
            href={url}
            title={card.title}
            className="line-clamp-2 min-h-[2lh] hover:text-[#c98a0a]"
          >
            {card.title}
          </Link>
        </h3>
        <p className="mt-2 pl-[1.6rem] text-sm text-muted">
          {durationLabel(card, labels)} ·{" "}
          {card.price ? (
            <span className="font-semibold text-ink">
              {labels.from}{" "}
              {card.originalPrice && (
                <span className="mr-1 font-normal text-muted line-through">
                  {formatUSD(card.originalPrice)}
                </span>
              )}
              <span className="text-sun-500">{formatUSD(card.price)}</span>
            </span>
          ) : (
            labels.contactPrice
          )}
        </p>
      </div>
    </article>
  );
}

/** Ô điểm đến kiểu localvietnam: "Hanoi (12 Trips) →" với nút mũi tên tròn trắng. */
export function DestinationTile({ href, name, count, image, tripsLabel, className, sizes }) {
  return (
    <Link
      href={href}
      className={cn("group arch relative block overflow-hidden bg-forest-900 shadow-md", className)}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes={sizes || "(min-width: 1024px) 25vw, 50vw"}
        className="object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 text-white sm:p-5">
        <span className="min-w-0 flex-1">
          <span className="block text-lg leading-tight font-bold sm:text-xl">{name}</span>
          {count != null && (
            <span className="mt-0.5 block text-sm font-medium text-white/85">
              {count} {tripsLabel}
            </span>
          )}
        </span>
        <span className="hidden size-9 shrink-0 place-items-center rounded-full bg-white text-forest-700 shadow transition-transform group-hover:translate-x-1 sm:grid">
          <ArrowRight className="size-4" />
        </span>
      </span>
    </Link>
  );
}
