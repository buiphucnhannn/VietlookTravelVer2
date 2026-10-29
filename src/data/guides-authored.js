// Bài cẩm nang biên soạn mới cho website (Cẩm nang cần biết, Việt Nam theo tháng, Phương tiện di chuyển).
// Nội dung ngắn gọn, viết riêng – không sao chép từ website tham khảo.

const monthData = [
  {
    m: "january",
    en: {
      n: "January",
      north: "Cool and often grey, 14–20°C in Hanoi; cold nights in Sapa and Ha Giang.",
      central: "The rainy season fades; mild 20–25°C with occasional showers in Hue and Hoi An.",
      south: "Dry, sunny and pleasant, 25–32°C – peak season in Saigon, the Mekong and Phu Quoc.",
      events: "Preparations for Tet (Lunar New Year) fill markets with flowers and kumquat trees.",
      go: ["Phu Quoc", "Mekong Delta", "Mui Ne", "Hoi An"],
    },
    zh: {
      n: "一月",
      north: "凉爽多阴，河内14–20°C；沙坝、河江夜间寒冷。",
      central: "雨季结束，顺化、会安温和20–25°C，偶有阵雨。",
      south: "干燥晴朗，25–32°C——西贡、湄公河与富国岛旺季。",
      events: "春节前夕，市场里摆满年花与金桔。",
      go: ["富国岛", "湄公河三角洲", "美奈", "会安"],
    },
    image: "/images/tours/v2/phu-quoc-14012373.jpg",
  },
  {
    m: "february",
    en: {
      n: "February",
      north: "Cool with light drizzle; peach and plum blossoms bloom across the northern hills.",
      central: "Drying out and warming up – a great month to start central coast trips.",
      south: "Hot and dry, 26–33°C with clear skies.",
      events:
        "Tet 2027 falls on 6 February – Vietnam's biggest festival. Book early; some services close for 3–5 days.",
      go: ["Hanoi", "Hoi An", "Ho Chi Minh City", "Phu Quoc"],
    },
    zh: {
      n: "二月",
      north: "凉爽有毛毛雨，北部山区桃花、梅花盛开。",
      central: "逐渐干燥回暖——开始中部海岸之旅的好时机。",
      south: "炎热干燥，26–33°C，晴空万里。",
      events: "2027年春节为2月6日——越南最盛大的节日。请提前预订，部分服务停业3–5天。",
      go: ["河内", "会安", "胡志明市", "富国岛"],
    },
    image: "/images/tours/hd/du-lich-tay-bac.jpg",
  },
  {
    m: "march",
    en: {
      n: "March",
      north:
        "Warming to 20–25°C; spring flowers in Sapa and the Northwest, calm seas in Halong Bay.",
      central: "Dry and sunny – Hue, Da Nang and Hoi An are at their best.",
      south: "Hot and dry; perfect beach weather in Phu Quoc and Con Dao.",
      events:
        "Perfume Pagoda pilgrimage season continues; white ban flowers bloom in the Northwest.",
      go: ["Halong Bay", "Ninh Binh", "Sapa", "Hoi An"],
    },
    zh: {
      n: "三月",
      north: "回暖至20–25°C，沙坝与西北春花烂漫，下龙湾海面平静。",
      central: "干燥晴朗——顺化、岘港、会安正值最佳时节。",
      south: "炎热干燥，富国岛、昆岛海滩天气完美。",
      events: "香寺朝圣季持续，西北白色羊蹄甲花盛开。",
      go: ["下龙湾", "宁平", "沙坝", "会安"],
    },
    image: "/images/tours/hd/ha-long.jpg",
  },
  {
    m: "april",
    en: {
      n: "April",
      north: "Warm and mostly dry, 22–30°C – one of the best months for the whole North.",
      central: "Sunny beach days begin; sea is calm and clear.",
      south: "The hottest month, up to 35°C, before the rains arrive.",
      events:
        "Hung Kings Festival (10th day of the 3rd lunar month) and Reunification Day on 30 April – domestic travel peaks around the 30/4–1/5 holiday.",
      go: ["Ninh Binh", "Ha Giang", "Da Nang", "Nha Trang"],
    },
    zh: {
      n: "四月",
      north: "温暖少雨，22–30°C——全北部最佳月份之一。",
      central: "海滩季开始，海水平静清澈。",
      south: "全年最热，可达35°C，雨季前夕。",
      events: "雄王节（农历三月初十）与4月30日统一日——4/30–5/1假期国内出游高峰。",
      go: ["宁平", "河江", "岘港", "芽庄"],
    },
    image: "/images/tours/v2/ninh-binh-c43.jpg",
  },
  {
    m: "may",
    en: {
      n: "May",
      north: "Hot with the first summer storms; rice in Ninh Binh turns golden in late May.",
      central: "Excellent – long sunny days along the whole coast.",
      south: "Rainy season starts with short afternoon showers.",
      events: "Buddha's Birthday (Vesak) celebrated at pagodas nationwide.",
      go: ["Da Nang", "Hoi An", "Quy Nhon", "Ninh Binh"],
    },
    zh: {
      n: "五月",
      north: "炎热，开始有夏季雷雨；5月下旬宁平稻田金黄。",
      central: "绝佳——整个海岸线阳光充足。",
      south: "雨季开始，多为午后短阵雨。",
      events: "全国寺庙庆祝佛诞节。",
      go: ["岘港", "会安", "归仁", "宁平"],
    },
    image: "/images/tours/v2/ninh-binh-c42.jpg",
  },
  {
    m: "june",
    en: {
      n: "June",
      north: "Hot and humid, 28–35°C; Tam Coc's golden rice and early lotus season.",
      central: "Peak beach season with warm, calm sea.",
      south: "Green season – showers, fewer crowds and lower prices.",
      events: "School holidays begin; book central coast hotels early.",
      go: ["Hoi An", "Da Nang", "Nha Trang", "Sapa"],
    },
    zh: {
      n: "六月",
      north: "炎热潮湿，28–35°C；三谷金色稻田与早荷季。",
      central: "海滩旺季，海水温暖平静。",
      south: "绿季——阵雨、游客少、价格低。",
      events: "暑假开始，中部海岸酒店需提前预订。",
      go: ["会安", "岘港", "芽庄", "沙坝"],
    },
    image: "/images/tours/hd/cham-islands-da-nang.jpg",
  },
  {
    m: "july",
    en: {
      n: "July",
      north: "Hot with heavy downpours; occasional storms may affect Halong Bay cruises.",
      central: "Dry and hot – the central coast remains the best choice.",
      south: "Rainy afternoons, lush Mekong landscapes.",
      events: "Lotus season peaks in Ninh Binh and Hanoi's West Lake.",
      go: ["Da Nang", "Hoi An", "Phong Nha", "Sapa"],
    },
    zh: {
      n: "七月",
      north: "炎热多暴雨；偶有风暴影响下龙湾游轮。",
      central: "干燥炎热——中部海岸仍是首选。",
      south: "午后多雨，湄公河景色葱郁。",
      events: "宁平与河内西湖荷花盛开。",
      go: ["岘港", "会安", "峰牙", "沙坝"],
    },
    image: "/images/tours/v2/ninh-binh-c46.jpg",
  },
  {
    m: "august",
    en: {
      n: "August",
      north: "Hot and wet; terraces in Mu Cang Chai and Hoang Su Phi start turning yellow.",
      central: "Still sunny; the last great beach month before autumn rains.",
      south: "Rainy season continues with sunny mornings.",
      events: "Ghost Month (7th lunar month) – a quieter time for weddings and business openings.",
      go: ["Hoi An", "Hue", "Nha Trang", "Sapa"],
    },
    zh: {
      n: "八月",
      north: "炎热多雨；木江界、黄树皮梯田开始变黄。",
      central: "依然晴朗，秋雨前最后的海滩月。",
      south: "雨季持续，上午多晴。",
      events: "农历七月——婚礼与开业活动较少。",
      go: ["会安", "顺化", "芽庄", "沙坝"],
    },
    image: "/images/tours/hd/hoang-su-phi-ha-giang.jpg",
  },
  {
    m: "september",
    en: {
      n: "September",
      north:
        "Rice harvest season – the most photogenic month for Sapa, Mu Cang Chai and Hoang Su Phi.",
      central: "Rains begin late in the month; still good for Da Nang early on.",
      south: "Rainy, with brief heavy showers.",
      events:
        "National Day (2 September) and the Mid-Autumn Festival (15 September 2027) with lanterns and mooncakes.",
      go: ["Sapa", "Ha Giang", "Hanoi", "Halong Bay"],
    },
    zh: {
      n: "九月",
      north: "稻谷收获季——沙坝、木江界、黄树皮最上镜的月份。",
      central: "月底开始降雨，月初岘港仍适宜。",
      south: "多雨，阵雨短而猛。",
      events: "国庆节（9月2日）与中秋节（2027年9月15日）——灯笼与月饼。",
      go: ["沙坝", "河江", "河内", "下龙湾"],
    },
    image: "/images/tours/v2/sapa-2131899.jpg",
  },
  {
    m: "october",
    en: {
      n: "October",
      north: "Dry, sunny autumn days, 22–28°C – a top month for the North and Halong Bay.",
      central: "Rainy season with possible floods in Hue and Hoi An.",
      south: "Rains ease towards the end of the month.",
      events: "Buckwheat flowers start blooming on the Ha Giang plateau in late October.",
      go: ["Hanoi", "Halong Bay", "Ha Giang", "Ninh Binh"],
    },
    zh: {
      n: "十月",
      north: "秋高气爽，22–28°C——北部与下龙湾的黄金月份。",
      central: "雨季，顺化、会安可能出现洪水。",
      south: "月底降雨减少。",
      events: "10月下旬河江高原荞麦花开始盛开。",
      go: ["河内", "下龙湾", "河江", "宁平"],
    },
    image: "/images/tours/hd/bao-lac-cao-bang.jpg",
  },
  {
    m: "november",
    en: {
      n: "November",
      north: "Cool and clear, 18–25°C; buckwheat flowers paint Ha Giang pink.",
      central: "Wettest month on the central coast – plan flexible days.",
      south: "Dry season begins; ideal for Saigon and the Mekong.",
      events: "Teachers' Day (20 November); cultural festivals in the Mekong Delta.",
      go: ["Ha Giang", "Cao Bang", "Ho Chi Minh City", "Mekong Delta"],
    },
    zh: {
      n: "十一月",
      north: "凉爽晴朗，18–25°C；荞麦花把河江染成粉色。",
      central: "中部海岸最湿润的月份——请预留弹性时间。",
      south: "旱季开始，西贡与湄公河正当时。",
      events: "教师节（11月20日）；湄公河地区文化节庆。",
      go: ["河江", "高平", "胡志明市", "湄公河三角洲"],
    },
    image: "/images/tours/cao-bang.jpg",
  },
  {
    m: "december",
    en: {
      n: "December",
      north: "Cold, 10–18°C in Hanoi, near-freezing nights in Sapa – bring a warm jacket.",
      central: "Rain eases; cool and calm by the end of the month.",
      south: "Dry and sunny – perfect beach weather in Phu Quoc.",
      events: "Christmas lights in Saigon's cathedral district; year-end peak season – book early.",
      go: ["Phu Quoc", "Ho Chi Minh City", "Mui Ne", "Hanoi"],
    },
    zh: {
      n: "十二月",
      north: "寒冷，河内10–18°C，沙坝夜间接近零度——请带保暖外套。",
      central: "雨势减弱，月底凉爽平静。",
      south: "干燥晴朗——富国岛海滩天气完美。",
      events: "西贡大教堂一带圣诞灯饰；年底旺季，请尽早预订。",
      go: ["富国岛", "胡志明市", "美奈", "河内"],
    },
    image: "/images/tours/v2/phu-quoc-c249.jpg",
  },
];

