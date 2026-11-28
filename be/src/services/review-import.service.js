import { logger } from "../config/logger.js";
import { trusted } from "../repositories/base.repository.js";
import { reviewRepository, settingRepository } from "../repositories/content.repository.js";
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
 *
 * Chạy KHÔNG phụ thuộc request dài hay bộ nhớ máy chủ:
 *   POST /preview (startPreview)  kiểm tra hạn mức → bắt đầu lần chạy mỗi nền tảng ở nhà cung cấp (trả ngay mã lần
 *                                 chạy) → lưu vào MongoDB (cài đặt REVIEW_IMPORT_JOB)
 *   GET  /preview (previewStatus) đọc lần lấy đã lưu; còn đang chạy → hỏi nhà cung cấp (miễn phí), nền tảng nào xong
 *                                 thì đọc kết quả; đủ cả → đánh dấu "Đã có", lưu kết quả
 * → máy chủ ngủ / khởi động lại / nhiều instance giữa chừng vẫn lấy tiếp được; lỗi 1 nền tảng không bỏ kết quả
 * nền tảng kia (lỗi từng nền tảng trả trong result.errors bằng câu tiếng Việt, chi tiết kỹ thuật chỉ ghi log).
 * Chi phí ĐO THẬT mỗi lần ~0,066 USD (Google 0,016 + Tripadvisor 0,050) — hiện trong CMS trước khi bấm.
 */
export const IMPORT_SOURCES = ["tripadvisor", "google"];
export const JOB_KEY = "review_import_job";
const JOB_KEEP_MS = 12 * 3600_000; // kết quả giữ 12 giờ để mở lại hộp không phải chạy lại (tốn tiền)
/** Nhà cung cấp tự dừng sau 2 phút → quá 6 phút vẫn "đang chạy" = mất dấu, dừng chờ */
const STALE_MS = 6 * 60_000;
const CHECK_EVERY_MS = 3000; // nhiều tab / nhiều lần hỏi dồn → mỗi lần chạy chỉ hỏi nhà cung cấp tối đa 3 giây/lần
const RETRY_HINT = "vui lòng thử lại sau ít phút";
const QUOTA_HINT = "thử lại khi sang chu kỳ mới";

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

const usable = (provider) =>
  Boolean(
    provider.canImportReviews &&
    provider.configured() &&
    provider.startReviews &&
    provider.checkReviews,
  );

const errText = (provider, err) =>
  provider.errorText(err, { retryHint: RETRY_HINT, quotaHint: QUOTA_HINT });

/** Ghi log chi tiết kỹ thuật (không bao giờ có mã / URL có mã) */
function logFail(provider, src, err, extra = {}) {
  logger.warn(
    {
      event: "reviews.import_failed",
      source: src,
      code: provider.errorCode(err),
      apifyType: err?.apifyType || undefined,
      apifyMessage: err?.apifyMessage || undefined,
      ...extra,
    },
    `[reviews] lấy đánh giá ${src} lỗi`,
  );
}

// Trong 1 instance: gộp các lần bấm / hỏi cùng lúc (giữa các instance: kết quả như nhau, ghi đè vô hại)
let starting = null;
let polling = null;
const lastCheck = new Map(); // runId → lần hỏi nhà cung cấp gần nhất (ms)
export const _resetPreviewJob = () => {
  starting = null;
  polling = null;
  lastCheck.clear();
};

