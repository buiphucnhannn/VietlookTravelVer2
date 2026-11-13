import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { settingRepository } from "../repositories/content.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { decryptSecret, encryptSecret, maskSecret } from "../utils/crypto.js";
import { nextRunAt } from "./media-cleanup.service.js";

/**
 * Điểm & số lượt đánh giá của CÔNG TY trên Tripadvisor và Google (chân trang, trang chủ, trang tour…).
 * Mỗi nguồn có 2 chế độ (CMS → Cài đặt → "Điểm & số lượt đánh giá"):
 * - Tự động: có khoá API + bật "Tự động cập nhật mỗi ngày" → máy chủ lấy số mới ~06:00 giờ VN mỗi ngày
 *   (và khi admin bấm "Cập nhật ngay"); ô điểm / số lượt chỉ để xem.
 * - Nhập tay: chưa có khoá hoặc tắt tự động → dùng đúng số nhân viên nhập (bắt buộc nhập).
 * Khoá API CHỈ nhập trong CMS (không có biến môi trường dự phòng), lưu MÃ HOÁ như key 9Pay, không bao giờ trả về
 * trình duyệt (chỉ ••••abcd). Đổi / xoá khoá bắt buộc admin nhập lại mật khẩu (opts.reauth) + ghi nhật ký.
 * CHỈ dùng API chính thức (Tripadvisor Content API, Google Places API (New)) — KHÔNG cào trang.
 * Số nhận về bất thường (điểm ngoài 0–5, số lượt tụt quá MAX_DROP) → bỏ qua, giữ số cũ.
 * Không bao giờ làm sập server: mọi lỗi được bắt, ghi trạng thái lần cập nhật cuối, log không kèm khoá.
 */
const KEY = "reviewStats";
const TIMEOUT_MS = 10_000;
/** Số lượt được phép tụt so với số hiện tại (Tripadvisor / Google thỉnh thoảng ẩn bớt đánh giá) */
export const MAX_DROP = 5;
export const SOURCES = ["tripadvisor", "google"];

// Mã hồ sơ doanh nghiệp trên Google Maps (giống fe/src/constants/site.js) — dùng để nhận đúng địa điểm
export const GOOGLE_MAPS_CID = "12890319484623913190";
const GOOGLE_TEXT_QUERY = "Vietlook Travel and Trading Company Limited, Ha Dong, Hanoi";
export const DEFAULT_TRIPADVISOR_LOCATION = "27950353";

/** Số đang dùng khi CMS chưa lưu gì (khách xác nhận 13/11/2026) */
export const REVIEW_DEFAULTS = Object.freeze({
  tripadvisor: {
    rating: 5,
    count: 93,
    url: "https://www.tripadvisor.com/Attraction_Review-g17733187-d27950353-Reviews-Vietlook_Travel-Ha_Dong_Hanoi.html",
    auto: true,
    updatedAt: null,
  },
  google: {
    rating: 4.7,
    count: 31,
    url: `https://maps.google.com/?cid=${GOOGLE_MAPS_CID}`,
    auto: true,
    updatedAt: null,
  },
});

export const NO_KEY_MESSAGE = "Chưa cài khoá — đang dùng số nhập tay";
const NAMES = { tripadvisor: "Tripadvisor", google: "Google" };

const num = (v) => (v == null || v === "" ? NaN : Number(v));
const fmt = (s) => `${s.rating.toFixed(1)} · ${s.count} đánh giá`;
const safeUrl = (u) => (typeof u === "string" && /^https:\/\/[^\s<>"']+$/i.test(u) ? u : "");
const str = (v) => (typeof v === "string" ? v : "");

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

/** Gộp dữ liệu đã lưu với mặc định — luôn đủ trường, số hợp lệ (khoá vẫn ở dạng mã hoá) */
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
      auto: typeof v.auto === "boolean" ? v.auto : d.auto,
      updatedAt: v.updatedAt ?? d.updatedAt,
      key: str(v.key), // mã hoá (enc:v1:…)
      keyUpdatedAt: v.keyUpdatedAt ?? null, // lần đổi khoá gần nhất + người đổi (hiện trong CMS)
      keyUpdatedBy: str(v.keyUpdatedBy),
    };
  }
  out.tripadvisor.locationId = /^\d{1,15}$/.test(str(stored?.tripadvisor?.locationId))
    ? stored.tripadvisor.locationId
    : DEFAULT_TRIPADVISOR_LOCATION;
  out.google.placeId = str(stored?.google?.placeId);
  out.google.resolvedPlaceId = str(stored?.google?.resolvedPlaceId); // máy chủ tự tìm theo cid
  out.lastSync = stored?.lastSync ?? null;
  return out;
}
export const mergeStored = merge;

