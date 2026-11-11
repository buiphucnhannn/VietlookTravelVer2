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

const MAP_QUERY = "58 Ngõ 159 Quyết Thắng, Yên Nghĩa, Hà Nội, Việt Nam";

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
    email: "infovietlooktravel@gmail.com",
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
  },
  social: {
    facebook: "https://www.facebook.com/vietlooktravelhanoi",
    tripadvisor:
      "https://www.tripadvisor.com/Attraction_Review-g17733187-d27950353-Reviews-Vietlook_Travel-Ha_Dong_Hanoi.html",
    google: "https://maps.app.goo.gl/ar5pqAHXgeW42U7W9",
    youtube: "https://www.youtube.com/@VietlookTravel",
  },
  // Video giới thiệu chính chủ (kênh @VietlookTravel)
  youtubeIds: ["-Si4zYv7gKs"],
  // Số liệu thật (đối chiếu 29/10/2026): TripAdvisor qua widget Trustindex trên web cũ, Google qua Google Maps
  tripadvisorRating: { label: "Excellent", score: 5, reviews: 35 },
  // Số đánh giá Google Maps (cập nhật tay theo trang doanh nghiệp)
  googleRating: 4.7,
  googleReviews: 31,
  messaging: {
    whatsapp: "https://wa.me/84983393588",
    zalo: "https://zalo.me/84983393588",
    wechatId: "+84983393588",
  },
  // Bản đồ ghim ĐÚNG địa chỉ văn phòng ghi trên web (58 ngõ 159 Quyết Thắng, Yên Nghĩa).
  // Trước đây nhúng theo CID hồ sơ Google cũ (01 LK20 KĐT Văn Khê) → lệch với địa chỉ chữ.
  // Khi khách cập nhật Google Business Profile sang địa chỉ mới có thể quay lại nhúng theo CID.
  maps: {
    link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_QUERY)}`,
    embed: `https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=17&hl=en&output=embed`,
  },
};