/** Dữ liệu trả CMS — không có mã lần chạy, không có đánh giá thô */
function view(job) {
  if (!job?.status) return { status: "idle" };
  const out = { status: job.status, startedAt: job.startedAt, source: job.source ?? "" };
  if (job.status === "running")
    out.pending = Object.entries(job.runs ?? {})
      .filter(([, r]) => r.state === "running")
      .map(([s]) => s);
  if (job.finishedAt) out.finishedAt = job.finishedAt;
  if (job.result) out.result = job.result;
  if (job.error) out.error = job.error;
  return out;
}

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

  /** Kiểm tra trước khi chạy: đã cấu hình + đủ hạn mức (giữ phần cho cập nhật tự động) */
  async checkPreview({ source, fetchImpl = fetch } = {}) {
    const provider = reviewProvider();
    if (!usable(provider)) throw ApiError.badRequest(notConfiguredText(provider));
    const list = IMPORT_SOURCES.filter((s) => !source || source === s);
    if (provider.quota) {
      const q = quotaView(provider, await provider.quota({ fetchImpl }), provider.reviewCost(list));
      if (q && !q.canManual) throw ApiError.badRequest(quotaBlockedText(provider, q));
    }
    return { provider, list };
  },

  /**
   * Bắt đầu lấy đánh giá — kiểm tra cấu hình + hạn mức trước (lỗi → ApiError ngay), rồi bắt đầu lần chạy mỗi
   * nền tảng (không chờ xong) và lưu vào MongoDB. Đang chạy → trả lần đang chạy (không tốn thêm).
   */
  startPreview({ source, fetchImpl = fetch, now = () => Date.now() } = {}) {
    if (starting) return starting;
    starting = (async () => {
      const cur = await this.previewStatus({ fetchImpl, now });
      if (cur.status === "running") return cur;
      const { provider, list } = await this.checkPreview({ source, fetchImpl });
      const runs = {};
      await Promise.all(
        list.map(async (src) => {
          try {
            const h = await provider.startReviews(src, { fetchImpl });
            runs[src] = { state: "running", runId: h.runId, datasetId: h.datasetId ?? "" };
            logger.info(
              { event: "reviews.import_started", source: src, runId: h.runId },
              `[reviews] bắt đầu lấy đánh giá ${src}`,
            );
          } catch (err) {
            runs[src] = { state: "error", error: errText(provider, err) };
            logFail(provider, src, err, { step: "start" });
          }
        }),
      );
      const job = await this.advance(
        { status: "running", startedAt: new Date(now()).toISOString(), source: source ?? "", runs },
        { provider, fetchImpl, now, skipCheck: true },
      );
      await settingRepository.set(JOB_KEY, job);
      return view(job);
    })().finally(() => {
      starting = null;
    });
    return starting;
  },

  /** Trạng thái lần lấy gần nhất: idle | running (kèm pending) | done (kèm result) | error (kèm câu báo) */
  async previewStatus({ fetchImpl = fetch, now = () => Date.now() } = {}) {
    const job = await settingRepository.get(JOB_KEY);
    if (!job?.status) return { status: "idle" };
    if (job.status !== "running") {
      if (now() - Date.parse(job.finishedAt) > JOB_KEEP_MS || !job.finishedAt)
        return { status: "idle" };
      return view(job);
    }
    if (polling) return polling;
    polling = (async () => {
      const before = JSON.stringify(job);
      const next = await this.advance(structuredClone(job), {
        provider: reviewProvider(),
        fetchImpl,
        now,
      });
      if (JSON.stringify(next) !== before) await settingRepository.set(JOB_KEY, next);
      return view(next);
    })().finally(() => {
      polling = null;
    });
    return polling;
  },

  /**
   * Đi tiếp 1 bước: hỏi nhà cung cấp các nền tảng còn chạy; quá lâu → dừng chờ; đủ cả → tổng hợp kết quả.
   * Không ném vì lỗi của 1 nền tảng.
   */
  async advance(job, { provider, fetchImpl, now, skipCheck = false }) {
    const t = now();
    const stale = t - Date.parse(job.startedAt) > STALE_MS;
    await Promise.all(
      Object.entries(job.runs).map(async ([src, run]) => {
        if (run.state !== "running") return;
        if (!skipCheck && t - (lastCheck.get(run.runId) ?? 0) >= CHECK_EVERY_MS) {
          lastCheck.set(run.runId, t);
          try {
            const r = await provider.checkReviews(src, run, { fetchImpl });
            if (r.status === "running") {
              /* hỏi lại lần sau */
            } else {
              const meta = { durationS: r.durationS ?? null };
              if (r.status === "done") {
                const withText = r.items.filter((x) => str(x.text).trim());
                Object.assign(run, {
                  state: "done",
                  items: withText,
                  total: r.items.length,
                  ...meta,
                });
                if (!withText.length)
                  Object.assign(run, { error: errText(provider, { code: "NO_TEXT" }) });
                logger.info(
                  {
                    event: "reviews.import_done",
                    source: src,
                    runId: run.runId,
                    items: r.items.length,
                    withText: withText.length,
                    runStatus: r.runStatus,
                    ...meta,
                  },
                  `[reviews] lấy được ${withText.length} đánh giá ${src}`,
                );
              } else {
                Object.assign(run, { state: "error", error: errText(provider, r.error), ...meta });
                logFail(provider, src, r.error, {
                  runId: run.runId,
                  runStatus: r.runStatus,
                  ...meta,
                });
              }
              lastCheck.delete(run.runId);
            }
          } catch (err) {
            // Lỗi mạng / nhà cung cấp tạm lỗi → hỏi lại lần sau; mã sai / không còn lần chạy → dừng
            logFail(provider, src, err, { step: "check", runId: run.runId });
            if (provider.errorFinal?.(err))
              Object.assign(run, { state: "error", error: errText(provider, err) });
          }
        }
        if (run.state === "running" && stale) {
          Object.assign(run, { state: "error", error: errText(provider, { code: "STALE" }) });
          logFail(provider, src, { code: "STALE" }, { runId: run.runId });
        }
      }),
    );
    if (Object.values(job.runs).some((r) => r.state === "running")) return job;
    return this.finish(job, { now });
  },

  /** Tổng hợp: đánh giá có nội dung của mọi nền tảng xong + số lượng + câu lỗi từng nền tảng */
  async finish(job, { now }) {
    const list = Object.keys(job.runs);
    const items = Object.values(job.runs).flatMap((r) => r.items ?? []);
    const errors = Object.fromEntries(
      Object.entries(job.runs)
        .filter(([, r]) => r.error)
        .map(([s, r]) => [s, r.error]),
    );
    let existing = [];
    try {
      // sanitizeFilter bật toàn cục → toán tử $in phải bọc trusted(), không thì Mongoose lỗi CastError
      existing = await reviewRepository.find(
        { source: trusted({ $in: list }) },
        { select: "source name date text" },
      );
    } catch (err) {
      // Không đọc được danh sách hiện có → vẫn trả đánh giá (chỉ thiếu nhãn "Đã có")
      logger.warn(
        { event: "reviews.import_existing_failed", err: err?.message },
        "[reviews] chưa đọc được đánh giá đã có",
      );
    }
    const order = (x) => IMPORT_SOURCES.indexOf(x.source);
    const result = {
      sources: list,
      errors,
      counts: Object.fromEntries(
        Object.entries(job.runs).map(([s, r]) => [s, r.items?.length ?? 0]),
      ),
      items: markExisting(items, existing).sort(
        (a, b) => order(a) - order(b) || b.date.localeCompare(a.date),
      ),
    };
    // Bỏ đánh giá thô khỏi từng lần chạy (đã nằm trong result) — giữ mã lần chạy để tra cứu trên Apify
    const runs = Object.fromEntries(
      Object.entries(job.runs).map(([s, { items: _items, ...r }]) => [s, r]),
    );
    return { ...job, runs, status: "done", finishedAt: new Date(now()).toISOString(), result };
  },
};
