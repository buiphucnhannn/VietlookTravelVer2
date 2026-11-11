import { href, tr } from "@/i18n/config";
import { regions } from "./regions";

/**
 * Cây menu nhiều cấp. Trả về dữ liệu thuần để truyền xuống Header (client component).
 *
 * Yêu cầu khách 31/10 (mục 11): các mục Tours / Destinations / Tour Themes / Packages bị trùng
 * → gộp về MỘT mục "Tours & Packages" (tab: theo điểm đến · theo thời lượng · theo chủ đề ·
 * thiết kế riêng). Mỗi đường dẫn chỉ xuất hiện ở một mục menu; thứ tự theo định hướng nội dung:
 * Tour (toàn Việt Nam) → Thuê xe → Visa & fast-track → B2B → Cẩm nang → Giới thiệu.
 */
/**
 * Ảnh THẬT của Vietlook dùng riêng trong menu thả xuống (ảnh tour web cũ vietlooktravel.com, ảnh đội xe,
 * ảnh nhân viên đón khách) — CHỈ dùng khi điểm đến / chủ đề chưa có "Ảnh thẻ" trong CMS (ảnh trong CMS luôn được ưu tiên,
 * để ảnh nhân viên chọn hiện đúng ở menu).
 */
const NAV_DEST = {
  hanoi: "/images/tours/hd/hanoi7.jpg",
  "halong-bay": "/images/tours/hd/ha-long.jpg",
  "ninh-binh": "/images/b2b/tam-coc-bich-dong.webp",
  sapa: "/images/tours/hd/du-lich-tay-bac.jpg",
  "ha-giang": "/images/tours/hd/hoang-su-phi-ha-giang.jpg",
  "cao-bang": "/images/tours/cao-bang.jpg",
  "moc-chau": "/images/tours/hd/doi-che-moc-chau.jpg",
  hue: "/images/tours/hue-tour.jpg",
  "da-nang": "/images/tours/da-nang-tour-copy.jpg",
  "hoi-an": "/images/b2b/hoi-an-9-copy.webp",
  "nha-trang": "/images/tours/hd/tourdulichnhatranggiare.jpg",
  "ho-chi-minh-city": "/images/tours/hd/hcm-tour-2-1.jpg",
  "phu-quoc": "/images/b2b/phu-quoc.webp",
  "mui-ne": "/images/tours/hd/nha-trang-da-lat-mui-ne-ho-chi-minh-city.jpg",
};
const NAV_REGION = {
  "north-vietnam": "/images/tours/hd/bao-lac-cao-bang.jpg",
  "central-vietnam": "/images/b2b/da-nang.webp",
  "south-vietnam": "/images/tours/hd/cho-lon-binh-tay-market.jpg",
};
const NAV_THEME = {
  luxury: "/images/tours/hd/glaming.jpg",
  "hand-picked": "/images/tours/hd/bai-dinh.jpg",
  culture: "/images/tours/hue-tour.jpg",
  family: "/images/tours/hd/cham-islands-da-nang.jpg",
  honeymoon: "/images/b2b/phu-quoc.webp",
  classic: "/images/tours/hd/ha-long.jpg",
  photography: "/images/tours/hd/hoang-su-phi-ha-giang.jpg",
  "tailor-made": "/images/tours/hd/du-lich-tay-bac.jpg",
};

