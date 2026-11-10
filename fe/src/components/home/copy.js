import { siteConfig } from "@/constants/site";

/**
 * CÂU CHỮ TRANG CHỦ SỬA ĐƯỢC TRONG CMS (Trang chủ → bấm thẳng vào chữ để sửa).
 *
 * Câu mặc định nằm trong từ điển giao diện (`dict.home`) + vài câu bổ sung bên dưới.
 * CMS lưu ở `home.copy`, cùng cấu trúc với từ điển nhưng mỗi câu là { en, zh, vi }.
 * Ô nào trong CMS để trống → website dùng câu mặc định của đúng ngôn ngữ đó.
 * Dùng chung cho trang công khai (`withHomeCopy`) và trang quản trị (`fillCopy` / `stripCopy`).
 */
export const COPY_KEYS = [
  "trust",
  "servicesEyebrow",
  "servicesTitle",
  "servicesSubtitle",
  "services",
  "b2bEyebrow",
  "b2bTitle",
  "b2bAudiences",
  "b2bText",
  "b2bPoints",
  "b2bCta",
  "mapEyebrow",
  "mapTitle",
  "mapSubtitle",
  "gridEyebrow",
  "gridTitle",
  "gridSubtitle",
  "heritageEyebrow",
  "heritageTitle",
  "heritageText",
  "heritageStats",
  "featuredEyebrow",
  "featuredTitle",
  "featuredSubtitle",
  "featuredCta",
  "longToursTitle",
  "longToursSubtitle",
  "longToursCta",
  "stepsEyebrow",
  "stepsTitle",
  "steps",
  "themesTitle",
  "themesSubtitle",
  "customEyebrow",
  "customTitle",
  "customSubtitle",
  "customText",
  "customPoints",
  "customCta",
  "whyTitle",
  "whySubtitle",
  "why",
  "partnerStrip",
  "partnersEyebrow",
  "projectsTitle",
  "partnersSubtitle",
  "projects",
  "partnersCta",
  "reviewsEyebrow",
  "reviewsTitle",
  "reviewsSubtitle",
  "guideEyebrow",
  "guideTitle",
  "guideSubtitle",
  "guideCta",
  "monthEyebrow",
  "monthTitle",
  "monthSubtitle",
  "plannerTitle",
  "plannerSubtitle",
  "aboutTitle",
  "aboutSubtitle",
  "aboutText",
  "aboutCta",
];

/** Khoá trong từ điển không phải câu chữ (không sửa, không lưu) */
const SKIP = new Set(["kind"]);

const reviews = siteConfig.tripadvisorRating.reviews;
const stat = (label) => ({ label });

/** Câu mặc định chưa có trong từ điển giao diện */
const EXTRA = {
  en: {
    b2bAudiences: ["Travel agencies", "OTAs", "MICE organisers", "Tour operators"],
    heritageStats: [
      "Operating since",
      "Tours & packages",
      "Destinations, North to South",
      "Airports with fast-track",
      "Seats – cars to coaches",
      `Tripadvisor · ${reviews} reviews`,
    ].map(stat),
  },
  zh: {
    b2bAudiences: ["旅行社", "OTA平台", "会奖（MICE）", "批发商"],
    heritageStats: [
      "创立于",
      "条线路与套餐",
      "个目的地 · 从北到南",
      "个机场提供快速通关",
      "座 · 从轿车到大巴",
      `猫途鹰 · ${reviews} 条评价`,
    ].map(stat),
  },
  vi: {
    b2bAudiences: ["Đại lý du lịch", "Nền tảng OTA", "Đơn vị tổ chức MICE", "Công ty lữ hành"],
    heritageStats: [
      "Hoạt động từ năm",
      "Tour & gói du lịch",
      "Điểm đến từ Bắc vào Nam",
      "Sân bay có dịch vụ fast-track",
      "Chỗ – từ xe con đến xe khách",
      `Tripadvisor · ${reviews} đánh giá`,
    ].map(stat),
  },
};

const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);

/** Câu mặc định của các phần sửa được, theo 1 ngôn ngữ (`dictHome` = dict.home của ngôn ngữ đó) */
export function defaultHomeCopy(dictHome, lang) {
  const src = { ...dictHome, ...(EXTRA[lang] ?? EXTRA.en) };
  return Object.fromEntries(COPY_KEYS.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));
}

function overlay(def, cms, lang) {
  if (typeof def === "string") {
    const v = cms?.[lang];
    return typeof v === "string" && v.trim() ? v : def;
  }
  if (Array.isArray(def))
    return def.map((d, i) => overlay(d, Array.isArray(cms) ? cms[i] : undefined, lang));
  if (isObj(def))
    return Object.fromEntries(
      Object.entries(def).map(([k, v]) => [k, SKIP.has(k) ? v : overlay(v, cms?.[k], lang)]),
    );
  return def;
}

/** Trang công khai: `dict.home` với chữ đã sửa trong CMS đè lên câu mặc định (ô trống → giữ mặc định) */
export function withHomeCopy(dictHome, cms, lang) {
  return { ...dictHome, ...overlay(defaultHomeCopy(dictHome, lang), isObj(cms) ? cms : {}, lang) };
}

/* ---------- Trang quản trị ---------- */

const LANGS = ["en", "zh", "vi"];

/** Duyệt theo cấu trúc bản tiếng Anh; `leaf(defs, node)` với defs = { en, zh, vi } câu mặc định */
function walk(defs, node, leaf) {
  const d = defs.en;
  if (typeof d === "string") return leaf(defs, isObj(node) ? node : {});
  const sub = (k) => Object.fromEntries(LANGS.map((l) => [l, defs[l]?.[k]]));
  if (Array.isArray(d))
    return d.map((_, i) => walk(sub(i), Array.isArray(node) ? node[i] : null, leaf));
  if (isObj(d))
    return Object.fromEntries(
      Object.keys(d)
        .filter((k) => !SKIP.has(k))
        .map((k) => [k, walk(sub(k), isObj(node) ? node[k] : null, leaf)]),
    );
  return undefined;
}
const text = (v) => (typeof v === "string" ? v : "");

/** CMS → dữ liệu form: ô trống được điền sẵn câu mặc định để nhân viên thấy đúng chữ đang hiện trên web */
export const fillCopy = (defs, cms) =>
  walk(defs, cms, (def, node) =>
    Object.fromEntries(LANGS.map((l) => [l, text(node[l]).trim() || text(def[l] ?? def.en)])),
  );

/** Dữ liệu form → CMS: câu giống hệt mặc định thì lưu trống (website tiếp tục dùng câu mặc định) */
export const stripCopy = (defs, state) =>
  walk(defs, state, (def, node) =>
    Object.fromEntries(
      LANGS.map((l) => {
        const v = text(node[l]).trim();
        return [l, v === text(def[l] ?? def.en).trim() ? "" : v];
      }),
    ),
  );
