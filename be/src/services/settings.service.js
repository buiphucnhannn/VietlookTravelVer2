import { env } from "../config/env.js";
import {
  destinationRepository,
  settingRepository,
  themeRepository,
  tourRepository,
} from "../repositories/content.repository.js";
import { afterSave as cleanupMedia } from "./media-cleanup.service.js";
import { uploadService } from "./upload.service.js";
import { ApiError } from "../utils/ApiError.js";
import { decryptSecret, encryptSecret, maskSecret } from "../utils/crypto.js";

const KEYS = {
  home: "home",
  notifications: "notifications",
  payment: "payment",
  tracking: "tracking",
};

const EMPTY_HOME = {
  banner: { slides: [] },
  featuredTours: [],
  longTours: [],
  homeThemes: [],
  featuredDestinations: [],
  copy: {},
  statValues: [],
  images: {},
  starLabels: [],
};

/**
 * Chỉ giữ slug còn tồn tại. Mục đã bị xoá (hoặc dữ liệu cũ trước khi có đồng bộ đổi đường dẫn) → tự bỏ,
 * không chặn lưu: nhân viên không thấy mục đó trong ô chọn nên không tự gỡ được.
 */
async function existingSlugs(repo, slugs) {
  if (!slugs.length) return slugs;
  const found = new Set((await repo.findByIdents(slugs, { select: "slug" })).map((d) => d.slug));
  return slugs.filter((s) => found.has(s));
}

/** Các danh sách chọn ở trang chủ theo loại nội dung (đồng bộ khi đổi đường dẫn / xoá) */
export const HOME_REFS = Object.freeze({
  tour: ["featuredTours", "longTours"],
  theme: ["homeThemes"],
  destination: ["featuredDestinations"],
});

/** Tỷ lệ đặt cọc (%) khi thanh toán online: 100 = trả đủ (mặc định) */
const depositOf = (v) => {
  const n = Number(v?.depositPercent);
  return Number.isInteger(n) && n >= 10 && n <= 100 ? n : 100;
};

