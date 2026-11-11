import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { companyEmail, customerEmail } from "../src/emails/templates.js";
import { fmtDate } from "../src/emails/format.js";
import { applyRedirect } from "../src/services/mail.service.js";

const base = {
  name: "Emily Carter",
  email: "emily@example.com",
  phone: "+44 7700 900123",
  nationality: "UK",
  createdAt: new Date("2026-11-10T08:00:00Z"),
};

/** Dữ liệu giống form website gửi lên */
const SAMPLES = {
  booking: {
    ...base,
    type: "booking",
    code: "VL-BK261110-7QX2",
    tour: { slug: "halong", code: "HL02", title: "Halong Bay Cruise" },
    departureDate: "2026-12-20",
    adults: 2,
    childAges: [5],
    hotelClass: 4,
    estimate: {
      total: 1000,
      lines: [
        { label: "2 adult(s) × $400", amount: 800 },
        { label: "Child 5y (50%)", amount: 200 },
      ],
    },
    details: {},
  },
  car: {
    ...base,
    type: "car",
    code: "VL-CR261110-K4M9",
    details: {
      tripType: "oneWay",
      from: "han",
      to: "halong",
      date: "2026-12-20",
      time: "09:00",
      returnDate: "",
      returnTime: "17:00",
      passengers: 4,
      vehicle: "sedan",
      airport: "none",
      flight: "VN123",
      route: "",
      routeSlug: "hanoi-to-halong-bay-private-car-transfer",
      priceUSD: 1120,
      payment: "cash",
      summary: "Route: X · Pickup: 2026-12-20",
    },
  },
  visa: {
    ...base,
    type: "visa",
    code: "VL-VS261110-P2D7",
    details: {
      service: "Fast-track only",
      level: "arr-vip",
      travellers: 2,
      entryDate: "2026-12-20",
      airport: "SGN",
      flight: "SQ186",
    },
  },
  planner: {
    ...base,
    type: "planner",
    code: "VL-TP261110-3HWA",
    details: {
      destinations: ["north-vietnam", "hoi-an"],
      arrival: "2027-01-09",
      flexible: true,
      days: 10,
      adults: 2,
      children: 1,
      hotel: "4",
      tripType: "Private / tailor-made",
      interests: ["Culture & history"],
      budget: "1000-2000",
      requests: "Anniversary",
      contactVia: "Phone",
      someNewField: "abc",
    },
  },
  contact: {
    ...base,
    type: "contact",
    code: "VL-CT261110-Z8RQ",
    message: "Hello",
    details: { subject: "Tour enquiry" },
  },
  partner: {
    ...base,
    type: "partner",
    code: "VL-PN261110-B5TN",
    details: { company: "ACME", country: "China", website: "acme.cn", volume: "5/month" },
  },
};

/** Tên trường / mã thô không được xuất hiện như nhãn hay giá trị */
const RAW = [
  "tripType",
  "returnTime",
  "returnDate",
  "passengers",
  "routeSlug",
  "priceUSD",
  "departureDate",
  "childAges",
  "hotelClass",
  "entryDate",
  "travellers",
  "contactVia",
  "someNewField",
  "oneWay",
  "roundTrip",
  "2026-12-20",
  "north-vietnam",
  "hanoi-to-halong-bay",
  "1000-2000",
];

