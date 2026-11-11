// Nhãn tiếng Việt dùng chung trong khu quản trị (Đơn đặt tour / Yêu cầu, Nhật ký thao tác, Trang giới thiệu
// & chính sách) — sửa chữ ở đây là mọi nơi cùng đổi.

/** Trạng thái xử lý đơn / yêu cầu */
export const STATUSES = [
  { value: "new", label: "Mới", tone: "red" },
  { value: "contacted", label: "Đã liên hệ", tone: "amber" },
  { value: "confirmed", label: "Đã xác nhận", tone: "blue" },
  { value: "completed", label: "Hoàn tất", tone: "green" },
  { value: "cancelled", label: "Huỷ", tone: "gray" },
];

/** Thanh toán của đơn đặt tour (9Pay tự cập nhật; nhân viên cũng đổi tay được) */
export const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Chưa thanh toán", tone: "gray" },
  { value: "deposit", label: "Đã đặt cọc", tone: "amber" },
  { value: "paid", label: "Đã thanh toán", tone: "green" },
];

/** Tên các trang giới thiệu & chính sách (theo khoá trang) */
export const PAGE_LABELS = {
  about: "Giới thiệu",
  terms: "Điều khoản sử dụng",
  privacy: "Chính sách bảo mật",
  payment: "Thanh toán & hoàn tiền",
  cancellation: "Huỷ / đổi tour",
};

const toMap = (list) => Object.fromEntries(list.map((s) => [s.value, s.label]));
export const STATUS_LABELS = toMap(STATUSES);
export const PAYMENT_LABELS = toMap(PAYMENT_STATUSES);

/* =========================================================================
 * Thông tin khách điền trong đơn / yêu cầu (popup chi tiết ở trang quản trị)
 * Website lưu MÃ (vd. "mid", "roundTrip", "halong") → ở đây đổi ra chữ tiếng Việt dễ hiểu.
 * ========================================================================= */

const PHONE = { vi: "Điện thoại", en: "Phone", zh: "电话" };
const EMAIL = { vi: "Email", en: "Email", zh: "邮箱" };
const BANK = { vi: "Chuyển khoản ngân hàng", en: "Bank transfer", zh: "银行转账" };
const TRIP_TYPES = {
  private: { vi: "Tour riêng / thiết kế riêng", en: "Private / tailor-made", zh: "私人/定制游" },
  group: { vi: "Tour ghép đoàn", en: "Group tour", zh: "团队游" },
  corporate: { vi: "Công ty / incentive", en: "Company / incentive", zh: "企业/奖励旅游" },
  b2b: { vi: "Đại lý du lịch (B2B)", en: "Travel agency (B2B)", zh: "旅行社（B2B）" },
};

/**
 * Mã lựa chọn của các form công khai → chữ (3 ngôn ngữ, để nhận ra cả đơn cũ lưu chữ theo ngôn ngữ khách).
 * BẢN SAO của ENQUIRY_OPTIONS ở be/src/emails/labels.js (email) — be/tests/emails.test.js kiểm tra 2 bản giống nhau.
 */
