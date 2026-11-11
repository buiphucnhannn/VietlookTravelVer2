/**
 * Gọi backend (be/) qua /api/v1 cùng tên miền → cookie đăng nhập HttpOnly tự gửi kèm (dùng ở CMS).
 * - Luôn gửi header X-Requested-With: fetch (backend dùng để chống CSRF).
 * - 401 do hết phiên → tự làm mới token 1 lần rồi gửi lại; vẫn lỗi → về trang đăng nhập.
 *   api("/admin/tours?limit=20")                    → { success, data, meta }
 *   api("/auth/login", { method: "POST", body })
 */
import { ADMIN_BASE, ADMIN_LOGIN } from "@/config/urls.mjs";

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || "Không kết nối được, vui lòng thử lại");
    this.status = status;
    this.code = payload?.error?.code ?? (status === 0 ? "NETWORK_ERROR" : "ERROR");
    this.details = payload?.error?.details;
    this.retryAfter = payload?.error?.retryAfter;
  }
}

const SESSION_CODES = new Set([
  "TOKEN_EXPIRED",
  "UNAUTHENTICATED",
  "SESSION_EXPIRED",
  "TOKEN_REVOKED",
]);
const HEADERS = { Accept: "application/json", "X-Requested-With": "fetch" };

// Chỉ 1 request làm mới chạy cùng lúc (nhiều API cùng hết hạn → dùng chung 1 lần refresh)
let refreshing = null;
export const refreshSession = () =>
  (refreshing ??= fetch("/api/v1/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    headers: HEADERS,
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => (refreshing = null)));

/** Đang ở khu quản trị → chuyển về trang đăng nhập (kèm đường dẫn để quay lại) */
export function redirectToLogin() {
  if (typeof window === "undefined" || !window.location.pathname.startsWith(ADMIN_BASE))
    return false;
  // Form còn nội dung chưa lưu → mở đăng nhập ở tab mới, giữ nguyên trang (không mất bài đang soạn)
  if (window.__vlHasUnsaved?.()) {
    window.open(`${ADMIN_LOGIN}?expired=1`, "_blank", "noopener");
    return false;
  }
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`${ADMIN_LOGIN}?next=${next}&expired=1`);
  return true;
}

/** API báo không đủ quyền (403) → khung CMS tải lại quyền của tài khoản (admin có thể vừa đổi quyền) */
export const FORBIDDEN_EVENT = "vl-admin-forbidden";

/** Request bị huỷ có chủ đích (AbortController — vd. đã có lượt tìm kiếm mới hơn) → không báo lỗi */
export const isAbort = (err) => err?.name === "AbortError";

export async function api(
  path,
  { body, headers, retry = true, timeout = 60_000, signal, ...init } = {},
) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const timer = AbortSignal.timeout(timeout);
  let res;
  try {
    res = await fetch(`/api/v1${path}`, {
      credentials: "same-origin",
      ...init,
      signal: signal && AbortSignal.any ? AbortSignal.any([signal, timer]) : (signal ?? timer),
      headers: {
        ...HEADERS,
        ...(body !== undefined && !isForm && { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined || isForm ? body : JSON.stringify(body),
    });
  } catch (err) {
    if (signal?.aborted) throw err; // huỷ có chủ đích → nơi gọi bỏ qua (isAbort)
    if (err?.name === "TimeoutError" || timer.aborted)
      throw new ApiError(0, {
        error: { code: "TIMEOUT", message: "Hệ thống phản hồi chậm, vui lòng thử lại" },
      });
    throw new ApiError(0, null);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (signal?.aborted) throw new DOMException("Đã huỷ", "AbortError");
  // Lỗi 5xx KHÔNG phải JSON của backend = Next không chuyển tiếp được (backend chưa chạy / đang khởi động lại)
  if (res.status >= 500 && !data?.error)
    throw new ApiError(res.status, {
      error: {
        code: "BACKEND_UNREACHABLE",
        message: "Hệ thống đang khởi động lại. Vui lòng thử lại sau ít giây.",
      },
    });

  const isAuthCall = path.startsWith("/auth/");
  if (res.status === 401 && !isAuthCall && retry && SESSION_CODES.has(data?.error?.code)) {
    if (await refreshSession())
      return api(path, { body, headers, retry: false, timeout, signal, ...init });
    if (redirectToLogin()) return new Promise(() => {}); // đang chuyển trang → không báo lỗi thừa
    throw new ApiError(401, {
      error: {
        code: "SESSION_EXPIRED",
        message:
          "Phiên đăng nhập đã hết hạn. Nội dung đang soạn vẫn còn ở tab này — đăng nhập lại ở tab mới rồi bấm Lưu lần nữa.",
      },
    });
  }
  if (res.status === 403 && typeof window !== "undefined")
    window.dispatchEvent(new Event(FORBIDDEN_EVENT));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

/** Thông báo lỗi dễ hiểu cho người quản trị (kèm lỗi từng ô nếu có) */
export function errorMessage(err) {
  if (!(err instanceof ApiError))
    // lỗi tự viết bằng tiếng Việt trong trang quản trị (vd. "Chép video quá lâu…") thì giữ nguyên
    return /[À-ỹđĐ]/.test(err?.message ?? "") ? err.message : "Đã có lỗi xảy ra, vui lòng thử lại.";
  if (err.code === "NETWORK_ERROR")
    return "Không kết nối được. Vui lòng kiểm tra mạng rồi thử lại.";
  if (err.status === 403 && err.code === "FORBIDDEN")
    return "Bạn chưa có quyền thực hiện thao tác này";
  if (err.status === 429)
    return `Thao tác quá nhanh, vui lòng thử lại sau ${Math.ceil((err.retryAfter ?? 60) / 60)} phút.`;
  if (err.status >= 500 && err.code === "INTERNAL_ERROR")
    return "Hệ thống đang bận, vui lòng thử lại sau ít phút.";
  if (err.status === 422) {
    // Lời nhắc tiếng Việt của từng ô thì giữ; lời nhắc kỹ thuật (tiếng Anh, tên trường) → câu chung dễ hiểu
    const first = err.details?.find((d) => /[À-ỹđĐ]/.test(d.message ?? ""))?.message;
    return first || "Có thông tin chưa hợp lệ — vui lòng kiểm tra lại các ô đã nhập.";
  }
  return err.message;
}

/** Lỗi có thể tự hết khi thử lại (mất mạng, hệ thống chậm / đang khởi động lại) → nên kèm nút "Thử lại" */
export const isRetryable = (err) =>
  err instanceof ApiError && (err.status === 0 || err.status >= 500);
