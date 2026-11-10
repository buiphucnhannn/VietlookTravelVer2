import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app.js";
import { passwordService } from "../src/services/password.service.js";

const app = createApp();

describe("app — khung & bảo mật", () => {
  it("health trả JSON, báo DB chưa kết nối (503)", async () => {
    const res = await request(app).get("/api/v1/health");
    assert.equal(res.status, 503);
    assert.equal(res.body.data.database, "disconnected");
  });

  it("route lạ → 404 JSON chuẩn", async () => {
    const res = await request(app).get("/api/v1/khong-ton-tai");
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "NOT_FOUND");
  });

  it("có header bảo mật, ẩn X-Powered-By", async () => {
    const res = await request(app).get("/api/v1/health");
    assert.equal(res.headers["x-powered-by"], undefined);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.match(res.headers["content-security-policy"], /default-src 'none'/);
    assert.ok(res.headers["x-request-id"]);
  });

  it("đăng nhập nhanh (demo) mặc định TẮT: báo tắt + POST → 404", async () => {
    const status = await request(app).get("/api/v1/auth/demo");
    assert.equal(status.status, 200);
    assert.equal(status.body.data.enabled, false);
    const res = await request(app)
      .post("/api/v1/auth/demo-login")
      .set("X-Requested-With", "fetch")
      .send({});
    assert.equal(res.status, 404);
    assert.equal(res.headers["set-cookie"], undefined);
  });

  it("nhật ký thao tác: kiểm tra tham số tìm kiếm", async () => {
    const { listAuditLogsQuery } = await import("../src/validators/audit-log.validator.js");
    const okQ = listAuditLogsQuery.parse({
      q: "VL-BK",
      actions: "auth.login,tour.update",
      from: "2026-11-01",
      to: "2026-11-10",
    });
    assert.deepEqual(okQ.actions, ["auth.login", "tour.update"]);
    assert.equal(listAuditLogsQuery.safeParse({ actions: "auth.login,$where" }).success, false);
    assert.equal(listAuditLogsQuery.safeParse({ from: "10/11/2026" }).success, false);
    assert.equal(listAuditLogsQuery.safeParse({ q: "x".repeat(101) }).success, false);
  });

  it("chữ khách gõ: bỏ thẻ HTML, giữ dấu so sánh", async () => {
    const { plainText } = await import("../src/validators/common.validator.js");
    assert.equal(plainText(200).parse("Hi <b>Thanks!</b><script>x</script>"), "Hi Thanks!x");
    assert.equal(plainText(200).parse("trẻ < 5 tuổi và > 2 tuổi"), "trẻ < 5 tuổi và > 2 tuổi");
  });

  it("POST thiếu X-Requested-With → 403 CSRF_REJECTED", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "CSRF_REJECTED");
  });

  it("POST từ origin lạ → 403 BAD_ORIGIN", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "fetch")
      .set("Origin", "https://evil.example")
      .send({});
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "BAD_ORIGIN");
  });

  it("đăng nhập sai định dạng → 422 kèm chi tiết từng ô", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "fetch")
      .send({ username: "", password: "" });
    assert.equal(res.status, 422);
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes("body.username"));
    assert.ok(fields.includes("body.password"));
  });

  it("chặn NoSQL injection trong body (toán tử $ne) ở bước validate", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "fetch")
      .send({ username: { $ne: "" }, password: { $ne: "" } });
    assert.equal(res.status, 422);
  });

  it("JSON hỏng → 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "fetch")
      .set("Content-Type", "application/json")
      .send("{bad json");
    assert.equal(res.status, 400);
  });

  it("route quản trị không có cookie → 401", async () => {
    const res = await request(app).get("/api/v1/users");
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHENTICATED");
  });

  it("token giả (sai secret) → 401", async () => {
    const forged = jwt.sign({ typ: "access", role: "admin", tv: 0 }, "wrong-secret", {
      subject: "64b7f0c2a1b2c3d4e5f60718",
      issuer: "vietlook-api",
      audience: "vietlook-cms",
    });
    const res = await request(app).get("/api/v1/users").set("Cookie", `vl_at=${forged}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "TOKEN_EXPIRED");
  });

  it("token alg:none → 401", async () => {
    const none = jwt.sign({ typ: "access", role: "admin", tv: 0 }, null, {
      algorithm: "none",
      subject: "64b7f0c2a1b2c3d4e5f60718",
    });
    const res = await request(app).get("/api/v1/users").set("Cookie", `vl_at=${none}`);
    assert.equal(res.status, 401);
  });
});

describe("form công khai & phân quyền nội dung", () => {
  const post = (body) =>
    request(app).post("/api/v1/enquiries").set("X-Requested-With", "fetch").send(body);

  it("thiếu tên → 422", async () => {
    const res = await post({ type: "contact", email: "a@b.vn" });
    assert.equal(res.status, 422);
  });

  it("thiếu cả email lẫn SĐT → 422", async () => {
    const res = await post({ type: "contact", name: "QA" });
    assert.equal(res.status, 422);
  });

  it("ngày đã qua → 422", async () => {
    const res = await post({ type: "car", name: "QA", email: "a@b.vn", date: "2020-01-01" });
    assert.equal(res.status, 422);
    assert.ok(res.body.error.details.some((d) => d.field === "body.date"));
  });

  it("SĐT có chữ → 422", async () => {
    const res = await post({ type: "contact", name: "QA", phone: "abc123" });
    assert.equal(res.status, 422);
  });

  it("đặt tour thiếu tour → 422", async () => {
    const res = await post({ type: "booking", name: "QA", email: "a@b.vn" });
    assert.equal(res.status, 422);
  });

  it("route CMS nội dung cần đăng nhập", async () => {
    for (const path of ["/api/v1/admin/tours", "/api/v1/settings/home", "/api/v1/enquiries"]) {
      const res = await request(app).get(path);
      assert.equal(res.status, 401, path);
    }
  });

  it("cài đặt 9Pay / email chỉ admin (chưa đăng nhập → 401)", async () => {
    const res = await request(app).get("/api/v1/settings/payment");
    assert.equal(res.status, 401);
  });
});

describe("password.service", () => {
  it("băm + kiểm tra đúng / sai", async () => {
    const hash = await passwordService.hash("Vietlook-Strong-123");
    assert.match(hash, /^scrypt\$32768\$8\$1\$/);
    assert.equal(await passwordService.verify("Vietlook-Strong-123", hash), true);
    assert.equal(await passwordService.verify("vietlook-strong-123", hash), false);
    assert.equal(await passwordService.verify("x", "hong-dinh-dang"), false);
  });

  it("2 lần băm cùng mật khẩu cho kết quả khác nhau (có salt)", async () => {
    const [a, b] = await Promise.all([passwordService.hash("same"), passwordService.hash("same")]);
    assert.notEqual(a, b);
  });
});

describe("tiện ích", async () => {
  const { estimatePrice } = await import("../src/utils/pricing.js");
  const { cleanHtml } = await import("../src/utils/sanitize.js");
  const { encryptSecret, decryptSecret } = await import("../src/utils/crypto.js");
  const { slugify } = await import("../src/utils/slugify.js");

  it("giá tạm tính: bậc số khách + trẻ em + phụ thu lễ", () => {
    const tour = {
      price: 100,
      pricing: {
        groupTiers: [
          { minPax: 1, maxPax: 1, price: 150 },
          { minPax: 2, maxPax: 3, price: 120 },
        ],
        childRates: [
          { minAge: 0, maxAge: 4, percent: 0 },
          { minAge: 5, maxAge: 11, percent: 50 },
        ],
        holidaySurcharge: 10,
        holidayDates: ["01-01"],
      },
    };
    const r = estimatePrice(tour, { adults: 2, childAges: [3], date: "2027-05-10" });
    assert.equal(r.total, 240); // 3 khách → 120 × 2 người lớn, bé 3 tuổi miễn phí
    const h = estimatePrice(tour, { adults: 2, childAges: [8], date: "2027-01-01" });
    assert.equal(h.total, 120 * 2 + 60 + 30); // + bé 50% + phụ thu 3 khách trả tiền
  });

  it("lọc HTML chặn XSS", () => {
    const out = cleanHtml(
      `<p onclick="x()">Hi<script>alert(1)</script><img src="javascript:alert(1)" onerror="x"><a href="javascript:x">l</a></p>`,
    );
    assert.ok(!/script|onerror|onclick|javascript:/i.test(out), out);
  });

  it("mã hoá secret 2 chiều", () => {
    const enc = encryptSecret("sk_test_123");
    assert.match(enc, /^enc:v1:/);
    assert.equal(decryptSecret(enc), "sk_test_123");
    assert.equal(decryptSecret("enc:v1:hong:du:lieu"), "");
  });

  it("slugify tiếng Việt", () => {
    assert.equal(slugify("Hà Nội – Hạ Long 3 ngày"), "ha-noi-ha-long-3-ngay");
    assert.equal(slugify("Đà Nẵng!!"), "da-nang");
  });
});