export const ENQUIRY_OPTIONS = {
  tripType: {
    oneWay: { vi: "Một chiều", en: "One way", zh: "单程" },
    roundTrip: { vi: "Khứ hồi", en: "Round trip", zh: "往返" },
    byDay: { vi: "Thuê theo ngày / tour", en: "By day / tour", zh: "按天/线路包车" },
    ...TRIP_TYPES,
  },
  interests: {
    culture: { vi: "Văn hóa & lịch sử", en: "Culture & history", zh: "文化与历史" },
    nature: { vi: "Thiên nhiên & trekking", en: "Nature & hiking", zh: "自然与徒步" },
    beach: { vi: "Biển & đảo", en: "Beaches & islands", zh: "海滩与海岛" },
    food: { vi: "Ẩm thực & nấu ăn", en: "Food & cooking", zh: "美食与烹饪" },
    cruise: { vi: "Du thuyền", en: "Cruises", zh: "游轮" },
    photo: { vi: "Nhiếp ảnh", en: "Photography", zh: "摄影" },
    family: { vi: "Hoạt động gia đình", en: "Family activities", zh: "亲子活动" },
    honeymoon: { vi: "Trăng mật & lãng mạn", en: "Honeymoon & romance", zh: "蜜月与浪漫" },
  },
  airport: {
    none: { vi: "Không", en: "Not needed", zh: "无需" },
    pickup: { vi: "Đón sân bay", en: "Airport pick-up", zh: "接机" },
    dropoff: { vi: "Tiễn sân bay", en: "Airport drop-off", zh: "送机" },
    both: { vi: "Cả đón & tiễn", en: "Pick-up & drop-off", zh: "接机+送机" },
  },
  payment: {
    cash: { vi: "Tiền mặt cho tài xế", en: "Cash to the driver", zh: "现金付给司机" },
    bank: BANK,
    transfer: BANK,
    card: { vi: "Thẻ", en: "Card", zh: "银行卡" },
  },
  contactVia: {
    Phone: PHONE,
    phone: PHONE,
    Email: EMAIL,
    email: EMAIL,
    whatsapp: { vi: "WhatsApp", en: "WhatsApp", zh: "WhatsApp" },
    zalo: { vi: "Zalo", en: "Zalo", zh: "Zalo" },
    wechat: { vi: "WeChat", en: "WeChat", zh: "微信" },
  },
  budget: {
    budget: { vi: "Tiết kiệm", en: "Budget", zh: "经济" },
    economy: { vi: "Tiết kiệm", en: "Budget", zh: "经济" },
    mid: { vi: "Tầm trung", en: "Mid-range", zh: "中档" },
    standard: { vi: "Tầm trung", en: "Mid-range", zh: "中档" },
    premium: { vi: "Cao cấp", en: "Premium", zh: "高档" },
    luxury: { vi: "Sang trọng", en: "Luxury", zh: "豪华" },
  },
  pace: {
    relaxed: { vi: "Thong thả, nhiều thời gian nghỉ", en: "Relaxed", zh: "轻松" },
    moderate: { vi: "Vừa phải", en: "Moderate", zh: "适中" },
    balanced: { vi: "Vừa phải", en: "Moderate", zh: "适中" },
    fast: { vi: "Đi nhiều điểm, lịch dày", en: "Fast-paced", zh: "紧凑" },
    active: { vi: "Đi nhiều điểm, lịch dày", en: "Fast-paced", zh: "紧凑" },
  },
  accommodation: {
    budget: { vi: "Nhà nghỉ / khách sạn bình dân", en: "Budget hotel", zh: "经济型酒店" },
    standard: { vi: "Khách sạn tiêu chuẩn", en: "Standard hotel", zh: "标准酒店" },
    superior: { vi: "Khách sạn khá", en: "Superior hotel", zh: "高级酒店" },
    deluxe: { vi: "Khách sạn cao cấp", en: "Deluxe hotel", zh: "豪华酒店" },
    luxury: { vi: "Khách sạn sang trọng", en: "Luxury hotel", zh: "奢华酒店" },
    boutique: { vi: "Khách sạn nhỏ, phong cách riêng", en: "Boutique hotel", zh: "精品酒店" },
    homestay: { vi: "Ở nhà dân (homestay)", en: "Homestay", zh: "民宿" },
    resort: { vi: "Khu nghỉ dưỡng", en: "Resort", zh: "度假村" },
  },
  travelStyle: {
    family: { vi: "Gia đình", en: "Family", zh: "家庭" },
    couple: { vi: "Cặp đôi", en: "Couple", zh: "情侣" },
    solo: { vi: "Đi một mình", en: "Solo", zh: "独自出行" },
    friends: { vi: "Nhóm bạn", en: "Friends", zh: "朋友结伴" },
    adventure: { vi: "Khám phá, mạo hiểm", en: "Adventure", zh: "探险" },
    luxury: { vi: "Sang trọng", en: "Luxury", zh: "豪华" },
    budget: { vi: "Tiết kiệm", en: "Budget", zh: "经济" },
  },
  visaType: {
    evisa: { vi: "Visa điện tử (e-visa)", en: "E-visa", zh: "电子签证" },
    voa: { vi: "Visa nhận tại sân bay", en: "Visa on arrival", zh: "落地签" },
    tourist: { vi: "Visa du lịch", en: "Tourist visa", zh: "旅游签证" },
    business: { vi: "Visa công tác", en: "Business visa", zh: "商务签证" },
  },
  entries: {
    single: { vi: "Nhập cảnh 1 lần", en: "Single entry", zh: "单次入境" },
    multiple: { vi: "Nhập cảnh nhiều lần", en: "Multiple entries", zh: "多次入境" },
  },
  processing: {
    normal: { vi: "Thường", en: "Standard", zh: "普通" },
    standard: { vi: "Thường", en: "Standard", zh: "普通" },
    urgent: { vi: "Gấp", en: "Urgent", zh: "加急" },
    superUrgent: { vi: "Siêu gấp", en: "Super urgent", zh: "特急" },
    "super-urgent": { vi: "Siêu gấp", en: "Super urgent", zh: "特急" },
  },
  purpose: {
    tourism: { vi: "Du lịch", en: "Tourism", zh: "旅游" },
    business: { vi: "Công tác", en: "Business", zh: "商务" },
    visit: { vi: "Thăm người thân", en: "Visiting family", zh: "探亲" },
    transit: { vi: "Quá cảnh", en: "Transit", zh: "过境" },
  },
  source: {
    google: { vi: "Tìm trên Google", en: "Google search", zh: "谷歌搜索" },
    facebook: { vi: "Facebook", en: "Facebook", zh: "Facebook" },
    instagram: { vi: "Instagram", en: "Instagram", zh: "Instagram" },
    tripadvisor: { vi: "Tripadvisor", en: "Tripadvisor", zh: "Tripadvisor" },
    youtube: { vi: "YouTube", en: "YouTube", zh: "YouTube" },
    friend: { vi: "Bạn bè giới thiệu", en: "A friend", zh: "朋友推荐" },
    returning: { vi: "Khách cũ quay lại", en: "Returning guest", zh: "老客户" },
    other: { vi: "Khác", en: "Other", zh: "其他" },
  },
  companyType: {
    agency: { vi: "Đại lý du lịch", en: "Travel agency", zh: "旅行社" },
    operator: { vi: "Công ty lữ hành", en: "Tour operator", zh: "地接社" },
    ota: { vi: "Đại lý du lịch trực tuyến", en: "Online travel agency", zh: "在线旅行社" },
    corporate: { vi: "Doanh nghiệp", en: "Corporate", zh: "企业" },
    other: { vi: "Khác", en: "Other", zh: "其他" },
  },
};

