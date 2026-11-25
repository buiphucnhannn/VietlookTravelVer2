/**
 * Giao diện trang — nhóm "Thông tin & đối tác": Liên hệ, Đối tác B2B, Dịch vụ.
 * Cách khai báo: xem hướng dẫn đầu file ../registry.mjs. Chép đúng kiểu + max + count sang
 * be/src/constants/page-copy/info.js (máy chủ kiểm tra dữ liệu).
 *
 * Không sửa ở đây (cố ý):
 *   - Số điện thoại, email, WeChat, địa chỉ, giờ mở cửa, bản đồ (trang Liên hệ): thông tin chung của website
 *     (CMS → Cài đặt → Thông tin liên hệ) — dùng ở chân trang, nút chat… nên chỉ hiện để xem.
 *   - Chủ đề trong form liên hệ: email & CMS dịch chủ đề theo đúng câu gốc → sửa sẽ làm mất bản dịch.
 *   - Khối "Dự án đã phục vụ" (trang Đối tác): dùng chung với trang chủ → sửa ở CMS → Trang chủ.
 * File này KHÔNG import gì (dữ liệu thuần) để backend test đọc được trực tiếp.
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

const BG_CROP = { ratio: 16 / 9, width: 1920 }; // ảnh nền mờ phía sau 1 khối
const HERO_TILE = image("Ảnh nền", null, { ratio: 3 / 4, width: 1200 }); // 1 ô của dải 3 ảnh đầu trang
const GROUP = "Trang thông tin & đối tác";

/** Điểm nổi bật của 1 thẻ dịch vụ (trang Dịch vụ) — 3 dòng có dấu tích */
const servicePoints = (i) =>
  list(
    `Điểm nổi bật – dịch vụ ${i + 1}`,
    `servicesPage.items.${i}.points`,
    3,
    text("Điểm nổi bật", null, 120),
  );

