"use client";

import { Fragment, useState } from "react";
import { ChevronDown, History, MousePointerClick, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminList } from "./hooks";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Notice,
  PageHeader,
  Pagination,
  Select,
  fmtDateTime,
} from "./ui";

/* ---------- Nhãn tiếng Việt cho thao tác ---------- */

const CONTENT_TYPES = {
  tour: "tour",
  destination: "điểm đến",
  theme: "chủ đề",
  article: "bài viết",
  category: "chuyên mục",
  author: "tác giả",
  car: "loại xe",
  car_area: "khu vực xe",
  visa_type: "loại visa",
  fast_track: "gói fast-track",
};
const CONTENT_VERBS = {
  create: "Thêm",
  update: "Sửa",
  show: "Hiện",
  hide: "Ẩn",
  delete: "Xoá",
  reorder: "Đổi thứ tự",
};

const FIXED = {
  "auth.login": "Đăng nhập",
  "auth.login_failed": "Đăng nhập sai mật khẩu",
  "auth.locked": "Bị tạm khoá vì sai mật khẩu nhiều lần",
  "auth.logout": "Đăng xuất",
  "auth.password_change": "Đổi mật khẩu",
  "enquiry.create": "Khách gửi đơn / yêu cầu",
  "enquiry.update": "Cập nhật trạng thái đơn",
  "enquiry.note": "Thêm ghi chú vào đơn",
  "enquiry.delete": "Xoá đơn",
  "enquiry.resend_email": "Gửi lại email của đơn",
  "media.upload": "Tải ảnh lên",
  "media.from_url": "Thêm ảnh từ link",
  "media.delete": "Xoá ảnh",
  "media.drive_video": "Thêm video từ Google Drive",
  "page.update": "Sửa trang giới thiệu / chính sách",
  "settings.home": "Sửa trang chủ",
  "settings.notifications": "Sửa email thông báo",
  "settings.test_email": "Gửi email thử",
  "settings.payment": "Sửa cài đặt 9Pay",
  "settings.tracking": "Sửa mã đo lường",
  "user.create": "Thêm tài khoản",
  "user.update": "Sửa tài khoản",
  "user.delete": "Xoá tài khoản",
  "user.password_reset": "Đặt lại mật khẩu tài khoản",
  "user.unlock": "Mở khoá tài khoản",
};

export function actionLabel(action = "") {
  if (FIXED[action]) return FIXED[action];
  const [type, verb] = action.split(".");
  if (CONTENT_TYPES[type] && CONTENT_VERBS[verb])
    return `${CONTENT_VERBS[verb]} ${CONTENT_TYPES[type]}`;
  return action;
}

const TARGET_TYPES = {
  ...CONTENT_TYPES,
  user: "tài khoản",
  enquiry: "đơn",
  media: "ảnh",
  page: "trang",
};

function actionTone(action) {
  if (action === "auth.login_failed" || action === "auth.locked") return "red";
  if (action.endsWith(".delete")) return "red";
  if (action.startsWith("auth.")) return "gray";
  if (action.startsWith("settings.") || action.startsWith("user.")) return "violet";
  if (action.startsWith("enquiry.")) return "amber";
  if (action.endsWith(".create")) return "green";
  return "blue";
}

/** Tên dễ đọc của thứ được thao tác (đường dẫn trang, mã đơn); không hiện mã nội bộ */
function targetName(x) {
  if (x.meta?.slug) return x.meta.slug;
  const id = x.target?.id;
  const readable = x.target?.type === "enquiry" || x.target?.type === "page";
  return readable && id && !/^[0-9a-f]{24}$/i.test(id) ? id : "";
}

