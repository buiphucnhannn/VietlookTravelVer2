import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { companyEmail, customerEmail } from "../src/emails/templates.js";
import { describeEnquiry, fmtDate, fmtDateTime, optionCode } from "../src/emails/format.js";
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
    assert.match(car, /20\/12\/2026 · 09:00/); // email nhân viên → dd/mm/yyyy
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
    // Ngày theo ngôn ngữ người đọc: vi dd/mm/yyyy · en mm/dd/yyyy · zh yyyy年m月d日
    assert.equal(fmtDate("2026-12-20", "vi"), "20/12/2026");
    assert.equal(fmtDate("2026-12-20", "en"), "12/20/2026");
    assert.equal(fmtDate("2026-12-05", "zh"), "2026年12月5日");
    assert.equal(fmtDate("2026-12-20"), "20/12/2026"); // mặc định: nhân viên (tiếng Việt)
    assert.equal(fmtDateTime("2026-11-27T07:05:00Z", "vi"), "27/11/2026 14:05");
    assert.equal(fmtDateTime("2026-11-27T17:30:00Z", "en"), "11/28/2026 00:30 (GMT+7)");
    assert.equal(fmtDateTime("2026-11-27T07:05:00Z", "zh"), "2026年11月27日 14:05（越南时间）");
    assert.match(customerEmail({ ...SAMPLES.booking, lang: "vi" }).text, /\d{2}\/\d{2}\/\d{4}/);
    assert.match(
      customerEmail({ ...SAMPLES.booking, lang: "zh" }).text,
      /\d{4}年\d{1,2}月\d{1,2}日/,
    );
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

describe("thiết kế tour: mã loại chuyến / sở thích → chữ theo ngôn ngữ người đọc", () => {
  const text = (details, lang) => {
    const { rows } = describeEnquiry({ type: "planner", details }, lang);
    return Object.fromEntries(rows.map((r) => [r.key, r.text]));
  };

  it("mã mới → chữ tiếng Việt / Anh / Trung", () => {
    const d = { tripType: "corporate", interests: ["culture", "honeymoon"] };
    assert.deepEqual(text(d, "vi"), {
      tripType: "Công ty / incentive",
      interests: "Văn hóa & lịch sử, Trăng mật & lãng mạn",
    });
    assert.equal(text(d, "en").tripType, "Company / incentive");
    assert.equal(text(d, "zh").interests, "文化与历史, 蜜月与浪漫");
  });

  it("đơn cũ lưu chữ theo ngôn ngữ khách vẫn hiện đúng ngôn ngữ người đọc", () => {
    assert.deepEqual(text({ tripType: "私人/定制游", interests: ["Beaches & islands"] }, "vi"), {
      tripType: "Tour riêng / thiết kế riêng",
      interests: "Biển & đảo",
    });
    assert.equal(optionCode("tripType", "Tour ghép đoàn"), "group");
    assert.equal(optionCode("tripType", "b2b"), "b2b");
    assert.equal(optionCode("interests", "lạ"), "lạ");
    assert.equal(optionCode("subject", "Other"), "Other");
  });
});

