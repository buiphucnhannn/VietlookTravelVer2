/**
 * Ghi nguồn ảnh có giấy phép CC BY / CC BY-SA (bắt buộc ghi tác giả + giấy phép). Ảnh CC0 / public domain không cần.
 * Khoá = đoạn cuối public_id Cloudinary của ảnh (ảnh CMS đặt tên theo nội dung → không đổi khi chép link).
 * Hiện dưới dạng dòng chữ nhỏ ở góc banner trang điểm đến. Thay ảnh khác trong CMS → dòng ghi nguồn tự ẩn.
 */
const CREDITS = {
  // Pù Luông — Wikimedia Commons
  "h-014424fe41b435176ca7c565d99329ad": {
    author: "NKSTTSSHNVN",
    license: "CC BY-SA 4.0",
    url: "https://commons.wikimedia.org/wiki/File:Ru%E1%BB%99ng_b%E1%BA%ADc_thang_P%C3%B9_Lu%C3%B4ng_1_-_NKS.jpg",
  },
  // Điện Biên — Bảo tàng Chiến thắng lịch sử Điện Biên Phủ
  "h-3853c8fb34ab1ba0f57c008c5a2ad8d9": {
    author: "Ioe2015",
    license: "CC BY-SA 4.0",
    url: "https://commons.wikimedia.org/wiki/File:The_Museum_of_Dien_Bien_Phu_Victory_(front,_2022).jpg",
  },
  // Côn Đảo — Mũi Cá Mập
  "h-0b3bb94eddeeaaba9f3e1bf5f5767931": {
    author: "Tuderna",
    license: "CC BY 3.0",
    url: "https://commons.wikimedia.org/wiki/File:M%C5%A9i_C%C3%A1_M%E1%BA%ADp_C%C3%B4n_%C4%90%E1%BA%A3o_-_panoramio.jpg",
  },
};

/** Thông tin ghi nguồn của 1 ảnh (link Cloudinary / đường dẫn) hoặc null */
export function photoCredit(src) {
  const id = String(src ?? "")
    .split("?")[0]
    .split("/")
    .pop()
    ?.replace(/\.[a-z0-9]+$/i, "");
  return (id && CREDITS[id]) || null;
}

/** Chữ "Ảnh" theo ngôn ngữ */
export const PHOTO_LABEL = { en: "Photo", zh: "图片", vi: "Ảnh" };
