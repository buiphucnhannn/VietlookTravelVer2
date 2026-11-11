import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  counterRepository,
  enquiryRepository,
  settingRepository,
  tourRepository,
} from "../src/repositories/content.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { auditService } from "../src/services/audit.service.js";
import { enquiryService } from "../src/services/enquiry.service.js";
import { mailService } from "../src/services/mail.service.js";
import { paymentService } from "../src/services/payment/payment.service.js";
import { signAccessToken } from "../src/services/token.service.js";
import { ACCESS_COOKIE } from "../src/utils/auth-cookies.js";
import { estimatePrice } from "../src/utils/pricing.js";
import { PRIVACY_POLICY_VERSION } from "../src/constants/content.js";

/**
 * Form công khai, giá tạm tính, mã yêu cầu, email & phân quyền — KHÔNG cần MongoDB:
 * thay tạm các hàm repository bằng bản giả (khôi phục sau mỗi nhóm test).
 */
const app = createApp();

/** Thay tạm method của 1 object; trả hàm khôi phục */
function stub(obj, name, fn) {
  const had = Object.prototype.hasOwnProperty.call(obj, name);
  const prev = obj[name];
  obj[name] = fn;
  return () => (had ? (obj[name] = prev) : delete obj[name]);
}

const TOUR = {
  _id: "64b000000000000000000001",
  slug: "hanoi-halong-3-days",
  code: "VL-HN3",
  isActive: true,
  price: 300,
  content: { en: { title: "Hanoi & Halong 3 days" } },
  pricing: {
    groupTiers: [
      { minPax: 1, maxPax: 1, price: 500, price4: 600, price5: 700 },
      { minPax: 2, maxPax: 3, price: 400, price4: 450, price5: 550 },
      { minPax: 4, maxPax: 9, price: 350, price4: 400, price5: 480 },
    ],
    childRates: [
      { minAge: 0, maxAge: 3, percent: 0 },
      { minAge: 4, maxAge: 9, percent: 50 },
      { minAge: 10, maxAge: 17, percent: 80 },
    ],
    singleSupplement: 90,
    holidaySurcharge: 20,
    holidayPercent: 10,
    holidayDates: ["2099-02-16", "12-31"],
  },
};

describe("giá tạm tính — bảng giá theo mẫu tour", () => {
  it("bậc số khách × hạng khách sạn, đếm cả trẻ em vào số khách", () => {
    // 2 lớn + 2 trẻ = 4 khách → bậc 4–9, 4★ = 400; trẻ 5 tuổi 50%, 12 tuổi 80%
    const r = estimatePrice(TOUR, { adults: 2, childAges: [5, 12], hotelClass: 4 });
    assert.equal(r.total, 800 + 200 + 320);
  });

  it("trẻ dưới 4 tuổi miễn phí; phụ thu lễ / khách chỉ tính người phải trả tiền", () => {
    // 2 lớn + bé 2 tuổi = 3 khách → bậc 2–3, 3★ = 400; ngày lễ cố định MM-DD (31/12 hằng năm)
    const r = estimatePrice(TOUR, { adults: 2, childAges: [2], date: "2099-12-31", hotelClass: 3 });
    const base = 800 + 0;
    assert.equal(r.total, base + 20 * 2 + Math.round(base * 0.1));
  });

  it("1 khách: giá bậc 1 khách + phụ thu phòng đơn; có trẻ đi cùng thì không phụ thu phòng đơn", () => {
    assert.equal(estimatePrice(TOUR, { adults: 1, hotelClass: 5 }).total, 700 + 90);
    const withChild = estimatePrice(TOUR, { adults: 1, childAges: [10], hotelClass: 3 });
    assert.equal(withChild.total, 400 + 320);
  });

  it("chưa có bảng giá → giá bán; không có giá → total null (báo giá sau)", () => {
    assert.equal(estimatePrice({ price: 199 }, { adults: 2 }).total, 398);
    assert.deepEqual(estimatePrice({ price: null }, { adults: 2 }), { total: null, lines: [] });
  });

  it("trẻ em mặc định khi tour chưa cài: < 5 miễn phí, 5–10 tuổi 75%, ≥ 11 như người lớn", () => {
    const r = estimatePrice({ price: 100 }, { adults: 2, childAges: [4, 7, 11] });
    assert.equal(r.total, 200 + 0 + 75 + 100);
  });
});

