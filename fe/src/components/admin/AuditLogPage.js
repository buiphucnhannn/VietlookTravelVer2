"use client";

import { Fragment, useState } from "react";
import { ChevronDown, History, RotateCw, X, Info } from "lucide-react";
import Link from "@/components/admin/Link";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { cn } from "@/lib/utils";
import { useAdminList } from "./hooks";
import { canUser, useCurrentUser } from "./permissions";
import { PAGE_LABELS, PAYMENT_LABELS, STATUS_LABELS } from "./labels";
import {
  Badge,
  BusyArea,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Notice,
  PageHeader,
  Pagination,
  SearchBox,
  fmtDateTime,
} from "./ui";

/* =========================================================================
 * Diễn đạt 1 dòng nhật ký thành câu dễ hiểu (dùng chung với "Hoạt động gần đây" ở Tổng quan)
 * ========================================================================= */

/** Loại nội dung: tên gọi + trang quản trị tương ứng (+ quyền cần có để mở) */
const CONTENT = {
  tour: { noun: "tour", module: "tours", href: (id) => `/tours/${id}`, list: "/tours" },
  destination: { noun: "điểm đến", module: "destinations", list: "/destinations" },
  theme: { noun: "chủ đề tour", module: "themes", list: "/themes" },
  article: {
    noun: "bài viết",
    module: "articles",
    href: (id) => `/articles/${id}`,
    list: "/articles",
  },
  category: { noun: "chuyên mục", module: "taxonomy", list: "/taxonomy" },
  author: { noun: "tác giả", module: "taxonomy", list: "/taxonomy" },
  car: { noun: "loại xe", module: "cars", list: "/cars" },
  car_area: { noun: "khu vực xe", module: "cars", list: "/cars" },
  visa_type: { noun: "loại visa", module: "visa", list: "/visa" },
  fast_track: { noun: "gói fast-track", module: "visa", list: "/visa" },
};
const CONTENT_VERBS = {
  create: "Thêm",
  update: "Sửa",
  show: "Hiện",
  hide: "Ẩn",
  delete: "Xoá",
  reorder: "Sắp xếp lại thứ tự",
};

const ROLE_LABELS = { admin: "Quản trị viên", editor: "Nhân viên" };
const USER_FIELDS = {
  name: "Họ tên",
  email: "Email",
  role: "Vai trò",
  isActive: "Cho phép đăng nhập",
  username: "Tên đăng nhập",
};
const FOLDER_LABELS = {
  tours: "Tour",
  articles: "Bài viết",
  destinations: "Điểm đến",
  themes: "Chủ đề tour",
  authors: "Tác giả",
  cars: "Xe",
  pages: "Trang giới thiệu / chính sách",
  home: "Trang chủ",
};

const FIXED = {
  "auth.login": "Đăng nhập",
  "auth.login_failed": "Nhập sai mật khẩu",
  "auth.locked": "Bị tạm khoá vì sai mật khẩu nhiều lần",
  "auth.logout": "Đăng xuất",
  "auth.password_change": "Đổi mật khẩu",
  "enquiry.create": "Khách gửi đơn / yêu cầu",
  "enquiry.update": "Cập nhật trạng thái đơn",
  "enquiry.note": "Thêm ghi chú vào đơn",
  "enquiry.note_delete": "Xoá ghi chú của đơn",
  "enquiry.delete": "Xoá đơn",
  "enquiry.resend_email": "Gửi lại email của đơn",
  "enquiry.payment": "Khách thanh toán online qua 9Pay",
  "media.upload": "Tải ảnh lên",
  "media.from_url": "Thêm ảnh từ link",
  "media.delete": "Xoá ảnh",
  "media.drive_video": "Thêm video từ Google Drive",
  "media.cleanup": "Tự dọn ảnh không còn dùng",
  "media.discard": "Bỏ ảnh / video chưa lưu",
  "page.update": "Sửa trang giới thiệu / chính sách",
  "settings.home": "Sửa trang chủ",
  "settings.notifications": "Sửa email nhận thông báo",
  "settings.test_email": "Gửi email thử",
  "settings.payment": "Sửa cài đặt thanh toán 9Pay",
  "settings.tracking": "Sửa mã đo lường",
  "settings.smallGroup": "Sửa phụ thu nhóm nhỏ",
  "user.create": "Thêm tài khoản",
  "user.update": "Sửa tài khoản",
  "user.permissions": "Đổi quyền tài khoản",
  "user.delete": "Xoá tài khoản",
  "user.password_reset": "Đặt lại mật khẩu tài khoản",
  "user.unlock": "Mở khoá tài khoản",
};

