import { href, tr } from "@/i18n/config";
import { destinationsByRegion, regions } from "./destinations";
import { themes } from "./themes";

/**
 * Cây menu nhiều cấp (theo kiểu localvietnam.com). Trả về dữ liệu thuần để truyền xuống
 * Header (client component).
 */
export function buildNavigation(lang, dict) {
  const n = dict.nav;
  const h = (p) => href(lang, p);
  const z = (en, zh) => (lang === "zh" ? zh : en);
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
    links: destinationsByRegion(r.slug).map((d) => ({
      label: tr(d.name, lang),
      href: h(`/destinations/${d.slug}`),
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

  return [
    {
      key: "guide",
      label: n.guide,
      href: h("/travel-guide"),
      type: "tabs",
      tabs: [
        {
          label: n.guideDestinations,
          columns: regionColumns.map((c) => ({
            ...c,
            href: h(`/travel-guide/category/destinations`),
            footer: undefined,
          })),
        },
        {
          label: n.guideEssentials,
          columns: [
            {
              title: n.guideEssentials,
              links: [
                {
                  label: lang === "zh" ? "越南签证指南" : "Vietnam visa guide",
                  href: h("/travel-guide/vietnam-visa-guide"),
                },
                {
                  label: lang === "zh" ? "货币与付款" : "Currency & money",
                  href: h("/travel-guide/vietnam-currency-money-tips"),
                },
                {
                  label: lang === "zh" ? "电话卡与网络" : "SIM cards & internet",
                  href: h("/travel-guide/vietnam-sim-card-internet"),
                },
                {
                  label: lang === "zh" ? "越南安全吗？" : "Is Vietnam safe?",
                  href: h("/travel-guide/is-vietnam-safe"),
                },
                {
                  label: lang === "zh" ? "最佳旅游时间" : "Best time to visit",
                  href: h("/travel-guide/best-time-to-visit-vietnam"),
                },
                {
                  label: lang === "zh" ? "小费与礼仪" : "Tipping & etiquette",
                  href: h("/travel-guide/tipping-etiquette-vietnam"),
                },
              ],
            },
            {
              title: n.visa,
              links: [
                {
                  label: lang === "zh" ? "电子签证" : "Vietnam e-visa",
                  href: h("/visa-fast-track#visa"),
                },
                {
                  label: lang === "zh" ? "机场快速通关" : "Airport fast-track",
                  href: h("/visa-fast-track#fast-track"),
                },
                { label: n.allTours, href: h("/tours") },
              ],
            },
          ],
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
            },
          ],
        },
        {
          label: n.guideTransport,
          columns: [
            {
              title: n.guideTransport,
              links: [
                {
                  label: lang === "zh" ? "国内航班" : "Domestic flights",
                  href: h("/travel-guide/domestic-flights-vietnam"),
                },
                {
                  label: lang === "zh" ? "越南火车" : "Train travel in Vietnam",
                  href: h("/travel-guide/train-travel-vietnam"),
                },
                { label: n.carHire, href: h("/car-rental") },
                { label: n.airportTransfer, href: h("/car-rental#services") },
              ],
            },
            {
              title: lang === "zh" ? "热门路线" : "Popular routes",
              links: [
                {
                  label: lang === "zh" ? "河内 → 下龙湾" : "Hanoi → Halong Bay",
                  href: h("/travel-guide/hanoi-to-halong-bay"),
                },
                {
                  label: lang === "zh" ? "河内 → 沙坝" : "Hanoi → Sapa",
                  href: h("/travel-guide/hanoi-to-sapa"),
                },
                {
                  label: lang === "zh" ? "河内 → 宁平" : "Hanoi → Ninh Binh",
                  href: h("/travel-guide/hanoi-to-ninh-binh"),
                },
                { label: n.guideTransport, href: h("/travel-guide/category/getting-around") },
              ],
            },
          ],
        },
        {
          label: n.guideCulture,
          columns: [
            {
              title: n.guideCulture,
              links: [
                { label: n.guideCulture, href: h("/travel-guide/category/food-culture") },
                {
                  label: lang === "zh" ? "旅游资讯" : "Travel news",
                  href: h("/travel-guide/category/travel-news"),
                },
                { label: n.guideAll, href: h("/travel-guide") },
              ],
            },
          ],
        },
      ],
    },
    {
      key: "packages",
      label: n.packages,
      href: h("/packages"),
      type: "columns",
      columns: [
        {
          title: n.byDuration,
          links: [
            { label: n.allPackages, href: h("/packages") },
            { label: n.week1, href: h("/packages#1-week") },
            { label: n.week2, href: h("/packages#2-weeks") },
            { label: n.week3, href: h("/packages#3-weeks") },
            { label: n.tailorMade, href: h("/group-tailor-made-tours") },
          ],
        },
        {
          title: n.byTheme,
          links: themes
            .slice(0, 4)
            .map((t) => ({ label: tr(t.name, lang), href: h(`/themes/${t.slug}`) })),
        },
        {
          title: " ",
          links: themes
            .slice(4)
            .map((t) => ({ label: tr(t.name, lang), href: h(`/themes/${t.slug}`) })),
        },
      ],
      promo: {
        image: "/images/tours/v2/halong-bay-1018475.jpg",
        title: n.halong,
        href: h("/halong-bay-cruises"),
      },
    },
    {
      key: "tours",
      label: n.tours,
      href: h("/tours"),
      type: "columns",
      columns: [
        ...regionColumns,
        {
          title: n.specialTours,
          links: [
            { label: n.halong, href: h("/halong-bay-cruises") },
            { label: n.dayTours, href: h("/tours?duration=1") },
            ...themes
              .slice(2, 6)
              .map((t) => ({ label: tr(t.name, lang), href: h(`/themes/${t.slug}`) })),
          ],
          footer: { label: n.allTours, href: h("/tours") },
        },
      ],
    },
    {
      key: "services",
      label: n.services,
      href: h("/services"),
      type: "cards",
      cols: 3,
      // 5 dịch vụ chính theo tài liệu yêu cầu
      links: [
        {
          label: n.groupTours,
          href: h("/group-tailor-made-tours"),
          icon: "users",
          desc: z(
            "Private itineraries for families, friends & corporate groups",
            "为家庭、朋友与企业团体定制私人行程",
          ),
        },
        {
          label: z("Vietnam Package Tours", "越南套餐线路"),
          href: h("/packages"),
          icon: "map",
          desc: z(
            "1–3 week tours, tours by theme & Halong Bay cruises",
            "1至3周线路、主题线路与下龙湾游轮",
          ),
        },
        {
          label: n.carHire,
          href: h("/car-rental"),
          icon: "car",
          desc: z(
            "4–45 seat vehicles, airport transfers & intercity trips",
            "4–45座车辆，接送机与城际出行",
          ),
        },
        {
          label: n.visa,
          href: h("/visa-fast-track"),
          icon: "stamp",
          desc: z(
            "E-visa support & VIP lanes at every major airport",
            "电子签证协助与各大机场VIP通道",
          ),
        },
        {
          label: n.guide,
          href: h("/travel-guide"),
          icon: "book",
          desc: z(
            "Destination guides & practical tips from our local team",
            "本地团队撰写的目的地攻略与实用贴士",
          ),
        },
      ],
      help: {
        title: z("Not sure what you need?", "不确定需要哪项服务？"),
        text: z("Call or message us – we reply within hours", "致电或留言，我们数小时内回复"),
      },
      promo: {
        image: "/images/rent-car/cutouts/kia-carnival-open.webp",
        cutout: true,
        badge: z("Most booked", "最受欢迎"),
        title: n.carHire,
        text: z("Get a fixed price in about 30 minutes", "约30分钟内获得固定报价"),
        href: h("/car-rental#quote"),
      },
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
          desc: z("Hanoi-based tour operator since 2009", "2009年成立于河内的地接社"),
        },
        {
          label: n.whyUs,
          href: h("/about#why"),
          icon: "star",
          desc: z("Local experts, own fleet, 24/7 support", "本地专家、自有车队、全天候支持"),
        },
        {
          label: n.reviews,
          href: h("/about#reviews"),
          icon: "message",
          desc: z("What travellers say on Tripadvisor & Google", "旅客在猫途鹰与谷歌上的评价"),
        },
        {
          label: n.contact,
          href: h("/contact"),
          icon: "mail",
          desc: z("Office, hotline, WhatsApp, WeChat & Zalo", "办公室、热线、WhatsApp、微信与Zalo"),
        },
      ],
      aside: {
        title: z("Policies", "政策条款"),
        links: [
          { label: n.paymentPolicy, href: h("/policies/payment"), icon: "card" },
          { label: n.cancelPolicy, href: h("/policies/cancellation"), icon: "calendar" },
          { label: n.privacyPolicy, href: h("/policies/privacy"), icon: "shield" },
          { label: n.termsPolicy, href: h("/policies/terms"), icon: "file" },
        ],
      },
      promo: {
        image: "/images/tours/v2/vietnam-12674100.jpg",
        badge: z("Since 2009", "始于2009年"),
        title: z("Our story", "我们的故事"),
        text: z("The local team behind every Vietlook trip", "每一段 Vietlook 旅程背后的本地团队"),
        href: h("/about"),
      },
    },
  ];
}
