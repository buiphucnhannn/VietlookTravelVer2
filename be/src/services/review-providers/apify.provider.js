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
 * - Google 20 đánh giá: 0,0162 USD (review-scraped 0,0005/đánh giá), 10–20 giây
 * - Tripadvisor 19 đánh giá: 0,0951 USD (review-scraped 0,005/đánh giá — đắt) → chỉ lấy 10 (0,0501 USD), 5–25 giây
 *   → 1 lần "Lấy đánh giá" (2 nền tảng) ĐO THẬT ≈ 0,066 USD.
 * Lấy đánh giá chạy KHÔNG đồng bộ (POST /acts/<actor>/runs → GET /actor-runs/<id> → GET /datasets/<id>/items),
 * cập nhật điểm vẫn dùng run-sync-get-dataset-items (nhanh, ~10 giây).
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
export function apifyErrorText(
  err,
  {
    retryHint = "sẽ thử lại lần sau",
    quotaHint = "số giữ nguyên, tự chạy lại khi sang chu kỳ mới",
  } = {},
) {
  const s = err?.status;
  const t = `${err?.apifyType ?? ""} ${err?.apifyMessage ?? ""}`.toLowerCase();
  if (err?.code === "NO_KEY") return "Chưa cài mã Apify trên máy chủ";
  if (err?.code === "EMPTY") return `Apify không trả về số của công ty, ${retryHint}`;
  if (err?.code === "EMPTY_REVIEWS") return `Không nhận được đánh giá nào, ${retryHint}`;
  if (err?.code === "NO_TEXT")
    return "Các đánh giá mới nhất chỉ chấm sao, không có lời khách để hiện trên website";
  if (err?.code === "RUN_TIMED_OUT" || err?.code === "STALE")
    return `Dịch vụ chạy quá lâu nên đã dừng, ${retryHint}`;
  if (err?.code === "RUN_ABORTED") return `Lần chạy bị dừng giữa chừng, ${retryHint}`;
  if (err?.code === "RUN_FAILED" && /usage|credit|limit|charge/i.test(err?.apifyMessage ?? ""))
    return `Đã chạm hạn mức chi phí của Apify — ${quotaHint}`;
  if (err?.code === "RUN_FAILED")
    return `Trang đánh giá tạm thời không đọc được (dịch vụ gặp lỗi), ${retryHint}`;
  if (err?.code === "BAD_RESPONSE") return `Apify trả về dữ liệu không đúng, ${retryHint}`;
  if (err?.name === "TimeoutError" || err?.name === "AbortError" || s === 408)
    return `Apify chạy quá lâu chưa xong, ${retryHint}`;
  if (s === 401) return "Mã Apify trên máy chủ không đúng — kiểm tra lại APIFY_TOKEN";
  if (s === 429) return `Apify đang bận (gọi quá nhiều lần), ${retryHint}`;
  if (s === 402 || /usage|credit|insufficient|payment|hard limit|monthly/.test(t))
    return `Đã dùng hết hạn mức Apify tháng này — ${quotaHint}`;
  if (s === 403) return "Mã Apify không được phép chạy công cụ này — kiểm tra quyền của mã";
  if (s === 404) return "Không tìm thấy công cụ lấy số trên Apify";
  if (err?.name === "FetchError") return `Không kết nối được Apify, ${retryHint}`;
  return `Không lấy được dữ liệu (${s ? `lỗi ${s}` : "lỗi Apify"}), ${retryHint}`;
}

/** Mã lỗi ngắn để ghi log (không bao giờ có mã / URL) */
export const apifyErrorCode = (err) =>
  err?.status ? `HTTP ${err.status}` : err?.code || err?.name || "error";

/** Lỗi khi hỏi trạng thái lần chạy có nên dừng hẳn không (mã sai / không còn lần chạy) — còn lại: hỏi lại sau */
export const apifyErrorFinal = (err) => [400, 401, 402, 403, 404].includes(err?.status);

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

/* ---------- Lấy đánh giá (chạy KHÔNG đồng bộ: bắt đầu → hỏi trạng thái → đọc dataset) ---------- */
// Không giữ request chờ 20–90 giây: POST /acts/<actor>/runs trả ngay mã lần chạy, CMS hỏi lại
// GET /actor-runs/<id> (miễn phí) đến khi xong rồi đọc GET /datasets/<id>/items. Máy chủ ngủ / khởi động lại giữa
// chừng cũng không mất — mã lần chạy lưu trong MongoDB (services/review-import.service.js).
// https://docs.apify.com/api/v2/act-runs-post · /actor-run-get · /dataset-items-get

/** Trạng thái lần chạy Apify còn đang chạy (chưa có kết quả cuối) */
const RUNNING_STATUSES = new Set(["READY", "RUNNING", "TIMING-OUT", "ABORTING"]);

/** Google: lời gốc (không lấy textTranslated), ngày theo giờ VN */
export function mapGoogleReviews(items) {
  const p =
    (Array.isArray(items) ? items : []).find((x) => Array.isArray(x?.reviews)) ?? items?.[0];
  return (Array.isArray(p?.reviews) ? p.reviews : []).slice(0, REVIEWS_LIMIT.google).map((r) => ({
    source: "google",
    name: clip(r?.name, 100) || "Google user",
    title: "",
    text: clip(r?.text, 5000),
    rating: stars(r?.stars ?? r?.rating),
    date: toDay(r?.publishedAtDate),
    url: httpsUrl(r?.reviewUrl) || httpsUrl(p?.url) || REVIEW_DEFAULTS.google.url,
    language: mapLang(r?.originalLanguage),
  }));
}

