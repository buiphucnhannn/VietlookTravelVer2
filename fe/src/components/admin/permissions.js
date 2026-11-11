"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Eye, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "@/components/admin/Link";
import { ADMIN_BASE } from "@/config/urls.mjs";

/**
 * Phân quyền chi tiết theo từng mục (tab) của trang quản trị.
 * - Quản trị viên (admin): toàn quyền, gồm Cài đặt + Tài khoản quản trị (2 mục này không cấp cho nhân viên).
 * - Nhân viên (editor): chỉ các mục được cấp, mỗi mục 1 mức: Không / Xem / Sửa / Toàn quyền.
 * Giao diện chỉ ẩn / khoá nút cho dễ dùng — backend (be/src/constants/permissions.js) mới là nơi kiểm tra thật.
 * Đồng bộ danh sách mục với backend.
 */

const A = (p = "") => `${ADMIN_BASE}${p}`;

export const LEVELS = [
  { value: "none", label: "Không", long: "Không truy cập" },
  { value: "view", label: "Xem", long: "Chỉ xem" },
  { value: "edit", label: "Sửa", long: "Thêm & sửa" },
  { value: "full", label: "Toàn quyền", long: "Toàn quyền" },
];
const RANK = { none: 0, view: 1, edit: 2, full: 3 };
export const levelLabel = (l) => LEVELS.find((x) => x.value === l)?.long ?? "Không truy cập";

/**
 * Các mục cấp được, nhóm như thanh menu. hint: mục này là gì; edit / full: "Sửa" / "Toàn quyền" làm được gì thêm.
 * levels: mức cho phép (Nhật ký thao tác chỉ xem).
 */
const CONTENT_EDIT = "Thêm mới, sửa, ẩn/hiện, sắp xếp";
const CONTENT_FULL = "Như Sửa, thêm quyền xoá";
export const PERMISSION_GROUPS = [
  {
    group: "Khách hàng",
    items: [
      {
        key: "bookings",
        label: "Đơn đặt tour",
        hint: "Đơn khách đặt tour trên website",
        edit: "Đổi trạng thái, thanh toán, ghi chú, gửi lại email",
        full: "Như Sửa, thêm quyền xoá đơn",
        href: A("/bookings"),
      },
      {
        key: "requests",
        label: "Yêu cầu từ form",
        hint: "Liên hệ, tư vấn, thuê xe, visa… khách gửi",
        edit: "Đổi trạng thái, ghi chú, gửi lại email",
        full: "Như Sửa, thêm quyền xoá yêu cầu",
        href: A("/requests"),
      },
    ],
  },
  {
    group: "Tour",
    items: [
      { key: "tours", label: "Tour", hint: "Danh sách tour, lịch trình, giá", href: A("/tours") },
      {
        key: "destinations",
        label: "Điểm đến",
        hint: "Các tỉnh, thành phố trên website",
        href: A("/destinations"),
      },
      { key: "themes", label: "Chủ đề tour", hint: "Nhóm tour theo chủ đề", href: A("/themes") },
    ],
  },
  {
    group: "Dịch vụ",
    items: [
      { key: "cars", label: "Xe & khu vực", hint: "Bảng giá thuê xe", href: A("/cars") },
      {
        key: "visa",
        label: "Visa & fast-track",
        hint: "Loại visa, gói đón nhanh ở sân bay",
        href: A("/visa"),
      },
    ],
  },
  {
    group: "Nội dung",
    items: [
      { key: "home", label: "Trang chủ", hint: "Banner, các mục trên trang chủ", href: A("/home") },
      { key: "articles", label: "Bài viết", hint: "Cẩm nang du lịch", href: A("/articles") },
      {
        key: "taxonomy",
        label: "Chuyên mục & tác giả",
        hint: "Phân loại bài viết",
        href: A("/taxonomy"),
      },
      {
        key: "pages",
        label: "Giới thiệu & chính sách",
        hint: "Trang giới thiệu, điều khoản, chính sách",
        href: A("/pages"),
      },
    ],
  },
  {
    group: "Hệ thống",
    items: [
      {
        key: "audit",
        label: "Nhật ký thao tác",
        hint: "Ai đã làm gì, lúc nào — chỉ xem",
        href: A("/audit-log"),
        levels: ["none", "view"],
      },
    ],
  },
].map((g) => ({
  ...g,
  items: g.items.map((i) => ({
    levels: ["none", "view", "edit", "full"],
    edit: CONTENT_EDIT,
    full: CONTENT_FULL,
    ...i,
  })),
}));
export const PERMISSION_MODULES = PERMISSION_GROUPS.flatMap((g) => g.items);
export const MODULE_KEYS = PERMISSION_MODULES.map((m) => m.key);
const CONTENT_KEYS = MODULE_KEYS.filter((k) => !["bookings", "requests", "audit"].includes(k));

