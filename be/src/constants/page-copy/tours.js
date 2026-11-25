/**
 * Kiểm tra dữ liệu "Giao diện trang" — nhóm Tour & du thuyền (Tất cả tour, 3 trang du thuyền, Gói tour).
 * Bản đầy đủ (nhãn, nguồn mặc định): fe/src/lib/page-copy/registry/tours.mjs — giữ đúng kiểu + max + count.
 */

const text = (max) => ({ type: "text", max });
const para = (max) => ({ type: "para", max });
const image = () => ({ type: "image" });
const list = (count, item) => ({ type: "list", count, item });

const hero = { heroImages: list(3, image()), heroTitle: text(160), heroIntro: para(600) };
const advice = { adviceTitle: text(120), adviceText: para(400), adviceCta: text(50) };
const week = (n) => ({
  [`week${n}Title`]: text(120),
  [`week${n}Text`]: para(400),
  [`week${n}BestTitle`]: text(160),
  [`week${n}BestText`]: para(600),
  [`week${n}CtaTitle`]: text(160),
  [`week${n}CtaText`]: para(600),
});

export const TOURS_SCHEMA = {
  tours: { ...hero, ...advice },
  "halong-bay-cruises": { ...hero, ...advice },
  "halong-bay-overnight-cruises": { ...hero, ...advice },
  "day-cruises": { ...hero, ...advice },
  packages: {
    heroImages: list(3, image()),
    collageImages: list(3, image()),
    heroTitle: text(160),
    heroIntro: para(600),
    whyImage: image(),
    whyTitle: text(120),
    why: list(6, { title: text(80), text: para(300) }),
    ourPackages: text(120),
    ...week(1),
    ...week(2),
    ...week(3),
    ctaButton: text(50),
  },
};