describe("form công khai → lưu đơn + mã yêu cầu (không phụ thuộc email)", () => {
  const saved = [];
  const restores = [];
  before(() => {
    let seq = 0;
    restores.push(
      stub(counterRepository, "next", async () => ++seq),
      stub(enquiryRepository, "create", async (doc) => {
        const full = { _id: `e${saved.length}`, ...doc };
        saved.push(full);
        return { toObject: () => full };
      }),
      stub(enquiryRepository, "setEmailStatus", async () => {}),
      stub(settingRepository, "get", async () => null),
      stub(tourRepository, "findBySlugOrOld", async (slug) =>
        slug === TOUR.slug || slug === "old-hanoi-slug" ? TOUR : null,
      ),
    );
  });
  after(() => restores.forEach((r) => r()));

  // mỗi request 1 IP riêng (TRUST_PROXY=1 → đọc X-Forwarded-For) để không chạm giới hạn 10 form / 10 phút
  let ip = 0;
  const post = (body, lang, from = `10.0.0.${++ip}`) =>
    request(app)
      .post("/api/v1/enquiries")
      .set("X-Requested-With", "fetch")
      .set("X-Forwarded-For", from)
      .send({ lang, consent: true, ...body });

  it("quá 10 form / 10 phút / IP → 429, câu theo ngôn ngữ khách", async () => {
    let res;
    for (let i = 0; i < 11; i++)
      res = await post({ type: "contact", name: "QA", email: "qa@example.com" }, "vi", "10.9.9.9");
    assert.equal(res.status, 429);
    assert.equal(
      res.body.error.message,
      "Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút.",
    );
  });

  const FORMS = {
    booking: {
      tourSlug: TOUR.slug,
      departureDate: "2099-03-01",
      adults: 2,
      childAges: [5],
      hotelClass: 4,
      estimateUSD: 1, // số trình duyệt gửi bị bỏ qua — máy chủ tự tính
    },
    planner: {
      days: 10,
      budget: "1500-2500",
      hotelClass: 4,
      destinations: ["hanoi", "hoi-an"],
      date: "2099-05-01",
    },
    car: { route: "Hanoi → Halong", date: "2099-04-01", vehicle: "7-seat", pax: 4, airport: true },
    visa: {
      service: "Fast-track",
      nationality: "France",
      people: 2,
      entryDate: "2099-04-02",
      airport: "SGN",
      flight: "VN123",
    },
    contact: { message: "Hello" },
    partner: { company: "ACME Travel", country: "DE", message: "B2B" },
  };

  for (const [type, extra] of Object.entries(FORMS)) {
    it(`${type}: 201 + mã VL-<loại><ngày>-…, lưu trường riêng vào details`, async () => {
      const res = await post({ type, name: "QA Tester", email: "qa@example.com", ...extra });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      const prefix = {
        booking: "BK",
        planner: "TP",
        car: "CR",
        visa: "VS",
        contact: "CT",
        partner: "PN",
      }[type];
      assert.match(res.body.data.code, new RegExp(`^VL-${prefix}\\d{6}-[A-Z2-9]{4}$`));
      const doc = saved.at(-1);
      assert.equal(doc.type, type);
      assert.equal(doc.email, "qa@example.com");
      if (type !== "booking") {
        const keys = Object.keys(extra).filter(
          (k) => !["message", "nationality", "hotelClass"].includes(k),
        );
        for (const k of keys) assert.deepEqual(doc.details[k], extra[k], `${type}.${k}`);
      }
    });
  }

  it("đặt tour: giá tính lại ở máy chủ theo bảng giá, lưu thông tin tour", () => {
    const doc = saved.find((d) => d.type === "booking");
    // 3 khách → bậc 2–3, 4★ = 450; bé 5 tuổi 50%
    assert.equal(doc.estimate.total, 900 + 225);
    assert.equal(doc.tour.slug, TOUR.slug);
    assert.equal(doc.hotelClass, 4);
    assert.equal(doc.details.estimateUSD, undefined);
  });

  it("đặt tour bằng đường dẫn cũ vẫn nhận; tour không còn bán → câu báo theo ngôn ngữ khách", async () => {
    const okRes = await post({
      type: "booking",
      name: "QA",
      email: "qa@example.com",
      tourSlug: "old-hanoi-slug",
      departureDate: "2099-03-01",
    });
    assert.equal(okRes.status, 201);
    const bad = await post(
      {
        type: "booking",
        name: "QA",
        email: "qa@example.com",
        tourSlug: "gone-tour",
        departureDate: "2099-03-01",
      },
      "zh",
    );
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, "TOUR_UNAVAILABLE");
    assert.match(bad.body.error.details[0].message, /停售/);
  });

  it("lỗi dữ liệu → câu dễ hiểu theo ngôn ngữ (không lộ chữ kỹ thuật)", async () => {
    const en = await post({ type: "contact", name: "QA", email: "not-an-email" });
    assert.equal(en.status, 422);
    assert.equal(en.body.error.details[0].message, "Please enter a valid email address.");
    const vi = await post({ type: "contact", name: "QA" }, "vi");
    assert.equal(vi.body.error.details[0].message, "Vui lòng nhập email hoặc số điện thoại.");
    const date = await post(
      { type: "car", name: "QA", phone: "+84 912 345 678", date: "2020-01-01" },
      "en",
    );
    assert.equal(date.body.error.details[0].message, "Please choose a future date.");
  });

  it("thiếu / không tick ô đồng ý → 422, câu theo ngôn ngữ khách, không lưu", async () => {
    const before = saved.length;
    const base = { type: "contact", name: "QA", email: "qa@example.com" };
    const cases = [
      [
        { consent: undefined },
        "en",
        "Please tick the box to let us contact you about your request.",
      ],
      [{ consent: false }, "zh", "请勾选同意框，以便我们就您的咨询与您联系。"],
      [
        { consent: "true" },
        "vi",
        "Vui lòng đánh dấu vào ô đồng ý để chúng tôi có thể liên hệ với bạn về yêu cầu này.",
      ],
    ];
    for (const [extra, lang, msg] of cases) {
      const res = await post({ ...base, ...extra }, lang);
      assert.equal(res.status, 422, JSON.stringify(res.body));
      const d = res.body.error.details.find((x) => x.field === "body.consent");
      assert.equal(d?.message, msg);
      assert.equal(res.body.error.details[0].message, msg);
    }
    // mọi loại form đều bắt buộc
    for (const type of Object.keys(FORMS)) {
      const res = await post({ ...base, ...FORMS[type], type, consent: false });
      assert.equal(res.status, 422, type);
    }
    assert.equal(saved.length, before);
  });

  it("lưu bằng chứng đồng ý (thời điểm, phiên bản chính sách, ngôn ngữ); tiếp thị tách riêng", async () => {
    const res = await post({ type: "contact", name: "QA", email: "qa@example.com" }, "vi");
    assert.equal(res.status, 201);
    const doc = saved.at(-1);
    assert.ok(doc.consent.agreedAt instanceof Date);
    assert.equal(doc.consent.policyVersion, PRIVACY_POLICY_VERSION);
    assert.equal(doc.consent.lang, "vi");
    assert.equal(doc.marketingConsentAt, null);
    assert.equal(doc.details.consent, undefined);
    const mk = await post({
      type: "contact",
      name: "QA",
      email: "qa@example.com",
      marketingConsent: true,
    });
    assert.equal(mk.status, 201);
    assert.ok(saved.at(-1).marketingConsentAt instanceof Date);
    assert.equal(saved.at(-1).details.marketingConsent, undefined);
  });

  it("honeypot: giả vờ thành công, không lưu", async () => {
    const before = saved.length;
    const res = await post({
      type: "contact",
      name: "Bot",
      email: "bot@example.com",
      honeypot: "x",
    });
    assert.equal(res.status, 200);
    assert.equal(saved.length, before);
  });

  it("chặn tên trường lạ / toán tử Mongo trong details", async () => {
    const res = await post({
      type: "contact",
      name: "QA",
      email: "qa@example.com",
      $where: "1",
      "a.b": 1,
      nested: { $ne: 1 },
    });
    assert.equal(res.status, 422); // object lồng nhau bị chặn ở validator
    const res2 = await post({
      type: "contact",
      name: "QA",
      email: "qa@example.com",
      $where: "1",
      "a.b": 1,
    });
    assert.equal(res2.status, 201);
    assert.deepEqual(Object.keys(saved.at(-1).details), []);
  });
});

