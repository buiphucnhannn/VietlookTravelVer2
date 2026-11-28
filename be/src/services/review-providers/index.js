import { env } from "../../config/env.js";
import { apifyProvider } from "./apify.provider.js";

/**
 * Nhà cung cấp điểm & số lượt đánh giá công ty (Google / Tripadvisor) — chọn bằng biến môi trường
 * REVIEW_STATS_PROVIDER (mặc định và hiện là duy nhất: "apify"). Mã / khoá của từng nhà cung cấp CHỈ đặt trong biến
 * môi trường máy chủ (vd. APIFY_TOKEN) — CMS không bao giờ có ô nhập khoá.
 *
 * Thêm nhà cung cấp mới (vd. API chính thức Google Places (New) GOOGLE_PLACES_API_KEY +
 * Tripadvisor Content API TRIPADVISOR_API_KEY): tạo file <id>.provider.js theo giao diện dưới, thêm biến môi
 * trường vào config/env.js (+ enum REVIEW_STATS_PROVIDER), rồi đăng ký trong PROVIDERS.
 *
 * @typedef {{ rating: number, count: number, url?: string } | { error: Error }} SourceStats
 * @typedef {{ unit: "usd"|"searches", total: number|null, left: number|null, used?: number|null, resetsAt: string|null } | { error: string }} QuotaInfo
 * @typedef {object} ReviewStatsProvider
 * @property {string} id              mã dùng trong REVIEW_STATS_PROVIDER
 * @property {string} name            tên hiện trong CMS (vd. "Apify")
 * @property {string} envKey          tên biến môi trường chứa khoá (chỉ để hiện hướng dẫn, không bao giờ là giá trị)
 * @property {() => boolean} configured
 * @property {"usd"|"searches"} [costUnit] đơn vị chi phí / hạn mức
 * @property {number} syncCost        chi phí ước tính / lần cập nhật điểm (cùng đơn vị với quota; 0 nếu không tính)
 * @property {number} [lowQuota]      còn dưới mức này → nhắc "sắp hết"
 * @property {(o: { fetchImpl?: typeof fetch }) => Promise<{ google: SourceStats, tripadvisor: SourceStats }>} fetchStats
 *           không ném — lỗi từng nền tảng trả trong { error }
 * @property {(o: { fetchImpl?: typeof fetch }) => Promise<QuotaInfo|null>} [quota]  không có API lượt dùng → bỏ trống
 * @property {(err: Error, o?: { retryHint?: string }) => string} errorText  câu tiếng Việt, không chứa khoá
 * @property {(err: Error) => string} errorCode                               mã ngắn để ghi log
 * @property {boolean} [canImportReviews]
 * @property {(list: string[]) => number} [reviewCost]
 * @property {(err: Error) => boolean} [errorFinal]  lỗi khi hỏi trạng thái → dừng hẳn (true) hay hỏi lại sau
 * @property {(src: string, o: { fetchImpl?: typeof fetch }) => Promise<{ runId: string, datasetId?: string }>} [startReviews]
 *           bắt đầu lấy đánh giá, trả NGAY mã lần chạy (không chờ xong)
 * @property {(src: string, handle: object, o: { fetchImpl?: typeof fetch }) => Promise<
 *   { status: "running" } | { status: "done", items: object[], durationS?: number|null }
 *   | { status: "error", error: Error, durationS?: number|null }>} [checkReviews]
 *           hỏi trạng thái lần chạy; lỗi mạng / HTTP → ném
 */
const PROVIDERS = { apify: apifyProvider };
export const PROVIDER_IDS = Object.keys(PROVIDERS);

/** @returns {ReviewStatsProvider} */
export const reviewProvider = () => PROVIDERS[env.reviews.provider] ?? apifyProvider;

/**
 * Tình trạng lượt dùng cho CMS + có cho phép thao tác bấm tay tốn `cost` lượt không.
 * Giữ lại ~3 ngày cập nhật tự động: thao tác bấm tay không được dùng vào phần này.
 * Nhà cung cấp không có API lượt dùng → null (CMS ẩn thanh lượt). Lỗi đọc lượt → vẫn cho bấm.
 */
export function quotaView(provider, info, cost) {
  if (!info) return null;
  if (info.error || info.left == null) return { ...info, low: false, canManual: true };
  const reserve = (provider.syncCost || 0) * 3;
  return {
    ...info,
    low: info.left < (provider.lowQuota ?? 0),
    canManual: info.left > 0 && info.left >= cost + reserve,
  };
}

/** Câu báo khi không đủ lượt cho thao tác bấm tay */
export const quotaBlockedText = (provider, q) =>
  q?.left === 0
    ? "Đã dùng hết hạn mức tháng này — số trên website giữ nguyên, cập nhật tự động tạm dừng đến khi sang chu kỳ mới"
    : "Hạn mức còn ít — đang giữ lại cho cập nhật tự động hằng ngày, thử lại khi sang chu kỳ mới";

/** Chưa cấu hình nhà cung cấp trên máy chủ */
export const notConfiguredText = () =>
  "Chưa bật kết nối dịch vụ lấy đánh giá — nhờ bộ phận kỹ thuật bật";
