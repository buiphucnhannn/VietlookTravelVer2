import { z } from "zod";
import {
  AIRPORT_CODES,
  ENQUIRY_STATUS,
  ENQUIRY_TYPE_VALUES,
  FAST_TRACK_GROUPS,
  PAGE_KEYS,
  PAYMENT_STATUS,
  REGION_VALUES,
} from "../constants/content.js";
import { env } from "../config/env.js";
import { canonicalVideo, cloudinaryVideo, cloudinaryVideoUrl, parseVideo } from "../utils/video.js";
import { email, objectId, pageQuery, searchQuery, slug } from "./common.validator.js";

/* ---------- Kiểu dùng chung ---------- */

const str = (max = 500) => z.string().trim().max(max).default("");
const html = (max = 200_000) => z.string().max(max).default(""); // lọc thẻ ở service (cleanHtml)

/** { en, zh, vi } */
export const loc = (max = 500) =>
  z.object({ en: str(max), zh: str(max), vi: str(max) }).default({});
/** Có chữ ở ít nhất một ngôn ngữ */
export const hasAnyLang = (v) => ["en", "zh", "vi"].some((l) => String(v?.[l] ?? "").trim());
/** { en, zh, vi } bắt buộc: nhập ở ÍT NHẤT MỘT ngôn ngữ (bất kỳ) — các ngôn ngữ còn trống CMS tự dịch */
export const locRequired = (max = 500, message = "Vui lòng nhập tên ở ít nhất một ngôn ngữ") =>
  z
    .object({ en: str(max), zh: str(max), vi: str(max) }, { error: message })
    .refine(hasAnyLang, { message });
export const locHtml = () => z.object({ en: html(), zh: html(), vi: html() }).default({});
const list = (max = 300, items = 100) => z.array(z.string().trim().max(max)).max(items).default([]);
export const locList = () => z.object({ en: list(), zh: list(), vi: list() }).default({});

/**
 * Ảnh: ảnh đã tải lên Cloudinary của website, hoặc ảnh có sẵn trong /public (/images/…, poster /videos/*.webp).
 * Chặn javascript:, data:, link ảnh ngoài (ảnh từ link ngoài phải đi qua "Thêm ảnh từ link" → chép về Cloudinary).
 */
export const media = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) =>
      v === "" ||
      /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/[\w./,%-]+$/.test(v) ||
      (/^\/images\/[\w./ ()-]+\.(jpe?g|png|webp|avif|gif|svg)$/i.test(v) && !v.includes("..")) ||
      (/^\/videos\/[\w./-]+\.(webp|jpe?g|png|avif)$/i.test(v) && !v.includes("..")),
    "Ảnh phải là ảnh đã tải lên / thêm từ link trong CMS hoặc ảnh có sẵn của website",
  );

const VIDEO_LINK_MESSAGE =
  'Link video phải là YouTube hoặc Google Drive (đã chia sẻ "Bất kỳ ai có đường liên kết")';

/** Video (tour…): chỉ link YouTube (công khai / không công khai) hoặc Google Drive đã chia sẻ → lưu dạng chuẩn */
export const videoLink = z
  .string()
  .trim()
  .max(500)
  .transform((v, ctx) => {
    const c = canonicalVideo(v);
    if (!c) {
      ctx.addIssue({ code: "custom", message: VIDEO_LINK_MESSAGE });
      return z.NEVER;
    }
    return c;
  });

/** Video nền đã chép từ Drive về Cloudinary CỦA WEBSITE (đúng tài khoản + thư mục banner) → dạng chuẩn, hoặc null */
export function ownBannerVideo(v) {
  const c = cloudinaryVideo(v);
  if (!c || !env.cloudinary.cloudName || c.cloud !== env.cloudinary.cloudName) return null;
  if (!c.publicId.startsWith(`${env.cloudinary.folder}/banner/`)) return null;
  return cloudinaryVideoUrl(c);
}

