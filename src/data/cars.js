// Dịch vụ xe riêng kèm tài xế. Giá tuyến lấy từ vietlooktravel.com (USD/xe, đã gồm cầu đường & xăng).
import routes from "./generated/car-routes.json";

// Ảnh đội xe: ảnh tách nền từ Wikimedia Commons thuộc CC0 / Public domain (không cần ghi công)
const C = "/images/rent-car/cutouts";

/** Hạng xe (4 – 45 chỗ). `priceKey` ứng với cột giá trong bảng tuyến của website cũ. */
export const fleet = [
  {
    key: "sedan",
    seats: 4,
    pax: 3,
    luggage: 2,
    name: { en: "Sedan", zh: "轿车" },
    tagline: { en: "Comfort for 1–3 travellers", zh: "1–3人舒适出行" },
    images: [`${C}/fleet/cc0-sedan-1.webp`, `${C}/fleet/cc0-sedan-2.webp`],
    models: ["Toyota Vios", "Hyundai Accent", "Honda City", "Mazda 3", "Honda Civic"],
    ideal: {
      en: ["Airport transfers", "Business trips", "City tours"],
      zh: ["机场接送", "商务出行", "城市观光"],
    },
    priceKey: "sedan",
    accent: "#1780c1",
  },
  {
    key: "suv",
    seats: 7,
    pax: 5,
    luggage: 4,
    name: { en: "SUV / Crossover", zh: "SUV / 跨界车" },
    tagline: { en: "Space & power for long roads", zh: "长途出行空间与动力兼备" },
    images: [`${C}/fleet/cc0-suv-1.webp`, `${C}/fleet/cc0-suv-2.webp`],
    models: [
      "Toyota Fortuner",
      "Mitsubishi Xpander",
      "Ford Everest",
      "Toyota Innova",
      "VinFast VF9",
    ],
    ideal: {
      en: ["Families", "Mountain roads", "Intercity transfers"],
      zh: ["家庭出行", "山区道路", "城际接送"],
    },
    priceKey: "suv",
    accent: "#0f6aa6",
  },
  {
    key: "minivan",
    seats: 7,
    pax: 7,
    luggage: 5,
    name: { en: "Minivan / MPV", zh: "MPV 商务车" },
    tagline: { en: "Flexible seats for small groups", zh: "灵活座椅，适合小团体" },
    images: [`${C}/fleet/cc0-minivan-1.webp`, `${C}/fleet/cc0-minivan-2.webp`],
    models: ["Toyota Innova", "Mitsubishi Xpander", "Suzuki Ertiga", "Toyota Avanza / Veloz"],
    ideal: {
      en: ["Small groups", "Resort transfers", "Multi-day trips"],
      zh: ["小团体", "度假村接送", "多日行程"],
    },
    priceKey: "minivan",
    accent: "#0d5687",
  },
  {
    key: "luxury",
    seats: 7,
    pax: 7,
    luggage: 5,
    vip: true,
    name: { en: "Luxury MPV", zh: "豪华MPV" },
    tagline: { en: "VIP captain seats & electric doors", zh: "VIP航空座椅与电动侧门" },
    images: [`${C}/fleet/cc0-luxury-1.webp`, `${C}/fleet/cc0-luxury-2.webp`],
    models: ["Kia Carnival", "Kia Sedona", "Toyota Granvia"],
    ideal: {
      en: ["VIP guests", "Honeymooners", "Executive transfers"],
      zh: ["VIP贵宾", "蜜月夫妇", "高管接送"],
    },
    priceKey: "luxury",
    accent: "#b0201b",
  },
  {
    key: "limo9",
    seats: 9,
    pax: 9,
    luggage: 7,
    vip: true,
    name: { en: "Limousine Van 9–11", zh: "豪华商务车 9–11座" },
    tagline: { en: "Lounge seats, ambient lights, Wi-Fi", zh: "沙发座椅、氛围灯与Wi-Fi" },
    images: [`${C}/fleet/cc0-limo9-1.webp`, `${C}/fleet/cc0-limo9-2.webp`],
    models: ["DCar Limousine", "Auto Kingdom", "Ford Tourneo", "Hyundai Starex"],
    ideal: {
      en: ["Halong & Sapa trips", "Corporate guests", "Families with seniors"],
      zh: ["下龙与沙坝之旅", "企业贵宾", "带长者的家庭"],
    },
    priceKey: null,
    accent: "#7a4b14",
  },
  {
    key: "van16",
    seats: 16,
    pax: 14,
    luggage: 12,
    name: { en: "16-seat Van", zh: "16座中巴" },
    tagline: { en: "The go-to for mid-size groups", zh: "中型团队首选" },
    images: [`${C}/fleet/cc0-van16-1.webp`, `${C}/fleet/cc0-van16-2.webp`],
    models: ["Ford Transit", "Hyundai Solati", "Toyota Hiace"],
    ideal: {
      en: ["Group tours", "Team outings", "Airport groups"],
      zh: ["团队游", "公司出游", "机场团队接送"],
    },
    priceKey: null,
    accent: "#0f4870",
  },
  {
    key: "coach29",
    seats: 29,
    pax: 25,
    luggage: 20,
    name: { en: "29-seat Coach", zh: "29座大巴" },
    tagline: { en: "Comfortable mini-coach for groups", zh: "舒适中型大巴" },
    images: [`${C}/fleet/cc0-coach29-1.webp`, `${C}/fleet/cc0-coach29-2.webp`],
    models: ["Hyundai County", "Thaco Meadow"],
    ideal: {
      en: ["School & study tours", "Incentive groups", "Weddings"],
      zh: ["研学团", "奖励旅游", "婚礼用车"],
    },
    priceKey: null,
    accent: "#1780c1",
  },
  {
    key: "coach45",
    seats: 45,
    pax: 40,
    luggage: 40,
    name: { en: "45-seat Coach", zh: "45座大巴" },
    tagline: { en: "Full-size coach for big events", zh: "大型活动全尺寸大巴" },
    images: [`${C}/fleet/cc0-coach45-1.webp`, `${C}/fleet/cc0-coach45-2.webp`],
    models: ["Hyundai Universe", "Thaco"],
    ideal: {
      en: ["MICE & conferences", "Large tour groups", "Event shuttles"],
      zh: ["会奖与会议", "大型旅游团", "活动接驳"],
    },
    priceKey: null,
    accent: "#ee3b35",
  },
];

