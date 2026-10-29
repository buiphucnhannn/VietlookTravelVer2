import { NextResponse } from "next/server";
import { siteConfig } from "@/constants/site";

// Nhận mọi yêu cầu từ form: đặt tour, thiết kế tour, báo giá xe, visa/fast-track, liên hệ, đối tác B2B.
// Bản demo: tạo mã yêu cầu + gửi email nếu cấu hình RESEND_API_KEY. Bản chính thức sẽ lưu vào CMS (MongoDB).

const PREFIX = {
  booking: "BK",
  planner: "TP",
  car: "CR",
  visa: "VS",
  contact: "CT",
  partner: "PN",
};

const recent = new Map(); // chống spam đơn giản theo IP (giới hạn 8 yêu cầu / 10 phút)

function requestCode(type) {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VL-${PREFIX[type] || "RQ"}${ymd}-${rand}`;
}

const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

function summaryHtml(data) {
  const skip = new Set(["honeypot", "lang", "type"]);
  const rows = Object.entries(data)
    .filter(([k, v]) => !skip.has(k) && v !== "" && v != null)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;color:#5b6b77">${escape(k)}</td><td style="padding:6px 12px"><b>${escape(Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : v)}</b></td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows}</table>`;
}

async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "Vietlook Travel <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  return res.ok;
}

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot: bot điền vào ô ẩn -> giả vờ thành công
  if (data.honeypot) return NextResponse.json({ code: requestCode(data.type), ok: true });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= 8) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }
  recent.set(ip, [...hits, now]);

  const type = PREFIX[data.type] ? data.type : "contact";
  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim();
  const phone = String(data.phone || "").trim();
  if (!name || (!email && !phone)) {
    return NextResponse.json({ error: "Name and email or phone are required." }, { status: 422 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 422 });
  }

  const code = requestCode(type);
  const zh = data.lang === "zh";

  // Email thông báo cho doanh nghiệp
  const notifyTo = process.env.NOTIFY_EMAIL || siteConfig.contact.email;
  const businessSent = await sendEmail({
    to: notifyTo,
    subject: `[${code}] New ${type} request from ${name}`,
    html: `<h2>New ${escape(type)} request – ${code}</h2>${summaryHtml(data)}`,
  }).catch(() => false);

  // Email xác nhận cho khách
  const customerSent = email
    ? await sendEmail({
        to: email,
        subject: zh
          ? `[${code}] 我们已收到您的需求 – Vietlook Travel`
          : `[${code}] We received your request – Vietlook Travel`,
        html: zh
          ? `<p>${escape(name)} 您好，</p><p>感谢您联系 Vietlook Travel！您的需求编号为 <b>${code}</b>。我们的旅行顾问将在24小时内与您联系确认并指导付款（银行转账或线下付款，无需在线支付）。</p>${summaryHtml(data)}<p>WhatsApp / 微信 / Zalo：${siteConfig.contact.hotline}</p>`
          : `<p>Dear ${escape(name)},</p><p>Thank you for contacting Vietlook Travel! Your request code is <b>${code}</b>. Our travel expert will contact you within 24 hours to confirm and guide you on payment (bank transfer or in person – no online payment required).</p>${summaryHtml(data)}<p>WhatsApp / WeChat / Zalo: ${siteConfig.contact.hotline}</p>`,
      }).catch(() => false)
    : false;

  // Bản demo: ghi log. Bản chính thức: lưu MongoDB với trạng thái "Mới" để quản lý trong CMS.
  console.info(`[enquiry] ${code}`, { type, name, email, phone, businessSent, customerSent });

  return NextResponse.json({ ok: true, code, emailed: businessSent || customerSent });
}
