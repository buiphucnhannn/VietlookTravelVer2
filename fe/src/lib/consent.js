/**
 * Lựa chọn cookie của khách (Google Consent Mode v2) — dùng chung cho banner, bộ nạp mã Google và sự kiện chuyển đổi.
 * Lưu ở localStorage "vl-consent" dạng JSON { analytics, ads, at }. Bản cũ "all" / "necessary" vẫn đọc được.
 * Chỉ chạy ở trình duyệt.
 */
export const CONSENT_KEY = "vl-consent";
export const CONSENT_EVENT = "vl:consent"; // phát ra khi khách vừa chọn
export const CONSENT_OPEN_EVENT = "vl:consent-open"; // mở lại bảng tuỳ chỉnh (link "Cài đặt cookie")

/** → { analytics, ads } | null (chưa chọn) */
export function readConsent() {
  let raw = null;
  try {
    raw = localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  if (raw === "all") return { analytics: true, ads: true };
  if (raw === "necessary") return { analytics: false, ads: false };
  try {
    const v = JSON.parse(raw);
    return { analytics: !!v.analytics, ads: !!v.ads };
  } catch {
    return null;
  }
}

/** Trạng thái Consent Mode v2 tương ứng */
export const consentState = (c) => ({
  analytics_storage: c?.analytics ? "granted" : "denied",
  ad_storage: c?.ads ? "granted" : "denied",
  ad_user_data: c?.ads ? "granted" : "denied",
  ad_personalization: c?.ads ? "granted" : "denied",
});

export function gtag() {
  window.dataLayer = window.dataLayer || [];
  // gtag yêu cầu đúng đối tượng `arguments` (không dùng ...rest)
  window.dataLayer.push(arguments);
}

export function saveConsent(c) {
  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ analytics: !!c.analytics, ads: !!c.ads, at: new Date().toISOString() }),
    );
  } catch {
    /* chế độ ẩn danh chặn lưu → chỉ áp dụng cho lần xem này */
  }
  gtag("consent", "update", consentState(c));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
}

export const hasTrackingConsent = (c = readConsent()) => !!(c && (c.analytics || c.ads));

/**
 * Gửi sự kiện đo lường (vd. generate_lead) CHỈ khi khách đã đồng ý; nếu khách đồng ý sau đó (vẫn ở trang này)
 * thì gửi lúc ấy. Không có mã Google nào được cài → không làm gì.
 */
export function trackWhenConsented(event, params = {}, onSent) {
  if (typeof window === "undefined" || !window.__vlTracking) return () => {};
  // GTM: sự kiện dataLayer (tạo trigger "Custom Event" trong GTM). gtag.js: gửi thẳng sự kiện GA4 / Ads.
  const send = () => {
    if (window.__vlTracking === "gtm") window.dataLayer.push({ event, ...params });
    else gtag("event", event, params);
    onSent?.();
  };
  if (hasTrackingConsent()) {
    send();
    return () => {};
  }
  const onConsent = (e) => {
    if (!hasTrackingConsent(e.detail)) return;
    window.removeEventListener(CONSENT_EVENT, onConsent);
    send();
  };
  window.addEventListener(CONSENT_EVENT, onConsent);
  return () => window.removeEventListener(CONSENT_EVENT, onConsent);
}
