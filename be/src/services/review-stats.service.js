import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { REVIEW_DEFAULTS, REVIEW_STAT_SOURCES } from "../constants/company-reviews.js";
import { settingRepository } from "../repositories/content.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { nextRunAt } from "./media-cleanup.service.js";
import {
  notConfiguredText,
  quotaBlockedText,
  quotaView,
  reviewProvider,
} from "./review-providers/index.js";
import { num } from "./review-providers/normalize.js";

export {
  DEFAULT_TRIPADVISOR_LOCATION,
  GOOGLE_MAPS_CID,
  REVIEW_DEFAULTS,
} from "../constants/company-reviews.js";

/**
 * Điểm & số lượt đánh giá của CÔNG TY trên Tripadvisor và Google (đầu trang, trang chủ, chân trang, trang tour…).
 * Tự cập nhật HOÀN TOÀN qua nhà cung cấp chọn bằng REVIEW_STATS_PROVIDER (hiện là Apify, mã APIFY_TOKEN —
 * xem services/review-providers/). Không có ô nhập khoá / nhập số trong CMS.
 * Mỗi ngày ~06:00 giờ VN (REVIEW_SYNC_HOUR_VN) + 1 lần ngay sau khi máy chủ khởi động nếu lần cuối đã quá 24 giờ
 * → Apify ~0,02 USD / lần ≈ 0,6 USD / tháng (gói Free 5 USD). Trang công khai KHÔNG BAO GIỜ gọi nhà cung cấp.
 * Chưa cấu hình → không gọi gì, số giữ nguyên như lần lưu cuối (hoặc số mặc định).
 * Số nhận về bất thường (điểm ngoài 0–5, số lượt không nguyên / tụt quá MAX_DROP) → bỏ qua, giữ số cũ.
 * Không bao giờ làm sập server: mọi lỗi được bắt, ghi trạng thái lần cập nhật cuối, log không kèm khoá.
 */
const KEY = "reviewStats";
const TIMEOUT_MS = 10_000;
/** Số lượt được phép tụt so với số hiện tại (Tripadvisor / Google thỉnh thoảng ẩn bớt đánh giá) */
export const MAX_DROP = 5;
export const SOURCES = REVIEW_STAT_SOURCES;
/** "Cập nhật ngay": bấm lại sau ít nhất 5 phút */
export const MANUAL_COOLDOWN_MS = 5 * 60_000;
const NAMES = { tripadvisor: "Tripadvisor", google: "Google" };