describe("email: chưa có RESEND_API_KEY không làm hỏng form", () => {
  it("mail chưa bật → send trả skipped (không ném lỗi)", async () => {
    const r = await mailService.send({ to: "a@example.com", subject: "x", html: "x" });
    assert.equal(r.ok, false);
    assert.equal(r.skipped, true);
  });

  it("đơn mới: email đánh dấu 'skipped' (không phải 'failed'), đơn vẫn lưu", async () => {
    const statuses = [];
    const restores = [
      stub(counterRepository, "next", async () => 1),
      stub(enquiryRepository, "create", async (doc) => ({
        toObject: () => ({ _id: "x", ...doc }),
      })),
      stub(enquiryRepository, "setEmailStatus", async (_id, s) => statuses.push(s)),
      stub(settingRepository, "get", async () => null),
    ];
    try {
      const r = await enquiryService.createPublic(
        { type: "contact", name: "QA", email: "qa@example.com", lang: "en", details: {} },
        {},
      );
      assert.match(r.code, /^VL-CT/);
      await new Promise((ok) => setTimeout(ok, 20)); // email gửi nền sau khi trả mã
      assert.equal(statuses[0]?.company, "skipped");
    } finally {
      restores.forEach((x) => x());
    }
  });

  it("gửi lại email khi chưa bật → 503 MAIL_NOT_CONFIGURED (câu dễ hiểu)", async () => {
    const restore = stub(enquiryRepository, "findById", async () => ({ _id: "x", code: "VL-1" }));
    try {
      await assert.rejects(
        enquiryService.resendEmail("64b000000000000000000001"),
        (e) => e.code === "MAIL_NOT_CONFIGURED" && !/RESEND|API/.test(e.message),
      );
    } finally {
      restore();
    }
  });

  it("gửi lại email đơn đặt tour → giữ phần nhắc thanh toán online như email gốc", async () => {
    const booking = {
      _id: "x",
      code: "VL-BK1",
      type: "booking",
      name: "QA",
      email: "qa@example.com",
      lang: "en",
      details: {},
      estimate: { currency: "USD", total: 500, lines: [] },
    };
    const sent = [];
    const enabled = Object.getOwnPropertyDescriptor(mailService, "enabled");
    Object.defineProperty(mailService, "enabled", { get: () => true, configurable: true });
    const restores = [
      stub(enquiryRepository, "findById", async () => booking),
      stub(enquiryRepository, "setEmailStatus", async () => {}),
      stub(settingRepository, "get", async () => null),
      stub(mailService, "send", async (m) => (sent.push(m), { ok: true })),
    ];
    try {
      const undo = stub(paymentService, "offerFor", async () => ({ token: "t", amountVnd: 1 }));
      await enquiryService.resendEmail("64b000000000000000000001");
      undo();
      const pay = sent.find((m) => m.to === booking.email);
      assert.match(pay.html, /If you chose to pay online/);

      sent.length = 0;
      const undo2 = stub(paymentService, "offerFor", async () => null); // 9Pay tắt / đã trả đủ
      await enquiryService.resendEmail("64b000000000000000000001");
      undo2();
      assert.doesNotMatch(sent.find((m) => m.to === booking.email).html, /If you chose to pay online/);
    } finally {
      restores.forEach((x) => x());
      Object.defineProperty(mailService, "enabled", enabled);
    }
  });
});

