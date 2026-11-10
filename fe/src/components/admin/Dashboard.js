"use client";

import { useEffect, useState } from "react";
import Link from "@/components/admin/Link";
import {
  ArrowRight,
  CalendarCheck,
  History,
  Home,
  Inbox,
  Mail,
  Map as MapIcon,
  MapPin,
  Newspaper,
  PenLine,
  Plus,
  TrendingUp,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TODO_EVENT } from "./AdminShell";
import { Card, EmptyState, Spinner, fmtDateTime } from "./ui";
import { StatusBadge, TypeBadge, emailFailed, fmtDay, fmtMoney, paxText } from "./EnquiriesPage";

const A = (p = "") => `${ADMIN_BASE}${p}`;

/** "thứ hai, 10 tháng 11, 2026" */
const today = () =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

const greeting = () => {
  const h = new Date().getHours();
  return h < 11
    ? "Chào buổi sáng"
    : h < 14
      ? "Chào buổi trưa"
      : h < 18
        ? "Chào buổi chiều"
        : "Chào buổi tối";
};

const QUICK_LINKS = [
  { href: A("/tours/new"), label: "Thêm tour", text: "Tạo tour mới", Icon: Plus },
  { href: A("/articles/new"), label: "Viết bài", text: "Bài cẩm nang du lịch", Icon: PenLine },
  { href: A("/home"), label: "Sửa trang chủ", text: "Banner, mục nổi bật", Icon: Home },
  { href: A("/settings"), label: "Cài đặt email", text: "Người nhận thông báo", Icon: Mail },
];

/** Nhật ký: "tour.update" → "Sửa tour" */
const ENTITY = {
  tour: "tour",
  destination: "điểm đến",
  theme: "chủ đề tour",
  article: "bài viết",
  category: "chuyên mục",
  author: "tác giả",
  page: "trang",
  car: "loại xe",
  car_area: "khu vực xe",
  visa_type: "loại visa",
  fast_track: "gói fast-track",
  vehicle: "xe",
  zone: "khu vực",
  visa: "dịch vụ visa",
  enquiry: "đơn / yêu cầu",
  user: "tài khoản",
  media: "ảnh",
};
const VERB = {
  create: "Thêm",
  update: "Sửa",
  delete: "Xoá",
  show: "Hiện",
  hide: "Ẩn",
  reorder: "Sắp xếp",
  note: "Ghi chú",
  resend_email: "Gửi lại email",
  upload: "Tải lên",
  unlock: "Mở khoá",
  password_reset: "Đặt lại mật khẩu",
};
const SPECIAL = {
  "auth.login": "Đăng nhập",
  "auth.login_failed": "Đăng nhập sai mật khẩu",
  "auth.locked": "Bị tạm khoá đăng nhập",
  "auth.password_change": "Đổi mật khẩu",
  "settings.home": "Sửa trang chủ",
  "settings.notifications": "Sửa cài đặt email",
  "settings.payment": "Sửa cài đặt thanh toán",
  "settings.test_email": "Gửi email thử",
  "settings.tracking": "Sửa mã đo lường",
  "media.from_url": "Thêm ảnh từ link",
  "media.drive_video": "Thêm video từ Google Drive",
};
const actionLabel = (a = "") => {
  if (SPECIAL[a]) return SPECIAL[a];
  const [ent, ...rest] = a.split(".");
  const verb = VERB[rest.join(".")];
  return verb && ENTITY[ent] ? `${verb} ${ENTITY[ent]}` : a;
};

