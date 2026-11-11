import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { paymentCompanyEmail, paymentCustomerEmail } from "../../emails/payment.js";
import { counterRepository, enquiryRepository } from "../../repositories/content.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import { auditService } from "../audit.service.js";
import { mailService } from "../mail.service.js";
import { settingsService } from "../settings.service.js";
import { fxService, usdToVnd } from "./fx.service.js";
import { buildPaymentUrl, mapStatus, verifyResult } from "./ninepay.adapter.js";

/**
 * Thanh toán online qua 9Pay cho đơn đặt tour.
 *
 * - Bật khi admin bật 9Pay VÀ nhập đủ 3 mã (Cài đặt → Thanh toán 9Pay). Mã đọc lại MỖI lần dùng →
 *   đổi tài khoản nhận tiền áp dụng ngay, mã cũ ngừng được dùng. Tắt → đặt tour như cũ, không có bước thanh toán.
 * - Chỉ đơn ĐẶT TOUR có giá tạm tính > 0 mới thanh toán được (giá do MÁY CHỦ tính từ bảng giá CMS lúc nhận đơn,
 *   không bao giờ lấy số trình duyệt gửi). Các form khác (xe, visa, thiết kế tour…) cần báo giá trước → chưa thanh toán.
 * - Tiền: giá tour (USD) × tỷ lệ cọc (CMS, mặc định 100%) → đổi sang VND theo tỷ giá tự động (fx.service),
 *   làm tròn lên 1.000đ. Đã cọc → lượt sau trả phần còn lại.
 * - Mỗi lần bấm "Thanh toán" = 1 lượt (payments[]), mã hoá đơn <mã đơn>-<số lượt>.
 * - Kết quả từ 9Pay (trình duyệt quay về + IPN máy chủ ↔ máy chủ): kiểm checksum, khớp mã hoá đơn + số tiền,
 *   ghi nhận NGUYÊN TỬ đúng 1 lần → nhận 2 lần cũng không gửi email / ghi nhật ký trùng.
 * - Chặn người lạ tạo link cho đơn của người khác: cần payToken (ký HMAC, hết hạn sau 6 giờ) — chỉ trả cho
 *   trình duyệt vừa gửi đơn.
 */

const TOKEN_TTL_S = 6 * 3600;
const MIN_VND = 10_000; // giới hạn của cổng 9Pay
const MAX_VND = 200_000_000;

/* ---------- Chế độ giả lập (CHỈ máy dev) ---------- */

export const FAKE_CREDS = Object.freeze({
  merchantKey: "FAKE9PAY",
  secretKey: "fake-9pay-secret-key",
  checksumKey: "fake-9pay-checksum-key",
});
// Bật bằng NINEPAY_FAKE=true, hoặc (máy dev, không cần khởi động lại) tạo file be/.ninepay-fake — xoá file để tắt.
export const FAKE_FLAG_FILE = ".ninepay-fake";
export const isFake = () =>
  env.payment.fake || (env.nodeEnv === "development" && existsSync(FAKE_FLAG_FILE));

/* ---------- payToken ---------- */

const tokenKey = () =>
  createHmac("sha256", env.dataEncryptionKey).update("vietlook-pay-token-v1").digest();

