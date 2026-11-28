import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  CONTACT_DEFAULTS,
  emailCompany,
  mergeContact,
  normalizePhone,
  phoneChannels,
} from "../src/constants/contact.js";
import { COMPANY } from "../src/emails/labels.js";
import { customerEmail } from "../src/emails/templates.js";
import { paymentCustomerEmail } from "../src/emails/payment.js";
import { auditLogRepository } from "../src/repositories/audit-log.repository.js";
import { settingRepository } from "../src/repositories/content.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { signAccessToken } from "../src/services/token.service.js";
import { contactSettingsSchema } from "../src/validators/contact.validator.js";

/**
 * CMS → Thông tin liên hệ: mặc định khớp website (siteConfig), kiểm tra dữ liệu, email dùng đúng
 * thông tin đã lưu, phân quyền (admin + nhân viên có quyền "Thông tin liên hệ") + nhật ký — không cần MongoDB thật (thay repository).
 */

const FE = new URL("../../fe/src/", import.meta.url);
const FC = await import(new URL("lib/contact.mjs", FE));
/** constants/site.js (ESM không import) — nạp qua data: URL */
const { siteConfig } = await import(
  `data:text/javascript;charset=utf-8,${encodeURIComponent(await readFile(new URL("constants/site.js", FE), "utf8"))}`
);

const plain = (v) => JSON.parse(JSON.stringify(v));
const valid = () => plain(CONTACT_DEFAULTS);
const parse = (patch) => contactSettingsSchema.safeParse({ ...valid(), ...patch });
const msgs = (r) => r.error.issues.map((i) => i.message).join(" | ");

describe("thông tin liên hệ — mặc định khớp website", () => {
  it("backend ↔ website (lib/contact.mjs): cùng mặc định, cùng cách chuẩn hoá số", () => {
    assert.deepEqual(plain(FC.CONTACT_DEFAULTS), plain(CONTACT_DEFAULTS));
    for (const s of [
      "0983 393 588",
      "+84983393488",
      "0084 98-339-3588",
      "+1 (415) 555-0100",
      "12",
      "abc",
    ])
      assert.equal(FC.normalizePhone(s), normalizePhone(s), s);
    assert.deepEqual(
      FC.phoneChannels(CONTACT_DEFAULTS.phones[0]),
      phoneChannels(CONTACT_DEFAULTS.phones[0]),
    );
  });

  it("chưa lưu gì → website hiện đúng như siteConfig cũ", () => {
    const v = FC.contactView(null);
    const sc = siteConfig;
    assert.equal(v.legalName, sc.legalName);
    assert.deepEqual(v.legal, sc.legal);
    for (const k of ["hotline", "hotlineRaw", "hotline2", "hotline2Raw", "email"])
      assert.equal(v.contact[k], sc.contact[k], k);
    assert.deepEqual(v.contact.address, sc.contact.address);
    assert.deepEqual(v.contact.hours, sc.contact.hours);
    assert.deepEqual(v.contact.channels.hotline, sc.contact.channels.hotline);
    for (const l of ["en", "zh", "vi"])
      assert.equal(v.contact.channels.hotline2[l], sc.contact.channels.hotline2);
    for (const k of ["whatsapp", "whatsapp2", "zalo", "wechatId"])
      assert.equal(v.messaging[k], sc.messaging[k], k);
    assert.deepEqual(v.messaging.linePhones, [sc.contact.hotline, sc.contact.hotline2]);
    for (const k of ["facebook", "tripadvisor", "google"])
      assert.equal(v.social[k], sc.social[k], k);
    assert.equal(v.social.facebookHandle, "/vietlooktravelhanoi");
    assert.deepEqual(v.maps, sc.maps);
  });

  it("email: mặc định giống hệt COMPANY cũ", () => {
    assert.deepEqual(plain(emailCompany(null)), plain(COMPANY));
    assert.equal(COMPANY.whatsapp, siteConfig.messaging.whatsapp);
    assert.equal(COMPANY.zalo, siteConfig.messaging.zalo);
  });

  it("bản lưu thiếu ô / dữ liệu cũ → ô thiếu lấy mặc định", () => {
    const m = mergeContact({ email: "sales@example.com", address: { en: "", vi: "Mới" } });
    assert.equal(m.email, "sales@example.com");
    assert.equal(m.address.vi, "Mới");
    assert.equal(m.address.en, CONTACT_DEFAULTS.address.en);
    assert.deepEqual(m.phones, plain(CONTACT_DEFAULTS.phones));
  });
});

