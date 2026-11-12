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
  FileText,
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
  file: FileText,
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
            (col.image ? (
              // Tiêu đề miền: banner ảnh nền + lớp phủ tối để chữ trắng dễ đọc
              <Link
                href={col.href}
                onClick={onNavigate}
                className="group relative mb-3 flex h-16 items-end overflow-hidden rounded-xl p-3"
              >
                <Image
                  src={col.image}
                  alt=""
                  fill
                  sizes="300px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-950/30 to-transparent" />
                <span className="relative flex w-full items-center justify-between text-lg font-semibold text-white">
                  {col.title}
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ) : col.href ? (
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
          <ul
            className={cn(
              col.grid
                ? col.gridCols === 2
                  ? "grid grid-cols-2 gap-x-6 gap-y-1"
                  : "grid grid-cols-3 gap-x-6 gap-y-1"
                : // Cột theo miền (có banner ảnh): điểm đến xếp 2 cột nhỏ → miền nhiều điểm (Bắc 12) vẫn gọn trong màn hình
                  col.image
                  ? "grid grid-cols-2 gap-x-3 gap-y-1"
                  : "space-y-1",
            )}
          >
            {col.links.map((l) => (
              // dòng "Tất cả tour miền …" (không ảnh) trong cột miền: trải hết 2 cột, không bị ngắt dòng
              <li key={l.href + l.label} className={cn(col.image && !l.image && "col-span-2 pt-1")}>
                {l.image ? (
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center rounded-lg py-1 text-muted transition-colors hover:text-sun-500",
                      col.image ? "gap-2.5 text-sm leading-tight" : "gap-3.5 text-[0.95rem]",
                      // Mục nổi bật (vd. "Tour độc quyền"): chữ đậm + viền vàng quanh ảnh + sao
                      l.accent && "font-semibold text-ink",
                    )}
                  >
                    {/* Ảnh ngang 4:3 hợp với ảnh phong cảnh hơn ô vuông */}
                    <span
                      className={cn(
                        "relative shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5",
                        col.image ? "h-9 w-12" : "h-12 w-16",
                        l.accent && "ring-2 ring-amber-brand",
                      )}
                    >
                      <Image
                        src={l.image}
                        alt=""
                        fill
                        sizes="128px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </span>
                    <span className="flex items-center gap-1.5 transition-transform group-hover:translate-x-0.5">
                      {l.label}
                      {l.accent && (
                        <Star className="size-3.5 fill-amber-brand text-amber-brand" aria-hidden />
                      )}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    className="block py-1.5 text-[0.95rem] text-muted transition-colors hover:translate-x-0.5 hover:text-sun-500"
                  >
                    {l.label}
                  </Link>
                )}
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

/** Thẻ ảnh nổi bật bên phải dropdown – cao bằng phần nội dung bên cạnh (cân đối 2 bên). */
function PromoCard({ promo, onNavigate }) {
  return (
    <Link
      href={promo.href}
      onClick={onNavigate}
      className="group relative flex h-full min-h-56 flex-col justify-end overflow-hidden rounded-2xl p-5 text-white"
    >
      <Image
        src={promo.image}
        alt=""
        fill
        sizes="300px"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/25 to-transparent" />
      {promo.badge && (
        <span className="absolute top-4 left-4 rounded-full bg-amber-brand px-3 py-1 text-xs font-bold text-ink">
          {promo.badge}
        </span>
      )}
      <span className="relative flex items-center justify-between gap-2 text-lg leading-tight font-semibold">
        {promo.title}
        <ChevronRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
      </span>
      {promo.text && <span className="relative mt-1 text-sm text-white/80">{promo.text}</span>}
    </Link>
  );
}

/**
 * Dropdown dạng tab: [danh sách tab | nội dung tab | ảnh nổi bật]. Chiều cao tối thiểu cố định
 * để khi rê qua các tab, khung không co giãn/nhảy.
 */
function TabsPanel({ tabs, onNavigate }) {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  return (
    <div
      className={cn(
        "grid min-h-[340px] gap-10",
        tab.promo ? "grid-cols-[250px_1fr_280px]" : "grid-cols-[250px_1fr]",
      )}
    >
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
                "flex w-full items-center justify-between gap-2 rounded-md px-4 py-2.5 text-left font-medium whitespace-nowrap transition-colors",
                active === i ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-surface",
              )}
            >
              {t.label}
              <ChevronRight className="size-4 opacity-60" />
            </button>
          </li>
        ))}
      </ul>
      <MenuColumns columns={tab.columns} onNavigate={onNavigate} />
      {tab.promo && <PromoCard promo={tab.promo} onNavigate={onNavigate} />}
    </div>
  );
}

/**
 * Dropdown dạng thẻ: [lưới thẻ | (cột phụ) | ảnh nổi bật]. Không còn cột trống khi không có
 * cột phụ; các thẻ cao bằng nhau, ảnh nổi bật cao bằng cả lưới thẻ.
 */