/**
 * Khoá (đã giải mã) & mã địa điểm thực tế — CHỈ từ CMS. Chỉ dùng nội bộ máy chủ, không bao giờ trả ra ngoài.
 * @param {ReturnType<typeof merge>} v
 */
export function credentials(v) {
  return {
    tripadvisor: {
      key: decryptSecret(v.tripadvisor.key),
      locationId: v.tripadvisor.locationId || DEFAULT_TRIPADVISOR_LOCATION,
    },
    google: {
      key: decryptSecret(v.google.key),
      placeId: v.google.placeId || v.google.resolvedPlaceId || "",
      cid: GOOGLE_MAPS_CID,
    },
  };
}

/** Thiếu bước xác nhận mật khẩu → không cho đổi khoá (an toàn mặc định nếu nơi gọi quên truyền) */
const NO_REAUTH = async () => {
  throw ApiError.forbidden("Cần xác nhận mật khẩu trước khi đổi khoá");
};

/** Chế độ tự động thật sự: có khoá + đang bật */
const isAuto = (v, cred, src) => Boolean(cred[src].key && v[src].auto);

/**
 * Số nhận từ API có dùng được không: điểm 0–5, số lượt nguyên ≥ 0 và không tụt quá MAX_DROP so với hiện tại.
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

async function getJson(fetchImpl, url, init = {}) {
  const res = await fetchImpl(url, {
    ...init,
    headers: { accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Tripadvisor Content API — Location Details: rating, num_reviews, web_url */
export async function fetchTripadvisor({ key, locationId }, fetchImpl = fetch) {
  const url = `https://api.content.tripadvisor.com/api/v1/location/${encodeURIComponent(locationId)}/details?key=${encodeURIComponent(key)}&language=en`;
  const d = await getJson(fetchImpl, url);
  return {
    rating: Math.round(num(d?.rating) * 10) / 10,
    count: num(String(d?.num_reviews ?? "").replace(/[^\d]/g, "")),
    url: str(d?.web_url),
  };
}

/** Google Places API (New) — Place Details, chỉ 3 trường (rating, userRatingCount, googleMapsUri) */
export async function fetchGoogle({ key, placeId }, fetchImpl = fetch) {
  const d = await getJson(
    fetchImpl,
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri",
      },
    },
  );
  return {
    rating: Math.round(num(d?.rating) * 10) / 10,
    count: num(d?.userRatingCount),
    url: str(d?.googleMapsUri),
  };
}

/**
 * Chưa có Place ID → tìm 1 lần theo tên doanh nghiệp (Text Search) và CHỈ nhận kết quả có googleMapsUri
 * chứa đúng mã hồ sơ cid của công ty (tránh lấy nhầm doanh nghiệp khác). Không thấy → "".
 */
export async function resolveGooglePlaceId({ key, cid }, fetchImpl = fetch) {
  const d = await getJson(fetchImpl, "https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: GOOGLE_TEXT_QUERY, languageCode: "en" }),
  });
  const hit = (d?.places ?? []).find((p) => str(p?.googleMapsUri).includes(`cid=${cid}`));
  return hit?.id ?? "";
}

/** Lỗi gọi API → câu tiếng Việt dễ hiểu cho admin */
function errorText(src, err) {
  const s = err?.status;
  if (err?.name === "TimeoutError" || err?.name === "AbortError")
    return "Máy chủ đánh giá không phản hồi, sẽ thử lại lần sau";
  if (src === "google") {
    if (s === 400 || s === 401 || s === 403)
      return "Khoá không hợp lệ hoặc chưa bật Places API (New) cho khoá này";
    if (s === 404) return "Không tìm thấy địa điểm — kiểm tra Mã địa điểm Google (Place ID)";
  } else {
    if (s === 401 || s === 403)
      return "Khoá không hợp lệ hoặc chưa cho phép máy chủ này dùng khoá (kiểm tra trong trang Tripadvisor)";
    if (s === 400 || s === 404) return "Không tìm thấy địa điểm — kiểm tra Mã địa điểm Tripadvisor";
  }
  if (s === 429) return "Đã gọi quá nhiều lần, thử lại sau";
  return `Không lấy được số (${s ? `lỗi ${s}` : "lỗi kết nối"}), sẽ thử lại lần sau`;
}