/**
 * Lựa chọn form gửi dạng CHỮ theo ngôn ngữ trang (dịch vụ visa, chủ đề liên hệ) → đổi sang tiếng Việt theo vị trí.
 * BẢN SAO của OPTION_LISTS ở be/src/emails/labels.js.
 */
export const OPTION_LISTS = [
  {
    en: [
      "Fast-track only",
      "E-visa support",
      "Visa on arrival + fast-track",
      "Fast-track + airport transfer",
    ],
    zh: ["仅快速通关", "电子签证协助", "落地签 + 快速通关", "快速通关 + 机场接送"],
    vi: [
      "Chỉ fast-track",
      "Hỗ trợ e-visa",
      "Visa tại cửa khẩu + fast-track",
      "Fast-track + đưa đón sân bay",
    ],
  },
  {
    en: ["Tour enquiry", "Private car", "Visa / fast-track", "B2B partnership", "Other"],
    zh: ["线路咨询", "包车", "签证/快速通关", "同业合作B2B", "其他"],
    vi: ["Hỏi về tour", "Xe riêng", "Visa / fast-track", "Hợp tác B2B", "Khác"],
  },
];

/** Hạng xe theo khoá (dùng khi xe đã bị xoá khỏi CMS) — giống VEHICLE_NAME (vi) ở be/src/emails/labels.js */
export const VEHICLE_NAMES = {
  sedan: "Xe 4 chỗ (sedan)",
  suv: "Xe 7 chỗ gầm cao (SUV)",
  minivan: "Xe 7 chỗ (MPV)",
  luxury: "Xe MPV hạng sang",
  limo9: "Xe Limousine 9–11 chỗ",
  van16: "Xe 16 chỗ",
  coach29: "Xe 29 chỗ",
  coach45: "Xe 45 chỗ",
};