/**
 * Video nền banner trang chủ: phải tự phát, tắt tiếng, lặp → YouTube, video có sẵn của website (/videos/*.mp4),
 * hoặc video Google Drive ĐÃ CHÉP về Cloudinary của website (POST /uploads/videos/from-drive) —
 * khung xem của Drive không tự phát làm nền được nên không lưu thẳng link Drive.
 */
export const bannerVideo = z
  .string()
  .trim()
  .max(500)
  .transform((v, ctx) => {
    if (v === "" || (/^\/videos\/[\w./-]+\.(mp4|webm)$/i.test(v) && !v.includes(".."))) return v;
    const own = ownBannerVideo(v);
    if (own) return own;
    const p = parseVideo(v);
    if (p?.provider === "youtube") return canonicalVideo(v);
    ctx.addIssue({
      code: "custom",
      message:
        p?.provider === "drive"
          ? "Video Google Drive cần được chép về website trước khi lưu — hãy dán lại link trong ô video nền"
          : "Video nền phải là link YouTube hoặc Google Drive",
    });
    return z.NEVER;
  });
const mediaList = (max = 40) => z.array(media).max(max).default([]);

const money = z.coerce.number().min(0).max(1_000_000).nullable().default(null);
const seoLang = z.object({ title: str(200), description: str(500) }).default({});
const seo = z.object({ en: seoLang, zh: seoLang, vi: seoLang }).default({});
const order = z.coerce.number().int().min(0).max(100_000).default(0);
const isActive = z.boolean().default(true);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày dạng YYYY-MM-DD");

export const visibilitySchema = z.object({ isActive: z.boolean() });
export const reorderSchema = z.object({
  items: z
    .array(z.object({ id: objectId, order }))
    .min(1)
    .max(500),
});

export const contentListQuery = pageQuery.extend({
  q: searchQuery,
  status: z.enum(["active", "hidden"]).optional(),
  region: z.enum(REGION_VALUES).optional(),
  destination: slug.optional(),
  theme: slug.optional(),
  category: slug.optional(),
  group: z.enum(FAST_TRACK_GROUPS).optional(),
  featured: z.enum(["featured", "long"]).optional(),
  sort: z.enum(["newest", "oldest", "name", "rank", "order", "price"]).optional(),
});

/* ---------- Điểm đến / chủ đề ---------- */

export const destinationSchema = z.object({
  slug,
  region: z.enum(REGION_VALUES),
  name: locRequired(100),
  intro: loc(1000),
  highlights: z.array(loc(100)).max(12).default([]),
  image: media.default(""),
  hero: media.default(""),
  keywords: list(80, 60),
  order,
  isActive,
});

export const themeSchema = z.object({
  slug,
  name: locRequired(80),
  tagline: loc(160),
  intro: loc(1500),
  image: media.default(""),
  banner: media.default(""),
  order,
  isActive,
});

/* ---------- Tour ---------- */

const tourLang = z
  .object({
    title: str(250),
    summary: str(3000),
    route: list(250, 60),
    highlights: list(300, 40),
    itinerary: z
      .array(
        z.object({
          day: z.coerce.number().int().min(0).max(120),
          title: str(300),
          html: html(60_000),
          meals: z
            .array(z.enum(["B", "L", "D"]))
            .max(3)
            .default([]),
          overnight: str(200),
        }),
      )
      .max(120)
      .default([]),
    included: list(500, 80),
    excluded: list(500, 80),
    childPolicy: z.string().max(5000).nullable().default(null),
    notes: z.string().max(10_000).nullable().default(null),
    priceTables: z
      .array(
        z.object({
          heading: z.string().max(300).nullable().default(null),
          period: z.string().max(300).nullable().default(null),
          rows: z
            .array(z.array(z.string().max(2000)).max(12))
            .max(60)
            .default([]),
        }),
      )
      .max(20)
      .default([]),
    faqs: z
      .array(z.object({ q: str(500), a: html(5000) }))
      .max(40)
      .default([]),
  })
  .default({});