/** Tên ngắn của việc đã làm: "tour.update" → "Sửa tour" (dùng cho ô tìm kiếm) */
export function actionLabel(action = "") {
  if (FIXED[action]) return FIXED[action];
  const [type, verb] = action.split(".");
  if (CONTENT[type] && CONTENT_VERBS[verb]) return `${CONTENT_VERBS[verb]} ${CONTENT[type].noun}`;
  return "Thao tác khác";
}

/** Nhãn màu ngắn đứng đầu câu — để lướt nhanh */
const BADGES = {
  "auth.login": ["Đăng nhập", "gray"],
  "auth.logout": ["Đăng xuất", "gray"],
  "auth.login_failed": ["Sai mật khẩu", "red"],
  "auth.locked": ["Tạm khoá", "red"],
  "auth.password_change": ["Mật khẩu", "violet"],
  "enquiry.create": ["Đơn mới", "amber"],
  "enquiry.update": ["Đơn", "amber"],
  "enquiry.note": ["Ghi chú", "amber"],
  "enquiry.note_delete": ["Ghi chú", "amber"],
  "enquiry.resend_email": ["Gửi email", "amber"],
  "enquiry.payment": ["Thanh toán", "green"],
  "enquiry.delete": ["Xoá", "red"],
  "media.upload": ["Ảnh", "blue"],
  "media.from_url": ["Ảnh", "blue"],
  "media.drive_video": ["Video", "blue"],
  "media.delete": ["Xoá", "red"],
  "media.cleanup": ["Dọn ảnh", "gray"],
  "media.discard": ["Dọn ảnh", "gray"],
  "page.update": ["Sửa", "blue"],
  "user.create": ["Tài khoản", "violet"],
  "user.update": ["Tài khoản", "violet"],
  "user.permissions": ["Phân quyền", "violet"],
  "user.password_reset": ["Mật khẩu", "violet"],
  "user.unlock": ["Mở khoá", "violet"],
  "user.delete": ["Xoá", "red"],
};
const VERB_TONES = {
  create: "green",
  update: "blue",
  show: "green",
  hide: "gray",
  delete: "red",
  reorder: "blue",
};
export function actionBadge(action = "") {
  if (BADGES[action]) return BADGES[action];
  if (action.startsWith("settings.")) return ["Cài đặt", "violet"];
  const verb = action.split(".")[1];
  if (CONTENT_VERBS[verb])
    return [verb === "reorder" ? "Sắp xếp" : CONTENT_VERBS[verb], VERB_TONES[verb]];
  return ["Khác", "gray"];
}

/** Ai làm khi không có tài khoản đăng nhập */
export function anonymousActor(action) {
  if (action === "auth.login_failed" || action === "auth.locked") return "Người lạ";
  if (action === "enquiry.create") return "Khách trên website";
  if (action === "enquiry.payment") return "9Pay";
  return "Hệ thống";
}

const quoted = (s) => `“${s}”`;
const enquiryKind = (x) =>
  x.targetKind || (/^VL-BK/i.test(x.targetName || x.target?.id || "") ? "bookings" : "requests");

/**
 * Câu mô tả 1 dòng nhật ký: { before, name, after, href, module }
 *   → before + name (link tới mục trong quản trị nếu còn) + after
 * Không bao giờ hiện đường dẫn (slug), mã nội bộ hay chữ tiếng Anh.
 */