/** Từng phần của mã gói fast-track (gói đã xoá khỏi CMS) — giống PACKAGE_WORD (vi) ở be/src/emails/labels.js */
export const PACKAGE_WORDS = {
  arr: "Nhập cảnh",
  dep: "Xuất cảnh",
  add: "Dịch vụ thêm",
  fast: "fast-track",
  track: "",
  voa: "visa tại cửa khẩu",
  vip: "làn VIP",
  diplomatic: "làn ngoại giao",
  priority: "làn ưu tiên",
  security: "soi chiếu an ninh",
  checkin: "check-in ưu tiên",
  porter: "khuân vác hành lý",
  night: "phụ phí ban đêm",
  only: "chỉ",
  plus: "gói mở rộng",
};
const packageName = (code) => {
  const parts = String(code)
    .toLowerCase()
    .split(/[-_\s]+/);
  return parts.every((p) => p in PACKAGE_WORDS)
    ? parts
        .map((p) => PACKAGE_WORDS[p])
        .filter(Boolean)
        .join(" · ")
    : humanizeKey(code);
};

/** Ngôn ngữ trang khách dùng */
export const LANG_LABELS = { en: "Tiếng Anh", zh: "Tiếng Trung", vi: "Tiếng Việt" };

/** Tên tiếng Việt cho các trường riêng của từng form (không có → tên trường viết lại thành chữ thường) */
export const DETAIL_LABELS = {
  date: "Ngày đi",
  returnDate: "Ngày về",
  time: "Giờ đón",
  pickupTime: "Giờ đón",
  pickup: "Điểm đón",
  dropoff: "Điểm trả",
  route: "Lộ trình khách mô tả",
  tripType: "Loại chuyến",
  vehicle: "Loại xe",
  passengers: "Số khách",
  luggage: "Hành lý",
  airport: "Sân bay",
  flight: "Số hiệu chuyến bay",
  arrival: "Ngày đến",
  arrivalDate: "Ngày đến",
  departure: "Ngày khởi hành",
  entryDate: "Ngày nhập cảnh",
  exitDate: "Ngày xuất cảnh",
  service: "Dịch vụ",
  visaType: "Loại visa",
  entries: "Số lần nhập cảnh",
  processing: "Thời gian làm visa",
  purpose: "Mục đích chuyến đi",
  quantity: "Số lượng",
  budget: "Ngân sách",
  hotel: "Hạng khách sạn",
  hotelClass: "Hạng khách sạn",
  accommodation: "Nơi ở mong muốn",
  destinations: "Điểm đến",
  duration: "Thời lượng",
  days: "Số ngày",
  nights: "Số đêm",
  adults: "Người lớn",
  children: "Trẻ em",
  travelers: "Số khách",
  travellers: "Số khách",
  guests: "Số khách",
  travelStyle: "Kiểu chuyến đi",
  interests: "Sở thích",
  pace: "Nhịp độ chuyến đi",
  region: "Khu vực",
  country: "Quốc gia",
  subject: "Chủ đề",
  company: "Công ty",
  companyType: "Loại hình công ty",
  position: "Chức vụ",
  website: "Trang web công ty",
  market: "Thị trường khách",
  volume: "Lượng khách dự kiến",
  source: "Biết đến Vietlook qua",
  level: "Gói dịch vụ",
  flexible: "Ngày đi linh hoạt",
  requests: "Yêu cầu riêng",
  contactVia: "Muốn liên hệ qua",
  payment: "Hình thức thanh toán",
  from: "Điểm đón",
  to: "Điểm đến",
  returnTime: "Giờ về",
  routeSlug: "Tuyến xe",
  priceUSD: "Giá đã báo trên web",
};

