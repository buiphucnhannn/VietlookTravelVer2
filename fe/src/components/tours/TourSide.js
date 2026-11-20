"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, MessagesSquare, Phone } from "lucide-react";
import StickySide from "@/components/ui/StickySide";
import { openContact } from "@/components/layout/FloatingContact";
import { LineIcon, WeChatIcon, WhatsAppIcon, ZaloIcon } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/utils";

// Khung đặt tour dính ngay dưới header (108px + 12px), chừa 12px ở đáy màn hình — khớp lg:max-h của khung
const OFFSET = 120;
const GAP = 12;

/**
 * Cột phải trang tour: khung đặt tour dính + khối "Liên hệ trực tiếp" lấp khoảng trắng bên cạnh lịch trình.
 * Khung đặt tour LUÔN được ưu tiên (tự co giãn vừa màn hình — fitDensity trong BookingWidget); khối liên hệ
 * chỉ xếp ngay dưới khung (cùng dính) khi màn hình còn đủ chỗ:
 *   - "full": còn nhiều chỗ → khối đầy đủ (số hotline, các kênh chat, email, lời chào cuối)
 *   - "compact": còn ít chỗ → 1 dòng tiêu đề + hàng biểu tượng kênh liên hệ
 *   - "end": không còn chỗ (màn hình thấp) hoặc điện thoại → khối đầy đủ nằm ở CUỐI cột, hiện ra khi
 *     cuộn tới cuối nội dung (khung đặt tour thôi dính) → không bao giờ che khung đặt tour.
 * Chiều cao 2 kiểu được đo từ bản ẩn (inert) cùng bề rộng cột; đổi bước đặt tour / đổi cỡ màn hình → đo lại.
 */
export default function TourSide({ cardClassName, contact, children }) {
  const cardRef = useRef(null);
  const measureRef = useRef(null);
  const [tier, setTier] = useState("end");

  useEffect(() => {
    const card = cardRef.current;
    const m = measureRef.current;
    if (!card || !m) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!mq.matches) return setTier("end");
        const avail = window.innerHeight - OFFSET - GAP - card.offsetHeight - GAP;
        const full = m.querySelector("[data-v=full]")?.offsetHeight ?? Infinity;
        const compact = m.querySelector("[data-v=compact]")?.offsetHeight ?? Infinity;
        setTier(full <= avail ? "full" : compact <= avail ? "compact" : "end");
      });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(card);
    ro.observe(m);
    window.addEventListener("resize", run);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, []);

  return (
    <>
      <div className="lg:flex-1">
        <StickySide offset={OFFSET} gap={GAP}>
          <div ref={cardRef} data-book-card className={cardClassName}>
            {children}
          </div>
          {tier !== "end" && (
            <div className="mt-3 hidden lg:block">
              <ContactBox {...contact} variant={tier} />
            </div>
          )}
        </StickySide>
      </div>
      <div className={cn("mt-6", tier !== "end" && "lg:hidden")}>
        <ContactBox {...contact} variant="full" intro />
      </div>
      {/* Bản đo (ẩn, không bấm / không đọc được) — cùng bề rộng cột */}
      <div
        ref={measureRef}
        aria-hidden="true"
        inert
        className="pointer-events-none invisible absolute inset-x-0 top-0 -z-10 hidden lg:block"
      >
        <div data-v="full">
          <ContactBox {...contact} variant="full" />
        </div>
        <div data-v="compact">
          <ContactBox {...contact} variant="compact" />
        </div>
      </div>
    </>
  );
}

/** Một kênh chat: link mở app (WhatsApp, Zalo) hoặc nút mở hộp thoại ID (WeChat, LINE) */
function Channel({ c, className, children }) {
  const props = {
    className,
    title: c.label,
    "aria-label": children ? undefined : c.label,
  };
  return c.href ? (
    <a href={c.href} target="_blank" rel="noopener noreferrer" {...props}>
      {children ?? c.icon}
    </a>
  ) : (
    <button type="button" onClick={c.onClick} {...props}>
      {children ?? c.icon}
    </button>
  );
}

