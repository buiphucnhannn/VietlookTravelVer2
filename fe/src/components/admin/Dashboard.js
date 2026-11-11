"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "@/components/admin/Link";
import {
  ArrowRight,
  CalendarCheck,
  Cog,
  History,
  Home,
  Inbox,
  Mail,
  Map as MapIcon,
  MapPin,
  Newspaper,
  PenLine,
  Plus,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fmtDayChip, todayVN } from "@/lib/dates";
import { TODO_EVENT, toastError } from "./hooks";
import { Button, Card, EmptyState, Spinner, fmtDateTime, useUi } from "./ui";
import { canUser, useCurrentUser } from "./permissions";
import { StatusBadge, TypeBadge, emailFailed, fmtDay, fmtMoney, paxText } from "./EnquiriesPage";
import { LogSentence, actorText } from "./AuditLogPage";

const A = (p = "") => `${ADMIN_BASE}${p}`;

/** "T3 · 11/10/2026" (giờ Việt Nam) */
const today = () => fmtDayChip(todayVN(), "vi");

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

/**
 * Lời chào + ngày hôm nay theo giờ MÁY NGƯỜI DÙNG: chỉ tính trên trình duyệt (trang dựng sẵn lúc build không biết
 * "bây giờ"; tính lúc dựng sẵn sẽ sai giờ và lệch nội dung khi hiện ra). Chuỗi → so sánh theo giá trị, không dựng lại thừa.
 */
const noSubscribe = () => () => {};
const useHello = () =>
  useSyncExternalStore(
    noSubscribe,
    () => `${greeting()}|${today()}`,
    () => "",
  ).split("|");

// perm: [mục, mức] cần có mới hiện lối tắt ("admin" = chỉ quản trị viên)
const QUICK_LINKS = [
  {
    href: A("/tours/new"),
    label: "Thêm tour",
    text: "Tạo tour mới",
    Icon: Plus,
    perm: ["tours", "edit"],
  },
  {
    href: A("/articles/new"),
    label: "Viết bài",
    text: "Bài cẩm nang du lịch",
    Icon: PenLine,
    perm: ["articles", "edit"],
  },
  {
    href: A("/home"),
    label: "Sửa trang chủ",
    text: "Banner, mục nổi bật",
    Icon: Home,
    perm: ["home", "edit"],
  },
  {
    href: A("/settings"),
    label: "Cài đặt email",
    text: "Người nhận thông báo",
    Icon: Mail,
    perm: ["admin", "view"],
  },
];

const STAT_COLS = {
  1: "grid-cols-1", // nhân viên chỉ được xem 1 mục → thẻ trải hết hàng, không để trống nửa phải
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-3 xl:grid-cols-6",
};