export const tourSchema = z
  .object({
    slug,
    code: str(30),
    days: z.coerce.number().int().min(0).max(120).default(1),
    nights: z.coerce.number().int().min(0).max(120).default(0),
    halfDay: z.boolean().default(false),
    destinations: z.array(slug).max(30).default([]),
    themes: z.array(slug).max(8).default([]),
    cruise: z.boolean().default(false),
    tourType: z.enum(["private", "group"]).default("private"),
    price: money,
    originalPrice: money,
    image: media.default(""),
    gallery: mediaList(40),
    videos: z.array(videoLink).max(10).default([]),
    departure: z.enum(["daily", "weekly", "on-request", "dates"]).default("daily"),
    departureDates: z.array(isoDate).max(200).default([]),
    departureDays: z.array(z.coerce.number().int().min(0).max(6)).max(7).default([]),
    content: z
      .object({ en: tourLang, zh: tourLang, vi: tourLang })
      .refine((c) => hasAnyLang({ en: c.en?.title, zh: c.zh?.title, vi: c.vi?.title }), {
        message: "Vui lòng nhập tên tour ở ít nhất một ngôn ngữ",
      }),
    pricing: z
      .object({
        groupTiers: z
          .array(
            z.object({
              minPax: z.coerce.number().int().min(1).max(100),
              maxPax: z.coerce.number().int().min(1).max(100),
              price: z.coerce.number().min(0).max(1_000_000),
              price4: money,
              price5: money,
            }),
          )
          .max(20)
          .default([]),
        childRates: z
          .array(
            z.object({
              minAge: z.coerce.number().int().min(0).max(17),
              maxAge: z.coerce.number().int().min(0).max(17),
              percent: z.coerce.number().min(0).max(100),
            }),
          )
          .max(10)
          .default([]),
        singleSupplement: money,
        holidaySurcharge: money,
        holidayPercent: z.coerce.number().min(0).max(100).nullable().default(null),
        holidayDates: z
          .array(z.string().regex(/^(\d{4}-)?\d{2}-\d{2}$/, "Ngày lễ dạng YYYY-MM-DD hoặc MM-DD"))
          .max(120)
          .default([]),
      })
      .default({}),
    reviews: z
      .array(
        z.object({
          name: str(100),
          country: str(80),
          rating: z.coerce.number().int().min(1).max(5).default(5),
          text: str(3000),
          date: str(20),
          source: str(40),
        }),
      )
      .max(50)
      .default([]),
    seo,
    featured: z.boolean().default(false),
    featuredLong: z.boolean().default(false),
    rank: z.coerce.number().int().min(0).max(100_000).default(1000),
    isActive,
  })
  // Số đêm không quá số ngày (VD 3 ngày 2 đêm, tour trong ngày 1 ngày 0 đêm)
  .refine((t) => t.nights <= t.days, {
    path: ["nights"],
    message: "Số đêm không được nhiều hơn số ngày",
  });

/* ---------- Bài viết / chuyên mục / tác giả ---------- */

export const articleSchema = z.object({
  slug,
  title: locRequired(250, "Vui lòng nhập tiêu đề ở ít nhất một ngôn ngữ"),
  excerpt: loc(1000),
  body: locHtml(),
  image: media.default(""),
  category: z.union([z.literal(""), slug]).default(""),
  author: z.union([z.literal(""), slug]).default("vietlook-team"),
  destination: z.union([z.literal(""), slug]).default(""),
  month: z.coerce.number().int().min(1).max(12).nullable().default(null),
  publishedAt: z.coerce.date().default(() => new Date()),
  seo,
  isActive,
});

export const categorySchema = z.object({
  slug,
  name: locRequired(100),
  description: loc(600),
  group: str(40),
  icon: str(40),
  order,
  isActive,
});

export const authorSchema = z.object({
  slug,
  name: locRequired(100),
  role: loc(160),
  bio: loc(1500),
  avatar: media.default(""),
  order,
  isActive,
});

/* ---------- Dịch vụ: xe, visa, fast-track ---------- */

const key = slug;