export function describeLog(x) {
  const action = x.action ?? "";
  const [type, verb] = action.split(".");
  const m = x.meta ?? {};
  const id = x.target?.id ?? "";
  const gone = Boolean(x.targetGone) && verb !== "delete";
  const goneNote = gone ? " (đã xoá)" : "";
  const plain = (before) => ({ before });

  // Nội dung website: tour, điểm đến, bài viết…
  const c = CONTENT[type];
  if (c && CONTENT_VERBS[verb]) {
    if (verb === "reorder")
      return {
        before: `Sắp xếp lại thứ tự ${m.count ? `${m.count} ${c.noun}` : `các ${c.noun}`}`,
        after: "",
      };
    const lead = verb === "create" ? `Thêm ${c.noun} mới` : `${CONTENT_VERBS[verb]} ${c.noun}`;
    const tail = verb === "show" ? " trên website" : verb === "hide" ? " khỏi website" : "";
    if (!x.targetName)
      return plain(
        `${CONTENT_VERBS[verb]} một ${c.noun}${verb === "create" ? " mới" : ""}${gone ? " (nay đã xoá)" : ""}${tail}`,
      );
    return {
      before: `${lead} `,
      name: quoted(x.targetName),
      after: `${goneNote}${tail}`,
      href: gone || verb === "delete" ? "" : c.href ? c.href(id) : c.list,
      module: c.module,
    };
  }

  // Đơn / yêu cầu của khách
  if (type === "enquiry") {
    const code = x.targetName || (/^[0-9a-f]{24}$/i.test(id) ? "" : id);
    const kind = enquiryKind(x);
    const of = x.customer ? ` của ${x.customer}` : "";
    const link = (lead, after = "") =>
      code
        ? {
            before: `${lead} đơn `,
            name: code,
            after: `${of}${goneNote}${after}`,
            href: gone || verb === "delete" ? "" : `/${kind}?code=${encodeURIComponent(code)}`,
            module: kind,
          }
        : plain(`${lead} một đơn${of}${goneNote}${after}`);
    if (verb === "update") {
      const changes = [
        m.status && `trạng thái ${quoted(STATUS_LABELS[m.status] ?? m.status)}`,
        m.paymentStatus && quoted(PAYMENT_LABELS[m.paymentStatus] ?? m.paymentStatus),
      ].filter(Boolean);
      return link("Cập nhật", changes.length ? ` → ${changes.join(", ")}` : "");
    }
    if (verb === "note") return link("Thêm ghi chú vào");
    if (verb === "note_delete") return link("Xoá ghi chú của");
    if (verb === "resend_email") return link("Gửi lại email cho");
    if (verb === "delete") return link("Xoá");
    if (verb === "create") return link("Khách gửi");
    if (verb === "payment") {
      const amount = m.amount ? `${Number(m.amount).toLocaleString("vi-VN")} ₫` : "";
      const st = m.paymentStatus === "deposit" ? "đặt cọc" : "thanh toán";
      return link(`Khách ${st}${amount ? ` ${amount}` : ""} cho`);
    }
  }

  // Tài khoản quản trị
  if (type === "user") {
    const name = x.targetName;
    const acc = (lead, after = "") =>
      name
        ? {
            before: `${lead} tài khoản `,
            name,
            after: `${goneNote}${after}`,
            href: gone || verb === "delete" ? "" : "/users",
            module: "admin",
          }
        : plain(`${lead} một tài khoản${gone ? " (nay đã xoá)" : ""}${after}`);
    const changes = Array.isArray(m.changes) ? m.changes : [];
    if (verb === "create")
      return acc("Thêm", m.role ? ` với vai trò ${ROLE_LABELS[m.role] ?? "Nhân viên"}` : "");
    if (verb === "update") {
      const fields = (m.fields ?? []).map((f) => USER_FIELDS[f]).filter(Boolean);
      return acc("Sửa thông tin", fields.length ? `: ${fields.join(", ")}` : "");
    }
    if (verb === "permissions")
      return acc(
        "Đổi quyền",
        !changes.length
          ? ""
          : changes.length <= 2
            ? `: ${changes.join("; ")}`
            : ` — đổi ${changes.length} mục quyền`,
      );
    if (verb === "delete") return acc("Xoá");
    if (verb === "password_reset") return acc("Đặt lại mật khẩu cho");
    if (verb === "unlock") return acc("Mở khoá đăng nhập cho");
  }

  switch (action) {
    case "auth.login":
      return plain(m.demo ? "Đăng nhập nhanh (bản dùng thử)" : "Đăng nhập vào trang quản trị");
    case "auth.logout":
      return plain("Đăng xuất");
    case "auth.login_failed":
      return plain(
        x.actor
          ? `Nhập sai mật khẩu (tài khoản ${x.actorName || "không rõ"})`
          : "Có người nhập sai tên đăng nhập",
      );
    case "auth.locked":
      return plain(
        x.actor
          ? `Tài khoản ${x.actorName || "không rõ"} bị tạm khoá vì nhập sai mật khẩu nhiều lần`
          : "Đăng nhập bị tạm chặn vì nhập sai nhiều lần",
      );
    case "auth.password_change":
      return plain("Đổi mật khẩu đăng nhập của mình");
    case "media.upload":
      return plain(m.count ? `Tải lên ${m.count} ảnh` : "Tải ảnh lên");
    case "media.from_url":
      return plain(m.host ? `Thêm ảnh từ link (trang ${m.host})` : "Thêm ảnh từ link");
    case "media.drive_video":
      return plain("Thêm video từ Google Drive");
    case "media.delete":
      return plain("Xoá một ảnh khỏi kho ảnh");
    case "media.cleanup":
      return plain(m.count ? `Tự dọn ${m.count} ảnh không còn dùng` : "Tự dọn ảnh không còn dùng");
    case "media.discard":
      return plain(
        m.count ? `Bỏ ${m.count} ảnh / video đã chọn nhưng không lưu` : "Bỏ ảnh / video chưa lưu",
      );
    case "page.update": {
      const name = x.targetName || PAGE_LABELS[id];
      return name
        ? {
            before: "Sửa trang ",
            name: quoted(name),
            after: "",
            href: PAGE_LABELS[id] ? `/pages?key=${id}` : "/pages",
            module: "pages",
          }
        : plain("Sửa trang giới thiệu / chính sách");
    }
    case "settings.home":
      return { before: "Sửa nội dung ", name: "trang chủ", href: "/home", module: "home" };
    case "settings.notifications":
      return {
        before: "Sửa danh sách ",
        name: "email nhận thông báo",
        after: m.count != null ? ` (${m.count} người nhận)` : "",
        href: "/settings",
        module: "admin",
      };
    case "settings.test_email":
      return plain("Gửi thử email thông báo");
    case "settings.payment":
      return {
        before: "Sửa ",
        name: "cài đặt thanh toán online 9Pay",
        after:
          m.enabled === false
            ? " — đang tắt"
            : m.enabled
              ? m.environment === "production"
                ? " — đang bật, chạy thật"
                : " — đang bật, chạy thử"
              : "",
        href: "/settings",
        module: "admin",
      };
    case "settings.tracking":
      return {
        before: "Sửa ",
        name: "mã đo lường lượt truy cập",
        after: "",
        href: "/settings",
        module: "admin",
      };
    case "settings.smallGroup":
      return {
        before: "Sửa ",
        name: "phụ thu nhóm nhỏ",
        after: m.enabled === false ? " — đang tắt" : m.enabled ? " — đang bật" : "",
        href: "/settings",
        module: "admin",
      };
  }
  return plain(actionLabel(action));
}

