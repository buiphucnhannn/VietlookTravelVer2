/**
 * ============================================================================================
 *  GIAO DIỆN CÁC TRANG — DANH MỤC CÁC Ô SỬA ĐƯỢC CỦA TỪNG TRANG CÔNG KHAI (PAGE COPY REGISTRY)
 * ============================================================================================
 *
 * Mỗi trang công khai (Thuê xe, Visa & Fast-track…) khai báo ở đây các ô chữ / ảnh nhân viên được sửa trong
 * CMS → Nội dung → Giao diện trang. Ô để trống = website dùng nội dung mặc định (chữ trong từ điển
 * fe/src/i18n/dictionaries/*, dữ liệu trong fe/src/data/*, ảnh có sẵn /images/…) → trang không bao giờ hỏng,
 * và chưa ai sửa thì trang hiện y hệt như trước.
 *
 * Lưu ở backend: collection `pages`, bản ghi { key: "<khoá trang>", data: { <ô>: … } }.
 *   - ô chữ  : { en, zh, vi } (chữ thuần; "para" giữ xuống dòng)
 *   - ô ảnh  : "https://res.cloudinary.com/…" hoặc "/images/…"
 *   - danh sách: mảng cố định số phần tử (bố cục trang không đổi — nhân viên sửa nội dung, không sửa thiết kế)
 *
 * --------------------------------------------------------------------------------------------
 *  CÁCH THÊM 1 TRANG MỚI (vd. "group-tailor-made-tours")
 * --------------------------------------------------------------------------------------------
 *  1. Khai báo trang trong PAGE_COPY bên dưới: name (tên tiếng Việt) / group (nhóm thẻ trong CMS, vd. "Trang dịch vụ")
 *     / path / thumb (đường dẫn ô ảnh làm ảnh thẻ; trang không có ô ảnh: `cover` = ảnh có sẵn cố định) / summary + `fields`.
 *     Mỗi ô: text(nhãn, nguồnMặcĐịnh, maxKýTự) · para(…) · image(nhãn, ảnhMặcĐịnh, khungCắt) · list(…).
 *     Nguồn mặc định (`def`):
 *       "car.title"              → từ điển giao diện: dict.car.title (đúng ngôn ngữ đang xem)
 *       "data:visa.visaFaq"      → fe/src/data/visa.js, export visaFaq (gặp { en, zh, vi } thì tự lấy đúng
 *                                  ngôn ngữ). Nguồn "data:<tên>" phải có trong sources.js (DATA_SOURCES).
 *       "/images/…" hoặc [ … ]   → giá trị cố định (ảnh có sẵn, mảng ảnh…)
 *     Danh sách: list(nhãn, nguồn, sốPhầnTử, ô) — ô là 1 kiểu (danh sách chữ / ảnh) hoặc object nhiều ô
 *     ({ title: text(…), text: para(…) }). Ô con lấy mặc định theo nguồn[i][tênÔ] (hoặc `from: "tênKhác"`).
 *     Ô được phép trống (vd. dòng ghi chú phụ, trống = trang không hiện dòng đó): thêm `{ optional: true }`.
 *  2. Chép đúng các ô (kiểu + max + count) sang be/src/constants/page-copy.js (máy chủ kiểm tra dữ liệu).
 *     `npm test` trong be/ báo lỗi nếu 2 bên lệch nhau (tests/page-copy.test.js).
 *  3. Trang công khai: `const p = await getPageText("<khoá>", lang, dict)` (lib/page-copy/server.js) rồi dùng
 *     p.heroTitle, p.services[i].title, p.heroImage… thay cho chữ / ảnh viết cứng. Chưa ai sửa → giá trị
 *     chính là nguồn mặc định ở trên, nên trang hiện y như cũ.
 *  4. Bản xem trước trong CMS: tạo components/admin/page-copy/previews/<Tên>Preview.js ghép từ các khối
 *     dùng chung trong components/admin/page-copy/blocks.js (PreviewHero, SectionHead, CardGrid, FaqList,
 *     ModuleNote…; chữ bấm-để-sửa <Txt f="…"/>, ảnh <Img f="…"/>), rồi đăng ký trong previews/index.js.
 *     Danh sách có mục quản lý riêng (tour, xe, gói visa, đánh giá…) KHÔNG sửa ở đây — hiện <ModuleNote>
 *     kèm link sang mục quản lý.
 *  Xong: thẻ trang tự hiện trong CMS → Giao diện trang, lưu xong website làm mới ngay (thẻ cache
 *  "pages" + "page:<khoá>").
 *
 * File này KHÔNG import gì (dữ liệu thuần) để backend test đọc được trực tiếp.
 */

