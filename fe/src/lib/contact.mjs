/**
 * Thông tin liên hệ công ty (CMS → Cài đặt → Thông tin liên hệ) — dùng ở thanh trên cùng, đầu trang, chân trang,
 * trang Liên hệ, nút chat nổi, ô liên hệ trang tour / thuê xe, JSON-LD…
 *
 * Mặc định = đúng giá trị đang có ở constants/site.js (siteConfig) → backend lỗi / chưa ai sửa thì website hiện
 * y như cũ. Bản sao ở backend: be/src/constants/contact.js (mặc định + chuẩn hoá số điện thoại giữ y hệt) —
 * be/tests/contact-settings.test.js báo lỗi nếu 2 bên lệch nhau.
 *
 * Server: `const info = await getContactInfo()` (lib/catalog.js, cache thẻ "settings") → { contact, messaging,
 * social, maps, legal, legalName, … } — cùng dạng các phần tương ứng của siteConfig.
 * File này KHÔNG import gì (dữ liệu thuần) để backend test đọc được trực tiếp.
 */

/** Các kênh của 1 số điện thoại — thứ tự = thứ tự hiện trong dòng chữ dưới số */
export const PHONE_PURPOSES = ["call", "zalo", "whatsapp", "wechat", "line"];

/** Tên kênh theo ngôn ngữ website */
export const PURPOSE_LABEL = {
  call: { en: "Hotline 24/7", zh: "24小时热线", vi: "Hotline 24/7" },
  zalo: { en: "Zalo", zh: "Zalo", vi: "Zalo" },
  whatsapp: { en: "WhatsApp", zh: "WhatsApp", vi: "WhatsApp" },
  wechat: { en: "WeChat", zh: "微信", vi: "WeChat" },
  line: { en: "LINE", zh: "LINE", vi: "LINE" },
};

const MAPS_CID = "12890319484623913190";

export const CONTACT_DEFAULTS = {
  legalName: "Vietlook Travel and Trading Company Limited",
  legalNameVi: "Công ty TNHH Du lịch và Thương mại Vietlook",
  businessNo: "0104189511",
  licenceNo: "01-176/2022/CDLQGVN-GP LHQT",
  address: {
    en: "01 Lien Ke 20, Van Khe Urban Area, Ha Dong, Hanoi 12113, Vietnam",
    zh: "越南河内市河东文溪新区LK20区01号（邮编12113）",
    vi: "01 Liền Kề 20, Khu đô thị Văn Khê, Hà Đông, Hà Nội 12113, Việt Nam",
  },
  streetAddress: "01 Lien Ke 20, Van Khe Urban Area, Ha Dong",
  city: "Hanoi",
  postalCode: "12113",
  hours: {
    en: "Mon – Sat: 9:00 – 18:00 (GMT+7) · Hotline 24/7",
    zh: "周一至周六 9:00 – 18:00（越南时间）· 热线24小时",
    vi: "Thứ Hai – Thứ Bảy: 9:00 – 18:00 (GMT+7) · Hotline 24/7",
  },
  phones: [
    { number: "+84 98 339 3588", call: true, zalo: true, whatsapp: true, wechat: true, line: true },
    {
      number: "+84 98 339 3488",
      call: false,
      zalo: false,
      whatsapp: true,
      wechat: false,
      line: true,
    },
  ],
  email: "info@vietlooktravel.com",
  wechatId: "TA14102014",
  lineId: "",
  facebook: "https://www.facebook.com/vietlooktravelhanoi",
  tripadvisor:
    "https://www.tripadvisor.com/Attraction_Review-g17733187-d27950353-Reviews-Vietlook_Travel-Ha_Dong_Hanoi.html",
  mapsLink: `https://maps.google.com/?cid=${MAPS_CID}`,
  mapsEmbed: `https://maps.google.com/maps?cid=${MAPS_CID}&z=17&hl=en&output=embed`,
};