export const carSchema = z
  .object({
    key,
    seats: z.coerce.number().int().min(1).max(60),
    pax: z.coerce.number().int().min(1).max(60).default(1),
    luggage: z.coerce.number().int().min(0).max(60).default(0),
    name: locRequired(100),
    tagline: loc(200),
    description: loc(1500),
    images: mediaList(12),
    models: list(80, 20),
    ideal: locList(),
    priceKey: str(30),
    accent: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .default("#1780c1"),
    vip: z.boolean().default(false),
    order,
    isActive,
  })
  // Số khách tối đa không vượt số chỗ của xe (chỗ ngồi đã gồm ghế khách)
  .refine((c) => c.pax <= c.seats, {
    path: ["pax"],
    message: "Số khách không được nhiều hơn số chỗ của xe",
  });

export const carAreaSchema = z.object({
  key,
  name: locRequired(100),
  airport: str(100),
  image: media.default(""),
  order,
  isActive,
});

export const visaTypeSchema = z.object({
  key,
  name: locRequired(150),
  stay: loc(150),
  processing: loc(150),
  fee: loc(200),
  note: loc(600),
  order,
  isActive,
});

export const fastTrackSchema = z.object({
  key,
  group: z.enum(FAST_TRACK_GROUPS),
  name: locRequired(150),
  desc: loc(600),
  prices: z.object(Object.fromEntries(AIRPORT_CODES.map((c) => [c, money]))).default({}),
  popular: z.boolean().default(false),
  vip: z.boolean().default(false),
  order,
  isActive,
});

/* ---------- Trang & cài đặt ---------- */

export const pageKeyParam = z.object({ key: z.enum(PAGE_KEYS) });

/** Video trang giới thiệu: YouTube hoặc Google Drive (website nhúng theo mã video); trống = video mặc định */
export const aboutVideo = z
  .string()
  .trim()
  .max(500)
  .transform((v, ctx) => {
    if (v === "") return v;
    const c = canonicalVideo(v);
    if (c) return c;
    ctx.addIssue({ code: "custom", message: VIDEO_LINK_MESSAGE });
    return z.NEVER;
  });

export const pageSchema = z.object({
  title: loc(200),
  subtitle: loc(600),
  body: locHtml(),
  image: media.default(""),
  // Trang giới thiệu: câu chuyện, tầm nhìn, sứ mệnh, giá trị cốt lõi, ngôn ngữ hướng dẫn viên, lý do chọn Vietlook
  data: z
    .object({
      story: locList(),
      vision: loc(800),
      mission: loc(800),
      values: z
        .array(z.object({ title: loc(100), text: loc(500) }))
        .max(12)
        .default([]),
      people: locList(), // giá trị con người (Chính trực, Chủ động…)
      languages: list(60, 20), // ngôn ngữ hướng dẫn viên
      reasons: z
        .array(z.object({ title: loc(100), text: loc(500) }))
        .max(12)
        .default([]),
      // Các dòng chữ / ảnh / số liệu khác của trang giới thiệu — để trống thì website dùng câu mặc định
      storyEyebrow: loc(80),
      storyTitle: loc(120),
      collage: z.array(media).max(4).default([]), // 4 ảnh cạnh câu chuyện
      visionTitle: loc(60),
      missionTitle: loc(60),
      valuesTitle: loc(120),
      whyTitle: loc(120),
      whySubtitle: loc(300),
      numbersTitle: loc(120),
      stats: z
        .array(z.object({ value: str(20), label: loc(60) }))
        .max(8)
        .default([]),
      video: aboutVideo.default(""), // video YouTube / Google Drive cạnh khối số liệu
      ctaLabel: loc(40),
    })
    .partial()
    .default({}),
  seo,
  isActive,
});

/* Độ dài tối đa của câu chữ trang chủ theo loại */
const homeEyebrow = loc(80); // dòng nhỏ in hoa phía trên tiêu đề
const homeTitle = loc(120);
const homeSubtitle = loc(300);
const homeText = loc(600);
const homeCta = loc(60); // chữ trên nút
const homePoint = loc(160); // 1 gạch đầu dòng
const homeService = z.object({ title: loc(120), text: homeSubtitle, cta: homeCta }).default({});
const homeItems = (shape, max) => z.array(z.object(shape)).max(max).default([]);

