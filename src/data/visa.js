// Visa & Fast-track. Gói dịch vụ & sân bay lấy từ trang "Fast Track And Visa" của vietlooktravel.com.
// Chỉ ghi phí chính phủ công khai; phí dịch vụ & giá fast-track do doanh nghiệp nhập trong CMS (chưa có -> "Giá liên hệ").

export const visaTypes = [
  {
    key: "evisa-single",
    name: { en: "E-visa – single entry", zh: "电子签证 – 单次入境" },
    stay: { en: "Up to 90 days", zh: "最长90天" },
    processing: { en: "3–5 working days", zh: "3–5个工作日" },
    fee: { en: "Gov. fee $25 · service fee on request", zh: "政府费25美元 · 服务费请咨询" },
    note: {
      en: "For all nationalities. Apply online, enter at any international border gate.",
      zh: "适用所有国籍，在线申请，可从任一国际口岸入境。",
    },
  },
  {
    key: "evisa-multiple",
    name: { en: "E-visa – multiple entry", zh: "电子签证 – 多次入境" },
    stay: { en: "Up to 90 days", zh: "最长90天" },
    processing: { en: "3–5 working days", zh: "3–5个工作日" },
    fee: { en: "Gov. fee $50 · service fee on request", zh: "政府费50美元 · 服务费请咨询" },
    note: {
      en: "Ideal for trips combining Vietnam with Cambodia or Laos.",
      zh: "适合越南与柬埔寨、老挝联游。",
    },
  },
  {
    key: "urgent",
    name: { en: "Urgent e-visa", zh: "加急电子签证" },
    stay: { en: "Up to 90 days", zh: "最长90天" },
    processing: { en: "Faster than standard – ask us", zh: "加急办理，请咨询" },
    fee: { en: "Gov. fee · urgent fee on request", zh: "政府费 · 加急费请咨询" },
    note: {
      en: "When your flight is very soon – we follow up with immigration for you.",
      zh: "航班临近时使用——我们为您跟进出入境审批。",
    },
  },
  {
    key: "exemption",
    name: { en: "Visa exemption check", zh: "免签资格核查" },
    stay: { en: "14–45 days (by nationality)", zh: "14–45天（视国籍）" },
    processing: { en: "Same day advice", zh: "当天答复" },
    fee: { en: "Free advice", zh: "免费咨询" },
    note: {
      en: "We confirm whether your passport is visa-free and how long you may stay.",
      zh: "我们为您确认护照是否免签及可停留天数。",
    },
  },
];

export const fastTrackLevels = [
  {
    key: "stamping",
    name: { en: "Visa stamping assistance", zh: "落地签盖章协助" },
    text: {
      en: "For Visa-on-Arrival holders – fast visa stamping without queuing.",
      zh: "适用落地签持有人——免排队快速盖签。",
    },
    price: null,
  },
  {
    key: "immigration",
    name: { en: "Immigration fast-track", zh: "入境快速通关" },
    text: {
      en: "Meet & escort through the priority immigration lane.",
      zh: "迎接并陪同走优先入境通道。",
    },
    price: null,
    popular: true,
  },
  {
    key: "combo",
    name: { en: "Visa stamping + immigration", zh: "盖签 + 快速入境" },
    text: {
      en: "Combined fast visa stamping and priority immigration clearance.",
      zh: "快速盖签与优先入境二合一。",
    },
    price: null,
  },
  {
    key: "full",
    name: { en: "Full fast-track package", zh: "全程快速通关套餐" },
    text: {
      en: "Stamping (if needed), priority immigration, baggage help and escort to your car.",
      zh: "盖签（如需）、优先入境、协助取行李并送至车辆。",
    },
    price: null,
  },
  {
    key: "vip",
    name: { en: "Business class / VIP", zh: "商务舱 / VIP 服务" },
    text: {
      en: "Full airport handling from the aircraft door – minimal effort for you.",
      zh: "从机舱门开始全程协助——您几乎无需操心。",
    },
    price: null,
    vip: true,
  },
  {
    key: "transit",
    name: { en: "Transit fast-track", zh: "中转快速通关" },
    text: {
      en: "Immigration, security, baggage and check-in for your next flight.",
      zh: "协助入境、安检、行李与下一航班值机。",
    },
    price: null,
  },
];

