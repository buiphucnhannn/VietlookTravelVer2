import { logger } from "../config/logger.js";
import { reviewRepository, settingRepository } from "../repositories/content.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { credentials, mergeStored, resolveGooglePlaceId } from "./review-stats.service.js";

/**
 * CMS → Đánh giá → "Lấy đánh giá từ Tripadvisor / Google": xem tối đa 5 đánh giá MỚI NHẤT mỗi nền tảng
 * qua API chính thức (giới hạn của Tripadvisor Content API & Google Places API (New)), nhân viên tick chọn
 * rồi thêm vào danh sách qua đúng luồng tạo đánh giá thường (POST /admin/reviews → kiểm tra dữ liệu + nhật ký).
 * Lời khách giữ NGUYÊN VĂN (Google: originalText — không lấy bản Google tự dịch), kèm link bài gốc
 * (điều khoản API: giữ nguồn + link về trang gốc — thẻ đánh giá trên website đã hiện huy hiệu nguồn + link).
 * Khoá API dùng chung với "Điểm & số lượt đánh giá" (CMS → Cài đặt).
 */
const TIMEOUT_MS = 10_000;
export const IMPORT_SOURCES = ["tripadvisor", "google"];
const LIMIT = 5;

const str = (v) => (typeof v === "string" ? v : "");
const clip = (s, n) => str(s).trim().slice(0, n);
const httpsUrl = (u) => (/^https?:\/\/[^\s<>"']+$/i.test(str(u)) ? str(u).slice(0, 1000) : "");

/** "zh-Hant" → zh, "vi" → vi, "en-US" → en, ngôn ngữ khác → other, không rõ → "" */
export function mapLang(code) {
  const c = str(code).trim().toLowerCase();
  if (!c) return "";
  const base = c.split(/[-_]/)[0];
  return ["en", "zh", "vi"].includes(base) ? base : "other";
}

/** ISO → "YYYY-MM-DD" theo giờ Việt Nam; sai / tương lai → "" */
export function toDay(iso) {
  const t = Date.parse(str(iso));
  if (!Number.isFinite(t)) return "";
  const day = new Date(t + 7 * 3600_000).toISOString().slice(0, 10);
  const today = new Date(Date.now() + 14 * 3600_000).toISOString().slice(0, 10);
  return day <= today ? day : "";
}

const stars = (v) => {
  const n = Math.round(Number(v));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 5;
};

async function getJson(fetchImpl, url, headers = {}) {
  const res = await fetchImpl(url, {
    headers: { accept: "application/json", ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Tripadvisor Content API — Location Reviews (tối đa 5 mới nhất) */
export async function fetchTripadvisorReviews({ key, locationId }, fetchImpl = fetch) {
  const d = await getJson(
    fetchImpl,
    `https://api.content.tripadvisor.com/api/v1/location/${encodeURIComponent(locationId)}/reviews?key=${encodeURIComponent(key)}&language=en`,
  );
  return (Array.isArray(d?.data) ? d.data : []).slice(0, LIMIT).map((r) => ({
    source: "tripadvisor",
    name: clip(r?.user?.username, 100) || "Tripadvisor traveller",
    title: clip(r?.title, 200),
    text: clip(r?.text, 5000),
    rating: stars(r?.rating),
    date: toDay(r?.published_date),
    url: httpsUrl(r?.url),
    language: mapLang(r?.lang),
  }));
}

/** Google Places API (New) — Place Details trường `reviews` (tối đa 5) */
export async function fetchGoogleReviews({ key, placeId }, fetchImpl = fetch) {
  const d = await getJson(
    fetchImpl,
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "reviews,googleMapsUri" },
  );
  return (Array.isArray(d?.reviews) ? d.reviews : []).slice(0, LIMIT).map((r) => {
    const orig = r?.originalText?.text ? r.originalText : r?.text;
    return {
      source: "google",
      name: clip(r?.authorAttribution?.displayName, 100) || "Google user",
      title: "",
      text: clip(orig?.text, 5000),
      rating: stars(r?.rating),
      date: toDay(r?.publishTime),
      url:
        httpsUrl(r?.googleMapsUri) ||
        httpsUrl(r?.authorAttribution?.uri) ||
        httpsUrl(d?.googleMapsUri),
      language: mapLang(orig?.languageCode),
    };
  });
}

const norm = (s) => str(s).replace(/\s+/g, " ").trim().toLowerCase();

/** Đã có trong CMS: cùng nguồn + cùng tên người viết + (cùng ngày HOẶC cùng 40 ký tự đầu của lời khách) */
export function markExisting(items, existing) {
  return items.map((it) => ({
    ...it,
    exists: existing.some(
      (e) =>
        e.source === it.source &&
        norm(e.name) === norm(it.name) &&
        ((it.date && e.date === it.date) ||
          norm(e.text).slice(0, 40) === norm(it.text).slice(0, 40)),
    ),
  }));
}

function errorText(src, err) {
  const s = err?.status;
  if (err?.name === "TimeoutError" || err?.name === "AbortError")
    return "Máy chủ không phản hồi, vui lòng thử lại sau ít phút";
  if (s === 429) return "Đã gọi quá nhiều lần hoặc hết hạn mức trong ngày — thử lại sau";
  if (src === "google") {
    if (s === 400 || s === 401 || s === 403)
      return "Khoá không hợp lệ hoặc chưa bật Places API (New) cho khoá này";
    if (s === 404) return "Không tìm thấy địa điểm — kiểm tra Mã địa điểm Google trong Cài đặt";
  } else {
    if (s === 401 || s === 403) return "Khoá không hợp lệ hoặc chưa cho phép máy chủ này dùng khoá";
    if (s === 400 || s === 404) return "Không tìm thấy địa điểm — kiểm tra Mã địa điểm Tripadvisor";
  }
  return s ? `Không lấy được đánh giá (lỗi ${s})` : "Không kết nối được, vui lòng thử lại";
}

/** Đọc khoá đã lưu (CHỈ từ CMS → Cài đặt → Điểm & số lượt đánh giá) */
async function loadCred() {
  return credentials(mergeStored(await settingRepository.get("reviewStats")));
}

export const reviewImportService = {
  /** Nền tảng nào có khoá → CMS chỉ hiện nút cho các nền tảng đó (không bao giờ trả khoá) */
  async sources() {
    const cred = await loadCred();
    return Object.fromEntries(IMPORT_SOURCES.map((s) => [s, Boolean(cred[s].key)]));
  },

  /**
   * Lấy đánh giá mới nhất của các nền tảng có khoá + đánh dấu "Đã có".
   * @returns {Promise<{ items: object[], errors: Record<string, string>, sources: string[] }>}
   */
  async preview({ source, fetchImpl = fetch } = {}) {
    const cred = await loadCred();
    const list = IMPORT_SOURCES.filter((s) => cred[s].key && (!source || source === s));
    if (!list.length)
      throw ApiError.badRequest(
        "Chưa cài khoá — nhập khoá trong Cài đặt → Điểm & số lượt đánh giá trước",
      );
    const items = [];
    const errors = {};
    await Promise.all(
      list.map(async (src) => {
        try {
          if (src === "tripadvisor")
            items.push(...(await fetchTripadvisorReviews(cred[src], fetchImpl)));
          else {
            const placeId =
              cred.google.placeId || (await resolveGooglePlaceId(cred.google, fetchImpl));
            if (!placeId) {
              errors[src] =
                "Chưa tìm ra địa điểm trên Google — nhập Mã địa điểm Google trong Cài đặt";
              return;
            }
            items.push(...(await fetchGoogleReviews({ ...cred.google, placeId }, fetchImpl)));
          }
        } catch (err) {
          errors[src] = errorText(src, err);
          logger.warn(
            { event: "reviews.import_failed", source: src, code: err?.status ?? err?.name },
            `[reviews] lấy đánh giá ${src} lỗi`,
          );
        }
      }),
    );
    const usable = items.filter((x) => x.text);
    const existing = await reviewRepository.find(
      { source: { $in: list } },
      { select: "source name date text" },
    );
    const order = (x) => IMPORT_SOURCES.indexOf(x.source);
    return {
      sources: list,
      errors,
      items: markExisting(usable, existing).sort(
        (a, b) => order(a) - order(b) || b.date.localeCompare(a.date),
      ),
    };
  },
};
