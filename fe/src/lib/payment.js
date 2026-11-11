/**
 * Thanh toán online 9Pay — phần chạy trên trình duyệt (bước thanh toán + trang cảm ơn).
 * payToken (máy chủ cấp khi gửi đơn, hết hạn sau vài giờ) lưu trong sessionStorage của TAB này
 * → khách quay về từ 9Pay (thất bại / huỷ) có thể bấm "Thử thanh toán lại" mà không phải đặt lại.
 */

const KEY = (code) => `vl-pay:${code}`;

export function savePayOffer(code, offer) {
  try {
    sessionStorage.setItem(KEY(code), JSON.stringify(offer));
  } catch {}
}

export function readPayOffer(code) {
  try {
    return JSON.parse(sessionStorage.getItem(KEY(code)) || "null");
  } catch {
    return null;
  }
}

/** 20656000 → "20.656.000 ₫" */
export const formatVND = (n) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(n) || 0)} ₫`;

/** 25820 → "25.820" */
export const formatRate = (n) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(n) || 0);

/** "{a} … {b}" → điền giá trị */
export const fill = (s, vars) =>
  String(s ?? "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`).toString());

/**
 * Xin link cổng 9Pay cho đơn `code` → { url, amountVnd, … }.
 * Lỗi: Error có .code (PAY_TOKEN_INVALID / ALREADY_PAID / PAYMENT_DISABLED / …).
 */
export async function startPayment(code, token, lang) {
  const res = await fetch(`/api/v1/payments/${encodeURIComponent(code)}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "fetch",
    },
    body: JSON.stringify({ token, lang }),
    signal: AbortSignal.timeout(30_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.url)
    throw Object.assign(new Error(json?.error?.message || "error"), {
      code: json?.error?.code || "ERROR",
    });
  return json.data;
}

/** Mã lỗi → câu cho khách (labels = dict.payment) */
export const payErrorText = (err, p) =>
  err?.code === "PAY_TOKEN_INVALID"
    ? p.errorExpired
    : err?.code === "ALREADY_PAID"
      ? p.errorPaid
      : p.errorStart;
