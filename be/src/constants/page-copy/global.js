/**
 * Kiểm tra dữ liệu "Giao diện trang" — nhóm Toàn website (Đầu & chân trang, Trang 404).
 * Bản đầy đủ (nhãn, nguồn mặc định): fe/src/lib/page-copy/registry/global.mjs — giữ đúng kiểu + max + count.
 */

const text = (max) => ({ type: "text", max });
const para = (max) => ({ type: "para", max });
const image = () => ({ type: "image" });

export const GLOBAL_SCHEMA = {
  global: {
    topTagline: text(80),
    partnersLabel: text(40),
    planTrip: text(40),
    knowUs: text(80),
    ctaImage: image(),
    ctaPhoto: image(),
    ctaTitle: text(80),
    ctaText: para(200),
    ctaButton: text(40),
    colAbout: text(40),
    colServices: text(40),
    colCompany: text(40),
    colContact: text(40),
    payments: text(40),
    rights: text(120),
  },

  "not-found": {
    image: image(),
    title: text(80),
    text: para(300),
    homeButton: text(40),
    toursButton: text(40),
  },
};
