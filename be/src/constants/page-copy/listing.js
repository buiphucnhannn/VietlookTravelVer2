/**
 * Kiểm tra dữ liệu "Giao diện trang" — nhóm Trang danh sách (Tất cả điểm đến, Cẩm nang du lịch).
 * Bản đầy đủ (nhãn, nguồn mặc định): fe/src/lib/page-copy/registry/listing.mjs — giữ đúng kiểu + max + count.
 */

const text = (max) => ({ type: "text", max });
const image = () => ({ type: "image" });
const list = (count, item) => ({ type: "list", count, item });

export const LISTING_SCHEMA = {
  destinations: {
    heroImages: list(3, image()),
    heroTitle: text(120),
    heroIntro: text(300),
    placesCount: text(40),
    regionIntros: list(3, { intro: text(400) }),
  },

  "travel-guide": {
    shareImage: image(),
    heroTitle: text(120),
    heroIntro: text(300),
    allCategories: text(30),
    searchPlaceholder: text(80),
    noResults: text(160),
    loadMore: text(50),
  },
};
