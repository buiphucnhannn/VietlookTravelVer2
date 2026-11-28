/**
 * Khối (section) nhân viên được BẬT / TẮT hiển thị trên website — CMS lưu `hidden: { <khoá khối>: true }`
 * (khối không có trong `hidden` = đang hiện). Banner / đầu trang, danh sách chính, form liên hệ không tắt được.
 *
 * BẢN KIỂM TRA DỮ LIỆU của fe/src/lib/hidden-blocks.mjs (bản đầy đủ có tên khối tiếng Việt) — thêm / bớt khoá
 * ở bên website thì chép sang đây; tests/hidden-blocks.test.js báo lỗi nếu 2 bên lệch nhau.
 */

/** Trang chủ (CMS → Trang chủ) */
export const HOME_HIDEABLE = Object.freeze([
  "trust",
  "services",
  "featured",
  "b2b",
  "map",
  "destinations",
  "stats",
  "long",
  "steps",
  "themes",
  "custom",
  "why",
  "access",
  "partnerLogos",
  "projects",
  "reviews",
  "guide",
  "planner",
  "about",
]);

/** Trang Giới thiệu (CMS → Giao diện trang → Giới thiệu) */
export const ABOUT_HIDEABLE = Object.freeze(["values", "why", "access", "numbers", "reviews"]);

/** Giao diện trang (CMS → Giao diện trang): khoá trang → các khối tắt được */
export const PAGE_COPY_HIDEABLE = Object.freeze({
  "car-rental": ["trust", "routes", "areas", "included", "gallery", "how", "reviews", "faq"],
  "visa-fast-track": ["process", "terms"],
  "group-tailor-made-tours": ["included", "pillars", "how", "reviews", "faq"],
  partners: ["offers", "projects"],
});
