import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  counterRepository,
  enquiryRepository,
  settingRepository,
} from "../src/repositories/content.repository.js";
import { auditService } from "../src/services/audit.service.js";
import { enquiryService } from "../src/services/enquiry.service.js";
import { mailService } from "../src/services/mail.service.js";
import {
  FX_SOURCES,
  fxService,
  parseErApi,
  parseVcbXml,
  usdToVnd,
} from "../src/services/payment/fx.service.js";
import {
  buildMessage,
  buildPaymentUrl,
  canonicalParams,
  checksumOf,
  decodeBase64Json,
  encodeResult,
  mapStatus,
  phpUrlencode,
  queryTransaction,
  verifyResult,
} from "../src/services/payment/ninepay.adapter.js";
import {
  amountDue,
  paymentService,
  signPayToken,
  verifyPayToken,
} from "../src/services/payment/payment.service.js";
import { encryptSecret } from "../src/utils/crypto.js";

/**
 * Thanh toán 9Pay — KHÔNG cần MongoDB / mạng: repository, fetch, email, nhật ký đều thay bằng bản giả.
 */

const restores = [];
function stub(obj, name, fn) {
  const prev = obj[name];
  obj[name] = fn;
  restores.push(() => (obj[name] = prev));
}
afterEach(() => {
  while (restores.length) restores.pop()();
});

/* ======================================================================= */
describe("9Pay adapter — ký link thanh toán", () => {
  it("urlencode giống PHP, tham số sắp theo tên, bỏ ô trống", () => {
    assert.equal(phpUrlencode("Thanh toán đơn hàng"), "Thanh+to%C3%A1n+%C4%91%C6%A1n+h%C3%A0ng");
    assert.equal(phpUrlencode("a*b~c!"), "a%2Ab%7Ec%21");
    assert.equal(
      canonicalParams({ merchantKey: "K", amount: 10000, invoice_no: "A-1", back_url: "" }),
      "amount=10000&invoice_no=A-1&merchantKey=K",
    );
  });

  it("chuỗi ký + chữ ký + link /portal theo đúng mẫu của 9Pay", () => {
    const creds = { merchantKey: "NGuTdi", secretKey: "s3cret" };
    const out = buildPaymentUrl({
      creds,
      endpoint: "https://sand-payment.9pay.vn/",
      invoiceNo: "VL-BK261111-AB2C-1",
      amount: 2550000,
      description: "Vietlook Travel VL-BK261111-AB2C",
      returnUrl: "https://site.test/api/v1/payments/return",
      backUrl: "https://site.test/thank-you?code=X&payment=cancelled",
      lang: "en",
      time: 1762850000,
    });
    // vector dựng tay: method \n uri \n time \n tham số sắp xếp (urlencode kiểu PHP)
    const expectedMsg = [
      "POST",
      "https://sand-payment.9pay.vn/payments/create",
      "1762850000",
      "amount=2550000&back_url=https%3A%2F%2Fsite.test%2Fthank-you%3Fcode%3DX%26payment%3Dcancelled" +
        "&description=Vietlook+Travel+VL-BK261111-AB2C&invoice_no=VL-BK261111-AB2C-1&lang=en" +
        "&merchantKey=NGuTdi&return_url=https%3A%2F%2Fsite.test%2Fapi%2Fv1%2Fpayments%2Freturn&time=1762850000",
    ].join("\n");
    assert.equal(out.message, expectedMsg);
    const sig = createHmac("sha256", "s3cret").update(expectedMsg).digest("base64");
    assert.equal(out.signature, sig);
    const u = new URL(out.url);
    assert.equal(u.origin + u.pathname, "https://sand-payment.9pay.vn/portal");
    assert.equal(u.searchParams.get("signature"), sig);
    const params = decodeBase64Json(u.searchParams.get("baseEncode"));
    assert.equal(params.amount, 2550000);
    assert.equal(params.invoice_no, "VL-BK261111-AB2C-1");
    assert.equal(params.currency, undefined, "VND là mặc định → không gửi currency");
  });

  it("thiếu key → báo lỗi, không tạo link", () => {
    assert.throws(() => buildPaymentUrl({ creds: { merchantKey: "K" }, endpoint: "x" }));
  });
});