export const airports = [
  {
    code: "HAN",
    name: { en: "Noi Bai – Hanoi", zh: "内排 – 河内" },
    factor: 1,
    image: "/images/tours/v2/hanoi-17177476.jpg",
  },
  {
    code: "SGN",
    name: { en: "Tan Son Nhat – Ho Chi Minh City", zh: "新山一 – 胡志明市" },
    factor: 1,
    image: "/images/tours/v2/ho-chi-minh-city-1018478.jpg",
  },
  {
    code: "DAD",
    name: { en: "Da Nang", zh: "岘港" },
    factor: 0.9,
    image: "/images/tours/da-nang-tour-copy.jpg",
  },
  {
    code: "CXR",
    name: { en: "Cam Ranh – Nha Trang", zh: "金兰 – 芽庄" },
    factor: 0.9,
    image: "/images/tours/v2/nha-trang-2887293.jpg",
  },
  {
    code: "PQC",
    name: { en: "Phu Quoc", zh: "富国岛" },
    factor: 0.9,
    image: "/images/tours/v2/hanoi-34405373.jpg",
  },
];

export const visaFaq = {
  en: [
    {
      q: "Who is fast-track suitable for?",
      a: "Business travellers, families with young children, elderly or pregnant passengers, groups and anyone with a short connection time.",
    },
    {
      q: "Which services are available?",
      a: "Fast-track for arrival into Vietnam, departure from Vietnam and transit (connecting flights).",
    },
    {
      q: "What do you need from me?",
      a: "A passport photo page, your flight number and arrival time, and the visa approval (if you have one).",
    },
    {
      q: "How do I pay?",
      a: "After we confirm the service, pay online by international card (Visa, Mastercard, JCB) or by bank transfer. Prices are in USD per guest.",
    },
  ],
  zh: [
    {
      q: "哪些人适合快速通关？",
      a: "商务旅客、带幼儿的家庭、老人或孕妇、团队以及转机时间紧张的旅客。",
    },
    { q: "提供哪些服务？", a: "入境越南、离境越南及中转（联程航班）快速通关。" },
    { q: "需要提供哪些资料？", a: "护照照片页、航班号与抵达时间，以及签证批准函（如有）。" },
    {
      q: "如何付款？",
      a: "确认服务后，可在线使用国际银行卡（Visa、Mastercard、JCB）或银行转账付款，价格以美元/人计。",
    },
  ],
};

/* ------------------------------------------------------------------------------------------
 * Gói fast-track theo bảng giá khách gửi ("BẢNG GIÁ FT MẪU.xlsx", 27/10 – mục 7.1 tài liệu yêu cầu):
 * 3 nhóm – Đón nhập cảnh (7) / Tiễn xuất cảnh (5) / Dịch vụ đi kèm (3). Giá USD/khách theo 5 sân bay,
 * null = sân bay đó không có dịch vụ / chưa có giá ("–").
 * ---------------------------------------------------------------------------------------- */
export const airportCodes = ["SGN", "HAN", "DAD", "CXR", "PQC"];
const p = (SGN, HAN, DAD, CXR, PQC) => ({ SGN, HAN, DAD, CXR, PQC });