/** Câu mô tả (tên đối tượng là link tới mục trong quản trị khi còn và người xem có quyền) */
export function LogSentence({ log, className }) {
  const user = useCurrentUser();
  const d = describeLog(log);
  const linkable = d.name && d.href && canUser(user, d.module, "view");
  return (
    <span className={className}>
      {d.before}
      {d.name &&
        (linkable ? (
          <Link
            href={`${ADMIN_BASE}${d.href}`}
            className="font-semibold text-brand-700 transition-colors hover:text-sun-600"
          >
            {d.name}
          </Link>
        ) : (
          <span className="font-semibold text-slate-900">{d.name}</span>
        ))}
      {d.after}
    </span>
  );
}

/** Người làm: tên đăng nhập, hoặc "Người lạ" / "Khách trên website" / "Hệ thống" */
export const actorText = (x) => x.actorName || anonymousActor(x.action);

/* ---------- Phần "Chi tiết": chỉ thông tin có ý nghĩa, có nhãn tiếng Việt ---------- */

const fmtMB = (v) => `${(Number(v) / 1048576).toFixed(1)} MB`;
const fmtDuration = (v) => {
  const s = Math.round(Number(v) || 0);
  return `${Math.floor(s / 60)} phút ${String(s % 60).padStart(2, "0")} giây`;
};