describe("9Pay adapter — kiểm tra kết quả trả về", () => {
  // Vector CHÍNH THỨC từ mã mẫu của 9Pay (gitlab.com/9pay-sample/sample-javascript/result.js)
  const SAMPLE = {
    result:
      "eyJhbW91bnQiOjU1MDAwLCJhbW91bnRfZm9yZWlnbiI6bnVsbCwiYW1vdW50X29yaWdpbmFsIjpudWxsLCJhbW91bnRfcmVxdWVzdCI6NTUwMDAsImJhbmsiOm51bGwsImNhcmRfYnJhbmQiOiJTTUwiLCJjYXJkX2luZm8iOnsiY2FyZF9uYW1lIjoiTkdVWUVOIFZBTiBBIiwiaGFzaF9jYXJkIjoiNTUwNGI5ODA4Y2RhYmU3YmRkMWQ4NWI0MDM5MjBiMjUiLCJjYXJkX2JyYW5kIjoiU01MIiwiY2FyZF9udW1iZXIiOiI5NzA0MDB4eHh4eHgwMDE4In0sImNyZWF0ZWRfYXQiOiIyMDIyLTA0LTEyVDAwOjI2OjAwLjAwMDAwMFoiLCJjdXJyZW5jeSI6IlZORCIsImRlc2NyaXB0aW9uIjoiVGhhbmggVG_DoW4gVGnhu4FuIFPDoWNoICIsImV4Y19yYXRlIjpudWxsLCJmYWlsdXJlX3JlYXNvbiI6bnVsbCwiZm9yZWlnbl9jdXJyZW5jeSI6bnVsbCwiaW52b2ljZV9ubyI6IjYyNTUyOTA5YTZmOWNmYmRmMDdkMDJlZCIsImxhbmciOm51bGwsIm1ldGhvZCI6IkFUTV9DQVJEIiwicGF5bWVudF9ubyI6Mjk0MDE5ODk2MzMxLCJzdGF0dXMiOjUsInRlbm9yIjpudWxsfQ",
    checksum: "EEE97758746F1949D47413F0D275F7331C622403A4DD360AAB6957AA1B623916",
    checksumKey: "zlW20K17FMWpm9JhUH1PPSNDxqGLMZ97",
  };

  it("vector mẫu của 9Pay: checksum đúng, giải mã được (base64url)", () => {
    const p = verifyResult(SAMPLE);
    assert.ok(p);
    assert.equal(p.status, 5);
    assert.equal(p.amount, 55000);
    assert.equal(p.currency, "VND");
    assert.equal(p.invoice_no, "62552909a6f9cfbdf07d02ed");
    assert.equal(p.payment_no, 294019896331);
    assert.equal(p.description, "Thanh Toán Tiền Sách ");
  });

  it("sai checksum / sai key / thiếu dữ liệu → null; chữ thường vẫn nhận", () => {
    assert.equal(verifyResult({ ...SAMPLE, checksum: "00" + SAMPLE.checksum.slice(2) }), null);
    assert.equal(verifyResult({ ...SAMPLE, checksumKey: "other" }), null);
    assert.equal(verifyResult({ ...SAMPLE, result: "" }), null);
    assert.ok(verifyResult({ ...SAMPLE, checksum: SAMPLE.checksum.toLowerCase() }));
  });

  it("encodeResult ↔ verifyResult; checksum = UPPER(SHA256(result + key))", () => {
    const r = encodeResult({ invoice_no: "A-1", amount: 10000, status: 5 }, "ck");
    assert.equal(
      r.checksum,
      createHash("sha256").update(`${r.result}ck`).digest("hex").toUpperCase(),
    );
    assert.equal(checksumOf(r.result, "ck"), r.checksum);
    assert.deepEqual(verifyResult({ ...r, checksumKey: "ck" }), {
      invoice_no: "A-1",
      amount: 10000,
      status: 5,
    });
  });

  it("mã trạng thái 9Pay → trạng thái lượt thanh toán", () => {
    assert.equal(mapStatus(5), "paid");
    assert.equal(mapStatus("16"), "paid");
    assert.equal(mapStatus(6), "failed");
    assert.equal(mapStatus(9), "failed");
    assert.equal(mapStatus(15), "failed");
    assert.equal(mapStatus(8), "cancelled");
    assert.equal(mapStatus(2), "pending");
    assert.equal(mapStatus(3), "pending");
  });

  it("tra cứu giao dịch: GET /v2/payments/{invoice}/inquire + header Signature", async () => {
    let seen;
    const data = await queryTransaction({
      creds: { merchantKey: "MK", secretKey: "sk" },
      endpoint: "https://sand-payment.9pay.vn",
      invoiceNo: "VL-1",
      time: 1700000000,
      fetchImpl: async (url, init) => {
        seen = { url, init };
        return { ok: true, status: 200, json: async () => ({ status: 5 }) };
      },
    });
    assert.equal(data.status, 5);
    assert.equal(seen.url, "https://sand-payment.9pay.vn/v2/payments/VL-1/inquire");
    const sig = createHmac("sha256", "sk")
      .update(buildMessage({ method: "GET", uri: seen.url, time: 1700000000 }))
      .digest("base64");
    assert.equal(seen.init.headers.Date, "1700000000");
    assert.equal(
      seen.init.headers.Authorization,
      `Signature Algorithm=HS256,Credential=MK,SignedHeaders=,Signature=${sig}`,
    );
  });
});

