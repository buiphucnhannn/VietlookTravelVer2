import { env } from "../config/env.js";
import {
  decodeBase64Json,
  encodeResult,
  buildMessage,
  sign,
} from "../services/payment/ninepay.adapter.js";
import { FAKE_CREDS, isFake, paymentService } from "../services/payment/payment.service.js";
import { escape } from "../emails/layout.js";
import { ok } from "../utils/response.js";

/**
 * Địa chỉ website khách đang mở (9Pay đưa khách quay về đúng tên miền đó).
 * Origin của trình duyệt chỉ được tin khi là chính tên miền website (qua proxy Next) hoặc thuộc CORS_ORIGINS;
 * còn lại → PUBLIC_SITE_URL.
 */
function siteBase(req) {
  const origin = req.get("origin");
  if (origin) {
    try {
      const u = new URL(origin);
      const forwarded = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
      if (env.corsOrigins.includes(origin) || u.host.toLowerCase() === forwarded.toLowerCase())
        return u.origin;
    } catch {
      /* Origin hỏng → dùng mặc định */
    }
  }
  return env.siteUrl;
}

/** Trang cảm ơn (đường dẫn tương đối → trình duyệt ở lại đúng tên miền website) */
const thankYou = ({ code, lang, outcome, amount }) => {
  const prefix = lang && lang !== "en" ? `/${lang}` : "";
  const q = new URLSearchParams({
    ...(code && { code }),
    type: "booking",
    payment: outcome,
    ...(outcome === "success" && amount && { amount: String(amount) }), // VND — để hiện "đã nhận …"
  });
  return `${prefix}/thank-you?${q}`;
};

const resultOf = (src) => ({
  result: typeof src?.result === "string" ? src.result : "",
  checksum: typeof src?.checksum === "string" ? src.checksum : "",
});

export const paymentController = {
  publicConfig: async (_req, res) => {
    res.set("Cache-Control", "no-store");
    ok(res, await paymentService.publicConfig());
  },

  async start(req, res) {
    const { code } = req.validated.params;
    const { token, lang } = req.validated.body;
    const data = await paymentService.createForEnquiry(code, {
      token,
      lang,
      siteBase: siteBase(req),
    });
    ok(res, data);
  },

  /** 9Pay đưa trình duyệt khách về đây → kiểm tra → chuyển sang trang cảm ơn */
  async returnUrl(req, res) {
    try {
      const r = await paymentService.handleResult(resultOf(req.query), {
        source: "return",
        ip: req.ip,
      });
      res.redirect(303, thankYou(r));
    } catch (err) {
      req.log?.warn({ err: err.message, code: err.code }, "[payment] return lỗi");
      res.redirect(303, thankYou({ outcome: "failed" }));
    }
  },

  /** IPN: máy chủ 9Pay báo kết quả (POST x-www-form-urlencoded: result, checksum, version) */
  async ipn(req, res) {
    const src = req.body && Object.keys(req.body).length ? req.body : req.query;
    const r = await paymentService.handleResult(resultOf(src), { source: "ipn", ip: req.ip });
    ok(res, { received: true, outcome: r.outcome });
  },

  /**
   * CỔNG 9PAY GIẢ LẬP — chỉ khi NINEPAY_FAKE (máy dev, không bao giờ ở production).
   * Kiểm chữ ký như 9Pay rồi cho chọn kết quả → quay về return_url kèm result + checksum (key giả).
   */
  fakePortal(req, res) {
    if (!isFake())
      return res
        .status(404)
        .json({ success: false, error: { code: "NOT_FOUND", message: "Not found" } });
    const html = (body) => {
      res.set(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
      );
      res.type("html")
        .send(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>9Pay (giả lập)</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2d38}
.wrap{max-width:440px;margin:48px auto;padding:0 16px}.card{background:#fff;border-radius:16px;box-shadow:0 20px 50px -30px rgba(15,62,95,.5);border:1px solid #e6ebf0;overflow:hidden}
.top{background:#e91e63;color:#fff;padding:18px 22px;display:flex;justify-content:space-between;align-items:center}.top b{font-size:22px;letter-spacing:.5px}.tag{font-size:11px;background:rgba(255,255,255,.2);padding:3px 8px;border-radius:99px}
.body{padding:22px}.k{font-size:13px;color:#66737e;margin:0}.v{font-size:15px;margin:2px 0 14px;font-weight:600;word-break:break-all}.amt{font-size:30px;font-weight:800;margin:2px 0 18px}
a.btn{display:block;text-align:center;text-decoration:none;font-weight:700;padding:13px;border-radius:10px;margin-top:10px}.ok{background:#16a34a;color:#fff}.no{background:#fff;color:#b91c1c;border:1px solid #fecaca}.cx{background:#fff;color:#334155;border:1px solid #e2e8f0}
.note{font-size:12px;color:#66737e;margin:16px 0 0;line-height:1.5}.err{color:#b91c1c}
</style></head><body><div class="wrap"><div class="card"><div class="top"><b>9Pay</b><span class="tag">GIẢ LẬP · MÔI TRƯỜNG DEV</span></div><div class="body">${body}</div></div></div></body></html>`);
    };
    let params;
    try {
      params = decodeBase64Json(String(req.query.baseEncode ?? ""));
    } catch {
      return html(`<p class="err">Dữ liệu không hợp lệ.</p>`);
    }
    const returnUrl = String(params?.return_url ?? "");
    const endpoint = returnUrl.replace(/\/api\/v1\/payments\/return$/, "/api/v1/payments/fake");
    const expected = sign(
      buildMessage({
        method: "POST",
        uri: `${endpoint}/payments/create`,
        time: params.time,
        params,
      }),
      FAKE_CREDS.secretKey,
    );
    if (
      expected !== String(req.query.signature ?? "") ||
      params.merchantKey !== FAKE_CREDS.merchantKey
    )
      return html(`<p class="err">Chữ ký không hợp lệ (giống lỗi 313 của 9Pay).</p>`);

    const link = (status) => {
      const payload = {
        payment_no: Math.floor(1e11 + Math.random() * 9e11),
        invoice_no: params.invoice_no,
        amount: params.amount,
        currency: params.currency || "VND",
        description: params.description,
        method: "CREDIT_CARD",
        card_brand: "VISA",
        status,
        failure_reason: status === 6 ? "Thẻ bị từ chối (giả lập)" : null,
        created_at: new Date().toISOString(),
      };
      const r = encodeResult(payload, FAKE_CREDS.checksumKey);
      return `${returnUrl}?${new URLSearchParams({ result: r.result, checksum: r.checksum })}`;
    };
    const amount = `${Number(params.amount).toLocaleString("vi-VN")} ₫`;
    html(`<p class="k">Đơn hàng</p><p class="v">${escape(params.description)}</p>
<p class="k">Mã hoá đơn</p><p class="v">${escape(params.invoice_no)}</p>
<p class="k">Số tiền</p><p class="amt">${escape(amount)}</p>
<a class="btn ok" href="${escape(link(5))}">Thanh toán thành công</a>
<a class="btn no" href="${escape(link(6))}">Thanh toán thất bại</a>
<a class="btn cx" href="${escape(link(8))}">Huỷ giao dịch</a>
<p class="note">Trang này chỉ có trên máy phát triển để thử luồng thanh toán. Cổng thật: ${escape(env.payment.endpoint)}</p>`);
  },
};