/** [[nhãn, giá trị | danh sách]] */
function detailRows(x) {
  const m = x.meta ?? {};
  const [type, verb] = (x.action ?? "").split(".");
  const rows = [];
  const add = (k, v) => v != null && v !== "" && rows.push([k, v]);
  const c = CONTENT[type];
  if (c && x.targetName && verb !== "reorder")
    add(c.noun.charAt(0).toUpperCase() + c.noun.slice(1), x.targetName);
  if (c && verb === "reorder" && m.count) add("Số mục được sắp xếp", `${m.count} ${c.noun}`);
  if (x.targetGone && verb !== "delete" && (c || type === "user" || type === "enquiry"))
    add("Hiện trạng", "Đã bị xoá sau đó");
  if (type === "enquiry") {
    add("Mã đơn", x.targetName);
    add("Khách hàng", x.customer);
    if (m.status) add("Trạng thái mới", STATUS_LABELS[m.status] ?? m.status);
    if (m.paymentStatus) add("Thanh toán", PAYMENT_LABELS[m.paymentStatus] ?? m.paymentStatus);
  }
  if (type === "user") {
    add("Tài khoản", x.targetName);
    if (m.role) add("Vai trò", ROLE_LABELS[m.role] ?? "Nhân viên");
    const fields = (m.fields ?? []).map((f) => USER_FIELDS[f]).filter(Boolean);
    if (fields.length) add("Mục đã sửa", fields.join(", "));
    if (Array.isArray(m.changes) && m.changes.length)
      add(verb === "create" ? "Quyền được cấp" : "Quyền đã đổi", m.changes);
  }
  if (type === "media") {
    if (m.count) add("Số ảnh", `${m.count} ảnh`);
    if (FOLDER_LABELS[m.folder]) add("Dùng cho", FOLDER_LABELS[m.folder]);
    add("Lấy ảnh từ trang", m.host);
    if (m.bytes) add("Dung lượng video", fmtMB(m.bytes));
    if (m.duration) add("Thời lượng video", fmtDuration(m.duration));
  }
  if (x.action === "page.update") add("Trang", x.targetName || PAGE_LABELS[x.target?.id]);
  if (x.action === "settings.notifications" && m.count != null)
    add("Số người nhận email", `${m.count} người`);
  if (x.action === "settings.payment") {
    if (typeof m.enabled === "boolean") add("Thanh toán online", m.enabled ? "Bật" : "Tắt");
    if (m.environment)
      add("Chế độ", m.environment === "production" ? "Chạy thật (thu tiền thật)" : "Chạy thử");
  }
  if (x.action === "auth.login" && m.demo) add("Cách đăng nhập", "Đăng nhập nhanh (bản dùng thử)");
  return rows;
}