export function signPayToken(code, ttl = TOKEN_TTL_S) {
  const body = Buffer.from(
    JSON.stringify({ c: code, e: Math.floor(Date.now() / 1000) + ttl }),
  ).toString("base64url");
  const sig = createHmac("sha256", tokenKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPayToken(token, code) {
  const [body, sig] = String(token ?? "").split(".");
  if (!body || !sig) return false;
  const want = Buffer.from(createHmac("sha256", tokenKey()).update(body).digest("base64url"));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return false;
  try {
    const { c, e } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return c === code && e > Date.now() / 1000;
  } catch {
    return false;
  }
}

/* ---------- Tính tiền ---------- */

const round2 = (n) => Math.round(n * 100) / 100;
const paidUsd = (e) =>
  (e.payments ?? [])
    .filter((x) => x.status === "paid")
    .reduce((s, x) => s + (Number(x.amountUsd) || 0), 0);

/** Đơn thanh toán online được không: đặt tour, có giá tạm tính > 0, chưa trả đủ, chưa huỷ */
export function payableReason(e) {
  if (!e || e.type !== "booking") return "NOT_BOOKING";
  if (!(Number(e.estimate?.total) > 0)) return "NO_PRICE";
  if (e.status === "cancelled") return "CANCELLED";
  if (e.paymentStatus === "paid") return "ALREADY_PAID";
  return null;
}

/**
 * Số tiền phải trả lượt này (USD): chưa trả gì → tổng × % cọc; đã cọc → phần còn lại.
 * kind: "full" | "deposit" | "balance"
 */
export function amountDue(e, depositPercent = 100) {
  const total = Number(e.estimate?.total) || 0;
  const paid = paidUsd(e);
  if (paid > 0) return { usd: round2(Math.max(0, total - paid)), kind: "balance" };
  const pct = Math.min(100, Math.max(10, Number(depositPercent) || 100));
  return pct >= 100
    ? { usd: round2(total), kind: "full" }
    : { usd: round2((total * pct) / 100), kind: "deposit" };
}

/** Báo giá thanh toán (đưa cho website hiển thị) */
export async function quote(e, depositPercent) {
  const { usd, kind } = amountDue(e, depositPercent);
  const fx = await fxService.getRate();
  return {
    kind,
    depositPercent,
    totalUsd: Number(e.estimate?.total) || 0,
    amountUsd: usd,
    amountVnd: usdToVnd(usd, fx.rate),
    rate: fx.rate,
    rateSource: fx.source,
    rateAt: fx.fetchedAt,
  };
}

/* ---------- Ghi nhật ký (không có request của nhân viên) ---------- */

const systemReq = (ip = "") => ({ ip, get: () => "", log: logger });

async function notify(enquiry, attempt) {
  try {
    const recipients = await settingsService.recipients();
    const notif = await settingsService.getNotifications();
    await mailService.send({
      to: recipients,
      replyTo: enquiry.email || undefined,
      ...paymentCompanyEmail(enquiry, attempt),
    });
    if (enquiry.email && notif.sendCustomerConfirmation)
      await mailService.send({
        to: enquiry.email,
        replyTo: notif.replyTo || recipients[0],
        ...paymentCustomerEmail(enquiry, attempt),
      });
  } catch (err) {
    logger.error({ err, code: enquiry.code }, "[payment] lỗi gửi email thanh toán");
  }
}

/* ---------- Service ---------- */

export const paymentService = {
  /** Cấu hình dùng ngay lúc này (đọc lại DB mỗi lần) */
  async config() {
    const s = await settingsService.paymentCredentials();
    if (isFake()) {
      // file cờ giả lập có thể ghi 1 số (vd. "30") → thử đặt cọc mà không đụng cài đặt thật
      let pct = s.depositPercent;
      try {
        const n = Number(readFileSync(FAKE_FLAG_FILE, "utf8").trim());
        if (Number.isInteger(n) && n >= 10 && n <= 100) pct = n;
      } catch {
        /* NINEPAY_FAKE=true, không có file */
      }
      return { enabled: true, fake: true, creds: FAKE_CREDS, depositPercent: pct };
    }
    const ready = Boolean(s.enabled && s.merchantKey && s.secretKey && s.checksumKey);
    return {
      enabled: ready,
      fake: false,
      creds: { merchantKey: s.merchantKey, secretKey: s.secretKey, checksumKey: s.checksumKey },
      depositPercent: s.depositPercent,
    };
  },

  /** Bật VÀ đủ 3 mã */
  async isEnabled() {
    return (await this.config()).enabled;
  },

  /** Cho website (không có mã bí mật) */
  async publicConfig() {
    const cfg = await this.config();
    if (!cfg.enabled) return { enabled: false };
    const fx = await fxService.getRate();
    return {
      enabled: true,
      provider: "9pay",
      depositPercent: cfg.depositPercent,
      currency: "VND",
      priceCurrency: "USD",
      rate: fx.rate,
      rateAt: fx.fetchedAt,
      methods: ["ATM", "VISA", "MASTERCARD", "JCB"],
    };
  },

  /**
   * Gắn vào kết quả gửi đơn (POST /enquiries): đơn thanh toán được → payToken + số tiền dự kiến.
   * Lỗi bất kỳ → không có bước thanh toán (đơn vẫn lưu, khách vẫn tới trang cảm ơn).
   */
  async offerFor(enquiry) {
    try {
      const cfg = await this.config();
      if (!cfg.enabled || payableReason(enquiry)) return null;
      const q = await quote(enquiry, cfg.depositPercent);
      if (q.amountVnd < MIN_VND || q.amountVnd > MAX_VND) return null;
      return { token: signPayToken(enquiry.code), ...q };
    } catch (err) {
      logger.warn({ err, code: enquiry?.code }, "[payment] không tạo được bước thanh toán");
      return null;
    }
  },

  /**
   * Tạo link sang cổng 9Pay cho đơn `code`.
   * siteBase: địa chỉ website khách đang mở (9Pay đưa khách về {siteBase}/api/v1/payments/return).
   */
  async createForEnquiry(code, { token, siteBase, lang } = {}) {
    if (!verifyPayToken(token, code))
      throw ApiError.forbidden("Phiên thanh toán đã hết hạn", "PAY_TOKEN_INVALID");
    const cfg = await this.config();
    if (!cfg.enabled)
      throw new ApiError(409, "Thanh toán online đang tắt", { code: "PAYMENT_DISABLED" });
    const e = await enquiryRepository.findByCode(code);
    if (!e) throw ApiError.notFound("Không tìm thấy đơn");
    const reason = payableReason(e);
    if (reason) throw new ApiError(409, "Đơn này không cần thanh toán online", { code: reason });

    const q = await quote(e, cfg.depositPercent);
    if (q.amountVnd < MIN_VND || q.amountVnd > MAX_VND)
      throw new ApiError(409, "Số tiền ngoài hạn mức thanh toán online", {
        code: "AMOUNT_OUT_OF_RANGE",
      });

    const n = await counterRepository.next(`pay-${code}`);
    const invoiceNo = `${code}-${n}`;
    const base = String(siteBase || env.siteUrl).replace(/\/+$/, "");
    const custLang = ["en", "zh", "vi"].includes(lang) ? lang : e.lang;
    const prefix = custLang && custLang !== "en" ? `/${custLang}` : "";
    const endpoint = cfg.fake ? `${base}/api/v1/payments/fake` : env.payment.endpoint;
    const { url } = buildPaymentUrl({
      creds: cfg.creds,
      endpoint,
      invoiceNo,
      amount: q.amountVnd,
      currency: "VND",
      description: `Vietlook Travel ${code}`, // chữ không dấu → an toàn khi ký
      returnUrl: `${base}/api/v1/payments/return`,
      backUrl: `${base}${prefix}/thank-you?code=${encodeURIComponent(code)}&type=booking&payment=cancelled`,
      lang: custLang === "vi" ? "vi" : "en",
    });
    await enquiryRepository.pushPayment(e._id, {
      invoiceNo,
      provider: "9pay",
      kind: q.kind,
      amount: q.amountVnd,
      currency: "VND",
      amountUsd: q.amountUsd,
      rate: q.rate,
      rateSource: q.rateSource,
      status: "pending",
    });
    logger.info(
      { event: "payment.start", code, invoiceNo, amount: q.amountVnd },
      "[payment] start",
    );
    return { url, invoiceNo, ...q };
  },

  /**
   * Xử lý kết quả 9Pay gửi về (return_url hoặc IPN). Trả { code, lang, outcome } —
   * outcome: "success" | "failed" | "cancelled" | "pending".
   * Lỗi: BAD_CHECKSUM (400), NOT_FOUND (404), AMOUNT_MISMATCH (400).
   */
  async handleResult({ result, checksum }, { source = "return", ip = "" } = {}) {
    const cfg = await this.config();
    const payload = verifyResult({ result, checksum, checksumKey: cfg.creds.checksumKey });
    if (!payload) {
      auditService.security(systemReq(ip), "security.payment_bad_checksum", { source });
      throw new ApiError(400, "Kết quả thanh toán không hợp lệ", { code: "BAD_CHECKSUM" });
    }
    const invoiceNo = String(payload.invoice_no ?? "");
    const e = invoiceNo ? await enquiryRepository.findByInvoice(invoiceNo) : null;
    const attempt = e?.payments?.find((x) => x.invoiceNo === invoiceNo);
    if (!attempt) throw ApiError.notFound("Không tìm thấy giao dịch");

    const status = mapStatus(payload.status);
    const base = { code: e.code, lang: e.lang, invoiceNo, amount: attempt.amount };
    if (attempt.status === "paid") return { ...base, outcome: "success", changed: false };

    if (status === "paid") {
      const amount = Number(payload.amount);
      const currency = String(payload.currency || "VND").toUpperCase();
      if (amount !== attempt.amount || currency !== attempt.currency) {
        logger.error(
          {
            event: "payment.amount_mismatch",
            code: e.code,
            invoiceNo,
            amount,
            currency,
            expected: attempt.amount,
          },
          "[payment] số tiền không khớp",
        );
        auditService.security(systemReq(ip), "security.payment_amount_mismatch", { invoiceNo });
        throw new ApiError(400, "Số tiền không khớp", { code: "AMOUNT_MISMATCH" });
      }
      const fields = {
        status: "paid",
        paidAt: new Date(),
        transactionId: String(payload.payment_no ?? ""),
        method: String(payload.method ?? "").slice(0, 40),
        failureReason: "",
        raw: {
          payment_no: payload.payment_no ?? null,
          status: payload.status,
          amount,
          currency,
          method: payload.method ?? null,
          card_brand: payload.card_brand ?? null,
          created_at: payload.created_at ?? null,
          source,
        },
      };
      const changed = await enquiryRepository.updatePayment(e._id, invoiceNo, fields, [
        "pending",
        "failed",
        "cancelled",
      ]);
      if (!changed) return { ...base, outcome: "success", changed: false };

      const fresh = await enquiryRepository.findById(e._id);
      const total = Number(fresh.estimate?.total) || 0;
      const nextStatus = paidUsd(fresh) + 0.01 >= total ? "paid" : "deposit";
      const doc = await enquiryRepository.setPaymentStatus(e._id, nextStatus);
      const paidAttempt = doc.payments.find((x) => x.invoiceNo === invoiceNo);
      auditService.record(systemReq(ip), "enquiry.payment", {
        target: { type: "enquiry", id: e.code },
        meta: {
          name: e.code,
          customer: e.name,
          kind: "bookings",
          amount: attempt.amount,
          currency: attempt.currency,
          paymentStatus: nextStatus,
          invoiceNo,
        },
      });
      notify(doc, paidAttempt); // nền — không chặn phản hồi cho 9Pay / khách
      return { ...base, outcome: "success", changed: true };
    }

    if (status === "failed" || status === "cancelled") {
      await enquiryRepository.updatePayment(
        e._id,
        invoiceNo,
        {
          status,
          transactionId: String(payload.payment_no ?? ""),
          failureReason: String(payload.failure_reason ?? "").slice(0, 300),
        },
        ["pending", "failed", "cancelled"],
      );
      return { ...base, outcome: status, changed: true };
    }
    return { ...base, outcome: "pending", changed: false };
  },
};