describe("thông tin liên hệ — kiểm tra dữ liệu", () => {
  it("mặc định hợp lệ", () => {
    const r = parse({});
    assert.equal(r.success, true, r.success ? "" : msgs(r));
  });

  it("số điện thoại tự chuẩn hoá; số sai / trùng bị chặn", () => {
    const r = parse({
      phones: [
        { number: "0983 393 588", call: true, zalo: true, whatsapp: true },
        { number: "+1 (415) 555-0100", line: true },
      ],
    });
    assert.equal(r.success, true, r.success ? "" : msgs(r));
    assert.equal(r.data.phones[0].number, "+84 98 339 3588");
    assert.equal(r.data.phones[1].number, "+14155550100");
    assert.equal(r.data.phones[1].call, false);
    const bad = parse({ phones: [{ number: "12ab", call: true, zalo: true, whatsapp: true }] });
    assert.equal(bad.success, false);
    assert.match(msgs(bad), /Số điện thoại chưa đúng/);
    const dup = parse({
      phones: [
        { number: "0983393588", call: true, zalo: true, whatsapp: true },
        { number: "+84 98 339 3588" },
      ],
    });
    assert.match(msgs(dup), /trùng/);
  });

  it("cần ít nhất 1 số Gọi, 1 số WhatsApp, 1 số Zalo", () => {
    const r = parse({ phones: [{ number: "0983393588", line: true }] });
    assert.equal(r.success, false);
    assert.match(msgs(r), /Gọi/);
    assert.match(msgs(r), /WhatsApp/);
    assert.match(msgs(r), /Zalo/);
    assert.equal(parse({ phones: [] }).success, false);
  });

  it("link chỉ https + đúng trang; bản đồ nhúng phải là link nhúng Google", () => {
    assert.match(msgs(parse({ facebook: "http://facebook.com/x" })), /https/);
    assert.equal(parse({ facebook: "javascript:alert(1)" }).success, false);
    assert.match(msgs(parse({ facebook: "https://evil.example.com/vietlook" })), /chưa đúng trang/);
    assert.equal(parse({ facebook: "https://facebook.com.evil.io/x" }).success, false);
    assert.equal(parse({ tripadvisor: "https://www.tripadvisor.com.vn/abc" }).success, true);
    assert.equal(parse({ mapsLink: "https://maps.app.goo.gl/abc123" }).success, true);
    assert.match(msgs(parse({ mapsEmbed: "https://maps.google.com/?cid=1" })), /nhúng/);
    assert.equal(parse({ mapsEmbed: "https://www.google.com/maps/embed?pb=!1m18" }).success, true);
  });

  it("email đúng dạng (tự viết thường); ô bắt buộc; đủ 3 ngôn ngữ địa chỉ", () => {
    const ok = parse({ email: " Sales@VietlookTravel.com " });
    assert.equal(ok.data.email, "sales@vietlooktravel.com");
    assert.match(msgs(parse({ email: "abc@" })), /Email không hợp lệ/);
    assert.match(msgs(parse({ legalName: "  " })), /tên công ty/);
    assert.match(msgs(parse({ wechatId: "" })), /WeChat ID/);
    assert.match(msgs(parse({ wechatId: "a b" })), /WeChat ID/);
    assert.match(msgs(parse({ address: { en: "x", zh: "y", vi: "" } })), /địa chỉ \(tiếng Việt\)/);
    assert.equal(parse({ lineId: "" }).success, true);
    assert.equal(parse({ lineId: "@vietlook" }).success, true);
    // thẻ HTML bị bỏ, giữ chữ
    assert.equal(parse({ legalName: "<b>Vietlook</b> Co" }).data.legalName, "Vietlook Co");
  });
});