const boxCls =
  "rounded-2xl bg-white shadow-[0_2px_20px_-10px_rgba(15,62,95,0.25)] ring-1 ring-border";

/** Khối "Liên hệ trực tiếp" (kiểu "Or contact us directly" của localvietnam) */
function ContactBox({
  variant,
  intro,
  title,
  text,
  signoff,
  team,
  channelsNote,
  emailLabel,
  labels,
  hotline,
  hotlineRaw,
  email,
  whatsapp,
  zalo,
}) {
  const channels = [
    {
      key: "whatsapp",
      label: labels.whatsapp,
      icon: <WhatsAppIcon className="size-5 text-[#25d366]" />,
      href: whatsapp,
    },
    { key: "zalo", label: labels.zalo, icon: <ZaloIcon className="size-6" />, href: zalo },
    {
      key: "wechat",
      label: labels.wechat,
      icon: <WeChatIcon className="size-5 text-[#07c160]" />,
      onClick: () => openContact("wechat"),
    },
    {
      key: "line",
      label: labels.line,
      icon: <LineIcon className="size-6" />,
      onClick: () => openContact("line"),
    },
  ];

  if (variant === "compact") {
    const round =
      "grid size-8 shrink-0 place-items-center rounded-full bg-white ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-brand-300 [&_svg]:max-w-5";
    return (
      <div className={cn(boxCls, "px-4 py-3.5")}>
        <p className="flex items-center gap-2 text-sm leading-tight font-bold text-ink">
          <MessagesSquare className="size-4 shrink-0 text-brand-600" />
          {title}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <a
            href={`tel:${hotlineRaw}`}
            className="flex h-8 min-w-0 items-center gap-1.5 rounded-full bg-sun-500 px-2.5 text-[0.8rem] font-semibold whitespace-nowrap text-white tabular-nums transition hover:bg-sun-600"
          >
            <Phone className="size-3.5 shrink-0" />
            {hotline}
          </a>
          <div className="flex items-center gap-1">
            {channels.map((c) => (
              <Channel key={c.key} c={c} className={round} />
            ))}
            <a
              href={`mailto:${email}`}
              className={cn(round, "text-brand-600")}
              aria-label={emailLabel}
              title={email}
            >
              <Mail className="size-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(boxCls, "p-5")}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
          <MessagesSquare className="size-5" />
        </span>
        <div className="min-w-0 self-center">
          <p className="leading-snug font-bold text-ink">{title}</p>
          {/* Câu giới thiệu chỉ ở khối cuối cột / điện thoại (khối dính dưới khung đặt tour cần gọn) */}
          {intro && <p className="mt-0.5 text-sm leading-snug text-muted">{text}</p>}
        </div>
      </div>
      <a
        href={`tel:${hotlineRaw}`}
        className="mt-3.5 flex items-center gap-3 rounded-xl bg-sun-50 px-4 py-2 transition hover:bg-sun-100"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sun-500 text-white">
          <Phone className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-ink tabular-nums">{hotline}</span>
          <span className="block truncate text-xs text-muted">{channelsNote}</span>
        </span>
      </a>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {channels.map((c) => (
          <Channel
            key={c.key}
            c={c}
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink ring-1 ring-border transition hover:bg-surface hover:ring-brand-200"
          >
            {c.icon}
            {c.label}
          </Channel>
        ))}
      </div>
      <a
        href={`mailto:${email}`}
        className="mt-2.5 flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
      >
        <Mail className="size-4 shrink-0" />
        <span className="truncate">{email}</span>
      </a>
      <p className="mt-3 border-t border-border pt-2.5 font-hand text-[1.05rem] leading-snug text-clay-600">
        {signoff} <span className="whitespace-nowrap">{team}</span>
      </p>
    </div>
  );
}
