// Dịch vụ xe riêng kèm tài xế. Giá tuyến lấy từ vietlooktravel.com (USD/xe, đã gồm cầu đường & xăng).
import routes from "./generated/car-routes.json";

// Hạng xe (4 – 45 chỗ) và khu vực phục vụ: quản lý trong CMS (Dịch vụ → Xe). Giá theo tuyến để cứng bên dưới.

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

// Dịch tên tuyến sang tiếng Việt: đảo trật tự câu trước (trên tên tiếng Anh), rồi địa danh, rồi từ khóa
const viPhrases = [
  [/^Phu Quoc Centre Hotel Area To (.+)$/i, "Phú Quốc: khu khách sạn trung tâm đi $1"],
  [/^(.+?) Airport To (.+)$/i, "Sân bay $1 đi $2"],
  [/^(.+?) Airport Pick Up(.*)$/i, "Đón sân bay $1$2"],
  [/^(.+?) Port Pick Up(.*)$/i, "Đón tại cảng $1$2"],
  [/^(.+?) Pick Up At (.+)$/i, "Đón tại $2 về $1"],
  [/^(.+?) City Tour(.*)$/i, "Tham quan $1$2"],
  [/^(.+?) City Private Car$/i, "Xe riêng nội thành $1"],
  [/^(.+?) To (.+?) And Return To .+$/i, "$1 đi $2 (khứ hồi)"],
  [/^Jeep Driving On Sand In (.+)$/i, "Xe jeep vượt đồi cát tại $1"],
];
const viPlaces = [
  [/Noi Bai International Airport|Noi Bai Airport/gi, "Sân bay Quốc tế Nội Bài"],
  [/Ho Chi Minh City|Ho Chi Minh/gi, "TP. Hồ Chí Minh"],
  [/Saigon/gi, "Sài Gòn"],
  [/Hanoi Center/gi, "Trung tâm Hà Nội"],
  [/Hanoi/gi, "Hà Nội"],
  [/Halong Bay/gi, "Vịnh Hạ Long"],
  [/Ninh Binh/gi, "Ninh Bình"],
  [/Moc Chau/gi, "Mộc Châu"],
  [/Mai Chau/gi, "Mai Châu"],
  [/Huu Nghi/gi, "Cửa khẩu Hữu Nghị"],
  [/Hai Phong/gi, "Hải Phòng"],
  [/Cao Bang/gi, "Cao Bằng"],
  [/Ha Giang/gi, "Hà Giang"],
  [/Mu Cang Chai/gi, "Mù Cang Chải"],
  [/Pu Luong/gi, "Pù Luông"],
  [/Bat Trang/gi, "Bát Tràng"],
  [/Railway/gi, "ga tàu"],
  [/Mui Ne/gi, "Mũi Né"],
  [/Dalat|Da Lat/gi, "Đà Lạt"],
  [/Mekong Delta/gi, "Đồng bằng sông Cửu Long"],
  [/Cu Chi Tunnels/gi, "Địa đạo Củ Chi"],
  [/Vung Tau/gi, "Vũng Tàu"],
  [/Paradise Bay/gi, "Vịnh Paradise"],
  [/Da Nang/gi, "Đà Nẵng"],
  [/Hoi An/gi, "Hội An"],
  [/Ba Na Hills/gi, "Bà Nà Hills"],
  [/\bHue\b/g, "Huế"],
  [/My Son Sanctuary/gi, "Thánh địa Mỹ Sơn"],
  [/Son Tra/gi, "Sơn Trà"],
  [/Phu Quoc/gi, "Phú Quốc"],
  [/Centre Hotel Area/gi, "khu khách sạn trung tâm"],
  [/East Island/gi, "Đông đảo"],
  [/North Island/gi, "Bắc đảo"],
  [/South Island/gi, "Nam đảo"],
];
const viWords = [
  [/By Private Car Transfer|Private Car Transfer|By Private Car|Private Car/gi, "bằng xe riêng"],
  [/\(one way\)|\b1 Way\b|\bOne Way\b/gi, "(một chiều)"],
  [/Round-?\s?Trip/gi, "(khứ hồi)"],
  [/\bTo\b/g, "đi"],
  [/Airport/gi, "sân bay"],
  [/\bPick Up\b/gi, "đón"],
  [/\bIn\b/g, "tại"],
];