/* ======================================================================= */
const VCB_XML = `<?xml version="1.0" encoding="utf-8"?><ExrateList><DateTime>11/11/2026 10:30:00 AM</DateTime>
<Exrate CurrencyCode="AUD" CurrencyName="AUSTRALIAN DOLLAR" Buy="16,100.00" Transfer="16,200.00" Sell="16,700.00" />
<Exrate CurrencyCode="USD" CurrencyName="US DOLLAR" Buy="25,410.00" Transfer="25,440.00" Sell="25,820.00" />
</ExrateList>`;

const res = (body, ok = true) => ({ ok, status: ok ? 200 : 500, text: async () => body });

describe("tỷ giá USD → VND tự động", () => {
  let store;
  beforeEach(() => {
    store = {};
    stub(settingRepository, "get", async (k) => store[k] ?? null);
    stub(settingRepository, "set", async (k, v) => (store[k] = v));
    fxService._reset();
  });

  it("đọc giá BÁN USD của Vietcombank; er-api; số bất thường bị loại", () => {
    assert.equal(parseVcbXml(VCB_XML), 25820);
    assert.equal(parseVcbXml(VCB_XML.replace("25,820.00", "2,582.00")), null);
    assert.equal(parseVcbXml("<html>maintenance</html>"), null);
    assert.equal(parseErApi({ result: "success", rates: { VND: 25608.4 } }), 25608);
    assert.equal(parseErApi({ result: "success", rates: { VND: 99 } }), null);
    assert.equal(usdToVnd(100, 25820), 2582000);
    assert.equal(usdToVnd(99.5, 25820), 2570000); // 2.569.090 → làm tròn LÊN 1.000đ
  });

  it("Vietcombank là nguồn chính → lưu DB", async () => {
    const calls = [];
    const r = await fxService.refresh({
      fetchImpl: async (url) => (calls.push(url), res(VCB_XML)),
    });
    assert.equal(r.rate, 25820);
    assert.equal(r.source, "vietcombank");
    assert.deepEqual(calls, [FX_SOURCES.vcb]);
    assert.equal(store.fx.rate, 25820);
  });

  it("Vietcombank lỗi / số bất thường → dùng open.er-api", async () => {
    const r = await fxService.refresh({
      fetchImpl: async (url) =>
        url === FX_SOURCES.vcb
          ? res(VCB_XML.replace("25,820.00", "258,200.00"))
          : res(JSON.stringify({ result: "success", rates: { VND: 25608 } })),
    });
    assert.equal(r.rate, 25608);
    assert.equal(r.source, "er-api");
  });

  it("mọi nguồn lỗi → giữ tỷ giá tốt gần nhất; chưa từng có → PAYMENT_USD_VND_RATE", async () => {
    const down = async () => {
      throw new Error("down");
    };
    const first = await fxService.getRate({ fetchImpl: down });
    assert.equal(first.source, "default");
    assert.equal(first.rate, 25500);
    await fxService.settle();

    fxService._reset({ rate: 25700, source: "vietcombank", fetchedAt: "2020-01-01T00:00:00Z" });
    const stale = await fxService.getRate({ fetchImpl: down }); // cũ → làm mới nền, lỗi
    assert.equal(stale.rate, 25700);
    await fxService.settle();
    assert.equal((await fxService.getRate({ fetchImpl: down })).rate, 25700);
  });

  it("tỷ giá còn mới → dùng lại, không gọi nguồn bên ngoài", async () => {
    store.fx = { rate: 25820, source: "vietcombank", fetchedAt: new Date().toISOString() };
    let n = 0;
    const counting = async () => (n++, res(VCB_XML));
    assert.equal((await fxService.getRate({ fetchImpl: counting })).rate, 25820);
    assert.equal((await fxService.getRate({ fetchImpl: counting })).rate, 25820);
    await fxService.settle();
    assert.equal(n, 0);
  });
});