export const settingsService = {
  /* ----- Trang chủ: banner + tour nổi bật / dài ngày + chủ đề hiện ở trang chủ ----- */
  async getHome() {
    return { ...EMPTY_HOME, ...((await settingRepository.get(KEYS.home)) ?? {}) };
  },

  async saveHome(input, actor) {
    const [featuredTours, longTours, homeThemes, featuredDestinations] = await Promise.all([
      existingSlugs(tourRepository, input.featuredTours),
      existingSlugs(tourRepository, input.longTours),
      existingSlugs(themeRepository, input.homeThemes),
      existingSlugs(destinationRepository, input.featuredDestinations),
    ]);
    const data = { ...input, featuredTours, longTours, homeThemes, featuredDestinations };
    const before = await settingRepository.get(KEYS.home);
    await settingRepository.set(KEYS.home, data, actor?.username);
    // Video nền đã chép từ Drive mà banner không còn dùng → xoá khỏi Cloudinary (chạy nền, chỉ thư mục banner)
    const slideVideos = (home) =>
      (home?.banner?.slides ?? []).flatMap((s) => [s.video, s.videoMobile]);
    uploadService.deleteBannerVideos(slideVideos(before), { keep: slideVideos(data) });
    cleanupMedia(before, data); // ảnh slide bị thay / bỏ → dọn nền nếu không còn chỗ nào dùng
    return this.getHome();
  },

  /**
   * Tour / chủ đề / điểm đến đổi đường dẫn (to = slug mới) hoặc bị xoá (to = null) → cập nhật các ô chọn
   * ở trang chủ, nếu không mục đó biến mất khỏi trang chủ.
   * @param {keyof typeof HOME_REFS} type
   */
  async renameHomeRef(type, from, to = null) {
    if (!from || from === to) return; // lưu mà không đổi đường dẫn → không cần đọc DB
    const home = await settingRepository.get(KEYS.home);
    if (!home) return;
    let changed = false;
    for (const field of HOME_REFS[type] ?? []) {
      if (!Array.isArray(home[field]) || !home[field].includes(from)) continue;
      home[field] = [...new Set(home[field].map((s) => (s === from ? to : s)).filter(Boolean))];
      changed = true;
    }
    if (changed) await settingRepository.set(KEYS.home, home, "system");
  },

  /* ----- Email nhận thông báo đơn / form ----- */
  async getNotifications() {
    const v = (await settingRepository.get(KEYS.notifications)) ?? {};
    return {
      recipients: v.recipients ?? [],
      replyTo: v.replyTo ?? "",
      sendCustomerConfirmation: v.sendCustomerConfirmation ?? true,
      mailConfigured: env.mail.enabled, // máy chủ đã có RESEND_API_KEY chưa
      fallback: env.mail.notifyFallback,
    };
  },

  /** Người nhận thực tế: cài trong CMS → nếu trống dùng NOTIFY_EMAIL của máy chủ */
  async recipients() {
    const { recipients, fallback } = await this.getNotifications();
    return recipients.length ? recipients : fallback ? [fallback] : [];
  },

  async saveNotifications(data, actor) {
    await settingRepository.set(KEYS.notifications, data, actor?.username);
    return this.getNotifications();
  },

  /* ----- Mã đo lường Google (GTM / GA4 / Google Ads) — website tự gắn theo mã nhập ở đây ----- */
  async getTracking() {
    const v = (await settingRepository.get(KEYS.tracking)) ?? {};
    return { gtmId: v.gtmId ?? "", ga4Id: v.ga4Id ?? "", adsId: v.adsId ?? "" };
  },

  async saveTracking(data, actor) {
    await settingRepository.set(KEYS.tracking, data, actor?.username);
    return this.getTracking();
  },

  /* ----- 9Pay: chỉ admin; secret mã hoá AES-256-GCM, không bao giờ trả nguyên văn ra ngoài ----- */
  async getPayment() {
    const v = (await settingRepository.get(KEYS.payment)) ?? {};
    return {
      provider: "9pay",
      enabled: Boolean(v.enabled),
      environment: "production",
      merchantKey: v.merchantKey ?? "",
      accountName: v.accountName ?? "",
      secretKeySet: Boolean(v.secretKey),
      secretKeyMasked: maskSecret(decryptSecret(v.secretKey)),
      checksumKeySet: Boolean(v.checksumKey),
      checksumKeyMasked: maskSecret(decryptSecret(v.checksumKey)),
      depositPercent: depositOf(v),
      // bật + đủ 3 mã → khách thấy bước thanh toán sau khi đặt tour
      ready: Boolean(v.enabled && v.merchantKey && v.secretKey && v.checksumKey),
      updatedAt: v.updatedAt ?? null,
    };
  },

  /**
   * Đổi tài khoản nhận tiền áp dụng ngay cho đơn mới (tài khoản cũ ngừng nhận vì key cũ bị ghi đè).
   * Ô secret để trống = giữ secret đã lưu.
   */
  async savePayment(data, actor) {
    const prev = (await settingRepository.get(KEYS.payment)) ?? {};
    const next = {
      provider: "9pay",
      enabled: data.enabled,
      environment: "production",
      merchantKey: data.merchantKey,
      accountName: data.accountName,
      secretKey: data.secretKey ? encryptSecret(data.secretKey) : (prev.secretKey ?? ""),
      checksumKey: data.checksumKey ? encryptSecret(data.checksumKey) : (prev.checksumKey ?? ""),
      depositPercent: data.depositPercent ?? depositOf(prev),
      updatedAt: new Date().toISOString(),
    };
    if (next.enabled && (!next.merchantKey || !next.secretKey || !next.checksumKey))
      throw ApiError.badRequest(
        "Cần đủ Merchant key, Secret key và Checksum key trước khi bật thanh toán",
      );
    await settingRepository.set(KEYS.payment, next, actor?.username);
    return this.getPayment();
  },

  /**
   * Dùng nội bộ (services/payment) — giải mã key, đọc lại MỖI lần dùng → đổi key trong CMS áp dụng ngay,
   * key cũ không còn được dùng để tạo link hay xác nhận kết quả.
   * enabled: admin đã bật. Kết quả 9Pay gửi về vẫn kiểm tra được khi đã tắt (giao dịch đang dở).
   */
  async paymentCredentials() {
    const v = (await settingRepository.get(KEYS.payment)) ?? {};
    return {
      enabled: Boolean(v.enabled),
      merchantKey: v.merchantKey ?? "",
      secretKey: decryptSecret(v.secretKey),
      checksumKey: decryptSecret(v.checksumKey),
      depositPercent: depositOf(v),
    };
  },
};
