import { env } from "../config/env.js";
import {
  destinationRepository,
  settingRepository,
  themeRepository,
  tourRepository,
} from "../repositories/content.repository.js";
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
};

async function assertSlugsExist(repo, slugs, label) {
  if (!slugs.length) return;
  const found = new Set((await repo.findByIdents(slugs, { select: "slug" })).map((d) => d.slug));
  const missing = slugs.filter((s) => !found.has(s));
  if (missing.length) throw ApiError.badRequest(`${label} không tồn tại: ${missing.join(", ")}`);
}

export const settingsService = {
  /* ----- Trang chủ: banner + tour nổi bật / dài ngày + chủ đề hiện ở trang chủ ----- */
  async getHome() {
    return { ...EMPTY_HOME, ...((await settingRepository.get(KEYS.home)) ?? {}) };
  },

  async saveHome(data, actor) {
    await assertSlugsExist(tourRepository, [...data.featuredTours, ...data.longTours], "Tour");
    await assertSlugsExist(themeRepository, data.homeThemes, "Chủ đề");
    await assertSlugsExist(destinationRepository, data.featuredDestinations, "Điểm đến");
    const before = await settingRepository.get(KEYS.home);
    await settingRepository.set(KEYS.home, data, actor?.username);
    // Video nền đã chép từ Drive mà banner không còn dùng → xoá khỏi Cloudinary (chạy nền, chỉ thư mục banner)
    const slideVideos = (home) =>
      (home?.banner?.slides ?? []).flatMap((s) => [s.video, s.videoMobile]);
    uploadService.deleteBannerVideos(slideVideos(before), { keep: slideVideos(data) });
    return this.getHome();
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
      environment: v.environment ?? "sandbox",
      merchantKey: v.merchantKey ?? "",
      accountName: v.accountName ?? "",
      secretKeySet: Boolean(v.secretKey),
      secretKeyMasked: maskSecret(decryptSecret(v.secretKey)),
      checksumKeySet: Boolean(v.checksumKey),
      checksumKeyMasked: maskSecret(decryptSecret(v.checksumKey)),
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
      environment: data.environment,
      merchantKey: data.merchantKey,
      accountName: data.accountName,
      secretKey: data.secretKey ? encryptSecret(data.secretKey) : (prev.secretKey ?? ""),
      checksumKey: data.checksumKey ? encryptSecret(data.checksumKey) : (prev.checksumKey ?? ""),
      updatedAt: new Date().toISOString(),
    };
    if (next.enabled && (!next.merchantKey || !next.secretKey || !next.checksumKey))
      throw ApiError.badRequest(
        "Cần đủ Merchant key, Secret key và Checksum key trước khi bật thanh toán",
      );
    await settingRepository.set(KEYS.payment, next, actor?.username);
    return this.getPayment();
  },

  /** Dùng nội bộ khi tích hợp cổng 9Pay (mục 3.3) — giải mã key */
  async paymentCredentials() {
    const v = (await settingRepository.get(KEYS.payment)) ?? {};
    if (!v.enabled) return null;
    return {
      environment: v.environment,
      merchantKey: v.merchantKey,
      secretKey: decryptSecret(v.secretKey),
      checksumKey: decryptSecret(v.checksumKey),
    };
  },
};