/* ======================================================================= */
const KEYS = { merchantKey: "MK123", secretKey: "secret-abc", checksumKey: "checksum-xyz" };

/** DB giả: settings + 1 đơn trong bộ nhớ */
function fakeDb({ payment = null, enquiry } = {}) {
  const store = {
    fx: { rate: 25820, source: "vietcombank", fetchedAt: new Date().toISOString() },
    ...(payment && { payment }),
  };
  const docs = new Map(enquiry ? [[enquiry.code, structuredClone(enquiry)]] : []);
  const byId = (id) => [...docs.values()].find((d) => String(d._id) === String(id));
  stub(settingRepository, "get", async (k) => store[k] ?? null);
  stub(settingRepository, "set", async (k, v) => (store[k] = v));
  let seq = 0;
  stub(counterRepository, "next", async () => ++seq);
  stub(enquiryRepository, "findByCode", async (c) => structuredClone(docs.get(c) ?? null));
  stub(enquiryRepository, "findById", async (id) => structuredClone(byId(id) ?? null));
  stub(enquiryRepository, "findByInvoice", async (inv) =>
    structuredClone(
      [...docs.values()].find((d) => d.payments?.some((p) => p.invoiceNo === inv)) ?? null,
    ),
  );
  stub(enquiryRepository, "pushPayment", async (id, p) => {
    const d = byId(id);
    d.payments = [...(d.payments ?? []), { ...p, createdAt: new Date() }];
    return structuredClone(d);
  });
  stub(enquiryRepository, "updatePayment", async (id, inv, fields, from) => {
    const p = byId(id)?.payments?.find((x) => x.invoiceNo === inv && from.includes(x.status));
    if (!p) return false;
    Object.assign(p, fields);
    return true;
  });
  stub(enquiryRepository, "setPaymentStatus", async (id, s) => {
    const d = byId(id);
    d.paymentStatus = s;
    return structuredClone(d);
  });
  return { store, docs };
}

