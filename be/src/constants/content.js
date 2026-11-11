/** 3 miền cố định (hợp đồng: điểm đến thuộc 1 trong 3 miền Bắc – Trung – Nam) */
export const REGIONS = Object.freeze({
  NORTH: "north-vietnam",
  CENTRAL: "central-vietnam",
  SOUTH: "south-vietnam",
});
export const REGION_VALUES = Object.values(REGIONS);

/** Tối đa 08 chủ đề tour (hợp đồng mục 2) */
export const MAX_THEMES = 8;

/** 5 sân bay có giá fast-track */
export const AIRPORT_CODES = ["SGN", "HAN", "DAD", "CXR", "PQC"];

/** Nhóm gói fast-track */
export const FAST_TRACK_GROUPS = ["arrival", "departure", "addon"];

/** Loại yêu cầu từ các form trên website (mã yêu cầu có tiền tố tương ứng) */
export const ENQUIRY_TYPES = Object.freeze({
  booking: "BK", // đặt tour online
  planner: "TP", // thiết kế tour / lên kế hoạch chuyến đi
  car: "CR", // báo giá xe riêng kèm tài xế
  visa: "VS", // visa & fast-track
  contact: "CT", // liên hệ
  partner: "PN", // đối tác B2B
});
export const ENQUIRY_TYPE_VALUES = Object.keys(ENQUIRY_TYPES);

/**
 * Phiên bản Chính sách bảo mật / Điều khoản mà khách đồng ý khi gửi form (lưu kèm từng yêu cầu làm bằng chứng
 * theo Nghị định 13/2023/NĐ-CP & GDPR). Đổi ngày này mỗi khi nội dung chính sách thay đổi đáng kể.
 */
export const PRIVACY_POLICY_VERSION = "2026-11-11";

/** Trạng thái đơn / yêu cầu (hợp đồng mục 3) */
export const ENQUIRY_STATUS = ["new", "contacted", "confirmed", "completed", "cancelled"];
// Thanh toán của đơn đặt tour: chưa trả · đã đặt cọc (trả 1 phần qua 9Pay) · đã trả đủ
export const PAYMENT_STATUS = ["unpaid", "deposit", "paid"];

/** Trang nội dung sửa được trong CMS: giới thiệu + 4 trang chính sách */
export const PAGE_KEYS = ["about", "terms", "privacy", "payment", "cancellation"];

/** Thẻ cache phía website (Next.js cacheTag) — CMS lưu xong báo website xoá đúng thẻ */
export const CACHE_TAGS = Object.freeze({
  tours: "tours",
  destinations: "destinations",
  themes: "themes",
  articles: "articles",
  taxonomy: "taxonomy", // chuyên mục + tác giả
  services: "services", // xe + visa
  pages: "pages",
  settings: "settings",
});