export const fastTrackPackages = {
  arrival: [
    {
      key: "arr-fast-track",
      name: { en: "Arrival Fast-track", zh: "入境快速通关" },
      desc: {
        en: "Meet & greet, then escort to the priority immigration lane (lane 4).",
        zh: "接机迎接，并陪同前往优先入境通道（4号通道）。",
      },
      prices: p(15, 10, 8, 13, 14),
      popular: true,
    },
    {
      key: "arr-diplomatic",
      name: { en: "Fast-track – Diplomatic lane", zh: "快速通关 – 外交通道" },
      desc: {
        en: "Meet & greet, then escort to the diplomatic immigration lane.",
        zh: "接机迎接，并陪同前往外交入境通道。",
      },
      prices: p(42, 17, 17, 19, 22),
    },
    {
      key: "arr-vip",
      name: { en: "Fast-track – VIP lane", zh: "快速通关 – VIP 通道" },
      desc: {
        en: "Meet & greet, then escort through the priority lane with no queuing.",
        zh: "接机迎接，陪同走优先通道，无需排队。",
      },
      prices: p(57, 27, 27, 32, 27),
      vip: true,
    },
    {
      key: "arr-voa",
      name: { en: "Visa on arrival + Fast-track", zh: "落地签 + 快速通关" },
      desc: {
        en: "Fast visa-on-arrival stamping, then escort to the priority immigration lane (lane 4).",
        zh: "快速办理落地签盖章，并陪同前往优先入境通道（4号通道）。",
      },
      prices: p(20, 10, 8, 13, 14),
    },
    {
      key: "arr-voa-diplomatic",
      name: { en: "Visa on arrival + Diplomatic lane", zh: "落地签 + 外交通道" },
      desc: {
        en: "Fast visa-on-arrival stamping, then escort to the diplomatic immigration lane.",
        zh: "快速办理落地签盖章，并陪同前往外交入境通道。",
      },
      prices: p(47, 17, 17, 19, 22),
    },
    {
      key: "arr-voa-vip",
      name: { en: "Visa on arrival + VIP lane", zh: "落地签 + VIP 通道" },
      desc: {
        en: "Fast visa-on-arrival stamping, then the no-queue VIP immigration lane.",
        zh: "快速办理落地签盖章，随后走免排队 VIP 入境通道。",
      },
      prices: p(62, 27, 27, 32, 27),
      vip: true,
    },
    {
      key: "arr-voa-only",
      name: { en: "Visa on arrival only (no priority lane)", zh: "仅落地签（不含优先通道）" },
      desc: {
        en: "Meet & greet and visa stamping; guests then pass immigration in the regular lane.",
        zh: "接机并办理落地签，旅客随后经普通通道入境。",
      },
      prices: p(14, null, null, null, null),
    },
  ],
  departure: [
    {
      key: "dep-priority",
      name: { en: "Departure Fast-track", zh: "离境快速通关" },
      desc: {
        en: "Meet at the airport, then escort to the priority emigration lane (lane 4).",
        zh: "机场会合，并陪同前往优先出境通道（4号通道）。",
      },
      prices: p(19, 12, 12, 22, 22),
      popular: true,
    },
    {
      key: "dep-priority-security",
      name: { en: "Departure Fast-track + Security screening", zh: "离境快速通关 + 优先安检" },
      desc: {
        en: "Priority emigration lane plus priority security screening.",
        zh: "优先出境通道并享优先安检。",
      },
      prices: p(25, 22, 22, 25, null),
    },
    {
      key: "dep-checkin",
      name: { en: "Priority check-in (add-on)", zh: "优先值机（附加服务）" },
      desc: {
        en: "Check-in at a dedicated counter without queuing. At CXR only for flights to Russia.",
        zh: "专属柜台免排队值机。金兰机场（CXR）仅限飞往俄罗斯的航班。",
      },
      prices: p(null, 17, 17, 15, null),
    },
    {
      key: "dep-vip",
      name: { en: "Departure VIP lane", zh: "离境 VIP 通道" },
      desc: {
        en: "Meet at the airport and pass emigration with no queuing.",
        zh: "机场会合，免排队办理出境。",
      },
      prices: p(62, 32, 32, null, null),
      vip: true,
    },
    {
      key: "dep-vip-security",
      name: { en: "Departure VIP lane + Security screening", zh: "离境 VIP 通道 + 优先安检" },
      desc: {
        en: "No-queue emigration lane plus priority security screening.",
        zh: "免排队出境通道并享优先安检。",
      },
      prices: p(70, 42, 42, null, null),
      vip: true,
    },
  ],
  addons: [
    {
      key: "add-night",
      name: { en: "Night surcharge (23:00 – 06:00)", zh: "夜间附加费（23:00–06:00）" },
      desc: {
        en: "For flights arriving or departing between 23:00 and 06:00. Charged in USD.",
        zh: "适用于 23:00–06:00 抵达或起飞的航班，按美元计费。",
      },
      prices: p(6, 6, 6, 5, 5),
    },
    {
      key: "add-porter",
      name: { en: "Porter service", zh: "行李员服务" },
      desc: {
        en: "Luggage assistance inside the terminal.",
        zh: "航站楼内协助搬运行李。",
      },
      prices: p(6, 6, 6, null, null),
    },
    {
      key: "add-porter-plus",
      name: {
        en: "Porter + Security screening + Escort out",
        zh: "行李员 + 安检协助 + 送出航站楼",
      },
      desc: {
        en: "Luggage assistance, help through screening and escort out of the terminal.",
        zh: "协助搬运行李、通过安检并陪同走出航站楼。",
      },
      prices: p(12, 12, 12, null, null),
    },
  ],
};