/** Khu vực phục vụ (theo danh mục xe của website cũ) */
export const carAreas = [
  {
    key: "hanoi",
    name: { en: "Hanoi", zh: "河内" },
    airport: "Noi Bai (HAN)",
    image: "/images/tours/v2/hanoi-17177476.jpg",
  },
  {
    key: "da-nang",
    name: { en: "Da Nang", zh: "岘港" },
    airport: "Da Nang (DAD)",
    image: "/images/tours/v2/da-nang-15747058.jpg",
  },
  {
    key: "nha-trang",
    name: { en: "Nha Trang", zh: "芽庄" },
    airport: "Cam Ranh (CXR)",
    image: "/images/tours/hd/nha-trang-da-lat-mui-ne-ho-chi-minh-city.jpg",
  },
  {
    key: "dalat",
    name: { en: "Dalat", zh: "大叻" },
    airport: "Lien Khuong (DLI)",
    image: "/images/tours/v2/dalat-31017723.jpg",
  },
  {
    key: "mui-ne",
    name: { en: "Mui Ne", zh: "美奈" },
    airport: "Phan Thiet",
    image: "/images/tours/v2/mui-ne-31412412.jpg",
  },
  {
    key: "ho-chi-minh-city",
    name: { en: "Ho Chi Minh City", zh: "胡志明市" },
    airport: "Tan Son Nhat (SGN)",
    image: "/images/tours/hcm-tour-2 (2).jpg",
  },
  {
    key: "phu-quoc",
    name: { en: "Phu Quoc", zh: "富国岛" },
    airport: "Phu Quoc (PQC)",
    image: "/images/tours/v2/phu-quoc-c250.jpg",
  },
];