describe("thông tin liên hệ — email dùng thông tin đã lưu", () => {
  const custom = emailCompany({
    ...valid(),
    phones: [{ number: "+84 91 234 5678", call: true, zalo: true, whatsapp: true }],
    email: "hello@example.com",
    address: { en: "1 New Street, Hanoi", zh: "新地址", vi: "Số 1 phố Mới" },
    legalNameVi: "Công ty Mới",
  });
  const enquiry = {
    type: "contact",
    code: "VL-RQ261125-AB12",
    name: "Emily",
    email: "emily@example.com",
    lang: "vi",
    details: { subject: "General question", message: "Hi" },
    createdAt: new Date("2026-11-25T00:00:00Z"),
  };

  it("thư xác nhận khách: số gọi, WhatsApp, email, địa chỉ, tên công ty theo bản đã lưu", () => {
    const m = customerEmail(enquiry, { company: custom });
    for (const s of [
      "+84 91 234 5678",
      "https://wa.me/84912345678",
      "hello@example.com",
      "Số 1 phố Mới",
      "Công ty Mới",
    ]) {
      assert.ok(m.text.includes(s), `text thiếu ${s}`);
      assert.ok(m.html.includes(s), `html thiếu ${s}`);
    }
    assert.ok(!m.text.includes(COMPANY.hotline));
    // không truyền → mặc định như cũ
    assert.ok(customerEmail(enquiry).text.includes(COMPANY.hotline));
  });

  it("thư thanh toán: chân thư + nút WhatsApp theo bản đã lưu", () => {
    const e = { ...enquiry, type: "booking", lang: "en", paymentStatus: "paid", payments: [] };
    const m = paymentCustomerEmail(
      e,
      { amount: 1000000, amountUsd: 40, invoiceNo: "INV1" },
      custom,
    );
    assert.ok(m.text.includes("https://wa.me/84912345678"));
    assert.ok(m.text.includes("1 New Street, Hanoi"));
    assert.ok(
      paymentCustomerEmail(e, { amount: 1, invoiceNo: "I2" }).text.includes(COMPANY.whatsapp),
    );
  });
});

