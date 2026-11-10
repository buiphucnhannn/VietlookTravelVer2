"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/components/admin/Link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  Car,
  ExternalLink,
  FileText,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Map,
  Menu,
  Newspaper,
  ScrollText,
  Settings,
  Shapes,
  Stamp,
  Tags,
  Users,
  X,
  History,
} from "lucide-react";
import { ADMIN_BASE, ADMIN_LOGIN } from "@/config/urls.mjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AdminProviders, LoadingBlock, useUi } from "./ui";
import { CurrentUserProvider, ModuleScope, NoAccess, canUser, moduleForPath } from "./permissions";

const A = (p = "") => `${ADMIN_BASE}${p}`;

/**
 * Menu CMS theo nhóm. count: số việc cần xử lý (đơn / yêu cầu mới).
 * Mục nào hiện tuỳ quyền của tài khoản (permissions.js → moduleForPath): Cài đặt, Tài khoản chỉ admin.
 */
const NAV = [
  { group: null, items: [{ href: A(), label: "Tổng quan", Icon: LayoutDashboard }] },
  {
    group: "Khách hàng",
    items: [
      { href: A("/bookings"), label: "Đơn đặt tour", Icon: CalendarCheck, count: "bookings" },
      { href: A("/requests"), label: "Yêu cầu từ form", Icon: Inbox, count: "requests" },
    ],
  },
  {
    group: "Tour",
    items: [
      { href: A("/tours"), label: "Tour", Icon: Map },
      { href: A("/destinations"), label: "Điểm đến", Icon: Tags },
      { href: A("/themes"), label: "Chủ đề tour", Icon: Shapes },
    ],
  },
  {
    group: "Dịch vụ",
    items: [
      { href: A("/cars"), label: "Xe & khu vực", Icon: Car },
      { href: A("/visa"), label: "Visa & fast-track", Icon: Stamp },
    ],
  },
  {
    group: "Nội dung",
    items: [
      { href: A("/home"), label: "Trang chủ", Icon: Home },
      { href: A("/articles"), label: "Bài viết", Icon: Newspaper },
      { href: A("/taxonomy"), label: "Chuyên mục & tác giả", Icon: FileText },
      { href: A("/pages"), label: "Giới thiệu & chính sách", Icon: ScrollText },
    ],
  },
  {
    group: "Hệ thống",
    items: [
      { href: A("/settings"), label: "Cài đặt", Icon: Settings },
      { href: A("/users"), label: "Tài khoản quản trị", Icon: Users },
      { href: A("/audit-log"), label: "Nhật ký thao tác", Icon: History },
      { href: A("/change-password"), label: "Đổi mật khẩu", Icon: KeyRound },
    ],
  },
];

const isActive = (pathname, href) =>
  href === A() ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export const TODO_EVENT = "vl-admin-todo";

/**
 * Bấm menu khi form đang có nội dung chưa lưu → chặn chuyển trang, hỏi bằng hộp xác nhận của CMS
 * (sự kiện LEAVE_EVENT → AdminShell hỏi, đồng ý thì mới chuyển). Không dùng window.confirm thô của trình duyệt.
 */
const LEAVE_EVENT = "vl-admin-leave";
const guardLeave = (e) => {
  if (!window.__vlHasUnsaved?.()) return true;
  e.preventDefault();
  window.dispatchEvent(
    new CustomEvent(LEAVE_EVENT, { detail: e.currentTarget.getAttribute("href") }),
  );
  return false;
};

function NavLinks({ user, todo, onNavigate }) {
  const pathname = usePathname();
  return <NavList user={user} todo={todo} onNavigate={onNavigate} pathname={pathname} />;
}

