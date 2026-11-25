/**
 * Thông tin liên hệ của công ty (CMS → Cài đặt → Thông tin liên hệ) — lưu ở settings, khoá "contact".
 *
 * Mặc định = đúng các giá trị đang viết cứng ở fe/src/constants/site.js (siteConfig) → chưa ai sửa thì
 * website & email hiện y như cũ. Bản sao phía website: fe/src/lib/contact.mjs (giữ đúng mặc định + cách chuẩn hoá
 * số điện thoại) — tests/contact-settings.test.js báo lỗi nếu 2 bên lệch nhau.
 *
 * Mỗi số điện thoại có các "kênh" (dùng số đó để làm gì): Gọi (Hotline 24/7) · Zalo · WhatsApp · WeChat · LINE.
 * Dòng chữ kênh dưới số (VD "Hotline 24/7 · Zalo · WhatsApp · WeChat · LINE") tự ghép từ các ô đã tích.
 */

export const CONTACT_KEY = "contact";

/** Các kênh của 1 số điện thoại — thứ tự = thứ tự hiện trong dòng chữ dưới số */
export const PHONE_PURPOSES = Object.freeze(["call", "zalo", "whatsapp", "wechat", "line"]);

/** Tên kênh theo ngôn ngữ website */
export const PURPOSE_LABEL = Object.freeze({
  call: { en: "Hotline 24/7", zh: "24小时热线", vi: "Hotline 24/7" },
  zalo: { en: "Zalo", zh: "Zalo", vi: "Zalo" },
  whatsapp: { en: "WhatsApp", zh: "WhatsApp", vi: "WhatsApp" },
  wechat: { en: "WeChat", zh: "微信", vi: "WeChat" },
  line: { en: "LINE", zh: "LINE", vi: "LINE" },
});

const MAPS_CID = "12890319484623913190";

export const CONTACT_DEFAULTS = Object.freeze({
  legalName: "Vietlook Travel and Trading Company Limited",
  legalNameVi: "Công ty TNHH Du lịch và Thương mại Vietlook",
  businessNo: "0104189511",
  licenceNo: "01-176/2022/CDLQGVN-GP LHQT",
  address: {
    en: "01 Lien Ke 20, Van Khe Urban Area, Ha Dong, Hanoi 12113, Vietnam",
    zh: "越南河内市河东文溪新区LK20区01号（邮编12113）",
    vi: "01 Liền Kề 20, Khu đô thị Văn Khê, Hà Đông, Hà Nội 12113, Việt Nam",
  },
  // Địa chỉ cho Google (dữ liệu có cấu trúc JSON-LD) — tiếng Anh
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
});

/**
 * Chuẩn hoá số điện thoại: bỏ dấu cách / chấm / gạch; "0…" (số Việt Nam) → "+84…"; "00…" → "+…".
 * Số Việt Nam 9 chữ số sau +84 → "+84 98 339 3588"; số nước khác → "+<chữ số>". Sai → null.
 */
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

/** Dòng chữ kênh dưới 1 số: { en, zh, vi } — VD "Hotline 24/7 · Zalo · WhatsApp · WeChat · LINE" */
export const phoneChannels = (p) =>
  Object.fromEntries(
    ["en", "zh", "vi"].map((l) => [
      l,
      PHONE_PURPOSES.filter((k) => p?.[k])
        .map((k) => PURPOSE_LABEL[k][l])
        .join(" · "),
    ]),
  );

/** Bản đã lưu (có thể thiếu ô / dữ liệu cũ) → đủ mọi ô, ô thiếu lấy mặc định */
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

/**
 * Thông tin công ty dùng trong email (cùng dạng COMPANY cũ ở emails/labels.js).
 * Số gọi = số đầu tiên tích "Gọi"; WhatsApp / Zalo = số đầu tiên tích kênh đó.
 */
export function emailCompany(saved) {
  const c = mergeContact(saved);
  const main = c.phones.find((p) => p.call) ?? c.phones[0];
  const wa = c.phones.find((p) => p.whatsapp) ?? main;
  const zalo = c.phones.find((p) => p.zalo) ?? main;
  return {
    name: "Vietlook Travel",
    legalName: { en: c.legalName, zh: c.legalName, vi: c.legalNameVi || c.legalName },
    licence: c.licenceNo,
    hotline: main.number,
    hotlineRaw: `+${phoneDigits(main.number)}`,
    email: c.email,
    whatsapp: `https://wa.me/${phoneDigits(wa.number)}`,
    zalo: `https://zalo.me/${phoneDigits(zalo.number)}`,
    wechatId: c.wechatId,
    address: { ...c.address },
    hours: { ...c.hours },
    social: [
      ["Facebook", c.facebook],
      ["Tripadvisor", c.tripadvisor],
      ["Google Maps", c.mapsLink],
    ],
  };
}
