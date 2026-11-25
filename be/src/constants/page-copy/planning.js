/**
 * Kiểm tra dữ liệu "Giao diện trang" — nhóm Tour nhóm & lên kế hoạch (Tour nhóm & thiết kế riêng,
 * Lên kế hoạch chuyến đi, Trang cảm ơn).
 * Bản đầy đủ (nhãn, nguồn mặc định): fe/src/lib/page-copy/registry/planning.mjs — giữ đúng kiểu + max + count.
 */

const text = (max) => ({ type: "text", max });
const para = (max) => ({ type: "para", max });
const image = () => ({ type: "image" });
const list = (count, item) => ({ type: "list", count, item });

const card = { title: text(80), text: para(300) };

export const PLANNING_SCHEMA = {
  "group-tailor-made-tours": {
    heroImage: image(),
    heroTitle: text(120),
    heroSubtitle: text(200),
    heroCta: text(60),
    intro: para(600),
    accessTitle: text(120),
    accessText: para(400),
    accessCta: text(60),
    tabs: list(5, text(40)),
    includedImage: image(),
    includedTitle: text(160),
    included: list(6, card),
    pillarsImage: image(),
    pillars: list(4, text(60)),
    groupTitle: text(120),
    groupImages: list(4, image()),
    groups: list(4, card),
    howImage: image(),
    howTitle: text(120),
    how: list(4, card),
    planImage: image(),
    plannerTitle: text(120),
    plannerSubtitle: para(300),
    reviewsEyebrow: text(80),
    reviewsTitle: text(120),
    reviewsSubtitle: para(300),
    faqTitle: text(120),
    faq: list(4, { q: text(200), a: para(1000) }),
    faqNote: para(300),
  },

  "plan-your-trip": {
    heroImage: image(),
    crumb: text(60),
    title: text(120),
    subtitle: para(300),
    points: list(5, text(160)),
    replyNote: text(200),
  },

  "thank-you": {
    title: text(120),
    text: para(400),
    step1: text(200),
    step2: text(200),
    whatsapp: text(50),
    browse: text(50),
  },
};
