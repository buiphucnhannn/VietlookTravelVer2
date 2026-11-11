import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Dịch tự động nội dung CMS giữa en / zh / vi qua CHUỖI dịch vụ (lần lượt, cái này lỗi → cái sau):
 *   - Có key (chính thức, gói miễn phí): Microsoft Translator (Azure), DeepL API Free, Google Cloud Translation.
 *     Không khai key → tự bỏ qua.
 *   - Không cần key (KHÔNG chính thức — có thể đổi / bị chặn bất cứ lúc nào): Google (translate.googleapis.com
 *     client=gtx), Google (clients5 dict-chrome-ex), Lingva (proxy Google công khai), LibreTranslate (chỉ khi
 *     tự khai LIBRETRANSLATE_URL). Mỗi lần dịch XOAY VÒNG dịch vụ đứng đầu nhóm này để chia tải.
 *   - MyMemory luôn cuối cùng.
 * - "Cầu dao": dịch vụ trả 429 / 403 / hết hạn mức / captcha / chuyển hướng → tạm nghỉ (mặc định 15 phút; hết
 *   hạn mức theo ngày / tháng → tới 0h UTC hôm sau) và bị bỏ qua NGAY ở các lần sau. Mỗi request tối đa 8 giây;
 *   dịch 1 ô mà mọi dịch vụ đều hỏng → báo lỗi thân thiện trong ~15 giây.
 * - Chỉ gọi tới tên miền cố định / do quản trị khai trong env (không nhận URL từ người dùng → không có SSRF).
 * - HTML: chỉ dịch phần CHỮ (không gửi thẻ cho dịch vụ), giữ nguyên mọi thẻ / thuộc tính / link → bản dịch không
 *   thể chèn thẻ mới (chữ sau khi dịch được escape lại). Nội dung vẫn đi qua bộ lọc HTML khi lưu như bình thường.
 * - Câu trả về giống thông báo lỗi / cảnh báo / trang captcha → coi như dịch vụ lỗi, KHÔNG BAO GIỜ ghi vào nội dung.
 * - Có bộ nhớ đệm trong RAM để không dịch lại cùng một câu.
 */
const BUSY = "Dịch tự động đang bận, vui lòng thử lại sau ít phút";

export const PROVIDER_NAMES = [
  "azure",
  "deepl",
  "google-cloud",
  "google",
  "google-dict",
  "lingva",
  "libretranslate",
  "mymemory",
];
const DEFAULT_ORDER = PROVIDER_NAMES;
export const DEFAULT_LINGVA = [
  "https://translate.plausibility.cloud",
  "https://lingva.lunar.icu",
  "https://lingva.ml",
];

// ---------------------------------------------------------------- lỗi của từng dịch vụ
/** kind: blocked (bị chặn / quá tải) · quota (hết hạn mức) · unsupported (không hỗ trợ cặp ngôn ngữ) · fail (lỗi tạm) */
class ProviderError extends Error {
  constructor(kind, message, { until } = {}) {
    super(message);
    this.kind = kind;
    this.until = until;
  }
}
const blocked = (m) => new ProviderError("blocked", m);
const quota = (m, until) => new ProviderError("quota", m, { until });
const unsupported = (m) => new ProviderError("unsupported", m);
const fail = (m) => new ProviderError("fail", m);

/** 0h UTC ngày hôm sau (hạn mức theo ngày / theo tháng: thử lại mỗi ngày một lần) */
const nextUtcDay = (now) => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
};

/** Chữ trả về trông như cảnh báo / lỗi / trang captcha chứ không phải bản dịch */
const JUNK =
  /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR|unusual traffic|captcha|<\s*(html|head|body|title|script)\b|just a moment|Access denied/i;
const clean = (provider, out, input) => {
  if (typeof out !== "string") throw fail(`${provider}: kết quả không hợp lệ`);
  if (JUNK.test(out) && !JUNK.test(input))
    throw blocked(`${provider}: trả về cảnh báo thay vì bản dịch`);
  if (!out.trim() && input.trim()) throw fail(`${provider}: bản dịch trống`);
  return out;
};

