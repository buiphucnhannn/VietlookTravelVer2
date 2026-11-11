/**
 * Nhãn + giá trị dễ đọc cho email (3 ngôn ngữ: vi / en / zh).
 * Nguồn: các form công khai ở fe/src/components/** và từ điển fe/src/i18n/dictionaries/*.js.
 * Đổi chữ trên form website → cập nhật cả ở đây (email không đọc được từ điển của frontend).
 */

/** Thông tin doanh nghiệp — giống fe/src/constants/site.js (siteConfig) */
export const COMPANY = Object.freeze({
  name: "Vietlook Travel",
  legalName: {
    en: "Vietlook Travel and Trading Company Limited",
    zh: "Vietlook Travel and Trading Company Limited",
    vi: "Công ty TNHH Du lịch và Thương mại Vietlook",
  },
  licence: "01-176/2022/CDLQGVN-GP LHQT",
  hotline: "+84 98 339 3588",
  hotlineRaw: "+84983393588",
  email: "infovietlooktravel@gmail.com",
  whatsapp: "https://wa.me/84983393588",
  zalo: "https://zalo.me/84983393588",
  wechatId: "+84983393588",
  address: {
    en: "No. 58, Lane 159 Quyet Thang Street, Yen Nghia Ward, Hanoi, Vietnam",
    zh: "越南河内市安义坊决胜街159巷58号",
    vi: "Số 58, ngõ 159 phố Quyết Thắng, phường Yên Nghĩa, Hà Nội, Việt Nam",
  },
  hours: {
    en: "Mon – Sat: 9:00 – 18:00 (GMT+7) · Hotline 24/7",
    zh: "周一至周六 9:00 – 18:00（越南时间）· 热线24小时",
    vi: "Thứ Hai – Thứ Bảy: 9:00 – 18:00 (GMT+7) · Hotline 24/7",
  },
  social: [
    ["Facebook", "https://www.facebook.com/vietlooktravelhanoi"],
    [
      "Tripadvisor",
      "https://www.tripadvisor.com/Attraction_Review-g17733187-d27950353-Reviews-Vietlook_Travel-Ha_Dong_Hanoi.html",
    ],
    ["YouTube", "https://www.youtube.com/@VietlookTravel"],
    ["Google Maps", "https://maps.app.goo.gl/ar5pqAHXgeW42U7W9"],
  ],
});

/** Loại yêu cầu */
export const TYPE_LABEL = {
  vi: {
    booking: "Đặt tour",
    planner: "Thiết kế tour riêng",
    car: "Báo giá xe riêng",
    visa: "Visa & Fast-track",
    contact: "Liên hệ",
    partner: "Hợp tác đại lý B2B",
  },
  en: {
    booking: "Tour booking",
    planner: "Tailor-made trip",
    car: "Private car quote",
    visa: "Visa & fast-track",
    contact: "Contact",
    partner: "B2B partnership",
  },
  zh: {
    booking: "预订行程",
    planner: "定制行程",
    car: "包车报价",
    visa: "签证与快速通关",
    contact: "联系咨询",
    partner: "B2B合作",
  },
};

/** Tiêu đề email cho nhân viên theo loại */
export const STAFF_HEADLINE = {
  booking: "Đơn đặt tour mới",
  planner: "Yêu cầu thiết kế tour mới",
  car: "Yêu cầu báo giá xe mới",
  visa: "Yêu cầu visa / fast-track mới",
  contact: "Tin nhắn liên hệ mới",
  partner: "Đề nghị hợp tác B2B mới",
};