const fmt = (s) => `${s.rating.toFixed(1)} · ${s.count} đánh giá`;
const safeUrl = (u) => (typeof u === "string" && /^https:\/\/[^\s<>"']+$/i.test(u) ? u : "");

/**
 * Báo website xoá cache "settings" ngay sau khi số đổi (POST {PUBLIC_SITE_URL}/api/revalidate, mã PROXY_SECRET)
 * → khách thấy số mới ngay, không chờ cache hết hạn. Lỗi → bỏ qua (cache tự hết hạn sau tối đa vài giờ).
 */
export async function notifyWebsite(fetchImpl = fetch) {
  if (!env.proxySecret && env.isProd) return false;
  try {
    const res = await fetchImpl(`${env.siteUrl}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-proxy-secret": env.proxySecret },
      body: JSON.stringify({ tags: ["settings"] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Gộp dữ liệu đã lưu với mặc định — luôn đủ trường, số hợp lệ. Chỉ giữ đúng các trường dùng tới
 * (trường cũ như khoá API / mã địa điểm / công tắc tự động bị bỏ ở lần ghi kế tiếp).
 * @returns {{ tripadvisor: object, google: object, lastSync: object | null }}
 */
function merge(stored) {
  const out = {};
  for (const src of SOURCES) {
    const d = REVIEW_DEFAULTS[src];
    const v = stored?.[src] ?? {};
    const rating = num(v.rating);
    const count = num(v.count);
    out[src] = {
      rating: Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : d.rating,
      count: Number.isInteger(count) && count >= 0 ? count : d.count,
      url: safeUrl(v.url) || d.url,
      updatedAt: v.updatedAt ?? d.updatedAt,
    };
  }
  out.lastSync = stored?.lastSync ?? null;
  return out;
}
export const mergeStored = merge;

/**
 * Số nhận về có dùng được không: điểm 0–5, số lượt nguyên ≥ 0 và không tụt quá MAX_DROP so với hiện tại.
 * @returns {string} "" = dùng được; còn lại = lý do bỏ qua (tiếng Việt)
 */
export function insane(prev, next) {
  if (!Number.isFinite(next?.rating) || next.rating < 0 || next.rating > 5)
    return `điểm nhận về không hợp lệ (${next?.rating})`;
  if (!Number.isInteger(next?.count) || next.count < 0)
    return `số lượt nhận về không hợp lệ (${next?.count})`;
  if (prev && next.count < prev.count - MAX_DROP)
    return `số lượt giảm bất thường (${prev.count} → ${next.count})`;
  return "";
}

/**
 * Lần cập nhật đang chạy (actor Apify mất 20–90 giây): chỉ 1 lần một lúc — lịch hằng ngày, chạy bù và nút
 * "Cập nhật ngay" dùng chung. CMS hỏi lại định kỳ (GET) để biết đã xong chưa.
 * @type {{ since: string, manual: boolean, promise: Promise<{ changed: boolean, lastSync: object }> } | null}
 */
let running = null;

/** Lần "Cập nhật ngay" kế tiếp được phép (ISO) — null = bấm được ngay */
function cooldownUntil(lastSync, now) {
  if (!lastSync?.manual || !lastSync.at) return null;
  const until = new Date(lastSync.at).getTime() + MANUAL_COOLDOWN_MS;
  return until > now ? new Date(until).toISOString() : null;
}

/** Số lượt còn lại (nhà cung cấp có API lượt dùng) — null nếu chưa cấu hình / không có API */
async function quotaOf(provider, cost, fetchImpl) {
  if (!provider.configured() || !provider.quota) return null;
  return quotaView(provider, await provider.quota({ fetchImpl }), cost);
}

/**
 * Dữ liệu cho CMS (quyền xem Đánh giá): số đang dùng, lần cập nhật cuối, lần tự cập nhật tiếp theo,
 * nhà cung cấp + đã cấu hình chưa, số lượt còn lại (null = không có API lượt dùng) — KHÔNG BAO GIỜ có khoá.
 */
async function view(v, { fetchImpl = fetch, now = Date.now() } = {}) {
  const provider = reviewProvider();
  const configured = provider.configured();
  return {
    tripadvisor: v.tripadvisor,
    google: v.google,
    lastSync: v.lastSync,
    // chi phí ước tính (cùng đơn vị với quota): 1 lần cập nhật điểm · 1 lần "Lấy đánh giá" cả 2 nền tảng
    provider: {
      name: provider.name,
      envKey: provider.envKey,
      unit: provider.costUnit ?? "usd",
      syncCost: provider.syncCost,
      reviewCost: provider.reviewCost ? provider.reviewCost(SOURCES) : null,
    },
    configured,
    nextAutoAt: configured ? nextRunAt(now, env.reviews.syncHourVn).toISOString() : null,
    cooldownUntil: cooldownUntil(v.lastSync, now),
    running: running ? { since: running.since, manual: running.manual } : null,
    quota: await quotaOf(provider, provider.syncCost, fetchImpl),
  };
}

export const reviewStatsService = {
  async get({ fetchImpl = fetch } = {}) {
    return view(merge(await settingRepository.get(KEY)), { fetchImpl });
  },

  /**
   * Nút "Cập nhật ngay" (quyền sửa Đánh giá): kiểm tra đã cấu hình, chờ đủ 5 phút từ lần bấm trước, còn đủ hạn mức
   * (giữ phần dự trữ cho cập nhật tự động) → BẮT ĐẦU chạy nền, trả ngay { promise } (không chờ 20–90 giây).
   * Đang có lần chạy khác → trả lần đó. Không đạt → ApiError (câu tiếng Việt).
   * @returns {Promise<{ promise: Promise<{ changed: boolean, lastSync: object }>, already: boolean }>}
   */
  async manualSync({ fetchImpl = fetch, by = "", notify = notifyWebsite } = {}) {
    const provider = reviewProvider();
    if (!provider.configured()) throw ApiError.badRequest(notConfiguredText(provider));
    if (running) return { promise: running.promise, already: true };
    const stored = merge(await settingRepository.get(KEY));
    const until = cooldownUntil(stored.lastSync, Date.now());
    if (until) {
      const min = Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 60_000));
      throw new ApiError(429, `Vừa cập nhật xong — có thể bấm lại sau ${min} phút`, {
        code: "COOLDOWN",
      });
    }
    const q = await quotaOf(provider, provider.syncCost, fetchImpl);
    if (q && !q.canManual) throw ApiError.badRequest(quotaBlockedText(provider, q));
    return { promise: this.sync({ fetchImpl, by, manual: true, notify }), already: false };
  },

  /** Website: chỉ số & link (lỗi DB → số mặc định, website không bao giờ hỏng) */
  async publicStats() {
    let v;
    try {
      v = merge(await settingRepository.get(KEY));
    } catch (err) {
      logger.warn({ err }, "[reviews] không đọc được điểm đánh giá — dùng số mặc định");
      v = merge(null);
    }
    const pick = ({ rating, count, url }) => ({ rating, count, url });
    return { tripadvisor: pick(v.tripadvisor), google: pick(v.google) };
  },

  /**
   * Lấy số mới qua nhà cung cấp (lịch hằng ngày, chạy bù khi khởi động, nút "Cập nhật ngay"). Không ném lỗi.
   * Chưa cấu hình → không gọi mạng, không ghi DB. Đang chạy → dùng chung lần đang chạy.
   * @returns {Promise<{ changed: boolean, lastSync: object }>}
   */
  sync(opts = {}) {
    const provider = reviewProvider();
    if (!provider.configured())
      return Promise.resolve({
        changed: false,
        lastSync: { at: null, ok: false, message: notConfiguredText(provider) },
      });
    if (running) return running.promise;
    const promise = this._run(provider, opts).finally(() => {
      running = null;
    });
    running = { since: new Date().toISOString(), manual: Boolean(opts.manual), promise };
    return promise;
  },

  async _run(
    provider,
    { fetchImpl = fetch, by = "system", manual = false, notify = notifyWebsite } = {},
  ) {
    let stored;
    try {
      stored = merge(await settingRepository.get(KEY));
    } catch (err) {
      logger.warn({ err }, "[reviews] không đọc được cài đặt — bỏ qua lần cập nhật");
      return {
        changed: false,
        lastSync: { at: null, ok: false, message: "Không đọc được dữ liệu" },
      };
    }

    const next = {
      tripadvisor: { ...stored.tripadvisor },
      google: { ...stored.google },
      lastSync: stored.lastSync,
    };
    const now = new Date().toISOString();
    const sources = {};
    let changed = false;

    let stats;
    try {
      stats = await provider.fetchStats({ fetchImpl });
    } catch (error) {
      stats = { tripadvisor: { error }, google: { error } }; // nhà cung cấp lỡ ném lỗi — vẫn ghi trạng thái
    }
    for (const src of SOURCES) {
      try {
        const got = stats?.[src] ?? { error: new Error("missing") };
        if (got.error) throw got.error;
        const before = { rating: stored[src].rating, count: stored[src].count };
        const why = insane(stored[src], got);
        if (why) {
          sources[src] = { ok: false, before, message: `Bỏ qua vì ${why} — đang giữ số cũ` };
          logger.warn(
            { event: "reviews.sync_ignored", source: src, rating: got.rating, count: got.count },
            `[reviews] ${why}`,
          );
          continue;
        }
        const same = got.rating === stored[src].rating && got.count === stored[src].count;
        next[src].rating = got.rating;
        next[src].count = got.count;
        next[src].url = safeUrl(got.url) || stored[src].url;
        next[src].updatedAt = now;
        if (!same) changed = true;
        sources[src] = {
          ok: true,
          changed: !same,
          before,
          after: { rating: got.rating, count: got.count },
          message: same ? `Không đổi (${fmt(got)})` : `${fmt(before)} → ${fmt(got)}`,
        };
      } catch (err) {
        const code = provider.errorCode(err); // chỉ mã lỗi — không URL, không khoá
        sources[src] = {
          ok: false,
          before: { rating: stored[src].rating, count: stored[src].count },
          message: `${provider.errorText(err)} — đang giữ số cũ`,
        };
        logger.warn(
          { event: "reviews.sync_failed", source: src, code },
          `[reviews] ${NAMES[src]}: ${code}`,
        );
      }
    }

    const ok = SOURCES.every((s) => sources[s].ok);
    const message = SOURCES.map((s) => `${NAMES[s]}: ${sources[s].message}`).join(" · ");
    next.lastSync = { at: now, ok, message, sources, manual, by, provider: provider.id };
    try {
      await settingRepository.set(KEY, next, by);
    } catch (err) {
      logger.warn({ err }, "[reviews] không lưu được kết quả cập nhật");
    }
    logger.info({ event: "reviews.sync", ok, by }, `[reviews] ${message}`);
    // số đổi → website làm mới ngay
    if (changed) await Promise.resolve(notify()).catch(() => false);
    return { changed, lastSync: next.lastSync };
  },
};

/**
 * Lịch hằng ngày ~06:00 giờ VN (chuỗi setTimeout như dọn ảnh, không giữ tiến trình sống)
 * + chạy bù 1 phút sau khi khởi động nếu lần cập nhật cuối đã quá 24 giờ (hoặc chưa có).
 * Chưa cấu hình nhà cung cấp thì lần chạy dừng ngay, không gọi mạng, không ghi DB.
 * @returns {() => void} hàm dừng lịch
 */
export function scheduleDailyReviewSync({
  run = () => reviewStatsService.sync(),
  clock = () => Date.now(),
  hour = env.reviews.syncHourVn,
  lastSyncAt = async () => (await settingRepository.get(KEY))?.lastSync?.at,
} = {}) {
  let handle = null;
  let stopped = false;
  const exec = async () => {
    try {
      await run();
    } catch (err) {
      logger.warn({ err }, "[reviews] cập nhật định kỳ lỗi");
    }
  };
  const plan = () => {
    if (stopped) return;
    const at = nextRunAt(clock(), hour);
    handle = setTimeout(async () => {
      await exec();
      plan();
    }, at.getTime() - clock());
    handle.unref?.();
  };
  plan();
  const catchUp = setTimeout(async () => {
    try {
      const last = await lastSyncAt();
      if (!last || clock() - new Date(last).getTime() > 24 * 3600_000) await exec();
    } catch {
      /* bỏ qua — lịch hằng ngày vẫn chạy */
    }
  }, 60_000);
  catchUp.unref?.();
  return () => {
    stopped = true;
    clearTimeout(handle);
    clearTimeout(catchUp);
  };
}
