/**
 * Giao diện các trang công khai (CMS → Nội dung → Giao diện trang): các ô chữ / ảnh nhân viên sửa được của
 * từng trang. Lưu ở collection `pages`, bản ghi { key, data } — ô không có / để trống = website dùng nội dung
 * mặc định.
 *
 * BẢN KIỂM TRA DỮ LIỆU của fe/src/lib/page-copy/registry.mjs (bản đầy đủ: nhãn, nguồn mặc định, hướng dẫn
 * thêm trang). Thêm / sửa ô ở bên website thì chép đúng kiểu + max + count sang đây —
 * tests/page-copy.test.js báo lỗi nếu 2 bên lệch nhau.
 *
 * Kiểu ô: text (1 dòng) · para (đoạn văn, giữ xuống dòng) · image (ảnh kho ảnh / ảnh có sẵn) ·
 * list (tối đa `count` phần tử; `item` là 1 kiểu ô hoặc object nhiều ô).
 */

import { INFO_SCHEMA } from "./page-copy/info.js"; // Liên hệ, Đối tác B2B, Dịch vụ
import { PLANNING_SCHEMA } from "./page-copy/planning.js"; // Tour nhóm, Lên kế hoạch, Cảm ơn
import { TOURS_SCHEMA } from "./page-copy/tours.js"; // Tất cả tour, du thuyền, Gói tour
import { LISTING_SCHEMA } from "./page-copy/listing.js"; // Tất cả điểm đến, Cẩm nang du lịch
import { DETAIL_SCHEMA } from "./page-copy/detail.js"; // Chữ chung trên trang chi tiết
import { GLOBAL_SCHEMA } from "./page-copy/global.js"; // Đầu & chân trang, Trang 404

const text = (max) => ({ type: "text", max });
const para = (max) => ({ type: "para", max });
const image = () => ({ type: "image" });
const list = (count, item) => ({ type: "list", count, item });

const step = { title: text(80), text: para(300) };
const card = { title: text(80), text: para(400) };
const faq = { q: text(200), a: para(1000) };

export const PAGE_COPY_SCHEMA = Object.freeze({
  "car-rental": {
    heroImage: image(),
    heroEyebrow: text(80),
    heroTitle: text(160),
    heroText: para(600),
    ctaQuote: text(50),
    ctaFleet: text(50),
    perks: list(3, text(120)),
    trust: list(4, { title: text(60), text: text(160) }),
    fleetTitle: text(120),
    fleetSubtitle: para(300),
    servicesTitle: text(120),
    services: list(6, card),
    routesTitle: text(120),
    routesSubtitle: para(300),
    areasTitle: text(120),
    areasSubtitle: para(300),
    areasMore: para(400),
    includedImage: image(),
    includedTitle: text(160),
    included: list(6, card),
    galleryTitle: text(120),
    gallerySubtitle: para(300),
    howImage: image(),
    howTitle: text(120),
    how: list(3, step),
    reviewsTitle: text(120),
    reviewsSub: para(300),
    faqTitle: text(120),
    faqSub: para(300),
    faq: list(5, faq),
    formTitle: text(120),
    formSubtitle: para(300),
    talkTitle: text(120),
    talkText: para(300),
    asideImage: image(),
  },

  "visa-fast-track": {
    heroImages: list(3, image()),
    heroTitle: text(160),
    heroTagline: text(160),
    heroIntro: para(600),
    ctaFast: text(60),
    ctaTypes: text(60),
    fastTitle: text(120),
    fastSubtitle: para(600),
    groupArrival: text(60),
    groupArrivalSub: text(160),
    groupDeparture: text(60),
    groupDepartureSub: text(160),
    groupAddons: text(60),
    groupAddonsSub: text(160),
    dashNote: para(300),
    priceNote: para(400),
    processImage: image(),
    processTitle: text(120),
    processSubtitle: para(300),
    tabArrival: text(40),
    tabDeparture: text(40),
    tabEvisa: text(40),
    stepsArrival: list(5, step),
    stepsDeparture: list(5, step),
    stepsEvisa: list(5, step),
    notesTitle: text(40),
    notes: list(2, para(400)),
    termsTitle: text(120),
    termsSubtitle: para(300),
    terms: list(8, { term: text(80), meaning: para(300) }),
    typesTitle: text(120),
    typesNote: para(400),
    formImage: image(),
    formTitle: text(120),
    faqTitle: text(120),
    faq: list(4, faq),
  },
  ...INFO_SCHEMA,
  ...PLANNING_SCHEMA,
  ...TOURS_SCHEMA,
  ...LISTING_SCHEMA,
  ...DETAIL_SCHEMA,
  ...GLOBAL_SCHEMA,
});

export const PAGE_COPY_KEYS = Object.keys(PAGE_COPY_SCHEMA);
