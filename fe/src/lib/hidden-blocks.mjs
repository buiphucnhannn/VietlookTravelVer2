/**
 * Khối (section) nhân viên được BẬT / TẮT hiển thị trên website (công tắc "Hiện / Ẩn trên website" ở góc mỗi khối
 * trong trình sửa). Dữ liệu lưu `hidden: { <khoá khối>: true }` — khối không có trong `hidden` = đang hiện.
 * Khối đang tắt: website bỏ hẳn khối đó (không để khoảng trống); trình sửa vẫn hiện mờ để sửa trước.
 * Banner / đầu trang, danh sách chính, form liên hệ KHÔNG tắt được (trang nào cũng phải có).
 *
 * Máy chủ kiểm tra theo bản chép ở be/src/constants/hidden-blocks.js (chỉ khoá) — thêm / bớt khoá ở đây thì chép
 * sang đó; be/tests/hidden-blocks.test.js báo lỗi nếu 2 bên lệch nhau.
 * File này KHÔNG import gì (dữ liệu thuần) để backend test đọc được trực tiếp.
 */

/** Trang chủ: khoá → tên khối (đúng thứ tự trên trang) */
export const HOME_BLOCKS = {
  trust: "Dải uy tín",
  services: "Dịch vụ chính",
  featured: "Tour nổi bật",
  b2b: "Dành cho đối tác",
  map: "Bản đồ Việt Nam",
  destinations: "Điểm đến nổi bật",
  stats: "Con số nổi bật",
  long: "Tour dài ngày",
  steps: "Các bước đặt tour",
  themes: "Chủ đề tour",
  custom: "Tour thiết kế riêng",
  why: "Vì sao chọn Vietlook",
  access: "Du lịch không rào cản",
  partnerLogos: "Logo đối tác",
  projects: "Dự án đã phục vụ",
  reviews: "Đánh giá của khách",
  guide: "Cẩm nang · Việt Nam theo tháng",
  planner: "Lên kế hoạch chuyến đi",
  about: "Về chúng tôi",
};

/** Trang Giới thiệu */
export const ABOUT_BLOCKS = {
  values: "Tầm nhìn · sứ mệnh · giá trị",
  why: "Vì sao chọn Vietlook",
  access: "Du lịch không rào cản",
  numbers: "Video & con số",
  reviews: "Đánh giá của khách",
};

/** Giao diện trang: khoá trang → { khoá khối → tên khối } */
export const PAGE_COPY_BLOCKS = {
  "car-rental": {
    trust: "Dải điểm mạnh",
    routes: "Tuyến phổ biến",
    areas: "Khu vực phục vụ",
    included: "Giá đã bao gồm",
    gallery: "Dải ảnh đội xe",
    how: "Cách đặt xe",
    reviews: "Đánh giá",
    faq: "Câu hỏi thường gặp",
  },
  "visa-fast-track": {
    process: "Quy trình & lưu ý",
    terms: "Thuật ngữ",
  },
  "group-tailor-made-tours": {
    included: "Luôn bao gồm",
    pillars: "Dải cam kết",
    how: "Cách làm việc",
    reviews: "Đánh giá",
    faq: "Câu hỏi thường gặp",
  },
  partners: {
    offers: "Ưu đãi đối tác",
    projects: "Dự án đã phục vụ",
  },
};

/** Khối `key` đang tắt trên website? (`hidden`: cờ đã lưu, có thể thiếu) */
export const isHidden = (hidden, key) => hidden?.[key] === true;

/** Cờ đã lưu → chỉ giữ khối đang tắt, đúng các khoá cho phép (`keys`) */
export const cleanHidden = (hidden, keys) =>
  Object.fromEntries(keys.filter((k) => hidden?.[k] === true).map((k) => [k, true]));
