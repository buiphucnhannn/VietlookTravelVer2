"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Car,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Handshake,
  Info,
  Mail,
  Map as MapIcon,
  Menu,
  MessageCircle,
  Phone,
  Plane,
  Shield,
  Stamp,
  Star,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui";
import Logo from "./Logo";
import { lockScroll } from "@/components/fx/SmoothScroll";
import LanguageSwitcher from "./LanguageSwitcher";
import { lp } from "@/i18n/config";

const icons = {
  users: Users,
  car: Car,
  stamp: Stamp,
  plane: Plane,
  handshake: Handshake,
  info: Info,
  star: Star,
  message: MessageCircle,
  mail: Mail,
  card: CreditCard,
  calendar: Calendar,
  shield: Shield,
  map: MapIcon,
  book: BookOpen,
};

function MenuColumns({ columns, onNavigate }) {
  return (
    <div
      className="grid gap-x-10 gap-y-8"
      style={{ gridTemplateColumns: `repeat(${Math.min(columns.length, 4)}, minmax(0, 1fr))` }}
    >
      {columns.map((col, i) => (
        <div key={i}>
          {col.title &&
            (col.href ? (
              <Link
                href={col.href}
                onClick={onNavigate}
                className="mb-3 block text-lg font-semibold text-brand-700 hover:text-brand-500"
              >
                {col.title}
              </Link>
            ) : (
              <p className="mb-3 text-lg font-semibold text-brand-700">{col.title}</p>
            ))}
          <ul className={cn(col.grid ? "grid grid-cols-3 gap-x-6 gap-y-1" : "space-y-1")}>
            {col.links.map((l) => (
              <li key={l.href + l.label}>
                <Link
                  href={l.href}
                  onClick={onNavigate}
                  className="block py-1.5 text-[0.95rem] text-muted transition-colors hover:translate-x-0.5 hover:text-sun-500"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {col.footer && (
              <li>
                <Link
                  href={col.footer.href}
                  onClick={onNavigate}
                  className="mt-1 block py-1.5 font-semibold text-ink hover:text-sun-500"
                >
                  {col.footer.label}
                </Link>
              </li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TabsPanel({ tabs, onNavigate }) {
  const [active, setActive] = useState(0);
  return (
    <div className="grid grid-cols-[230px_1fr] gap-10">
      <ul className="space-y-1 border-r border-border pr-6" role="tablist">
        {tabs.map((t, i) => (
          <li key={t.label}>
            <button
              type="button"
              role="tab"
              aria-selected={active === i}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-4 py-2.5 text-left font-medium transition-colors",
                active === i ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-surface",
              )}
            >
              {t.label}
              <ChevronRight className="size-4 opacity-60" />
            </button>
          </li>
        ))}
      </ul>
      <MenuColumns columns={tabs[active].columns} onNavigate={onNavigate} />
    </div>
  );
}

/** Thẻ dịch vụ / giới thiệu: icon + tiêu đề + mô tả ngắn, kèm cột phụ và ảnh nổi bật. */
function CardsPanel({ item, contact, onNavigate }) {
  const { links, cols, aside, help, promo } = item;
  return (
    <div className="grid grid-cols-[1fr_auto_300px] gap-8">
      <ul className={cn("grid content-start gap-3", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {links.map((l) => {
          const Icon = icons[l.icon] || ChevronRight;
          return (
            <li key={l.href + l.label}>
              <Link
                href={l.href}
                onClick={onNavigate}
                className="group flex h-full gap-4 rounded-2xl p-4 ring-1 ring-border transition hover:bg-brand-50/60 hover:ring-brand-200"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-semibold text-ink group-hover:text-brand-700">
                    {l.label}
                    <ChevronRight className="size-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-muted">{l.desc}</span>
                </span>
              </Link>
            </li>
          );
        })}
        {help && (
          <li>
            <a
              href={`tel:${contact.hotlineRaw}`}
              className="flex h-full items-center gap-4 rounded-2xl border border-dashed border-sun-500/40 bg-sun-500/5 p-4 transition hover:bg-sun-500/10"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sun-500 text-white">
                <Phone className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{help.title}</span>
                <span className="mt-1 block text-sm leading-snug text-muted">{help.text}</span>
                <span className="mt-1 block text-sm font-bold text-sun-600">{contact.hotline}</span>
              </span>
            </a>
          </li>
        )}
      </ul>

      {aside ? (
        <div className="w-60 border-l border-border pl-8">
          <p className="mb-3 text-xs font-bold tracking-[0.18em] text-brand-700 uppercase">
            {aside.title}
          </p>
          <ul className="space-y-1">
            {aside.links.map((l) => {
              const Icon = icons[l.icon] || ChevronRight;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    className="group flex items-center gap-2.5 rounded-lg py-2 text-[0.95rem] whitespace-nowrap text-muted transition-colors hover:text-sun-500"
                  >
                    <Icon className="size-4 text-brand-500 group-hover:text-sun-500" />
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <span />
      )}

      {promo && (
        <Link
          href={promo.href}
          onClick={onNavigate}
          className={cn(
            "group relative flex min-h-60 flex-col justify-end overflow-hidden rounded-2xl p-5 text-white",
            promo.cutout && "bg-[radial-gradient(circle_at_70%_15%,#3b98d3,#0f4870_70%)]",
          )}
        >
          {promo.cutout ? (
            <Image
              src={promo.image}
              alt=""
              width={477}
              height={261}
              className="absolute top-11 left-1/2 w-[74%] -translate-x-1/2 transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.04]"
            />
          ) : (
            <>
              <Image
                src={promo.image}
                alt=""
                fill
                sizes="300px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/25 to-transparent" />
            </>
          )}
          <span className="absolute top-4 left-4 rounded-full bg-amber-brand px-3 py-1 text-xs font-bold text-ink">
            {promo.badge}
          </span>
          <span className="relative flex items-center justify-between gap-2 text-lg leading-tight font-semibold">
            {promo.title}
            <ChevronRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </span>
          <span className="relative mt-1 text-sm text-white/80">{promo.text}</span>
        </Link>
      )}
    </div>
  );
}

// Mọi trang đều mở đầu bằng hero ảnh/video tối → header trong suốt phủ lên.
// Ngoại lệ: chi tiết tour (mở đầu bằng album ảnh trên nền sáng) và trang cảm ơn (nền kem).
const SOLID = [/^(\/(en|zh))?\/tours\/[^/]+\/?$/, /^(\/(en|zh))?\/thank-you\/?$/];
const isOverlayRoute = (p) => !SOLID.some((re) => re.test(p || ""));

export default function Header({ lang, nav, labels, contact }) {
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Đóng menu khi chuyển trang (cập nhật state ngay trong render theo khuyến nghị của React)
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpenKey(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    lockScroll(true);
    return () => lockScroll(false);
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && (setOpenKey(null), setMobileOpen(false));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = (key) => {
    clearTimeout(closeTimer.current);
    setOpenKey(key);
  };
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 160);
  };
  const close = () => setOpenKey(null);

  const isActive = (item) => pathname?.startsWith(item.href.split("#")[0].split("?")[0]);
  const current = nav.find((i) => i.key === openKey);
  // Trong suốt khi ở đầu trang có ảnh/video nền tối; cuộn xuống hoặc mở menu → nền trắng
  const overlayRoute = isOverlayRoute(pathname);
  const clear = overlayRoute && !scrolled && !openKey;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        {/* Thanh trên cùng – thu gọn khi đã cuộn */}
        <div
          className={cn(
            "relative z-10 hidden text-[0.8rem] transition-[max-height,background-color,opacity] duration-500 lg:block",
            // Chỉ ẩn phần tràn khi thu gọn – để dropdown ngôn ngữ không bị cắt
            scrolled ? "max-h-0 overflow-hidden opacity-0" : "max-h-9 opacity-100",
            clear ? "bg-black/20 text-white/85 backdrop-blur-[2px]" : "bg-brand-950 text-white/85",
          )}
        >
          <Container className="flex h-9 items-center justify-between gap-6">
            <p className="font-medium tracking-wide">{labels.dmc}</p>
            <div className="flex items-center gap-5">
              <a
                href={`tel:${contact.hotlineRaw}`}
                className="flex items-center gap-1.5 hover:text-white"
              >
                <Phone className="size-3.5" /> {contact.hotline}
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1.5 hover:text-white"
              >
                <Mail className="size-3.5" /> {contact.email}
              </a>
              <span className="h-4 w-px bg-white/20" />
              <Link
                href={`${lp(lang)}/partners`}
                className="flex items-center gap-1.5 font-semibold text-amber-brand hover:text-white"
              >
                <Handshake className="size-3.5" /> {labels.partners}
              </Link>
              <LanguageSwitcher lang={lang} variant="dark" />
            </div>
          </Container>
        </div>

        {/* Thanh chính */}
        <div
          className={cn(
            "relative transition-[background-color,box-shadow,border-color] duration-500",
            clear
              ? "border-b border-white/15 bg-gradient-to-b from-black/35 to-transparent"
              : "border-b border-border bg-white shadow-[0_6px_24px_-14px_rgba(15,62,95,0.35)]",
          )}
          onMouseLeave={scheduleClose}
        >
          <Container className="flex h-16 items-center justify-between gap-4 lg:h-[72px]">
            <Logo lang={lang} light={clear} compact className="min-w-0" />

            <nav className="hidden items-center lg:flex" aria-label={labels.menu}>
              {nav.map((item) => (
                <div key={item.key} onMouseEnter={() => open(item.key)}>
                  {/* Rê chuột / focus: mở dropdown; bấm thẳng vào mục: sang trang tổng (vd. All travel guides) */}
                  <Link
                    href={item.href}
                    aria-expanded={openKey === item.key}
                    aria-haspopup="true"
                    onFocus={() => open(item.key)}
                    onClick={() => setOpenKey(null)}
                    className={cn(
                      "relative flex items-center gap-1 px-3.5 py-3 text-[0.95rem] font-semibold transition-colors xl:px-4",
                      clear
                        ? "text-white hover:text-amber-brand"
                        : openKey === item.key || isActive(item)
                          ? "text-brand-600"
                          : "text-ink hover:text-brand-600",
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        openKey === item.key && "rotate-180",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute inset-x-3.5 -bottom-[1px] h-[3px] rounded-full bg-sun-500 transition-transform duration-300 xl:inset-x-4",
                        openKey === item.key ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </Link>
                </div>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Link
                href={`${lp(lang)}/plan-your-trip`}
                className="hidden h-10 items-center rounded-md bg-sun-500 px-5 text-[0.95rem] font-semibold text-white shadow-sm shadow-sun-500/30 transition-colors hover:bg-sun-600 sm:flex"
              >
                {labels.planTrip}
              </Link>
              <div className="lg:hidden">
                <LanguageSwitcher lang={lang} compact variant={clear ? "dark" : "light"} />
              </div>
              <button
                type="button"
                className={cn(
                  "grid size-11 place-items-center rounded-md lg:hidden",
                  clear ? "text-white hover:bg-white/10" : "text-ink hover:bg-surface",
                )}
                aria-label={labels.menu}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="size-6" />
              </button>
            </div>
          </Container>

          {/* Mega menu desktop */}
          {current && (
            <div
              className="absolute inset-x-0 top-full hidden border-t border-border bg-white shadow-[0_24px_40px_-24px_rgba(15,62,95,0.35)] lg:block"
              onMouseEnter={() => open(current.key)}
            >
              <Container className="py-8">
                {current.type === "tabs" && <TabsPanel tabs={current.tabs} onNavigate={close} />}
                {current.type === "columns" && (
                  <div className={cn(current.promo && "grid grid-cols-[1fr_280px] gap-10")}>
                    <MenuColumns columns={current.columns} onNavigate={close} />
                    {current.promo && (
                      <Link
                        href={current.promo.href}
                        onClick={close}
                        className="group relative overflow-hidden rounded-2xl"
                      >
                        <Image
                          src={current.promo.image}
                          alt=""
                          fill
                          sizes="280px"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-950/10" />
                        <span className="absolute inset-x-5 bottom-5 flex items-center justify-between text-lg font-semibold text-white">
                          {current.promo.title}
                          <ChevronRight className="size-5" />
                        </span>
                      </Link>
                    )}
                  </div>
                )}
                {current.type === "cards" && (
                  <CardsPanel item={current} contact={contact} onNavigate={close} />
                )}
              </Container>
            </div>
          )}
        </div>

        {/* Ngăn kéo menu di động */}
        <div
          className={cn(
            "fixed inset-0 z-50 lg:hidden",
            mobileOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          aria-hidden={!mobileOpen}
        >
          <div
            className={cn(
              "absolute inset-0 bg-brand-950/50 backdrop-blur-sm transition-opacity",
              mobileOpen ? "opacity-100" : "opacity-0",
            )}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className={cn(
              "absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl",
              // Đóng: đẩy hẳn ra ngoài + ẩn (không lộ bóng đổ / vệt trắng ở mép phải)
              mobileOpen
                ? "visible translate-x-0"
                : "invisible translate-x-[calc(100%+2rem)] shadow-none",
              "transition-[translate,visibility] duration-300",
            )}
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Logo lang={lang} small onNavigate={() => setMobileOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid size-10 place-items-center rounded-md hover:bg-surface"
                aria-label={labels.close}
              >
                <X className="size-6" />
              </button>
            </div>
            <nav data-lenis-prevent className="flex-1 overflow-y-auto px-3 py-3">
              {nav.map((item) => {
                const expanded = mobileSection === item.key;
                const groups =
                  item.type === "tabs"
                    ? item.tabs.flatMap((t) =>
                        t.columns.map((c) => ({ ...c, title: c.title || t.label })),
                      )
                    : item.type === "columns"
                      ? item.columns
                      : [{ links: item.links }, ...(item.aside ? [item.aside] : [])];
                return (
                  <div key={item.key} className="border-b border-border/70">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-2 py-3.5 text-left text-[1.05rem] font-semibold text-ink"
                      aria-expanded={expanded}
                      onClick={() => setMobileSection(expanded ? null : item.key)}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn("size-5 transition-transform", expanded && "rotate-180")}
                      />
                    </button>
                    {expanded && (
                      <div className="space-y-4 px-2 pb-4">
                        {groups.map((g, i) => (
                          <div key={i}>
                            {g.title?.trim() && (
                              <p className="mb-1 text-xs font-bold tracking-wider text-brand-600 uppercase">
                                {g.title}
                              </p>
                            )}
                            <ul className="grid grid-cols-2 gap-x-3">
                              {g.links.map((l) => (
                                <li key={l.href + l.label}>
                                  <Link
                                    href={l.href}
                                    className="block py-1.5 text-sm text-muted hover:text-sun-500"
                                  >
                                    {l.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <Link
                href={`${lp(lang)}/partners`}
                className="mt-4 flex items-center gap-2 px-2 py-2 font-semibold text-brand-700"
              >
                <Handshake className="size-5" /> {labels.partners}
              </Link>
            </nav>
            <div className="space-y-3 border-t border-border p-5">
              <Link
                href={`${lp(lang)}/plan-your-trip`}
                className="flex h-12 items-center justify-center rounded-md bg-sun-500 font-semibold text-white"
              >
                {labels.planTrip}
              </Link>
              <a
                href={`tel:${contact.hotlineRaw}`}
                className="flex h-12 items-center justify-center gap-2 rounded-md border-2 border-brand-600 font-semibold text-brand-700"
              >
                <Phone className="size-4" /> {contact.hotline}
              </a>
            </div>
          </div>
        </div>
      </header>
      {/* Trang không có ảnh nền ở đầu: chừa chỗ cho header cố định */}
      {!overlayRoute && <div aria-hidden className="h-16 lg:h-[108px]" />}
    </>
  );
}