export const allPackages = () =>
  Object.entries(fastTrackPackages).flatMap(([group, list]) => list.map((x) => ({ ...x, group })));

/** Quy trình 5 bước (mục 7.2 – chị gửi) + E-visa (mục 7.3 – theo cổng evisa.gov.vn). */
export const visaProcesses = {
  arrival: [
    {
      icon: "plane",
      title: { en: "Land & head to immigration", zh: "落地前往入境区" },
      text: {
        en: "Guests land and walk to the immigration area.",
        zh: "旅客落地后前往入境区域。",
      },
    },
    {
      icon: "sign",
      title: { en: "Staff hold the name sign", zh: "工作人员举牌" },
      text: {
        en: "Our staff wait with a Vietlook name sign.",
        zh: "工作人员手持 Vietlook 名牌等候。",
      },
    },
    {
      icon: "user",
      title: { en: "Meet your greeter", zh: "与接机人员会合" },
      text: {
        en: "Guests find the sign and meet our staff.",
        zh: "旅客找到名牌并与工作人员会合。",
      },
    },
    {
      icon: "stamp",
      title: { en: "Document check", zh: "核对资料" },
      text: {
        en: "Staff check passport & visa details and photograph the result.",
        zh: "工作人员核对护照与签证信息并拍照留存结果。",
      },
    },
    {
      icon: "shield",
      title: { en: "Priority immigration lane", zh: "优先入境通道" },
      text: {
        en: "Escort to the priority immigration lane – done.",
        zh: "陪同前往优先入境通道，完成入境。",
      },
    },
  ],
  departure: [
    {
      icon: "clock",
      title: { en: "Meet 2 hours before", zh: "提前 2 小时会合" },
      text: {
        en: "We set the meeting time 2 hours before departure.",
        zh: "约定在起飞前 2 小时会合。",
      },
    },
    {
      icon: "ticket",
      title: { en: "Check in, go to counter B", zh: "值机后前往 B 柜台" },
      text: {
        en: "Guests check in, then go to the meeting point at counter B.",
        zh: "旅客办理值机后前往 B 柜台会合点。",
      },
    },
    {
      icon: "sign",
      title: { en: "Staff hold the name sign", zh: "工作人员举牌" },
      text: {
        en: "Our staff wait with a name sign at the meeting point.",
        zh: "工作人员在会合点手持名牌等候。",
      },
    },
    {
      icon: "user",
      title: { en: "Meet & confirm", zh: "会合并确认" },
      text: {
        en: "We meet you and photograph the confirmation.",
        zh: "与旅客会合并拍照确认。",
      },
    },
    {
      icon: "plane",
      title: { en: "Priority emigration lane", zh: "优先出境通道" },
      text: {
        en: "Escort to the priority emigration lane.",
        zh: "陪同前往优先出境通道。",
      },
    },
  ],
  evisa: [
    {
      icon: "file",
      title: { en: "Prepare documents", zh: "准备材料" },
      text: {
        en: "Passport valid 6+ months, scan of the data page and a portrait photo.",
        zh: "有效期 6 个月以上的护照、护照资料页扫描件及证件照。",
      },
    },
    {
      icon: "edit",
      title: { en: "Apply at evisa.gov.vn", zh: "在 evisa.gov.vn 申请" },
      text: {
        en: "Fill in the official form – or send us the files and we apply for you.",
        zh: "填写官方申请表，或将材料发给我们代为申请。",
      },
    },
    {
      icon: "card",
      title: { en: "Pay the government fee", zh: "缴纳政府费用" },
      text: {
        en: "$25 single entry / $50 multiple entry, paid online.",
        zh: "单次入境 25 美元 / 多次入境 50 美元，在线支付。",
      },
    },
    {
      icon: "clock",
      title: { en: "Processing", zh: "审批" },
      text: {
        en: "Usually 3 working days; check the result with your registration code.",
        zh: "通常 3 个工作日，可凭登记码查询结果。",
      },
    },
    {
      icon: "mail",
      title: { en: "Print & enter Vietnam", zh: "打印并入境" },
      text: {
        en: "Download and print the e-visa; add fast-track to skip the queue.",
        zh: "下载并打印电子签证，可加购快速通关免排队。",
      },
    },
  ],
};

