// Điểm đến theo miền (Bắc – Trung – Nam). Sau này quản lý qua CMS.
export const regions = [
  {
    slug: "north-vietnam",
    name: { en: "North Vietnam", zh: "越南北部" },
    short: { en: "North", zh: "北部" },
    image: "/images/tours/hd/du-lich-tay-bac.jpg",
    intro: {
      en: "Limestone seascapes, emerald rice terraces and the thousand-year-old capital. The North is where Vietnam's culture and drama of nature meet.",
      zh: "喀斯特海景、翠绿梯田与千年古都——越南北部是文化与壮丽自然交汇之地。",
    },
  },
  {
    slug: "central-vietnam",
    name: { en: "Central Vietnam", zh: "越南中部" },
    short: { en: "Central", zh: "中部" },
    image: "/images/tours/v2/hue-c102.jpg",
    intro: {
      en: "Imperial Hue, lantern-lit Hoi An, Da Nang's beaches and the cool highlands of Dalat – heritage and coastline in one journey.",
      zh: "顺化皇城、灯笼古城会安、岘港海滩与凉爽的大叻高原——遗产与海岸一程尽览。",
    },
  },
  {
    slug: "south-vietnam",
    name: { en: "South Vietnam", zh: "越南南部" },
    short: { en: "South", zh: "南部" },
    image: "/images/tours/v2/mekong-delta-28428669.jpg",
    intro: {
      en: "Energetic Saigon, the floating markets of the Mekong Delta and the white-sand islands of Phu Quoc.",
      zh: "活力西贡、湄公河三角洲水上市场与富国岛的白沙海滩。",
    },
  },
];