/** Chỉ phần chữ hiển thị (bỏ thẻ, thuộc tính, link) */
const visible = (html) =>
  html
    .replace(/<head>[\s\S]*?<\/head>/i, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");

describe("email: nhãn dễ đọc, không lộ tên trường thô", () => {
  for (const [type, sample] of Object.entries(SAMPLES)) {
    for (const [kind, render, langs] of [
      ["nhân viên", companyEmail, ["en"]],
      ["khách", customerEmail, ["en", "zh", "vi"]],
    ]) {
      for (const lang of langs) {
        it(`${type} · ${kind} · ${lang}`, () => {
          const mail = render({ ...sample, lang });
          assert.ok(mail.subject.includes(sample.code));
          assert.ok(mail.html.includes(sample.code));
          assert.ok(mail.text.includes(sample.code));
          const text = `${visible(mail.html)}\n${mail.text}`;
          for (const raw of RAW) assert.ok(!text.includes(raw), `"${raw}" lộ ra trong email`);
          assert.ok(mail.html.includes("vietlook-logo"), "có logo");
        });
      }
    }
  }

  it("định dạng giá trị: ngày, tiền, mã xe/sân bay, hạng khách sạn", () => {
    const car = companyEmail({ ...SAMPLES.car, lang: "en" }).text;
    assert.match(car, /Hành trình: Sân bay Nội Bài \(HAN\) → Vịnh Hạ Long/);
    assert.match(car, /Loại chuyến xe: Một chiều/);
    assert.match(car, /Đón \/ tiễn sân bay: Không/);
    assert.match(car, /Giá báo: \$1,120/);
    assert.match(car, /20\/12\/2026 · 09:00/);
    assert.doesNotMatch(car, /Ngày giờ về/); // một chiều → không có giờ về mặc định
    const visa = companyEmail({ ...SAMPLES.visa, lang: "en" }).text;
    assert.match(visa, /Sân bay Tân Sơn Nhất \(SGN\)/);
    assert.match(visa, /Chỉ fast-track/); // lựa chọn tiếng Anh → tiếng Việt cho nhân viên
    const planner = customerEmail({ ...SAMPLES.planner, lang: "zh" }).text;
    assert.match(planner, /越南北部/);
    assert.match(planner, /4★/);
    assert.match(planner, /\$1,000 – \$2,000/);
    assert.match(companyEmail({ ...SAMPLES.planner, lang: "zh" }).text, /Some new field: abc/); // trường lạ → nhãn chữ thường dễ đọc (email nhân viên đủ mọi trường)
    const booking = customerEmail({ ...SAMPLES.booking, lang: "en" }).text;
    assert.match(booking, /2 adults · 1 child \(age 5\)/);
    assert.match(booking, /\$1,000/);
    assert.equal(fmtDate("2026-12-20", "vi"), "CN, 20/12/2026");
  });

  it("tên xe / gói / điểm đến tra từ DB được dùng khi có", () => {
    const mail = customerEmail(
      { ...SAMPLES.car, lang: "vi" },
      { vehicle: { sedan: { en: "Sedan", vi: "Xe 4 chỗ Sedan" } } },
    );
    assert.match(mail.text, /Xe 4 chỗ Sedan/);
  });

  it("nút mở đúng trang quản trị theo mã", () => {
    assert.match(
      companyEmail({ ...SAMPLES.booking, lang: "en" }).html,
      /\/admin\/bookings\?code=VL-BK261110-7QX2/,
    );
    assert.match(
      companyEmail({ ...SAMPLES.car, lang: "en" }).html,
      /\/admin\/requests\?code=VL-CR261110-K4M9/,
    );
  });
});

describe("email: escape dữ liệu khách nhập", () => {
  it("không chèn được HTML / link vào email", () => {
    const evil = '<script>alert(1)</script><a href="http://evil.test">x</a>"onmouseover="y';
    const e = {
      ...SAMPLES.contact,
      lang: "en",
      name: evil,
      message: evil,
      nationality: evil,
      details: { subject: evil, [`x${"a".repeat(3)}`]: evil },
    };
    for (const mail of [companyEmail(e), customerEmail(e)]) {
      assert.ok(!mail.html.includes("<script>"));
      assert.ok(!mail.html.includes('href="http://evil.test"'));
      assert.ok(!mail.html.includes('"onmouseover="'));
      assert.ok(mail.html.includes("&lt;script&gt;"));
    }
  });
});

describe("email: MAIL_REDIRECT_TO", () => {
  const msg = {
    to: ["khach@example.com", "b@example.com"],
    subject: "Hello",
    html: "<html><body><p>x</p></body></html>",
    text: "x",
  };

  it("không đặt → giữ nguyên người nhận", () => {
    const out = applyRedirect(msg, "");
    assert.deepEqual(out.to, msg.to);
    assert.equal(out.subject, "Hello");
  });

  it("có đặt → chỉ gửi tới địa chỉ dev, ghi người nhận thật ở tiêu đề + dải cảnh báo", () => {
    const out = applyRedirect(msg, "dev@example.com");
    assert.deepEqual(out.to, ["dev@example.com"]);
    assert.equal(out.subject, "[DEV → khach@example.com, b@example.com] Hello");
    assert.match(out.html, /<body><table[^>]*>.*khach@example\.com, b@example\.com/s);
    assert.match(out.text, /khach@example\.com/);
  });

  it("dải cảnh báo nằm đầu email thật", () => {
    const mail = customerEmail({ ...SAMPLES.contact, lang: "en" });
    const out = applyRedirect({ to: "a@example.com", ...mail }, "dev@example.com");
    assert.ok(!out.html.includes("<!--DEV_BANNER-->"));
    assert.ok(out.html.indexOf("a@example.com") < out.html.indexOf("vietlook-logo"));
  });
});

describe("email: dạng thư giao dịch (tránh tab Quảng cáo)", () => {
  it("tiêu đề ngắn, không đuôi thương hiệu; header đúng cho khách / nhân viên", () => {
    const cust = customerEmail({ ...SAMPLES.booking, lang: "en" });
    assert.equal(cust.subject, "Your request VL-BK261110-7QX2 has been received");
    assert.ok(!cust.subject.includes("|"));
    assert.deepEqual(cust.headers, { "X-Entity-Ref-ID": "VL-BK261110-7QX2" });
    const staff = companyEmail({ ...SAMPLES.booking, lang: "en" });
    assert.equal(staff.subject, "Đơn đặt tour mới VL-BK261110-7QX2 – Emily Carter");
    assert.equal(staff.headers["Auto-Submitted"], "auto-generated");
    for (const m of [cust, staff]) {
      assert.ok(!("List-Unsubscribe" in m.headers) && !("Precedence" in m.headers));
      assert.equal((m.html.match(/<img\b/g) ?? []).length, 1); // chỉ 1 ảnh (logo)
    }
  });

  it("chuyển hướng dev giữ nguyên header", () => {
    const m = customerEmail({ ...SAMPLES.contact, lang: "en" });
    const out = applyRedirect({ to: "a@example.com", ...m }, "dev@example.com");
    assert.deepEqual(out.headers, m.headers);
  });
});