// Dịch tên tuyến sang tiếng Trung (địa danh + từ khóa)
const zhPlaces = [
  [/Noi Bai International Airport|Noi Bai Airport/gi, "内排国际机场"],
  [/Ho Chi Minh City|Ho Chi Minh|Saigon/gi, "胡志明市"],
  [/Hanoi Center|Hanoi/gi, "河内"],
  [/Halong Bay/gi, "下龙湾"],
  [/Ninh Binh/gi, "宁平"],
  [/Moc Chau/gi, "木州"],
  [/Mai Chau/gi, "梅州"],
  [/Huu Nghi/gi, "友谊关"],
  [/Hai Phong/gi, "海防"],
  [/Cao Bang/gi, "高平"],
  [/Ha Giang/gi, "河江"],
  [/Mu Cang Chai/gi, "木江界"],
  [/Pu Luong/gi, "普隆"],
  [/Bat Trang/gi, "钵场"],
  [/Railway/gi, "火车站"],
  [/Mui Ne/gi, "美奈"],
  [/Dalat|Da Lat/gi, "大叻"],
  [/Mekong Delta/gi, "湄公河三角洲"],
  [/Cu Chi Tunnels/gi, "古芝地道"],
  [/Vung Tau/gi, "头顿"],
  [/Nha Trang/gi, "芽庄"],
  [/Paradise Bay/gi, "天堂湾"],
  [/Da Nang/gi, "岘港"],
  [/Hoi An/gi, "会安"],
  [/Ba Na Hills/gi, "巴拿山"],
  [/Hue/g, "顺化"],
  [/My Son Sanctuary/gi, "美山圣地"],
  [/Son Tra/gi, "山茶半岛"],
  [/Phu Quoc/gi, "富国岛"],
  [/Centre Hotel Area/gi, "市中心酒店区"],
  [/East Island/gi, "东岛"],
  [/North Island/gi, "北岛"],
  [/South Island/gi, "南岛"],
  [/Jeep Driving On Sand/gi, "沙丘吉普车"],
];
const zhWords = [
  [/Airport Pick Up/gi, "机场接机"],
  [/Pick Up At/gi, "接机："],
  [/Port Pick Up/gi, "码头接送"],
  [/Airport/gi, "机场"],
  [/Private Car Transfer|By Private Car Transfer|By Private Car|Private Car/gi, "包车"],
  [/City Tour/gi, "城市游"],
  [/And Return To/gi, "往返"],
  [/Round-?Trip/gi, "往返"],
  [/\(one way\)|One Way|1 Way/gi, "单程"],
  [/\bTo\b/gi, "→"],
  [/\bIn\b/gi, ""],
  [/–/g, "–"],
  [/Pick Up/gi, "接送"],
];
export function routeTitle(title, lang) {
  if (lang !== "zh") return title;
  let s = title;
  for (const [re, v] of [...zhPlaces, ...zhWords]) s = s.replace(re, v);
  return s.replace(/\s+/g, " ").trim();
}

// Thời gian di chuyển tham khảo (giờ) cho các tuyến chính
const hours = {
  "hanoi-to-halong-bay-private-car-transfer": 2.5,
  "hanoi-to-ninh-binh-private-car-transfer": 1.5,
  "hanoi-to-ha-giang-private-car-transfer": 6,
  "hanoi-to-cao-bang-by-private-car": 5.5,
  "hanoi-to-moc-chau-private-car-transfer": 4,
  "hanoi-to-mai-chau-by-private-car": 3.5,
  "hanoi-to-mu-cang-chai-private-car-transfer": 6,
  "hanoi-to-pu-luong-1-way": 4,
  "hanoi-to-hai-phong-private-car-transfer": 1.5,
  "hanoi-pick-up-at-noi-bai-airport": 0.75,
  "saigon-to-mui-ne-private-car-transfer": 3.5,
  "ho-chi-minh-to-vung-tau-by-private-car-transfer": 2,
  "ho-chi-minh-to-mekong-delta-by-private-car-transfer": 2,
  "nha-trang-to-dalat-private-car-transfer": 3.5,
  "nha-trang-to-mui-ne-private-car": 4,
  "nha-trang-to-saigon-private-car-transfer": 7,
  "da-nang-to-hoi-an-one-way": 0.75,
  "da-nang-to-hue-one-way-by-private-car": 2.5,
  "mui-ne-to-dalat-by-private-car-transfer": 3.5,
  "mui-ne-to-ho-chi-minh-by-private-car": 3.5,
};

export const carRoutes = routes.map((r) => ({ ...r, hours: hours[r.slug] ?? null }));

export const routesByArea = (area) => carRoutes.filter((r) => r.area === area);

/** Giá đón sân bay Nội Bài theo hạng xe – dùng làm "giá từ". */
export function airportFrom(priceKey) {
  const r = carRoutes.find((x) => x.slug === "hanoi-pick-up-at-noi-bai-airport");
  return priceKey && r ? r.prices[priceKey] : null;
}

