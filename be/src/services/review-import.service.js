import { logger } from "../config/logger.js";
import { reviewRepository } from "../repositories/content.repository.js";
import { ApiError } from "../utils/ApiError.js";
import {
  notConfiguredText,
  quotaBlockedText,
  quotaView,
  reviewProvider,
} from "./review-providers/index.js";
import { str } from "./review-providers/normalize.js";

export { mapLang, toDay } from "./review-providers/normalize.js";

/**
 * CMS → Đánh giá → "Lấy đánh giá từ Tripadvisor / Google": xem các đánh giá MỚI NHẤT mỗi nền tảng qua nhà cung cấp
 * đang dùng (REVIEW_STATS_PROVIDER — hiện là Apify, mã trên máy chủ), nhân viên tick chọn rồi thêm vào danh sách
 * qua đúng luồng tạo đánh giá thường (POST /admin/reviews → kiểm tra dữ liệu + nhật ký).
 * Tên, ngày, số sao, lời khách giữ NGUYÊN VĂN (bản gốc, không lấy bản máy dịch), kèm link bài gốc.
 * Apify mất 20–90 giây → chạy nền: POST bắt đầu (startPreview), CMS hỏi lại GET (previewStatus) đến khi xong.
 * Chi phí ước tính mỗi lần ~0,025 USD / nền tảng — hiện trong CMS trước khi bấm.
 */
export const IMPORT_SOURCES = ["tripadvisor", "google"];

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

const usable = (provider) => Boolean(provider.canImportReviews && provider.configured());

const JOB_KEEP_MS = 15 * 60_000; // kết quả giữ 15 phút để mở lại hộp không phải chạy lại
/** @type {{ status: "running"|"done"|"error", startedAt: string, finishedAt?: string, source?: string, result?: object, error?: string } | null} */
let job = null;
export const _resetPreviewJob = () => {
  job = null;
};

export const reviewImportService = {
  /**
   * Máy chủ có lấy được đánh giá không (CMS chỉ hiện nút khi true — không bao giờ trả khoá)
   * + tên nhà cung cấp, số lượt còn lại (null = không có API lượt dùng), lượt cần cho 1 lần xem.
   */
  async sources({ fetchImpl = fetch } = {}) {
    const provider = reviewProvider();
    const on = usable(provider);
    const cost = on && provider.reviewCost ? provider.reviewCost(IMPORT_SOURCES) : 0;
    return {
      ...Object.fromEntries(IMPORT_SOURCES.map((s) => [s, on])),
      provider: provider.name,
      cost,
      quota:
        on && provider.quota
          ? quotaView(provider, await provider.quota({ fetchImpl }), cost)
          : null,
    };
  },

  /**
   * Bắt đầu lấy đánh giá (chạy nền) — kiểm tra cấu hình + hạn mức trước (lỗi → ApiError ngay).
   * Đang chạy → trả lần đang chạy (không tốn thêm).
   */
  async startPreview({ source, fetchImpl = fetch } = {}) {
    if (job?.status === "running") return this.previewStatus();
    await this.checkPreview({ source, fetchImpl });
    const started = {
      status: "running",
      startedAt: new Date().toISOString(),
      source: source ?? "",
    };
    job = started;
    this.preview({ source, fetchImpl, checked: true })
      .then((result) => {
        if (job === started)
          job = { ...started, status: "done", finishedAt: new Date().toISOString(), result };
      })
      .catch((err) => {
        if (job === started)
          job = {
            ...started,
            status: "error",
            finishedAt: new Date().toISOString(),
            error: err?.statusCode
              ? err.message
              : "Chưa lấy được đánh giá, vui lòng thử lại sau ít phút",
          };
      });
    return this.previewStatus();
  },

  /** Trạng thái lần lấy gần nhất: idle | running | done (kèm result) | error (kèm câu báo) */
  previewStatus({ now = Date.now() } = {}) {
    if (!job) return { status: "idle" };
    if (job.status !== "running" && now - Date.parse(job.finishedAt) > JOB_KEEP_MS) {
      job = null;
      return { status: "idle" };
    }
    return { ...job };
  },

  /** Kiểm tra trước khi chạy: đã cấu hình + đủ hạn mức (giữ phần cho cập nhật tự động) */
  async checkPreview({ source, fetchImpl = fetch } = {}) {
    const provider = reviewProvider();
    if (!usable(provider))
      throw ApiError.badRequest(`${notConfiguredText(provider)} nên chưa lấy được đánh giá`);
    const list = IMPORT_SOURCES.filter((s) => !source || source === s);
    if (provider.quota) {
      const q = quotaView(provider, await provider.quota({ fetchImpl }), provider.reviewCost(list));
      if (q && !q.canManual) throw ApiError.badRequest(quotaBlockedText(provider, q));
    }
    return { provider, list };
  },

  /**
   * Lấy đánh giá mới nhất + đánh dấu "Đã có".
   * @returns {Promise<{ items: object[], errors: Record<string, string>, sources: string[] }>}
   */
  async preview({ source, fetchImpl = fetch, checked = false } = {}) {
    const provider = reviewProvider();
    const list = checked
      ? IMPORT_SOURCES.filter((s) => !source || source === s)
      : (await this.checkPreview({ source, fetchImpl })).list;
    const items = [];
    const errors = {};
    await Promise.all(
      list.map(async (src) => {
        try {
          items.push(...(await provider.fetchReviews(src, { fetchImpl })));
        } catch (err) {
          errors[src] = provider.errorText(err, { retryHint: "vui lòng thử lại sau ít phút" });
          logger.warn(
            { event: "reviews.import_failed", source: src, code: provider.errorCode(err) },
            `[reviews] lấy đánh giá ${src} lỗi`,
          );
        }
      }),
    );
    const withText = items.filter((x) => str(x.text));
    const existing = await reviewRepository.find(
      { source: { $in: list } },
      { select: "source name date text" },
    );
    const order = (x) => IMPORT_SOURCES.indexOf(x.source);
    return {
      sources: list,
      errors,
      items: markExisting(withText, existing).sort(
        (a, b) => order(a) - order(b) || b.date.localeCompare(a.date),
      ),
    };
  },
};