function NavList({ user, todo, onNavigate, pathname = "" }) {
  return NAV.map((g, gi) => {
    // chưa tải xong tài khoản → chỉ hiện mục ai cũng vào được (không nháy mục không có quyền)
    const items = g.items.filter((i) => {
      const m = moduleForPath(i.href);
      return !m || canUser(user, m, "view");
    });
    if (!items.length) return null;
    return (
      <div key={gi} className="mb-5 last:mb-0">
        {g.group && (
          <p className="mb-2 flex items-center gap-2 px-3 text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase">
            {g.group}
            <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </p>
        )}
        <div className="space-y-1">
          {items.map(({ href, label, Icon, count }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                ref={active ? (el) => void el?.scrollIntoView({ block: "nearest" }) : undefined}
                onClick={(e) => guardLeave(e) && onNavigate?.()}
                className={cn(
                  "group relative flex items-center gap-3.5 rounded-xl py-2 pr-3 pl-1.5 text-[14.5px] transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-white/[0.16] to-white/[0.04] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "font-medium text-white/65 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                {/* vạch vàng đánh dấu trang đang mở */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-2 bottom-2 -left-4 w-1 rounded-r-full bg-sun-500 transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-[10px] transition-colors",
                    active
                      ? "bg-sun-500 text-white shadow-[0_6px_16px_-6px_rgba(239,68,68,0.7)]"
                      : "bg-white/[0.06] text-white/60 group-hover:bg-white/10 group-hover:text-white",
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <span className="flex-1 truncate">{label}</span>
                {count && todo[count] > 0 && (
                  <span className="min-w-5 rounded-full bg-sun-500 px-1.5 text-center text-[11px] leading-5 font-bold text-white shadow-sm ring-2 ring-brand-950">
                    {todo[count]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  });
}

/**
 * Khung khu quản trị: thanh bên (desktop) / thanh trên + menu trượt (điện thoại), tài khoản, đăng xuất.
 * Quyền truy cập đã được src/proxy.js kiểm tra TRƯỚC khi render; ở đây chỉ lấy thông tin hiển thị.
 */
export default function AdminShell({ children }) {
  return (
    <AdminProviders>
      <Shell>{children}</Shell>
    </AdminProviders>
  );
}

function Shell({ children }) {
  const router = useRouter();
  const { confirm } = useUi();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [todo, setTodo] = useState({});

  // Tài khoản + quyền: tải lại mỗi lần chuyển trang → quyền admin vừa đổi có hiệu lực không cần đăng nhập lại
  const loadMe = useCallback(
    (first) =>
      api("/auth/me")
        .then((r) => setUser(r.data.user))
        .catch(() => first && router.replace(ADMIN_LOGIN)),
    [router],
  );
  useEffect(() => {
    loadMe(true);
  }, [loadMe]);

  const canSeeEnquiries = canUser(user, "bookings") || canUser(user, "requests");
  // Số đơn / yêu cầu mới (trạng thái "Mới") — tải lại khi đổi trang hoặc khi trang khác báo đã xử lý
  const loadTodo = useCallback(() => {
    if (!canSeeEnquiries) return; // không được xem đơn → menu đã ẩn 2 mục này
    api("/enquiries/stats")
      .then((r) =>
        setTodo({ bookings: r.data.bookings?.new ?? 0, requests: r.data.requests?.new ?? 0 }),
      )
      .catch(() => {});
  }, [canSeeEnquiries]);
  useEffect(() => {
    loadTodo();
    window.addEventListener(TODO_EVENT, loadTodo);
    return () => window.removeEventListener(TODO_EVENT, loadTodo);
  }, [loadTodo]);

  // Rời trang khi còn nội dung chưa lưu → hộp xác nhận của CMS
  useEffect(() => {
    const onLeave = async (e) => {
      const ok = await confirm({
        title: "Rời trang khi chưa lưu?",
        message: "Nội dung bạn đang soạn chưa được lưu và sẽ mất nếu rời trang này.",
        confirmText: "Rời trang",
        cancelText: "Ở lại",
        danger: true,
      });
      if (!ok) return;
      window.__vlHasUnsaved = () => false;
      setOpen(false);
      router.push(e.detail);
    };
    window.addEventListener(LEAVE_EVENT, onLeave);
    return () => window.removeEventListener(LEAVE_EVENT, onLeave);
  }, [confirm, router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const logout = async () => {
    if (
      window.__vlHasUnsaved?.() &&
      !(await confirm({
        title: "Đăng xuất khi chưa lưu?",
        message: "Nội dung bạn đang soạn chưa được lưu và sẽ mất nếu đăng xuất.",
        confirmText: "Đăng xuất",
        cancelText: "Ở lại",
        danger: true,
      }))
    )
      return;
    window.__vlHasUnsaved = () => false;
    setLeaving(true);
    try {
      await api("/auth/logout", { method: "POST", retry: false });
    } catch {
      // phiên đã hết hạn sẵn → vẫn coi như đã đăng xuất
    }
    router.replace(ADMIN_LOGIN);
    router.refresh();
  };

  const initials = (user?.name || user?.username || "A").trim().charAt(0).toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Thương hiệu: biểu tượng tròn viền vàng + chữ trắng (như header website trên nền tối) — không khung bao */}
      <div className="px-5 pt-6 pb-5">
        <Link
          href={A()}
          className="group flex items-center gap-3"
          onClick={(e) => guardLeave(e) && setOpen(false)}
        >
          <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-white shadow-[0_8px_22px_-8px_rgba(0,0,0,0.6)] ring-2 ring-amber-brand/70 transition-transform duration-500 group-hover:rotate-6">
            <Image
              src="/images/logo/vietlook-icon.png"
              unoptimized
              alt=""
              width={210}
              height={210}
              priority
              className="h-auto w-[38px]"
            />
          </span>
          <span className="min-w-0">
            <Image
              src="/images/logo/vietlook-wordmark.png"
              unoptimized
              alt="Vietlook Travel"
              width={527}
              height={59}
              priority
              className="h-auto w-[150px] brightness-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] invert"
            />
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.2em] text-amber-brand uppercase ring-1 ring-white/10">
              <span className="size-1.5 rounded-full bg-amber-brand" /> Trang quản trị
            </span>
          </span>
        </Link>
      </div>
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Menu: ẩn thanh cuộn, mờ dần 2 đầu khi danh sách dài */}
      <nav className="flex-1 [scrollbar-width:none] overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-18px),transparent)] px-4 pt-4 pb-10 [&::-webkit-scrollbar]:hidden [@media(max-height:960px)]:pt-3 [@media(max-height:960px)]:pb-6">
        <Suspense fallback={<NavList user={user} todo={todo} />}>
          <NavLinks user={user} todo={todo} onNavigate={() => setOpen(false)} />
        </Suspense>
      </nav>

      {/* Tài khoản: 1 dòng gọn — avatar, tên, nút mở website + đăng xuất */}
      <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-white/[0.09] to-white/[0.03] p-2.5 ring-1 ring-white/10 backdrop-blur">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sun-400 to-sun-600 text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgba(239,68,68,0.8)] ring-2 ring-white/15">
          {user ? initials : <Loader2 className="size-4 animate-spin" />}
        </span>
        <span
          className="min-w-0 flex-1"
          title={user ? `Tên đăng nhập: ${user.username}` : undefined}
        >
          <span className="block truncate text-[13px] font-semibold text-white">
            {user?.name ?? "…"}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-white/50">
            {user && <span className="size-1.5 rounded-full bg-emerald-400" />}
            {user ? (user.role === "admin" ? "Quản trị viên" : "Nhân viên") : ""}
          </span>
        </span>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          title="Mở website"
          aria-label="Mở website"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white hover:text-brand-900"
        >
          <ExternalLink className="size-4" />
        </a>
        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          title="Đăng xuất"
          aria-label="Đăng xuất"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white hover:text-sun-600 disabled:opacity-60"
        >
          {leaving ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-svh border-r border-white/5 bg-brand-950 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(23,128,193,0.38),transparent_60%),radial-gradient(90%_50%_at_100%_100%,rgba(239,68,68,0.10),transparent_60%)] lg:block">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-brand-950 px-4 text-white lg:hidden">
        <Link href={A()} className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-full bg-white ring-2 ring-amber-brand/70">
            <Image
              src="/images/logo/vietlook-icon.png"
              unoptimized
              alt=""
              width={210}
              height={210}
              className="h-auto w-7"
            />
          </span>
          <Image
            src="/images/logo/vietlook-wordmark.png"
            unoptimized
            alt="Vietlook Travel"
            width={527}
            height={59}
            className="h-auto w-[124px] brightness-0 invert"
          />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
          className="grid size-10 place-items-center rounded-lg bg-white/10"
        >
          <Menu className="size-5" />
        </button>
      </header>
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-slate-950/60 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[288px] bg-brand-950 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(23,128,193,0.38),transparent_60%),radial-gradient(90%_50%_at_100%_100%,rgba(239,68,68,0.10),transparent_60%)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng menu"
            className="absolute top-2 right-2 z-10 grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
          {sidebar}
        </aside>
      </div>

      <main className="min-w-0 px-4 py-6 [overflow-wrap:anywhere] sm:px-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1440px]">
          <CurrentUserProvider user={user}>
            <Suspense fallback={<LoadingBlock />}>
              <AccessGuard user={user} onNavigate={loadMe}>
                {children}
              </AccessGuard>
            </Suspense>
          </CurrentUserProvider>
        </div>
      </main>
    </div>
  );
}

/**
 * Chặn mở thẳng đường dẫn của mục chưa được cấp quyền → trang báo thân thiện (không chuyển hướng, không vòng lặp).
 * Chờ tải xong tài khoản mới HIỆN nội dung trang (nút sửa / xoá đã đúng theo quyền khi hiện ra).
 */
function AccessGuard({ user, onNavigate, children }) {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onNavigate?.();
  }, [pathname, onNavigate]);
  const mod = moduleForPath(pathname);
  if (user && mod && !canUser(user, mod, "view")) return <NoAccess />;
  // Chưa tải xong tài khoản: vẫn dựng trang nhưng ẩn đi (không đổi cấu trúc → không dựng lại khi hiện)
  return (
    <ModuleScope module={mod === "admin" ? null : mod}>
      {!user && <LoadingBlock />}
      <div hidden={!user}>{children}</div>
    </ModuleScope>
  );
}