const enabledSettings = (extra = {}) => ({
  enabled: true,
  merchantKey: KEYS.merchantKey,
  secretKey: encryptSecret(KEYS.secretKey),
  checksumKey: encryptSecret(KEYS.checksumKey),
  ...extra,
});

const BOOKING = {
  _id: "64b0000000000000000000aa",
  code: "VL-BK261111-AB2C",
  type: "booking",
  status: "new",
  paymentStatus: "unpaid",
  lang: "en",
  name: "Jane",
  email: "jane@example.com",
  tour: { slug: "t", title: "Hanoi 3 days" },
  departureDate: "2099-01-10",
  estimate: { currency: "USD", total: 800, lines: [] },
  payments: [],
};

const startFor = (code, extra = {}) =>
  paymentService.createForEnquiry(code, {
    token: signPayToken(code),
    siteBase: "https://site.test",
    ...extra,
  });

/** Kết quả 9Pay (đã ký bằng checksum key) cho lượt `invoiceNo` */
const nineResult = (invoiceNo, amount, status = 5, key = KEYS.checksumKey) =>
  encodeResult(
    { invoice_no: invoiceNo, amount, currency: "VND", status, payment_no: 123456789 },
    key,
  );

describe("payment.service — bật / tắt", () => {
  beforeEach(() => fxService._reset());

  it("chưa cài / đã tắt / thiếu key → không thanh toán, đặt tour như cũ", async () => {
    fakeDb({ enquiry: BOOKING });
    assert.equal(await paymentService.isEnabled(), false);
    assert.deepEqual(await paymentService.publicConfig(), { enabled: false });
    assert.equal(await paymentService.offerFor(BOOKING), null);
    restores
      .splice(0)
      .reverse()
      .forEach((r) => r());

    fakeDb({ payment: enabledSettings({ checksumKey: "" }), enquiry: BOOKING });
    assert.equal(await paymentService.isEnabled(), false);
    restores
      .splice(0)
      .reverse()
      .forEach((r) => r());

    fakeDb({ payment: enabledSettings({ enabled: false }), enquiry: BOOKING });
    await assert.rejects(startFor(BOOKING.code), { code: "PAYMENT_DISABLED" });
  });

  it("bật + đủ 3 key → cấu hình công khai không lộ mã", async () => {
    fakeDb({ payment: enabledSettings({ depositPercent: 30 }) });
    const cfg = await paymentService.publicConfig();
    assert.equal(cfg.enabled, true);
    assert.equal(cfg.depositPercent, 30);
    assert.equal(cfg.rate, 25820);
    assert.ok(!JSON.stringify(cfg).includes(KEYS.secretKey));
    assert.ok(!JSON.stringify(cfg).includes(KEYS.merchantKey));
  });

  it("chỉ đơn đặt tour có giá mới được đề nghị thanh toán", async () => {
    fakeDb({ payment: enabledSettings() });
    assert.equal(await paymentService.offerFor({ ...BOOKING, type: "car" }), null);
    assert.equal(await paymentService.offerFor({ ...BOOKING, estimate: { total: null } }), null);
    const offer = await paymentService.offerFor(BOOKING);
    assert.ok(verifyPayToken(offer.token, BOOKING.code));
    assert.equal(offer.amountUsd, 800);
    assert.equal(offer.amountVnd, 20656000);
  });
});

