#!/usr/bin/env node
/**
 * "Làm nóng" bộ nhớ đệm sau mỗi lần deploy.
 *
 * Lúc build chỉ dựng sẵn ~450 trang quan trọng (deploy nhanh). Các trang tour / bài viết còn lại
 * được dựng ở lượt xem đầu tiên rồi lưu lại. Script này đi trước khách thật: đọc sitemap.xml,
 * mở lần lượt mọi trang (cả 3 ngôn ngữ) để mọi trang đều có sẵn trong bộ nhớ đệm.
 *
 * Dùng:  node scripts/warm-cache.mjs https://vietlooktravel.com
 *        (hoặc đặt biến WARM_URL; mặc định http://localhost:3000)
 * Tuỳ chọn: WARM_CONCURRENCY (mặc định 4) — số trang mở cùng lúc, để thấp cho nhẹ máy chủ.
 */
const base = (process.argv[2] || process.env.WARM_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const concurrency = Math.max(1, Number(process.env.WARM_CONCURRENCY) || 4);
const TIMEOUT = 60_000;

async function get(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "VietlookCacheWarmer/1.0", accept: "text/html,application/xml" },
    });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

const sitemap = await get(`${base}/sitemap.xml`).catch((e) => ({
  status: e.cause?.code || e.message,
}));
if (sitemap.status !== 200) {
  console.error(`Không đọc được sitemap (${sitemap.status}) tại ${base}/sitemap.xml`);
  process.exit(1);
}

// Lấy mọi <loc> và link ngôn ngữ khác (hreflang), đổi tên miền về địa chỉ đang làm nóng
const raw = [
  ...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g),
  ...sitemap.body.matchAll(/hreflang="(?!x-default)[^"]+"\s+href="([^"]+)"/g),
].map((m) => m[1].trim());
const urls = [
  ...new Set(
    raw.map((u) => {
      try {
        const { pathname, search } = new URL(u);
        return `${base}${pathname}${search}`;
      } catch {
        return null;
      }
    }),
  ),
].filter(Boolean);

console.log(`Làm nóng ${urls.length} trang tại ${base} (mỗi lượt ${concurrency} trang)…`);
const started = Date.now();
let done = 0;
const failed = [];
const queue = [...urls];

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const url = queue.shift();
      try {
        const { status } = await get(url);
        if (status >= 400) failed.push(`${status} ${url}`);
      } catch (e) {
        failed.push(`${e.name === "AbortError" ? "quá thời gian" : e.message} ${url}`);
      }
      done += 1;
      if (done % 100 === 0) console.log(`  ${done}/${urls.length}`);
    }
  }),
);

const secs = Math.round((Date.now() - started) / 1000);
console.log(`Xong ${done - failed.length}/${urls.length} trang trong ${secs}s.`);
if (failed.length) {
  console.log(`${failed.length} trang lỗi:`);
  failed.slice(0, 30).forEach((f) => console.log("  " + f));
}