/** Hai ghi chú bắt buộc trong bảng giá (mục 7.1). */
export const visaNotes = [
  {
    en: "Prices do not include the government visa fee.",
    zh: "价格不含政府签证费。",
  },
  {
    en: "If guests do not fly or do not meet our staff at the sign, a 100% surcharge applies unless cancelled in advance.",
    zh: "如旅客未搭乘航班或未与举牌人员会合，且未提前取消，将收取 100% 费用。",
  },
];

/** Thuật ngữ chuẩn EN/ZH (mục 7 – Dev xử lý). */
export const visaTerms = [
  {
    term: { en: "Fast-track", zh: "快速通关" },
    def: {
      en: "Escorted priority passage through airport formalities (immigration, security, check-in).",
      zh: "由专人陪同优先办理机场手续（入境、安检、值机）。",
    },
  },
  {
    term: { en: "Diplomatic lane", zh: "外交通道" },
    def: {
      en: "Immigration counter normally reserved for diplomats and officials.",
      zh: "通常为外交及公务人员预留的出入境柜台。",
    },
  },
  {
    term: { en: "VIP lane", zh: "VIP 通道" },
    def: {
      en: "Priority lane with no queuing and a private escort.",
      zh: "免排队优先通道，专人陪同。",
    },
  },
  {
    term: { en: "Visa on arrival", zh: "落地签证" },
    def: {
      en: "Visa stamped at the airport counter with a pre-approval letter.",
      zh: "凭预批函在机场柜台盖章的签证。",
    },
  },
  {
    term: { en: "Priority check-in", zh: "优先值机" },
    def: {
      en: "Check-in at a dedicated counter without queuing.",
      zh: "在专属柜台免排队办理值机。",
    },
  },
  {
    term: { en: "Security screening", zh: "安检" },
    def: {
      en: "Baggage and body screening before the departure gates.",
      zh: "进入登机区前的行李与人身检查。",
    },
  },
  {
    term: { en: "Night surcharge", zh: "夜间附加费" },
    def: {
      en: "Extra fee for services between 23:00 and 06:00.",
      zh: "23:00–06:00 期间服务的额外费用。",
    },
  },
  {
    term: { en: "Porter service", zh: "行李员服务" },
    def: {
      en: "Staff carrying luggage inside the terminal and to your vehicle.",
      zh: "工作人员在航站楼内搬运行李并送至车辆。",
    },
  },
];