/** Tripadvisor: nguyên văn (đã tắt máy dịch), tên, ngày, ngôn ngữ, link bài gốc */
export function mapTripadvisorReviews(items) {
  return (Array.isArray(items) ? items : [])
    .filter((r) => r && typeof r === "object")
    .slice(0, REVIEWS_LIMIT.tripadvisor)
    .map((r) => ({
      source: "tripadvisor",
      name: clip(r?.user?.name, 100) || clip(r?.user?.username, 100) || "Tripadvisor traveller",
      title: clip(r?.title, 200),
      text: clip(r?.text, 5000),
      rating: stars(r?.rating),
      date: toDay(r?.publishedDate),
      url: httpsUrl(r?.url) || REVIEW_DEFAULTS.tripadvisor.url,
      language: mapLang(r?.originalLanguage || r?.lang),
    }));
}

/** Cấu hình lần chạy lấy đánh giá mỗi nền tảng: actor, input, trần chi phí, hàm chuẩn hoá */
const REVIEW_RUNS = {
  google: () => ({
    actor: actorOf("google"),
    input: googleInput(REVIEWS_LIMIT.google), // maxReviews 20, reviewsSort newest
    maxCharge: MAX_CHARGE.google,
    map: mapGoogleReviews,
  }),
  tripadvisor: () => ({
    actor: actorOf("tripadvisorReviews"),
    input: {
      startUrls: [{ url: REVIEW_DEFAULTS.tripadvisor.url }],
      maxItemsPerQuery: REVIEWS_LIMIT.tripadvisor,
      scrapeReviewerInfo: true,
      disableMachineTranslations: true,
    },
    maxCharge: MAX_CHARGE.tripadvisor,
    map: mapTripadvisorReviews,
  }),
};

const runErr = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });

/**
 * Bắt đầu lần chạy lấy đánh giá (trả ngay, không chờ actor xong).
 * @returns {Promise<{ runId: string, datasetId: string }>}
 */
export async function startReviewsRun(src, { fetchImpl = fetch } = {}) {
  const cfg = REVIEW_RUNS[src]?.();
  if (!cfg) throw runErr("BAD_SOURCE");
  const qs = new URLSearchParams({ timeout: String(RUN_TIMEOUT_S) });
  if (cfg.maxCharge) qs.set("maxTotalChargeUsd", String(cfg.maxCharge));
  try {
    const body = await apifyFetch(
      `/acts/${encodeURIComponent(cfg.actor)}/runs?${qs}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cfg.input),
      },
      fetchImpl,
      30_000,
    );
    const id = typeof body?.data?.id === "string" ? body.data.id : "";
    if (!id) throw runErr("BAD_RESPONSE");
    return { runId: id, datasetId: String(body.data.defaultDatasetId ?? "") };
  } finally {
    invalidateLimits();
  }
}

/**
 * Hỏi trạng thái lần chạy; xong → đọc dataset + chuẩn hoá.
 * Lỗi mạng / HTTP khi hỏi → ném (service tự quyết định thử lại lần hỏi sau hay dừng).
 * @returns {Promise<
 *   | { status: "running" }
 *   | { status: "done", items: object[], durationS: number|null, runStatus: string }
 *   | { status: "error", error: Error, durationS: number|null, runStatus: string }>}
 */
export async function checkReviewsRun(src, { runId, datasetId } = {}, { fetchImpl = fetch } = {}) {
  const cfg = REVIEW_RUNS[src]?.();
  if (!cfg || !runId) throw runErr("BAD_SOURCE");
  const body = await apifyFetch(
    `/actor-runs/${encodeURIComponent(runId)}`,
    { method: "GET" },
    fetchImpl,
    15_000,
  );
  const run = body?.data ?? {};
  const runStatus = String(run.status ?? "");
  if (RUNNING_STATUSES.has(runStatus)) return { status: "running" };
  invalidateLimits();
  const t0 = Date.parse(run.startedAt);
  const t1 = Date.parse(run.finishedAt);
  const durationS =
    Number.isFinite(t0) && Number.isFinite(t1) ? Math.round((t1 - t0) / 1000) : null;
  const meta = { durationS, runStatus };
  const ds = String(run.defaultDatasetId || datasetId || "");
  let raw = [];
  if (ds) {
    const items = await apifyFetch(
      `/datasets/${encodeURIComponent(ds)}/items?${new URLSearchParams({ clean: "true", format: "json", limit: "50" })}`,
      { method: "GET" },
      fetchImpl,
      30_000,
    );
    raw = Array.isArray(items) ? items : [];
  }
  const items = cfg.map(raw);
  // Chạy dở (hết giờ / bị dừng / chạm trần chi phí) nhưng vẫn có đánh giá → vẫn dùng phần đã lấy được
  if (items.length) return { status: "done", items, ...meta };
  if (runStatus === "SUCCEEDED")
    return { status: "error", error: runErr("EMPTY_REVIEWS"), ...meta };
  const code =
    runStatus === "TIMED-OUT"
      ? "RUN_TIMED_OUT"
      : runStatus === "ABORTED"
        ? "RUN_ABORTED"
        : "RUN_FAILED";
  return {
    status: "error",
    error: runErr(code, { apifyMessage: redactToken(run.statusMessage ?? "").slice(0, 300) }),
    ...meta,
  };
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
  errorFinal: apifyErrorFinal,
  canImportReviews: true,
  reviewCost: (list) => round2(list.reduce((n, s) => n + (COST.reviews[s] ?? 0), 0)),
  startReviews: (src, { fetchImpl = fetch } = {}) => startReviewsRun(src, { fetchImpl }),
  checkReviews: (src, handle, { fetchImpl = fetch } = {}) =>
    checkReviewsRun(src, handle, { fetchImpl }),
});