describe("email: multipart, UTF-8, escape, tránh tab Quảng cáo", async () => {
  const { paymentCompanyEmail, paymentCustomerEmail } = await import("../src/emails/payment.js");
  const { buildPayload, fromAddress, htmlToText } = await import("../src/services/mail.service.js");

  const booking = {
    ...SAMPLES.booking,
    paymentStatus: "deposit",
    payments: [{ status: "paid", amountUsd: 300 }],
  };
  const attempt = {
    amount: 7_650_000,
    amountUsd: 300,
    rate: 25_500,
    paidAt: new Date("2026-11-10T08:00:00Z"),
    transactionId: "9P-1",
    invoiceNo: "INV-1",
  };
  /** Mọi email hệ thống gửi đi: [tên, mail] */
  const ALL = [
    ...Object.entries(SAMPLES).flatMap(([type, s]) => [
      [`${type} · nhân viên`, companyEmail({ ...s, lang: "en" })],
      ...["en", "zh", "vi"].map((l) => [
        `${type} · khách · ${l}`,
        customerEmail({ ...s, lang: l }),
      ]),
    ]),
    ["thanh toán · nhân viên", paymentCompanyEmail({ ...booking, lang: "en" }, attempt)],
    ...["en", "zh", "vi"].map((l) => [
      `thanh toán · khách · ${l}`,
      paymentCustomerEmail({ ...booking, lang: l }, attempt),
    ]),
  ];

  /** Từ / dấu hiệu kiểu thư quảng cáo — không được có trong thư giao dịch */
  const BANNED =
    /\b(free|deal|deals|discount|sale|offer|promo|promotion|unsubscribe|limited time|act now|click here)\b|ưu đãi|khuyến mãi|giảm giá|miễn phí|hủy đăng ký|优惠|促销|免费|折扣|退订|!!|\?\?/i;
  const EMOJI = /\p{Extended_Pictographic}/u;

  for (const [name, m] of ALL) {
    it(name, () => {
      // multipart/alternative: phần text thật, không còn thẻ / thực thể HTML
      assert.ok(m.text && m.text.length > 80, "có phần text/plain");
      assert.doesNotMatch(m.text, /<[a-z/][^>]*>|&(amp|lt|gt|quot|#\d+);/i);
      // UTF-8 + bố cục gọn
      assert.match(m.html, /<meta charset="utf-8">/);
      assert.ok(Buffer.byteLength(m.html) < 30_000, `HTML ${Buffer.byteLength(m.html)} byte`);
      assert.doesNotMatch(m.html, /<link\b|@import|fonts\.googleapis/); // không CSS / font ngoài
      assert.equal((m.html.match(/<img\b/g) ?? []).length, 1); // chỉ logo
      assert.match(m.html, /<img [^>]*width="96" height="50" alt="Vietlook Travel"/);
      // ít link http(s), không tham số theo dõi
      const links = [...m.html.matchAll(/href="(https?:[^"]*)"/g)].map((x) => x[1]);
      assert.ok(links.length <= 3, `${links.length} link`);
      for (const l of links) assert.doesNotMatch(l, /utm_|fbclid|gclid/);
      // tiêu đề: 1 dòng, ngắn, có mã, không CHỮ HOA toàn bộ / emoji / dấu câu spam
      assert.doesNotMatch(m.subject, /[\r\n]/);
      assert.ok(m.subject.length <= 90, m.subject);
      assert.doesNotMatch(m.subject, /!|\b[A-Z]{5,}\b(?<!VL-[A-Z0-9-]*)/);
      assert.ok(!EMOJI.test(m.subject));
      // không từ ngữ / emoji quảng cáo trong nội dung do hệ thống viết
      for (const part of [m.subject, visible(m.html), m.text]) assert.doesNotMatch(part, BANNED);
      assert.ok(!EMOJI.test(m.text));
      // không header thư hàng loạt
      assert.ok(m.headers["X-Entity-Ref-ID"]);
      for (const h of ["List-Unsubscribe", "Precedence", "List-Id"]) assert.ok(!(h in m.headers));
    });
  }

  it("tiêu đề khách đúng ngôn ngữ, giữ nguyên tiếng Việt / chữ Hán", () => {
    const s = (lang) => customerEmail({ ...SAMPLES.car, lang }).subject;
    assert.equal(s("vi"), "Yêu cầu VL-CR261110-K4M9 của bạn đã được tiếp nhận");
    assert.equal(s("zh"), "您的需求 VL-CR261110-K4M9 已收到");
    assert.equal(s("en"), "Your request VL-CR261110-K4M9 has been received");
    assert.equal(
      paymentCustomerEmail({ ...booking, lang: "vi" }, attempt).subject,
      "Đã nhận tiền đặt cọc cho đơn VL-BK261110-7QX2",
    );
    assert.equal(
      paymentCustomerEmail({ ...booking, lang: "zh" }, attempt).subject,
      "预订 VL-BK261110-7QX2 定金已收到",
    );
  });

  it("dữ liệu khách có &, <, nháy, tiếng Việt, chữ Hán, emoji: escape 1 lần, text giữ nguyên", () => {
    const name = `Nguyễn "Hương" & <Lê> 李小龙 😊`;
    const message = "Tôi & gia đình\n我想去 <下龙湾> 🏝️";
    const e = { ...SAMPLES.contact, name, message, details: { subject: "A & B" } };
    for (const m of [customerEmail({ ...e, lang: "vi" }), companyEmail({ ...e, lang: "zh" })]) {
      assert.ok(m.html.includes("Nguyễn &quot;Hương&quot; &amp; &lt;Lê&gt; 李小龙 😊"));
      assert.doesNotMatch(m.html, /&amp;(amp|lt|gt|quot|#39);/); // không escape 2 lần
      assert.ok(m.text.includes(name));
      assert.doesNotMatch(m.text, /&amp;|&lt;|&quot;/);
    }
    const staff = companyEmail({ ...e, lang: "zh" });
    assert.ok(staff.html.includes("Tôi &amp; gia đình<br>我想去 &lt;下龙湾&gt; 🏝️"));
    assert.ok(staff.text.includes(message));
    // tên nhiều dòng không làm vỡ tiêu đề
    const multi = companyEmail({ ...e, name: "A\r\nBcc: x@y.z", lang: "en" });
    assert.doesNotMatch(multi.subject, /[\r\n]/);
  });

  it("chữ / link dài được ngắt dòng", () => {
    const m = companyEmail({ ...SAMPLES.contact, message: `x${"a".repeat(300)}`, lang: "en" });
    assert.match(m.html, /word-break:break-word[^>]*>xaaaa/);
  });

  it("font an toàn tiếng Việt + chữ Hán, không font web", () => {
    const html = customerEmail({ ...SAMPLES.contact, lang: "zh" }).html;
    assert.match(html, /font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto/);
    assert.match(html, /'PingFang SC'.*'Microsoft YaHei'.*sans-serif/);
    assert.match(html, /<html lang="zh-CN"/);
  });

  it("thân request Resend: From có tên, luôn có text, X-Entity-Ref-ID riêng mỗi lần, bỏ header hàng loạt", () => {
    assert.equal(
      fromAddress("booking@vietlooktravel.com"),
      "Vietlook Travel <booking@vietlooktravel.com>",
    );
    assert.equal(fromAddress("Vietlook Travel <a@b.c>"), "Vietlook Travel <a@b.c>");
    const m = customerEmail({ ...SAMPLES.contact, lang: "vi" });
    const a = buildPayload({ to: ["k@example.com"], replyTo: "sales@example.com", ...m });
    const b = buildPayload({
      to: ["k@example.com"],
      ...m,
      headers: { ...m.headers, "List-Unsubscribe": "<mailto:x>", Precedence: "bulk" },
    });
    assert.equal(a.text, m.text);
    assert.equal(a.reply_to, "sales@example.com");
    assert.match(a.from, /^Vietlook Travel </);
    assert.match(a.headers["X-Entity-Ref-ID"], /^VL-CT261110-Z8RQ\.[0-9a-f]{8}$/);
    assert.notEqual(a.headers["X-Entity-Ref-ID"], b.headers["X-Entity-Ref-ID"]);
    assert.ok(!("List-Unsubscribe" in b.headers) && !("Precedence" in b.headers));
    // JSON giữ nguyên UTF-8 (tiếng Việt không bị đổi mã)
    assert.ok(JSON.stringify(a).includes("của bạn đã được tiếp nhận"));
    // thiếu text → tự sinh từ HTML (không thẻ, không thực thể)
    const c = buildPayload({ to: ["k@example.com"], subject: "x\ny", html: m.html });
    assert.equal(c.subject, "x y");
    assert.match(c.text, /Xin chào Emily Carter,/);
    assert.doesNotMatch(c.text, /<[a-z]|&amp;/);
    assert.equal(htmlToText("<p>A &amp; B &lt;3</p>"), "A & B <3");
  });
});

describe("mã lựa chọn của mọi form → chữ dễ hiểu (email) + khớp bản trang quản trị", () => {
  const rows = (e, lang = "vi", lookups) =>
    Object.fromEntries(describeEnquiry(e, lang, lookups).rows.map((r) => [r.key, r.text]));
  const facts = (e, lang = "vi", lookups) =>
    Object.fromEntries(describeEnquiry(e, lang, lookups).facts.map((r) => [r.key, r.text]));

  it("thiết kế tour: ngân sách theo hạng, nhịp độ, nơi ở, số khách, điểm đến cũ", () => {
    const e = {
      type: "planner",
      details: {
        destinations: ["hanoi", "halong", "north-vietnam"],
        travelers: 2,
        budget: "mid",
        pace: "relaxed",
        accommodation: "boutique",
        source: "friend",
      },
    };
    const names = {
      destinations: { hanoi: { vi: "Hà Nội" }, "halong-bay": { vi: "Vịnh Hạ Long" } },
    };
    assert.equal(facts(e, "vi", names).destinations, "Hà Nội, Vịnh Hạ Long, Miền Bắc");
    // không tra được DB → tên địa danh có sẵn, rồi chữ in hoa — không bao giờ hiện mã thô
    assert.equal(facts(e, "en").destinations, "Hanoi (city centre), Halong Bay, North Vietnam");
    assert.equal(
      facts({ type: "planner", details: { destinations: ["sa-pa"] } }, "en").destinations,
      "Sa Pa",
    );
    assert.equal(facts(e).budget, "Tầm trung");
    assert.equal(facts(e, "en").budget, "Mid-range");
    assert.deepEqual(
      {
        pace: rows(e).pace,
        accommodation: rows(e).accommodation,
        source: rows(e).source,
        travelers: rows(e).travelers,
      },
      {
        pace: "Thong thả, nhiều thời gian nghỉ",
        accommodation: "Khách sạn nhỏ, phong cách riêng",
        source: "Bạn bè giới thiệu",
        travelers: "2 khách",
      },
    );
    assert.equal(rows(e, "zh").pace, "轻松");
  });

  it("xe: hạng xe đã xoá khỏi CMS vẫn có tên; visa: loại visa / số lần nhập cảnh", () => {
    assert.equal(facts({ type: "car", details: { vehicle: "coach29" } }).vehicle, "Xe 29 chỗ");
    // gói fast-track đã xoá khỏi CMS → đọc từng phần của mã
    assert.equal(
      facts({ type: "visa", details: { level: "arr-voa-vip" } }).level,
      "Nhập cảnh · visa tại cửa khẩu · làn VIP",
    );
    assert.equal(
      facts({ type: "visa", details: { level: "dep-fast-track" } }, "en").level,
      "Departure · fast-track",
    );
    assert.equal(
      facts({ type: "car", details: { vehicle: "suv" } }, "en").vehicle,
      "SUV (7 seats)",
    );
    const v = rows({
      type: "visa",
      details: {
        visaType: "evisa",
        entries: "multiple",
        processing: "urgent",
        purpose: "business",
      },
    });
    assert.deepEqual(v, {
      visaType: "Visa điện tử (e-visa)",
      entries: "Nhập cảnh nhiều lần",
      processing: "Gấp",
      purpose: "Công tác",
    });
    assert.equal(
      rows({ type: "partner", details: { companyType: "operator" } }, "en").companyType,
      "Tour operator",
    );
  });

  it("bản sao ở trang quản trị (fe/src/components/admin/labels.js) giống hệt bản email", async (t) => {
    const url = new URL("../../fe/src/components/admin/labels.js", import.meta.url);
    const { existsSync } = await import("node:fs");
    if (!existsSync(url)) return t.skip("không có thư mục fe");
    const fe = await import(url.href);
    const be = await import("../src/emails/labels.js");
    assert.deepEqual(fe.ENQUIRY_OPTIONS, be.ENQUIRY_OPTIONS);
    assert.deepEqual(fe.OPTION_LISTS, be.OPTION_LISTS);
    assert.deepEqual(
      fe.PACKAGE_WORDS,
      Object.fromEntries(Object.entries(be.PACKAGE_WORD).map(([k, v]) => [k, v.vi])),
    );
    assert.equal(
      fe.detailText("level", "arr-voa-vip", { type: "visa" }),
      "Nhập cảnh · visa tại cửa khẩu · làn VIP",
    );
    assert.deepEqual(
      fe.VEHICLE_NAMES,
      Object.fromEntries(Object.entries(be.VEHICLE_NAME).map(([k, v]) => [k, v.vi])),
    );
    // trang quản trị đọc cùng mã ra cùng chữ tiếng Việt
    const rowsFe = Object.fromEntries(
      fe.detailRows(
        {
          destinations: ["hanoi", "halong"],
          budget: "mid",
          tripType: "roundTrip",
          subject: "线路咨询",
          returnTime: "17:00",
        },
        { type: "car", names: { destinations: { hanoi: "Hà Nội", "halong-bay": "Vịnh Hạ Long" } } },
      ),
    );
    assert.deepEqual(rowsFe, {
      "Điểm đến": "Hà Nội, Vịnh Hạ Long",
      "Ngân sách": "Tầm trung",
      "Loại chuyến xe": "Khứ hồi",
      "Chủ đề": "Hỏi về tour",
      "Giờ về": "17:00",
    });
    // chuyến một chiều → không hiện giờ về mặc định
    assert.equal(
      fe.detailRows({ tripType: "oneWay", returnTime: "17:00" }, { type: "car" }).length,
      1,
    );
  });
});
