"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "@/components/admin/Link";
import {
  ArrowRight,
  CalendarCheck,
  CircleCheck,
  Clock,
  Cog,
  History,
  Home,
  Inbox,
  Mail,
  MailWarning,
  Map as MapIcon,
  MapPin,
  Newspaper,
  PenLine,
  Plus,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
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
import {
  ENQUIRY_TYPES,
  StatusBadge,
  TypeBadge,
  emailFailed,
  fmtDay,
  fmtMoney,
  paxText,
} from "./EnquiriesPage";
import { STATUSES } from "./labels";
import { LogSentence, actorText } from "./AuditLogPage";

const A = (p = "") => `${ADMIN_BASE}${p}`;
const REFRESH_MS = 60_000; // tự cập nhật số liệu mỗi phút khi tab đang mở

/** "T3 · 10/11/2026" (giờ Việt Nam) */
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
    href: A("/settings#notifications"),
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

/**
 * Cảnh báo nhỏ cho admin khi danh sách "Email nhận thông báo" (Cài đặt) đang trống: đơn / yêu cầu mới vẫn lưu trong
 * CMS nhưng không ai nhận thư báo (máy chủ không còn email dự phòng). Tải 1 lần khi mở trang; lỗi → không hiện gì.
 */
function NoRecipientsWarning() {
  const [empty, setEmpty] = useState(false);
  useEffect(() => {
    let alive = true;
    api("/settings/notifications")
      .then((r) => alive && setEmpty(!r.data?.recipients?.length))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!empty) return null;
  return (
    <div
      role="alert"
      className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
    >
      <MailWarning className="size-5 shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1 leading-relaxed">
        <b>Chưa có email nhận thông báo</b> — đơn mới vẫn lưu trong trang quản trị nhưng chưa ai
        nhận email báo.
      </p>
      <Link
        href={A("/settings#notifications")}
        className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-amber-900 underline underline-offset-2 hover:text-amber-950"
      >
        Thêm email nhận thông báo <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

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
  const [overview, setOverview] = useState(null); // biểu đồ 14 ngày, xu hướng, đơn chờ lâu nhất
  const [totals, setTotals] = useState({});
  const [bookings, setBookings] = useState(null);
  const [requests, setRequests] = useState(null);
  const [logs, setLogs] = useState(null); // null = đang tải, false = không có quyền / lỗi
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useUi();
  const [hello, day = ""] = useHello();

  // Đơn + yêu cầu: lỗi thì giữ số liệu cũ (lần đầu → trống) và báo lỗi cho nút "Làm mới"
  const loadEnquiries = useCallback(async () => {
    const any = seeBookings || seeRequests;
    const none = Promise.resolve({ data: any ? undefined : {} });
    const [s, b, r, o] = await Promise.allSettled([
      any ? api("/enquiries/stats") : none,
      seeBookings ? api("/enquiries?kind=bookings&limit=6") : Promise.resolve({ data: [] }),
      seeRequests ? api("/enquiries?kind=requests&limit=6") : Promise.resolve({ data: [] }),
      any ? api("/overview/enquiries") : Promise.resolve({ data: null }),
    ]);
    const ok = (x) => x.status === "fulfilled";
    setStats((v) => (ok(s) ? s.value.data : (v ?? {})));
    setBookings((v) => (ok(b) ? b.value.data : (v ?? [])));
    setRequests((v) => (ok(r) ? r.value.data : (v ?? [])));
    setOverview((v) => (ok(o) ? o.value.data : (v ?? false))); // false = không tải được
    const failed = [s, b, r, o].find((x) => !ok(x));
    if (failed) throw failed.reason;
    return s.value.data;
  }, [seeBookings, seeRequests]);

  // Hoạt động gần đây: bỏ dòng đăng nhập thường ngày (vẫn hiện sai mật khẩu / tạm khoá) — chỉ giữ việc thực sự làm trên nội dung, đơn…
  const loadLogs = useCallback(
    () =>
      seeAudit
        ? api(`/audit-logs?limit=8&exclude=${encodeURIComponent("auth.login")}`)
            .then((r) => setLogs(r.data ?? []))
            .catch(() => setLogs((v) => v || false))
        : Promise.resolve().then(() => setLogs(false)),
    [seeAudit],
  );

  const loadOthers = useCallback(
    () =>
      Promise.all([
        ...(totalsKey ? totalsKey.split(",") : []).map((key) =>
          api(`/admin/${key}?limit=1`)
            .then((r) => setTotals((t) => ({ ...t, [key]: r.meta?.total ?? r.data?.length ?? 0 })))
            .catch(() => setTotals((t) => ({ ...t, [key]: t[key] ?? "—" }))),
        ),
        loadLogs(),
      ]),
    [totalsKey, loadLogs],
  );

  useEffect(() => {
    const onTodo = () => loadEnquiries().catch(() => {});
    onTodo();
    loadOthers();
    window.addEventListener(TODO_EVENT, onTodo);
    return () => window.removeEventListener(TODO_EVENT, onTodo);
  }, [loadEnquiries, loadOthers]);

  // Tự cập nhật mỗi phút khi đang mở tab (tab ẩn → không gọi; quay lại tab sau ≥ 1 phút → cập nhật ngay)
  const lastLoad = useRef(0);
  useEffect(() => {
    const quiet = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoad.current < REFRESH_MS - 1000) return;
      lastLoad.current = Date.now();
      loadEnquiries().catch(() => {});
      loadLogs();
    };
    lastLoad.current = Date.now();
    const t = setInterval(quiet, REFRESH_MS);
    document.addEventListener("visibilitychange", quiet);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", quiet);
    };
  }, [loadEnquiries, loadLogs]);

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
  const sideBySide = quickLinks.length > 0 && logs !== false;
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
      // cùng cách tính với biểu đồ (7 ngày lịch, giờ Việt Nam) → 2 con số luôn khớp nhau
      value: overview ? overview.last7.total : overview === false ? stats?.last7Days : undefined,
      trend: overview ? (
        <TrendChip now={overview.last7.total} prev={overview.prev7.total} short />
      ) : null,
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

      {/* Chưa cài email nhận thông báo → đơn mới không ai nhận thư (chỉ admin sửa được Cài đặt) */}
      {user?.role === "admin" && <NoRecipientsWarning />}

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

      {/* Biểu đồ 14 ngày + tình trạng xử lý (chỉ nhóm được xem) */}
      {(seeBookings || seeRequests) && overview !== false && (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <TrendCard data={overview} className="xl:col-span-2" />
          <StatusCard data={overview} />
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

      {/* Lối tắt + nhật ký: màn rộng → nhật ký 2/3 bên trái, lối tắt xếp dọc 1/3 bên phải */}
      <div className={cn("mt-6 grid gap-6", sideBySide && "xl:grid-cols-3")}>
        {quickLinks.length > 0 && (
          <Card
            title="Lối tắt"
            bodyClassName="p-3 sm:p-4"
            className={cn(sideBySide && "xl:col-start-3 xl:row-start-1 xl:self-start")}
          >
            <div
              className={cn(
                "grid gap-2 sm:grid-cols-2",
                sideBySide
                  ? "xl:grid-cols-1"
                  : quickLinks.length === 3
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
            className={cn(sideBySide && "xl:col-span-2 xl:col-start-1 xl:row-start-1")}
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
              <ul
                className={cn(
                  "px-5 pb-2 lg:columns-2 lg:gap-x-12",
                  sideBySide && "xl:columns-1 2xl:columns-2",
                )}
              >
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

function StatCard({ href, label, sub, value, Icon, hot, trend }) {
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
      {trend && <span className="mt-1.5 block">{trend}</span>}
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

/* =========================================================================
 * Biểu đồ đơn / yêu cầu 14 ngày (SVG tự vẽ — không thêm thư viện biểu đồ)
 * ========================================================================= */

// Màu nhận diện 2 nhóm (đã kiểm tra phân biệt được với người mù màu); chữ luôn dùng màu chữ thường
const SERIES = {
  bookings: { label: "Đơn đặt tour", color: "#1780c1", href: "/bookings" },
  requests: { label: "Yêu cầu từ form", color: "#e9a23b", href: "/requests" },
};
// Màu thanh theo trạng thái (cùng tông với nhãn trạng thái ở trang Đơn / Yêu cầu)
const STATUS_BAR = {
  new: "bg-sun-500",
  contacted: "bg-amber-400",
  confirmed: "bg-brand-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-300",
};

/** "2026-11-28" → "28/11" */
const dm = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
/** "2026-11-28" → "Thứ 7, 28/11" */
const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const dayTitle = (key) => `${WEEKDAYS[new Date(`${key}T00:00:00Z`).getUTCDay()]}, ${dm(key)}`;

/** Đã chờ bao lâu: "3 ngày" / "5 giờ" / "12 phút" */
function waited(iso) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} phút`;
  if (m < 1440) return `${Math.floor(m / 60)} giờ`;
  return `${Math.floor(m / 1440)} ngày`;
}

/** "↑ 25% so với 7 ngày trước" — tăng xanh, giảm đỏ, không đổi xám */
function TrendChip({ now, prev, short }) {
  if (!prev && !now) return null;
  const tail = short ? "" : " so với 7 ngày trước";
  const pct = prev ? Math.round(((now - prev) / prev) * 100) : null;
  const flat = pct === 0;
  const up = pct === null ? now > 0 : pct > 0;
  const Icon = flat ? null : up ? TrendingUp : TrendingDown;
  const text =
    pct === null
      ? short
        ? "Mới"
        : "7 ngày trước chưa có"
      : flat
        ? `Không đổi${tail}`
        : `${Math.abs(pct)}%${tail}`;
  return (
    <span
      title={`7 ngày gần đây: ${now} · 7 ngày trước đó: ${prev}`}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        flat
          ? "bg-slate-100 text-slate-600"
          : up
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700",
      )}
    >
      {Icon && <Icon className="size-3 shrink-0" aria-hidden />}
      {!flat && <span className="sr-only">{up ? "Tăng" : "Giảm"}</span>}
      <span className="truncate">{text}</span>
    </span>
  );
}

/** Đo chiều rộng thật của khung → vẽ SVG đúng điểm ảnh (chữ không bị co giãn) */
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Mức trên cùng của trục: số "tròn" ≥ max (4, 5, 10, 20, 25, 50…) */
function niceMax(max) {
  if (max <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}

function BarChart({ days, kinds }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const H = 190;
  const pad = { top: 14, right: 4, bottom: 26, left: 28 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = H - pad.top - pad.bottom;
  const totals = days.map((d) => kinds.reduce((a, k) => a + (d[k] ?? 0), 0));
  const top = niceMax(Math.max(...totals, 0));
  const slot = plotW / days.length;
  const barW = Math.max(6, Math.min(28, slot * 0.6));
  const y = (v) => pad.top + plotH - (v / top) * plotH;
  const narrow = slot < 34; // điện thoại: nhãn ngày cách 1
  const ticks = [0, top / 2, top];
  const empty = totals.every((t) => !t);

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Biểu đồ số đơn và yêu cầu mỗi ngày trong 14 ngày qua, nhiều nhất ${Math.max(...totals)} trong một ngày`}
          className="block"
          onMouseLeave={() => setHover(null)}
        >
          {/* nền nhạt cho 7 ngày gần đây */}
          <rect
            x={pad.left + slot * 7}
            y={pad.top - 10}
            width={slot * 7}
            height={plotH + 10}
            rx={8}
            className="fill-slate-50"
          />
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(t)}
                y2={y(t)}
                className={t ? "stroke-slate-100" : "stroke-slate-200"}
                strokeDasharray={t ? "3 4" : undefined}
              />
              {Number.isInteger(t) && (
                <text
                  x={pad.left - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] tabular-nums"
                >
                  {t}
                </text>
              )}
            </g>
          ))}
          {!narrow && (
            <text
              x={pad.left + slot * 7 + 8}
              y={pad.top + 2}
              className="fill-slate-400 text-[10px]"
            >
              7 ngày gần đây
            </text>
          )}
          {days.map((d, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const x = cx - barW / 2;
            let base = 0;
            const segs = kinds
              .map((k) => ({ k, v: d[k] ?? 0 }))
              .filter((s) => s.v > 0)
              .map((s) => {
                const seg = { ...s, y0: base, y1: base + s.v };
                base += s.v;
                return seg;
              });
            const isToday = i === days.length - 1;
            const fromEnd = days.length - 1 - i; // điện thoại: nhãn cách 1, chừa chỗ cho "Hôm nay"
            const showLabel = !narrow || (fromEnd % 2 === 0 && fromEnd !== 2);
            return (
              <g key={d.date}>
                {segs.map((s, j) => {
                  const last = j === segs.length - 1;
                  const yTop = y(s.y1) + (last ? 0 : 1); // khe 2px giữa 2 phần của cột
                  const yBot = y(s.y0) - (j === 0 ? 0 : 1);
                  const h = Math.max(1, yBot - yTop);
                  const r = last ? Math.min(4, h, barW / 2) : 0;
                  return (
                    <path
                      key={s.k}
                      d={`M${x},${yBot} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${yBot} Z`}
                      fill={SERIES[s.k].color}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                      className="transition-opacity"
                    />
                  );
                })}
                {showLabel && (
                  <text
                    x={isToday && narrow ? width - pad.right : cx}
                    y={H - 8}
                    textAnchor={isToday && narrow ? "end" : "middle"}
                    className={cn(
                      "text-[10px] tabular-nums",
                      isToday ? "fill-slate-700 font-semibold" : "fill-slate-400",
                    )}
                  >
                    {isToday ? "Hôm nay" : dm(d.date)}
                  </text>
                )}
                {/* vùng rê chuột / chạm rộng hơn cột */}
                <rect
                  x={pad.left + slot * i}
                  y={pad.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${dayTitle(d.date)}: ${totals[i]}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  onClick={() => setHover(i)}
                  className="outline-none"
                />
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height: H }} />
      )}
      {empty && width > 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-16 text-center text-sm text-slate-400">
          Chưa có đơn hay yêu cầu nào trong 14 ngày qua
        </p>
      )}
      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-44 rounded-xl bg-white p-3 text-xs shadow-lg ring-1 ring-slate-200"
          // đặt cạnh cột (nửa phải → bên trái cột, nửa trái → bên phải) để không che cột đang xem
          style={{
            left: Math.min(
              Math.max(
                0,
                hover >= days.length / 2
                  ? pad.left + slot * hover - 176 - 4
                  : pad.left + slot * (hover + 1) + 4,
              ),
              Math.max(0, width - 176),
            ),
          }}
        >
          <p className="font-semibold text-slate-900">{dayTitle(days[hover].date)}</p>
          <ul className="mt-1.5 space-y-1">
            {kinds.map((k) => (
              <li key={k} className="flex items-center gap-2 text-slate-600">
                <span className="size-2.5 rounded-sm" style={{ background: SERIES[k].color }} />
                <span className="flex-1">{SERIES[k].label}</span>
                <b className="text-slate-900 tabular-nums">{days[hover][k] ?? 0}</b>
              </li>
            ))}
          </ul>
          {kinds.length > 1 && (
            <p className="mt-1.5 flex justify-between border-t border-slate-100 pt-1.5 text-slate-500">
              Tổng <b className="text-slate-900 tabular-nums">{totals[hover]}</b>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TrendCard({ data, className }) {
  const kinds = data?.kinds ?? [];
  const types = data ? ENQUIRY_TYPES.filter((t) => t.value in data.byType) : [];
  const typeTotal = data ? Object.values(data.byType).reduce((a, b) => a + b, 0) : 0;
  return (
    <Card
      title="Đơn & yêu cầu 14 ngày qua"
      description="Số đơn / yêu cầu khách gửi mỗi ngày. Rê chuột hoặc chạm vào cột để xem chi tiết."
      className={cn("min-w-0", className)}
      bodyClassName="p-5 sm:p-6"
    >
      {!data ? (
        <div className="grid h-[260px] place-items-center">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">7 ngày gần đây</p>
              <p className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[28px] leading-none font-bold tracking-tight text-slate-900 tabular-nums">
                  {data.last7.total}
                </span>
                <TrendChip now={data.last7.total} prev={data.prev7.total} />
              </p>
            </div>
            {/* chú thích màu + số từng nhóm */}
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {kinds.map((k) => (
                <li key={k} className="min-w-0">
                  <Link
                    href={A(SERIES[k].href)}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-brand-700"
                  >
                    <span className="size-2.5 rounded-sm" style={{ background: SERIES[k].color }} />
                    {SERIES[k].label}
                  </Link>
                  <p className="mt-1 flex items-center gap-2 pl-[18px]">
                    <b className="text-base text-slate-900 tabular-nums">{data.last7[k]}</b>
                    <TrendChip now={data.last7[k]} prev={data.prev7[k]} short />
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <BarChart days={data.days} kinds={kinds} />
          {types.length > 1 && (
            <section className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="mb-3 text-xs font-semibold text-slate-500">Theo loại · 14 ngày qua</h3>
              <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 2xl:grid-cols-3">
                {types.map((t) => (
                  <BreakdownRow
                    key={t.value}
                    label={t.label}
                    value={data.byType[t.value] ?? 0}
                    total={typeTotal}
                    bar="bg-brand-400"
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Card>
  );
}

/** Thanh ngang: nhãn · số · % */
function BreakdownRow({ label, value, total, bar }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className={cn("font-medium", value ? "text-slate-700" : "text-slate-400")}>
          {label}
        </span>
        <span className="text-slate-400 tabular-nums">
          <b className={value ? "text-slate-900" : "text-slate-400"}>{value}</b>
          {total > 0 && <> · {pct}%</>}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", bar)}
          style={{ width: `${value ? Math.max(pct, 3) : 0}%` }}
        />
      </div>
    </li>
  );
}

function StatusCard({ data }) {
  const total = data ? Object.values(data.byStatus).reduce((a, b) => a + b, 0) : 0;
  const o = data?.oldestNew;
  const late = o && o.ageDays >= 2;
  return (
    <Card title="Tình trạng xử lý" className="min-w-0" bodyClassName="p-5 sm:p-6">
      {!data ? (
        <div className="grid h-[260px] place-items-center">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Việc chờ lâu nhất — bấm để mở ngay */}
          {o ? (
            <Link
              href={`${A(SERIES[o.kind].href)}?code=${encodeURIComponent(o.code)}`}
              className={cn(
                "group flex items-start gap-3 rounded-xl p-3.5 ring-1 transition",
                late
                  ? "bg-sun-50/70 ring-sun-100 hover:bg-sun-50"
                  : "bg-brand-50/50 ring-brand-100 hover:bg-brand-50",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg text-white",
                  late ? "bg-sun-500" : "bg-brand-600",
                )}
              >
                <Clock className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">
                  {o.kind === "bookings" ? "Đơn" : "Yêu cầu"} chờ lâu nhất: {waited(o.createdAt)}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  <span className="font-mono">{o.code}</span> · gửi lúc {fmtDateTime(o.createdAt)}
                  {data.pending > 1 && <> · tổng cộng {data.pending} việc đang chờ</>}
                </span>
              </span>
              <ArrowRight className="mt-2.5 size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
            </Link>
          ) : (
            <p className="flex items-center gap-3 rounded-xl bg-emerald-50/70 p-3.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
              <CircleCheck className="size-5 shrink-0" />
              Không có đơn hay yêu cầu nào đang chờ xử lý.
            </p>
          )}

          <section>
            <h3 className="mb-3 text-xs font-semibold text-slate-500">
              Theo trạng thái · 14 ngày qua
            </h3>
            <ul className="space-y-3">
              {STATUSES.map((s) => (
                <BreakdownRow
                  key={s.value}
                  label={s.label}
                  value={data.byStatus[s.value] ?? 0}
                  total={total}
                  bar={STATUS_BAR[s.value]}
                />
              ))}
            </ul>
          </section>
        </div>
      )}
    </Card>
  );
}
