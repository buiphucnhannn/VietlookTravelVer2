/**
 * Xem trước mọi email: render mẫu cho từng loại yêu cầu × ngôn ngữ ra file HTML (KHÔNG gửi email, KHÔNG cần DB).
 *   npm run emails:preview            → ghi vào thư mục tạm của máy (in đường dẫn index.html)
 *   npm run emails:preview -- <thư mục>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// env.js bắt buộc MONGODB_URI — script này không kết nối DB nên đặt giá trị giả nếu thiếu
process.env.MONGODB_URI ||= "mongodb://127.0.0.1:1/preview";
process.env.LOG_LEVEL ||= "silent";

const { companyEmail, customerEmail } = await import("../src/emails/templates.js");
const { applyRedirect } = await import("../src/services/mail.service.js");

const outDir = resolve(process.argv[2] || join(tmpdir(), "vietlook-email-preview"));
mkdirSync(outDir, { recursive: true });

const inDays = (n) => {
  const d = new Date(Date.now() + n * 86400_000);
  return d.toISOString().slice(0, 10);
};

const base = {
  name: "Emily Carter",
  email: "emily.carter@example.com",
  phone: "+44 7700 900123",
  nationality: "United Kingdom",
  createdAt: new Date(),
  page: "https://vietlooktravel.vercel.app/en/tours/halong-bay-2-days",
};

/** Mẫu dữ liệu giống hệt dữ liệu form website gửi lên (đã qua validator) */
const SAMPLES = {
  booking: {
    ...base,
    type: "booking",
    code: "VL-BK261110-7QX2",
    tour: {
      slug: "halong-bay-2-days",
      code: "VLT-HL02",
      title: "Halong Bay 2 Days 1 Night Luxury Cruise",
    },
    departureDate: inDays(40),
    adults: 2,
    childAges: [5, 9],
    hotelClass: 4,
    estimate: {
      currency: "USD",
      total: 1120,
      lines: [
        { label: "2 adult(s) × $400", amount: 800 },
        { label: "Child 5y (50%)", amount: 200 },
        { label: "Child 9y (75%)", amount: 300 },
        { label: "Holiday surcharge × 3", amount: 120 },
      ].slice(0, 3),
    },
    message:
      "We'd love a cabin with a balcony if possible.\nOur daughter is vegetarian. Thanks!",
    details: {},
  },
  car: {
    ...base,
    type: "car",
    code: "VL-CR261110-K4M9",
    page: "/en/car-rental",
    message: "2 large suitcases + 1 stroller.",
    details: {
      tripType: "roundTrip",
      from: "han",
      to: "halong",
      date: inDays(30),
      time: "09:00",
      returnDate: inDays(32),
      returnTime: "17:00",
      passengers: 4,
      vehicle: "minivan",
      airport: "none",
      flight: "VN123",
      route: "",
      routeSlug: "hanoi-to-halong-bay-private-car-transfer",
      priceUSD: 145,
      payment: "cash",
      summary:
        "Route: Noi Bai Airport (HAN) → Halong Bay · Pick-up: 2026-12-20 · 09:00 · Total: $145",
    },
  },
  visa: {
    ...base,
    type: "visa",
    code: "VL-VS261110-P2D7",
    page: "/en/visa-fast-track",
    details: {
      service: "Visa on arrival + fast-track",
      level: "arr-voa-vip",
      travellers: 3,
      entryDate: inDays(20),
      airport: "SGN",
      flight: "SQ186",
    },
  },
  planner: {
    ...base,
    type: "planner",
    code: "VL-TP261110-3HWA",
    page: "/en/plan-your-trip",
    details: {
      destinations: ["north-vietnam", "halong-bay", "hoi-an"],
      arrival: inDays(60),
      flexible: true,
      days: 12,
      adults: 2,
      children: 1,
      hotel: "4",
      tripType: "Private / tailor-made",
      interests: ["Culture & history", "Food & cooking", "Beaches & islands"],
      budget: "2000-3500",
      requests: "Celebrating our 10th anniversary – a special dinner would be lovely.",
      contactVia: "WhatsApp",
    },
  },
  contact: {
    ...base,
    type: "contact",
    code: "VL-CT261110-Z8RQ",
    page: "/en/contact",
    message: "Hello, can you arrange a Mekong Delta day trip from Saigon for 6 people in March?",
    details: { subject: "Tour enquiry" },
  },
  partner: {
    ...base,
    type: "partner",
    name: "Liu Wei",
    email: "liu.wei@example.cn",
    phone: "+86 138 0013 8000",
    nationality: "",
    code: "VL-PN261110-B5TN",
    page: "/zh/partners",
    message: "我们是上海的一家旅行社，每月约有 3–5 个越南团，希望了解同业价格。",
    details: {
      company: "Shanghai Sunrise Travel",
      country: "China",
      website: "sunrise-travel.example.cn",
      volume: "3–5 groups / month",
    },
  },
};