/* Phần "Chi tiết": đổi dữ liệu ghi kèm thành câu chữ dễ đọc */
const META_LABELS = {
  count: "Số lượng",
  folder: "Nhóm ảnh",
  host: "Lấy ảnh từ",
  role: "Vai trò",
  fields: "Mục đã sửa",
  enabled: "Bật thanh toán",
  environment: "Chế độ",
  status: "Trạng thái",
  paymentStatus: "Thanh toán",
  bytes: "Dung lượng",
  duration: "Thời lượng",
};
// định dạng riêng cho vài thông tin dạng số
const META_FORMAT = {
  bytes: (v) => `${(Number(v) / 1048576).toFixed(1)} MB`,
  duration: (v) => {
    const s = Math.round(Number(v) || 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  },
};
const META_VALUES = {
  admin: "Quản trị viên",
  editor: "Biên tập viên",
  sandbox: "Chạy thử",
  production: "Chạy thật",
  name: "Họ tên",
  isActive: "Cho phép đăng nhập",
  new: "Mới",
  contacted: "Đã liên hệ",
  confirmed: "Đã xác nhận",
  completed: "Hoàn tất",
  cancelled: "Hủy",
  paid: "Đã thanh toán",
  unpaid: "Chưa thanh toán",
};
function metaValue(v) {
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (Array.isArray(v)) return v.map(metaValue).join(", ");
  if (v && typeof v === "object") return Object.values(v).map(metaValue).join(", ");
  if (v === "role") return "Vai trò";
  return META_VALUES[v] ?? String(v ?? "");
}
const metaRows = (meta) =>
  Object.entries(meta ?? {})
    .filter(([k, v]) => k !== "slug" && v !== "" && v != null)
    .map(([k, v]) => [META_LABELS[k] ?? k, META_FORMAT[k] ? META_FORMAT[k](v) : metaValue(v)]);

/** Bộ lọc thao tác (backend lọc đúng mã thao tác) */
const FILTER_GROUPS = [
  {
    label: "Đăng nhập & mật khẩu",
    actions: ["auth.login", "auth.login_failed", "auth.locked", "auth.password_change"],
  },
  {
    label: "Đơn & yêu cầu",
    actions: ["enquiry.update", "enquiry.note", "enquiry.delete", "enquiry.resend_email"],
  },
  ...Object.keys(CONTENT_TYPES).map((t) => ({
    label: CONTENT_TYPES[t].charAt(0).toUpperCase() + CONTENT_TYPES[t].slice(1),
    actions: Object.keys(CONTENT_VERBS).map((v) => `${t}.${v}`),
  })),
  {
    label: "Trang & ảnh",
    actions: ["page.update", "media.upload", "media.from_url", "media.drive_video", "media.delete"],
  },
  {
    label: "Cài đặt",
    actions: [
      "settings.home",
      "settings.notifications",
      "settings.test_email",
      "settings.payment",
      "settings.tracking",
    ],
  },
  {
    label: "Tài khoản quản trị",
    actions: ["user.create", "user.update", "user.delete", "user.password_reset", "user.unlock"],
  },
];

const actorId = (a) => (a && typeof a === "object" ? (a.id ?? a._id ?? "") : (a ?? ""));

/** Rút gọn trình duyệt / hệ điều hành từ user-agent */
function shortUA(ua = "") {
  if (!ua) return "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return [browser, os].filter(Boolean).join(" · ") || ua.slice(0, 40);
}

export default function AuditLogPage() {
  const list = useAdminList("/audit-logs", { action: "", actor: "", limit: 25 });
  const [actorName, setActorName] = useState("");
  const [open, setOpen] = useState(null);

  return (
    <>
      <PageHeader
        title="Nhật ký thao tác"
        description="Ai đã đăng nhập, thêm, sửa, xoá gì và vào lúc nào. Nhật ký được giữ trong 365 ngày."
        actions={
          <Button variant="secondary" icon={RotateCw} onClick={list.reload} loading={list.loading}>
            Làm mới
          </Button>
        }
      />

      <Card bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-slate-100 p-4 sm:px-5">
          <Select
            value={list.query.action}
            onChange={(e) => list.setQuery({ action: e.target.value })}
            className="w-full sm:w-72"
          >
            <option value="">Tất cả thao tác</option>
            {FILTER_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.actions.map((a) => (
                  <option key={a} value={a}>
                    {actionLabel(a)}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          {list.query.actor ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
              Người thao tác: {actorName || list.query.actor}
              <button
                type="button"
                aria-label="Bỏ lọc người thao tác"
                onClick={() => list.setQuery({ actor: "" })}
                className="grid size-5 place-items-center rounded-full hover:bg-brand-100"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
              <MousePointerClick className="size-4 shrink-0 text-slate-400" />
              Bấm vào tên một người để chỉ xem thao tác của người đó.
            </span>
          )}
          {list.meta?.total > 0 && (
            <span className="ml-auto text-[13px] whitespace-nowrap text-slate-500">
              <b className="font-semibold text-slate-700">{list.meta.total}</b> thao tác
            </span>
          )}
        </div>

        {list.error && (
          <Notice tone="error" className="m-4">
            {list.error}
          </Notice>
        )}
        {list.loading && !list.items.length ? (
          <LoadingBlock />
        ) : !list.items.length ? (
          <EmptyState icon={History} title="Chưa có thao tác nào" />
        ) : (
          <div className="overflow-x-auto">
            {/* mọi cột ngắn gọn → tiêu đề và nội dung cùng căn giữa */}
            <table className="w-full min-w-[880px] table-fixed text-center text-sm">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-[24%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] tracking-wide text-slate-500 uppercase">
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Người thao tác</th>
                  <th className="px-4 py-3 font-semibold">Thao tác</th>
                  <th className="px-4 py-3 font-semibold">Đối tượng</th>
                  <th className="px-4 py-3 font-semibold">Thiết bị</th>
                  <th className="px-4 py-3 font-semibold">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((x) => {
                  const id = actorId(x.actor);
                  const details = metaRows(x.meta);
                  const hasMeta = details.length > 0;
                  const name = targetName(x);
                  const expanded = open === x.id;
                  return (
                    <Fragment key={x.id}>
                      <tr className={cn("align-middle", expanded && "bg-slate-50/60")}>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                          {fmtDateTime(x.createdAt)}
                        </td>
                        <td className="truncate px-4 py-3">
                          {id ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActorName(x.actorName);
                                list.setQuery({ actor: id });
                              }}
                              className="font-semibold text-brand-700 hover:underline"
                            >
                              {x.actorName || "(không rõ)"}
                            </button>
                          ) : (
                            <span className="text-slate-500">
                              {x.actorName || "Khách / tự động"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={actionTone(x.action)}>{actionLabel(x.action)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {x.target?.type ? (
                            <>
                              <span className="font-semibold">
                                {TARGET_TYPES[x.target.type] ?? x.target.type}
                              </span>
                              {name && (
                                <span className="block truncate text-slate-500">{name}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <span className="block truncate">{shortUA(x.userAgent) || "—"}</span>
                          {x.ip && (
                            <span className="block truncate text-[11px] text-slate-400">
                              Địa chỉ mạng: {x.ip}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasMeta ? (
                            <button
                              type="button"
                              onClick={() => setOpen(expanded ? null : x.id)}
                              aria-expanded={expanded}
                              className={cn(
                                "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-semibold ring-1 transition",
                                expanded
                                  ? "bg-brand-50 text-brand-700 ring-brand-200"
                                  : "bg-white text-slate-600 ring-slate-200 hover:text-slate-900 hover:ring-slate-300",
                              )}
                            >
                              {expanded ? "Ẩn" : "Xem"}
                              <ChevronDown
                                className={cn("size-3.5 transition", expanded && "rotate-180")}
                              />
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/60 px-5 pt-1 pb-4">
                            <dl className="grid gap-x-8 gap-y-3 rounded-xl bg-white p-4 text-left text-xs ring-1 ring-slate-200/70 sm:grid-cols-2 lg:grid-cols-4">
                              {details.map(([k, v]) => (
                                <div key={k} className="min-w-0">
                                  <dt className="text-slate-400">{k}</dt>
                                  <dd className="font-medium break-words text-slate-700">{v}</dd>
                                </div>
                              ))}
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={list.meta} onPage={(page) => list.setQuery({ page })} unit="thao tác" />
      </Card>
    </>
  );
}