export const destinations = [
  // North
  {
    slug: "hanoi",
    region: "north-vietnam",
    highlights: [
      { en: "Old Quarter", zh: "老城区" },
      { en: "Hoan Kiem Lake", zh: "还剑湖" },
      { en: "Temple of Literature", zh: "文庙" },
    ],
    name: { en: "Hanoi", zh: "河内" },
    image: "/images/tours/v2/hanoi-19577375.jpg",
    hero: "/images/tours/v2/hanoi-3300834.jpg",
    keywords: [
      "hanoi",
      "ha noi",
      "old quarter",
      "duong lam",
      "bat trang",
      "chuong",
      "conical hat",
      "lang huong",
      "quang phu cau",
      "tam dao",
      "huong pagoda",
      "perfume",
    ],
    intro: {
      en: "Vietnam's capital blends French boulevards, ancient temples, lakes and the best street food in the country. Most northern journeys start here.",
      zh: "越南首都融合法式林荫大道、古老寺庙、湖泊与全国最棒的街头美食，大多数北部行程都从这里出发。",
    },
  },
  {
    slug: "halong-bay",
    region: "north-vietnam",
    highlights: [
      { en: "Overnight cruise", zh: "过夜游轮" },
      { en: "Sung Sot Cave", zh: "惊讶洞" },
      { en: "Kayaking", zh: "皮划艇" },
    ],
    name: { en: "Halong Bay", zh: "下龙湾" },
    image: "/images/tours/hd/ha-long.jpg",
    hero: "/images/tours/hd/emperor-cruises.jpg",
    keywords: ["halong", "ha long", "lan ha", "bai tu long", "cat ba", "quan lan", "cruise"],
    intro: {
      en: "Thousands of limestone islands rising from emerald water – best experienced on an overnight cruise with kayaking and cave visits.",
      zh: "数千座石灰岩岛屿矗立于翡翠色海面——乘坐过夜游轮、划皮艇、探溶洞是最佳体验方式。",
    },
  },
  {
    slug: "ninh-binh",
    region: "north-vietnam",
    name: { en: "Ninh Binh", zh: "宁平" },
    image: "/images/tours/v2/ninh-binh-c43.jpg",
    hero: "/images/tours/v2/ninh-binh-c42.jpg",
    keywords: [
      "ninh binh",
      "tam coc",
      "trang an",
      "hoa lu",
      "bai dinh",
      "mua cave",
      "van long",
      "thung nham",
    ],
    intro: {
      en: "“Halong Bay on land”: rowing boats through rice fields and karst caves, ancient Hoa Lu and the climb to Mua Cave.",
      zh: "被誉为“陆上下龙湾”：乘小船穿越稻田与溶洞，游览华闾古都，登舞洞山观景。",
    },
  },
  {
    slug: "sapa",
    region: "north-vietnam",
    name: { en: "Sapa", zh: "沙坝" },
    image: "/images/tours/v2/sapa-2131899.jpg",
    hero: "/images/tours/v2/sapa-9761821.jpg",
    keywords: ["sapa", "sa pa", "fansipan", "cat cat", "lao cai", "moana"],
    intro: {
      en: "Mountain town above sweeping rice terraces, home to Hmong and Dao communities and Fansipan – the roof of Indochina.",
      zh: "坐落于层层梯田之上的山城，苗族与瑶族的家园，还有“印度支那屋脊”番西邦峰。",
    },
  },
  {
    slug: "ha-giang",
    region: "north-vietnam",
    name: { en: "Ha Giang", zh: "河江" },
    image: "/images/tours/hd/hoang-su-phi-ha-giang.jpg",
    keywords: ["ha giang", "hoang su phi", "dong van", "ma pi leng"],
    intro: {
      en: "Vietnam's northernmost frontier – dramatic mountain passes, karst plateaus and colourful ethnic markets.",
      zh: "越南最北端的边陲——壮观的山口、喀斯特高原与多彩的民族集市。",
    },
  },
  {
    slug: "cao-bang",
    region: "north-vietnam",
    name: { en: "Cao Bang", zh: "高平" },
    image: "/images/tours/cao-bang.jpg",
    keywords: ["cao bang", "ban gioc", "nguom ngao", "bao lac", "ba be", "bac kan"],
    intro: {
      en: "Ban Gioc waterfall, Nguom Ngao cave and quiet valleys far from the crowds.",
      zh: "板约瀑布、偶鳌洞与远离人潮的宁静山谷。",
    },
  },
  {
    slug: "moc-chau",
    region: "north-vietnam",
    name: { en: "Moc Chau", zh: "木州" },
    image: "/images/tours/hd/doi-che-moc-chau.jpg",
    keywords: ["moc chau", "mai chau", "tay bac", "northwest", "pu luong"],
    intro: {
      en: "Tea hills, plum blossom valleys and stilt-house villages of the Northwest loop.",
      zh: "茶山、梅花谷与西北环线上的高脚屋村寨。",
    },
  },
  // Central
  {
    slug: "hue",
    region: "central-vietnam",
    name: { en: "Hue", zh: "顺化" },
    image: "/images/tours/v2/hue-36847479.jpg",
    hero: "/images/tours/hue-tour.jpg",
    keywords: ["hue", "imperial", "lang co", "hien luong", "dmz", "quang tri"],
    intro: {
      en: "Former imperial capital on the Perfume River – citadel, royal tombs and refined Hue cuisine.",
      zh: "香江畔的前皇城——皇城、帝陵与精致的顺化宫廷菜。",
    },
  },
  {
    slug: "da-nang",
    region: "central-vietnam",
    highlights: [
      { en: "Ba Na Hills", zh: "巴拿山" },
      { en: "Golden Bridge", zh: "金桥" },
      { en: "My Khe Beach", zh: "美溪海滩" },
    ],
    name: { en: "Da Nang", zh: "岘港" },
    image: "/images/tours/v2/da-nang-19927758.jpg",
    hero: "/images/tours/da-nang-tour-copy.jpg",
    keywords: ["da nang", "danang", "ba na", "golden bridge", "linh ung", "son tra", "marble"],
    intro: {
      en: "Golden Bridge in the clouds at Ba Na Hills, long sandy beaches and the Marble Mountains.",
      zh: "巴拿山云端黄金桥、绵长沙滩与五行山。",
    },
  },
  {
    slug: "hoi-an",
    region: "central-vietnam",
    name: { en: "Hoi An", zh: "会安" },
    image: "/images/tours/v2/hoi-an-92090.jpg",
    hero: "/images/tours/v2/hoi-an-746921.jpg",
    keywords: ["hoi an", "my son", "cham", "bay mau", "coconut", "tra que", "cu lao"],
    intro: {
      en: "UNESCO-listed old town glowing with lanterns, basket-boat coconut forests and craft villages.",
      zh: "联合国教科文组织遗产古城，灯笼璀璨，还有簸箕船椰林与手工艺村。",
    },
  },
  {
    slug: "nha-trang",
    region: "central-vietnam",
    name: { en: "Nha Trang", zh: "芽庄" },
    image: "/images/tours/v2/nha-trang-2887293.jpg",
    keywords: ["nha trang", "hon mun", "hon tam", "vinpearl", "khanh hoa", "long son"],
    intro: {
      en: "Turquoise bays, coral reefs and island-hopping on Vietnam's favourite beach city.",
      zh: "碧蓝海湾、珊瑚礁与跳岛游——越南最受欢迎的海滨城市。",
    },
  },
  {
    slug: "dalat",
    region: "central-vietnam",
    name: { en: "Dalat", zh: "大叻" },
    image: "/images/tours/v2/dalat-21250288.jpg",
    keywords: ["dalat", "da lat", "lam dong"],
    intro: {
      en: "The cool “city of eternal spring” with pine forests, flower gardens and French villas.",
      zh: "凉爽的“四季如春之城”，松林、花园与法式别墅。",
    },
  },
  {
    slug: "quang-binh",
    region: "central-vietnam",
    name: { en: "Phong Nha & Quang Binh", zh: "峰牙与广平" },
    image: "/images/tours/v2/vietnam-916406.jpg",
    keywords: ["phong nha", "quang binh", "cua lo", "nghe an"],
    intro: {
      en: "The world's largest caves and jungle rivers of Phong Nha – Ke Bang National Park.",
      zh: "世界最大溶洞群与峰牙-己榜国家公园的丛林河流。",
    },
  },
  // South
  {
    slug: "ho-chi-minh-city",
    region: "south-vietnam",
    highlights: [
      { en: "Ben Thanh Market", zh: "滨城市场" },
      { en: "Cu Chi Tunnels", zh: "古芝地道" },
      { en: "Notre-Dame", zh: "圣母大教堂" },
    ],
    name: { en: "Ho Chi Minh City", zh: "胡志明市" },
    image: "/images/tours/v2/ho-chi-minh-city-1018478.jpg",
    keywords: ["ho chi minh", "saigon", "sai gon", "cu chi", "hcm", "cho lon", "binh tay"],
    intro: {
      en: "Saigon's colonial landmarks, buzzing markets and Cu Chi Tunnels – the gateway to the South.",
      zh: "西贡的殖民地地标、热闹市场与古芝地道——南部的门户。",
    },
  },
  {
    slug: "mekong-delta",
    region: "south-vietnam",
    name: { en: "Mekong Delta", zh: "湄公河三角洲" },
    image: "/images/tours/v2/mekong-delta-3180637.jpg",
    keywords: ["mekong", "mien tay", "can tho", "ben tre", "my tho", "chau doc"],
    intro: {
      en: "Floating markets, fruit orchards and slow boat rides through the rice bowl of Vietnam.",
      zh: "水上市场、果园与慢船——穿行于越南的鱼米之乡。",
    },
  },
  {
    slug: "phu-quoc",
    region: "south-vietnam",
    highlights: [
      { en: "Sao Beach", zh: "星星海滩" },
      { en: "Hon Thom cable car", zh: "香岛缆车" },
      { en: "Night market", zh: "夜市" },
    ],
    name: { en: "Phu Quoc", zh: "富国岛" },
    image: "/images/tours/v2/phu-quoc-10615143.jpg",
    hero: "/images/tours/v2/phu-quoc-14012373.jpg",
    keywords: ["phu quoc", "hon thom", "may rut", "rach vem", "sunset town", "grand world"],
    intro: {
      en: "Island paradise with powder-white beaches, snorkelling reefs and the world's longest sea cable car.",
      zh: "海岛天堂：粉白沙滩、浮潜珊瑚礁与世界最长跨海缆车。",
    },
  },
  {
    slug: "mui-ne",
    region: "south-vietnam",
    name: { en: "Mui Ne", zh: "美奈" },
    image: "/images/tours/v2/mui-ne-29481297.jpg",
    hero: "/images/tours/v2/mui-ne-c191.jpg",
    keywords: ["mui ne", "phan thiet", "binh thuan", "suoi tien", "fairy stream"],
    intro: {
      en: "Red and white sand dunes, the Fairy Stream and kitesurfing beaches.",
      zh: "红白沙丘、仙女溪与风筝冲浪海滩。",
    },
  },
  {
    slug: "vung-tau",
    region: "south-vietnam",
    name: { en: "Vung Tau", zh: "头顿" },
    image: "/images/tours/v2/vung-tau-30440722.jpg",
    keywords: ["vung tau", "con dao"],
    intro: {
      en: "Seaside escape from Saigon with the giant Christ statue and fresh seafood.",
      zh: "西贡近郊的海滨度假地，有巨型基督像与新鲜海鲜。",
    },
  },
];

export const getRegion = (slug) => regions.find((r) => r.slug === slug);
export const getDestination = (slug) => destinations.find((d) => d.slug === slug);
export const destinationsByRegion = (regionSlug) =>
  destinations.filter((d) => d.region === regionSlug);

/** Lựa chọn điểm đến cho form thiết kế tour. */
export function plannerOptions(lang) {
  const pick = [
    "hanoi",
    "halong-bay",
    "ninh-binh",
    "sapa",
    "ha-giang",
    "hue",
    "hoi-an",
    "da-nang",
    "nha-trang",
    "ho-chi-minh-city",
    "mekong-delta",
    "phu-quoc",
  ];
  const name = (o) => o.name[lang] ?? o.name.en;
  return [
    ...regions.map((r) => ({ value: r.slug, label: name(r) })),
    ...pick.map((s) => getDestination(s)).map((d) => ({ value: d.slug, label: name(d) })),
  ];
}
