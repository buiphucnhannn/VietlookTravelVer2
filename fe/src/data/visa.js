// Visa & Fast-track. Gói dịch vụ & sân bay lấy từ trang "Fast Track And Visa" của vietlooktravel.com.
// Chỉ ghi phí chính phủ công khai; phí dịch vụ & giá fast-track do doanh nghiệp nhập trong CMS (chưa có -> "Giá liên hệ").

export const airports = [
  {
    code: "HAN",
    name: { en: "Noi Bai – Hanoi", zh: "内排 – 河内", vi: "Nội Bài – Hà Nội" },
    factor: 1,
    image: "/images/tours/v2/hanoi-17177476.jpg",
  },
  {
    code: "SGN",
    name: {
      en: "Tan Son Nhat – Ho Chi Minh City",
      zh: "新山一 – 胡志明市",
      vi: "Tân Sơn Nhất – TP. Hồ Chí Minh",
    },
    factor: 1,
    image: "/images/tours/v2/ho-chi-minh-city-1018478.jpg",
  },
  {
    code: "DAD",
    name: { en: "Da Nang", zh: "岘港", vi: "Đà Nẵng" },
    factor: 0.9,
    image: "/images/tours/da-nang-tour-copy.jpg",
  },
  {
    code: "CXR",
    name: { en: "Cam Ranh – Nha Trang", zh: "金兰 – 芽庄", vi: "Cam Ranh – Nha Trang" },
    factor: 0.9,
    image: "/images/tours/v2/nha-trang-2887293.jpg",
  },
  {
    code: "PQC",
    name: { en: "Phu Quoc", zh: "富国岛", vi: "Phú Quốc" },
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
  vi: [
    {
      q: "Dịch vụ fast-track phù hợp với ai?",
      a: "Khách công tác, gia đình có trẻ nhỏ, người cao tuổi hoặc phụ nữ mang thai, khách đoàn và bất kỳ ai có thời gian nối chuyến ngắn.",
    },
    {
      q: "Có những dịch vụ nào?",
      a: "Fast-track khi nhập cảnh Việt Nam, khi xuất cảnh Việt Nam và khi nối chuyến (transit).",
    },
    {
      q: "Tôi cần cung cấp những gì?",
      a: "Trang thông tin hộ chiếu, số hiệu chuyến bay và giờ đến, cùng công văn duyệt visa (nếu có).",
    },
    {
      q: "Thanh toán như thế nào?",
      a: "Sau khi chúng tôi xác nhận dịch vụ, bạn thanh toán trực tuyến bằng thẻ quốc tế (Visa, Mastercard, JCB) hoặc chuyển khoản ngân hàng. Giá tính bằng USD/khách.",
    },
  ],
};

/* ------------------------------------------------------------------------------------------
 * Gói fast-track theo bảng giá khách gửi ("BẢNG GIÁ FT MẪU.xlsx", 27/10 – mục 7.1 tài liệu yêu cầu):
 * 3 nhóm – Đón nhập cảnh (7) / Tiễn xuất cảnh (5) / Dịch vụ đi kèm (3). Giá USD/khách theo 5 sân bay,
 * null = sân bay đó không có dịch vụ / chưa có giá ("–").
 * ---------------------------------------------------------------------------------------- */
export const airportCodes = ["SGN", "HAN", "DAD", "CXR", "PQC"];
export const visaProcesses = {
  arrival: [
    {
      icon: "plane",
      title: {
        en: "Land & head to immigration",
        zh: "落地前往入境区",
        vi: "Hạ cánh & tới khu nhập cảnh",
      },
      text: {
        en: "Guests land and walk to the immigration area.",
        zh: "旅客落地后前往入境区域。",
        vi: "Khách hạ cánh và di chuyển tới khu vực nhập cảnh.",
      },
    },
    {
      icon: "sign",
      title: { en: "Staff hold the name sign", zh: "工作人员举牌", vi: "Nhân viên cầm biển tên" },
      text: {
        en: "Our staff wait with a Vietlook name sign.",
        zh: "工作人员手持 Vietlook 名牌等候。",
        vi: "Nhân viên của chúng tôi chờ sẵn với biển tên Vietlook.",
      },
    },
    {
      icon: "user",
      title: { en: "Meet your greeter", zh: "与接机人员会合", vi: "Gặp nhân viên đón" },
      text: {
        en: "Guests find the sign and meet our staff.",
        zh: "旅客找到名牌并与工作人员会合。",
        vi: "Khách tìm biển tên và gặp nhân viên của chúng tôi.",
      },
    },
    {
      icon: "stamp",
      title: { en: "Document check", zh: "核对资料", vi: "Kiểm tra giấy tờ" },
      text: {
        en: "Staff check passport & visa details and photograph the result.",
        zh: "工作人员核对护照与签证信息并拍照留存结果。",
        vi: "Nhân viên kiểm tra thông tin hộ chiếu & visa và chụp ảnh lưu kết quả.",
      },
    },
    {
      icon: "shield",
      title: { en: "Priority immigration lane", zh: "优先入境通道", vi: "Làn nhập cảnh ưu tiên" },
      text: {
        en: "Escort to the priority immigration lane – done.",
        zh: "陪同前往优先入境通道，完成入境。",
        vi: "Dẫn khách tới làn nhập cảnh ưu tiên – hoàn tất.",
      },
    },
  ],
  departure: [
    {
      icon: "clock",
      title: { en: "Meet 2 hours before", zh: "提前 2 小时会合", vi: "Gặp trước 2 giờ" },
      text: {
        en: "We set the meeting time 2 hours before departure.",
        zh: "约定在起飞前 2 小时会合。",
        vi: "Hẹn giờ gặp trước giờ khởi hành 2 tiếng.",
      },
    },
    {
      icon: "ticket",
      title: {
        en: "Check in, go to counter B",
        zh: "值机后前往 B 柜台",
        vi: "Check-in rồi tới quầy B",
      },
      text: {
        en: "Guests check in, then go to the meeting point at counter B.",
        zh: "旅客办理值机后前往 B 柜台会合点。",
        vi: "Khách làm thủ tục check-in, sau đó tới điểm hẹn tại quầy B.",
      },
    },
    {
      icon: "sign",
      title: { en: "Staff hold the name sign", zh: "工作人员举牌", vi: "Nhân viên cầm biển tên" },
      text: {
        en: "Our staff wait with a name sign at the meeting point.",
        zh: "工作人员在会合点手持名牌等候。",
        vi: "Nhân viên của chúng tôi chờ sẵn với biển tên tại điểm hẹn.",
      },
    },
    {
      icon: "user",
      title: { en: "Meet & confirm", zh: "会合并确认", vi: "Gặp mặt & xác nhận" },
      text: {
        en: "We meet you and photograph the confirmation.",
        zh: "与旅客会合并拍照确认。",
        vi: "Chúng tôi gặp bạn và chụp ảnh xác nhận.",
      },
    },
    {
      icon: "plane",
      title: { en: "Priority emigration lane", zh: "优先出境通道", vi: "Làn xuất cảnh ưu tiên" },
      text: {
        en: "Escort to the priority emigration lane.",
        zh: "陪同前往优先出境通道。",
        vi: "Dẫn khách tới làn xuất cảnh ưu tiên.",
      },
    },
  ],
  evisa: [
    {
      icon: "file",
      title: { en: "Prepare documents", zh: "准备材料", vi: "Chuẩn bị giấy tờ" },
      text: {
        en: "Passport valid 6+ months, scan of the data page and a portrait photo.",
        zh: "有效期 6 个月以上的护照、护照资料页扫描件及证件照。",
        vi: "Hộ chiếu còn hạn trên 6 tháng, bản scan trang thông tin và ảnh chân dung.",
      },
    },
    {
      icon: "edit",
      title: {
        en: "Apply at evisa.gov.vn",
        zh: "在 evisa.gov.vn 申请",
        vi: "Nộp hồ sơ tại evisa.gov.vn",
      },
      text: {
        en: "Fill in the official form – or send us the files and we apply for you.",
        zh: "填写官方申请表，或将材料发给我们代为申请。",
        vi: "Điền tờ khai chính thức – hoặc gửi hồ sơ để chúng tôi nộp thay bạn.",
      },
    },
    {
      icon: "card",
      title: { en: "Pay the government fee", zh: "缴纳政府费用", vi: "Nộp phí chính phủ" },
      text: {
        en: "$25 single entry / $50 multiple entry, paid online.",
        zh: "单次入境 25 美元 / 多次入境 50 美元，在线支付。",
        vi: "$25 nhập cảnh một lần / $50 nhập cảnh nhiều lần, thanh toán trực tuyến.",
      },
    },
    {
      icon: "clock",
      title: { en: "Processing", zh: "审批", vi: "Xét duyệt" },
      text: {
        en: "Usually 3 working days; check the result with your registration code.",
        zh: "通常 3 个工作日，可凭登记码查询结果。",
        vi: "Thường mất 3 ngày làm việc; tra cứu kết quả bằng mã hồ sơ.",
      },
    },
    {
      icon: "mail",
      title: { en: "Print & enter Vietnam", zh: "打印并入境", vi: "In & nhập cảnh Việt Nam" },
      text: {
        en: "Download and print the e-visa; add fast-track to skip the queue.",
        zh: "下载并打印电子签证，可加购快速通关免排队。",
        vi: "Tải và in e-visa; đặt thêm fast-track để không phải xếp hàng.",
      },
    },
  ],
};

/** Hai ghi chú bắt buộc trong bảng giá (mục 7.1). */
export const visaNotes = [
  {
    en: "Prices do not include the government visa fee.",
    zh: "价格不含政府签证费。",
    vi: "Giá chưa bao gồm phí visa của chính phủ.",
  },
  {
    en: "If guests do not fly or do not meet our staff at the sign, a 100% surcharge applies unless cancelled in advance.",
    zh: "如旅客未搭乘航班或未与举牌人员会合，且未提前取消，将收取 100% 费用。",
    vi: "Nếu khách không bay hoặc không gặp nhân viên cầm biển tên mà không hủy trước, sẽ tính 100% phí dịch vụ.",
  },
];

/** Thuật ngữ chuẩn EN/ZH (mục 7 – Dev xử lý). */
export const visaTerms = [
  {
    term: { en: "Fast-track", zh: "快速通关", vi: "Fast-track" },
    def: {
      en: "Escorted priority passage through airport formalities (immigration, security, check-in).",
      zh: "由专人陪同优先办理机场手续（入境、安检、值机）。",
      vi: "Có nhân viên dẫn qua các thủ tục sân bay theo làn ưu tiên (nhập cảnh, an ninh, check-in).",
    },
  },
  {
    term: { en: "Diplomatic lane", zh: "外交通道", vi: "Làn ngoại giao" },
    def: {
      en: "Immigration counter normally reserved for diplomats and officials.",
      zh: "通常为外交及公务人员预留的出入境柜台。",
      vi: "Quầy xuất nhập cảnh thường dành cho nhà ngoại giao và cán bộ công vụ.",
    },
  },
  {
    term: { en: "VIP lane", zh: "VIP 通道", vi: "Làn VIP" },
    def: {
      en: "Priority lane with no queuing and a private escort.",
      zh: "免排队优先通道，专人陪同。",
      vi: "Làn ưu tiên không xếp hàng, có nhân viên dẫn riêng.",
    },
  },
  {
    term: { en: "Visa on arrival", zh: "落地签证", vi: "Visa tại cửa khẩu" },
    def: {
      en: "Visa stamped at the airport counter with a pre-approval letter.",
      zh: "凭预批函在机场柜台盖章的签证。",
      vi: "Visa được dán tại quầy sân bay bằng công văn nhập cảnh duyệt trước.",
    },
  },
  {
    term: { en: "Priority check-in", zh: "优先值机", vi: "Check-in ưu tiên" },
    def: {
      en: "Check-in at a dedicated counter without queuing.",
      zh: "在专属柜台免排队办理值机。",
      vi: "Làm thủ tục check-in tại quầy riêng, không xếp hàng.",
    },
  },
  {
    term: { en: "Security screening", zh: "安检", vi: "Soi chiếu an ninh" },
    def: {
      en: "Baggage and body screening before the departure gates.",
      zh: "进入登机区前的行李与人身检查。",
      vi: "Kiểm tra hành lý và người trước khi vào khu cửa ra máy bay.",
    },
  },
  {
    term: { en: "Night surcharge", zh: "夜间附加费", vi: "Phụ phí ban đêm" },
    def: {
      en: "Extra fee for services between 23:00 and 06:00.",
      zh: "23:00–06:00 期间服务的额外费用。",
      vi: "Phí cộng thêm cho dịch vụ từ 23:00 đến 06:00.",
    },
  },
  {
    term: { en: "Porter service", zh: "行李员服务", vi: "Dịch vụ khuân vác hành lý" },
    def: {
      en: "Staff carrying luggage inside the terminal and to your vehicle.",
      zh: "工作人员在航站楼内搬运行李并送至车辆。",
      vi: "Nhân viên mang hành lý trong nhà ga và ra tận xe của bạn.",
    },
  },
];