/** Phân loại phản hồi HTTP lỗi theo chuẩn chung (dịch vụ riêng có thể xử lý thêm trước) */
const httpError = (provider, res, body = "") => {
  const s = res.status;
  if (s >= 300 && s < 400) return blocked(`${provider} ${s} (chuyển hướng / captcha)`);
  if (s === 429 || s === 403) return blocked(`${provider} ${s}`);
  if (s === 456) return quota(`${provider} ${s}`);
  if (s === 401) return blocked(`${provider} 401 (key sai)`);
  if (/quota|limit exceeded|captcha|unusual traffic/i.test(body))
    return blocked(`${provider} ${s}`);
  return fail(`${provider} ${s}`);
};

/** Đọc JSON; trả HTML / chữ thường (trang chặn, captcha) → coi là bị chặn */
async function readJson(provider, res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw blocked(`${provider}: phản hồi không phải JSON`);
  }
}

// ---------------------------------------------------------------- từng dịch vụ
/**
 * Mỗi dịch vụ: { name, keyless, rotate, enabled, maxChars, maxItems, maxLine,
 *   supports?(from, to, ctx) → bool, translate(lines, from, to, ctx) → string[] }
 * ctx = { fetch, signal, now }
 */
function buildProviders(cfg) {
  const azure = {
    name: "azure",
    enabled: Boolean(cfg.azureKey),
    maxChars: 10_000, // giới hạn của Azure: 1.000 đoạn / 50.000 ký tự mỗi request
    maxItems: 100,
    codes: { en: "en", vi: "vi", zh: "zh-Hans" },
    async translate(lines, from, to, { fetch, signal }) {
      const url =
        "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0" +
        `&from=${this.codes[from]}&to=${this.codes[to]}&textType=plain`;
      const headers = {
        "Content-Type": "application/json; charset=UTF-8",
        "Ocp-Apim-Subscription-Key": cfg.azureKey,
      };
      if (cfg.azureRegion) headers["Ocp-Apim-Subscription-Region"] = cfg.azureRegion;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(lines.map((Text) => ({ Text }))),
        signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        // 403 của gói miễn phí = đã dùng hết ký tự trong tháng
        if (res.status === 403 && /quota|free/i.test(body)) throw quota("azure 403 (hết hạn mức)");
        if (res.status === 400 && /language/i.test(body)) throw unsupported("azure: cặp ngôn ngữ");
        throw httpError("azure", res, body);
      }
      const data = await readJson("azure", res);
      if (!Array.isArray(data) || data.length !== lines.length) throw fail("azure: lệch số đoạn");
      return data.map((d) => d?.translations?.[0]?.text);
    },
  };

  const deeplFree = cfg.deeplKey.endsWith(":fx");
  const deeplBase = deeplFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const deeplLangs = { at: 0, source: null, target: null };
  const deepl = {
    name: "deepl",
    enabled: Boolean(cfg.deeplKey),
    maxChars: 30_000, // body tối đa 128 KiB
    maxItems: 50, // tối đa 50 đoạn / request
    source: { en: "EN", vi: "VI", zh: "ZH" },
    target: { en: "EN-US", vi: "VI", zh: "ZH-HANS" },
    /** Hỏi DeepL danh sách ngôn ngữ (lưu 24 giờ) → tự bỏ qua cặp DeepL không hỗ trợ (vd. tiếng Việt nếu tài khoản chưa có) */
    async supports(from, to, { fetch, now }) {
      if (!deeplLangs.source || now() - deeplLangs.at > 24 * 3600_000) {
        try {
          const get = async (type) => {
            const res = await fetch(`${deeplBase}/v2/languages?type=${type}`, {
              headers: { Authorization: `DeepL-Auth-Key ${cfg.deeplKey}` },
              signal: AbortSignal.timeout(cfg.timeoutMs),
            });
            if (!res.ok) throw httpError("deepl", res);
            const list = await readJson("deepl", res);
            return new Set(list.map((l) => String(l.language).toUpperCase()));
          };
          deeplLangs.source = await get("source");
          deeplLangs.target = await get("target");
          deeplLangs.at = now();
        } catch (err) {
          if (err instanceof ProviderError && err.kind !== "fail") throw err;
          return true; // không hỏi được → cứ thử, DeepL trả 400 thì đánh dấu không hỗ trợ
        }
      }
      return deeplLangs.source.has(this.source[from]) && deeplLangs.target.has(this.target[to]);
    },
    async translate(lines, from, to, { fetch, signal }) {
      const res = await fetch(`${deeplBase}/v2/translate`, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${cfg.deeplKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: lines,
          source_lang: this.source[from],
          target_lang: this.target[to],
        }),
        signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 456) throw quota("deepl 456 (hết hạn mức tháng)");
        if (res.status === 400 && /lang/i.test(body)) throw unsupported("deepl: cặp ngôn ngữ");
        throw httpError("deepl", res, body);
      }
      const data = await readJson("deepl", res);
      const out = data?.translations;
      if (!Array.isArray(out) || out.length !== lines.length) throw fail("deepl: lệch số đoạn");
      return out.map((t) => t?.text);
    },
  };

  const googleCloud = {
    name: "google-cloud",
    enabled: Boolean(cfg.googleKey),
    maxChars: 5_000,
    maxItems: 128, // tối đa 128 đoạn / request
    codes: { en: "en", vi: "vi", zh: "zh-CN" },
    async translate(lines, from, to, { fetch, signal }) {
      // key gửi qua header (không nằm trong URL → không lộ trong log)
      const res = await fetch("https://translation.googleapis.com/language/translate/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": cfg.googleKey },
        body: JSON.stringify({
          q: lines,
          source: this.codes[from],
          target: this.codes[to],
          format: "text",
        }),
        signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (/dailyLimitExceeded|quotaExceeded|billing/i.test(body))
          throw quota("google-cloud: hết hạn mức");
        throw httpError("google-cloud", res, body);
      }
      const data = await readJson("google-cloud", res);
      const out = data?.data?.translations;
      if (!Array.isArray(out) || out.length !== lines.length)
        throw fail("google-cloud: lệch số đoạn");
      return out.map((t) => t?.translatedText);
    },
  };

  const gCodes = { en: "en", vi: "vi", zh: "zh-CN" };
  const gtxOne = async (text, from, to, { fetch, signal }) => {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${gCodes[from]}&tl=${gCodes[to]}&dt=t`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ q: text }),
        redirect: "manual", // bị chặn → 302 sang trang captcha
        signal,
      },
    );
    if (!res.ok) throw httpError("google", res);
    const data = await readJson("google", res);
    if (!Array.isArray(data?.[0])) throw blocked("google: phản hồi lạ");
    return data[0].map((seg) => seg?.[0] ?? "").join("");
  };
  const google = {
    name: "google",
    keyless: true,
    rotate: true,
    enabled: true,
    maxChars: 3_500,
    maxItems: 200,
    async translate(lines, from, to, ctx) {
      const out = (await gtxOne(lines.join("\n"), from, to, ctx)).split("\n").map((s) => s.trim());
      if (out.length === lines.length) return out;
      // Google gộp / tách dòng → dịch từng câu (chỉ khi lô nhỏ)
      if (lines.length > 20) throw fail("google: lệch số dòng");
      const each = [];
      for (const line of lines) each.push((await gtxOne(line, from, to, ctx)).trim());
      return each;
    },
  };

  const googleDict = {
    name: "google-dict",
    keyless: true,
    rotate: true,
    enabled: true,
    maxChars: 1_500, // gửi bằng GET (nhiều tham số q) → giữ URL ngắn
    maxItems: 50,
    async translate(lines, from, to, { fetch, signal }) {
      const qs = lines.map((l) => `&q=${encodeURIComponent(l)}`).join("");
      const res = await fetch(
        `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${gCodes[from]}&tl=${gCodes[to]}${qs}`,
        { redirect: "manual", signal },
      );
      if (!res.ok) throw httpError("google-dict", res);
      const data = await readJson("google-dict", res);
      if (!Array.isArray(data) || data.length !== lines.length)
        throw fail("google-dict: lệch số đoạn");
      // mỗi phần tử: "bản dịch" hoặc ["bản dịch", "ngôn ngữ nguồn"]
      return data.map((d) => (Array.isArray(d) ? d[0] : d));
    },
  };

  // Lingva: nhiều máy chủ công khai → xoay vòng, máy chủ nào lỗi tạm nghỉ riêng
  const lingvaHosts = (cfg.lingvaInstances.length ? cfg.lingvaInstances : DEFAULT_LINGVA).filter(
    (h) => /^https:\/\/[^/\s]+$/i.test(h),
  );
  const lingvaDown = new Map();
  let lingvaTurn = 0;
  const lingva = {
    name: "lingva",
    keyless: true,
    rotate: true,
    enabled: lingvaHosts.length > 0,
    maxChars: 1_500,
    maxItems: 1, // 1 đoạn / request (văn bản nằm trong đường dẫn URL)
    maxLine: 1_500,
    codes: { en: "en", vi: "vi", zh: "zh" },
    async translate([line], from, to, { fetch, signal, now }) {
      const start = lingvaTurn++;
      let last;
      for (let i = 0; i < lingvaHosts.length; i++) {
        const host = lingvaHosts[(start + i) % lingvaHosts.length];
        if ((lingvaDown.get(host) ?? 0) > now()) continue;
        try {
          const res = await fetch(
            `${host}/api/v1/${this.codes[from]}/${this.codes[to]}/${encodeURIComponent(line)}`,
            { redirect: "manual", signal },
          );
          if (!res.ok) throw httpError(`lingva ${host}`, res);
          const data = await readJson(`lingva ${host}`, res);
          if (typeof data?.translation !== "string")
            throw blocked(`lingva ${host}: ${data?.error ?? "lỗi"}`);
          return [data.translation];
        } catch (err) {
          if (signal.aborted) throw err;
          last = err;
          lingvaDown.set(host, now() + cfg.cooldownMs);
        }
      }
      throw blocked(`lingva: mọi máy chủ đều lỗi (${last?.message ?? "đang nghỉ"})`);
    },
  };

  const libre = {
    name: "libretranslate",
    keyless: !cfg.libreKey,
    rotate: true,
    enabled: /^https?:\/\/[^\s]+$/i.test(cfg.libreUrl),
    maxChars: 5_000,
    maxItems: 50,
    codes: { en: "en", vi: "vi", zh: "zh" },
    async translate(lines, from, to, { fetch, signal }) {
      const body = { q: lines, source: this.codes[from], target: this.codes[to], format: "text" };
      if (cfg.libreKey) body.api_key = cfg.libreKey;
      const res = await fetch(`${cfg.libreUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        redirect: "manual",
        signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status === 400 && /not supported|language/i.test(text))
          throw unsupported("libretranslate: cặp ngôn ngữ");
        if (res.status === 400 && /api.?key/i.test(text))
          throw blocked("libretranslate: cần API key");
        throw httpError("libretranslate", res, text);
      }
      const data = await readJson("libretranslate", res);
      const out = data?.translatedText;
      if (!Array.isArray(out) || out.length !== lines.length)
        throw fail("libretranslate: lệch số đoạn");
      return out;
    },
  };

  const myMemory = {
    name: "mymemory",
    keyless: true,
    enabled: true,
    maxChars: 480,
    maxItems: 1,
    maxLine: 480, // giới hạn 500 byte / lần
    codes: { en: "en", vi: "vi", zh: "zh-CN" },
    async translate([line], from, to, { fetch, signal, now }) {
      let url =
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(line)}` +
        `&langpair=${this.codes[from]}|${this.codes[to]}`;
      if (cfg.myMemoryEmail) url += `&de=${encodeURIComponent(cfg.myMemoryEmail)}`;
      const res = await fetch(url, { redirect: "manual", signal });
      const data =
        res.status >= 300 && res.status < 400
          ? null
          : await readJson("mymemory", res).catch(() => null);
      const out = data?.responseData?.translatedText;
      if (typeof out === "string" && /MYMEMORY WARNING/i.test(out)) {
        // "... NEXT AVAILABLE IN 05 HOURS 39 MINUTES ..." → nghỉ đúng chừng đó, không thì tới 0h UTC
        const m = out.match(/(\d+)\s*HOURS?\s*(\d+)\s*MINUTES?/i);
        const until = m
          ? now() + (Number(m[1]) * 60 + Number(m[2]) + 1) * 60_000
          : nextUtcDay(now());
        throw quota("mymemory: hết lượt trong ngày", until);
      }
      if (!res.ok) throw httpError("mymemory", res);
      if (Number(data?.responseStatus) !== 200 || typeof out !== "string")
        throw fail(`mymemory ${data?.responseStatus ?? "lỗi"}`);
      return [out];
    },
  };

  return {
    azure,
    deepl,
    "google-cloud": googleCloud,
    google,
    "google-dict": googleDict,
    lingva,
    libretranslate: libre,
    mymemory: myMemory,
  };
}

// ---------------------------------------------------------------- tách chữ / thẻ HTML
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
    const n = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : m;
  });
const encode = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const HAS_LETTER = /\p{L}/u;
const SPLIT = /(<[^>]*>|\r?\n)/;
const IS_SEPARATOR = /^(<[^>]*>|\r?\n)$/;

/** Tách 1 chuỗi thành các phần: thẻ / xuống dòng (giữ nguyên) và chữ (đem dịch) */
function tokenize(text) {
  const html = /<[a-z!/][^>]*>/i.test(text);
  const parts = String(text)
    .split(SPLIT)
    .map((raw) => {
      if (!raw || IS_SEPARATOR.test(raw) || !HAS_LETTER.test(raw)) return { raw };
      const lead = raw.match(/^\s*/)[0];
      const tail = raw.slice(lead.length).match(/\s*$/)[0];
      const core = raw.slice(lead.length, raw.length - tail.length);
      return { raw, lead, tail, text: html ? decode(core) : core };
    });
  return { html, parts };
}

// ---------------------------------------------------------------- bộ dịch
/**
 * @param {object} cfg  { providers: string[], azureKey, azureRegion, deeplKey, googleKey, lingvaInstances: string[],
 *   libreUrl, libreKey, myMemoryEmail, cooldownMs, timeoutMs, budgetMs, fetch?, now?, log? }
 */
export function createTranslator(cfg) {
  const conf = {
    providers: [],
    azureKey: "",
    azureRegion: "",
    deeplKey: "",
    googleKey: "",
    lingvaInstances: [],
    libreUrl: "",
    libreKey: "",
    myMemoryEmail: "",
    cooldownMs: 15 * 60_000,
    timeoutMs: 8_000,
    budgetMs: 15_000,
    ...cfg,
  };
  const doFetch = (...a) => (conf.fetch ?? globalThis.fetch)(...a);
  const now = conf.now ?? Date.now;
  const log = conf.log ?? logger;
  const all = buildProviders(conf);
  const order = (conf.providers.length ? conf.providers : DEFAULT_ORDER)
    .filter((n, i, a) => all[n] && a.indexOf(n) === i)
    .map((n) => all[n])
    .filter((p) => p.enabled);

  const cooldown = new Map(); // tên dịch vụ → thời điểm được dùng lại
  const noPair = new Set(); // "dịch vụ|from|to" không hỗ trợ
  let turn = 0;

  const cache = new Map();
  const CACHE_MAX = 8000;
  const remember = (key, value) => {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, value);
  };

  /** Thứ tự dịch vụ cho 1 lần dịch: nhóm không-key xoay vòng vị trí bắt đầu để chia đều tải */
  function chain() {
    const rot = order.filter((p) => p.rotate);
    const shift = rot.length ? turn++ % rot.length : 0;
    const rotated = [...rot.slice(shift), ...rot.slice(0, shift)];
    let k = 0;
    return order.map((p) => (p.rotate ? rotated[k++] : p));
  }

  function rest(p, err) {
    let until;
    if (err.kind === "quota") until = err.until ?? nextUtcDay(now());
    else if (err.kind === "blocked") until = now() + conf.cooldownMs;
    else until = now() + Math.min(60_000, conf.cooldownMs); // lỗi tạm (mạng, 5xx, quá giờ): nghỉ 1 phút
    cooldown.set(p.name, until);
    log.warn(
      { provider: p.name, reason: err.message, minutes: Math.ceil((until - now()) / 60_000) },
      "translate: dịch vụ tạm nghỉ",
    );
  }

  /** Lấy các đoạn đầu hàng đợi vừa giới hạn của dịch vụ */
  function take(p, pending) {
    const batch = [];
    let size = 0;
    for (const line of pending) {
      if (p.maxLine && line.length > p.maxLine) continue;
      if (batch.length && (batch.length >= p.maxItems || size + line.length > p.maxChars)) break;
      batch.push(line);
      size += line.length + 1;
    }
    return batch;
  }

  /** Dịch danh sách câu (không trùng) from → to; trả Map câu gốc → bản dịch */
  async function translateLines(lines, from, to) {
    const result = new Map();
    let pending = [];
    for (const line of lines) {
      const hit = cache.get(`${from}|${to}|${line}`);
      if (hit !== undefined) result.set(line, hit);
      else pending.push(line);
    }
    let lastProgress = now();
    for (const p of chain()) {
      if (!pending.length) break;
      if ((cooldown.get(p.name) ?? 0) > now() || noPair.has(`${p.name}|${from}|${to}`)) continue;
      const left = () => conf.budgetMs - (now() - lastProgress);
      try {
        if (p.supports && !(await p.supports(from, to, { fetch: doFetch, now }))) {
          noPair.add(`${p.name}|${from}|${to}`);
          continue;
        }
        for (let batch = take(p, pending); batch.length; batch = take(p, pending)) {
          if (left() <= 0) throw fail(`${p.name}: quá thời gian`);
          const signal = AbortSignal.timeout(Math.max(1_000, Math.min(conf.timeoutMs, left())));
          let out;
          try {
            out = await p.translate(batch, from, to, { fetch: doFetch, signal, now });
          } catch (err) {
            if (err instanceof ProviderError) throw err;
            throw fail(`${p.name}: ${err.name === "TimeoutError" ? "quá thời gian" : err.message}`);
          }
          if (!Array.isArray(out) || out.length !== batch.length)
            throw fail(`${p.name}: lệch số đoạn`);
          const done = new Set(batch);
          batch.forEach((line, i) => {
            const value = clean(p.name, out[i], line).trim() || line;
            remember(`${from}|${to}|${line}`, value);
            result.set(line, value);
          });
          pending = pending.filter((l) => !done.has(l));
          lastProgress = now();
        }
      } catch (err) {
        if (err.kind === "unsupported") noPair.add(`${p.name}|${from}|${to}`);
        else rest(p, err instanceof ProviderError ? err : fail(`${p.name}: ${err.message}`));
      }
      if (left() <= 0 && pending.length) break;
    }
    if (pending.length) throw new ApiError(503, BUSY);
    return result;
  }

  return {
    /** texts: mảng chuỗi (chữ thường hoặc HTML). Trả { [lang]: string[] } cùng thứ tự với texts. */
    async translate({ from, to, texts }) {
      const targets = [...new Set(to)].filter((l) => l !== from);
      const docs = texts.map(tokenize);
      const lines = [
        ...new Set(docs.flatMap((d) => d.parts.filter((p) => p.text).map((p) => p.text))),
      ];
      const entries = await Promise.all(
        targets.map(async (lang) => {
          const map = lines.length ? await translateLines(lines, from, lang) : new Map();
          const out = docs.map((d) =>
            d.parts
              .map((p) => {
                if (!p.text) return p.raw;
                const t = map.get(p.text) ?? p.text;
                return p.lead + (d.html ? encode(t) : t) + p.tail;
              })
              .join(""),
          );
          return [lang, out];
        }),
      );
      return Object.fromEntries(entries);
    },
    /** Tên các dịch vụ đang bật theo thứ tự cấu hình (để kiểm tra / log) */
    providers: () => order.map((p) => p.name),
    /** Trạng thái tạm nghỉ (để kiểm tra / log) */
    status: () =>
      order.map((p) => ({ name: p.name, until: Math.max(0, (cooldown.get(p.name) ?? 0) - now()) })),
  };
}

export const translateService = createTranslator(env.translate);