/** Giống be/src/constants/contact.js: "0983 393 588" → "+84 98 339 3588"; sai → null */
export function normalizePhone(input) {
  let s = String(input ?? "")
    .trim()
    .replace(/[\s.\-()/]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (/^0\d{8,10}$/.test(s)) s = `+84${s.slice(1)}`;
  if (!/^\+\d{8,15}$/.test(s)) return null;
  const d = s.slice(1);
  if (d.startsWith("84") && d.length === 11)
    return `+84 ${d.slice(2, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return `+${d}`;
}

export const phoneDigits = (n) => String(n ?? "").replace(/\D/g, "");

/** Dòng chữ kênh dưới 1 số: { en, zh, vi } */
export const phoneChannels = (p) =>
  Object.fromEntries(
    ["en", "zh", "vi"].map((l) => [
      l,
      PHONE_PURPOSES.filter((k) => p?.[k])
        .map((k) => PURPOSE_LABEL[k][l])
        .join(" · "),
    ]),
  );

/** Bản đã lưu (có thể thiếu ô) → đủ mọi ô, ô thiếu lấy mặc định */
export function mergeContact(saved) {
  const v = saved && typeof saved === "object" ? saved : {};
  const out = { ...CONTACT_DEFAULTS };
  for (const k of Object.keys(CONTACT_DEFAULTS)) {
    const d = CONTACT_DEFAULTS[k];
    if (k === "phones") {
      out.phones = Array.isArray(v.phones) && v.phones.length ? v.phones : d;
    } else if (d && typeof d === "object") {
      out[k] = { ...d };
      for (const l of ["en", "zh", "vi"])
        if (typeof v[k]?.[l] === "string" && v[k][l].trim()) out[k][l] = v[k][l];
    } else if (typeof v[k] === "string" && (v[k].trim() || k === "lineId")) {
      out[k] = v[k];
    }
  }
  out.phones = out.phones.map((p) => ({
    number: p.number,
    ...Object.fromEntries(PHONE_PURPOSES.map((k) => [k, Boolean(p[k])])),
  }));
  return out;
}

/** "/vietlooktravelhanoi" từ link Facebook (chữ nhỏ dưới nút Facebook) */
const fbHandle = (url) => {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    return path && path !== "/" ? path : "Facebook";
  } catch {
    return "Facebook";
  }
};

/**
 * Bản đã lưu → thông tin dùng trên website, cùng dạng siteConfig:
 *   contact  : { hotline, hotlineRaw, hotline2, hotline2Raw, channels: { hotline, hotline2 }, email, address,
 *                hours, phones: [{ number, raw, channels, call, zalo, whatsapp, wechat, line }] }
 *   messaging: { whatsapp, whatsapp2, zalo, wechatId, lineId, linePhones }
 *   social   : { facebook, facebookHandle, tripadvisor, google } · maps: { link, embed }
 *   legalName, legalNameVi, legal: { businessNo, licenceNo }, postal: { streetAddress, city, postalCode }
 * Số "hotline" = số đầu tiên tích "Gọi" (luôn đứng đầu danh sách phones); WhatsApp / Zalo = số đầu tiên tích kênh đó.
 */
export function contactView(saved) {
  const c = mergeContact(saved);
  const all = c.phones.map((p) => ({
    ...p,
    raw: `+${phoneDigits(p.number)}`,
    channels: phoneChannels(p),
  }));
  const main = all.find((p) => p.call) ?? all[0];
  const phones = [main, ...all.filter((p) => p !== main)];
  const second = phones[1];
  const wa = phones.filter((p) => p.whatsapp);
  const zalo = phones.find((p) => p.zalo);
  return {
    legalName: c.legalName,
    legalNameVi: c.legalNameVi,
    legal: { businessNo: c.businessNo, licenceNo: c.licenceNo },
    postal: { streetAddress: c.streetAddress, city: c.city, postalCode: c.postalCode },
    contact: {
      hotline: main.number,
      hotlineRaw: main.raw,
      hotline2: second?.number ?? "",
      hotline2Raw: second?.raw ?? "",
      channels: { hotline: main.channels, hotline2: second?.channels ?? "" },
      email: c.email,
      address: c.address,
      hours: c.hours,
      phones,
    },
    messaging: {
      whatsapp: wa[0] ? `https://wa.me/${phoneDigits(wa[0].number)}` : "",
      whatsapp2: wa[1] ? `https://wa.me/${phoneDigits(wa[1].number)}` : "",
      zalo: zalo ? `https://zalo.me/${phoneDigits(zalo.number)}` : "",
      wechatId: c.wechatId,
      lineId: c.lineId,
      linePhones: phones.filter((p) => p.line).map((p) => p.number),
    },
    social: {
      facebook: c.facebook,
      facebookHandle: fbHandle(c.facebook),
      tripadvisor: c.tripadvisor,
      google: c.mapsLink,
    },
    maps: { link: c.mapsLink, embed: c.mapsEmbed },
  };
}

/** Thông tin mặc định (khi chưa tải được bản đã lưu) */
export const DEFAULT_CONTACT_VIEW = contactView(null);
