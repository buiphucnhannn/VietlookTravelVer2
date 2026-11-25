/**
 * Giao diện trang — thẻ "Chữ chung trên trang chi tiết": các dòng chữ cố định lặp lại trên MỌI trang chi tiết
 * (từng chủ đề /themes/…, từng điểm đến /destinations/…, từng bài viết /travel-guide/…, từng tour /tours/…).
 * Gộp vào PAGE_COPY ở ../registry.mjs (xem hướng dẫn đầy đủ ở đầu file đó). Bản kiểm tra dữ liệu bên máy chủ:
 * be/src/constants/page-copy/detail.js — thêm / sửa ô ở đây thì chép đúng kiểu + max + count sang đó.
 *
 * Chỉ gồm chữ của trang (tiêu đề khối, hộp gợi ý, lời chào…) — nội dung riêng từng tour / bài viết / điểm đến
 * là dữ liệu của mục tương ứng. Cố ý giữ cố định (không sửa ở đây): tên cột bảng lịch trình, chữ trong khung
 * đặt tour (gắn với cách tính giá / form đặt), tên các mục lục trên trang tour.
 * Hộp "Chưa chọn được tour?": trang Tất cả tour / du thuyền / Gói tour đã có ô riêng → ở đây chỉ là bản dùng
 * trên trang điểm đến (trước đây dùng câu mặc định chung).
 * Chữ có {name}: website tự thay bằng tên chủ đề / điểm đến / miền — giữ nguyên {name} khi sửa.
 * File này KHÔNG import gì (dữ liệu thuần) để backend test đọc được trực tiếp.
 */

/* Kiểu ô — giống hệt ../registry.mjs (chép lại vì registry.mjs import file này) */
const text = (label, def, max = 160, extra) => ({ type: "text", label, def, max, ...extra });
const para = (label, def, max = 600, extra) => ({ type: "para", label, def, max, ...extra });

export const DETAIL_PAGES = {
  detail: {
    name: "Chữ chung trên trang chi tiết",
    group: "Toàn website",
    // "Xem trang thật": 1 trang miền có đủ các khối của trang điểm đến (trang mẫu khác: link trong bản xem trước)
    path: "/destinations/north-vietnam",
    // không có ô ảnh → ảnh thẻ trong CMS là 1 ảnh có sẵn cố định (`cover`, chỉ để trang trí thẻ)
    cover: "/images/tours/v2/hoi-an-746921.jpg",
    summary:
      "Tiêu đề khối, hộp gợi ý và lời chào lặp lại trên mọi trang chủ đề, điểm đến, bài viết và tour.",
    fields: {
      // Trang chủ đề (/themes/…)
      themeSamples: text("Tiêu đề đầu trang chủ đề (giữ {name})", "theme.samples", 120),
      themeBrowse: text("Tiêu đề danh sách tour (giữ {name})", "theme.browse", 120),
      themeEmptyTitle: text("Tiêu đề khi chủ đề chưa có tour", "theme.emptyTitle", 120),
      themeEmptyText: para("Mô tả khi chủ đề chưa có tour", "theme.emptyText", 400),
      themeEmptyCta: text("Nút khi chủ đề chưa có tour", "theme.emptyCta", 50),
      themeOthers: text("Tiêu đề dải chủ đề khác", "theme.others", 80),
      // Trang điểm đến (/destinations/…)
      destRegionTours: text("Tiêu đề trang miền (giữ {name})", "destination.regionTours", 120),
      destViewTours: text("Nút xem tour ở đầu trang", "destination.viewTours", 50),
      destBestTours: text("Tiêu đề danh sách tour (giữ {name})", "destination.bestTours", 160),
      adviceTitle: text("Tiêu đề hộp tư vấn dưới danh sách", "tours.notSureTitle", 120),
      adviceText: para("Mô tả hộp tư vấn", "tours.notSureText", 400),
      adviceCta: text("Nút hộp tư vấn", "tours.notSureCta", 50),
      destPlaces: text("Tiêu đề khối điểm đến cùng miền (giữ {name})", "destination.places", 120),
      destGuide: text("Tiêu đề khối bài viết cẩm nang (giữ {name})", "destination.guide", 120),
      // Bài viết cẩm nang (/travel-guide/…)
      guideToc: text("Tiêu đề mục lục bài viết", "guide.toc", 60),
      guideEbookTitle: text("Tiêu đề hộp gợi ý lên kế hoạch", "guide.ebookTitle", 80),
      guideEbookText: text("Mô tả hộp gợi ý lên kế hoạch", "guide.ebookText", 200),
      guideEbookButton: text("Nút hộp gợi ý lên kế hoạch", "nav.planTrip", 50),
      guideAboutAuthor: text("Chữ nhỏ trên ô tác giả", "guide.aboutAuthor", 60),
      guideSidebarTitle: text("Tiêu đề cột bên phải", "guide.sidebarTitle", 60),
      guideRelatedTours: text("Tiêu đề khối tour gợi ý", "guide.relatedTours", 120),
      guideRelated: text("Tiêu đề khối bài viết liên quan", "guide.related", 120),
      // Trang tour (/tours/…)
      tourAccessBadge: text("Dòng hỗ trợ khách khuyết tật", "access.badge", 120),
      tourAccessCta: text("Link cạnh dòng hỗ trợ khách khuyết tật", "access.cta", 50),
      tourAskTitle: text("Tiêu đề ô liên hệ trực tiếp", "tour.askTitle", 120),
      tourContactText: text("Câu giới thiệu ô liên hệ", "tour.contactText", 200),
      tourContactEmail: text(
        "Nhãn nút gửi email (đọc cho người khiếm thị)",
        "tour.contactEmail",
        40,
      ),
      tourContactSignoff: text("Lời chào cuối ô liên hệ", "tour.contactSignoff", 200),
      tourContactTeam: text("Chữ ký cuối ô liên hệ", "tour.contactTeam", 60),
      tourRelated: text("Tiêu đề khối tour gợi ý cuối trang", "tour.related", 120),
    },
  },
};