/** Tên hiển thị mà enquiry.service tra từ DB (ở đây giả lập) */
const LOOKUPS = {
  vehicle: { minivan: { en: "Minivan / MPV", zh: "MPV商务车", vi: "Minivan / MPV" } },
  level: {
    "arr-voa-vip": {
      en: "Visa on arrival + VIP lane",
      zh: "落地签 + VIP通道",
      vi: "Visa tại cửa khẩu + Làn VIP",
    },
  },
  destinations: {
    "halong-bay": { en: "Halong Bay", zh: "下龙湾", vi: "Vịnh Hạ Long" },
    "hoi-an": { en: "Hoi An", zh: "会安", vi: "Hội An" },
  },
  tourTitle: {
    en: "Halong Bay 2 Days 1 Night Luxury Cruise",
    zh: "下龙湾豪华游轮两日游",
    vi: "Du thuyền 5 sao Vịnh Hạ Long 2 ngày 1 đêm",
  },
};

const files = [];
const write = (name, mail, label) => {
  writeFileSync(join(outDir, `${name}.html`), mail.html);
  writeFileSync(join(outDir, `${name}.txt`), `Subject: ${mail.subject}\n\n${mail.text ?? ""}`);
  files.push({ name, label, subject: mail.subject });
};

for (const [type, sample] of Object.entries(SAMPLES)) {
  write(`${type}-staff`, companyEmail({ ...sample, lang: "en" }, LOOKUPS), `${type} · nhân viên`);
  for (const lang of ["en", "zh", "vi"])
    write(
      `${type}-customer-${lang}`,
      customerEmail({ ...sample, lang }, LOOKUPS),
      `${type} · khách · ${lang}`,
    );
}
// Email chưa có tên xe / gói trong DB (chữ dự phòng) + chế độ chuyển hướng máy dev
write(
  "car-staff-nolookup",
  companyEmail({ ...SAMPLES.car, lang: "zh" }),
  "car · nhân viên · không tra DB",
);
const redirected = applyRedirect(
  { to: SAMPLES.booking.email, ...customerEmail({ ...SAMPLES.booking, lang: "en" }, LOOKUPS) },
  "dev@example.com",
);
write("booking-customer-en-redirect", redirected, "booking · khách · MAIL_REDIRECT_TO");

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
writeFileSync(
  join(outDir, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Email preview</title><body style="font:15px system-ui;max-width:900px;margin:32px auto;padding:0 16px"><h1>Vietlook — xem trước email</h1><ul>${files
    .map(
      (f) =>
        `<li style="margin:6px 0"><a href="${f.name}.html">${esc(f.label)}</a> · <a href="${f.name}.txt">txt</a><br><small>${esc(f.subject)}</small></li>`,
    )
    .join("")}</ul></body>`,
);
console.log(`${files.length} email → ${join(outDir, "index.html")}`);
