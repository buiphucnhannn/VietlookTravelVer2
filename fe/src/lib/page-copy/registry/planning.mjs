/**
 * Giao diện trang — nhóm "Tour nhóm & lên kế hoạch": Tour nhóm & thiết kế riêng, Lên kế hoạch chuyến đi,
 * Trang cảm ơn. Gộp vào PAGE_COPY ở ../registry.mjs (xem hướng dẫn đầy đủ ở đầu file đó).
 * Bản kiểm tra dữ liệu bên máy chủ: be/src/constants/page-copy/planning.js (phải khớp kiểu + max + count).
 *
 * Không import gì (dữ liệu thuần, backend test đọc trực tiếp) → các hàm kiểu ô chép y hệt registry.mjs.
 */

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

const HERO_CROP = { ratio: 16 / 9, width: 2560 }; // ảnh nền toàn màn hình
const BG_CROP = { ratio: 16 / 9, width: 1920 }; // ảnh nền mờ phía sau 1 khối
const GROUP = "Tour nhóm & lên kế hoạch";

export const PLANNING_PAGES = {
  "group-tailor-made-tours": {
    name: "Tour nhóm & thiết kế riêng",
    group: GROUP,
    path: "/group-tailor-made-tours",
    summary:
      "Đầu trang, giới thiệu, dải du lịch không rào cản, luôn bao gồm, loại nhóm, cách làm việc, câu hỏi thường gặp.",
    thumb: "heroImage",
    fields: {
      // Đầu trang
      heroImage: image(
        "Ảnh nền đầu trang",
        "/images/tours/hd/hoang-su-phi-ha-giang.jpg",
        HERO_CROP,
      ),
      heroTitle: text("Tiêu đề trang", "group.title", 120),
      heroSubtitle: text("Dòng giới thiệu dưới tiêu đề", "group.subtitle", 200),
      heroCta: text("Nút lên lịch trình", "group.cta", 60),
      // Giới thiệu + dải du lịch không rào cản
      intro: para("Đoạn giới thiệu", "group.intro", 600),
      accessTitle: text("Tiêu đề dải du lịch không rào cản", "access.title", 120),
      accessText: para("Mô tả dải du lịch không rào cản", "access.badgeLong", 400),
      accessCta: text("Chữ liên kết của dải không rào cản", "access.cta", 60),
      // Thanh mục lục (5 mục, đúng thứ tự các khối bên dưới)
      tabs: list("Thanh mục lục", "group.tabs", 5, text("Tên mục", null, 40)),
      // Luôn bao gồm
      includedImage: image(
        "Ảnh nền khối luôn bao gồm",
        "/images/tours/v2/sapa-6713725.jpg",
        BG_CROP,
      ),
      includedTitle: text("Tiêu đề khối luôn bao gồm", "group.includedTitle", 160),
      included: list("Thẻ luôn bao gồm", "group.included", 6, {
        title: text("Tiêu đề", null, 80),
        text: para("Mô tả", null, 300),
      }),
      // Dải 4 cam kết
      pillarsImage: image("Ảnh nền dải cam kết", "/images/tours/v2/ninh-binh-c51.jpg", BG_CROP),
      pillars: list("Dải cam kết", "group.pillars", 4, text("Cam kết", null, 60)),
      // Loại nhóm
      groupTitle: text("Tiêu đề khối loại nhóm", "group.groupTitle", 120),
      groupImages: list(
        "Ảnh các thẻ loại nhóm",
        [
          "/images/tours/v2/nha-trang-13610647.jpg",
          "/images/tours/v2/phu-quoc-26742974.jpg",
          "/images/tours/v2/phu-quoc-c248.jpg",
          "/images/tours/v2/halong-bay-5531592.jpg",
        ],
        4,
        image("Ảnh thẻ", null, { ratio: 16 / 10, width: 1200 }),
      ),
      groups: list("Thẻ loại nhóm", "group.groups", 4, {
        title: text("Tên loại nhóm", null, 80),
        text: para("Mô tả", null, 300),
      }),
      // Cách làm việc
      howImage: image(
        "Ảnh nền khối cách làm việc",
        "/images/tours/v2/ninh-binh-2131928.jpg",
        BG_CROP,
      ),
      howTitle: text("Tiêu đề khối cách làm việc", "group.howTitle", 120),
      how: list("Các bước", "group.how", 4, {
        title: text("Tên bước", null, 80),
        text: para("Mô tả bước", null, 300),
      }),
      // Form lên kế hoạch (ô của form giữ nguyên)
      planImage: image("Ảnh nền khối lên kế hoạch", "/images/tours/v2/sapa-6872758.jpg", BG_CROP),
      plannerTitle: text("Tiêu đề khối lên kế hoạch", "group.plannerTitle", 120),
      plannerSubtitle: para("Mô tả khối lên kế hoạch", "home.plannerSubtitle", 300),
      // Đánh giá (danh sách: CMS → Đánh giá)
      reviewsEyebrow: text("Dòng chữ nhỏ trên tiêu đề đánh giá", "home.reviewsEyebrow", 80),
      reviewsTitle: text("Tiêu đề khối đánh giá", "home.reviewsTitle", 120),
      reviewsSubtitle: para("Mô tả khối đánh giá", "home.reviewsSubtitle", 300),
      // Câu hỏi thường gặp
      faqTitle: text("Tiêu đề khối câu hỏi", "group.faqTitle", 120),
      faq: list("Câu hỏi thường gặp", "group.faq", 4, {
        q: text("Câu hỏi", null, 200),
        a: para("Trả lời", null, 1000),
      }),
      faqNote: para("Ghi chú dưới câu hỏi", "common.noOnlinePayment", 300),
    },
  },

  "plan-your-trip": {
    name: "Lên kế hoạch chuyến đi",
    group: GROUP,
    path: "/plan-your-trip",
    summary:
      "Ảnh nền, tiêu đề, giới thiệu, các điểm cam kết bên cạnh form và ghi chú thời gian trả lời.",
    thumb: "heroImage",
    fields: {
      heroImage: image("Ảnh nền trang", "/images/tours/v2/sapa-235925.jpg", HERO_CROP),
      crumb: text("Tên trang trên dòng đường dẫn", "nav.planTrip", 60),
      title: text("Tiêu đề trang", "home.plannerTitle", 120),
      subtitle: para("Đoạn giới thiệu", "home.plannerSubtitle", 300),
      points: list("Các điểm cam kết", "home.customPoints", 5, text("Điểm cam kết", null, 160)),
      replyNote: text("Ghi chú thời gian trả lời", "common.weReply", 200),
    },
  },

  "thank-you": {
    name: "Trang cảm ơn",
    group: GROUP,
    path: "/thank-you",
    // không có ô ảnh → ảnh thẻ trong CMS là 1 ảnh có sẵn cố định (chỉ để trang trí thẻ)
    cover: "/images/tours/v2/hoi-an-23857938.jpg",
    summary: "Lời cảm ơn sau khi khách gửi yêu cầu, các bước tiếp theo và 2 nút bên dưới.",
    fields: {
      title: text("Tiêu đề", "thanks.title", 120),
      text: para("Lời nhắn", "thanks.text", 400),
      step1: text("Bước tiếp theo — thời gian trả lời", "thanks.step1", 200),
      step2: text("Bước tiếp theo — cần nhanh hơn", "thanks.step2", 200),
      whatsapp: text("Nút nhắn WhatsApp", "thanks.whatsapp", 50),
      browse: text("Nút xem tiếp các tour", "thanks.browse", 50),
    },
  },
};
