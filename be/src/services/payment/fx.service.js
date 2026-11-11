import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { settingRepository } from "../../repositories/content.repository.js";

/**
 * Tỷ giá USD → VND tự động (giá tour tính bằng USD, 9Pay thu bằng VND).
 *  1. Vietcombank (XML công khai) — dùng giá BÁN USD: quy đổi giá USD của khách sang VND theo hướng an toàn.
 *  2. Dự phòng: open.er-api.com (miễn phí; chỉ dùng phía máy chủ, không hiển thị nguồn cho khách).
 *  3. Chưa từng lấy được → PAYMENT_USD_VND_RATE (.env, mặc định 25.500).
 * Lưu bộ nhớ + DB (Setting "fx"); quá 6 giờ thì làm mới NỀN — không bao giờ bắt khách chờ nguồn bên ngoài.
 * Lỗi / số bất thường (ngoài 15.000–40.000) → giữ tỷ giá tốt gần nhất.
 */
export const FX_SOURCES = {
  vcb: "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx",
  erApi: "https://open.er-api.com/v6/latest/USD",
};
const KEY = "fx";
const MAX_AGE_MS = 6 * 3600_000;
const RETRY_AFTER_FAIL_MS = 15 * 60_000; // lỗi → không gọi lại liên tục
const MIN_RATE = 15_000;
const MAX_RATE = 40_000;

export const saneRate = (n) => Number.isFinite(n) && n >= MIN_RATE && n <= MAX_RATE;

/** "<Exrate CurrencyCode="USD" ... Sell="25,820.00" />" → 25820 */
export function parseVcbXml(xml) {
  const tag = String(xml).match(/<Exrate\b[^>]*CurrencyCode\s*=\s*"USD"[^>]*>/i)?.[0];
  const sell = tag?.match(/\bSell\s*=\s*"([\d.,]+)"/i)?.[1];
  if (!sell) return null;
  const n = Number(sell.replace(/,/g, ""));
  return saneRate(n) ? n : null;
}

export function parseErApi(json) {
  const n = Number(json?.rates?.VND);
  return json?.result !== "error" && saneRate(n) ? Math.round(n) : null;
}

let mem = null; // { rate, source, fetchedAt }
let loaded = false;
let inflight = null;
let lastFailAt = 0;

async function fetchText(url, fetchImpl) {
  const res = await fetchImpl(url, {
    headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0 (compatible; fx-rate)" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function loadStored() {
  if (loaded) return;
  loaded = true;
  try {
    const v = await settingRepository.get(KEY);
    if (v && saneRate(v.rate) && (!mem || new Date(v.fetchedAt) > new Date(mem.fetchedAt)))
      mem = { rate: v.rate, source: v.source, fetchedAt: v.fetchedAt };
  } catch (err) {
    logger.warn({ err }, "[fx] không đọc được tỷ giá đã lưu");
  }
}

export const fxService = {
  /**
   * Lấy tỷ giá từ nguồn bên ngoài NGAY (không qua bộ nhớ đệm); thành công → lưu.
   * Trả bản ghi mới, hoặc null nếu mọi nguồn đều lỗi (giữ tỷ giá cũ).
   */
  async refresh({ fetchImpl = globalThis.fetch } = {}) {
    let rate = null;
    let source = "";
    try {
      rate = parseVcbXml(await fetchText(FX_SOURCES.vcb, fetchImpl));
      source = "vietcombank";
    } catch (err) {
      logger.warn({ err: err.message }, "[fx] Vietcombank lỗi");
    }
    if (!rate) {
      try {
        rate = parseErApi(JSON.parse(await fetchText(FX_SOURCES.erApi, fetchImpl)));
        source = "er-api";
      } catch (err) {
        logger.warn({ err: err.message }, "[fx] open.er-api lỗi");
      }
    }
    if (!rate) {
      lastFailAt = Date.now();
      return null;
    }
    mem = { rate, source, fetchedAt: new Date().toISOString() };
    await settingRepository
      .set(KEY, mem, "system")
      .catch((err) => logger.warn({ err }, "[fx] không lưu được tỷ giá"));
    return mem;
  },

  /**
   * Tỷ giá dùng ngay: { rate, source, fetchedAt }. Cũ / chưa có → làm mới nền (1 lượt cùng lúc).
   * source "default" = chưa từng lấy được, đang dùng PAYMENT_USD_VND_RATE.
   */
  async getRate({ fetchImpl } = {}) {
    await loadStored();
    const stale = !mem || Date.now() - new Date(mem.fetchedAt).getTime() > MAX_AGE_MS;
    if (stale && !inflight && Date.now() - lastFailAt > RETRY_AFTER_FAIL_MS) {
      inflight = this.refresh({ fetchImpl })
        .catch(() => null)
        .finally(() => (inflight = null));
    }
    return mem ?? { rate: env.payment.fallbackUsdVnd, source: "default", fetchedAt: null };
  },

  /** Chờ lượt làm mới đang chạy (test / khởi động) */
  settle: () => inflight ?? Promise.resolve(null),

  /** CHỈ dùng trong test */
  _reset(state = null) {
    mem = state;
    loaded = Boolean(state);
    inflight = null;
    lastFailAt = 0;
  },
};

/** USD → VND, làm tròn LÊN tới 1.000đ */
export const usdToVnd = (usd, rate) => Math.ceil((Number(usd) * Number(rate)) / 1000) * 1000;
