/**
 * GIAO DIỆN TRANG — nhóm "Tour & du thuyền": /tours, 3 trang du thuyền, /packages.
 * Gộp vào PAGE_COPY ở ../registry.mjs (xem hướng dẫn đầy đủ ở đầu file đó). Bản kiểm tra dữ liệu bên máy chủ:
 * be/src/constants/page-copy/tours.js — thêm / sửa ô ở đây thì chép đúng kiểu + max + count sang đó.
 *
 * Danh sách tour, du thuyền, gói tour và giá là dữ liệu của mục Tour (không sửa ở đây).
 * File này KHÔNG import gì (dữ liệu thuần) để backend test đọc được trực tiếp.
 */

/* Kiểu ô — giống hệt ../registry.mjs (chép lại vì registry.mjs import file này) */
const text = (label, def, max = 160, extra) => ({ type: "text", label, def, max, ...extra });
const para = (label, def, max = 600, extra) => ({ type: "para", label, def, max, ...extra });
const image = (label, def, crop, extra) => ({ type: "image", label, def, crop, ...extra });
const list = (label, def, count, item, extra) => ({
  type: "list",
  label,
  def,
  count,
  item,
  ...extra,
});

const BG_CROP = { ratio: 16 / 9, width: 1920 };
/** 3 ảnh ghép đầu trang (BrushHero): mỗi ảnh 1 dải dọc, điện thoại chỉ hiện ảnh đầu */
const heroImages = (defs) =>
  list("Ảnh nền đầu trang", defs, 3, image("Ảnh nền", null, { ratio: 3 / 4, width: 1200 }));

/** Hộp "Chưa chọn được tour?" dưới danh sách */
const advice = {
  adviceTitle: text("Tiêu đề hộp tư vấn dưới danh sách", "tours.notSureTitle", 120),
  adviceText: para("Mô tả hộp tư vấn", "tours.notSureText", 400),
  adviceCta: text("Nút hộp tư vấn", "tours.notSureCta", 50),
};

/** 1 trang du thuyền (dùng chung components/tours/CruisePage.js) */
const cruise = (name, path, images, title, intro, summary) => ({
  name,
  group: "Tour & du thuyền",
  path,
  summary,
  thumb: "heroImages.0",
  fields: {
    heroImages: heroImages(images),
    heroTitle: text("Tiêu đề trang", title, 160),
    heroIntro: para("Đoạn giới thiệu", intro, 600),
    ...advice,
  },
});

/** Khối 1 / 2 / 3 tuần của trang Gói tour (cũng là lời giới thiệu khi lọc 1 / 2 / 3 tuần ở trang Tất cả tour) */
const week = (n) => ({
  [`week${n}Title`]: text(`Gói ${n} tuần: tiêu đề`, `packages.week${n}.title`, 120),
  [`week${n}Text`]: para(`Gói ${n} tuần: mô tả ngắn`, `packages.week${n}.text`, 400),
  [`week${n}BestTitle`]: text(
    `Gói ${n} tuần: tiêu đề trên danh sách tour`,
    `packages.best.${n}.title`,
    160,
  ),
  [`week${n}BestText`]: para(
    `Gói ${n} tuần: lời giới thiệu danh sách tour`,
    `packages.best.${n}.text`,
    600,
  ),
  [`week${n}CtaTitle`]: text(
    `Gói ${n} tuần: tiêu đề hộp thiết kế riêng`,
    `packages.best.${n}.ctaTitle`,
    160,
  ),
  [`week${n}CtaText`]: para(
    `Gói ${n} tuần: mô tả hộp thiết kế riêng`,
    `packages.best.${n}.ctaText`,
    600,
  ),
});