import { INFO_PAGES } from "./registry/info.mjs"; // Liên hệ, Đối tác B2B, Dịch vụ
import { PLANNING_PAGES } from "./registry/planning.mjs"; // Tour nhóm, Lên kế hoạch, Cảm ơn
import { TOURS_PAGE_COPY } from "./registry/tours.mjs"; // Tất cả tour, du thuyền, Gói tour
import { LISTING_PAGES } from "./registry/listing.mjs"; // Tất cả điểm đến, Cẩm nang du lịch
import { DETAIL_PAGES } from "./registry/detail.mjs"; // Chữ chung trên trang chi tiết
import { GLOBAL_PAGES } from "./registry/global.mjs"; // Đầu & chân trang, Trang 404, Khối không rào cản

/* ---------- Kiểu ô ---------- */

/** 1 dòng chữ (tiêu đề, nhãn nút…) — Enter không xuống dòng */
const text = (label, def, max = 160, extra) => ({ type: "text", label, def, max, ...extra });
/** Đoạn văn (giữ xuống dòng) */
const para = (label, def, max = 600, extra) => ({ type: "para", label, def, max, ...extra });
/** Ảnh: ảnh mặc định + khung cắt khi tải ảnh mới ({ ratio, width } — đúng tỉ lệ khung trên web) */
const image = (label, def, crop, extra) => ({ type: "image", label, def, crop, ...extra });
/** Danh sách cố định `count` phần tử; `item`: 1 kiểu ô, hoặc object { tênÔ: kiểu ô } */
const list = (label, def, count, item, extra) => ({
  type: "list",
  label,
  def,
  count,
  item,
  ...extra,
});

const HERO_CROP = { ratio: 16 / 9, width: 2560 }; // ảnh nền toàn màn hình
const BG_CROP = { ratio: 16 / 9, width: 1920 }; // ảnh nền mờ phía sau 1 khối

/* ---------- Các trang ---------- */