describe("payment.service — tạo link + nhận kết quả", () => {
  let sent;
  let audits;
  beforeEach(() => {
    fxService._reset();
    sent = [];
    audits = [];
    stub(mailService, "send", async (m) => (sent.push(m), { ok: true }));
    stub(auditService, "record", (_req, action, opts) => audits.push({ action, ...opts }));
  });

  it("payToken bắt buộc, đúng đơn, còn hạn", async () => {
    fakeDb({ payment: enabledSettings(), enquiry: BOOKING });
    await assert.rejects(paymentService.createForEnquiry(BOOKING.code, { token: "x.y" }), {
      code: "PAY_TOKEN_INVALID",
    });
    await assert.rejects(
      paymentService.createForEnquiry(BOOKING.code, { token: signPayToken("VL-BK261111-ZZZZ") }),
      { code: "PAY_TOKEN_INVALID" },
    );
    await assert.rejects(
      paymentService.createForEnquiry(BOOKING.code, { token: signPayToken(BOOKING.code, -1) }),
      { code: "PAY_TOKEN_INVALID" },
    );
  });

  it("số tiền lấy từ giá MÁY CHỦ tính (USD × tỷ giá, làm tròn lên 1.000đ), ký bằng key trong CMS", async () => {
    const { docs } = fakeDb({ payment: enabledSettings(), enquiry: BOOKING });
    const r = await startFor(BOOKING.code, { lang: "vi" });
    const u = new URL(r.url);
    assert.equal(u.origin, "https://payment.9pay.vn");
    const params = decodeBase64Json(u.searchParams.get("baseEncode"));
    assert.equal(params.merchantKey, KEYS.merchantKey);
    assert.equal(params.amount, 20656000);
    assert.equal(params.invoice_no, `${BOOKING.code}-1`);
    assert.equal(params.return_url, "https://site.test/api/v1/payments/return");
    assert.equal(params.lang, "vi");
    const msg = buildMessage({
      method: "POST",
      uri: "https://payment.9pay.vn/payments/create",
      time: params.time,
      params,
    });
    assert.equal(
      u.searchParams.get("signature"),
      createHmac("sha256", KEYS.secretKey).update(msg).digest("base64"),
    );
    const p = docs.get(BOOKING.code).payments[0];
    assert.deepEqual(
      { amount: p.amount, currency: p.currency, status: p.status, rate: p.rate, kind: p.kind },
      { amount: 20656000, currency: "VND", status: "pending", rate: 25820, kind: "full" },
    );
  });

  it("đổi key trong CMS → lượt sau dùng ngay key mới", async () => {
    const { store } = fakeDb({ payment: enabledSettings(), enquiry: BOOKING });
    await startFor(BOOKING.code);
    store.payment = enabledSettings({ merchantKey: "NEWKEY", secretKey: encryptSecret("new-s") });
    const r = await startFor(BOOKING.code);
    const params = decodeBase64Json(new URL(r.url).searchParams.get("baseEncode"));
    assert.equal(params.merchantKey, "NEWKEY");
    assert.equal(params.invoice_no, `${BOOKING.code}-2`);
  });

  it("thành công → đơn 'Đã thanh toán', nhật ký + email 1 lần; gửi lại (IPN) không trùng", async () => {
    const { docs } = fakeDb({ payment: enabledSettings(), enquiry: BOOKING });
    const { invoiceNo, amountVnd } = await startFor(BOOKING.code);
    const result = nineResult(invoiceNo, amountVnd);

    const a = await paymentService.handleResult(result, { source: "return" });
    assert.deepEqual([a.outcome, a.changed, a.code], ["success", true, BOOKING.code]);
    const b = await paymentService.handleResult(result, { source: "ipn" });
    assert.deepEqual([b.outcome, b.changed], ["success", false]);

    const d = docs.get(BOOKING.code);
    assert.equal(d.paymentStatus, "paid");
    assert.equal(d.payments[0].status, "paid");
    assert.equal(d.payments[0].transactionId, "123456789");
    assert.equal(audits.filter((x) => x.action === "enquiry.payment").length, 1);
    await new Promise((r) => setImmediate(r));
    assert.equal(sent.length, 2, "1 email cho công ty + 1 biên nhận cho khách");
    assert.match(sent[0].subject, /Khách đã thanh toán/);
    assert.match(sent[1].subject, /Payment received/);

    await assert.rejects(startFor(BOOKING.code), { code: "ALREADY_PAID" });
  });

  it("sai checksum / số tiền không khớp → từ chối, không đổi đơn", async () => {
    const { docs } = fakeDb({ payment: enabledSettings(), enquiry: BOOKING });
    const { invoiceNo, amountVnd } = await startFor(BOOKING.code);
    await assert.rejects(
      paymentService.handleResult(nineResult(invoiceNo, amountVnd, 5, "wrong-key")),
      { code: "BAD_CHECKSUM" },
    );
    await assert.rejects(paymentService.handleResult(nineResult(invoiceNo, 10000)), {
      code: "AMOUNT_MISMATCH",
    });
    await assert.rejects(paymentService.handleResult(nineResult("VL-NOPE-1", 10000)), {
      statusCode: 404,
    });
    assert.equal(docs.get(BOOKING.code).paymentStatus, "unpaid");
    assert.equal(docs.get(BOOKING.code).payments[0].status, "pending");
  });

  it("thất bại / huỷ → ghi lượt, đơn vẫn chưa thanh toán; trả lại được", async () => {
    const { docs } = fakeDb({ payment: enabledSettings(), enquiry: BOOKING });
    const first = await startFor(BOOKING.code);
    const r = await paymentService.handleResult(nineResult(first.invoiceNo, first.amountVnd, 6));
    assert.equal(r.outcome, "failed");
    const c = await paymentService.handleResult(nineResult(first.invoiceNo, first.amountVnd, 8));
    assert.equal(c.outcome, "cancelled");
    assert.equal(docs.get(BOOKING.code).paymentStatus, "unpaid");
    const again = await startFor(BOOKING.code);
    assert.equal(again.invoiceNo, `${BOOKING.code}-2`);
  });

  it("đặt cọc 30% → 'Đã đặt cọc'; lượt sau trả phần còn lại → 'Đã thanh toán'", async () => {
    const { docs } = fakeDb({ payment: enabledSettings({ depositPercent: 30 }), enquiry: BOOKING });
    assert.deepEqual(amountDue(BOOKING, 30), { usd: 240, kind: "deposit" });
    const dep = await startFor(BOOKING.code);
    assert.equal(dep.kind, "deposit");
    assert.equal(dep.amountVnd, usdToVnd(240, 25820));
    await paymentService.handleResult(nineResult(dep.invoiceNo, dep.amountVnd));
    assert.equal(docs.get(BOOKING.code).paymentStatus, "deposit");

    const rest = await startFor(BOOKING.code);
    assert.equal(rest.kind, "balance");
    assert.equal(rest.amountUsd, 560);
    await paymentService.handleResult(nineResult(rest.invoiceNo, rest.amountVnd));
    assert.equal(docs.get(BOOKING.code).paymentStatus, "paid");
  });
});

