import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Dịch tự động nội dung CMS giữa en / zh / vi bằng dịch vụ miễn phí (không cần key):
 *   1. Google Translate (endpoint công khai) — chính
 *   2. MyMemory — dự phòng cho đoạn ngắn khi (1) lỗi
 * - Chỉ gọi tới 2 tên miền cố định bên dưới (không nhận URL từ người dùng → không có SSRF).
 * - HTML: chỉ dịch phần CHỮ, giữ nguyên mọi thẻ / thuộc tính / link → bản dịch không thể chèn thẻ mới
 *   (chữ sau khi dịch được escape lại). Nội dung vẫn đi qua bộ lọc HTML khi lưu như bình thường.
 * - Có bộ nhớ đệm trong RAM để không dịch lại cùng một câu.
 */
const GOOGLE = "https://translate.googleapis.com/translate_a/single";
const MYMEMORY = "https://api.mymemory.translated.net/get";
const CODE = { en: "en", vi: "vi", zh: "zh-CN" };
const CHUNK_CHARS = 3500;
const TIMEOUT = 15_000;
const BUSY = "Dịch tự động đang bận, vui lòng thử lại sau ít phút";

const cache = new Map();
const CACHE_MAX = 8000;
const remember = (key, value) => {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, value);
};

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

async function googleBatch(lines, from, to) {
  const res = await fetch(`${GOOGLE}?client=gtx&sl=${CODE[from]}&tl=${CODE[to]}&dt=t`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ q: lines.join("\n") }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = await res.json();
  const out = (data?.[0] ?? [])
    .map((seg) => seg?.[0] ?? "")
    .join("")
    .split("\n")
    .map((s) => s.trim());
  if (out.length !== lines.length) throw new Error("google: lệch số dòng");
  return out;
}

async function myMemory(text, from, to) {
  const url = `${MYMEMORY}?q=${encodeURIComponent(text)}&langpair=${CODE[from]}|${CODE[to]}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (data?.responseStatus !== 200 || typeof out !== "string" || /MYMEMORY WARNING/i.test(out))
    throw new Error("mymemory: hết lượt");
  return out;
}

async function oneByOne(chunk, from, to) {
  const out = [];
  for (const line of chunk) {
    try {
      out.push((await googleBatch([line], from, to))[0]);
    } catch {
      if (line.length > 480) throw new ApiError(503, BUSY);
      try {
        out.push(await myMemory(line, from, to));
      } catch {
        throw new ApiError(503, BUSY);
      }
    }
  }
  return out;
}

/** Dịch danh sách câu (không trùng) from → to; trả Map câu gốc → bản dịch */
async function translateLines(lines, from, to) {
  const result = new Map();
  const todo = [];
  for (const line of lines) {
    const hit = cache.get(`${from}|${to}|${line}`);
    if (hit !== undefined) result.set(line, hit);
    else todo.push(line);
  }
  const chunks = [];
  let cur = [];
  let size = 0;
  for (const line of todo) {
    if (cur.length && size + line.length > CHUNK_CHARS) {
      chunks.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(line);
    size += line.length + 1;
  }
  if (cur.length) chunks.push(cur);

  for (const chunk of chunks) {
    let out;
    try {
      out = await googleBatch(chunk, from, to);
    } catch (err) {
      logger.warn({ err: err.message }, "translate: lỗi dịch theo lô, chuyển sang từng câu");
      out = await oneByOne(chunk, from, to);
    }
    chunk.forEach((line, i) => {
      const value = out[i] || line;
      remember(`${from}|${to}|${line}`, value);
      result.set(line, value);
    });
  }
  return result;
}

export const translateService = {
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
};