/** Bộ lọc thao tác (backend lọc đúng mã thao tác) */
const FILTER_GROUPS = [
  {
    label: "Đăng nhập & mật khẩu",
    actions: ["auth.login", "auth.login_failed", "auth.locked", "auth.password_change"],
  },
  {
    label: "Đơn & yêu cầu",
    actions: [
      "enquiry.update",
      "enquiry.note",
      "enquiry.note_delete",
      "enquiry.delete",
      "enquiry.resend_email",
      "enquiry.payment",
    ],
  },
  ...Object.keys(CONTENT).map((t) => ({
    label: CONTENT[t].noun,
    actions: Object.keys(CONTENT_VERBS).map((v) => `${t}.${v}`),
  })),
  {
    label: "Trang & ảnh",
    actions: [
      "page.update",
      "media.upload",
      "media.from_url",
      "media.drive_video",
      "media.delete",
      "media.cleanup",
      "media.discard",
    ],
  },
  {
    label: "Cài đặt",
    actions: [
      "settings.home",
      "settings.notifications",
      "settings.test_email",
      "settings.payment",
      "settings.tracking",
      "settings.smallGroup",
    ],
  },
  {
    label: "Tài khoản quản trị",
    actions: [
      "user.create",
      "user.update",
      "user.permissions",
      "user.delete",
      "user.password_reset",
      "user.unlock",
    ],
  },
];

const actorId = (a) => (a && typeof a === "object" ? (a.id ?? a._id ?? "") : (a ?? ""));

/* ---------- Tìm kiếm: chữ người dùng gõ → các thao tác có nhãn khớp ---------- */

const ALL_ACTIONS = [
  ...new Set([...FILTER_GROUPS.flatMap((g) => g.actions), "auth.logout", "enquiry.create"]),
];
/** Bỏ dấu, chữ thường: "Đăng nhập" → "dang nhap" */
const plainText = (s = "") =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
function matchActions(text) {
  const q = plainText(text);
  if (q.length < 2) return [];
  return ALL_ACTIONS.filter((a) =>
    plainText(
      `${actionLabel(a)} ${actionBadge(a)[0]} ${describeLog({ action: a }).before}`,
    ).includes(q),
  );
}

/** Khoảng thời gian nhanh */
const vnDay = (offsetDays = 0) =>
  new Date(Date.now() + 7 * 3600e3 - offsetDays * 864e5).toISOString().slice(0, 10);
const PERIODS = [
  { key: "", label: "Tất cả" },
  { key: "today", label: "Hôm nay", from: () => vnDay(0) },
  { key: "7d", label: "7 ngày", from: () => vnDay(6) },
  { key: "30d", label: "30 ngày", from: () => vnDay(29) },
];

/* ---------- Thiết bị, địa chỉ mạng ---------- */

/** Thiết bị: "Máy tính · Chrome", "Điện thoại · Safari"; công cụ không phải trình duyệt → "Công cụ tự động" */
function device(ua = "") {
  if (!ua) return { short: "Không rõ", full: "Không rõ" };
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /CocCoc/.test(ua)
        ? "Cốc Cốc"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : /Safari\//.test(ua)
              ? "Safari"
              : "";
  if (!browser)
    return { short: "Công cụ tự động", full: "Công cụ tự động (không phải trình duyệt)" };
  const kind = /iPad|Tablet/.test(ua)
    ? "Máy tính bảng"
    : /iPhone|Android.*Mobile|Mobile/.test(ua)
      ? "Điện thoại"
      : "Máy tính";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iPhone / iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return {
    short: `${kind} · ${browser}`,
    full: [kind, os && `(${os})`, `· trình duyệt ${browser}`].filter(Boolean).join(" "),
  };
}

/** Địa chỉ mạng: máy chủ nội bộ → "Mạng nội bộ" thay vì "::1" */
const networkLabel = (ip = "") =>
  !ip
    ? ""
    : /^(::1|127\.|::ffff:127\.)/.test(ip)
      ? "Mạng nội bộ (máy chủ)"
      : ip.replace(/^::ffff:/, "");

const explainOf = (x, id) =>
  x.action === "auth.login_failed"
    ? id
      ? "Gõ đúng tên đăng nhập nhưng sai mật khẩu. Nếu không phải người của công ty, nên đổi mật khẩu tài khoản này."
      : "Tên đăng nhập không có trong hệ thống — có thể gõ nhầm, hoặc người ngoài thử vào."
    : x.action === "auth.locked"
      ? "Nhập sai mật khẩu nhiều lần liên tiếp nên tài khoản được tạm khoá ít phút để bảo vệ."
      : "";