/** Địa điểm đón/trả (nhóm Sân bay / Thành phố & điểm du lịch – như ô báo giá của hltcarservice.com). */
export const places = {
  han: { group: "air", name: { en: "Noi Bai Airport (HAN)", zh: "内排国际机场 (HAN)" } },
  sgn: { group: "air", name: { en: "Tan Son Nhat Airport (SGN)", zh: "新山一机场 (SGN)" } },
  dad: { group: "air", name: { en: "Da Nang Airport (DAD)", zh: "岘港机场 (DAD)" } },
  cxr: { group: "air", name: { en: "Cam Ranh Airport (CXR)", zh: "金兰机场 (CXR)" } },
  dli: { group: "air", name: { en: "Lien Khuong Airport (DLI)", zh: "连姜机场 (DLI)" } },
  pqc: { group: "air", name: { en: "Phu Quoc Airport (PQC)", zh: "富国岛机场 (PQC)" } },
  hanoi: { group: "city", name: { en: "Hanoi (city centre)", zh: "河内市区" } },
  "hanoi-station": { group: "city", name: { en: "Hanoi Railway Station", zh: "河内火车站" } },
  halong: { group: "city", name: { en: "Halong Bay", zh: "下龙湾" } },
  "ninh-binh": { group: "city", name: { en: "Ninh Binh", zh: "宁平" } },
  "hai-phong": { group: "city", name: { en: "Hai Phong", zh: "海防" } },
  "bat-trang": { group: "city", name: { en: "Bat Trang", zh: "钵场陶瓷村" } },
  "moc-chau": { group: "city", name: { en: "Moc Chau", zh: "木州" } },
  "mai-chau": { group: "city", name: { en: "Mai Chau", zh: "梅州" } },
  "huu-nghi": { group: "city", name: { en: "Huu Nghi Border Gate", zh: "友谊关" } },
  "cao-bang": { group: "city", name: { en: "Cao Bang", zh: "高平" } },
  "ha-giang": { group: "city", name: { en: "Ha Giang", zh: "河江" } },
  "mu-cang-chai": { group: "city", name: { en: "Mu Cang Chai", zh: "木江界" } },
  "pu-luong": { group: "city", name: { en: "Pu Luong", zh: "普隆" } },
  hcm: { group: "city", name: { en: "Ho Chi Minh City", zh: "胡志明市" } },
  "mui-ne": { group: "city", name: { en: "Mui Ne", zh: "美奈" } },
  mekong: { group: "city", name: { en: "Mekong Delta", zh: "湄公河三角洲" } },
  "cu-chi": { group: "city", name: { en: "Cu Chi Tunnels", zh: "古芝地道" } },
  "vung-tau": { group: "city", name: { en: "Vung Tau", zh: "头顿" } },
  "nha-trang": { group: "city", name: { en: "Nha Trang", zh: "芽庄" } },
  "nha-trang-port": { group: "city", name: { en: "Nha Trang Port", zh: "芽庄码头" } },
  "paradise-bay": { group: "city", name: { en: "Paradise Bay", zh: "天堂湾" } },
  dalat: { group: "city", name: { en: "Dalat", zh: "大叻" } },
  "da-nang": { group: "city", name: { en: "Da Nang", zh: "岘港" } },
  "hoi-an": { group: "city", name: { en: "Hoi An", zh: "会安" } },
  "ba-na": { group: "city", name: { en: "Ba Na Hills", zh: "巴拿山" } },
  hue: { group: "city", name: { en: "Hue", zh: "顺化" } },
  "my-son": { group: "city", name: { en: "My Son Sanctuary", zh: "美山圣地" } },
  "phu-quoc": { group: "city", name: { en: "Phu Quoc (town centre)", zh: "富国岛市区" } },
  "pq-north": { group: "city", name: { en: "Phu Quoc North Island", zh: "富国岛北岛" } },
  "pq-south": { group: "city", name: { en: "Phu Quoc South Island", zh: "富国岛南岛" } },
  "pq-east": { group: "city", name: { en: "Phu Quoc East Island", zh: "富国岛东岛" } },
};