/** Dữ liệu cho CMS (admin): số đang dùng, chế độ, khoá đã che, lần cập nhật cuối — KHÔNG có khoá thật */
function view(v, cred) {
  const out = {};
  for (const src of SOURCES) {
    // eslint-disable-next-line no-unused-vars
    const { key, resolvedPlaceId, ...rest } = v[src];
    out[src] = {
      ...rest,
      keyConfigured: Boolean(cred[src].key),
      keyMasked: maskSecret(cred[src].key),
      autoActive: isAuto(v, cred, src),
    };
  }
  out.lastSync = SOURCES.some((s) => cred[s].key)
    ? v.lastSync
    : { at: null, ok: false, message: NO_KEY_MESSAGE };
  return out;
}

export const reviewStatsService = {
  async get() {
    const v = merge(await settingRepository.get(KEY));
    return view(v, credentials(v));
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
   * Admin lưu. Khoá: trống = giữ, clearKey = xoá. Nguồn ở chế độ nhập tay → bắt buộc điểm + số lượt;
   * chế độ tự động → giữ số đã đồng bộ (ô trên CMS chỉ để xem).
   * Có đổi / xoá khoá thật sự → gọi opts.reauth() (xác nhận mật khẩu) TRƯỚC khi ghi; sửa số / link / công tắc thì không.
   * @param {{ reauth?: () => Promise<unknown> }} [opts]
   * @returns {Promise<{ data: object, keyChanges: { source: string, op: "replace" | "clear" }[] }>}
   */
  async save(input, actor, { reauth = NO_REAUTH } = {}) {
    const prev = merge(await settingRepository.get(KEY));
    const now = new Date().toISOString();
    const next = { ...prev, tripadvisor: { ...prev.tripadvisor }, google: { ...prev.google } };
    const keyChanges = [];
    for (const src of SOURCES) {
      const n = input[src];
      const p = prev[src];
      const t = next[src];
      let op = "";
      if (n.clearKey) {
        if (p.key) op = "clear";
        t.key = "";
      } else if (n.key && n.key !== decryptSecret(p.key)) {
        t.key = encryptSecret(n.key);
        op = "replace";
      }
      if (op) {
        keyChanges.push({ source: src, op });
        t.keyUpdatedAt = now;
        t.keyUpdatedBy = actor?.username ?? "";
      }
      t.url = n.url;
      t.auto = n.auto;
      if (src === "tripadvisor") t.locationId = n.locationId;
      if (src === "google") {
        if (n.placeId !== p.placeId) t.resolvedPlaceId = ""; // đổi mã → tìm lại nếu cần
        t.placeId = n.placeId;
      }
    }
    const cred = credentials(next);
    for (const src of SOURCES) {
      if (isAuto(next, cred, src)) continue; // tự động: giữ số đã đồng bộ
      const n = input[src];
      const missing = [n.rating == null && "điểm (0–5)", n.count == null && "số lượt đánh giá"];
      if (missing.some(Boolean))
        throw ApiError.badRequest(
          `${NAMES[src]}: vui lòng nhập ${missing.filter(Boolean).join(" và ")} (đang nhập tay)`,
        );
      const changed = prev[src].rating !== n.rating || prev[src].count !== n.count;
      next[src].rating = n.rating;
      next[src].count = n.count;
      if (changed) next[src].updatedAt = now;
    }
    if (keyChanges.length) await reauth(); // sai mật khẩu → ném lỗi, không ghi gì
    await settingRepository.set(KEY, next, actor?.username);
    return { data: view(next, cred), keyChanges };
  },

  /**
   * Lấy số mới qua API chính thức. Không ném lỗi.
   * - Lịch hằng ngày (manual=false): chỉ các nguồn đang bật tự động.
   * - Admin bấm "Cập nhật ngay" (manual=true): mọi nguồn có khoá — để kiểm tra khoá; chỉ ÁP DỤNG số cho
   *   nguồn đang bật tự động, nguồn đang tắt thì báo "khoá dùng được" kèm số lấy được.
   * @returns {Promise<{ changed: boolean, lastSync: object }>}
   */
  async sync({ fetchImpl = fetch, by = "system", manual = false, notify = notifyWebsite } = {}) {
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
    const cred = credentials(stored);
    if (!SOURCES.some((s) => cred[s].key))
      return { changed: false, lastSync: { at: null, ok: false, message: NO_KEY_MESSAGE } };

    const next = {
      ...stored,
      tripadvisor: { ...stored.tripadvisor },
      google: { ...stored.google },
    };
    const now = new Date().toISOString();
    const sources = {};
    let changed = false;

    for (const src of SOURCES) {
      const cfg = cred[src];
      const auto = stored[src].auto;
      if (!cfg.key) {
        sources[src] = { ok: true, skipped: true, message: NO_KEY_MESSAGE };
        continue;
      }
      if (!auto && !manual) {
        sources[src] = { ok: true, skipped: true, message: "Đang tắt tự động cập nhật" };
        continue;
      }
      try {
        let got;
        if (src === "tripadvisor") got = await fetchTripadvisor(cfg, fetchImpl);
        else {
          let placeId = cfg.placeId;
          if (!placeId) {
            placeId = await resolveGooglePlaceId(cfg, fetchImpl);
            if (!placeId) {
              sources[src] = {
                ok: false,
                message:
                  "Khoá dùng được nhưng chưa tìm ra địa điểm — nhập Mã địa điểm Google (Place ID)",
              };
              continue;
            }
            next.google.resolvedPlaceId = placeId; // nhớ lại, lần sau không phải tìm
            changed = true;
          }
          got = await fetchGoogle({ ...cfg, placeId }, fetchImpl);
        }
        const why = insane(stored[src], got);
        if (why) {
          sources[src] = { ok: false, message: `Bỏ qua: ${why}, giữ số cũ` };
          logger.warn({ event: "reviews.sync_ignored", source: src, ...got }, `[reviews] ${why}`);
          continue;
        }
        if (!auto) {
          sources[src] = {
            ok: true,
            message: `Khoá dùng được (${fmt(got)}) — đang tắt tự động nên chưa áp dụng`,
          };
          continue;
        }
        const same = got.rating === stored[src].rating && got.count === stored[src].count;
        Object.assign(next[src], {
          rating: got.rating,
          count: got.count,
          url: safeUrl(got.url) || stored[src].url,
          updatedAt: now,
        });
        changed = true;
        sources[src] = {
          ok: true,
          message: same ? `Không đổi (${fmt(got)})` : `Đã cập nhật ${fmt(got)}`,
        };
      } catch (err) {
        // chỉ ghi mã lỗi — KHÔNG ghi URL (có khoá Tripadvisor trong đường dẫn)
        const code = err?.status ? `HTTP ${err.status}` : err?.name || "error";
        sources[src] = { ok: false, message: errorText(src, err) };
        logger.warn(
          { event: "reviews.sync_failed", source: src, code },
          `[reviews] ${NAMES[src]}: ${code}`,
        );
      }
    }

    const tried = SOURCES.filter((s) => !sources[s].skipped);
    const ok = tried.every((s) => sources[s].ok);
    const message = SOURCES.map((s) => `${NAMES[s]}: ${sources[s].message}`).join(" · ");
    next.lastSync = { at: now, ok, message, sources };
    try {
      await settingRepository.set(KEY, next, by);
    } catch (err) {
      logger.warn({ err }, "[reviews] không lưu được kết quả cập nhật");
    }
    logger.info({ event: "reviews.sync", ok, by }, `[reviews] ${message}`);
    // số đổi → website làm mới ngay (lịch hằng ngày; nút "Cập nhật ngay" trong CMS cũng tự làm mới)
    if (changed) await Promise.resolve(notify()).catch(() => false);
    return { changed, lastSync: next.lastSync };
  },
};

/**
 * Lịch hằng ngày ~06:00 giờ VN (chuỗi setTimeout như dọn ảnh, không giữ tiến trình sống).
 * Luôn lên lịch (khoá có thể được nhập trong CMS bất cứ lúc nào) — chưa có khoá thì lần chạy dừng ngay,
 * không gọi mạng, không ghi DB. Khởi động lại mà lần cập nhật cuối đã quá 26 giờ → chạy bù sau 1 phút.
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
      if (!last || clock() - new Date(last).getTime() > 26 * 3600_000) await exec();
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
