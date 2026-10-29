// Chuyên mục cẩm nang (menu nhiều cấp kiểu localvietnam.com)
export const guideCategories = [
  {
    slug: "destinations",
    name: { en: "Destinations", zh: "目的地攻略" },
    description: {
      en: "In-depth guides to Vietnam's regions, cities and hidden corners.",
      zh: "越南各地区、城市与小众角落的深度攻略。",
    },
  },
  {
    slug: "need-to-know",
    name: { en: "Need to know", zh: "出行须知" },
    description: {
      en: "Visa, money, SIM cards, safety and practical tips before you go.",
      zh: "签证、货币、电话卡、安全与出发前的实用贴士。",
    },
  },
  {
    slug: "vietnam-by-month",
    name: { en: "Vietnam by month", zh: "越南月份指南" },
    description: {
      en: "Weather, festivals and where to go in every month of the year.",
      zh: "全年每个月的天气、节庆与推荐目的地。",
    },
  },
  {
    slug: "getting-around",
    name: { en: "Getting around", zh: "交通出行" },
    description: {
      en: "Flights, trains, buses, private cars and the best routes between destinations.",
      zh: "航班、火车、巴士、包车与目的地之间的最佳路线。",
    },
  },
  {
    slug: "food-culture",
    name: { en: "Food & culture", zh: "美食与文化" },
    description: {
      en: "Vietnamese cuisine, traditions, festivals and local etiquette.",
      zh: "越南美食、传统、节庆与当地礼仪。",
    },
  },
  {
    slug: "travel-news",
    name: { en: "Travel news", zh: "旅游资讯" },
    description: {
      en: "Latest Vietnam travel updates, new tours and company news from the Vietlook Travel team in Hanoi.",
      zh: "来自河内 Vietlook Travel 团队的越南旅游最新资讯、新线路与公司动态。",
    },
  },
];

export const getGuideCategory = (slug) => guideCategories.find((c) => c.slug === slug);