/** Ô chi tiết khi bấm "Xem" */
function DetailPanel({ x, id }) {
  const dev = device(x.userAgent);
  const net = networkLabel(x.ip);
  const explain = explainOf(x, id);
  const rows = [
    ...detailRows(x),
    ["Thời gian", fmtDateTime(x.createdAt)],
    ["Thiết bị", dev.full],
    ...(net ? [["Địa chỉ mạng (IP)", net]] : []),
  ];
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200/70 sm:p-5">
      {explain && (
        <p className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-900 ring-1 ring-amber-100">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
          {explain}
        </p>
      )}
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className={cn(
              "min-w-0 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100",
              Array.isArray(v) && "sm:col-span-2 lg:col-span-3",
            )}
          >
            <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              {k}
            </dt>
            <dd className="mt-1 text-[13px] font-medium break-words text-slate-700">
              {Array.isArray(v) ? (
                <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                  {v.map((line) => (
                    <li key={line} className="flex gap-1.5">
                      <span className="text-slate-300">•</span>
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                v
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ToggleButton({ expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold ring-1 transition",
        expanded
          ? "bg-brand-50 text-brand-700 ring-brand-200"
          : "bg-white text-slate-600 ring-slate-200 hover:text-slate-900 hover:ring-slate-300",
      )}
    >
      {expanded ? "Ẩn" : "Xem"}
      <ChevronDown className={cn("size-3.5 transition", expanded && "rotate-180")} />
    </button>
  );
}

function ActionBadge({ action, className }) {
  const [label, tone] = actionBadge(action);
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}

/* =========================================================================
 * Trang Nhật ký thao tác
 * ========================================================================= */

export default function AuditLogPage() {
  const list = useAdminList("/audit-logs", {
    actor: "",
    q: "",
    actions: "",
    from: "",
    limit: 25,
  });
  const [actorName, setActorName] = useState("");
  const [text, setText] = useState("");
  const [period, setPeriod] = useState("");
  const [open, setOpen] = useState(null);
  const { setQuery } = list;

  // Chữ → tên người / tên nội dung / mã đơn (q) + các thao tác có nhãn khớp (actions)
  const onText = (v) => {
    setText(v);
    setQuery({ q: v, actions: matchActions(v).join(",") });
  };

  const pickPeriod = (p) => {
    setPeriod(p.key);
    setQuery({ from: p.from ? p.from() : "" });
  };
  const filtering = Boolean(text.trim() || period || list.query.actor);

  const actorCell = (x, id) =>
    id ? (
      <button
        type="button"
        title="Chỉ xem việc người này đã làm"
        onClick={() => {
          setActorName(x.actorName);
          setQuery({ actor: id });
        }}
        className="font-semibold text-brand-700 transition-colors hover:text-sun-600"
      >
        {x.actorName || "Không rõ"}
      </button>
    ) : (
      <span className="font-medium text-slate-500">{actorText(x)}</span>
    );

  return (
    <>
      <PageHeader
        title="Nhật ký thao tác"
        description="Ai đã đăng nhập, thêm, sửa, xoá gì và vào lúc nào. Nhật ký được giữ trong 365 ngày."
        actions={
          <Button
            variant="secondary"
            icon={RotateCw}
            onClick={() => list.refresh({ unit: "thao tác", fresh: "thao tác mới" })}
            loading={list.reloading}
          >
            Làm mới
          </Button>
        }
      />

      <Card bodyClassName="p-0">
        <div className="space-y-3 border-b border-slate-100 p-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox
              value={text}
              onChange={onText}
              placeholder="Tìm theo tên người, tên tour / bài viết, mã đơn, tên khách hoặc việc đã làm…"
              className="min-w-0 flex-1 basis-80"
            />
            <div
              role="tablist"
              aria-label="Khoảng thời gian"
              className="inline-flex shrink-0 rounded-xl bg-slate-100 p-1"
            >
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={period === p.key}
                  onClick={() => pickPeriod(p)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition",
                    period === p.key
                      ? "bg-white text-brand-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-slate-500">
            {list.query.actor && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                Chỉ xem: {actorName || "một người"}
                <button
                  type="button"
                  aria-label="Xem lại tất cả mọi người"
                  onClick={() => setQuery({ actor: "" })}
                  className="grid size-5 place-items-center rounded-full hover:bg-brand-100"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            )}
            {!list.query.actor && (
              <span className="text-xs text-slate-400">
                Mẹo: bấm vào tên một người để chỉ xem việc người đó đã làm; bấm tên tour, bài viết,
                đơn… để mở ra xem.
              </span>
            )}
            {list.meta && (
              <span className="ml-auto whitespace-nowrap">
                {filtering ? "Tìm thấy " : ""}
                <b className="font-semibold text-slate-700">{list.meta.total}</b> thao tác
              </span>
            )}
          </div>
        </div>

        {list.error && (
          <Notice tone="error" className="m-4">
            {list.error}
          </Notice>
        )}
        {list.loading && !list.items.length ? (
          <LoadingBlock />
        ) : !list.items.length ? (
          <EmptyState
            icon={History}
            title={filtering ? "Không tìm thấy thao tác nào" : "Chưa có thao tác nào"}
            text={filtering ? "Thử gõ từ khác hoặc chọn khoảng thời gian rộng hơn." : undefined}
          />
        ) : (
          <BusyArea busy={list.loading}>
            {/* Điện thoại: mỗi thao tác 1 thẻ */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {list.items.map((x) => {
                const id = actorId(x.actor);
                const expanded = open === x.id;
                return (
                  <li key={x.id} className={cn("px-4 py-3.5", expanded && "bg-slate-50/60")}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <ActionBadge action={x.action} />
                        <LogSentence
                          log={x}
                          className="block text-sm leading-relaxed break-words text-slate-700"
                        />
                        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                          {actorCell(x, id)}
                          <span className="text-slate-300">·</span>
                          <span className="tabular-nums">{fmtDateTime(x.createdAt)}</span>
                        </p>
                      </div>
                      <ToggleButton
                        expanded={expanded}
                        onClick={() => setOpen(expanded ? null : x.id)}
                      />
                    </div>
                    {expanded && (
                      <div className="mt-3">
                        <DetailPanel x={x} id={id} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Máy tính: bảng */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[15%]" />
                  <col className="w-[14%]" />
                  <col className="w-[47%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] tracking-wide text-slate-500 uppercase">
                    <th className="px-4 py-3 font-semibold">Thời gian</th>
                    <th className="px-4 py-3 font-semibold">Người làm</th>
                    <th className="px-4 py-3 font-semibold">Nội dung</th>
                    <th className="px-4 py-3 font-semibold">Thiết bị</th>
                    <th className="px-4 py-3 text-center font-semibold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.items.map((x) => {
                    const id = actorId(x.actor);
                    const dev = device(x.userAgent);
                    const expanded = open === x.id;
                    return (
                      <Fragment key={x.id}>
                        <tr className={cn("align-middle", expanded && "bg-slate-50/60")}>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                            {fmtDateTime(x.createdAt)}
                          </td>
                          <td className="truncate px-4 py-3">{actorCell(x, id)}</td>
                          <td className="px-4 py-3">
                            <span className="flex max-w-full items-baseline gap-3">
                              <ActionBadge action={x.action} className="shrink-0" />
                              <LogSentence
                                log={x}
                                className="line-clamp-2 min-w-0 leading-relaxed text-slate-700"
                              />
                            </span>
                          </td>
                          <td
                            className="truncate px-4 py-3 text-xs text-slate-500"
                            title={dev.full}
                          >
                            {dev.short}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <ToggleButton
                              expanded={expanded}
                              onClick={() => setOpen(expanded ? null : x.id)}
                            />
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={5} className="bg-slate-50/60 px-5 pt-1 pb-5">
                              <DetailPanel x={x} id={id} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </BusyArea>
        )}
        <Pagination meta={list.meta} onPage={(page) => setQuery({ page })} unit="thao tác" />
      </Card>
    </>
  );
}