export const PAGE_COPY = {
  "car-rental": {
    name: "Thuê xe",
    group: "Trang dịch vụ",
    path: "/car-rental",
    summary: "Đầu trang, điểm mạnh, dịch vụ, giá đã bao gồm, cách đặt xe, câu hỏi thường gặp.",
    thumb: "heroImage",
    fields: {
      // Đầu trang
      heroImage: image("Ảnh nền đầu trang", "/images/heroes/car-ha-giang-road.webp", HERO_CROP),
      heroEyebrow: text("Dòng chữ nhỏ trên tiêu đề", "car.eyebrow", 80),
      heroTitle: text("Tiêu đề trang", "car.title", 160),
      heroText: para("Đoạn giới thiệu", "car.text", 600),
      ctaQuote: text("Nút báo giá", "car.ctaQuote", 50),
      ctaFleet: text("Nút xem đội xe", "car.ctaFleet", 50),
      perks: list("Ưu điểm dưới nút", "car.perks", 3, text("Ưu điểm", null, 120)),
      // Dải điểm mạnh
      trust: list("Dải điểm mạnh", "car.trust", 4, {
        title: text("Tiêu đề", null, 60, { from: "t" }),
        text: text("Mô tả", null, 160, { from: "d" }),
      }),
      // Đội xe (danh sách xe: CMS → Xe & khu vực)
      fleetTitle: text("Tiêu đề khối đội xe", "car.fleetTitle", 120),
      fleetSubtitle: para("Mô tả khối đội xe", "car.fleetSubtitle", 300),
      // Dịch vụ
      servicesTitle: text("Tiêu đề khối dịch vụ", "car.servicesTitle", 120),
      services: list("Thẻ dịch vụ", "car.services", 6, {
        title: text("Tên dịch vụ", null, 80),
        text: para("Mô tả dịch vụ", null, 400),
      }),
      // Tuyến phổ biến + khu vực (dữ liệu: CMS → Xe & khu vực)
      routesTitle: text("Tiêu đề khối tuyến phổ biến", "car.routesTitle", 120),
      routesSubtitle: para("Mô tả khối tuyến phổ biến", "car.routesSubtitle", 300),
      areasTitle: text("Tiêu đề khối khu vực", "car.areasTitle", 120),
      areasSubtitle: para("Mô tả khối khu vực", "car.areasSubtitle", 300),
      areasMore: para("Ô “tỉnh thành khác”", "car.areasMore", 400),
      // Giá đã bao gồm
      includedImage: image(
        "Ảnh nền khối giá đã bao gồm",
        "/images/cars/ext-saigon-street.webp",
        BG_CROP,
      ),
      includedTitle: text("Tiêu đề khối giá đã bao gồm", "car.includedTitle", 160),
      included: list("Thẻ giá đã bao gồm", "car.included", 6, {
        title: text("Tiêu đề", null, 80),
        text: para("Mô tả", null, 400),
      }),
      // Dải ảnh đội xe
      galleryTitle: text("Tiêu đề dải ảnh xe", "car.galleryTitle", 120),
      gallerySubtitle: para("Mô tả dải ảnh xe", "car.gallerySubtitle", 300),
      // Cách đặt xe
      howImage: image("Ảnh nền khối cách đặt xe", "/images/cars/int-limo-white.webp", BG_CROP),
      howTitle: text("Tiêu đề khối cách đặt xe", "car.howTitle", 120),
      how: list("Các bước đặt xe", "car.how", 3, {
        title: text("Tên bước", null, 80),
        text: para("Mô tả bước", null, 300),
      }),
      // Đánh giá (danh sách: CMS → Đánh giá)
      reviewsTitle: text("Tiêu đề khối đánh giá", "car.reviewsTitle", 120),
      reviewsSub: para("Mô tả khối đánh giá", "car.reviewsSub", 300),
      // Câu hỏi thường gặp
      faqTitle: text("Tiêu đề khối câu hỏi", "car.faqTitle", 120),
      faqSub: para("Mô tả khối câu hỏi", "car.faqSub", 300),
      faq: list("Câu hỏi thường gặp", "car.faq", 5, {
        q: text("Câu hỏi", null, 200),
        a: para("Trả lời", null, 1000),
      }),
      // Form báo giá + liên hệ
      formTitle: text("Tiêu đề form báo giá", "car.formTitle", 120),
      formSubtitle: para("Mô tả form báo giá", "car.formSubtitle", 300),
      talkTitle: text("Tiêu đề ô liên hệ", "car.talkTitle", 120),
      talkText: para("Mô tả ô liên hệ", "car.talkText", 300),
      asideImage: image("Ảnh dưới ô liên hệ", "/images/cars/luxury-v3a.webp", {
        ratio: 16 / 9,
        width: 1200,
      }),
    },
  },

  "visa-fast-track": {
    name: "Visa & Fast-track",
    group: "Trang dịch vụ",
    path: "/visa-fast-track",
    summary: "Đầu trang, gói fast-track, quy trình 5 bước, lưu ý, thuật ngữ, câu hỏi thường gặp.",
    thumb: "heroImages.0",
    fields: {
      // Đầu trang: 3 ảnh ghép (điện thoại chỉ hiện ảnh đầu)
      heroImages: list(
        "Ảnh nền đầu trang",
        [
          "/images/tours/welcome-vietlook.png",
          "/images/tours/v2/hanoi-34405373.jpg",
          "/images/tours/v2/ho-chi-minh-city-1018478.jpg",
        ],
        3,
        image("Ảnh nền", null, { ratio: 3 / 4, width: 1200 }),
      ),
      heroTitle: text("Tiêu đề trang", "visa.title", 160),
      heroTagline: text("Dòng nổi bật dưới tiêu đề", "visa.subtitle", 160),
      heroIntro: para("Đoạn giới thiệu", "visa.intro", 600),
      ctaFast: text("Nút xem gói fast-track", "visa.fastTitle", 60),
      ctaTypes: text("Nút xem loại visa", "visa.typesTitle", 60),
      // Gói fast-track (giá & gói: CMS → Visa & fast-track)
      fastTitle: text("Tiêu đề khối gói fast-track", "visa.fastTitle", 120),
      fastSubtitle: para("Mô tả khối gói fast-track", "visa.fastSubtitle", 600),
      groupArrival: text("Tên nhóm gói đón", "visa.groups.arrival", 60),
      groupArrivalSub: text("Mô tả nhóm gói đón", "visa.groupSub.arrival", 160),
      groupDeparture: text("Tên nhóm gói tiễn", "visa.groups.departure", 60),
      groupDepartureSub: text("Mô tả nhóm gói tiễn", "visa.groupSub.departure", 160),
      groupAddons: text("Tên nhóm dịch vụ thêm", "visa.groups.addons", 60),
      groupAddonsSub: text("Mô tả nhóm dịch vụ thêm", "visa.groupSub.addons", 160),
      dashNote: para("Ghi chú dưới bảng giá", "visa.dashNote", 300),
      priceNote: para("Ghi chú về giá", "visa.priceNote", 400),
      // Quy trình 5 bước
      processImage: image("Ảnh nền khối quy trình", "/images/tours/v2/hanoi-34405373.jpg", BG_CROP),
      processTitle: text("Tiêu đề khối quy trình", "visa.processTitle", 120),
      processSubtitle: para("Mô tả khối quy trình", "visa.processSubtitle", 300),
      tabArrival: text("Tên tab nhập cảnh", "visa.processTabs.arrival", 40),
      tabDeparture: text("Tên tab xuất cảnh", "visa.processTabs.departure", 40),
      tabEvisa: text("Tên tab e-visa", "visa.processTabs.evisa", 40),
      stepsArrival: list("Các bước nhập cảnh", "data:visa.visaProcesses.arrival", 5, {
        title: text("Tên bước", null, 80),
        text: para("Mô tả bước", null, 300),
      }),
      stepsDeparture: list("Các bước xuất cảnh", "data:visa.visaProcesses.departure", 5, {
        title: text("Tên bước", null, 80),
        text: para("Mô tả bước", null, 300),
      }),
      stepsEvisa: list("Các bước e-visa", "data:visa.visaProcesses.evisa", 5, {
        title: text("Tên bước", null, 80),
        text: para("Mô tả bước", null, 300),
      }),
      // Lưu ý
      notesTitle: text("Chữ “Lưu ý”", "visa.notesTitle", 40),
      notes: list("Lưu ý", "data:visa.visaNotes", 2, para("Lưu ý", null, 400)),
      // Thuật ngữ
      termsTitle: text("Tiêu đề khối thuật ngữ", "visa.termsTitle", 120),
      termsSubtitle: para("Mô tả khối thuật ngữ", "visa.termsSubtitle", 300),
      terms: list("Thuật ngữ", "data:visa.visaTerms", 8, {
        term: text("Thuật ngữ", null, 80),
        meaning: para("Giải thích", null, 300, { from: "def" }),
      }),
      // Loại visa (bảng: CMS → Visa & fast-track)
      typesTitle: text("Tiêu đề khối loại visa", "visa.typesTitle", 120),
      typesNote: para("Ghi chú dưới bảng visa", "visa.note", 400),
      // Form đặt + câu hỏi
      formImage: image(
        "Ảnh nền khối đặt dịch vụ",
        "/images/tours/v2/ho-chi-minh-city-1018478.jpg",
        BG_CROP,
      ),
      formTitle: text("Tiêu đề form đặt dịch vụ", "visa.formTitle", 120),
      faqTitle: text("Tiêu đề khối câu hỏi", "visa.faqTitle", 120),
      faq: list("Câu hỏi thường gặp", "data:visa.visaFaq", 4, {
        q: text("Câu hỏi", null, 200),
        a: para("Trả lời", null, 1000),
      }),
    },
  },
  ...INFO_PAGES,
  ...PLANNING_PAGES,
  ...TOURS_PAGE_COPY,
  ...LISTING_PAGES,
  ...DETAIL_PAGES,
  ...GLOBAL_PAGES,
};

/** Khoá các trang sửa được (đúng thứ tự hiện trong CMS) */
export const PAGE_COPY_KEYS = Object.keys(PAGE_COPY);

export const pageCopyOf = (key) => (Object.hasOwn(PAGE_COPY, key) ? PAGE_COPY[key] : null);
