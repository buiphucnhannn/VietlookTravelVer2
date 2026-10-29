// Tối đa 08 chủ đề tour (kiểu auroratravel.asia). Hiển thị trên menu & trang chủ.
export const themes = [
  {
    slug: "luxury",
    name: { en: "Luxury", zh: "奢华之旅" },
    image: "/images/tours/hd/emperor-cruises.jpg",
    banner: "/images/tours/hd/tourdulichnhatranggiare.jpg",
    tagline: { en: "5-star stays, private guides", zh: "五星住宿 · 私人导游" },
    intro: {
      en: "Boutique cruises, five-star resorts, private transfers and dedicated guides. Our luxury journeys take care of every detail so you simply enjoy Vietnam at its finest.",
      zh: "精品游轮、五星度假村、专车接送与专属导游——每一个细节都为您安排妥当，尽享越南最美的一面。",
    },
  },
  {
    slug: "hand-picked",
    name: { en: "Hand-picked", zh: "精选线路" },
    image: "/images/tours/v2/hoi-an-746921.jpg",
    banner: "/images/tours/v2/hoi-an-746921.jpg",
    tagline: { en: "Our team's favourite routes", zh: "团队私藏路线" },
    intro: {
      en: "The itineraries our local team recommends most – balanced routes that combine Vietnam's icons with authentic local moments.",
      zh: "本地团队最推荐的行程——将越南经典景点与地道当地体验完美结合。",
    },
  },
  {
    slug: "culture",
    name: { en: "Culture", zh: "文化体验" },
    image: "/images/tours/v2/hue-20676995.jpg",
    banner: "/images/tours/v2/vietnam-12674100.jpg",
    tagline: { en: "Crafts, heritage & people", zh: "手工艺 · 遗产 · 人文" },
    intro: {
      en: "Make a conical hat with artisans, cook with a local family, cycle through craft villages and meet the ethnic communities of the highlands.",
      zh: "与匠人一起制作斗笠、跟当地家庭学做菜、骑行穿越手工艺村，走近高原少数民族。",
    },
  },
  {
    slug: "family",
    name: { en: "Family", zh: "亲子家庭" },
    image: "/images/tours/v2/phu-quoc-2163224.jpg",
    banner: "/images/tours/v2/phu-quoc-26742974.jpg",
    tagline: { en: "Easy pace, fun for all ages", zh: "节奏轻松 · 老少皆宜" },
    intro: {
      en: "Kid-friendly hotels, short transfers and hands-on activities – basket boats, safari parks and beach days the whole family will love.",
      zh: "亲子友好酒店、短途交通与互动体验——簸箕船、野生动物园与海滩，全家都会喜欢。",
    },
  },
  {
    slug: "honeymoon",
    name: { en: "Honeymoon", zh: "蜜月浪漫" },
    image: "/images/tours/hd/glaming.jpg",
    banner: "/images/tours/v2/hanoi-33946371.jpg",
    tagline: { en: "Romantic escapes for two", zh: "两人世界的浪漫之旅" },
    intro: {
      en: "Sunset cruises, private beach dinners and island villas. Celebrate together with a journey designed only for the two of you.",
      zh: "日落游船、私人海滩晚餐与海岛别墅——专为你们二人设计的庆祝之旅。",
    },
  },
  {
    slug: "classic",
    name: { en: "Classic", zh: "经典路线" },
    image: "/images/tours/hd/ha-long.jpg",
    banner: "/images/tours/v2/halong-bay-1018475.jpg",
    tagline: { en: "Vietnam's must-see icons", zh: "越南必游经典" },
    intro: {
      en: "First time in Vietnam? Hanoi, Halong Bay, Hoi An, Saigon and the Mekong – the timeless highlights from North to South.",
      zh: "第一次来越南？河内、下龙湾、会安、西贡与湄公河——由北到南的永恒经典。",
    },
  },
  {
    slug: "photography",
    name: { en: "Photography", zh: "摄影之旅" },
    image: "/images/tours/v2/ninh-binh-c46.jpg",
    banner: "/images/tours/hd/hoang-su-phi-ha-giang.jpg",
    tagline: { en: "Golden hours & epic views", zh: "黄金时刻 · 壮美风光" },
    intro: {
      en: "Timed for the best light: terraced rice fields, lotus lakes, misty mountains and fishing villages at dawn.",
      zh: "追逐最佳光线：梯田、荷花湖、云雾山峦与清晨的渔村。",
    },
  },
  {
    slug: "tailor-made",
    name: { en: "Tailor-made", zh: "私人定制" },
    image: "/images/tours/v2/sapa-235925.jpg",
    banner: "/images/tours/hd/du-lich-tay-bac.jpg",
    tagline: { en: "Designed around you", zh: "为您量身打造" },
    intro: {
      en: "Your dates, your pace, your hotel class (3–5★) and budget. Tell us what you love and we design a private itinerary just for you.",
      zh: "按照您的日期、节奏、酒店等级（3–5星）与预算——告诉我们您的喜好，我们为您定制专属私人行程。",
    },
  },
];

export const getTheme = (slug) => themes.find((t) => t.slug === slug);
