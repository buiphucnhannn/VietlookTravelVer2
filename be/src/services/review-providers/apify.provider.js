import { env } from "../../config/env.js";
import { REVIEW_DEFAULTS } from "../../constants/company-reviews.js";
import { clip, httpsUrl, mapLang, round1, stars, toCount, toDay } from "./normalize.js";

/**
 * Nhà cung cấp "apify" (REVIEW_STATS_PROVIDER=apify, mã APIFY_TOKEN) — https://apify.com
 * Chạy "actor" công khai trên Apify Store qua REST API v2, chờ kết quả rồi đọc dataset:
 *   POST https://api.apify.com/v2/acts/<actor>/run-sync-get-dataset-items?timeout=…&maxTotalChargeUsd=…
 *   (https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-post) — mã gửi trong header
 *   "Authorization: Bearer …" (không bao giờ nằm trong URL / log).
 * - Google (compass/crawler-google-places — https://apify.com/compass/crawler-google-places):
 *   input startUrls = link Google Maps ?cid= của công ty, maxReviews 0, maxImages 0, không thêm chi tiết / liên hệ
 *   → item.totalScore + item.reviewsCount. Lấy đánh giá: maxReviews 20, reviewsSort "newest" → item.reviews[].
 * - Tripadvisor điểm (maxcopell/tripadvisor — https://apify.com/maxcopell/tripadvisor):
 *   startUrls = link Attraction_Review của công ty, maxItemsPerQuery 1 → item.rating + item.numberOfReviews.
 * - Tripadvisor đánh giá (maxcopell/tripadvisor-reviews — https://apify.com/maxcopell/tripadvisor-reviews):
 *   startUrls, maxItemsPerQuery 10, scrapeReviewerInfo, disableMachineTranslations → title/text/rating/publishedDate/url/user.
 * - Hạn mức: GET https://api.apify.com/v2/users/me/limits (https://docs.apify.com/api/v2/users-me-limits-get)
 *   → current.monthlyUsageUsd / limits.maxMonthlyUsageUsd / monthlyUsageCycle.endAt (gói Free 5 USD / chu kỳ).
 * Chi phí ĐO THẬT 25/11/2026 (gói Free, trả theo sự kiện):
 * - Google điểm: 0,0062 USD (place-scraped 0,004 + place-details-scraped 0,002 + khởi động + máy chủ), ~9 giây
 * - Tripadvisor điểm: 0,0051 USD (result-scraped 0,005 + khởi động), ~13 giây
 *   → ~0,012 USD mỗi lần cập nhật điểm ≈ 0,35 USD/tháng nếu chạy hằng ngày.
 * - Google 20 đánh giá: 0,0162 USD (review-scraped 0,0005/đánh giá), ~21 giây
 * - Tripadvisor 19 đánh giá: 0,0951 USD (review-scraped 0,005/đánh giá — đắt) → chỉ lấy 10 (~0,05 USD), ~8 giây
 * Mỗi lần chạy còn bị chặn trần chi phí bằng maxTotalChargeUsd.
 */
const API = "https://api.apify.com/v2";
const RUN_TIMEOUT_S = 120; // actor tự dừng sau 2 phút
const FETCH_TIMEOUT_MS = (RUN_TIMEOUT_S + 30) * 1000;
const REVIEWS_LIMIT = { google: 20, tripadvisor: 10 };

export const DEFAULT_ACTORS = Object.freeze({
  google: "compass~crawler-google-places",
  tripadvisor: "maxcopell~tripadvisor",
  tripadvisorReviews: "maxcopell~tripadvisor-reviews",
});
/** Chi phí ước tính (USD) — để hiện trong CMS và giữ phần dự trữ cho cập nhật tự động */
export const COST = Object.freeze({ sync: 0.012, reviews: { google: 0.017, tripadvisor: 0.051 } });
/**
 * Trần chi phí mỗi lần chạy actor (USD) — có lỗi bất thường cũng không tốn quá số này.
 * compass/crawler-google-places bắt buộc trần tối thiểu 0,50 USD (lỗi max-total-charge-usd-below-minimum).
 */
