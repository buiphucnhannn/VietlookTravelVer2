import ConsentBanner from "./ConsentBanner";

/**
 * Mã đo lường Google theo mã nhập trong CMS (Cài đặt → Đo lường & quảng cáo) + Google Consent Mode v2:
 * - Không cài mã nào → không chèn gì, không hiện banner cookie.
 * - Có mã: đặt sẵn Consent Mode = TỪ CHỐI (analytics / ads) ngay khi trang mở; mã Google (GTM-… hoặc
 *   G-… / AW-… qua gtag.js) CHỈ được nạp sau khi khách đồng ý trên banner (ConsentBanner) — hoặc ngay lập tức
 *   nếu khách đã đồng ý từ lần trước.
 * Mã đã được máy chủ kiểm tra đúng định dạng của Google; ở đây kiểm tra lại trước khi chèn vào script.
 * Sự kiện chuyển đổi: trang cảm ơn (/thank-you) đẩy `generate_lead` (kèm loại form) vào dataLayer khi khách đã
 * đồng ý (components/forms/LeadEvent.js) → cấu hình thẻ chuyển đổi Google Ads / sự kiện chính GA4 trong GTM.
 */
const RX = {
  gtmId: /^GTM-[A-Z0-9]{4,12}$/,
  ga4Id: /^G-[A-Z0-9]{6,14}$/,
  adsId: /^AW-[0-9]{6,14}$/,
};
const valid = (t, k) => (RX[k].test(t?.[k] ?? "") ? t[k] : "");

// Chạy đồng bộ trước mọi thẻ Google: mặc định từ chối, áp lại lựa chọn đã lưu (khách quay lại không bị hỏi lại)
const consentDefaults = (mode) =>
  `window.__vlTracking='${mode}';window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});gtag('set','ads_data_redaction',true);try{var r=localStorage.getItem('vl-consent'),c=r==='all'?{analytics:1,ads:1}:r&&r!=='necessary'?JSON.parse(r):null;if(c){var a=c.ads?'granted':'denied';gtag('consent','update',{analytics_storage:c.analytics?'granted':'denied',ad_storage:a,ad_user_data:a,ad_personalization:a});}}catch(e){}`;

export default function Tracking({ tracking, labels, privacyHref }) {
  const ids = {
    gtm: valid(tracking, "gtmId"),
    ga4: valid(tracking, "ga4Id"),
    ads: valid(tracking, "adsId"),
  };
  if (!ids.gtm && !ids.ga4 && !ids.ads) return null;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: consentDefaults(ids.gtm ? "gtm" : "gtag") }} />
      <ConsentBanner ids={ids} labels={labels} privacyHref={privacyHref} />
    </>
  );
}
