/**
 * Giao diện trang — nhóm "Trang danh sách": Tất cả điểm đến (/destinations), Cẩm nang du lịch (/travel-guide).
 * Gộp vào PAGE_COPY ở ../registry.mjs (xem hướng dẫn đầy đủ ở đầu file đó). Bản kiểm tra dữ liệu bên máy chủ:
 * be/src/constants/page-copy/listing.js — thêm / sửa ô ở đây thì chép đúng kiểu + max + count sang đó.
 *
 * Không sửa ở đây (cố ý):
 *   - Điểm đến của từng miền (tên, ảnh, số tour): CMS → Điểm đến. Bài viết, chuyên mục: CMS → Bài viết /
 *     Chuyên mục & tác giả. Trang chi tiết ([slug]) là dữ liệu của các mục đó.
 *   - Tên 3 miền (Bắc – Trung – Nam): cố định theo hợp đồng, dùng ở menu, chân trang, form… nên chỉ hiện để xem.
 *   - Ảnh nền đầu trang Cẩm nang: tự lấy ảnh các bài viết (thay vào đó cho sửa ảnh khi chia sẻ link trang).
 *   - /themes: website chưa có trang danh sách chủ đề (chỉ có trang từng chủ đề) → không có gì để sửa.
 * Lời giới thiệu dài 1–2 câu dùng kiểu "text" (khối đầu trang / tiêu đề khối của website không giữ xuống dòng).
 * File này KHÔNG import gì (dữ liệu thuần) để backend test đọc được trực tiếp.
 */

/* Kiểu ô — giống hệt ../registry.mjs (chép lại vì registry.mjs import file này) */
const text = (label, def, max = 160, extra) => ({ type: "text", label, def, max, ...extra });
const image = (label, def, crop, extra) => ({ type: "image", label, def, crop, ...extra });
const list = (label, def, count, item, extra) => ({
  type: "list",
  label,
  def,
  count,
  item,
  ...extra,
});

const GROUP = "Trang danh sách";

export const LISTING_PAGES = {
  destinations: {
    name: "Tất cả điểm đến",
    group: GROUP,
    path: "/destinations",
    seo: true,
    summary:
      "Đầu trang (3 ảnh nền, tiêu đề, giới thiệu) và lời giới thiệu từng miền Bắc – Trung – Nam.",
    thumb: "heroImages.0",
    fields: {
      // Đầu trang: 3 ảnh ghép (điện thoại chỉ hiện ảnh đầu) — mặc định là ảnh 3 miền (data/regions.js)
      heroImages: list(
        "Ảnh nền đầu trang",
        [
          "/images/tours/hd/du-lich-tay-bac.jpg",
          "/images/tours/v2/hue-c102.jpg",
          "/images/tours/v2/mekong-delta-28428669.jpg",
        ],
        3,
        image("Ảnh nền", null, { ratio: 3 / 4, width: 1200 }),
      ),
      heroTitle: text("Tiêu đề trang", "destination.allTitle", 120),
      heroIntro: text("Đoạn giới thiệu", "destination.allIntro", 300),
      // Mỗi miền: "<số> điểm đến" · tên miền (cố định) · lời giới thiệu
      placesCount: text(
        "Chữ sau số lượng điểm đến (vd. “12 điểm đến”)",
        "destination.placesCount",
        40,
      ),
      regionIntros: list("Lời giới thiệu từng miền", "data:regions.regions", 3, {
        intro: text("Lời giới thiệu miền", null, 400),
      }),
    },
  },

  "travel-guide": {
    name: "Cẩm nang du lịch",
    group: GROUP,
    path: "/travel-guide",
    seo: true,
    summary:
      "Tiêu đề, giới thiệu đầu trang và chữ trên thanh lọc / tìm kiếm / nút xem thêm bài viết.",
    // ảnh nền đầu trang = ảnh bài viết (không sửa ở đây) → thẻ trong CMS dùng ảnh chia sẻ
    thumb: "shareImage",
    fields: {
      // mặc định = ảnh chia sẻ chung của website (lib/seo.js) → chưa sửa thì y như cũ
      shareImage: image(
        "Ảnh hiện khi chia sẻ link trang (Facebook, Zalo…)",
        "/images/tours/hd/ha-long.jpg",
        { ratio: 1200 / 630, width: 1200 },
      ),
      heroTitle: text("Tiêu đề trang", "guide.title", 120),
      heroIntro: text("Đoạn giới thiệu", "guide.intro", 300),
      allCategories: text("Nút “Tất cả” chuyên mục", "guide.allCategories", 30),
      searchPlaceholder: text("Chữ mờ trong ô tìm kiếm", "guide.searchPlaceholder", 80),
      noResults: text("Thông báo khi không tìm thấy bài", "guide.noResults", 160),
      loadMore: text("Nút xem thêm bài", "guide.loadMore", 50),
    },
  },
};