const MAX_CHARGE = Object.freeze({ google: 0.5, tripadvisor: 0.1 });

const tokenOf = () => env.reviews.apifyToken;
/** Mã actor: mặc định trong code, đổi được bằng APIFY_GOOGLE_ACTOR / APIFY_TRIPADVISOR_ACTOR /
 * APIFY_TRIPADVISOR_REVIEWS_ACTOR ("user/tên" hoặc "user~tên") */
const actorOf = (k) =>
  (
    ({
      google: env.reviews.apifyGoogleActor,
      tripadvisor: env.reviews.apifyTripadvisorActor,
      tripadvisorReviews: env.reviews.apifyTripadvisorReviewsActor,
    })[k] || DEFAULT_ACTORS[k]
  ).replace("/", "~");

/** Xoá mã khỏi mọi chuỗi trước khi lưu / ghi log */
export function redactToken(text) {
  const t = tokenOf();
  const s = String(text ?? "");
  return t ? s.split(t).join("***") : s;
}

/** Lỗi mạng / hết giờ → lỗi mới không giữ cause (phòng lộ thông tin request) */
function netError(cause) {
  const err = new Error(cause?.name === "TimeoutError" ? "timeout" : "network error");
  err.name =
    cause?.name === "TimeoutError" || cause?.name === "AbortError" ? cause.name : "FetchError";
  return err;
}

