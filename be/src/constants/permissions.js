import { ROLES } from "./roles.js";

/**
 * Phân quyền chi tiết cho tài khoản "Nhân viên" (role editor). Admin luôn toàn quyền.
 *
 * Mỗi mục (= 1 tab trong trang quản trị) có 1 mức:
 *   none  Không truy cập
 *   view  Chỉ xem
 *   edit  Thêm & sửa (gồm ẩn/hiện, đổi thứ tự, tải ảnh, dịch tự động; với đơn: đổi trạng thái, ghi chú, gửi lại email)
 *   full  Toàn quyền (thêm cả xoá)
 *
 * Cài đặt + Tài khoản quản trị KHÔNG cấp được — luôn chỉ admin.
 * Đồng bộ danh sách mục với fe/src/components/admin/permissions.js.
 */
export const LEVELS = Object.freeze(["none", "view", "edit", "full"]);
const RANK = Object.freeze({ none: 0, view: 1, edit: 2, full: 3 });

/** Mục → các mức được phép (Nhật ký thao tác chỉ xem) */
export const MODULES = Object.freeze({
  bookings: LEVELS,
  requests: LEVELS,
  tours: LEVELS,
  destinations: LEVELS,
  themes: LEVELS,
  cars: LEVELS,
  visa: LEVELS,
  home: LEVELS,
  articles: LEVELS,
  taxonomy: LEVELS,
  pages: LEVELS,
  reviews: LEVELS,
  audit: Object.freeze(["none", "view"]),
});
export const MODULE_KEYS = Object.freeze(Object.keys(MODULES));

/** Mục nội dung website (tải ảnh / dịch tự động / chép video cần quyền sửa ít nhất 1 mục trong số này) */
export const CONTENT_MODULES = Object.freeze([
  "tours",
  "destinations",
  "themes",
  "cars",
  "visa",
  "home",
  "articles",
  "taxonomy",
  "pages",
  "reviews",
]);

/** Tên tiếng Việt (nhật ký thao tác) */
export const MODULE_LABELS = Object.freeze({
  bookings: "Đơn đặt tour",
  requests: "Yêu cầu từ form",
  tours: "Tour",
  destinations: "Điểm đến",
  themes: "Chủ đề tour",
  cars: "Xe & khu vực",
  visa: "Visa & fast-track",
  home: "Trang chủ",
  articles: "Bài viết",
  taxonomy: "Chuyên mục & tác giả",
  pages: "Giới thiệu & chính sách",
  reviews: "Đánh giá",
  audit: "Nhật ký thao tác",
});
export const LEVEL_LABELS = Object.freeze({
  none: "Không truy cập",
  view: "Chỉ xem",
  edit: "Thêm & sửa",
  full: "Toàn quyền",
});

/**
 * Danh sách (chỉ GET danh sách, để chọn trong ô "chọn…") của 1 mục còn được đọc bởi các mục dùng nó:
 * vd. sửa Tour cần danh sách Điểm đến / Chủ đề; Trang chủ chọn tour nổi bật; Bài viết chọn chuyên mục.
 */
export const OPTION_READERS = Object.freeze({
  destinations: ["tours", "articles", "home"],
  themes: ["tours", "home"],
  tours: ["home"],
  taxonomy: ["articles"],
});

const fill = (level) => Object.fromEntries(MODULE_KEYS.map((m) => [m, clampLevel(m, level)]));

function clampLevel(module, level) {
  const allowed = MODULES[module];
  if (!allowed) return "none";
  if (allowed.includes(level)) return level;
  // mức cao hơn mức tối đa của mục (vd. "full" cho Nhật ký) → mức cao nhất cho phép
  return RANK[level] > RANK[allowed.at(-1)] ? allowed.at(-1) : "none";
}

/** Tài khoản nhân viên cũ (tạo trước khi có phân quyền chi tiết): giữ đúng quyền như trước */
export const LEGACY_EDITOR_PERMISSIONS = Object.freeze({
  ...fill("full"),
  bookings: "edit",
  requests: "edit",
  audit: "none",
});
export const ADMIN_PERMISSIONS = Object.freeze(fill("full"));
export const NO_PERMISSIONS = Object.freeze(fill("none"));

/** Chuẩn hoá dữ liệu quyền đã lưu: đủ mọi mục, mức hợp lệ, mục lạ bị bỏ */
export function normalizePermissions(raw) {
  const out = {};
  for (const m of MODULE_KEYS) out[m] = clampLevel(m, raw?.[m] ?? "none");
  return out;
}

/** Quyền thực tế của 1 tài khoản (admin → toàn quyền; nhân viên chưa từng phân quyền → quyền cũ) */
export function effectivePermissions(user) {
  if (!user) return { ...NO_PERMISSIONS };
  if (user.role === ROLES.ADMIN) return { ...ADMIN_PERMISSIONS };
  const stored = user.permissions;
  const configured =
    stored && typeof stored === "object" && MODULE_KEYS.some((m) => stored[m] != null);
  return configured ? normalizePermissions(stored) : { ...LEGACY_EDITOR_PERMISSIONS };
}

/** user có ít nhất mức `level` ở mục `module` không (req.user đã mang quyền thực tế) */
export function can(user, module, level = "view") {
  if (!user || !MODULES[module]) return false;
  if (user.role === ROLES.ADMIN) return true;
  const have = effectivePermissions(user)[module];
  return (RANK[have] ?? 0) >= (RANK[level] ?? 99);
}

/** Có mức `level` ở ít nhất 1 mục trong danh sách */
export const canAny = (user, modules, level = "view") => modules.some((m) => can(user, m, level));

/** Danh sách thay đổi dễ đọc cho nhật ký: ["Tour: Không truy cập → Chỉ xem", …] */
export function describePermissionChanges(before, after) {
  return MODULE_KEYS.filter((m) => before[m] !== after[m]).map(
    (m) => `${MODULE_LABELS[m]}: ${LEVEL_LABELS[before[m]]} → ${LEVEL_LABELS[after[m]]}`,
  );
}
