// Thông tin doanh nghiệp – lấy từ hồ sơ khách hàng & website hiện tại vietlooktravel.com
// Domain chính thức mặc định khi chưa đặt NEXT_PUBLIC_SITE_URL.
// KHÔNG tự lấy VERCEL_URL / VERCEL_PROJECT_PRODUCTION_URL: Vercel trả tên mặc định của dự án
// (VD vietlooktravelv2.vercel.app) hoặc link preview từng lần deploy → canonical/sitemap sai domain.
const PRIMARY_SITE_URL = "https://vietlooktravel.vercel.app";

function siteUrl() {
  const strip = (u) => u.trim().replace(/\/+$/, "");
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return strip(/^https?:\/\//.test(explicit) ? explicit : `https://${explicit}`);
  return process.env.NODE_ENV === "production" ? PRIMARY_SITE_URL : "http://localhost:3000";
}

/**
 * Cho Google lập chỉ mục? Tự quyết theo tên miền, không cần nhớ bật/tắt tay:
 * chỉ tên miền thật (VD vietlooktravel.com) mới được index; *.vercel.app, localhost, địa chỉ IP,
 * tên miền con preview/staging/test/demo/dev và bản Vercel Preview → noindex + robots.txt chặn hết.
 * Ép tay khi cần: NEXT_PUBLIC_ALLOW_INDEXING=true | false (bỏ trống = tự động). Chỉ dùng ở server.
 */
function allowIndexing(url) {
  const force = process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim().toLowerCase();
  if (force === "true") return true;
  if (force === "false") return false;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return !(
    /(^|\.)(localhost|vercel\.app|netlify\.app|pages\.dev|ngrok-free\.app|ngrok\.io|local)$/.test(
      host,
    ) ||
    /^[\d.]+$|:/.test(host) ||
    /^(preview|staging|stage|test|demo|dev)[.-]/.test(host)
  );
}

// Địa điểm Google Maps khách gửi (12/11/2026): "CÔNG TY TNHH DU LỊCH VÀ THƯƠNG MẠI VIETLOOK", ghim 20.974695,105.7653996.
// CID = mã hồ sơ doanh nghiệp đó trên Google (0xb2e39d46824e00e6) → bản đồ nhúng ghim đúng địa điểm, kèm tên & đánh giá.
const MAPS_CID = "12890319484623913190";
// Link theo mã hồ sơ (cid) → luôn mở đúng trang doanh nghiệp kèm tên, đánh giá, chỉ đường
// (link dạng /maps/place/<tên>/@toạ độ bị Google bỏ mất địa điểm, chỉ còn bản đồ trống)
const MAPS_PLACE_URL = `https://maps.google.com/?cid=${MAPS_CID}`;

export const siteConfig = {
  name: "Vietlook Travel",
  legalName: "Vietlook Travel and Trading Company Limited",
  legalNameVi: "Công ty TNHH Du lịch và Thương mại Vietlook",
  // Mã số doanh nghiệp (masothue.com) & giấy phép lữ hành quốc tế (Cục Du lịch Quốc gia VN, cấp lại 23/01/2026)
  legal: { businessNo: "0104189511", licenceNo: "01-176/2022/CDLQGVN-GP LHQT" },
  // Domain gốc cho canonical / hreflang / og / sitemap / robots / JSON-LD.
  // Nguồn DUY NHẤT: NEXT_PUBLIC_SITE_URL (domain chính thức) → mặc định PRIMARY_SITE_URL;
  // chỉ khi chạy dev ở máy mới dùng localhost.
  url: siteUrl(),
  allowIndexing: allowIndexing(siteUrl()),
  since: 2009,
  contact: {
    hotline: "+84 98 339 3588",
    hotlineRaw: "+84983393588",
    hotline2: "+84 98 339 3488",
    hotline2Raw: "+84983393488",
    // Kênh trên từng số (khách xác nhận 12/11/2026). LINE chưa có LINE ID → chỉ ghi chữ, không gắn link.
    channels: {
      hotline: {
        en: "Hotline 24/7 · Zalo · WhatsApp · WeChat · LINE",
        zh: "24小时热线 · Zalo · WhatsApp · 微信 · LINE",
        vi: "Hotline 24/7 · Zalo · WhatsApp · WeChat · LINE",
      },
      hotline2: "WhatsApp · LINE",
    },
    // Email liên hệ HIỂN THỊ cho khách. Hộp thư nhận thông báo đơn/form cài riêng trong CMS (Cài đặt → Thông báo).
    email: "info@vietlooktravel.com",
    address: {
      en: "01 Lien Ke 20, Van Khe Urban Area, Ha Dong, Hanoi 12113, Vietnam",
      zh: "越南河内市河东文溪新区LK20区01号（邮编12113）",
      vi: "01 Liền Kề 20, Khu đô thị Văn Khê, Hà Đông, Hà Nội 12113, Việt Nam",
    },
    hours: {
      en: "Mon – Sat: 9:00 – 18:00 (GMT+7) · Hotline 24/7",
      zh: "周一至周六 9:00 – 18:00（越南时间）· 热线24小时",
      vi: "Thứ Hai – Thứ Bảy: 9:00 – 18:00 (GMT+7) · Hotline 24/7",
    },
  },
  social: {
    facebook: "https://www.facebook.com/vietlooktravelhanoi",
    tripadvisor:
      "https://www.tripadvisor.com/Attraction_Review-g17733187-d27950353-Reviews-Vietlook_Travel-Ha_Dong_Hanoi.html",
    google: MAPS_PLACE_URL,
    // YouTube: kênh chưa ra mắt → KHÔNG hiện link ở bất kỳ đâu (khách xác nhận 12/11/2026)
  },
  // Video giới thiệu chính chủ (chỉ dùng để phát video, không phải link mạng xã hội)
  youtubeIds: ["-Si4zYv7gKs"],
  // Số liệu thật: TripAdvisor 89 đánh giá (khách xác nhận 12/11/2026), Google qua Google Maps
  // Đổi số ở đây → nhớ đổi cả common.ratingText & home.trust trong fe/src/i18n/dictionaries/{en,zh,vi}.js
  tripadvisorRating: { label: "Excellent", score: 5, reviews: 89 },
  // Số đánh giá Google Maps (cập nhật tay theo trang doanh nghiệp)
  googleRating: 4.7,
  googleReviews: 31,
  messaging: {
    whatsapp: "https://wa.me/84983393588",
    whatsapp2: "https://wa.me/84983393488",
    zalo: "https://zalo.me/84983393588",
    wechatId: "TA14102014",
  },
  // Bản đồ ghim đúng địa điểm Google Maps khách gửi (hồ sơ doanh nghiệp trên Google).
  // Địa chỉ chữ ở trên khớp đúng hồ sơ Google này (khách xác nhận 12/11/2026).
  maps: {
    link: MAPS_PLACE_URL,
    embed: `https://maps.google.com/maps?cid=${MAPS_CID}&z=17&hl=en&output=embed`,
  },
};