/** Theo loại yêu cầu (cùng tên trường, nghĩa khác) */
const TYPE_DETAIL_LABELS = {
  car: { airport: "Đón / tiễn sân bay", tripType: "Loại chuyến xe" },
  planner: { tripType: "Hình thức chuyến đi" },
};

/** Trường không hiện trong "Thông tin khách điền" (trùng thông tin / chỉ dùng nội bộ) */
const HIDDEN_DETAILS = new Set([
  "summary", // form xe gửi kèm 1 dòng tóm tắt theo ngôn ngữ khách — các trường bên dưới đã đủ
  "website_url",
  "captchaToken",
  "honeypot",
  "tourSlug",
  "tourCode",
  "estimateUSD",
  "type",
  "lang",
  "page",
]);

/** "returnTime" / "pickup_point" → "Return time" / "Pickup point" */
export const humanizeKey = (k) =>
  String(k)
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

/** "halong" / "ha-long" → "halong" (so khớp đường dẫn cũ với đường dẫn hiện tại) */
const compact = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
/** "ha-long-bay" → "Ha Long Bay" */
const titleCase = (s) =>
  String(s)
    .replace(/[-_]+/g, " ")
    .replace(/(^|\s)\p{L}/gu, (x) => x.toUpperCase());

const usd = (n) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const isoDay = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : null;
};
/** Chuỗi trông như mã / tên biến (vd. "mid_range", "superUrgent", "arr-vip") */
const looksLikeCode = (s) => /^[a-z][a-z0-9]*([A-Z_-][a-zA-Z0-9]+)+$/.test(s);

/** Mã hoặc chữ cũ (bất kỳ ngôn ngữ) của 1 lựa chọn → tiếng Việt; không nhận ra → null */
function optionText(key, s) {
  const opts = ENQUIRY_OPTIONS[key];
  if (opts) {
    if (Object.hasOwn(opts, s)) return opts[s].vi;
    const hit = Object.values(opts).find((o) => o.en === s || o.zh === s || o.vi === s);
    if (hit) return hit.vi;
  }
  for (const list of OPTION_LISTS)
    for (const l of ["en", "zh", "vi"]) {
      const i = list[l].indexOf(s);
      if (i >= 0) return list.vi[i];
    }
  return null;
}

/**
 * Tên điểm đến: miền → tên trong CMS → đường dẫn cũ / viết tắt khớp đầu đường dẫn hiện tại
 * (vd. "halong" ↔ "halong-bay") → địa danh của báo giá xe → chữ in hoa đầu từ.
 */
export function destinationName(slug, { regions = {}, destinations = {}, places = {} } = {}) {
  const s = String(slug);
  if (regions[s]) return regions[s];
  if (destinations[s]) return destinations[s];
  const c = compact(s);
  const near = c.length >= 3 && Object.keys(destinations).find((k) => compact(k).startsWith(c));
  if (near) return destinations[near];
  if (places[s]) return places[s];
  return titleCase(s);
}

/**
 * Giá trị 1 trường khách điền → chữ tiếng Việt dễ hiểu.
 * names: tên tra từ CMS / dữ liệu website — { regions, destinations, places, routes, vehicles, levels, airports }
 * (đều dạng { mã: "tên tiếng Việt" }).
 */