function monthBody(d, lang) {
  const t = d[lang];
  const L =
    lang === "zh"
      ? {
          intro: `${t.n}的越南是什么样？以下是北、中、南三个地区的天气概况与出行建议。`,
          north: "北部（河内、下龙湾、沙坝）",
          central: "中部（顺化、岘港、会安）",
          south: "南部（西贡、湄公河、富国岛）",
          events: "节庆与提示",
          go: `${t.n}推荐目的地`,
          tip: "需要根据天气调整行程？我们的本地团队会为您推荐最合适的路线。",
        }
      : {
          intro: `What is Vietnam like in ${t.n}? Vietnam stretches over 1,600 km, so the weather differs a lot between North, Central and South. Here is our local overview for ${t.n}.`,
          north: "North (Hanoi, Halong Bay, Sapa)",
          central: "Central (Hue, Da Nang, Hoi An)",
          south: "South (Saigon, Mekong, Phu Quoc)",
          events: "Festivals & tips",
          go: `Where to go in ${t.n}`,
          tip: "Not sure how the weather fits your route? Our local team will suggest the best itinerary for your dates.",
        };
  return `<p>${L.intro}</p><h2>${L.north}</h2><p>${t.north}</p><h2>${L.central}</h2><p>${t.central}</p><h2>${L.south}</h2><p>${t.south}</p><h2>${L.events}</h2><p>${t.events}</p><h2>${L.go}</h2><ul>${t.go.map((g) => `<li>${g}</li>`).join("")}</ul><p><strong>${L.tip}</strong></p>`;
}