export function routeTitle(title, lang) {
  if (lang === "vi") {
    let s = title;
    for (const [re, v] of [...viPhrases, ...viPlaces, ...viWords]) s = s.replace(re, v);
    s = s.replace(/\s+/g, " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
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

/** Giá đón sân bay Nội Bài theo hạng xe – dùng làm "giá từ". */
export function airportFrom(priceKey) {
  const r = carRoutes.find((x) => x.slug === "hanoi-pick-up-at-noi-bai-airport");
  return priceKey && r ? r.prices[priceKey] : null;
}

/**
 * Địa điểm đón/trả (nhóm Sân bay / Thành phố & điểm du lịch – như ô báo giá của hltcarservice.com).
 * Theo danh sách khách gửi (11 sân bay, 44 điểm đón: đủ 28 điểm khách gửi + điểm cũ), sắp xếp Bắc → Trung → Nam.
 * Điểm chưa có tuyến giá cố định vẫn chọn được – ô báo giá hiện "Giá liên hệ".
 */
export const places = {
  // ---- Sân bay ----
  han: {
    group: "air",
    name: { en: "Noi Bai Airport (HAN)", zh: "内排国际机场 (HAN)", vi: "Sân bay Nội Bài (HAN)" },
  },
  hph: {
    group: "air",
    name: {
      en: "Cat Bi Airport – Hai Phong (HPH)",
      zh: "吉碑机场 – 海防 (HPH)",
      vi: "Sân bay Cát Bi – Hải Phòng (HPH)",
    },
  },
  vdo: {
    group: "air",
    name: {
      en: "Van Don Airport – Quang Ninh (VDO)",
      zh: "云屯机场 – 广宁 (VDO)",
      vi: "Sân bay Vân Đồn – Quảng Ninh (VDO)",
    },
  },
  vdh: {
    group: "air",
    name: {
      en: "Dong Hoi Airport – Quang Binh (VDH)",
      zh: "洞海机场 – 广平 (VDH)",
      vi: "Sân bay Đồng Hới – Quảng Bình (VDH)",
    },
  },
  hui: {
    group: "air",
    name: {
      en: "Phu Bai Airport – Hue (HUI)",
      zh: "富牌机场 – 顺化 (HUI)",
      vi: "Sân bay Phú Bài – Huế (HUI)",
    },
  },
  dad: {
    group: "air",
    name: { en: "Da Nang Airport (DAD)", zh: "岘港机场 (DAD)", vi: "Sân bay Đà Nẵng (DAD)" },
  },
  cxr: {
    group: "air",
    name: { en: "Cam Ranh Airport (CXR)", zh: "金兰机场 (CXR)", vi: "Sân bay Cam Ranh (CXR)" },
  },
  dli: {
    group: "air",
    name: {
      en: "Lien Khuong Airport (DLI)",
      zh: "连姜机场 (DLI)",
      vi: "Sân bay Liên Khương (DLI)",
    },
  },
  sgn: {
    group: "air",
    name: {
      en: "Tan Son Nhat Airport (SGN)",
      zh: "新山一机场 (SGN)",
      vi: "Sân bay Tân Sơn Nhất (SGN)",
    },
  },
  pqc: {
    group: "air",
    name: { en: "Phu Quoc Airport (PQC)", zh: "富国岛机场 (PQC)", vi: "Sân bay Phú Quốc (PQC)" },
  },
  vcs: {
    group: "air",
    name: { en: "Con Dao Airport (VCS)", zh: "昆岛机场 (VCS)", vi: "Sân bay Côn Đảo (VCS)" },
  },

  // ---- Miền Bắc ----
  hanoi: {
    group: "city",
    name: { en: "Hanoi (city centre)", zh: "河内市区", vi: "Hà Nội (trung tâm)" },
  },
  "hanoi-station": {
    group: "city",
    name: { en: "Hanoi Railway Station", zh: "河内火车站", vi: "Ga Hà Nội" },
  },
  "bat-trang": {
    group: "city",
    name: { en: "Bat Trang", zh: "钵场陶瓷村", vi: "Làng gốm Bát Tràng" },
  },
  halong: { group: "city", name: { en: "Halong Bay", zh: "下龙湾", vi: "Vịnh Hạ Long" } },
  "hai-phong": { group: "city", name: { en: "Hai Phong", zh: "海防", vi: "Hải Phòng" } },
  "ninh-binh": { group: "city", name: { en: "Ninh Binh", zh: "宁平", vi: "Ninh Bình" } },
  sapa: { group: "city", name: { en: "Sapa", zh: "沙坝", vi: "Sa Pa" } },
  "mai-chau": { group: "city", name: { en: "Mai Chau", zh: "梅州", vi: "Mai Châu" } },
  "moc-chau": { group: "city", name: { en: "Moc Chau", zh: "木州", vi: "Mộc Châu" } },
  "son-la": { group: "city", name: { en: "Son La", zh: "山罗", vi: "Sơn La" } },
  "dien-bien": { group: "city", name: { en: "Dien Bien", zh: "奠边府", vi: "Điện Biên" } },
  "mu-cang-chai": { group: "city", name: { en: "Mu Cang Chai", zh: "木江界", vi: "Mù Cang Chải" } },
  "thai-nguyen": { group: "city", name: { en: "Thai Nguyen", zh: "太原", vi: "Thái Nguyên" } },
  "lang-son": { group: "city", name: { en: "Lang Son", zh: "谅山", vi: "Lạng Sơn" } },
  "huu-nghi": {
    group: "city",
    name: { en: "Huu Nghi Border Gate", zh: "友谊关", vi: "Cửa khẩu Hữu Nghị" },
  },
  "cao-bang": { group: "city", name: { en: "Cao Bang", zh: "高平", vi: "Cao Bằng" } },
  "bac-kan": { group: "city", name: { en: "Bac Kan", zh: "北件", vi: "Bắc Kạn" } },
  "ha-giang": { group: "city", name: { en: "Ha Giang", zh: "河江", vi: "Hà Giang" } },
  "pu-luong": { group: "city", name: { en: "Pu Luong", zh: "普隆", vi: "Pù Luông" } },
  "tam-dao": { group: "city", name: { en: "Tam Dao", zh: "三岛", vi: "Tam Đảo" } },

  // ---- Miền Trung ----
  "phong-nha": { group: "city", name: { en: "Phong Nha", zh: "峰牙", vi: "Phong Nha" } },
  hue: { group: "city", name: { en: "Hue", zh: "顺化", vi: "Huế" } },
  "da-nang": { group: "city", name: { en: "Da Nang", zh: "岘港", vi: "Đà Nẵng" } },
  "hoi-an": { group: "city", name: { en: "Hoi An", zh: "会安", vi: "Hội An" } },
  "ba-na": { group: "city", name: { en: "Ba Na Hills", zh: "巴拿山", vi: "Bà Nà Hills" } },
  "my-son": {
    group: "city",
    name: { en: "My Son Sanctuary", zh: "美山圣地", vi: "Thánh địa Mỹ Sơn" },
  },
  "quy-nhon": { group: "city", name: { en: "Quy Nhon", zh: "归仁", vi: "Quy Nhơn" } },
  "nha-trang": { group: "city", name: { en: "Nha Trang", zh: "芽庄", vi: "Nha Trang" } },
  "nha-trang-port": {
    group: "city",
    name: { en: "Nha Trang Port", zh: "芽庄码头", vi: "Cảng Nha Trang" },
  },
  "paradise-bay": {
    group: "city",
    name: { en: "Paradise Bay", zh: "天堂湾", vi: "Vịnh Paradise" },
  },
  dalat: { group: "city", name: { en: "Dalat", zh: "大叻", vi: "Đà Lạt" } },

  // ---- Miền Nam ----
  "mui-ne": {
    group: "city",
    name: { en: "Mui Ne – Phan Thiet", zh: "美奈 – 藩切", vi: "Mũi Né – Phan Thiết" },
  },
  hcm: { group: "city", name: { en: "Ho Chi Minh City", zh: "胡志明市", vi: "TP. Hồ Chí Minh" } },
  "cu-chi": { group: "city", name: { en: "Cu Chi Tunnels", zh: "古芝地道", vi: "Địa đạo Củ Chi" } },
  "tay-ninh": { group: "city", name: { en: "Tay Ninh", zh: "西宁", vi: "Tây Ninh" } },
  "moc-bai": {
    group: "city",
    name: {
      en: "Moc Bai Border Gate (Cambodia)",
      zh: "木排口岸（柬埔寨边境）",
      vi: "Cửa khẩu Mộc Bài (Campuchia)",
    },
  },
  "vung-tau": { group: "city", name: { en: "Vung Tau", zh: "头顿", vi: "Vũng Tàu" } },
  mekong: {
    group: "city",
    name: { en: "Mekong Delta", zh: "湄公河三角洲", vi: "Đồng bằng sông Cửu Long" },
  },
  "can-tho": { group: "city", name: { en: "Can Tho", zh: "芹苴", vi: "Cần Thơ" } },
  "phu-quoc": {
    group: "city",
    name: { en: "Phu Quoc (town centre)", zh: "富国岛市区", vi: "Phú Quốc (trung tâm)" },
  },
  "pq-north": {
    group: "city",
    name: { en: "Phu Quoc North Island", zh: "富国岛北岛", vi: "Bắc đảo Phú Quốc" },
  },
  "pq-south": {
    group: "city",
    name: { en: "Phu Quoc South Island", zh: "富国岛南岛", vi: "Nam đảo Phú Quốc" },
  },
  "pq-east": {
    group: "city",
    name: { en: "Phu Quoc East Island", zh: "富国岛东岛", vi: "Đông đảo Phú Quốc" },
  },
  "con-dao": { group: "city", name: { en: "Con Dao", zh: "昆岛", vi: "Côn Đảo" } },
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
