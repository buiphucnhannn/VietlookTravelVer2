import Script from "next/script";

/**
 * Gắn mã đo lường Google theo mã nhập trong CMS (Cài đặt → Đo lường & quảng cáo):
 * - Có GTM-…  → nạp Google Tag Manager (GA4 / Ads cấu hình bên trong GTM).
 * - Không có GTM nhưng có G-… / AW-… → nạp gtag.js trực tiếp.
 * Mã đã được máy chủ kiểm tra đúng định dạng của Google; ở đây kiểm tra lại trước khi chèn vào script.
 * Sự kiện chuyển đổi: form gửi thành công đẩy `generate_lead` vào dataLayer (components/forms/fields.js)
 * và chuyển sang trang cảm ơn (/thank-you) để đo Google Ads.
 */
const RX = {
  gtmId: /^GTM-[A-Z0-9]{4,12}$/,
  ga4Id: /^G-[A-Z0-9]{6,14}$/,
  adsId: /^AW-[0-9]{6,14}$/,
};
const valid = (t, k) => (RX[k].test(t?.[k] ?? "") ? t[k] : "");

export default function Tracking({ tracking }) {
  const gtm = valid(tracking, "gtmId");
  const ga4 = valid(tracking, "ga4Id");
  const ads = valid(tracking, "adsId");

  if (gtm)
    return (
      <>
        <Script id="vl-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      </>
    );

  const ids = [ga4, ads].filter(Boolean);
  if (!ids.length) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ids[0]}`}
        strategy="afterInteractive"
      />
      <Script id="vl-gtag" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${ids.map((id) => `gtag('config','${id}');`).join("")}`}
      </Script>
    </>
  );
}