const monthPosts = monthData.map((d, i) => ({
  slug: `vietnam-in-${d.m}`,
  title: {
    en: `Vietnam in ${d.en.n}: Weather & Where to Go`,
    zh: `${d.zh.n}的越南：天气与目的地推荐`,
  },
  category: "vietnam-by-month",
  author: "vietlook-team",
  month: i + 1,
  excerpt: { en: `${d.en.north} ${d.en.south}`, zh: `${d.zh.north}${d.zh.south}` },
  image: d.image,
  body: { en: monthBody(d, "en"), zh: monthBody(d, "zh") },
}));

const essentials = [
  {
    slug: "vietnam-visa-guide",
    category: "need-to-know",
    image: "/images/tours/welcome-vietlook.png",
    title: {
      en: "Vietnam Visa Guide 2026: E-visa, Exemptions & Fast-track",
      zh: "2026越南签证指南：电子签、免签与快速通关",
    },
    excerpt: {
      en: "Who needs a visa for Vietnam, how the e-visa works and how to skip the arrival queues.",
      zh: "哪些人需要越南签证、电子签如何办理，以及如何免排队入境。",
    },
    body: {
      en: `<p>Getting into Vietnam is easier than ever. Since August 2023 citizens of <strong>all countries</strong> can apply online for an e-visa valid for up to <strong>90 days</strong>, with single or multiple entry.</p><h2>Visa exemption</h2><p>Many nationalities can visit visa-free for a limited stay – for example up to 45 days for the UK, Germany, France, Italy, Spain, the Nordic countries, Japan and South Korea, and 14–30 days for most ASEAN countries. Rules are updated regularly, so always check the latest list before you fly.</p><h2>E-visa: how it works</h2><ol><li>Apply on the official government portal with a passport scan and a portrait photo.</li><li>Pay the government fee ($25 single entry, $50 multiple entry).</li><li>Processing normally takes about 3 working days – allow a week in peak season.</li><li>Print the approval and show it at immigration.</li></ol><h2>Skip the queues with fast-track</h2><p>Arrival halls at Noi Bai and Tan Son Nhat can be busy. Our <strong>airport fast-track</strong> staff meet you after landing, escort you through the priority lane and bring you to your driver – usually within 10–20 minutes.</p>`,
      zh: `<p>入境越南比以往更方便。自2023年8月起，<strong>所有国家</strong>公民均可在线申请最长<strong>90天</strong>的电子签证，可选单次或多次入境。</p><h2>免签政策</h2><p>许多国家公民可短期免签入境，例如英国、德国、法国、意大利、西班牙、北欧国家、日本、韩国最长45天，大多数东盟国家14–30天。政策会定期更新，出发前请确认最新名单。中国大陆护照需办理签证（电子签）。</p><h2>电子签办理流程</h2><ol><li>在政府官方网站提交护照扫描件与证件照。</li><li>缴纳政府费用（单次25美元，多次50美元）。</li><li>通常约3个工作日出签，旺季请预留一周。</li><li>打印批准函，入境时出示。</li></ol><h2>快速通关免排队</h2><p>内排与新山一机场入境大厅常常拥挤。我们的<strong>快速通关</strong>工作人员会在落地后迎接您，带您走优先通道并送到司机处——通常10–20分钟完成。</p>`,
    },
  },
  {
    slug: "vietnam-currency-money-tips",
    category: "need-to-know",
    image: "/images/tours/hd/cho-lon-binh-tay-market.jpg",
    title: {
      en: "Money in Vietnam: Currency, ATMs & Card Payments",
      zh: "越南货币指南：越南盾、取款与刷卡",
    },
    excerpt: {
      en: "Everything about the Vietnamese dong, exchanging money, ATMs and paying by card or QR.",
      zh: "关于越南盾、换汇、取款机以及刷卡与扫码支付的一切。",
    },
    body: {
      en: `<p>Vietnam's currency is the <strong>Vietnamese dong (VND)</strong>. $1 is roughly 26,000 VND, so prices quickly run into hundreds of thousands – double-check the zeros on the 100,000 and 10,000 notes.</p><h2>Cash or card?</h2><ul><li>Hotels, restaurants and shops in cities accept Visa and Mastercard.</li><li>Street food, markets and small homestays are cash only.</li><li>Grab (taxi and food delivery) accepts international cards in the app.</li></ul><h2>ATMs & exchange</h2><p>ATMs are everywhere in cities; most limit withdrawals to 3–5 million VND per transaction. Gold shops and banks give good exchange rates for clean US dollar or euro notes.</p><h2>Paying for your Vietlook tour</h2><p>We never ask for card details online. After you confirm your itinerary we send <strong>bank transfer</strong> details, or you can pay in person at our Hanoi office.</p>`,
      zh: `<p>越南货币为<strong>越南盾（VND）</strong>，1美元约合26,000越南盾，价格动辄数十万——请注意10万与1万面额钞票的零。</p><h2>现金还是刷卡？</h2><ul><li>城市里的酒店、餐厅与商店可使用 Visa、万事达卡。</li><li>街头小吃、市场与小型民宿只收现金。</li><li>Grab（打车与外卖）App 可绑定国际信用卡。</li></ul><h2>取款与换汇</h2><p>城市取款机随处可见，单笔取款一般限额300–500万越南盾。金店与银行对整洁的美元、欧元现钞汇率较好。</p><h2>如何支付 Vietlook 行程</h2><p>我们绝不在线收集银行卡信息。确认行程后，我们会发送<strong>银行转账</strong>信息，您也可以到河内办公室线下付款。</p>`,
    },
  },
  {
    slug: "vietnam-sim-card-internet",
    category: "need-to-know",
    image: "/images/tours/v2/hanoi-19577375.jpg",
    title: { en: "SIM Cards, eSIM & Internet in Vietnam", zh: "越南电话卡、eSIM与上网指南" },
    excerpt: {
      en: "How to stay connected in Vietnam: tourist SIMs, eSIM, Wi-Fi and the apps you need.",
      zh: "如何在越南保持联网：旅游卡、eSIM、Wi-Fi 与必备应用。",
    },
    body: {
      en: `<p>Mobile internet in Vietnam is fast and cheap, with 4G (and growing 5G) coverage even in many mountain areas.</p><h2>Which network?</h2><ul><li><strong>Viettel</strong> – best coverage in remote areas like Ha Giang and Sapa.</li><li><strong>Vinaphone</strong> and <strong>Mobifone</strong> – excellent in cities.</li></ul><h2>Where to buy</h2><p>Tourist SIMs with data are sold at airport arrival halls; you need your passport for registration. Many phones also support an <strong>eSIM</strong> you can install before departure.</p><h2>Useful apps</h2><ul><li>Grab – taxis, motorbike rides and food delivery</li><li>Google Maps and Google Translate (download Vietnamese offline)</li><li>WhatsApp, WeChat or Zalo – to reach your Vietlook team 24/7</li></ul>`,
      zh: `<p>越南移动网络快速且便宜，4G覆盖广泛（5G正在扩展），许多山区也有信号。</p><h2>选择哪家运营商？</h2><ul><li><strong>Viettel</strong>——河江、沙坝等偏远地区覆盖最好。</li><li><strong>Vinaphone</strong> 与 <strong>Mobifone</strong>——城市信号极佳。</li></ul><h2>在哪里购买</h2><p>机场到达大厅出售含流量的旅游卡，需出示护照实名登记。许多手机也支持出发前安装 <strong>eSIM</strong>。</p><h2>实用应用</h2><ul><li>Grab——打车、摩的与外卖</li><li>谷歌地图与谷歌翻译（可下载越南语离线包）</li><li>WhatsApp、微信或 Zalo——24小时联系 Vietlook 团队</li></ul>`,
    },
  },
  {
    slug: "is-vietnam-safe",
    category: "need-to-know",
    image: "/images/tours/v2/hanoi-3300834.jpg",
    title: { en: "Is Vietnam Safe? Honest Advice from Locals", zh: "越南安全吗？本地人的真诚建议" },
    excerpt: {
      en: "Vietnam is one of Asia's safest destinations. Here's what to watch out for – from traffic to taxis.",
      zh: "越南是亚洲最安全的目的地之一。以下是需要注意的事项——从交通到打车。",
    },
    body: {
      en: `<p>Yes – Vietnam is a very safe country for travellers, including families and solo women. Violent crime against visitors is rare. The main things to watch are traffic and small scams.</p><h2>Traffic</h2><p>Crossing the street: walk slowly and steadily, don't run – motorbikes will flow around you. We don't recommend renting a motorbike without a valid licence and experience; ride with an easy-rider driver instead.</p><h2>Petty theft & scams</h2><ul><li>Keep phones away from the roadside in busy cities.</li><li>Use Grab or hotel taxis and agree prices for cyclos in advance.</li><li>Check change carefully – some notes look similar.</li></ul><h2>Health</h2><p>Drink bottled or filtered water, use mosquito repellent and carry travel insurance. With Vietlook you always have a 24/7 local contact if anything happens.</p>`,
      zh: `<p>是的——越南对游客非常安全，包括家庭与独自出行的女性。针对游客的暴力犯罪极少，主要需要注意交通与小骗局。</p><h2>交通</h2><p>过马路时缓慢匀速前行，不要奔跑——摩托车会绕开您。没有驾照和经验不建议租摩托车，可以选择摩托车司机带骑。</p><h2>小偷与骗局</h2><ul><li>在繁忙街道不要把手机放在靠马路一侧。</li><li>使用 Grab 或酒店出租车，三轮车请提前谈好价格。</li><li>仔细核对找零——部分纸币颜色相近。</li></ul><h2>健康</h2><p>饮用瓶装水或过滤水，使用驱蚊液并购买旅行保险。选择 Vietlook，您随时都有24小时本地联系人。</p>`,
    },
  },
  {
    slug: "best-time-to-visit-vietnam",
    category: "need-to-know",
    image: "/images/tours/v2/hoi-an-92090.jpg",
    title: {
      en: "Best Time to Visit Vietnam: Region by Region",
      zh: "越南最佳旅游时间：分地区详解",
    },
    excerpt: {
      en: "Vietnam has three climates. Here's when to visit the North, Central coast and South.",
      zh: "越南有三种气候，北部、中部与南部的最佳时间各不相同。",
    },
    body: {
      en: `<p>There is no single "best" season for the whole country – somewhere in Vietnam is always great. Plan by region:</p><h2>North – October to April</h2><p>Dry and comfortable in autumn and spring. December–February is cold in the mountains. Summer (May–September) is hot with heavy showers but green and beautiful.</p><h2>Central – February to August</h2><p>Long sunny beach season. September–December brings heavy rain and the risk of typhoons and floods.</p><h2>South – December to April</h2><p>Dry season with clear skies. May–November is the green season, usually with short afternoon showers.</p><h2>Our tip</h2><p>For a North-to-South trip, <strong>March–April</strong> and <strong>late September–November</strong> offer the best balance. See our <a href="/en/travel-guide/category/vietnam-by-month">Vietnam by month</a> guides for details.</p>`,
      zh: `<p>越南没有一个适合全国的“最佳季节”——但任何时候总有地方正当时。请按地区规划：</p><h2>北部——10月至次年4月</h2><p>秋春两季干燥舒适，12–2月山区寒冷。夏季（5–9月）炎热多雨，但满眼翠绿。</p><h2>中部——2月至8月</h2><p>漫长的晴朗海滩季。9–12月雨量大，可能有台风与洪水。</p><h2>南部——12月至次年4月</h2><p>旱季晴空万里。5–11月为绿季，通常是午后短阵雨。</p><h2>我们的建议</h2><p>纵贯南北的行程，<strong>3–4月</strong>与<strong>9月下旬–11月</strong>最为平衡。详情请看<a href="/zh/travel-guide/category/vietnam-by-month">越南月份指南</a>。</p>`,
    },
  },
  {
    slug: "tipping-etiquette-vietnam",
    category: "food-culture",
    image: "/images/tours/v2/food-98874.jpg",
    title: { en: "Tipping & Local Etiquette in Vietnam", zh: "越南小费与当地礼仪" },
    excerpt: {
      en: "How much to tip guides and drivers, and simple do's and don'ts that locals appreciate.",
      zh: "导游与司机小费参考，以及当地人欣赏的礼仪小贴士。",
    },
    body: {
      en: `<p>Tipping is not compulsory in Vietnam, but it is appreciated – especially in tourism.</p><h2>Guide to tipping</h2><ul><li>Private guide: $5–10 per traveller per day</li><li>Driver: $3–5 per traveller per day</li><li>Cruise staff: a tip box is usually provided</li><li>Restaurants: rounding up or 5–10% in tourist areas</li></ul><h2>Do's and don'ts</h2><ul><li>Dress modestly at temples and the Ho Chi Minh Mausoleum – cover shoulders and knees.</li><li>Take off shoes when entering homes and some pagodas.</li><li>Ask before photographing people, especially in ethnic minority villages.</li><li>Hand things over with both hands as a sign of respect.</li></ul>`,
      zh: `<p>在越南小费并非强制，但在旅游行业很受欢迎。</p><h2>小费参考</h2><ul><li>私人导游：每人每天5–10美元</li><li>司机：每人每天3–5美元</li><li>游轮员工：通常设有小费箱</li><li>餐厅：旅游区可凑整或给5–10%</li></ul><h2>礼仪须知</h2><ul><li>参观寺庙与胡志明陵时请着装得体，遮盖肩膀与膝盖。</li><li>进入民居与部分寺庙请脱鞋。</li><li>拍摄人物前请先征得同意，尤其在少数民族村寨。</li><li>双手递送物品以示尊重。</li></ul>`,
    },
  },
  {
    slug: "domestic-flights-vietnam",
    category: "getting-around",
    image: "/images/tours/v2/hanoi-34405373.jpg",
    title: {
      en: "Domestic Flights in Vietnam: Airlines & Routes",
      zh: "越南国内航班：航空公司与航线",
    },
    excerpt: {
      en: "Flying is the fastest way to cover Vietnam's 1,600 km. Airlines, airports and booking tips.",
      zh: "飞机是纵贯越南1600公里最快的方式。航空公司、机场与订票建议。",
    },
    body: {
      en: `<p>With frequent, affordable flights, flying saves whole days on a North-to-South trip.</p><h2>Airlines</h2><ul><li><strong>Vietnam Airlines</strong> – national carrier, checked baggage included on most fares</li><li><strong>Vietjet Air</strong> – low-cost, many routes; add baggage when booking</li><li><strong>Bamboo Airways</strong> and <strong>Vietravel Airlines</strong> – selected routes</li></ul><h2>Key routes</h2><ul><li>Hanoi – Ho Chi Minh City: about 2 hours 10 minutes</li><li>Hanoi – Da Nang: about 1 hour 20 minutes</li><li>Ho Chi Minh City – Phu Quoc: about 1 hour</li></ul><h2>Tip</h2><p>We can book domestic flights as part of your package and arrange private airport transfers at each stop.</p>`,
      zh: `<p>国内航班频繁且实惠，纵贯南北可节省大量时间。</p><h2>航空公司</h2><ul><li><strong>越南航空</strong>——国家航空，多数票价含托运行李</li><li><strong>越捷航空</strong>——低成本，航线多，订票时需加购行李</li><li><strong>竹子航空</strong>与<strong>越旅航空</strong>——部分航线</li></ul><h2>热门航线</h2><ul><li>河内–胡志明市：约2小时10分</li><li>河内–岘港：约1小时20分</li><li>胡志明市–富国岛：约1小时</li></ul><h2>建议</h2><p>我们可将国内航班纳入套餐，并在每一站安排私人机场接送。</p>`,
    },
  },
  {
    slug: "train-travel-vietnam",
    category: "getting-around",
    image: "/images/tours/v2/hanoi-19577375.jpg",
    title: {
      en: "Train Travel in Vietnam: The Reunification Express",
      zh: "越南火车旅行：统一铁路",
    },
    excerpt: {
      en: "Scenic, slow and memorable – what to expect on Vietnam's railways and the night train to Sapa.",
      zh: "风景优美、节奏缓慢——越南铁路与沙坝夜车体验。",
    },
    body: {
      en: `<p>The North–South railway runs about 1,700 km between Hanoi and Saigon. The full journey takes 33–36 hours, so most travellers ride just one scenic section.</p><h2>Best sections</h2><ul><li><strong>Hue – Da Nang</strong> over the Hai Van Pass: about 2.5–3 hours of coastal views</li><li><strong>Hanoi – Lao Cai</strong> (for Sapa): overnight sleeper, about 8 hours</li><li><strong>Hanoi – Da Nang</strong>: overnight, about 15–16 hours</li></ul><h2>Classes</h2><p>Choose a soft-sleeper 4-berth cabin for overnight trips. Private carriages operated by partner companies offer extra comfort.</p><p>Prefer to save time? A private car with driver from Hanoi to Sapa now takes about 5 hours on the expressway.</p>`,
      zh: `<p>南北铁路连接河内与西贡，全长约1700公里，全程需33–36小时，大多数游客只乘坐风景最好的一段。</p><h2>精华路段</h2><ul><li><strong>顺化–岘港</strong>翻越海云关：约2.5–3小时海岸风光</li><li><strong>河内–老街</strong>（前往沙坝）：夜间卧铺约8小时</li><li><strong>河内–岘港</strong>：夜车约15–16小时</li></ul><h2>车厢等级</h2><p>夜车建议选择4人软卧包厢，合作公司的私营车厢更舒适。</p><p>想节省时间？从河内到沙坝的私人包车走高速仅需约5小时。</p>`,
    },
  },
  {
    slug: "hanoi-to-halong-bay",
    category: "getting-around",
    destination: "halong-bay",
    image: "/images/tours/hd/emperor-cruises.jpg",
    title: { en: "How to Get from Hanoi to Halong Bay", zh: "如何从河内前往下龙湾" },
    excerpt: {
      en: "Private car, limousine bus or seaplane – the options and travel times from Hanoi to Halong.",
      zh: "包车、豪华巴士还是水上飞机——河内到下龙的交通方式与时间。",
    },
    body: {
      en: `<p>Halong Bay is about 170 km from Hanoi. Thanks to the expressway, the drive takes around <strong>2.5 hours</strong>.</p><h2>Options</h2><ul><li><strong>Private car with driver</strong> – door to door, flexible stops at pottery villages or pearl farms. From $56 per car one way with Vietlook.</li><li><strong>Cruise shuttle / limousine bus</strong> – most cruises include a shared transfer from the Old Quarter.</li><li><strong>Seaplane</strong> – scenic but weather-dependent and pricey.</li></ul><h2>Lan Ha and Bai Tu Long</h2><p>Many cruises now depart from Lan Ha Bay (via Hai Phong) or quieter Bai Tu Long Bay – we'll pick the right pier and transfer for your cruise.</p>`,
      zh: `<p>下龙湾距河内约170公里，走高速约<strong>2.5小时</strong>。</p><h2>交通方式</h2><ul><li><strong>私人包车</strong>——门到门，可顺路参观陶瓷村或珍珠养殖场。Vietlook 单程每车56美元起。</li><li><strong>游轮接驳/豪华巴士</strong>——多数游轮含老城区拼车接送。</li><li><strong>水上飞机</strong>——风景壮观但受天气影响，价格较高。</li></ul><h2>兰夏湾与拜子龙湾</h2><p>许多游轮如今从兰夏湾（经海防）或更安静的拜子龙湾出发——我们会为您的游轮安排合适的码头与接送。</p>`,
    },
  },
  {
    slug: "hanoi-to-sapa",
    category: "getting-around",
    destination: "sapa",
    image: "/images/tours/v2/sapa-6711527.jpg",
    title: { en: "How to Get from Hanoi to Sapa", zh: "如何从河内前往沙坝" },
    excerpt: {
      en: "Expressway car, limousine bus or night train – getting to Sapa's rice terraces.",
      zh: "高速包车、豪华巴士或夜车——前往沙坝梯田的方式。",
    },
    body: {
      en: `<p>Sapa lies about 320 km north-west of Hanoi in Lao Cai province.</p><h2>Options</h2><ul><li><strong>Private car</strong> – about 5–5.5 hours via the Noi Bai – Lao Cai expressway, with stops wherever you like.</li><li><strong>Limousine sleeper bus</strong> – about 6 hours, comfortable reclining seats.</li><li><strong>Night train to Lao Cai</strong> – about 8 hours, then 1 hour by road to Sapa town.</li></ul><h2>Our tip</h2><p>Combine Sapa with Ha Giang or Ninh Binh using one private driver – it saves time and avoids backtracking to Hanoi.</p>`,
      zh: `<p>沙坝位于老街省，距河内西北约320公里。</p><h2>交通方式</h2><ul><li><strong>私人包车</strong>——走内排–老街高速约5–5.5小时，可随时停车。</li><li><strong>豪华卧铺巴士</strong>——约6小时，座椅舒适可躺。</li><li><strong>夜车至老街</strong>——约8小时，再乘车1小时到沙坝镇。</li></ul><h2>建议</h2><p>用同一位私人司机串联沙坝与河江或宁平——节省时间，无需折返河内。</p>`,
    },
  },
  {
    slug: "hanoi-to-ninh-binh",
    category: "getting-around",
    destination: "ninh-binh",
    image: "/images/tours/v2/ninh-binh-c47.jpg",
    title: { en: "How to Get from Hanoi to Ninh Binh", zh: "如何从河内前往宁平" },
    excerpt: {
      en: "Ninh Binh is an easy day trip or overnight from Hanoi – here's how to get there.",
      zh: "宁平是从河内出发的理想一日游或两日游——交通方式一览。",
    },
    body: {
      en: `<p>Ninh Binh is about 95 km south of Hanoi – roughly <strong>1.5–2 hours</strong> by road.</p><h2>Options</h2><ul><li><strong>Private car</strong> – from $68 per car one way, flexible for Trang An, Tam Coc, Bai Dinh and Mua Cave in one day.</li><li><strong>Day tour</strong> – our shared or private Ninh Binh day tours include transport, guide, boat and lunch.</li><li><strong>Train</strong> – about 2–2.5 hours to Ninh Binh station.</li></ul><h2>Stay overnight</h2><p>Sunrise over the rice fields and quiet evening boat rides are worth an extra night in a riverside homestay.</p>`,
      zh: `<p>宁平位于河内以南约95公里，车程约<strong>1.5–2小时</strong>。</p><h2>交通方式</h2><ul><li><strong>私人包车</strong>——单程每车68美元起，一天内可灵活游览长安、三谷、拜订寺与舞洞。</li><li><strong>一日游</strong>——我们的拼团或私人宁平一日游含交通、导游、乘船与午餐。</li><li><strong>火车</strong>——约2–2.5小时到宁平站。</li></ul><h2>住一晚</h2><p>稻田日出与傍晚宁静的游船，值得在河畔民宿多住一晚。</p>`,
    },
  },
];

export const authoredPosts = [
  ...essentials.map((p, i) => ({
    ...p,
    date: `2026-09-${String(28 - i * 2).padStart(2, "0")}`,
    author: "vietlook-team",
  })),
  ...monthPosts.map((p) => ({ ...p, date: "2026-08-15" })),
];