export const TOURS_PAGE_COPY = {
  tours: {
    name: "Tất cả tour",
    group: "Tour & du thuyền",
    path: "/tours",
    summary: "Đầu trang (3 ảnh, tiêu đề, giới thiệu) và hộp tư vấn dưới danh sách tour.",
    thumb: "heroImages.0",
    fields: {
      heroImages: heroImages([
        "/images/tours/cao-bang.jpg",
        "/images/tours/v2/hoi-an-92090.jpg",
        "/images/tours/v2/phu-quoc-14012373.jpg",
      ]),
      heroTitle: text("Tiêu đề trang", "tours.allTitle", 160),
      heroIntro: para("Đoạn giới thiệu", "tours.allIntro", 600),
      ...advice,
    },
  },

  "halong-bay-cruises": cruise(
    "Du thuyền Hạ Long",
    "/halong-bay-cruises",
    [
      "/images/tours/v2/halong-bay-58597.jpg",
      "/images/tours/hd/ha-long.jpg",
      "/images/tours/v2/halong-bay-5041966.jpg",
    ],
    "cruises.title",
    "cruises.intro",
    "Đầu trang (3 ảnh, tiêu đề, giới thiệu) và hộp tư vấn — trang mọi tour Hạ Long.",
  ),

  "halong-bay-overnight-cruises": cruise(
    "Du thuyền Hạ Long ngủ đêm",
    "/halong-bay-overnight-cruises",
    [
      "/images/tours/v2/halong-bay-5041966.jpg",
      "/images/tours/v2/halong-bay-58597.jpg",
      "/images/tours/hd/ha-long.jpg",
    ],
    "cruises.overnightTitle",
    "cruises.overnightIntro",
    "Đầu trang (3 ảnh, tiêu đề, giới thiệu) và hộp tư vấn — du thuyền ngủ đêm.",
  ),

  "day-cruises": cruise(
    "Du thuyền trong ngày",
    "/day-cruises",
    [
      "/images/b2b/phu-quoc.webp",
      "/images/tours/hd/tourdulichnhatranggiare.jpg",
      "/images/tours/hd/ha-long.jpg",
    ],
    "cruises.dayTitle",
    "cruises.dayIntro",
    "Đầu trang (3 ảnh, tiêu đề, giới thiệu) và hộp tư vấn — Hạ Long, Nha Trang, Phú Quốc.",
  ),

  packages: {
    name: "Gói tour 1–3 tuần",
    group: "Tour & du thuyền",
    path: "/packages",
    summary:
      "Đầu trang + ảnh ghép, 6 lý do chọn, lời giới thiệu và hộp thiết kế riêng của gói 1 / 2 / 3 tuần.",
    thumb: "heroImages.0",
    fields: {
      // Đầu trang: 3 ảnh nền (màn hình lớn chỉ hiện ảnh đầu) + 3 ảnh ghép trong khung bo tròn bên phải
      heroImages: heroImages([
        "/images/tours/v2/ha-giang-14025581.jpg",
        "/images/tours/v2/sapa-6130917.jpg",
        "/images/tours/v2/hoi-an-746921.jpg",
      ]),
      collageImages: list(
        "Ảnh ghép bên phải tiêu đề",
        [
          "/images/tours/v2/hoi-an-746921.jpg",
          "/images/tours/v2/ha-giang-14025581.jpg",
          "/images/tours/v2/mekong-delta-3180637.jpg",
        ],
        3,
        image("Ảnh ghép", null, { ratio: 5 / 4, width: 1200 }),
      ),
      heroTitle: text("Tiêu đề trang", "packages.title", 160),
      heroIntro: para("Đoạn giới thiệu", "packages.intro", 600),
      // Vì sao chọn
      whyImage: image("Ảnh nền khối lý do chọn", "/images/tours/hd/bao-lac-cao-bang.jpg", BG_CROP),
      whyTitle: text("Tiêu đề khối lý do chọn", "packages.whyTitle", 120),
      why: list("Lý do chọn", "packages.why", 6, {
        title: text("Tiêu đề", null, 80),
        text: para("Mô tả", null, 300),
      }),
      // Gói 1 / 2 / 3 tuần (danh sách tour tự chọn theo số ngày từ mục Tour)
      ourPackages: text("Tiêu đề phần gói tour", "packages.ourPackages", 120),
      ...week(1),
      ...week(2),
      ...week(3),
      ctaButton: text("Nút hộp thiết kế riêng", "packages.ctaButton", 50),
    },
  },
};
