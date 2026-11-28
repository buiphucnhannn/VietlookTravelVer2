import { z } from "zod";
import { PHONE_PURPOSES, normalizePhone, phoneDigits } from "../constants/contact.js";
import { email, plainText } from "./common.validator.js";

/**
 * CMS → Thông tin liên hệ. Dữ liệu này hiện trên MỌI trang website + email gửi khách → kiểm tra chặt:
 * số điện thoại chuẩn hoá (+84 98 339 3588), link chỉ https, email đúng dạng, các ô chính bắt buộc.
 */

const LANGS = ["en", "zh", "vi"];
const LANG_NAME = { en: "tiếng Anh", zh: "tiếng Trung", vi: "tiếng Việt" };

const required = (max, label) => plainText(max).pipe(z.string().min(1, `Vui lòng nhập ${label}`));
const optional = (max) => plainText(max).default("");

/** { en, zh, vi } — bắt buộc đủ 3 ngôn ngữ (website hiện đúng ngôn ngữ khách xem) */
const loc3 = (max, label) =>
  z.object(Object.fromEntries(LANGS.map((l) => [l, required(max, `${label} (${LANG_NAME[l]})`)])), {
    error: `Vui lòng nhập ${label}`,
  });

/** Link https (chặn javascript:, data:, http:); `hosts`: chỉ nhận đúng các tên miền này (và tên miền con) */
const httpsUrl = (label, hosts) =>
  z
    .string({ error: `Vui lòng nhập ${label}` })
    .trim()
    .min(1, `Vui lòng nhập ${label}`)
    .max(600, `${label}: tối đa 600 ký tự`)
    .pipe(z.url({ protocol: /^https$/, error: `${label}: link phải bắt đầu bằng https://` }))
    .refine(
      (u) => {
        if (!hosts) return true;
        const host = new URL(u).hostname.toLowerCase();
        return hosts.some((h) => host === h || host.endsWith(`.${h}`));
      },
      { message: `${label}: link chưa đúng trang (${hosts?.join(", ")})` },
    );

const phone = z
  .object({
    number: z
      .string({ error: "Vui lòng nhập số điện thoại" })
      .max(40, "Số điện thoại quá dài")
      .transform((v, ctx) => {
        const n = normalizePhone(v);
        if (!n) {
          ctx.addIssue({
            code: "custom",
            message: "Số điện thoại chưa đúng (VD +84 98 339 3588 hoặc 0983 393 588)",
          });
          return z.NEVER;
        }
        return n;
      }),
    ...Object.fromEntries(PHONE_PURPOSES.map((k) => [k, z.boolean().default(false)])),
  })
  .strip();

export const contactSettingsSchema = z
  .object({
    legalName: required(160, "tên công ty (tiếng Anh)"),
    legalNameVi: required(160, "tên công ty (tiếng Việt)"),
    businessNo: required(40, "mã số doanh nghiệp"),
    licenceNo: required(80, "số giấy phép lữ hành"),
    address: loc3(300, "địa chỉ"),
    streetAddress: required(200, "số nhà, đường (cho Google)"),
    city: required(80, "thành phố (cho Google)"),
    postalCode: optional(20),
    hours: loc3(200, "giờ làm việc"),
    phones: z
      .array(phone, { error: "Vui lòng nhập số điện thoại" })
      .min(1, "Cần ít nhất 1 số điện thoại")
      .max(6, "Tối đa 6 số điện thoại"),
    email,
    wechatId: required(60, "WeChat ID").pipe(
      z.string().regex(/^[\w.-]+$/, "WeChat ID chỉ gồm chữ không dấu, số, dấu gạch và chấm"),
    ),
    lineId: optional(60).pipe(
      z
        .string()
        .regex(/^(@?[\w.-]+)?$/, "LINE ID chỉ gồm chữ không dấu, số, dấu gạch, chấm (và @ ở đầu)"),
    ),
    facebook: httpsUrl("Link Facebook", ["facebook.com", "fb.com"]),
    tripadvisor: httpsUrl("Link Tripadvisor", [
      "tripadvisor.com",
      "tripadvisor.com.vn",
      "tripadvisor.co.uk",
    ]),
    mapsLink: httpsUrl("Link Google Maps", [
      "google.com",
      "google.com.vn",
      "maps.app.goo.gl",
      "goo.gl",
    ]),
    // Khung bản đồ nhúng vào trang Liên hệ: chỉ nhận bản đồ của Google
    mapsEmbed: httpsUrl("Link bản đồ nhúng", ["google.com", "google.com.vn"]).refine(
      (u) => /output=embed|\/maps\/embed/.test(u),
      { message: "Link bản đồ nhúng chưa đúng — dùng link “Nhúng bản đồ” của Google Maps" },
    ),
  })
  .strip()
  .superRefine((v, ctx) => {
    const has = (k) => v.phones.some((p) => p[k]);
    if (!has("call"))
      ctx.addIssue({
        code: "custom",
        path: ["phones"],
        message: "Cần ít nhất 1 số tích “Gọi” (số hotline hiện ở đầu trang)",
      });
    if (!has("whatsapp"))
      ctx.addIssue({
        code: "custom",
        path: ["phones"],
        message: "Cần ít nhất 1 số tích “WhatsApp” (nút chat WhatsApp trên website)",
      });
    if (!has("zalo"))
      ctx.addIssue({
        code: "custom",
        path: ["phones"],
        message: "Cần ít nhất 1 số tích “Zalo” (nút chat Zalo trên website)",
      });
    const seen = new Set();
    v.phones.forEach((p, i) => {
      const d = phoneDigits(p.number);
      if (seen.has(d))
        ctx.addIssue({
          code: "custom",
          path: ["phones", i, "number"],
          message: "Số điện thoại bị trùng",
        });
      seen.add(d);
    });
  });