/** Banner + câu chữ + các khối trang chủ chọn trong CMS */
export const homeSettingsSchema = z.object({
  banner: z
    .object({
      eyebrow: loc(120), // dòng chữ nhỏ phía trên tiêu đề
      titleTop: loc(80), // tiêu đề dòng 1 (chữ viết tay)
      titleMain: loc(80), // tiêu đề dòng 2 (chữ lớn)
      description: loc(600),
      descriptionShort: loc(300), // bản ngắn cho điện thoại
      // video nền máy tính + poster (ảnh) điện thoại; mỗi slide có chú thích ảnh
      slides: z
        .array(
          z.object({
            video: bannerVideo.default(""),
            videoMobile: bannerVideo.default(""),
            poster: media.default(""),
            posterMobile: media.default(""),
            caption: loc(150),
          }),
        )
        .max(8)
        .default([]),
    })
    .default({}),
  featuredTours: z
    .array(slug)
    .max(24)
    .default([])
    .transform((a) => a.slice(0, 8)), // tour nổi bật (tối đa 8)
  longTours: z
    .array(slug)
    .max(24)
    .default([])
    .transform((a) => a.slice(0, 8)), // tour dài ngày (tối đa 8)
  homeThemes: z.array(slug).max(8).default([]), // chủ đề hiện ở trang chủ (trống = tất cả)
  featuredDestinations: z.array(slug).max(5).default([]), // 5 ô lớn của lưới điểm đến
  // Câu chữ các khối trang chủ (cùng tên khoá với từ điển giao diện fe: dict.home) —
  // ô để trống thì website dùng câu mặc định của từ điển
  copy: z
    .object({
      trust: homeItems({ t: loc(60), d: loc(120) }, 5),
      servicesEyebrow: homeEyebrow,
      servicesTitle: homeTitle,
      servicesSubtitle: homeSubtitle,
      services: z
        .object({ tours: homeService, car: homeService, visa: homeService })
        .partial()
        .default({}),
      b2bEyebrow: homeEyebrow,
      b2bTitle: homeTitle,
      b2bAudiences: z.array(loc(60)).max(4).default([]),
      b2bText: homeText,
      b2bPoints: z.array(homePoint).max(4).default([]),
      b2bCta: homeCta,
      mapEyebrow: homeEyebrow,
      mapTitle: homeTitle,
      mapSubtitle: homeSubtitle,
      gridEyebrow: homeEyebrow,
      gridTitle: homeTitle,
      gridSubtitle: homeSubtitle,
      heritageEyebrow: homeEyebrow,
      heritageTitle: homeTitle,
      heritageText: homeSubtitle,
      heritageStats: homeItems({ label: loc(80) }, 6),
      longToursTitle: homeTitle,
      longToursSubtitle: homeSubtitle,
      longToursCta: homeCta,
      featuredEyebrow: homeEyebrow,
      featuredTitle: homeTitle,
      featuredSubtitle: homeSubtitle,
      featuredCta: homeCta,
      stepsEyebrow: homeEyebrow,
      stepsTitle: homeTitle,
      steps: homeItems({ title: loc(120), text: homeSubtitle }, 5),
      themesTitle: homeTitle,
      themesSubtitle: homeSubtitle,
      customEyebrow: homeEyebrow,
      customTitle: homeTitle,
      customSubtitle: homeSubtitle,
      customText: homeText,
      customPoints: z.array(homePoint).max(5).default([]),
      customCta: homeCta,
      whyTitle: homeTitle,
      whySubtitle: homeSubtitle,
      why: homeItems({ title: loc(120), text: homeSubtitle }, 6),
      partnerStrip: homeTitle,
      partnersEyebrow: homeEyebrow,
      projectsTitle: homeTitle,
      partnersSubtitle: homeSubtitle,
      projects: homeItems({ title: loc(120), text: homeSubtitle }, 3),
      partnersCta: homeCta,
      reviewsEyebrow: homeEyebrow,
      reviewsTitle: homeTitle,
      reviewsSubtitle: homeSubtitle,
      guideEyebrow: homeEyebrow,
      guideTitle: homeTitle,
      guideSubtitle: homeSubtitle,
      guideCta: homeCta,
      monthEyebrow: homeEyebrow,
      monthTitle: homeTitle,
      monthSubtitle: homeSubtitle,
      plannerTitle: homeTitle,
      plannerSubtitle: homeSubtitle,
      aboutTitle: homeTitle,
      aboutSubtitle: homeSubtitle,
      aboutText: loc(1200),
      aboutCta: homeCta,
    })
    .partial()
    .default({}),
  // Con số ở khối "Vietlook qua những con số" (6 ô) — trống = website tự tính
  statValues: z.array(str(12)).max(6).default([]),
  // Tên địa điểm hiện khi rê chuột lên 6 cánh ngôi sao (khối "Thiết kế tour") — trống = tên có sẵn
  starLabels: z.array(loc(60)).max(6).default([]),
  // Ảnh các khối trang chủ do nhân viên thay — ô trống ("") = website dùng ảnh có sẵn
  images: z
    .object({
      services: z
        .object({
          tours: media.default(""),
          car: media.default(""),
          visa: media.default(""),
        })
        .default({}),
      star: z.array(media).max(6).default([]), // 6 cánh ngôi sao dải lụa (khối "Thiết kế tour")
      b2bNorth: z.array(media).max(3).default([]), // khung ảnh lớn khối đối tác (đổi luân phiên)
      b2bSouth: z.array(media).max(3).default([]), // khung ảnh nhỏ khối đối tác
      about: media.default(""), // ảnh khối "Về chúng tôi"
    })
    .default({}),
});

