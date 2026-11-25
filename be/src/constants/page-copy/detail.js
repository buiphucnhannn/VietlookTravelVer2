/**
 * Kiểm tra dữ liệu "Giao diện trang" — thẻ Chữ chung trên trang chi tiết (chủ đề, điểm đến, bài viết, tour).
 * Bản đầy đủ (nhãn, nguồn mặc định): fe/src/lib/page-copy/registry/detail.mjs — giữ đúng kiểu + max + count.
 */

const text = (max) => ({ type: "text", max });
const para = (max) => ({ type: "para", max });

export const DETAIL_SCHEMA = {
  detail: {
    themeSamples: text(120),
    themeBrowse: text(120),
    themeEmptyTitle: text(120),
    themeEmptyText: para(400),
    themeEmptyCta: text(50),
    themeOthers: text(80),
    destRegionTours: text(120),
    destViewTours: text(50),
    destBestTours: text(160),
    adviceTitle: text(120),
    adviceText: para(400),
    adviceCta: text(50),
    destPlaces: text(120),
    destGuide: text(120),
    guideToc: text(60),
    guideEbookTitle: text(80),
    guideEbookText: text(200),
    guideEbookButton: text(50),
    guideAboutAuthor: text(60),
    guideSidebarTitle: text(60),
    guideRelatedTours: text(120),
    guideRelated: text(120),
    tourAccessBadge: text(120),
    tourAccessCta: text(50),
    tourAskTitle: text(120),
    tourContactText: text(200),
    tourContactEmail: text(40),
    tourContactSignoff: text(200),
    tourContactTeam: text(60),
    tourRelated: text(120),
  },
};