/** Tên dễ đọc của thứ vừa được thao tác (đường dẫn trang, mã đơn); không hiện mã nội bộ */
const targetName = (l) => {
  if (l.meta?.slug) return l.meta.slug;
  const id = l.target?.id;
  const readable = l.target?.type === "enquiry" || l.target?.type === "page";
  return readable && id && !/^[0-9a-f]{24}$/i.test(id) ? id : "";
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [totals, setTotals] = useState({});
  const [bookings, setBookings] = useState(null);
  const [requests, setRequests] = useState(null);
  const [logs, setLogs] = useState(null); // null = đang tải, false = không có quyền / lỗi

  useEffect(() => {
    api("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => {});

    const loadEnquiries = () => {
      api("/enquiries/stats")
        .then((r) => setStats(r.data))
        .catch(() => setStats({}));
      api("/enquiries?kind=bookings&limit=6")
        .then((r) => setBookings(r.data))
        .catch(() => setBookings([]));
      api("/enquiries?kind=requests&limit=6")
        .then((r) => setRequests(r.data))
        .catch(() => setRequests([]));
    };
    loadEnquiries();
    window.addEventListener(TODO_EVENT, loadEnquiries);

    for (const key of ["tours", "articles", "destinations"]) {
      api(`/admin/${key}?limit=1`)
        .then((r) => setTotals((t) => ({ ...t, [key]: r.meta?.total ?? r.data?.length ?? 0 })))
        .catch(() => setTotals((t) => ({ ...t, [key]: "—" })));
    }

    api("/audit-logs?limit=8")
      .then((r) => setLogs(r.data ?? []))
      .catch(() => setLogs(false));

    return () => window.removeEventListener(TODO_EVENT, loadEnquiries);
  }, []);

  // Đã tải xong thống kê mà chưa có đơn ở trạng thái "Mới" → 0 (không hiện khung chờ mãi)
  const newBookings = stats ? (stats.bookings?.new ?? 0) : undefined;
  const newRequests = stats ? (stats.requests?.new ?? 0) : undefined;

  return (
    <>
      {/* Lời chào — tiêu đề mở trên nền trang (không khung bao) */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-slate-500">
            <span className="size-1.5 rounded-full bg-sun-500" />
            <span>{greeting()}</span>
            <span className="text-slate-300">·</span>
            <span className="capitalize">{today()}</span>
          </p>
          <h1 className="mt-2 text-[28px] leading-tight font-bold tracking-tight text-slate-900 sm:text-[34px]">
            {user ? (
              <>
                Xin chào, <span className="text-brand-700">{user.name || user.username}</span>
              </>
            ) : (
              <span className="inline-block h-9 w-64 animate-pulse rounded-xl bg-slate-200/70 align-middle" />
            )}
          </h1>
          <p className="mt-2.5 flex items-start gap-2 text-sm leading-relaxed text-slate-600">
            <span className="relative mt-1.5 flex size-2 shrink-0">
              {stats && (newBookings || newRequests) ? (
                <>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-sun-400 opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-sun-500" />
                </>
              ) : (
                <span
                  className={cn(
                    "relative inline-flex size-2 rounded-full",
                    stats ? "bg-emerald-500" : "bg-slate-300",
                  )}
                />
              )}
            </span>
            <span>
              {newBookings || newRequests ? (
                <>
                  Bạn có <b className="text-slate-900">{newBookings ?? 0} đơn đặt tour</b> và{" "}
                  <b className="text-slate-900">{newRequests ?? 0} yêu cầu</b> mới đang chờ xử lý.
                </>
              ) : stats ? (
                "Không có đơn hay yêu cầu mới nào đang chờ. Chúc một ngày làm việc hiệu quả!"
              ) : (
                "Đang tải tình hình hôm nay…"
              )}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {newBookings || newRequests ? (
            <Link
              href={A(newBookings ? "/bookings" : "/requests")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-sun-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sun-600"
            >
              Xử lý ngay <ArrowRight className="size-4" />
            </Link>
          ) : null}
          <Link
            href={A("/tours/new")}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
          >
            <Plus className="size-4" /> Thêm tour
          </Link>
        </div>
      </header>

      {/* Số liệu */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          href={A("/bookings")}
          label="Đơn đặt mới"
          value={newBookings}
          Icon={CalendarCheck}
          hot
        />
        <StatCard href={A("/requests")} label="Yêu cầu mới" value={newRequests} Icon={Inbox} hot />
        <StatCard
          label="7 ngày qua"
          sub="đơn + yêu cầu"
          value={stats?.last7Days}
          Icon={TrendingUp}
        />
        <StatCard href={A("/tours")} label="Tour" value={totals.tours} Icon={MapIcon} />
        <StatCard href={A("/articles")} label="Bài viết" value={totals.articles} Icon={Newspaper} />
        <StatCard
          href={A("/destinations")}
          label="Điểm đến"
          value={totals.destinations}
          Icon={MapPin}
        />
      </div>

      {/* Đơn + yêu cầu mới nhất */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <LatestCard
          title="Đơn đặt tour mới nhất"
          base={A("/bookings")}
          items={bookings}
          empty="Chưa có đơn đặt tour"
          Icon={CalendarCheck}
          render={(e) => (
            <>
              <p className="line-clamp-1 text-xs text-slate-600">{e.tour?.title || "—"}</p>
              <p className="text-[11px] text-slate-400">
                {[fmtDay(e.departureDate), paxText(e)].filter(Boolean).join(" · ")}
              </p>
            </>
          )}
        />
        <LatestCard
          title="Yêu cầu mới nhất"
          base={A("/requests")}
          items={requests}
          empty="Chưa có yêu cầu nào"
          Icon={Inbox}
          render={(e) => (
            <div className="mt-0.5">
              <TypeBadge type={e.type} />
            </div>
          )}
        />
      </div>

      {/* Lối tắt + nhật ký */}
      <div className="mt-6 space-y-6">
        <Card title="Lối tắt" bodyClassName="p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_LINKS.map(({ href, label, text, Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-xl p-3 ring-1 ring-slate-100 transition hover:bg-brand-50/60 hover:ring-brand-200"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-700 group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  <span className="block truncate text-xs text-slate-500">{text}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>

        {logs !== false && (
          <Card
            title="Hoạt động gần đây"
            actions={
              <Link
                href={A("/audit-log")}
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Xem tất cả
              </Link>
            }
            bodyClassName="p-0"
          >
            {logs === null ? (
              <div className="grid place-items-center py-10">
                <Spinner />
              </div>
            ) : !logs.length ? (
              <EmptyState icon={History} title="Chưa có hoạt động" />
            ) : (
              <ul className="px-5 pb-2 lg:columns-2 lg:gap-x-12">
                {logs.map((l) => (
                  <li
                    key={l.id}
                    className="flex break-inside-avoid items-center gap-3 border-b border-slate-100 py-2.5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {(l.actorName || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800">
                        <span className="font-semibold">{l.actorName || "Hệ thống"}</span>{" "}
                        <span className="text-slate-600">
                          {actionLabel(l.action).toLowerCase()}
                        </span>
                        {targetName(l) && (
                          <span className="ml-1 text-xs text-slate-500">{targetName(l)}</span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {fmtDateTime(l.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

function StatCard({ href, label, sub, value, Icon, hot }) {
  const alert = hot && value > 0;
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg",
            alert ? "bg-sun-50 text-sun-600" : "bg-brand-50 text-brand-600",
          )}
        >
          <Icon className="size-4" />
        </span>
      </span>
      <span
        className={cn(
          "mt-2 block text-[28px] leading-none font-bold tracking-tight",
          alert ? "text-sun-600" : "text-slate-900",
        )}
      >
        {value ?? (
          <span className="inline-block h-7 w-10 animate-pulse rounded-md bg-slate-100 align-middle" />
        )}
      </span>
      {sub && <span className="mt-1 block text-[11px] text-slate-400">{sub}</span>}
    </>
  );
  const cls =
    "block rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80 transition";
  return href ? (
    <Link
      href={href}
      className={cn(cls, "hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-200")}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function LatestCard({ title, base, items, empty, Icon, render }) {
  return (
    <Card
      title={title}
      actions={
        <Link
          href={base}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
        >
          Xem tất cả <ArrowRight className="size-3.5" />
        </Link>
      }
      bodyClassName="p-0"
    >
      {items === null ? (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      ) : !items.length ? (
        <EmptyState icon={Icon} title={empty} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((e) => (
            <li key={e.id}>
              <Link
                href={`${base}?code=${encodeURIComponent(e.code)}`}
                className="flex items-start gap-3 px-5 py-3 transition hover:bg-brand-50/40"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    e.status === "new" ? "bg-sun-500" : "bg-transparent",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">{e.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">{e.code}</span>
                    {emailFailed(e) && (
                      <span title="Chưa gửi được email" className="shrink-0 text-sun-500">
                        <Mail className="size-3.5" />
                      </span>
                    )}
                  </p>
                  {render(e)}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={e.status} />
                  {e.estimate?.total != null && (
                    <span className="text-xs font-semibold text-slate-700">
                      {fmtMoney(e.estimate)}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">{fmtDateTime(e.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