const clamp = (m, l) => {
  const allowed = PERMISSION_MODULES.find((x) => x.key === m)?.levels ?? [];
  return allowed.includes(l) ? l : RANK[l] > RANK[allowed.at(-1)] ? allowed.at(-1) : "none";
};
const fill = (fn) => Object.fromEntries(MODULE_KEYS.map((k) => [k, clamp(k, fn(k))]));

/** Mẫu quyền bấm 1 lần */
export const PRESETS = [
  {
    key: "sales",
    label: "Chăm sóc khách",
    hint: "Xử lý đơn & yêu cầu, xem tour và dịch vụ",
    value: () =>
      fill((k) =>
        k === "bookings" || k === "requests"
          ? "edit"
          : ["tours", "destinations", "themes", "cars", "visa"].includes(k)
            ? "view"
            : "none",
      ),
  },
  {
    key: "content",
    label: "Biên tập nội dung",
    hint: "Toàn quyền tour, dịch vụ, trang chủ, bài viết",
    value: () => fill((k) => (CONTENT_KEYS.includes(k) ? "full" : "none")),
  },
  {
    key: "viewer",
    label: "Chỉ xem tất cả",
    hint: "Xem mọi mục, không thay đổi được gì",
    value: () => fill(() => "view"),
  },
  { key: "none", label: "Bỏ hết", hint: "Không cấp mục nào", value: () => fill(() => "none") },
];
export const emptyPermissions = () => fill(() => "none");
export const normalizePermissions = (p) => fill((k) => p?.[k] ?? "none");

/** Mục (tab) của 1 đường dẫn trang quản trị: key quyền | "admin" (chỉ admin) | null (ai cũng vào được) */
export function moduleForPath(pathname = "") {
  const p = pathname.startsWith(ADMIN_BASE) ? pathname.slice(ADMIN_BASE.length) : pathname;
  if (/^\/(settings|users)(\/|$)/.test(p)) return "admin";
  const hit = PERMISSION_MODULES.find(
    (m) =>
      p === m.href.slice(ADMIN_BASE.length) || p.startsWith(`${m.href.slice(ADMIN_BASE.length)}/`),
  );
  return hit?.key ?? null;
}

export function canUser(user, module, level = "view") {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (module === "admin") return false;
  return (RANK[user.permissions?.[module]] ?? 0) >= RANK[level];
}

/** Các mục được cấp (≠ Không) → [{ key, label, level }] */
export const grantedModules = (permissions) =>
  PERMISSION_MODULES.filter((m) => (permissions?.[m.key] ?? "none") !== "none").map((m) => ({
    key: m.key,
    label: m.label,
    level: permissions[m.key],
  }));

/* ---------- Ngữ cảnh: tài khoản đang đăng nhập (AdminShell cung cấp) ---------- */

/*
 * Ngữ cảnh chứa 1 "kho" cố định (không đổi giá trị ngữ cảnh khi tài khoản tải xong), đọc qua useSyncExternalStore
 * với giá trị phía server = null. Lý do: trang CMS được dựng sẵn với tài khoản = null; /auth/me có thể trả về khi một
 * phần trang CHƯA hydrate xong — nếu đổi giá trị ngữ cảnh lúc đó, React hydrate phần còn lại với tài khoản đã có →
 * lệch nội dung server (lỗi hydration). Với kho này, phần đang hydrate luôn thấy null, xong rồi mới cập nhật.
 */
const CurrentUserContext = createContext(undefined);