/** Điểm đón → điểm đến của từng tuyến trên web cũ. kind: transfer | day (thuê theo ngày/tham quan). */
const routePoints = {
  "hanoi-pick-up-at-noi-bai-airport": ["han", "hanoi"],
  "hanoi-center-to-railway-private-car": ["hanoi", "hanoi-station"],
  "hanoi-city-private-car": ["hanoi", "hanoi", "day"],
  "hanoi-to-bat-trang-by-private-car": ["hanoi", "bat-trang", "day"],
  "hanoi-to-ninh-binh-private-car-transfer": ["hanoi", "ninh-binh"],
  "hanoi-to-moc-chau-private-car-transfer": ["hanoi", "moc-chau"],
  "hanoi-to-mai-chau-by-private-car": ["hanoi", "mai-chau"],
  "hanoi-to-huu-nghi-and-return-to-hanoi": ["hanoi", "huu-nghi", "day"],
  "hanoi-to-halong-bay-private-car-transfer": ["hanoi", "halong"],
  "hanoi-to-hai-phong-private-car-transfer": ["hanoi", "hai-phong"],
  "hanoi-to-cao-bang-by-private-car": ["hanoi", "cao-bang"],
  "hanoi-to-ha-giang-private-car-transfer": ["hanoi", "ha-giang"],
  "hanoi-to-mu-cang-chai-private-car-transfer": ["hanoi", "mu-cang-chai"],
  "hanoi-to-pu-luong-1-way": ["hanoi", "pu-luong"],
  "ho-chi-minh-airport-pick-up-by-private-car": ["sgn", "hcm"],
  "ho-chi-minh-city-private-car": ["hcm", "hcm", "day"],
  "saigon-to-mui-ne-private-car-transfer": ["hcm", "mui-ne"],
  "ho-chi-minh-to-mekong-delta-by-private-car-transfer": ["hcm", "mekong"],
  "saigon-to-cu-chi-tunnels-private-car": ["hcm", "cu-chi", "day"],
  "ho-chi-minh-to-vung-tau-by-private-car-transfer": ["hcm", "vung-tau"],
  "mui-ne-to-dalat-by-private-car-transfer": ["mui-ne", "dalat"],
  "mui-ne-to-ho-chi-minh-by-private-car": ["mui-ne", "hcm"],
  "nha-trang-airport-pick-up-one-way-by-private-car": ["cxr", "nha-trang"],
  "nha-trang-port-pick-up-one-way-by-private-car": ["nha-trang-port", "nha-trang"],
  "nha-trang-to-paradise-bay-and-return": ["nha-trang", "paradise-bay", "day"],
  "nha-trang-city-tour-by-private-car": ["nha-trang", "nha-trang", "day"],
  "nha-trang-to-dalat-private-car-transfer": ["nha-trang", "dalat"],
  "nha-trang-to-mui-ne-private-car": ["nha-trang", "mui-ne"],
  "nha-trang-to-saigon-private-car-transfer": ["nha-trang", "hcm"],
  "da-nang-airport-pick-up-one-way": ["dad", "da-nang"],
  "da-nang-to-hoi-an-one-way": ["da-nang", "hoi-an"],
  "da-nang-to-ba-na-hills-round-trip": ["da-nang", "ba-na", "day"],
  "da-nang-to-hue-one-way-by-private-car": ["da-nang", "hue"],
  "da-nang-to-my-son-sanctuary-round-trip": ["da-nang", "my-son", "day"],
  "da-nang-son-tra-da-nang-city-tour-by-private-car": ["da-nang", "da-nang", "day"],
  "da-lat-city-tour-by-private-car": ["dalat", "dalat", "day"],
  "da-lat-airport-pick-up-one-way": ["dli", "dalat"],
  "phu-quoc-airport-to-centre-hotel-area": ["pqc", "phu-quoc"],
  "phu-quoc-centre-hotel-area-to-north-island": ["phu-quoc", "pq-north", "day"],
  "phu-quoc-centre-hotel-area-to-south-island": ["phu-quoc", "pq-south", "day"],
  "phu-quoc-centre-hotel-area-to-east-island": ["phu-quoc", "pq-east", "day"],
};

/** Danh sách giá cho ô báo giá: mỗi tuyến có from/to/kind và giá theo hạng xe (chỉ giá thật). */
export const quoteRoutes = carRoutes
  .filter((r) => routePoints[r.slug])
  .map((r) => {
    const [from, to, kind = "transfer"] = routePoints[r.slug];
    return { slug: r.slug, from, to, kind, hours: r.hours, prices: r.prices };
  });