describe("nhật ký: xoá ghi chú nội bộ của đơn", () => {
  it("DELETE /enquiries/:id/notes/:noteId → ghi 'enquiry.note_delete' theo mã đơn", async () => {
    const admin = {
      _id: "64b0000000000000000000a1",
      username: "qa-admin",
      name: "QA",
      role: "admin",
      isActive: true,
      tokenVersion: 0,
    };
    const doc = { _id: "64b000000000000000000099", code: "VL-BK9", type: "booking", name: "QA" };
    const audits = [];
    const restores = [
      stub(userRepository, "findById", async (id) => (String(id) === admin._id ? admin : null)),
      stub(enquiryRepository, "findById", async () => doc),
      stub(enquiryRepository, "removeNote", async () => ({ ...doc, notes: [] })),
      stub(auditService, "record", (_req, action, opts) => audits.push({ action, ...opts })),
    ];
    let res;
    try {
      res = await request(app)
        .delete(`/api/v1/enquiries/${doc._id}/notes/64b000000000000000000001`)
        .set("Cookie", `${ACCESS_COOKIE}=${signAccessToken(admin)}`)
        .set("X-Requested-With", "fetch");
    } finally {
      restores.forEach((x) => x());
    }
    assert.equal(res.status, 200);
    const log = audits.find((a) => a.action === "enquiry.note_delete");
    assert.ok(log, "phải ghi nhật ký xoá ghi chú");
    assert.equal(log.target.id, "VL-BK9");
  });
});