/** Nhãn trường (key trong form → chữ). Không có → hiện tên trường đã "dịch" sang chữ thường (humanize). */
export const FIELD_LABEL = {
  vi: {
    name: "Họ tên",
    email: "Email",
    phone: "Điện thoại",
    nationality: "Quốc tịch",
    message: "Lời nhắn",
    tour: "Tour",
    departureDate: "Ngày khởi hành",
    guests: "Số khách",
    adults: "Người lớn",
    children: "Trẻ em",
    childAges: "Trẻ em",
    hotelClass: "Hạng khách sạn",
    estimate: "Giá tạm tính",
    journey: "Hành trình",
    route: "Lộ trình mong muốn",
    routeSlug: "Tuyến xe",
    from: "Điểm đón",
    to: "Điểm đến",
    tripType: "Loại chuyến",
    pickup: "Ngày giờ đón",
    return: "Ngày giờ về",
    date: "Ngày đi",
    time: "Giờ đón",
    returnDate: "Ngày về",
    returnTime: "Giờ về",
    passengers: "Số khách",
    vehicle: "Loại xe",
    airport: "Sân bay",
    flight: "Số hiệu chuyến bay",
    payment: "Thanh toán",
    priceUSD: "Giá báo",
    service: "Dịch vụ",
    level: "Gói dịch vụ",
    travellers: "Số khách",
    travelers: "Số khách",
    entryDate: "Ngày nhập cảnh",
    destinations: "Điểm đến mong muốn",
    arrival: "Ngày đến",
    flexible: "Ngày linh hoạt",
    days: "Số ngày",
    hotel: "Khách sạn",
    budget: "Ngân sách",
    interests: "Sở thích",
    requests: "Yêu cầu riêng",
    contactVia: "Muốn liên hệ qua",
    subject: "Chủ đề",
    company: "Công ty",
    country: "Quốc gia",
    website: "Website",
    volume: "Lượng khách dự kiến",
    summary: "Tóm tắt",
    page: "Gửi từ trang",
    lang: "Ngôn ngữ khách dùng",
    createdAt: "Thời gian gửi",
    pace: "Nhịp độ chuyến đi",
    accommodation: "Nơi ở mong muốn",
    travelStyle: "Kiểu chuyến đi",
    visaType: "Loại visa",
    entries: "Số lần nhập cảnh",
    processing: "Thời gian làm visa",
    purpose: "Mục đích chuyến đi",
    source: "Biết đến Vietlook qua",
    companyType: "Loại hình công ty",
    market: "Thị trường khách",
    position: "Chức vụ",
  },
  en: {
    name: "Name",
    email: "Email",
    phone: "Phone",
    nationality: "Nationality",
    message: "Message",
    tour: "Tour",
    departureDate: "Departure date",
    guests: "Travellers",
    adults: "Adults",
    children: "Children",
    childAges: "Children",
    hotelClass: "Hotel class",
    estimate: "Estimated price",
    journey: "Journey",
    route: "Itinerary",
    routeSlug: "Route",
    from: "Pick-up",
    to: "Destination",
    tripType: "Trip type",
    pickup: "Pick-up",
    return: "Return",
    date: "Date",
    time: "Pick-up time",
    returnDate: "Return date",
    returnTime: "Return time",
    passengers: "Passengers",
    vehicle: "Vehicle",
    airport: "Airport",
    flight: "Flight number",
    payment: "Payment",
    priceUSD: "Quoted price",
    service: "Service",
    level: "Package",
    travellers: "Travellers",
    travelers: "Travellers",
    entryDate: "Entry date",
    destinations: "Destinations",
    arrival: "Arrival date",
    flexible: "Flexible dates",
    days: "Trip length",
    hotel: "Hotel",
    budget: "Budget",
    interests: "Interests",
    requests: "Special requests",
    contactVia: "Preferred contact",
    subject: "Subject",
    company: "Company",
    country: "Country",
    website: "Website",
    volume: "Expected volume",
    summary: "Summary",
    page: "Sent from",
    lang: "Language",
    createdAt: "Submitted",
    pace: "Pace",
    accommodation: "Accommodation",
    travelStyle: "Travel style",
    visaType: "Visa type",
    entries: "Entries",
    processing: "Processing time",
    purpose: "Purpose of trip",
    source: "How you found us",
    companyType: "Company type",
    market: "Source market",
    position: "Position",
  },
  zh: {
    name: "姓名",
    email: "邮箱",
    phone: "电话",
    nationality: "国籍",
    message: "留言",
    tour: "行程",
    departureDate: "出发日期",
    guests: "出行人数",
    adults: "成人",
    children: "儿童",
    childAges: "儿童",
    hotelClass: "酒店等级",
    estimate: "预估价格",
    journey: "行程路线",
    route: "路线说明",
    routeSlug: "路线",
    from: "上车地点",
    to: "目的地",
    tripType: "行程类型",
    pickup: "接送时间",
    return: "返程",
    date: "日期",
    time: "接送时间",
    returnDate: "返程日期",
    returnTime: "返程时间",
    passengers: "乘客人数",
    vehicle: "车型",
    airport: "机场",
    flight: "航班号",
    payment: "付款方式",
    priceUSD: "报价",
    service: "服务",
    level: "套餐",
    travellers: "人数",
    travelers: "人数",
    entryDate: "入境日期",
    destinations: "目的地",
    arrival: "抵达日期",
    flexible: "日期可灵活调整",
    days: "行程天数",
    hotel: "酒店",
    budget: "预算",
    interests: "兴趣",
    requests: "特别要求",
    contactVia: "首选联系方式",
    subject: "主题",
    company: "公司",
    country: "国家",
    website: "网站",
    volume: "预计客量",
    summary: "摘要",
    page: "提交页面",
    lang: "语言",
    createdAt: "提交时间",
    pace: "行程节奏",
    accommodation: "住宿",
    travelStyle: "出行风格",
    visaType: "签证类型",
    entries: "入境次数",
    processing: "办理时间",
    purpose: "出行目的",
    source: "了解渠道",
    companyType: "公司类型",
    market: "客源市场",
    position: "职位",
  },
};

