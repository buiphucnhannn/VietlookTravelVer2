/**
 * Kiểm tra dữ liệu "Giao diện trang" — nhóm Thông tin & đối tác (Liên hệ, Đối tác B2B, Dịch vụ).
 * Bản đầy đủ (nhãn, nguồn mặc định): fe/src/lib/page-copy/registry/info.mjs — giữ đúng kiểu + max + count.
 */

const text = (max) => ({ type: "text", max });
const para = (max) => ({ type: "para", max });
const image = () => ({ type: "image" });
const list = (count, item) => ({ type: "list", count, item });

const points = list(3, text(120));

export const INFO_SCHEMA = {
  contact: {
    heroImages: list(3, image()),
    heroTitle: text(120),
    heroSubtitle: text(200),
    formImage: image(),
    formTitle: text(120),
    formText: para(400),
    successTitle: text(120),
    successText: para(300),
    directTitle: text(120),
    directText: para(300),
    noteText: para(300),
    noteSign: text(80),
    officeTitle: text(120),
    findUs: text(80),
  },

  partners: {
    heroImages: list(3, image()),
    heroTitle: text(120),
    heroSubtitle: text(160),
    intro: para(600),
    offersImage: image(),
    offerTitle: text(120),
    offers: list(8, { title: text(80), text: para(300) }),
    gallery: list(4, image()),
    formTitle: text(120),
    formText: para(600),
    company: text(60),
    country: text(60),
    website: text(60),
    volume: text(60),
    successTitle: text(120),
    successText: para(300),
  },

  services: {
    heroTitle: text(120),
    heroSubtitle: para(400),
    intro: text(160),
    images: list(5, image()),
    items: list(5, { title: text(100), text: para(500), cta: text(60) }),
    points0: points,
    points1: points,
    points2: points,
    points3: points,
    points4: points,
  },
};