describe("thông tin liên hệ — đường dẫn, phân quyền, nhật ký", () => {
  const app = createApp();
  const saved = [];
  const stub = (obj, name, fn) => {
    saved.push([obj, name, obj[name]]);
    obj[name] = fn;
  };
  const ID = {
    admin: "64b7f0c2a1b2c3d4e5f6f001",
    staff: "64b7f0c2a1b2c3d4e5f6f002",
    viewer: "64b7f0c2a1b2c3d4e5f6f003",
    editor: "64b7f0c2a1b2c3d4e5f6f004",
    legacy: "64b7f0c2a1b2c3d4e5f6f005",
  };
  const staff = (id, username, permissions) => ({
    _id: id,
    username,
    role: "editor",
    isActive: true,
    tokenVersion: 0,
    ...(permissions && { permissions }),
  });
  const users = {
    [ID.admin]: { _id: ID.admin, username: "boss", role: "admin", isActive: true, tokenVersion: 0 },
    [ID.staff]: {
      _id: ID.staff,
      username: "ed",
      role: "editor",
      isActive: true,
      tokenVersion: 0,
      permissions: { pages: "full", home: "full" },
    },
    [ID.viewer]: staff(ID.viewer, "viewer", { contact: "view" }),
    [ID.editor]: staff(ID.editor, "contacted", { contact: "edit" }),
    // tài khoản nhân viên cũ (chưa từng phân quyền chi tiết) → quyền cũ, KHÔNG có Thông tin liên hệ
    [ID.legacy]: staff(ID.legacy, "old"),
  };
  const store = {};
  const audits = [];
  before(() => {
    stub(userRepository, "findById", async (id) => users[String(id)] ?? null);
    stub(auditLogRepository, "create", async (doc) => (audits.push(doc), {}));
    stub(settingRepository, "get", async (key) => store[key] ?? null);
    stub(settingRepository, "set", async (key, value) => (store[key] = value));
  });
  after(() => {
    for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
  });
  const call = (id, method, path, body) => {
    const agent = request(app);
    const r = agent[method](`/api/v1${path}`).set("Cookie", `vl_at=${signAccessToken(users[id])}`);
    if (method !== "get") r.set("X-Requested-With", "fetch");
    return body === undefined ? r : r.send(body);
  };

  it("nhân viên không có quyền Thông tin liên hệ (kể cả toàn quyền Giao diện trang, tài khoản cũ) → 403", async () => {
    for (const id of [ID.staff, ID.legacy]) {
      assert.equal((await call(id, "get", "/settings/contact")).status, 403);
      assert.equal((await call(id, "put", "/settings/contact", valid())).status, 403);
    }
    assert.equal(store.contact, undefined);
  });

  it("quyền Xem: đọc được, không lưu được (403)", async () => {
    const r = await call(ID.viewer, "get", "/settings/contact");
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, plain(CONTACT_DEFAULTS));
    assert.equal((await call(ID.viewer, "put", "/settings/contact", valid())).status, 403);
    assert.equal(store.contact, undefined);
  });

  it("admin: chưa lưu → mặc định; dữ liệu sai → 422; lưu được + ghi nhật ký; website đọc được", async () => {
    const first = await call(ID.admin, "get", "/settings/contact");
    assert.equal(first.status, 200);
    assert.deepEqual(first.body.data, plain(CONTACT_DEFAULTS));

    const bad = await call(ID.admin, "put", "/settings/contact", {
      ...valid(),
      facebook: "http://x",
    });
    assert.equal(bad.status, 422);
    assert.equal(store.contact, undefined);

    const body = {
      ...valid(),
      email: "hello@example.com",
      phones: [{ number: "0912345678", call: true, zalo: true, whatsapp: true }],
    };
    const res = await call(ID.admin, "put", "/settings/contact", body);
    assert.equal(res.status, 200);
    assert.equal(store.contact.phones[0].number, "+84 91 234 5678");
    assert.equal(res.body.data.email, "hello@example.com");
    // nhật ký ghi nền (không chờ) → đợi 1 nhịp
    await new Promise((r) => setTimeout(r, 20));
    assert.ok(
      audits.some((a) => a.action === "settings.contact"),
      "thiếu nhật ký settings.contact",
    );

    const site = await request(app).get("/api/v1/public/site");
    assert.equal(site.status, 200);
    assert.equal(site.body.data.contact.phones[0].number, "+84 91 234 5678");
    // email dùng bản vừa lưu
    const { settingsService } = await import("../src/services/settings.service.js");
    assert.equal((await settingsService.emailCompany()).whatsapp, "https://wa.me/84912345678");
  });

  it("quyền Sửa: lưu được (ghi nhật ký settings.contact như admin)", async () => {
    const before = audits.length;
    const res = await call(ID.editor, "put", "/settings/contact", {
      ...valid(),
      email: "staff@example.com",
    });
    assert.equal(res.status, 200);
    assert.equal(store.contact.email, "staff@example.com");
    await new Promise((r) => setTimeout(r, 20));
    assert.ok(audits.slice(before).some((a) => a.action === "settings.contact"));
    assert.equal((await call(ID.editor, "get", "/settings/contact")).status, 200);
  });
});