export default function Dashboard() {
  const user = useCurrentUser();
  // Chỉ hiện số liệu / lối tắt của mục tài khoản được xem
  const can = (m, l = "view") => canUser(user, m, l);
  const seeBookings = can("bookings");
  const seeRequests = can("requests");
  const seeAudit = can("audit");
  const seeTotals = ["tours", "articles", "destinations"].filter((k) => can(k));
  // Nhân viên chưa được cấp mục nào → nói rõ thay vì để trang tổng quan trống
  const noAccess =
    user?.role !== undefined &&
    user.role !== "admin" &&
    !Object.values(user.permissions ?? {}).some((l) => l && l !== "none");
  const totalsKey = seeTotals.join(",");
  const [stats, setStats] = useState(null);
  const [totals, setTotals] = useState({});
  const [bookings, setBookings] = useState(null);
  const [requests, setRequests] = useState(null);
  const [logs, setLogs] = useState(null); // null = đang tải, false = không có quyền / lỗi
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useUi();
  const [hello, day = ""] = useHello();

  // Đơn + yêu cầu: lỗi thì giữ số liệu cũ (lần đầu → trống) và báo lỗi cho nút "Làm mới"
  const loadEnquiries = useCallback(async () => {
    const none = Promise.resolve({ data: seeBookings || seeRequests ? undefined : {} });
    const [s, b, r] = await Promise.allSettled([
      seeBookings || seeRequests ? api("/enquiries/stats") : none,
      seeBookings ? api("/enquiries?kind=bookings&limit=6") : Promise.resolve({ data: [] }),
      seeRequests ? api("/enquiries?kind=requests&limit=6") : Promise.resolve({ data: [] }),
    ]);
    const ok = (x) => x.status === "fulfilled";
    setStats((v) => (ok(s) ? s.value.data : (v ?? {})));
    setBookings((v) => (ok(b) ? b.value.data : (v ?? [])));
    setRequests((v) => (ok(r) ? r.value.data : (v ?? [])));
    const failed = [s, b, r].find((x) => !ok(x));
    if (failed) throw failed.reason;
    return s.value.data;
  }, [seeBookings, seeRequests]);

  const loadOthers = useCallback(
    () =>
      Promise.all([
        ...(totalsKey ? totalsKey.split(",") : []).map((key) =>
          api(`/admin/${key}?limit=1`)
            .then((r) => setTotals((t) => ({ ...t, [key]: r.meta?.total ?? r.data?.length ?? 0 })))
            .catch(() => setTotals((t) => ({ ...t, [key]: t[key] ?? "—" }))),
        ),
        seeAudit
          ? api("/audit-logs?limit=8")
              .then((r) => setLogs(r.data ?? []))
              .catch(() => setLogs((v) => v || false))
          : Promise.resolve().then(() => setLogs(false)),
      ]),
    [totalsKey, seeAudit],
  );

  useEffect(() => {
    const onTodo = () => loadEnquiries().catch(() => {});
    onTodo();
    loadOthers();
    window.addEventListener(TODO_EVENT, onTodo);
    return () => window.removeEventListener(TODO_EVENT, onTodo);
  }, [loadEnquiries, loadOthers]);

  const waiting = (s) => (s?.bookings?.new ?? 0) + (s?.requests?.new ?? 0);
  const refresh = async () => {
    const before = waiting(stats);
    setRefreshing(true);
    try {
      const [s] = await Promise.all([loadEnquiries(), loadOthers()]);
      const after = waiting(s);
      if (after > before)
        toast.success("Số liệu đã được cập nhật", {
          title: `Có ${after - before} đơn / yêu cầu mới`,
        });
      else
        toast.success(
          after
            ? `Đã cập nhật số liệu — ${after} việc đang chờ xử lý`
            : "Đã cập nhật số liệu — không có việc mới",
        );
    } catch (err) {
      toastError(toast, err, { title: "Chưa cập nhật được số liệu", retry: refresh });
    } finally {
      setRefreshing(false);
    }
  };

  // Đã tải xong thống kê mà chưa có đơn ở trạng thái "Mới" → 0 (không hiện khung chờ mãi)
  const newBookings = stats ? (stats.bookings?.new ?? 0) : undefined;
  const newRequests = stats ? (stats.requests?.new ?? 0) : undefined;

  const quickLinks = QUICK_LINKS.filter((q) => can(...q.perm));
  const statCards = [
    seeBookings && {
      href: A("/bookings"),
      label: "Đơn đặt mới",
      value: newBookings,
      Icon: CalendarCheck,
      hot: true,
    },
    seeRequests && {
      href: A("/requests"),
      label: "Yêu cầu mới",
      value: newRequests,
      Icon: Inbox,
      hot: true,
    },
    (seeBookings || seeRequests) && {
      label: "7 ngày qua",
      sub: seeBookings && seeRequests ? "đơn + yêu cầu" : seeBookings ? "đơn đặt tour" : "yêu cầu",
      value: stats?.last7Days,
      Icon: TrendingUp,
    },
    can("tours") && { href: A("/tours"), label: "Tour", value: totals.tours, Icon: MapIcon },
    can("articles") && {
      href: A("/articles"),
      label: "Bài viết",
      value: totals.articles,
      Icon: Newspaper,
    },
    can("destinations") && {
      href: A("/destinations"),
      label: "Điểm đến",
      value: totals.destinations,
      Icon: MapPin,
    },
  ].filter(Boolean);

  return (
    <>
      {/* Lời chào — tiêu đề mở trên nền trang (không khung bao) */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-slate-500">
            <span className="size-1.5 rounded-full bg-sun-500" />
            <span>{hello || " "}</span>
            <span className="text-slate-300">·</span>
            <span className="capitalize">{day}</span>
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
              {noAccess ? (
                "Tài khoản của bạn chưa được cấp quyền vào mục nào. Hãy nhờ quản trị viên cấp quyền để bắt đầu làm việc."
              ) : !seeBookings && !seeRequests ? (
                "Chúc một ngày làm việc hiệu quả!"
              ) : newBookings || newRequests ? (
                <>
                  Bạn có{" "}
                  {[
                    seeBookings && (
                      <b key="b" className="text-slate-900">
                        {newBookings ?? 0} đơn đặt tour
                      </b>
                    ),
                    seeRequests && (
                      <b key="r" className="text-slate-900">
                        {newRequests ?? 0} yêu cầu
                      </b>
                    ),
                  ]
                    .filter(Boolean)
                    .flatMap((x, i) => (i ? [" và ", x] : [x]))}{" "}
                  mới đang chờ xử lý.
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
          <Button
            variant="secondary"
            icon={RefreshCw}
            loading={refreshing}
            onClick={refresh}
            aria-label="Làm mới số liệu"
            title="Làm mới số liệu"
          >
            Làm mới
          </Button>
          {newBookings || newRequests ? (
            <Link
              href={A(newBookings ? "/bookings" : "/requests")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-sun-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sun-600"
            >
              Xử lý ngay <ArrowRight className="size-4" />
            </Link>
          ) : null}
          {can("tours", "edit") && (
            <Link
              href={A("/tours/new")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
            >
              <Plus className="size-4" /> Thêm tour
            </Link>
          )}
        </div>
      </header>

      {/* Số liệu */}
      {statCards.length > 0 && (
        <div
          className={cn(
            "grid grid-cols-2 gap-3 sm:gap-4",
            // số cột theo số thẻ được xem → hàng luôn đầy, không lẻ thẻ
            STAT_COLS[statCards.length],
          )}
        >
          {statCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      )}

      {/* Đơn + yêu cầu mới nhất (chỉ nhóm được xem) */}
      <div
        className={cn(
          "mt-6 grid gap-6",
          seeBookings && seeRequests && "xl:grid-cols-2",
          !seeBookings && !seeRequests && "hidden",
        )}
      >
        {seeBookings && (
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
        )}
        {seeRequests && (
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
        )}
      </div>

      {/* Lối tắt + nhật ký */}
      <div className="mt-6 space-y-6">
        {quickLinks.length > 0 && (
          <Card title="Lối tắt" bodyClassName="p-3 sm:p-4">
            <div
              className={cn(
                "grid gap-2 sm:grid-cols-2",
                quickLinks.length === 3
                  ? "xl:grid-cols-3"
                  : quickLinks.length >= 4 && "xl:grid-cols-4",
              )}
            >
              {quickLinks.map(({ href, label, text, Icon }) => (
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
        )}

        {logs !== false && (
          <Card
            title="Hoạt động gần đây"
            actions={
              <Link
                href={A("/audit-log")}
                className="text-xs font-semibold text-brand-700 transition-colors hover:text-sun-600"
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
                {logs.map((l) => {
                  const stranger = !l.actorName && /^auth\.(login_failed|locked)$/.test(l.action);
                  const NoName = stranger
                    ? ShieldAlert
                    : l.action === "enquiry.create"
                      ? UserRound
                      : Cog;
                  return (
                    <li
                      key={l.id}
                      className="flex break-inside-avoid items-center gap-3 border-b border-slate-100 py-2.5"
                    >
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                          l.actorName
                            ? "bg-brand-50 text-brand-700"
                            : stranger
                              ? "bg-sun-50 text-sun-600"
                              : "bg-slate-100 text-slate-500",
                        )}
                        aria-hidden
                      >
                        {l.actorName ? (
                          l.actorName.charAt(0).toUpperCase()
                        ) : (
                          <NoName className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <LogSentence
                          log={l}
                          className="line-clamp-2 text-sm leading-relaxed break-words text-slate-700"
                        />
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          <span className={cn("font-semibold", stranger && "text-sun-700")}>
                            {actorText(l)}
                          </span>
                          <span className="text-slate-300"> · </span>
                          <span className="tabular-nums">{fmtDateTime(l.createdAt)}</span>
                        </p>
                      </div>
                    </li>
                  );
                })}
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
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 transition-colors hover:text-sun-600"
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