export const notificationSettingsSchema = z.object({
  recipients: z.array(email).max(10).default([]), // email nhận đơn / form
  replyTo: z.union([z.literal(""), email]).default(""),
  sendCustomerConfirmation: z.boolean().default(true),
});

/** Mã đo lường: chỉ nhận đúng định dạng của Google (chặn chèn script lạ qua ô nhập) */
const trackingId = (rx, label) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .max(30)
    .refine((v) => v === "" || rx.test(v), `Mã ${label} không đúng định dạng`)
    .default("");
export const trackingSettingsSchema = z.object({
  gtmId: trackingId(/^GTM-[A-Z0-9]{4,12}$/, "Google Tag Manager (GTM-XXXXXXX)"),
  ga4Id: trackingId(/^G-[A-Z0-9]{6,14}$/, "Google Analytics (G-XXXXXXXXXX)"),
  adsId: trackingId(/^AW-[0-9]{6,14}$/, "Google Ads (AW-XXXXXXXXX)"),
});

export const paymentSettingsSchema = z.object({
  provider: z.literal("9pay").default("9pay"),
  enabled: z.boolean().default(false),
  environment: z.literal("production").default("production"), // chỉ chạy thật
  merchantKey: str(200),
  // để trống = giữ nguyên secret đã lưu
  secretKey: z.string().trim().max(500).optional(),
  checksumKey: z.string().trim().max(500).optional(),
  accountName: str(200), // tên tài khoản nhận tiền (hiển thị nội bộ)
  // Tỷ lệ đặt cọc khi khách thanh toán online: 100 = trả đủ; vd. 30 = cọc 30%
  depositPercent: z.coerce.number().int().min(10).max(100).optional(),
});

/* ---------- Đơn / yêu cầu ---------- */

export const enquiryListQuery = pageQuery.extend({
  q: searchQuery, // mã, tên, email, SĐT
  type: z.enum(ENQUIRY_TYPE_VALUES).optional(),
  kind: z.enum(["bookings", "requests"]).optional(),
  status: z.enum(ENQUIRY_STATUS).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS).optional(),
  emailFailed: z.enum(["1"]).optional(),
});

export const enquiryUpdateSchema = z
  .object({
    status: z.enum(ENQUIRY_STATUS).optional(),
    paymentStatus: z.enum(PAYMENT_STATUS).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Không có thay đổi nào");

export const noteSchema = z.object({ text: z.string().trim().min(1).max(2000) });
export const noteParam = z.object({ id: objectId, noteId: objectId });