export function detailText(key, v, { type, names = {} } = {}) {
  if (v == null || v === "") return "";
  if (Array.isArray(v))
    return v
      .map((x) => detailText(key, x, { type, names }))
      .filter(Boolean)
      .join(", ");
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (typeof v === "object")
    return Object.values(v)
      .map((x) => detailText("", x, { type, names }))
      .filter(Boolean)
      .join(" · ");
  const s = String(v).trim();
  if (!s) return "";
  if (s === "on request") return "Liên hệ báo giá";
  const day = isoDay(s);
  if (day) return day;
  const num = /^\d+$/.test(s) ? Number(s) : null;
  switch (key) {
    case "destinations":
      return destinationName(s, names);
    case "from":
    case "to":
    case "pickup":
    case "dropoff":
      return s === "__other" ? "Địa điểm khác (xem lời nhắn)" : (names.places?.[s] ?? titleCase(s));
    case "routeSlug":
      return names.routes?.[s] ?? humanizeKey(s);
    case "vehicle":
      return names.vehicles?.[s] ?? VEHICLE_NAMES[s] ?? humanizeKey(s);
    case "level":
      return names.levels?.[s] ?? packageName(s);
    case "airport":
      if (type === "visa") return names.airports?.[s.toUpperCase()] ?? s;
      break;
    case "hotel":
    case "hotelClass":
      if (/^[1-5]$/.test(s)) return `Khách sạn ${s} sao`;
      break;
    case "budget": {
      const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) return `${usd(m[1])} – ${usd(m[2])} / người`;
      const plus = s.match(/^(\d+)\+$/);
      if (plus) return `Từ ${usd(plus[1])} / người trở lên`;
      break;
    }
    case "priceUSD":
      if (Number.isFinite(Number(s))) return usd(s);
      break;
    case "days":
    case "nights":
      if (num != null) return `${num} ${key === "days" ? "ngày" : "đêm"}`;
      break;
    case "adults":
      if (num != null) return `${num} người lớn`;
      break;
    case "children":
      if (num != null) return `${num} trẻ em`;
      break;
    case "travelers":
    case "travellers":
    case "passengers":
    case "guests":
      if (num != null) return `${num} khách`;
      break;
    case "flexible":
      if (/^(true|yes)$/i.test(s)) return "Có";
      if (/^(false|no)$/i.test(s)) return "Không";
      break;
    case "lang":
      return LANG_LABELS[s] ?? s;
  }
  const opt = optionText(key, s);
  if (opt) return opt;
  return looksLikeCode(s) ? humanizeKey(s) : s;
}

/** Nhãn tiếng Việt của 1 trường */
export const detailLabel = (key, type) =>
  TYPE_DETAIL_LABELS[type]?.[key] ?? DETAIL_LABELS[key] ?? humanizeKey(key);

/** Các dòng "Thông tin khách điền": [[nhãn, giá trị]] — bỏ trường kỹ thuật / trùng, giờ về của chuyến một chiều */
export function detailRows(details, { type, names } = {}) {
  const d = details ?? {};
  return Object.entries(d)
    .filter(([k]) => !HIDDEN_DETAILS.has(k))
    .filter(([k]) => !(k === "returnTime" && d.tripType !== "roundTrip"))
    .filter(([k, v]) => !(k === "children" && Number(v) === 0))
    .map(([k, v]) => [detailLabel(k, type), detailText(k, v, { type, names })])
    .filter(([, v]) => v !== "");
}

/** Tên trang website khách bấm gửi: "/vi/plan-your-trip" → "Thiết kế tour riêng (bản tiếng Việt)" */
const SITE_PAGES = {
  "": "Trang chủ",
  "plan-your-trip": "Thiết kế tour riêng",
  "group-tailor-made-tours": "Tour đoàn & tour thiết kế riêng",
  "car-rental": "Thuê xe riêng",
  "visa-fast-track": "Visa & fast-track",
  contact: "Liên hệ",
  partners: "Hợp tác đối tác",
  tours: "Danh sách tour",
  "halong-bay-cruises": "Du thuyền Hạ Long",
  destinations: "Điểm đến",
  themes: "Chủ đề tour",
  packages: "Gói tour",
  about: "Giới thiệu",
  "travel-guide": "Cẩm nang du lịch",
  services: "Dịch vụ",
};
const SITE_LANG = { vi: "bản tiếng Việt", zh: "bản tiếng Trung" };

export function sitePageName(path) {
  const parts = String(path ?? "")
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean);
  const lang = SITE_LANG[parts[0]] ? parts.shift() : "";
  const [section = "", sub] = parts;
  let name = SITE_PAGES[section];
  if (!name) return path;
  if (sub && section === "tours") name = "Trang chi tiết tour";
  else if (sub && section === "destinations") name = "Trang điểm đến";
  else if (sub && section === "travel-guide") name = "Bài viết cẩm nang";
  return lang ? `${name} (${SITE_LANG[lang]})` : name;
}
