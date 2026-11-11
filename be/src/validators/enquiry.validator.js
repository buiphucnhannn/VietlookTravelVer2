import { z } from "zod";
import { ENQUIRY_TYPE_VALUES } from "../constants/content.js";
import { plainText } from "./common.validator.js";

/** Hôm nay theo giờ Việt Nam (YYYY-MM-DD) — ngày đi / nhập cảnh không được là ngày đã qua */
export const todayVN = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

const DATE_FIELDS = ["date", "returnDate", "entryDate", "arrival", "departureDate"];
// Trường cố định đã có cột riêng — không chép lại vào details
const CORE = new Set([
  "type",
  "lang",
  "honeypot",
  "website_url",
  "page",
  "captchaToken",
  "name",
  "email",
  "phone",
  "nationality",
  "notes",
  "message",
  "tour",
  "tourSlug",
  "tourCode",
  "departureDate",
  "adults",
  "children",
  "childAges",
  "estimateUSD",
  "hotelClass",
  "consent",
  "marketingConsent",
]);

const PHONE_RX = /^\+?[\d\s().-]+$/;

/** Giá trị phụ của form: chỉ chữ ngắn / số / boolean / danh sách ngắn (chặn object lồng nhau, payload lớn) */
const extraValue = z.union([
  z.string().max(2000),
  z.number().finite(),
  z.boolean(),
  z.array(z.union([z.string().max(200), z.number().finite()])).max(30),
  z.null(),
]);

export const publicEnquirySchema = z
  .object({
    type: z.enum(ENQUIRY_TYPE_VALUES).default("contact"),
    lang: z.enum(["en", "zh", "vi"]).default("en"),
    honeypot: z.string().max(500).optional().default(""),
    page: z.string().max(300).optional().default(""),
    name: plainText(120).pipe(z.string().min(1, "Name is required")),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .optional()
      .default("")
      .refine((v) => !v || /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v), "Invalid email address."),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .default("")
      .refine((v) => {
        if (!v) return true;
        const digits = v.replace(/\D/g, "").length;
        return PHONE_RX.test(v) && digits >= 6 && digits <= 15;
      }, "Invalid phone number."),
    nationality: plainText(80).optional().default(""),
    notes: plainText(5000).optional().default(""),
    message: plainText(5000).optional().default(""),
    // đặt tour
    tourSlug: z.string().trim().max(160).optional().default(""),
    departureDate: z.string().max(10).optional().default(""),
    adults: z.coerce.number().int().min(1).max(100).optional(),
    childAges: z.array(z.coerce.number().int().min(0).max(17)).max(30).optional().default([]),
    hotelClass: z.coerce.number().int().min(3).max(5).optional(),
    // Khách PHẢI tự tick ô đồng ý Chính sách bảo mật & Điều khoản (NĐ 13/2023, GDPR) — mọi loại form
    consent: z.literal(true, { error: "Consent is required." }),
    // Đồng ý nhận email tiếp thị: tuỳ chọn, tách riêng, không bao giờ bắt buộc
    marketingConsent: z.boolean().optional().default(false),
  })
  .catchall(extraValue)
  .superRefine((d, ctx) => {
    if (!d.email && !d.phone)
      ctx.addIssue({ code: "custom", path: ["email"], message: "Email or phone is required." });
    const today = todayVN();
    for (const k of DATE_FIELDS) {
      const v = d[k];
      if (v == null || v === "") continue;
      if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v < today)
        ctx.addIssue({ code: "custom", path: [k], message: "Please choose a future date." });
    }
    if (d.returnDate && d.date && d.returnDate < d.date)
      ctx.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Please choose a future date.",
      });
    if (d.type === "booking" && !d.tourSlug)
      ctx.addIssue({ code: "custom", path: ["tourSlug"], message: "Tour is required." });
    if (Object.keys(d).length > 70)
      ctx.addIssue({ code: "custom", path: [], message: "Too many fields." });
  })
  .transform((d) => {
    const details = {};
    for (const [k, v] of Object.entries(d)) {
      if (CORE.has(k) || v === "" || v == null) continue;
      if (!/^[a-zA-Z][\w]{0,40}$/.test(k)) continue; // tên trường lạ (vd. "$where", "a.b") → bỏ
      details[k] = v;
    }
    return { ...d, details };
  });

export const lookupCodeParam = z.object({
  code: z
    .string()
    .trim()
    .regex(/^VL-[A-Z]{2}\d{6}-[A-Z0-9]{4,6}$/),
});
