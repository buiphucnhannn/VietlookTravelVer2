/**
 * Giao diện trang — nhóm "Toàn website": Đầu & chân trang (hiện trên MỌI trang), Trang không tìm thấy (404).
 * Cách khai báo: xem hướng dẫn đầu file ../registry.mjs. Chép đúng kiểu + max + count sang
 * be/src/constants/page-copy/global.js (máy chủ kiểm tra dữ liệu).
 *
 * Không sửa ở đây (cố ý):
 *   - Số điện thoại, email, WeChat, LINE, địa chỉ, link Facebook / Tripadvisor / Google Maps, tên công ty,
 *     mã số doanh nghiệp, giấy phép: CMS → Cài đặt → Thông tin liên hệ (dùng chung cả website + email).
 *   - Tên các mục menu & link chân trang: là cấu trúc điều hướng (cùng chữ với tiêu đề trang, đường dẫn,
 *     menu điện thoại, sơ đồ trang) — đổi riêng ở đây dễ lệch tên giữa menu và trang → giữ cố định.
 *   - Trang 404 toàn cục (đường dẫn không thuộc ngôn ngữ nào, app/global-not-found.js): trang tĩnh 3 thứ tiếng,
 *     không đọc dữ liệu CMS.
 * File này KHÔNG import gì (dữ liệu thuần) để backend test đọc được trực tiếp.
 */

const text = (label, def, max = 160, extra) => ({ type: "text", label, def, max, ...extra });
const para = (label, def, max = 600, extra) => ({ type: "para", label, def, max, ...extra });
const image = (label, def, crop, extra) => ({ type: "image", label, def, crop, ...extra });

const GROUP = "Toàn website";

export const GLOBAL_PAGES = {
  global: {
    name: "Đầu & chân trang",
    group: GROUP,
    path: "/",
    summary:
      "Thanh trên cùng, nút lên kế hoạch, dải “Biết đến chúng tôi qua”, dải mời lên kế hoạch, tiêu đề cột và dòng bản quyền — hiện trên mọi trang.",
    thumb: "ctaImage",
    fields: {
      // Thanh trên cùng (máy tính)
      topTagline: text("Dòng giới thiệu bên trái thanh trên cùng", "topbar.dmc", 80),
      partnersLabel: text("Chữ link Đối tác B2B", "topbar.partners", 40),
      planTrip: text("Nút lên kế hoạch miễn phí (đầu trang)", "nav.planTrip", 40),
      // Chân trang — dải "biết đến chúng tôi qua"
      knowUs: text("Chữ dải “Biết đến chúng tôi qua”", "footer.knowUs", 80),
      // Dải mời lên kế hoạch
      ctaImage: image("Ảnh nền dải mời lên kế hoạch", "/images/tours/v2/hanoi-33946371.jpg", {
        ratio: 16 / 5,
        width: 1920,
      }),
      ctaPhoto: image("Ảnh nhỏ nghiêng bên trái", "/images/tours/v2/halong-bay-1018475.jpg", {
        ratio: 11 / 7,
        width: 600,
      }),
      ctaTitle: text("Tiêu đề dải mời lên kế hoạch", "footer.ctaTitle", 80),
      ctaText: para("Mô tả dải mời lên kế hoạch", "footer.ctaText", 200),
      ctaButton: text("Nút dải mời lên kế hoạch", "footer.ctaButton", 40),
      // Tiêu đề các cột chân trang
      colAbout: text("Tiêu đề cột 1 (Việt Nam)", "footer.aboutVietnam", 40),
      colServices: text("Tiêu đề cột 2 (Dịch vụ)", "footer.ourServices", 40),
      colCompany: text("Tiêu đề cột 3 (Công ty)", "footer.company", 40),
      colContact: text("Tiêu đề cột 4 (Liên hệ)", "footer.contact", 40),
      // Dải dưới cùng
      payments: text("Chữ trước logo thanh toán", "footer.payments", 40),
      rights: text("Câu bản quyền (sau tên công ty)", "footer.rights", 120),
    },
  },

  "not-found": {
    name: "Trang không tìm thấy (404)",
    group: GROUP,
    path: "/page-not-found",
    summary:
      "Trang khách thấy khi mở link sai hoặc trang đã bị xoá: ảnh nền, tiêu đề, lời nhắn, 2 nút.",
    thumb: "image",
    fields: {
      image: image("Ảnh nền", "/images/tours/v2/sapa-235925.jpg", { ratio: 16 / 9, width: 2560 }),
      title: text("Tiêu đề", "notFound.title", 80),
      text: para("Lời nhắn", "notFound.text", 300),
      homeButton: text("Nút về trang chủ", "common.backHome", 40),
      toursButton: text("Nút xem tour", "nav.allTours", 40),
    },
  },
};