export const INFO_PAGES = {
  contact: {
    name: "Liên hệ",
    group: GROUP,
    path: "/contact",
    summary: "Đầu trang, form gửi tin nhắn, lời mời liên hệ trực tiếp, văn phòng & bản đồ.",
    thumb: "heroImages.0",
    fields: {
      // Đầu trang: 3 ảnh ghép (điện thoại chỉ hiện ảnh đầu)
      heroImages: list(
        "Ảnh nền đầu trang",
        [
          "/images/tours/v2/hanoi-32307858.jpg",
          "/images/tours/v2/hanoi-3300834.jpg",
          "/images/tours/v2/hanoi-33497770.jpg",
        ],
        3,
        HERO_TILE,
      ),
      heroTitle: text("Tiêu đề trang", "contact.title", 120),
      heroSubtitle: text("Dòng giới thiệu dưới tiêu đề", "contact.subtitle", 200),
      // Form gửi tin nhắn
      formImage: image("Ảnh nền khối gửi tin nhắn", "/images/tours/v2/hanoi-32307858.jpg", BG_CROP),
      formTitle: text("Tiêu đề form", "contact.formTitle", 120),
      formText: para("Mô tả dưới tiêu đề form", "contact.formText", 400),
      successTitle: text("Tiêu đề khi gửi thành công", "contact.successTitle", 120),
      successText: para("Lời nhắn khi gửi thành công", "contact.successText", 300),
      // Liên hệ trực tiếp (các kênh chat lấy từ thông tin chung của website)
      directTitle: text("Tiêu đề khối liên hệ trực tiếp", "contact.directTitle", 120),
      directText: para("Mô tả khối liên hệ trực tiếp", "contact.directText", 300),
      noteText: para("Lời nhắn trong ô xanh", "contact.subtitle", 300),
      noteSign: text("Chữ ký dưới lời nhắn", "common.team", 80),
      // Văn phòng & bản đồ (địa chỉ, số điện thoại, email, giờ mở cửa: thông tin chung của website)
      officeTitle: text("Tiêu đề khối văn phòng", "contact.office", 120),
      findUs: text("Chữ link mở Google Maps", "contact.findUs", 80),
    },
  },

  partners: {
    name: "Đối tác B2B",
    group: GROUP,
    path: "/partners",
    summary: "Đầu trang, lời giới thiệu, 8 ưu đãi cho đối tác, ảnh ghép và form hợp tác.",
    thumb: "heroImages.0",
    fields: {
      // Đầu trang
      heroImages: list(
        "Ảnh nền đầu trang",
        [
          "/images/tours/v2/halong-bay-5531592.jpg",
          "/images/tours/v2/halong-bay-58597.jpg",
          "/images/tours/v2/phu-quoc-26742974.jpg",
        ],
        3,
        HERO_TILE,
      ),
      heroTitle: text("Tiêu đề trang", "partners.title", 120),
      heroSubtitle: text("Dòng giới thiệu dưới tiêu đề", "partners.subtitle", 160),
      intro: para("Đoạn giới thiệu dưới đầu trang", "partners.intro", 600),
      // Ưu đãi cho đối tác (biểu tượng từng thẻ cố định)
      offersImage: image("Ảnh nền khối ưu đãi", "/images/tours/hd/emperor-cruises.jpg", BG_CROP),
      offerTitle: text("Tiêu đề khối ưu đãi", "partners.offerTitle", 120),
      offers: list("Thẻ ưu đãi", "partners.offers", 8, {
        title: text("Tên ưu đãi", null, 80),
        text: para("Mô tả ưu đãi", null, 300),
      }),
      // Form hợp tác + 4 ảnh ghép bên cạnh
      gallery: list(
        "Ảnh ghép cạnh form",
        [
          "/images/tours/v2/halong-bay-6348785.jpg",
          "/images/tours/v2/nha-trang-32089687.jpg",
          "/images/tours/v2/nha-trang-5116343.jpg",
          "/images/tours/v2/nha-trang-261715.jpg",
        ],
        4,
        image("Ảnh", null, { ratio: 4 / 3, width: 1600 }),
      ),
      formTitle: text("Tiêu đề form hợp tác", "partners.formTitle", 120),
      formText: para("Mô tả dưới tiêu đề form", "partners.intro", 600),
      company: text("Nhãn ô tên công ty", "partners.company", 60),
      country: text("Nhãn ô quốc gia / thị trường", "partners.country", 60),
      website: text("Nhãn ô website", "partners.website", 60),
      volume: text("Nhãn ô số khách mỗi năm", "partners.volume", 60),
      successTitle: text("Tiêu đề khi gửi thành công", "partners.successTitle", 120),
      successText: para("Lời nhắn khi gửi thành công", "partners.successText", 300),
    },
  },

  services: {
    name: "Dịch vụ",
    group: GROUP,
    path: "/services",
    summary: "Đầu trang và 5 thẻ dịch vụ chính: ảnh, tên, mô tả, điểm nổi bật, chữ trên nút.",
    thumb: "images.0",
    fields: {
      // Đầu trang (ảnh nền đầu trang = ảnh của 3 dịch vụ đầu)
      heroTitle: text("Tiêu đề trang", "servicesPage.title", 120),
      heroSubtitle: para("Đoạn giới thiệu dưới tiêu đề", "servicesPage.subtitle", 400),
      intro: text("Dòng chữ nhỏ trên các dịch vụ", "servicesPage.intro", 160),
      // 5 thẻ dịch vụ (thứ tự, biểu tượng và trang đích cố định)
      images: list(
        "Ảnh dịch vụ",
        [
          "/images/tours/hd/hoang-su-phi-ha-giang.jpg",
          "/images/tours/v2/hoi-an-746921.jpg",
          "/images/rent-car/download.jpeg",
          "/images/tours/welcome-vietlook.png",
          "/images/tours/v2/hanoi-32123175.jpg",
        ],
        5,
        image("Ảnh dịch vụ", null, { ratio: 16 / 10, width: 1600 }),
      ),
      items: list("Thẻ dịch vụ", "servicesPage.items", 5, {
        title: text("Tên dịch vụ", null, 100),
        text: para("Mô tả dịch vụ", null, 500),
        cta: text("Chữ trên nút", null, 60),
      }),
      points0: servicePoints(0),
      points1: servicePoints(1),
      points2: servicePoints(2),
      points3: servicePoints(3),
      points4: servicePoints(4),
    },
  },
};