describe("phân quyền: editor vs admin", () => {
  const editor = {
    _id: "64b0000000000000000000e1",
    username: "ed",
    name: "Ed",
    role: "editor",
    isActive: true,
    tokenVersion: 0,
  };
  const cookie = `${ACCESS_COOKIE}=${signAccessToken(editor)}`;
  let restore;
  before(() => {
    restore = stub(userRepository, "findById", async (id) =>
      String(id) === editor._id ? editor : null,
    );
  });
  after(() => restore());

  for (const path of [
    "/api/v1/users",
    "/api/v1/audit-logs",
    "/api/v1/settings/payment",
    "/api/v1/settings/notifications",
    "/api/v1/settings/tracking",
  ])
    it(`editor GET ${path} → 403`, async () => {
      const res = await request(app).get(path).set("Cookie", cookie);
      assert.equal(res.status, 403);
    });

  it("nhân viên cũ (chưa phân quyền) không xoá được đơn → 403", async () => {
    const undo = stub(enquiryRepository, "findById", async () => ({ type: "booking" }));
    let res;
    try {
      res = await request(app)
        .delete("/api/v1/enquiries/64b000000000000000000099")
        .set("Cookie", cookie)
        .set("X-Requested-With", "fetch");
    } finally {
      undo();
    }
    assert.equal(res.status, 403);
  });

  it("editor vào được route nội dung (qua lớp quyền, tới bước kiểm tra dữ liệu)", async () => {
    const res = await request(app)
      .post("/api/v1/admin/themes")
      .set("Cookie", cookie)
      .set("X-Requested-With", "fetch")
      .send({});
    assert.equal(res.status, 422);
  });

  it("token của tài khoản bị khoá / đổi tokenVersion → 401", async () => {
    const stale = `${ACCESS_COOKIE}=${signAccessToken({ ...editor, tokenVersion: 5 })}`;
    const res = await request(app).get("/api/v1/admin/tours").set("Cookie", stale);
    assert.equal(res.status, 401);
  });
});

describe("đường dẫn tour / bài viết", () => {
  it("slug mới trùng slug cũ của mục khác → gỡ khỏi danh sách slug cũ (tránh chuyển hướng nhầm)", async () => {
    const { createContentService } = await import("../src/services/content.service.js");
    const released = [];
    const docs = [{ _id: "a1", slug: "old-a", oldSlugs: [] }];
    const repo = {
      findByIdent: async (v) => docs.find((d) => d.slug === v) ?? null,
      findById: async (id) => docs.find((d) => d._id === id) ?? null,
      create: async (d) => ({ ...d, _id: "n1", toJSON: () => ({ ...d, _id: "n1" }) }),
      updateById: async (id, { $set }) => ({ ...docs.find((d) => d._id === id), ...$set }),
      releaseOldSlug: async (slug, id) => released.push([slug, id]),
    };
    const svc = createContentService({ repo, label: "tour", trackOldSlugs: true });
    await svc.create({ slug: "hanoi-3-days" });
    await svc.update("a1", { slug: "old-a" }); // không đổi slug → không gỡ
    await svc.update("a1", { slug: "new-a" });
    assert.deepEqual(released, [
      ["hanoi-3-days", "n1"],
      ["new-a", "a1"],
    ]);
    await assert.rejects(
      svc.create({ slug: "old-a" }),
      (e) => e.statusCode === 409 && !/slug/i.test(e.message),
    );
  });
});