/** catalog: dữ liệu từ CMS (lib/catalog.js) — điểm đến từng miền, chủ đề */
export function buildNavigation(
  lang,
  dict,
  { destinationsByRegion, getDestination, themes, policies },
) {
  const n = dict.nav;
  const h = (p) => href(lang, p);
  // Chỉ link tới trang chính sách đang bật "Hiện trên website" (trang tắt → 404)
  const policyLinks = [
    { key: "payment", label: n.paymentPolicy, icon: "card" },
    { key: "cancellation", label: n.cancelPolicy, icon: "calendar" },
    { key: "privacy", label: n.privacyPolicy, icon: "shield" },
    { key: "terms", label: n.termsPolicy, icon: "file" },
  ]
    .filter((l) => !policies || policies[l.key])
    .map(({ key, ...l }) => ({ ...l, href: h(`/policies/${key}`) }));
  const z = (en, zh, vi) => (lang === "zh" ? zh : lang === "vi" ? (vi ?? en) : en);
  const months = dict.guide.months;
  const monthSlugs = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const regionColumns = regions.map((r) => ({
    title: tr(r.name, lang),
    href: h(`/destinations/${r.slug}`),
    image: NAV_REGION[r.slug] || r.image,
    links: destinationsByRegion(r.slug).map((d) => ({
      label: tr(d.name, lang),
      href: h(`/destinations/${d.slug}`),
      image: d.image || NAV_DEST[d.slug],
    })),
    footer: {
      label: {
        "north-vietnam": n.allNorth,
        "central-vietnam": n.allCentral,
        "south-vietnam": n.allSouth,
      }[r.slug],
      href: h(`/destinations/${r.slug}`),
    },
  }));

  const themeLink = (t) => ({
    label: tr(t.name, lang),
    href: h(`/themes/${t.slug}`),
    image: t.image || NAV_THEME[t.slug],
  });
  const img = (slug) => getDestination(slug)?.image || NAV_DEST[slug];

  return [
    {
      key: "tours",
      label: z("Tours & Packages", "线路与套餐", "Tour & Gói du lịch"),
      href: h("/tours"),
      type: "tabs",
      tabs: [
        {
          label: z("By destination", "按目的地", "Theo điểm đến"),
          columns: regionColumns,
        },
        {
          label: n.byDuration,
          columns: [
            {
              title: n.byDuration,
              links: [
                { label: n.dayTours, href: h("/tours?duration=1"), image: img("ninh-binh") },
                { label: n.week1, href: h("/packages#1-week"), image: img("hanoi") },
                { label: n.week2, href: h("/packages#2-weeks"), image: img("hoi-an") },
                { label: n.week3, href: h("/packages#3-weeks"), image: img("sapa") },
              ],
              footer: { label: n.allPackages, href: h("/packages") },
            },
            {
              title: n.specialTours,
              links: [
                { label: n.halong, href: h("/halong-bay-cruises"), image: img("halong-bay") },
                {
                  label: n.groupTours,
                  href: h("/group-tailor-made-tours"),
                  image: "/images/tours/hd/cham-islands-da-nang.jpg",
                },
              ],
              footer: { label: n.allTours, href: h("/tours") },
            },
          ],
          promo: {
            image: "/images/nav/nav-packages.webp",
            badge: z("1–3 weeks", "1至3周", "1–3 tuần"),
            title: n.allPackages,
            text: z(
              "Private, flexible, door-to-door",
              "私人专属，灵活安排，门到门服务",
              "Riêng tư, linh hoạt, đón tận nơi",
            ),
            href: h("/packages"),
          },
        },
        {
          label: n.byTheme,
          columns: [
            { title: n.byTheme, links: themes.slice(0, 4).map(themeLink) },
            { title: " ", links: themes.slice(4).map(themeLink) },
          ],
          promo: {
            image: "/images/nav/nav-tailor.webp",
            badge: z("Free planning", "免费规划", "Tư vấn miễn phí"),
            title: n.tailorMade,
            text: z(
              "Tell us your ideas – we design the rest",
              "说出想法，其余交给我们",
              "Chia sẻ ý tưởng – phần còn lại để chúng tôi lo",
            ),
            href: h("/plan-your-trip"),
          },
        },
      ],
    },
    {
      key: "car",
      label: z("Private Car", "包车服务", "Thuê xe riêng"),
      href: h("/car-rental"),
      type: "cards",
      cols: 2,
      links: [
        {
          label: n.carHire,
          href: h("/car-rental"),
          icon: "car",
          desc: z(
            "4–45 seat vehicles with English or Chinese-speaking drivers",
            "4–45座车辆，配英语或中文司机",
            "Xe 4–45 chỗ, tài xế nói tiếng Anh hoặc tiếng Trung",
          ),
        },
        {
          label: n.airportTransfer,
          href: h("/car-rental#services"),
          icon: "plane",
          desc: z(
            "Meet & greet at every major airport",
            "各大机场接机送机",
            "Đón tiễn tại tất cả sân bay lớn",
          ),
        },
        {
          label: z("Our fleet", "车型一览", "Đội xe"),
          href: h("/car-rental#fleet"),
          icon: "users",
          desc: z(
            "Sedan, SUV, limousine, van & coach",
            "轿车、SUV、豪华商务车、面包车与大巴",
            "Sedan, SUV, limousine, xe van & xe khách",
          ),
        },
        {
          label: z("Get a car quote", "获取包车报价", "Nhận báo giá thuê xe"),
          href: h("/car-rental#quote"),
          icon: "message",
          desc: z(
            "Fixed price by route – reply in about 30 minutes",
            "按线路固定报价，约30分钟回复",
            "Giá trọn gói theo tuyến – phản hồi trong khoảng 30 phút",
          ),
        },
      ],
      promo: {
        // Ảnh xe THẬT của Vietlook (Kia Carnival, giữ biển số)
        image: "/images/services/svc-car-menu.webp",
        badge: z("Most booked", "最受欢迎", "Được đặt nhiều nhất"),
        title: n.carHire,
        text: z(
          "Get a fixed price in about 30 minutes",
          "约30分钟内获得固定报价",
          "Nhận giá trọn gói trong khoảng 30 phút",
        ),
        href: h("/car-rental#quote"),
      },
    },
    {
      key: "visa",
      label: z("Visa & Fast-track", "签证与快速通关", "Visa & Fast-track sân bay"),
      href: h("/visa-fast-track"),
      type: "cards",
      cols: 2,
      links: [
        {
          label: z("Airport fast-track", "机场快速通关", "Fast-track sân bay"),
          href: h("/visa-fast-track#fast-track"),
          icon: "plane",
          desc: z(
            "Priority & VIP lanes at SGN, HAN, DAD, CXR, PQC",
            "胡志明、河内、岘港、金兰、富国机场优先及VIP通道",
            "Làn ưu tiên & VIP tại SGN, HAN, DAD, CXR, PQC",
          ),
        },
        {
          label: z("Vietnam visa & e-visa", "越南签证与电子签证", "Visa Việt Nam & e-visa"),
          href: h("/visa-fast-track#visa"),
          icon: "stamp",
          desc: z(
            "Visa types, fees and e-visa support",
            "签证类型、费用与电子签证协助",
            "Các loại visa, lệ phí và hỗ trợ e-visa",
          ),
        },
        {
          label: z("Book the service", "预订服务", "Đặt dịch vụ"),
          href: h("/visa-fast-track#book-visa"),
          icon: "calendar",
          desc: z(
            "Send your flight details – we confirm fast",
            "提交航班信息，快速确认",
            "Gửi thông tin chuyến bay – chúng tôi xác nhận nhanh chóng",
          ),
        },
      ],
      help: {
        title: z("Need it urgently?", "急需办理？", "Cần gấp?"),
        text: z(
          "Call or message us 24/7",
          "全天候致电或留言",
          "Gọi hoặc nhắn tin cho chúng tôi 24/7",
        ),
      },
      promo: {
        image: "/images/nav/nav-visa-welcome.webp",
        badge: z("5 airports", "5个机场", "5 sân bay"),
        title: z("Visa & Fast-track", "签证与快速通关", "Visa & Fast-track sân bay"),
        text: z(
          "Skip the queues on arrival and departure",
          "入境与出境免排队",
          "Không xếp hàng khi nhập cảnh và xuất cảnh",
        ),
        href: h("/visa-fast-track"),
      },
    },
    {
      key: "b2b",
      label: z("B2B Partners", "B2B合作", "Đối tác B2B"),
      href: h("/partners"),
      type: "cards",
      cols: 2,
      links: [
        {
          label: n.partners,
          href: h("/partners"),
          icon: "handshake",
          desc: z(
            "Agencies, OTAs & MICE – net rates, quotes within 24h",
            "旅行社、OTA与会奖团队：净价，24小时内报价",
            "Đại lý, OTA & MICE – giá net, báo giá trong 24 giờ",
          ),
        },
        {
          label: z("What we offer", "合作内容", "Dịch vụ cung cấp"),
          href: h("/partners#offers"),
          icon: "star",
          desc: z(
            "Ground handling across all of Vietnam",
            "覆盖越南全境的地接服务",
            "Dịch vụ land tour trên toàn Việt Nam",
          ),
        },
        {
          label: z("MICE & incentive groups", "会奖与团队旅游", "Đoàn MICE & du lịch khen thưởng"),
          href: h("/group-tailor-made-tours#groups"),
          icon: "users",
          desc: z(
            "Groups & incentives from 2 to 200+ pax",
            "2至200+人的团队与奖励旅游",
            "Đoàn khách & incentive từ 2 đến hơn 200 khách",
          ),
        },
        {
          label: z("Request net rates", "索取净价", "Yêu cầu giá net"),
          href: h("/partners#partner-form"),
          icon: "mail",
          desc: z(
            "Tell us about your company and volume",
            "介绍贵公司与业务量",
            "Giới thiệu về công ty và lượng khách của bạn",
          ),
        },
      ],
      promo: {
        image: "/images/nav/nav-b2b.webp",
        badge: z("Since 2009", "始于2009年", "Từ năm 2009"),
        title: z("Your ground partner", "您的越南地接伙伴", "Đối tác land tour của bạn"),
        text: z(
          "North to South, one local team",
          "从北到南，一个本地团队",
          "Từ Bắc vào Nam, một đội ngũ địa phương",
        ),
        href: h("/partners"),
      },
    },
    {
      key: "guide",
      label: n.guide,
      href: h("/travel-guide"),
      type: "tabs",
      // Mỗi tab: 2 cột nội dung cân nhau + 1 ảnh nổi bật bên phải (bố cục cân đối)
      tabs: [
        {
          label: n.guideEssentials,
          columns: [
            {
              title: z("Before you go", "出发前", "Trước chuyến đi"),
              links: [
                {
                  label: z("Vietnam visa guide", "越南签证指南", "Cẩm nang visa Việt Nam"),
                  href: h("/travel-guide/vietnam-visa-guide"),
                },
                {
                  label: z("Currency & money", "货币与付款", "Tiền tệ & thanh toán"),
                  href: h("/travel-guide/vietnam-currency-money-tips"),
                },
                {
                  label: z("SIM cards & internet", "电话卡与网络", "SIM & internet"),
                  href: h("/travel-guide/vietnam-sim-card-internet"),
                },
                {
                  label: z(
                    "Is Vietnam safe?",
                    "越南安全吗？",
                    "Du lịch Việt Nam có an toàn không?",
                  ),
                  href: h("/travel-guide/is-vietnam-safe"),
                },
              ],
            },
            {
              title: z("Plan better", "更好地规划", "Lên kế hoạch tốt hơn"),
              links: [
                {
                  label: z("Best time to visit", "最佳旅游时间", "Thời điểm du lịch lý tưởng"),
                  href: h("/travel-guide/best-time-to-visit-vietnam"),
                },
                { label: n.guideDestinations, href: h("/travel-guide/category/destinations") },
              ],
              footer: { label: n.guideAll, href: h("/travel-guide") },
            },
          ],
          promo: {
            image: "/images/nav/nav-guide-essentials-hue.webp",
            badge: z("Guide", "攻略", "Cẩm nang"),
            title: z(
              "Best time to visit Vietnam",
              "越南最佳旅游时间",
              "Thời điểm lý tưởng để du lịch Việt Nam",
            ),
            text: z(
              "North, Centre & South – season by season",
              "北中南三地，逐季解析",
              "Miền Bắc, Trung & Nam – theo từng mùa",
            ),
            href: h("/travel-guide/best-time-to-visit-vietnam"),
          },
        },
        {
          label: n.guideMonths,
          columns: [
            {
              title: n.guideMonths,
              grid: true,
              links: monthSlugs.map((m, i) => ({
                label: months[i],
                href: h(`/travel-guide/vietnam-in-${m}`),
              })),
              footer: { label: n.guideMonths, href: h("/travel-guide/category/vietnam-by-month") },
            },
          ],
          promo: {
            image: "/images/nav/nav-guide-months.webp",
            badge: z("When to go", "何时出发", "Khi nào nên đi"),
            title: z(
              "Different seasons, different adventures",
              "不同季节，不同精彩",
              "Mỗi mùa một trải nghiệm",
            ),
            href: h("/travel-guide/category/vietnam-by-month"),
          },
        },
        {
          label: n.guideTransport,
          columns: [
            {
              title: n.guideTransport,
              links: [
                {
                  label: z("Domestic flights", "国内航班", "Chuyến bay nội địa"),
                  href: h("/travel-guide/domestic-flights-vietnam"),
                },
                {
                  label: z("Train travel in Vietnam", "越南火车", "Đi tàu hỏa ở Việt Nam"),
                  href: h("/travel-guide/train-travel-vietnam"),
                },
              ],
              footer: { label: n.guideTransport, href: h("/travel-guide/category/getting-around") },
            },
            {
              title: z("Popular routes", "热门路线", "Tuyến đường phổ biến"),
              links: [
                {
                  label: z("Hanoi → Halong Bay", "河内 → 下龙湾", "Hà Nội → Vịnh Hạ Long"),
                  href: h("/travel-guide/hanoi-to-halong-bay"),
                },
                {
                  label: z("Hanoi → Sapa", "河内 → 沙坝", "Hà Nội → Sa Pa"),
                  href: h("/travel-guide/hanoi-to-sapa"),
                },
                {
                  label: z("Hanoi → Ninh Binh", "河内 → 宁平", "Hà Nội → Ninh Bình"),
                  href: h("/travel-guide/hanoi-to-ninh-binh"),
                },
              ],
            },
          ],
          promo: {
            image: "/images/nav/nav-guide-route.webp",
            badge: z("Route guide", "路线攻略", "Cẩm nang lộ trình"),
            title: z("Hanoi to Halong Bay", "河内到下龙湾", "Hà Nội đi Vịnh Hạ Long"),
            text: z(
              "Every way to get there, compared",
              "各种交通方式对比",
              "So sánh mọi cách di chuyển",
            ),
            href: h("/travel-guide/hanoi-to-halong-bay"),
          },
        },
        {
          label: n.guideCulture,
          columns: [
            {
              title: z("Food", "美食", "Ẩm thực"),
              links: [
                {
                  label: z("Ninh Binh specialties", "宁平特色美食", "Đặc sản Ninh Bình"),
                  href: h(
                    "/travel-guide/must-try-local-specialties-in-ninh-binh-you-should-not-miss",
                  ),
                },
                {
                  label: z(
                    "Sapa: what to eat & where to stay",
                    "沙坝吃住指南",
                    "Sa Pa: ăn gì & ở đâu",
                  ),
                  href: h("/travel-guide/sapa-summer-travel-guide-what-to-eat-where-to-stay"),
                },
              ],
            },
            {
              title: z("Culture", "文化", "Văn hóa"),
              links: [
                {
                  label: z(
                    "Hmong culture & traditions",
                    "苗族文化与传统",
                    "Văn hóa & truyền thống người H'Mông",
                  ),
                  href: h(
                    "/travel-guide/exploring-the-culture-and-traditions-of-the-hmong-people-in-vietnam",
                  ),
                },
                {
                  label: z("Tipping & etiquette", "小费与礼仪", "Tiền tip & phép lịch sự"),
                  href: h("/travel-guide/tipping-etiquette-vietnam"),
                },
              ],
              footer: { label: n.guideCulture, href: h("/travel-guide/category/food-culture") },
            },
          ],
          promo: {
            image: "/images/nav/nav-guide-food.webp",
            badge: z("Food & culture", "美食与文化", "Ẩm thực & văn hóa"),
            title: z(
              "Taste Vietnam like a local",
              "像本地人一样品味越南",
              "Thưởng thức Việt Nam như người bản địa",
            ),
            href: h("/travel-guide/category/food-culture"),
          },
        },
      ],
    },
    {
      key: "about",
      label: n.about,
      href: h("/about"),
      type: "cards",
      cols: 2,
      links: [
        {
          label: n.aboutCompany,
          href: h("/about"),
          icon: "info",
          desc: z(
            "Hanoi-based tour operator since 2009",
            "2009年成立于河内的地接社",
            "Công ty lữ hành tại Hà Nội từ năm 2009",
          ),
        },
        {
          label: n.whyUs,
          href: h("/about#why"),
          icon: "star",
          desc: z(
            "Local experts, own fleet, 24/7 support",
            "本地专家、自有车队、全天候支持",
            "Chuyên gia địa phương, đội xe riêng, hỗ trợ 24/7",
          ),
        },
        {
          label: n.reviews,
          href: h("/about#reviews"),
          icon: "message",
          desc: z(
            "What travellers say on Tripadvisor & Google",
            "旅客在猫途鹰与谷歌上的评价",
            "Du khách nói gì trên Tripadvisor & Google",
          ),
        },
        {
          label: n.contact,
          href: h("/contact"),
          icon: "mail",
          desc: z(
            "Office, hotline, WhatsApp, WeChat & Zalo",
            "办公室、热线、WhatsApp、微信与Zalo",
            "Văn phòng, hotline, WhatsApp, WeChat & Zalo",
          ),
        },
      ],
      aside: policyLinks.length
        ? { title: z("Policies", "政策条款", "Chính sách"), links: policyLinks }
        : undefined,
      promo: {
        image: "/images/nav/nav-about-hanoi.webp",
        badge: z("Since 2009", "始于2009年", "Từ năm 2009"),
        title: z("Our story", "我们的故事", "Câu chuyện của chúng tôi"),
        text: z(
          "The local team behind every Vietlook trip",
          "每一段 Vietlook 旅程背后的本地团队",
          "Đội ngũ địa phương đứng sau mỗi chuyến đi Vietlook",
        ),
        href: h("/about"),
      },
    },
  ];
}