/* ======================================================================= */
describe("payment routes", () => {
  const app = createApp();
  const ORIGIN = "http://localhost:3000";

  beforeEach(() => fxService._reset());

  it("GET /public/payment-config: tắt → { enabled: false }", async () => {
    fakeDb();
    const r = await request(app).get("/api/v1/public/payment-config");
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, { enabled: false });
  });

  it("POST /enquiries: 9Pay bật → kèm payToken + số tiền; tắt → không có", async () => {
    stub(mailService, "send", async () => ({ ok: true, skipped: true }));
    stub(enquiryRepository, "setEmailStatus", async () => {});
    const offer = await (async () => {
      fakeDb({ payment: enabledSettings() });
      return paymentService.offerFor(BOOKING);
    })();
    assert.ok(offer.token);
    // createPublic gắn offer vào kết quả (test đầy đủ form ở forms.test.js)
    stub(paymentService, "offerFor", async () => offer);
    stub(enquiryRepository, "create", async (d) => ({ toObject: () => ({ ...d, _id: "x" }) }));
    const { tourRepository } = await import("../src/repositories/content.repository.js");
    stub(tourRepository, "findBySlugOrOld", async () => ({
      slug: "t",
      code: "T",
      isActive: true,
      price: 400,
      content: { en: { title: "T" } },
    }));
    stub(tourRepository, "findByIdent", async () => null);
    const out = await enquiryService.createPublic(
      { type: "booking", tourSlug: "t", name: "A", email: "a@example.com", lang: "en", adults: 2 },
      {},
    );
    assert.equal(out.payment.token, offer.token);
    await new Promise((r) => setTimeout(r, 30)); // email chạy nền xong trước khi gỡ bản giả
  });

  it("start: thiếu token → 422; token sai → 403", async () => {
    fakeDb({ payment: enabledSettings(), enquiry: BOOKING });
    const send = (body) =>
      request(app)
        .post(`/api/v1/payments/${BOOKING.code}/start`)
        .set("X-Requested-With", "fetch")
        .set("Origin", ORIGIN)
        .send(body);
    assert.equal((await send({})).status, 422);
    const bad = await send({ token: "aaaaaaaaaaaa.bbbb" });
    assert.equal(bad.status, 403);
    assert.equal(bad.body.error.code, "PAY_TOKEN_INVALID");
    const okRes = await send({ token: signPayToken(BOOKING.code) });
    assert.equal(okRes.status, 200);
    // return_url theo tên miền website khách đang mở
    const params = decodeBase64Json(new URL(okRes.body.data.url).searchParams.get("baseEncode"));
    assert.equal(params.return_url, `${ORIGIN}/api/v1/payments/return`);
  });

  it("return: đúng → chuyển trang cảm ơn kèm payment=success; sai → payment=failed", async () => {
    stub(mailService, "send", async () => ({ ok: true }));
    stub(auditService, "record", () => {});
    fakeDb({ payment: enabledSettings(), enquiry: { ...BOOKING, lang: "vi" } });
    const { invoiceNo, amountVnd } = await startFor(BOOKING.code);
    const r1 = await request(app)
      .get("/api/v1/payments/return")
      .query({ result: "x", checksum: "y" });
    assert.equal(r1.status, 303);
    assert.equal(r1.headers.location, "/thank-you?type=booking&payment=failed");
    const good = nineResult(invoiceNo, amountVnd);
    const r2 = await request(app).get("/api/v1/payments/return").query(good);
    assert.equal(r2.status, 303);
    assert.equal(
      r2.headers.location,
      `/vi/thank-you?code=${BOOKING.code}&type=booking&payment=success&amount=${amountVnd}`,
    );
  });

  it("IPN: máy chủ 9Pay gọi (không header website) → không bị chặn CSRF; idempotent", async () => {
    stub(mailService, "send", async () => ({ ok: true }));
    stub(auditService, "record", () => {});
    fakeDb({ payment: enabledSettings(), enquiry: BOOKING });
    const bad = await request(app)
      .post("/api/v1/payments/ipn")
      .type("form")
      .send({ result: "abc", checksum: "def" });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, "BAD_CHECKSUM");
    const { invoiceNo, amountVnd } = await startFor(BOOKING.code);
    const form = { ...nineResult(invoiceNo, amountVnd), version: "v1" };
    for (let i = 0; i < 2; i++) {
      const r = await request(app).post("/api/v1/payments/ipn").type("form").send(form);
      assert.equal(r.status, 200);
      assert.equal(r.body.data.outcome, "success");
    }
  });

  it("start bị giới hạn tần suất (10 lần / 10 phút / IP)", async () => {
    fakeDb({ payment: enabledSettings(), enquiry: BOOKING });
    let last;
    for (let i = 0; i < 12; i++)
      last = await request(app)
        .post(`/api/v1/payments/${BOOKING.code}/start`)
        .set("X-Requested-With", "fetch")
        .send({ token: "aaaaaaaaaaaa.bbbb" });
    assert.equal(last.status, 429);
  });
});
