/**
 * Hồ sơ đánh giá của CÔNG TY trên Google Maps / Tripadvisor — mã cố định trong code (không nhập trong CMS).
 * Dùng chung cho mọi nhà cung cấp số liệu (services/review-providers/*).
 */
export const REVIEW_STAT_SOURCES = ["tripadvisor", "google"];

// Mã hồ sơ doanh nghiệp trên Google Maps (CID — giống fe/src/constants/site.js)
export const GOOGLE_MAPS_CID = "12890319484623913190";
// Mã địa điểm Tripadvisor (số sau "-d" trong link trang Tripadvisor của công ty)
export const DEFAULT_TRIPADVISOR_LOCATION = "27950353";

/** Số đang dùng khi chưa cập nhật lần nào (khách xác nhận 13/11/2026) + link trang đánh giá của công ty */
export const REVIEW_DEFAULTS = Object.freeze({
  tripadvisor: {
    rating: 5,
    count: 93,
    url: "https://www.tripadvisor.com/Attraction_Review-g17733187-d27950353-Reviews-Vietlook_Travel-Ha_Dong_Hanoi.html",
    updatedAt: null,
  },
  google: {
    rating: 4.7,
    count: 31,
    url: `https://maps.google.com/?cid=${GOOGLE_MAPS_CID}`,
    updatedAt: null,
  },
});