async function apifyFetch(path, init, fetchImpl, timeoutMs) {
  const token = tokenOf();
  if (!token) {
    const err = new Error("APIFY_TOKEN not set");
    err.code = "NO_KEY";
    throw err;
  }
  let res;
  try {
    res = await fetchImpl(`${API}${path}`, {
      ...init,
      headers: { accept: "application/json", authorization: `Bearer ${token}`, ...init?.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    throw netError(cause);
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* không phải JSON */
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.apifyType = String(body?.error?.type ?? "").slice(0, 100);
    err.apifyMessage = redactToken(body?.error?.message ?? "").slice(0, 300);
    throw err;
  }
  return body;
}

/** Chạy actor, chờ xong, trả mảng item của dataset */
export async function runActor(actor, input, { fetchImpl = fetch, maxCharge } = {}) {
  const qs = new URLSearchParams({ timeout: String(RUN_TIMEOUT_S), clean: "true" });
  if (maxCharge) qs.set("maxTotalChargeUsd", String(maxCharge));
  const body = await apifyFetch(
    `/acts/${encodeURIComponent(actor)}/run-sync-get-dataset-items?${qs}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
    fetchImpl,
    FETCH_TIMEOUT_MS,
  );
  return Array.isArray(body) ? body : [];
}

/** Lỗi Apify → câu tiếng Việt dễ hiểu (không chứa mã) */
export function apifyErrorText(err, { retryHint = "sẽ thử lại lần sau" } = {}) {
  const s = err?.status;
  const t = `${err?.apifyType ?? ""} ${err?.apifyMessage ?? ""}`.toLowerCase();
  if (err?.code === "NO_KEY") return "Chưa cài mã Apify trên máy chủ";
  if (err?.code === "EMPTY") return `Apify không trả về số của công ty, ${retryHint}`;
  if (err?.name === "TimeoutError" || err?.name === "AbortError" || s === 408)
    return `Apify chạy quá lâu chưa xong, ${retryHint}`;
  if (s === 401) return "Mã Apify trên máy chủ không đúng — kiểm tra lại APIFY_TOKEN";
  if (s === 429) return `Apify đang bận (gọi quá nhiều lần), ${retryHint}`;
  if (s === 402 || /usage|credit|insufficient|payment|hard limit|monthly/.test(t))
    return "Đã dùng hết hạn mức Apify tháng này — số giữ nguyên, tự chạy lại khi sang chu kỳ mới";
  if (s === 403) return "Mã Apify không được phép chạy công cụ này — kiểm tra quyền của mã";
  if (s === 404) return "Không tìm thấy công cụ lấy số trên Apify";
  if (err?.name === "FetchError") return `Không kết nối được Apify, ${retryHint}`;
  return `Không lấy được dữ liệu (${s ? `lỗi ${s}` : "lỗi Apify"}), ${retryHint}`;
}

/** Mã lỗi ngắn để ghi log (không bao giờ có mã / URL) */
export const apifyErrorCode = (err) =>
  err?.status ? `HTTP ${err.status}` : err?.code || err?.name || "error";

/* ---------- Hạn mức tháng (users/me/limits) ---------- */

const LIMITS_TTL_MS = 10 * 60_000;
let limitsCache = { at: 0, value: null };
export const _resetLimitsCache = () => {
  limitsCache = { at: 0, value: null };
};
const invalidateLimits = () => {
  limitsCache.at = 0;
};

const usd = (v) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : null);
const round2 = (v) => Math.round(v * 100) / 100;

/**
 * Chỉ lấy số tiền & chu kỳ (bỏ mọi thứ khác).
 * @returns {{ unit: "usd", total: number|null, used: number|null, left: number|null, resetsAt: string|null }}
 */
export function parseLimits(body) {
  const d = body?.data ?? body ?? {};
  const total = usd(d?.limits?.maxMonthlyUsageUsd);
  const used = usd(d?.current?.monthlyUsageUsd);
  const end = d?.monthlyUsageCycle?.endAt;
  return {
    unit: "usd",
    total,
    used: used == null ? null : round2(used),
    left: total != null && used != null ? Math.max(0, round2(total - used)) : null,
    resetsAt: typeof end === "string" && Number.isFinite(Date.parse(end)) ? end : null,
  };
}

/** Hạn mức tháng này (đệm 10 phút). Chưa có mã → null. Lỗi → { error } (không ném). */
export async function usageLimits(fetchImpl = fetch, { now = Date.now() } = {}) {
  if (!tokenOf()) return null;
  if (limitsCache.value && now - limitsCache.at < LIMITS_TTL_MS) return limitsCache.value;
  let value;
  try {
    value = parseLimits(await apifyFetch("/users/me/limits", { method: "GET" }, fetchImpl, 15_000));
  } catch (err) {
    value = {
      error:
        err?.status === 401
          ? "Mã Apify trên máy chủ không đúng — kiểm tra lại APIFY_TOKEN"
          : "Chưa xem được hạn mức còn lại, thử lại sau",
    };
  }
  limitsCache = { at: now, value };
  return value;
}

/* ---------- Điểm & số lượt ---------- */

const googleInput = (maxReviews) => ({
  startUrls: [{ url: REVIEW_DEFAULTS.google.url }],
  maxCrawledPlacesPerSearch: 1,
  language: "en",
  maxReviews,
  ...(maxReviews ? { reviewsSort: "newest", scrapeReviewsPersonalData: true } : {}),
  maxImages: 0,
  maxQuestions: 0,
  scrapeContacts: false,
  scrapePlaceDetailPage: false,
  includeWebResults: false,
  skipClosedPlaces: false,
});

const empty = () => Object.assign(new Error("empty"), { code: "EMPTY" });

/** Google: item đầu → totalScore / reviewsCount */
export async function fetchGoogleStats(fetchImpl = fetch) {
  try {
    const [p] = await runActor(actorOf("google"), googleInput(0), {
      fetchImpl,
      maxCharge: MAX_CHARGE.google,
    });
    if (!p) throw empty();
    return { rating: round1(p.totalScore), count: toCount(p.reviewsCount) };
  } finally {
    invalidateLimits();
  }
}

/** Tripadvisor: item đầu → rating / numberOfReviews */
export async function fetchTripadvisorStats(fetchImpl = fetch) {
  try {
    const [p] = await runActor(
      actorOf("tripadvisor"),
      {
        startUrls: [{ url: REVIEW_DEFAULTS.tripadvisor.url }],
        maxItemsPerQuery: 1,
        language: "en",
        includeTags: false,
        includeNearbyResults: false,
        includeAiReviewsSummary: false,
        maxPhotosPerPlace: 0,
      },
      { fetchImpl, maxCharge: MAX_CHARGE.tripadvisor },
    );
    if (!p) throw empty();
    return { rating: round1(p.rating), count: toCount(p.numberOfReviews) };
  } finally {
    invalidateLimits();
  }
}

/* ---------- Lấy đánh giá ---------- */

/** Google: 20 đánh giá mới nhất — `text` là lời gốc (không lấy textTranslated) */
export async function fetchGoogleReviews(fetchImpl = fetch) {
  try {
    const [p] = await runActor(actorOf("google"), googleInput(REVIEWS_LIMIT.google), {
      fetchImpl,
      maxCharge: MAX_CHARGE.google,
    });
    return (Array.isArray(p?.reviews) ? p.reviews : []).slice(0, REVIEWS_LIMIT.google).map((r) => ({
      source: "google",
      name: clip(r?.name, 100) || "Google user",
      title: "",
      text: clip(r?.text, 5000),
      rating: stars(r?.stars),
      date: toDay(r?.publishedAtDate),
      url: httpsUrl(r?.reviewUrl) || httpsUrl(p?.url) || REVIEW_DEFAULTS.google.url,
      language: mapLang(r?.originalLanguage),
    }));
  } finally {
    invalidateLimits();
  }
}

/** Tripadvisor: 10 đánh giá mới nhất, tắt máy dịch (giữ nguyên văn) */
export async function fetchTripadvisorReviews(fetchImpl = fetch) {
  try {
    const items = await runActor(
      actorOf("tripadvisorReviews"),
      {
        startUrls: [{ url: REVIEW_DEFAULTS.tripadvisor.url }],
        maxItemsPerQuery: REVIEWS_LIMIT.tripadvisor,
        scrapeReviewerInfo: true,
        disableMachineTranslations: true,
      },
      { fetchImpl, maxCharge: MAX_CHARGE.tripadvisor },
    );
    return items.slice(0, REVIEWS_LIMIT.tripadvisor).map((r) => ({
      source: "tripadvisor",
      name: clip(r?.user?.name, 100) || clip(r?.user?.username, 100) || "Tripadvisor traveller",
      title: clip(r?.title, 200),
      text: clip(r?.text, 5000),
      rating: stars(r?.rating),
      date: toDay(r?.publishedDate),
      url: httpsUrl(r?.url) || REVIEW_DEFAULTS.tripadvisor.url,
      language: mapLang(r?.originalLanguage || r?.lang),
    }));
  } finally {
    invalidateLimits();
  }
}

/* ---------- Giao diện nhà cung cấp (xem review-providers/index.js) ---------- */

export const apifyProvider = Object.freeze({
  id: "apify",
  name: "Apify",
  envKey: "APIFY_TOKEN",
  configured: () => Boolean(tokenOf()),
  costUnit: "usd",
  /** Chi phí ước tính 1 lần cập nhật điểm (USD) */
  syncCost: COST.sync,
  /** Dưới mức này → nhắc "sắp hết hạn mức" */
  lowQuota: 0.5,
  async fetchStats({ fetchImpl = fetch } = {}) {
    const out = {};
    // chạy song song (mỗi actor mất 20–90 giây)
    await Promise.all(
      [
        ["tripadvisor", fetchTripadvisorStats],
        ["google", fetchGoogleStats],
      ].map(async ([src, fn]) => {
        try {
          out[src] = { ...(await fn(fetchImpl)), url: REVIEW_DEFAULTS[src].url };
        } catch (error) {
          out[src] = { error };
        }
      }),
    );
    return out;
  },
  quota: ({ fetchImpl = fetch } = {}) => usageLimits(fetchImpl),
  errorText: apifyErrorText,
  errorCode: apifyErrorCode,
  canImportReviews: true,
  reviewCost: (list) => round2(list.reduce((n, s) => n + (COST.reviews[s] ?? 0), 0)),
  fetchReviews: (src, { fetchImpl = fetch } = {}) =>
    src === "google" ? fetchGoogleReviews(fetchImpl) : fetchTripadvisorReviews(fetchImpl),
});
