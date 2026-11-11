import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * 9Pay — cổng thanh toán (mô hình Redirect). Hàm thuần, không đọc DB / env → dễ test.
 *
 * Nguồn (đã đối chiếu 11/2026):
 *  - Quy tắc tích hợp: https://developers.9pay.vn/danh-sach-api/quy-tac-tich-hop
 *  - Redirect thẻ quốc tế: https://developers.9pay.vn/thanh-toan-the-quoc-te/redirect
 *  - Mã trạng thái: https://developers.9pay.vn/quy-dinh/thong-tin-ma-loi
 *  - Mã mẫu chính thức: https://gitlab.com/9pay-sample/sample-php (MessageBuilder.php, index.php, result.php)
 *    và https://gitlab.com/9pay-sample/sample-javascript (link.js, inquire.js, result.js)
 *
 * Tạo link thanh toán:
 *   message   = "POST\n" + endpoint + "/payments/create\n" + time + "\n" + <tham số sắp theo tên, a=1&b=2 (urlencode kiểu PHP)>
 *   signature = base64(HMAC-SHA256(message, secretKey))
 *   url       = endpoint + "/portal?baseEncode=" + base64(JSON tham số) + "&signature=" + signature
 * Kết quả (return_url / IPN): { result: base64(JSON), checksum: UPPER(SHA256(result + checksumKey)), version }
 *
 * TODO(9Pay): khi có tài khoản sandbox, chạy thử 1 giao dịch thật để xác nhận:
 *   - invoice_no chấp nhận dấu "-" (mã đơn dạng VL-BK261111-AB2C-1),
 *   - nội dung IPN cần phản hồi (hiện trả HTTP 200 JSON),
 *   - `back_url` (nút quay lại trên cổng) — có trong mã mẫu PHP, không có trong bảng tham số.
 */

export const NINEPAY_STATUS = Object.freeze({
  PROCESSING: 2,
  REVIEW: 3, // chờ kiểm tra (nghi vi phạm chính sách rủi ro)
  CARD_LINKED: 4,
  SUCCESS: 5,
  FAILED: 6,
  CANCELLED: 8,
  REJECTED: 9,
  EXPIRED: 15,
  RECEIVED: 16, // đã nhận tiền (chuyển khoản)
});

/** Trạng thái 9Pay → trạng thái lượt thanh toán của mình */
export function mapStatus(status) {
  const s = Number(status);
  if (s === NINEPAY_STATUS.SUCCESS || s === NINEPAY_STATUS.RECEIVED) return "paid";
  if (s === NINEPAY_STATUS.CANCELLED) return "cancelled";
  if ([NINEPAY_STATUS.FAILED, NINEPAY_STATUS.REJECTED, NINEPAY_STATUS.EXPIRED].includes(s))
    return "failed";
  return "pending";
}

/** urlencode() của PHP: giữ a-z A-Z 0-9 - _ . ; khoảng trắng → "+"; còn lại %XX (UTF-8) */
export const phpUrlencode = (v) =>
  encodeURIComponent(String(v))
    .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");

/** Tham số sắp xếp theo tên (ksort) → "a=1&b=2"; bỏ giá trị rỗng */
export function canonicalParams(params = {}) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${phpUrlencode(k)}=${phpUrlencode(params[k])}`)
    .join("&");
}

/** Chuỗi ký: method \n uri \n time [\n tham số] */
export function buildMessage({ method, uri, time, params }) {
  const query = canonicalParams(params);
  return [method, uri, String(time), ...(query ? [query] : [])].join("\n");
}

export const sign = (message, secretKey) =>
  createHmac("sha256", String(secretKey)).update(message, "utf8").digest("base64");

/** Header xác thực cho API máy chủ ↔ máy chủ (tra cứu, hoàn tiền) */
export const authorizationHeader = (merchantKey, signature) =>
  `Signature Algorithm=HS256,Credential=${merchantKey},SignedHeaders=,Signature=${signature}`;

const now = () => Math.floor(Date.now() / 1000);

/**
 * Link chuyển khách sang cổng 9Pay.
 * amount: số nguyên theo `currency` (VND: 10.000 – 200.000.000). lang: "vi" | "en".
 */
export function buildPaymentUrl({
  creds,
  endpoint,
  invoiceNo,
  amount,
  currency = "VND",
  description,
  returnUrl,
  backUrl,
  lang,
  method,
  time = now(),
}) {
  if (!creds?.merchantKey || !creds?.secretKey)
    throw new Error("9Pay: thiếu merchantKey / secretKey");
  const base = String(endpoint).replace(/\/+$/, "");
  const params = {
    merchantKey: creds.merchantKey,
    time,
    invoice_no: invoiceNo,
    amount,
    description,
    return_url: returnUrl,
    ...(backUrl && { back_url: backUrl }),
    ...(lang && { lang: lang === "vi" ? "vi" : "en" }),
    ...(currency && currency !== "VND" && { currency }),
    ...(method && { method }),
  };
  const message = buildMessage({ method: "POST", uri: `${base}/payments/create`, time, params });
  const signature = sign(message, creds.secretKey);
  const baseEncode = Buffer.from(JSON.stringify(params), "utf8").toString("base64");
  const url = `${base}/portal?${new URLSearchParams({ baseEncode, signature })}`;
  return { url, params, message, signature, baseEncode };
}

/** Giải mã base64 (nhận cả base64url — 9Pay trả result có "_" / "-") */
export const decodeBase64Json = (s) =>
  JSON.parse(
    Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
  );

export const checksumOf = (result, checksumKey) =>
  createHash("sha256").update(`${result}${checksumKey}`, "utf8").digest("hex").toUpperCase();

/**
 * Kiểm tra kết quả 9Pay gửi về (return_url / IPN). Sai checksum hoặc dữ liệu hỏng → null.
 * Đúng → nội dung đã giải mã { payment_no, invoice_no, amount, currency, status, method, … }.
 */
export function verifyResult({ result, checksum, checksumKey }) {
  if (!result || !checksum || !checksumKey) return null;
  const expected = Buffer.from(checksumOf(result, checksumKey));
  const got = Buffer.from(String(checksum).trim().toUpperCase());
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const payload = decodeBase64Json(result);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

/** Tạo bộ { result, checksum } như 9Pay (dùng cho cổng giả lập + test) */
export function encodeResult(payload, checksumKey) {
  const result = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  return { result, checksum: checksumOf(result, checksumKey), version: "v1" };
}

/**
 * Tra cứu trạng thái giao dịch: GET {endpoint}/v2/payments/{invoice_no}/inquire
 * (dùng khi không nhận được IPN ~20 phút sau khi tạo link — theo hướng dẫn của 9Pay).
 */
export async function queryTransaction({
  creds,
  endpoint,
  invoiceNo,
  time = now(),
  fetchImpl = globalThis.fetch,
}) {
  const uri = `${String(endpoint).replace(/\/+$/, "")}/v2/payments/${encodeURIComponent(invoiceNo)}/inquire`;
  const signature = sign(buildMessage({ method: "GET", uri, time }), creds.secretKey);
  const res = await fetchImpl(uri, {
    headers: {
      Date: String(time),
      Authorization: authorizationHeader(creds.merchantKey, signature),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(`9Pay inquire HTTP ${res.status}`);
  return data;
}