function createUserStore() {
  let value = null;
  const subs = new Set();
  return {
    get: () => value,
    set: (next) => {
      if (next === value) return;
      value = next;
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export function CurrentUserProvider({ user, children }) {
  const [store] = useState(createUserStore);
  useEffect(() => store.set(user ?? null), [store, user]);
  return <CurrentUserContext.Provider value={store}>{children}</CurrentUserContext.Provider>;
}

const noSubscribe = () => () => {};
const getUndefined = () => undefined;
const getNull = () => null;
/** undefined = ngoài AdminShell (không có ngữ cảnh); null = đang tải; object = tài khoản */
function useUserFromContext() {
  const store = useContext(CurrentUserContext);
  return useSyncExternalStore(
    store ? store.subscribe : noSubscribe,
    store ? store.get : getUndefined,
    store ? getNull : getUndefined,
  );
}

/** Tài khoản đang đăng nhập (null khi đang tải) */
export const useCurrentUser = () => useUserFromContext() ?? null;

/** Mục của trang đang mở (AdminShell đặt theo đường dẫn) → usePermission() không cần truyền tên mục */
const ModuleScopeContext = createContext(null);
export function ModuleScope({ module, children }) {
  return <ModuleScopeContext.Provider value={module}>{children}</ModuleScopeContext.Provider>;
}

/**
 * Quyền của tài khoản đang đăng nhập ở 1 mục:
 *   const { canView, canEdit, canDelete } = usePermission("tours");
 *   const { canEdit } = usePermission();   // mục của trang đang mở
 * Ngoài AdminShell (không có ngữ cảnh) → cho phép tất cả (backend vẫn kiểm tra).
 */
export function usePermission(moduleKey) {
  const ctx = useUserFromContext();
  const scope = useContext(ModuleScopeContext);
  const mod = moduleKey ?? scope;
  return useMemo(() => {
    if (!mod) return { level: "full", canView: true, canEdit: true, canDelete: true };
    if (ctx === undefined) return { level: "full", canView: true, canEdit: true, canDelete: true };
    const level = !ctx
      ? "none"
      : ctx.role === "admin"
        ? "full"
        : (ctx.permissions?.[mod] ?? "none");
    return {
      level,
      canView: canUser(ctx, mod, "view"),
      canEdit: canUser(ctx, mod, "edit"),
      canDelete: canUser(ctx, mod, "full"),
    };
  }, [ctx, mod]);
}

/* ---------- Chế độ chỉ xem cho form ---------- */

// Vẫn bấm được: chuyển ngôn ngữ / tab, link, mở – đóng mục gập
const ALLOWED = '[role="tablist"],[role="tab"],[data-readonly-ok],a[href],[aria-expanded],summary';
const ACTIVE =
  'button,[role="button"],select,label,input[type="checkbox"],input[type="radio"],input[type="file"],input[type="range"],[draggable="true"]';
const NAV_KEYS = new Set([
  "Tab",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Escape",
  "Shift",
  "Control",
  "Meta",
  "Alt",
]);
const allowedTarget = (el) => !el?.closest || Boolean(el.closest(ALLOWED));
const stop = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

/**
 * Bọc form khi tài khoản chỉ được XEM: đọc, chọn chữ, chuyển ngôn ngữ được; không gõ / bấm nút / kéo thả / dán.
 * (Nút Lưu do trang tự ẩn; backend vẫn từ chối mọi thay đổi.)
 *   <ReadOnlyArea readOnly={!canEdit}>…form…</ReadOnlyArea>
 */
export function ReadOnlyArea({ readOnly, notice = true, className, children }) {
  if (!readOnly) return children;
  const onPointer = (e) => {
    const t = e.target;
    if (allowedTarget(t)) return;
    if (t.closest?.(ACTIVE)) stop(e);
  };
  const onKey = (e) => {
    if (allowedTarget(e.target) && (e.key === "Enter" || e.key === " ")) return;
    if (NAV_KEYS.has(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ["c", "a"].includes(e.key.toLowerCase())) return;
    stop(e);
  };
  return (
    <div
      data-readonly=""
      className={cn(
        className,
        // nút "Dịch tự động" (biểu tượng Languages) ẩn; các nút khác mờ đi (bấm cũng không có tác dụng)
        "[&_button:has(>.lucide-languages)]:hidden [&_button:not([role=tab]):not([aria-expanded]):not([data-readonly-ok])]:opacity-40",
      )}
      onPointerDownCapture={onPointer}
      onMouseDownCapture={onPointer}
      onClickCapture={onPointer}
      onKeyDownCapture={onKey}
      onBeforeInputCapture={stop}
      onPasteCapture={stop}
      onCutCapture={stop}
      onDropCapture={stop}
      onDragStartCapture={stop}
    >
      {notice && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] font-medium text-amber-900 ring-1 ring-amber-200">
          <Eye className="size-4 shrink-0 text-amber-600" />
          Bạn đang ở chế độ chỉ xem — không thay đổi được nội dung mục này.
        </p>
      )}
      {children}
    </div>
  );
}

/* ---------- Trang báo chưa được cấp quyền ---------- */

export function NoAccess() {
  return (
    <div className="mx-auto mt-10 flex max-w-lg flex-col items-center rounded-3xl bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80">
      <span className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
        <ShieldOff className="size-6" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-slate-900">Bạn chưa được cấp quyền vào mục này</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Nếu cần dùng mục này, hãy nhờ quản trị viên cấp quyền cho tài khoản của bạn.
      </p>
      <Link
        href={A()}
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800"
      >
        Về trang Tổng quan
      </Link>
    </div>
  );
}