/** Nhãn riêng theo loại yêu cầu (cùng tên trường nhưng nghĩa khác) */
export const TYPE_FIELD_LABEL = {
  car: {
    airport: { vi: "Đón / tiễn sân bay", en: "Airport transfer", zh: "机场接送" },
    tripType: { vi: "Loại chuyến xe", en: "Trip type", zh: "行程类型" },
  },
  planner: {
    tripType: { vi: "Hình thức chuyến đi", en: "Trip style", zh: "出行方式" },
  },
};

/**
 * Lựa chọn của form thiết kế tour: website gửi MÃ (giống TRIP_TYPES / INTERESTS trong
 * fe/src/components/forms/TripPlannerForm.js). Đơn cũ lưu CHỮ theo ngôn ngữ khách (đúng các chữ dưới đây)
 * → format.optionCode đổi về mã khi hiển thị / khi nhận từ trang web cũ còn mở.
 */
export const PLANNER_OPTIONS = {
  tripType: {
    private: { vi: "Tour riêng / thiết kế riêng", en: "Private / tailor-made", zh: "私人/定制游" },
    group: { vi: "Tour ghép đoàn", en: "Group tour", zh: "团队游" },
    corporate: { vi: "Công ty / incentive", en: "Company / incentive", zh: "企业/奖励旅游" },
    b2b: { vi: "Đại lý du lịch (B2B)", en: "Travel agency (B2B)", zh: "旅行社（B2B）" },
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
};

const PHONE = { vi: "Điện thoại", en: "Phone", zh: "电话" };
const EMAIL = { vi: "Email", en: "Email", zh: "邮箱" };
const BANK = { vi: "Chuyển khoản ngân hàng", en: "Bank transfer", zh: "银行转账" };

/**
 * Giá trị dạng MÃ của mọi form công khai → chữ (theo tên trường), 3 ngôn ngữ.
 * BẢN SAO tiếng Việt nằm ở fe/src/components/admin/labels.js (ENQUIRY_OPTIONS) cho trang quản trị —
 * be/tests/emails.test.js kiểm tra 2 bản luôn giống nhau. Thêm / sửa mã → sửa cả 2 nơi.
 * Một số mã (ngân sách theo hạng, nhịp độ, loại visa…) chưa có trên form hiện tại nhưng có ở đơn cũ / form cũ.
 */
export const ENQUIRY_OPTIONS = {
  // Báo giá xe: loại chuyến · Thiết kế tour: hình thức chuyến đi
  tripType: {
    oneWay: { vi: "Một chiều", en: "One way", zh: "单程" },
    roundTrip: { vi: "Khứ hồi", en: "Round trip", zh: "往返" },
    byDay: { vi: "Thuê theo ngày / tour", en: "By day / tour", zh: "按天/线路包车" },
    ...PLANNER_OPTIONS.tripType,
  },
  interests: PLANNER_OPTIONS.interests,
  // Báo giá xe: đón / tiễn sân bay
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
  // Ngân sách theo hạng (form hiện tại gửi khoảng giá "1000-2000" — xem format.js)
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
  // Đối tác B2B: loại hình công ty
  companyType: {
    agency: { vi: "Đại lý du lịch", en: "Travel agency", zh: "旅行社" },
    operator: { vi: "Công ty lữ hành", en: "Tour operator", zh: "地接社" },
    ota: { vi: "Đại lý du lịch trực tuyến", en: "Online travel agency", zh: "在线旅行社" },
    corporate: { vi: "Doanh nghiệp", en: "Corporate", zh: "企业" },
    other: { vi: "Khác", en: "Other", zh: "其他" },
  },
};

/** Giá trị dạng mã → chữ (theo tên trường) */
export const ENUM = ENQUIRY_OPTIONS;

/**
 * Hạng xe (khoá trong CMS: Dịch vụ → Xe) — chỉ dùng khi không tra được tên trong CMS (xe đã xoá).
 * Bản tiếng Việt giống VEHICLE_NAMES ở fe/src/components/admin/labels.js.
 */
export const VEHICLE_NAME = {
  sedan: { vi: "Xe 4 chỗ (sedan)", en: "Sedan (4 seats)", zh: "4座轿车" },
  suv: { vi: "Xe 7 chỗ gầm cao (SUV)", en: "SUV (7 seats)", zh: "7座SUV" },
  minivan: { vi: "Xe 7 chỗ (MPV)", en: "Minivan (7 seats)", zh: "7座MPV" },
  luxury: { vi: "Xe MPV hạng sang", en: "Luxury MPV", zh: "豪华MPV" },
  limo9: { vi: "Xe Limousine 9–11 chỗ", en: "Limousine van (9–11 seats)", zh: "9–11座豪华商务车" },
  van16: { vi: "Xe 16 chỗ", en: "16-seat van", zh: "16座车" },
  coach29: { vi: "Xe 29 chỗ", en: "29-seat coach", zh: "29座大巴" },
  coach45: { vi: "Xe 45 chỗ", en: "45-seat coach", zh: "45座大巴" },
};

/** Giá trị "liên hệ báo giá" mà form gửi lên khi chưa có giá */
export const ON_REQUEST = { vi: "Liên hệ báo giá", en: "On request", zh: "待报价" };

/**
 * Danh sách lựa chọn của form (giá trị gửi lên là chữ theo ngôn ngữ trang) → đổi chéo ngôn ngữ theo vị trí.
 * (Form thiết kế tour đã gửi mã — xem PLANNER_OPTIONS.)
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

/** 3 miền (điểm đến của form thiết kế tour) */
export const REGION_NAME = {
  "north-vietnam": { vi: "Miền Bắc", en: "North Vietnam", zh: "越南北部" },
  "central-vietnam": { vi: "Miền Trung", en: "Central Vietnam", zh: "越南中部" },
  "south-vietnam": { vi: "Miền Nam", en: "South Vietnam", zh: "越南南部" },
};

/** Điểm đón / trả của báo giá xe — giống `places` trong fe/src/data/cars.js */
export const PLACES = {
  han: { en: "Noi Bai Airport (HAN)", zh: "内排国际机场 (HAN)", vi: "Sân bay Nội Bài (HAN)" },
  sgn: {
    en: "Tan Son Nhat Airport (SGN)",
    zh: "新山一机场 (SGN)",
    vi: "Sân bay Tân Sơn Nhất (SGN)",
  },
  dad: { en: "Da Nang Airport (DAD)", zh: "岘港机场 (DAD)", vi: "Sân bay Đà Nẵng (DAD)" },
  cxr: { en: "Cam Ranh Airport (CXR)", zh: "金兰机场 (CXR)", vi: "Sân bay Cam Ranh (CXR)" },
  dli: { en: "Lien Khuong Airport (DLI)", zh: "连姜机场 (DLI)", vi: "Sân bay Liên Khương (DLI)" },
  pqc: { en: "Phu Quoc Airport (PQC)", zh: "富国岛机场 (PQC)", vi: "Sân bay Phú Quốc (PQC)" },
  hanoi: { en: "Hanoi (city centre)", zh: "河内市区", vi: "Hà Nội (trung tâm)" },
  "hanoi-station": { en: "Hanoi Railway Station", zh: "河内火车站", vi: "Ga Hà Nội" },
  halong: { en: "Halong Bay", zh: "下龙湾", vi: "Vịnh Hạ Long" },
  "ninh-binh": { en: "Ninh Binh", zh: "宁平", vi: "Ninh Bình" },
  "hai-phong": { en: "Hai Phong", zh: "海防", vi: "Hải Phòng" },
  "bat-trang": { en: "Bat Trang", zh: "钵场陶瓷村", vi: "Làng gốm Bát Tràng" },
  "moc-chau": { en: "Moc Chau", zh: "木州", vi: "Mộc Châu" },
  "mai-chau": { en: "Mai Chau", zh: "梅州", vi: "Mai Châu" },
  "huu-nghi": { en: "Huu Nghi Border Gate", zh: "友谊关", vi: "Cửa khẩu Hữu Nghị" },
  "cao-bang": { en: "Cao Bang", zh: "高平", vi: "Cao Bằng" },
  "ha-giang": { en: "Ha Giang", zh: "河江", vi: "Hà Giang" },
  "mu-cang-chai": { en: "Mu Cang Chai", zh: "木江界", vi: "Mù Cang Chải" },
  "pu-luong": { en: "Pu Luong", zh: "普隆", vi: "Pù Luông" },
  hcm: { en: "Ho Chi Minh City", zh: "胡志明市", vi: "TP. Hồ Chí Minh" },
  "mui-ne": { en: "Mui Ne", zh: "美奈", vi: "Mũi Né" },
  mekong: { en: "Mekong Delta", zh: "湄公河三角洲", vi: "Đồng bằng sông Cửu Long" },
  "cu-chi": { en: "Cu Chi Tunnels", zh: "古芝地道", vi: "Địa đạo Củ Chi" },
  "vung-tau": { en: "Vung Tau", zh: "头顿", vi: "Vũng Tàu" },
  "nha-trang": { en: "Nha Trang", zh: "芽庄", vi: "Nha Trang" },
  "nha-trang-port": { en: "Nha Trang Port", zh: "芽庄码头", vi: "Cảng Nha Trang" },
  "paradise-bay": { en: "Paradise Bay", zh: "天堂湾", vi: "Vịnh Paradise" },
  dalat: { en: "Dalat", zh: "大叻", vi: "Đà Lạt" },
  "da-nang": { en: "Da Nang", zh: "岘港", vi: "Đà Nẵng" },
  "hoi-an": { en: "Hoi An", zh: "会安", vi: "Hội An" },
  "ba-na": { en: "Ba Na Hills", zh: "巴拿山", vi: "Bà Nà Hills" },
  hue: { en: "Hue", zh: "顺化", vi: "Huế" },
  "my-son": { en: "My Son Sanctuary", zh: "美山圣地", vi: "Thánh địa Mỹ Sơn" },
  "phu-quoc": { en: "Phu Quoc (town centre)", zh: "富国岛市区", vi: "Phú Quốc (trung tâm)" },
  "pq-north": { en: "Phu Quoc North Island", zh: "富国岛北岛", vi: "Bắc đảo Phú Quốc" },
  "pq-south": { en: "Phu Quoc South Island", zh: "富国岛南岛", vi: "Nam đảo Phú Quốc" },
  "pq-east": { en: "Phu Quoc East Island", zh: "富国岛东岛", vi: "Đông đảo Phú Quốc" },
  __other: { en: "Other destination", zh: "其他目的地", vi: "Địa điểm khác" },
};

/**
 * Từng phần của mã gói fast-track (vd. "arr-voa-vip") — chỉ dùng khi gói đã bị xoá khỏi CMS (không tra được tên).
 * Bản tiếng Việt giống PACKAGE_WORDS ở fe/src/components/admin/labels.js.
 */
export const PACKAGE_WORD = {
  arr: { vi: "Nhập cảnh", en: "Arrival", zh: "入境" },
  dep: { vi: "Xuất cảnh", en: "Departure", zh: "出境" },
  add: { vi: "Dịch vụ thêm", en: "Add-on", zh: "附加服务" },
  fast: { vi: "fast-track", en: "fast-track", zh: "快速通关" },
  track: { vi: "", en: "", zh: "" },
  voa: { vi: "visa tại cửa khẩu", en: "visa on arrival", zh: "落地签" },
  vip: { vi: "làn VIP", en: "VIP lane", zh: "VIP通道" },
  diplomatic: { vi: "làn ngoại giao", en: "diplomatic lane", zh: "外交通道" },
  priority: { vi: "làn ưu tiên", en: "priority lane", zh: "优先通道" },
  security: { vi: "soi chiếu an ninh", en: "security check", zh: "安检" },
  checkin: { vi: "check-in ưu tiên", en: "priority check-in", zh: "优先值机" },
  porter: { vi: "khuân vác hành lý", en: "porter", zh: "行李搬运" },
  night: { vi: "phụ phí ban đêm", en: "night surcharge", zh: "夜间附加费" },
  only: { vi: "chỉ", en: "only", zh: "仅" },
  plus: { vi: "gói mở rộng", en: "plus", zh: "升级" },
};

/** Sân bay của form visa / fast-track (mã IATA viết hoa) */
export const AIRPORT_NAME = {
  HAN: PLACES.han,
  SGN: PLACES.sgn,
  DAD: PLACES.dad,
  CXR: PLACES.cxr,
  PQC: PLACES.pqc,
  DLI: PLACES.dli,
};

export const LANG_NAME = {
  vi: { en: "Tiếng Anh", zh: "Tiếng Trung", vi: "Tiếng Việt" },
  en: { en: "English", zh: "Chinese", vi: "Vietnamese" },
  zh: { en: "英语", zh: "中文", vi: "越南语" },
};

/** Chữ nhỏ dùng khi định dạng giá trị */
export const WORDS = {
  vi: {
    yes: "Có",
    no: "Không",
    adult: (n) => `${n} người lớn`,
    child: (n) => `${n} trẻ em`,
    ages: (a) => `${a.join(", ")} tuổi`,
    days: (n) => `${n} ngày`,
    people: (n) => `${n} khách`,
    perPerson: "/ người",
    total: "Tổng tạm tính",
    childLine: (age, pct) => `Trẻ ${age} tuổi (${pct}%)`,
    adultLine: (n, unit) => `${n} người lớn × ${unit}`,
    holiday: "Phụ thu ngày lễ",
    single: "Phụ thu phòng đơn",
    weekday: "vi-VN",
  },
  en: {
    yes: "Yes",
    no: "No",
    adult: (n) => `${n} adult${n === 1 ? "" : "s"}`,
    child: (n) => `${n} child${n === 1 ? "" : "ren"}`,
    ages: (a) => `age${a.length === 1 ? "" : "s"} ${a.join(", ")}`,
    days: (n) => `${n} day${n === 1 ? "" : "s"}`,
    people: (n) => `${n} ${n === 1 ? "person" : "people"}`,
    perPerson: "per person",
    total: "Estimated total",
    childLine: (age, pct) => `Child, ${age} y/o (${pct}%)`,
    adultLine: (n, unit) => `${n} adult${n === 1 ? "" : "s"} × ${unit}`,
    holiday: "Holiday surcharge",
    single: "Single supplement",
    weekday: "en-GB",
  },
  zh: {
    yes: "是",
    no: "否",
    adult: (n) => `${n}位成人`,
    child: (n) => `${n}名儿童`,
    ages: (a) => `${a.map((x) => `${x}岁`).join("、")}`,
    days: (n) => `${n}天`,
    people: (n) => `${n}人`,
    perPerson: "/人",
    total: "预估总价",
    childLine: (age, pct) => `儿童 ${age}岁（${pct}%）`,
    adultLine: (n, unit) => `${n}位成人 × ${unit}`,
    holiday: "节假日附加费",
    single: "单房差",
    weekday: "zh-CN",
  },
};