function CardsPanel({ item, contact, onNavigate }) {
  const { links, cols, aside, help, promo } = item;
  return (
    <div
      className={cn(
        "grid items-stretch gap-8",
        aside ? "grid-cols-[1fr_250px_280px]" : promo ? "grid-cols-[1fr_280px]" : "grid-cols-1",
      )}
    >
      <ul className={cn("grid auto-rows-fr gap-3", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {links.map((l) => {
          const Icon = icons[l.icon] || ChevronRight;
          return (
            <li key={l.href + l.label}>
              <Link
                href={l.href}
                onClick={onNavigate}
                className="group flex h-full items-center gap-4 rounded-2xl p-4 ring-1 ring-border transition hover:bg-brand-50/60 hover:ring-brand-200"
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
                <span className="mt-1 block text-sm leading-snug text-muted">
                  {help.text} ·{" "}
                  <span className="font-bold whitespace-nowrap text-sun-600">
                    {contact.hotline}
                  </span>
                </span>
              </span>
            </a>
          </li>
        )}
      </ul>

      {aside && (
        <div className="border-l border-border pl-8">
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
                    <Icon className="size-4 shrink-0 text-brand-500 group-hover:text-sun-500" />
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {promo && <PromoCard promo={promo} onNavigate={onNavigate} />}
    </div>
  );
}

// Trang mở đầu bằng banner ảnh/video → ở đầu trang header trong suốt, "ăn" nền banner.
// Ngoại lệ: chi tiết tour (album ảnh nền sáng) và trang cảm ơn (nền kem) → luôn nền trắng.
// (gồm cả /vi: trước đây thiếu → trang tour tiếng Việt bị header trong suốt đè lên đường dẫn & album ảnh)
const TOUR_DETAIL = /^(\/(en|zh|vi))?\/tours\/[^/]+\/?$/;
const SOLID = [TOUR_DETAIL, /^(\/(en|zh|vi))?\/thank-you\/?$/];
const isOverlayRoute = (p) => !SOLID.some((re) => re.test(p || ""));
// Ngôn ngữ có nhãn menu dài (không vừa 1 hàng ở 1024–1279px) → menu ngang chỉ hiện từ 1280px
const LONG_NAV_LANGS = new Set(["vi"]);

/**
 * Header cố định (yêu cầu khách 31/10 + góp ý 02/11):
 * - Ở đầu trang: trong suốt trên nền banner (không viền/vạch kẻ).
 * - Cuộn xuống: nền trắng và giữ nguyên như vậy (topbar không thu gọn).
 * - Rê chuột / mở menu KHÔNG làm header đổi nền hay chuyển động – chỉ phụ thuộc vị trí cuộn.
 */
/** Header đọc đường dẫn hiện tại (bọc trong <Suspense> ở layout — xem HeaderShell) */
export default function Header(props) {
  const pathname = usePathname();
  return <HeaderView {...props} pathname={pathname} />;
}

/**
 * Bản dựng sẵn trong khung tĩnh của trang (chưa biết đường dẫn) — dùng làm fallback của <Suspense>,
 * nhờ vậy trang tĩnh vẫn có header đầy đủ (SEO, hiển thị nhanh) và Next dựng lại trang được khi CMS cập nhật.
 */
export function HeaderStatic(props) {
  return <HeaderView {...props} pathname={null} />;
}

function HeaderView({ lang, nav, labels, contact, pathname }) {
  const [openKey, setOpenKey] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const closeTimer = useRef(null);

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
  const overlayRoute = isOverlayRoute(pathname);
  // Chỉ phụ thuộc vị trí cuộn (không đổi khi rê chuột/mở menu)
  const clear = overlayRoute && !scrolled;
  // Menu tiếng Việt dài nhất → 1024–1279px không đủ chỗ: dùng nút ☰ tới 1280px (en / zh hiện menu từ 1024px)
  const bp = LONG_NAV_LANGS.has(lang)
    ? { show: "xl:flex", hide: "xl:hidden", block: "xl:block" }
    : { show: "lg:flex", hide: "lg:hidden", block: "lg:block" };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        {/* Thanh trên cùng – luôn hiển thị (không thu gọn khi cuộn) */}
        <div
          className={cn(
            "relative z-10 hidden text-[0.8rem] text-white/85 transition-colors duration-500 lg:block",
            clear ? "bg-black/25 backdrop-blur-[2px]" : "bg-brand-950",
          )}
        >
          <Container className="flex h-9 items-center justify-between gap-6 whitespace-nowrap">
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
                className="hidden items-center gap-1.5 hover:text-white xl:flex"
              >
                <Mail className="size-3.5" /> {contact.email}
              </a>
              <span className="h-4 w-px bg-white/20" />
              <Link
                prefetch={false}
                href={`${lp(lang)}/partners`}
                className="flex items-center gap-1.5 font-semibold text-amber-brand hover:text-white"
              >
                <Handshake className="size-3.5" /> {labels.partners}
              </Link>
              {/* Desktop: nút lên kế hoạch nằm ở thanh này để menu chính đủ rộng, giãn cách thoáng */}
              <Link
                prefetch={false}
                href={`${lp(lang)}/plan-your-trip`}
                className="rounded-full bg-sun-500 px-3 py-0.5 font-semibold text-white hover:bg-sun-600"
              >
                {labels.planTrip}
              </Link>
              <LanguageSwitcher lang={lang} pathname={pathname} variant="dark" />
            </div>
          </Container>
        </div>

        {/* Thanh chính */}
        <div
          className={cn(
            "relative transition-[background-color,box-shadow] duration-500",
            clear
              ? "bg-gradient-to-b from-black/35 to-transparent"
              : "bg-white shadow-[0_6px_24px_-14px_rgba(15,62,95,0.35)]",
          )}
          onMouseLeave={scheduleClose}
        >
          <Container className="flex h-16 items-center justify-between gap-4 lg:h-[72px]">
            <Logo
              lang={lang}
              compact
              light={clear}
              taglineClassName="lg:hidden min-[90rem]:flex"
              className="min-w-0"
            />

            {/* Trải đều các mục từ sau logo đến mép phải → khoảng cách giữa các mục bằng nhau, 2 bên cân đối */}
            <nav
              className={cn(
                "hidden flex-1 items-center justify-between lg:ml-4 xl:ml-6 min-[90rem]:ml-10 2xl:ml-12",
                bp.show,
              )}
              aria-label={labels.menu}
            >
              {nav.map((item) => (
                <div key={item.key} onMouseEnter={() => open(item.key)}>
                  {/* Rê chuột / focus: mở dropdown; bấm thẳng vào mục: sang trang tổng (vd. All travel guides).
                      prefetch={false}: các link header hiện ngay khi tải trang chủ "/" (được proxy rewrite
                      sang /en) khiến router Next 16.4 prefetch lặp vô hạn (~160 request/giây). Tắt prefetch
                      cho link header → hết vòng lặp; trang đều dựng sẵn nên bấm vẫn chuyển ~40–100ms. */}
                  <Link
                    prefetch={false}
                    href={item.href}
                    aria-expanded={openKey === item.key}
                    aria-haspopup="true"
                    onFocus={() => open(item.key)}
                    onClick={() => setOpenKey(null)}
                    // Không hiệu ứng chuyển động khi rê chuột: chỉ đổi màu chữ
                    className={cn(
                      "flex items-center gap-1 px-1 py-3 text-[0.82rem] font-semibold whitespace-nowrap xl:px-2 xl:text-[0.92rem] 2xl:px-2.5 2xl:text-[0.95rem]",
                      clear
                        ? openKey === item.key
                          ? "text-amber-brand [text-shadow:0_1px_6px_rgba(0,0,0,0.45)]"
                          : "text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.45)] hover:text-amber-brand"
                        : openKey === item.key || isActive(item)
                          ? "text-sun-500"
                          : "text-ink hover:text-sun-500",
                    )}
                  >
                    {item.label}
                    {/* Mũi tên ▾: báo hiệu mục có menu thả xuống */}
                    {item.type && (
                      <ChevronDown
                        aria-hidden
                        className="size-3.5 shrink-0 opacity-75 2xl:size-4"
                      />
                    )}
                  </Link>
                </div>
              ))}
            </nav>

            <div className={cn("flex shrink-0 items-center gap-1 sm:gap-2", bp.hide)}>
              <Link
                href={`${lp(lang)}/plan-your-trip`}
                className="hidden h-10 items-center rounded-md bg-sun-500 px-5 text-[0.95rem] font-semibold whitespace-nowrap text-white shadow-sm shadow-sun-500/30 transition-colors hover:bg-sun-600 sm:flex lg:hidden"
              >
                {labels.planTrip}
              </Link>
              <div className="lg:hidden">
                <LanguageSwitcher
                  lang={lang}
                  pathname={pathname}
                  compact
                  variant={clear ? "dark" : "light"}
                />
              </div>
              <button
                type="button"
                className={cn(
                  "grid size-11 place-items-center rounded-md",
                  bp.hide,
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
              className={cn(
                "absolute inset-x-0 top-full hidden border-t border-border bg-white shadow-[0_24px_40px_-24px_rgba(15,62,95,0.35)]",
                bp.block,
              )}
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
            "fixed inset-0 z-50",
            bp.hide,
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
            <nav data-lenis-prevent className="flex-1 scrollbar-thin overflow-y-auto px-3 py-3">
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
                                    className="block py-2.5 text-sm leading-snug text-muted hover:text-sun-500"
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
            </nav>
            <div className="space-y-3 border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
      {/* Trang không có banner ở đầu: chừa chỗ cho header cố định. Trang chi tiết tour tự chừa chỗ ngay trong
          khung tĩnh (app/[lang]/tours/[slug]/page.js) → không bị xô trang khi header thật thay bản dựng sẵn. */}
      {!overlayRoute && !TOUR_DETAIL.test(pathname) && (
        <div aria-hidden className="h-16 lg:h-[108px]" />
      )}
    </>
  );
}
