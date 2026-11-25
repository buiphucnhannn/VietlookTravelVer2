import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { reviewRepository, settingRepository } from "../src/repositories/content.repository.js";
import { auditLogRepository } from "../src/repositories/audit-log.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { Review } from "../src/models/review.model.js";
import {
  JOB_KEY,
  _resetPreviewJob,
  mapLang,
  markExisting,
  reviewImportService,
} from "../src/services/review-import.service.js";
import {
  insane,
  reviewStatsService,
  scheduleDailyReviewSync,
} from "../src/services/review-stats.service.js";
import { quotaView, reviewProvider } from "../src/services/review-providers/index.js";
import {
  _resetLimitsCache,
  apifyProvider,
  mapGoogleReviews,
  mapTripadvisorReviews,
  parseLimits,
  usageLimits,
} from "../src/services/review-providers/apify.provider.js";
import { passwordService } from "../src/services/password.service.js";
import { fxService } from "../src/services/payment/fx.service.js";
import { signAccessToken } from "../src/services/token.service.js";

/** Điểm & số lượt đánh giá + lấy đánh giá qua Apify — fetch giả, repository giả, không cần MongoDB / mã thật */
const saved = [];
const stub = (obj, name, fn) => {
  saved.push([obj, name, obj[name]]);
  obj[name] = fn;
};
after(() => {
  for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
});

const TOKEN = "apify_api_TESTtoken0123456789abcdef";
let store = {};
stub(settingRepository, "get", async (key) => store[key] ?? null);
stub(settingRepository, "set", async (key, value) => {
  store[key] = structuredClone(value);
  return { key, value };
});
beforeEach(() => {
  store = {};
  env.reviews.apifyToken = "";
  _resetLimitsCache();
  _resetPreviewJob();
});
afterEach(() => {
  env.reviews.apifyToken = "";
});
const withToken = () => {
  env.reviews.apifyToken = TOKEN;
};
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const tick = () => new Promise((r) => setImmediate(r));

/** fetch giả: trả theo đường dẫn; ghi lại các lần gọi */
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    for (const [match, res] of routes) if (String(url).includes(match)) return res(url, init);
    throw new TypeError(`fetch failed ${url} ${TOKEN}`); // lỗi mạng giả — cố ý kèm mã để kiểm tra không lộ
  };
  fn.calls = calls;
  return fn;
}
const bodyOf = (call) => JSON.parse(call.init.body);

// Mẫu rút gọn theo README các actor trên Apify Store + https://docs.apify.com/api/v2/users-me-limits-get
const G_ACT = "compass~crawler-google-places/run-sync-get-dataset-items";
const TA_ACT = "maxcopell~tripadvisor/run-sync-get-dataset-items";
const G_PLACE =
  (totalScore = 4.8, reviewsCount = 33, extra = {}) =>
  () =>
    json([
      {
        title: "Vietlook Travel",
        totalScore,
        reviewsCount,
        url: "https://www.google.com/maps/place/?cid=12890319484623913190",
        ...extra,
      },
    ]);
const TA_PLACE =
  (rating = 5, numberOfReviews = 94) =>
  () =>
    json([{ id: "27950353", name: "Vietlook Travel", rating, numberOfReviews }]);
const limitsBody = (used = 0.15, max = 5) => ({
  data: {
    monthlyUsageCycle: {
      startAt: "2026-11-10T00:00:00.000Z",
      endAt: "2026-12-10T00:00:00.000Z",
    },
    limits: { maxMonthlyUsageUsd: max, maxMonthlyActorComputeUnits: 50 },
    current: { monthlyUsageUsd: used, monthlyActorComputeUnits: 1.2 },
  },
});
const LIMITS = (used, max) => () => json(limitsBody(used, max));
const OK_ROUTES = (ta = TA_PLACE(), g = G_PLACE()) => [
  [TA_ACT, ta],
  [G_ACT, g],
  ["/users/me/limits", LIMITS()],
];
const noLeak = (x) => assert.ok(!JSON.stringify(x).includes(TOKEN), "lộ mã Apify");

describe("điểm đánh giá — kiểm tra số", () => {
  it("insane(): chặn điểm ngoài 0–5, số lượt không nguyên, số lượt tụt quá 5", () => {
    assert.equal(insane({ count: 93 }, { rating: 5, count: 94 }), "");
    assert.equal(insane({ count: 93 }, { rating: 5, count: 88 }), "");
    assert.match(insane({ count: 93 }, { rating: 5, count: 87 }), /giảm bất thường/);
    assert.match(insane({ count: 93 }, { rating: 7, count: 93 }), /điểm/);
    assert.match(insane({ count: 93 }, { rating: NaN, count: 93 }), /điểm/);
    assert.match(insane({ count: 93 }, { rating: 5, count: NaN }), /số lượt/);
  });
});

describe("điểm đánh giá — dữ liệu cho CMS / website", () => {
  it("chưa lưu gì → số mặc định 5.0 · 93 và 4.7 · 31; chưa cài mã Apify", async () => {
    const d = await reviewStatsService.get();
    assert.equal(d.tripadvisor.count, 93);
    assert.equal(d.google.rating, 4.7);
    assert.equal(d.configured, false);
    assert.equal(d.provider.name, "Apify");
    assert.equal(d.quota, null);
    assert.equal(d.nextAutoAt, null);
    assert.equal(d.running, null);
    assert.deepEqual(Object.keys(d.tripadvisor).sort(), ["count", "rating", "updatedAt", "url"]);
    const pub = await reviewStatsService.publicStats();
    assert.deepEqual(Object.keys(pub.tripadvisor).sort(), ["count", "rating", "url"]);
  });

  it("dữ liệu cũ (khoá mã hoá, mã địa điểm, công tắc) không bao giờ lộ ra", async () => {
    store.reviewStats = {
      tripadvisor: { rating: 5, count: 95, key: "enc:v1:abc", auto: false, locationId: "1" },
      google: { key: "enc:v1:def", placeId: "ChIJ", keyUpdatedBy: "boss" },
    };
    const d = await reviewStatsService.get();
    const dump = JSON.stringify(d);
    assert.equal(d.tripadvisor.count, 95);
    for (const word of ["enc:v1", "locationId", "placeId", "auto", "keyUpdated"])
      assert.ok(!dump.includes(word), word);
  });

  it("có mã: hạn mức tháng (USD), lần tự cập nhật tiếp theo — không có mã trong dữ liệu", async () => {
    withToken();
    const f = fakeFetch(OK_ROUTES());
    const d = await reviewStatsService.get({ fetchImpl: f });
    assert.equal(d.configured, true);
    assert.deepEqual(
      { unit: d.quota.unit, used: d.quota.used, total: d.quota.total, left: d.quota.left },
      { unit: "usd", used: 0.15, total: 5, left: 4.85 },
    );
    assert.equal(d.quota.resetsAt, "2026-12-10T00:00:00.000Z");
    assert.equal(d.quota.canManual, true);
    assert.ok(d.provider.syncCost > 0);
    assert.ok(Date.parse(d.nextAutoAt) > Date.now());
    const limitsCall = f.calls.find((c) => c.url.includes("/users/me/limits"));
    assert.equal(limitsCall.init.headers.authorization, `Bearer ${TOKEN}`);
    assert.ok(!limitsCall.url.includes(TOKEN)); // mã chỉ ở header, không trong URL
    noLeak(d);
  });
});

describe("hạn mức Apify (users/me/limits)", () => {
  it("parseLimits: chỉ lấy USD + ngày đặt lại; thiếu số → null; dùng quá → còn 0", () => {
    assert.deepEqual(parseLimits(limitsBody(1.234, 5)), {
      unit: "usd",
      total: 5,
      used: 1.23,
      left: 3.77,
      resetsAt: "2026-12-10T00:00:00.000Z",
    });
    assert.deepEqual(parseLimits({}), {
      unit: "usd",
      total: null,
      used: null,
      left: null,
      resetsAt: null,
    });
    assert.equal(parseLimits(limitsBody(6, 5)).left, 0);
  });

  it("đệm 10 phút; mã sai báo tiếng Việt, không ném", async () => {
    withToken();
    const f = fakeFetch([["/users/me/limits", LIMITS(1)]]);
    const t0 = Date.now();
    assert.equal((await usageLimits(f, { now: t0 })).left, 4);
    await usageLimits(f, { now: t0 + 9 * 60_000 });
    assert.equal(f.calls.length, 1);
    await usageLimits(f, { now: t0 + 11 * 60_000 });
    assert.equal(f.calls.length, 2);

    _resetLimitsCache();
    const bad = await usageLimits(
      fakeFetch([["/users/me/limits", () => json({ error: { type: "token-not-valid" } }, 401)]]),
    );
    assert.match(bad.error, /không đúng/);
    _resetLimitsCache();
    const net = await usageLimits(fakeFetch([]));
    assert.match(net.error, /Chưa xem được/);
    noLeak([bad, net]);
  });

  it("quotaView: còn < 0,5 USD nhắc nhẹ; giữ ~3 lần cập nhật tự động; hết → không cho bấm", () => {
    const P = apifyProvider;
    const c = P.syncCost;
    assert.equal(reviewProvider(), P); // mặc định REVIEW_STATS_PROVIDER=apify
    assert.equal(quotaView(P, { total: 5, left: 4.85 }, c).low, false);
    const low = quotaView(P, { total: 5, left: 0.3 }, c);
    assert.equal(low.low, true);
    assert.equal(low.canManual, true);
    assert.equal(quotaView(P, { total: 5, left: c * 3 }, c).canManual, false); // < chi phí + 3 lần dự trữ
    assert.equal(quotaView(P, { total: 5, left: 0 }, c).canManual, false);
    assert.equal(quotaView(P, { error: "x" }, c).canManual, true); // không rõ → Apify tự từ chối nếu hết
    assert.equal(quotaView(P, null, c), null); // nhà cung cấp không có API hạn mức → CMS ẩn thanh
  });
});

describe("điểm đánh giá — tự cập nhật qua Apify (fetch giả)", () => {
  it("chưa có APIFY_TOKEN → không gọi mạng, không ghi DB, báo chưa cài mã", async () => {
    const f = fakeFetch([]);
    const r = await reviewStatsService.sync({ fetchImpl: f, notify: () => true });
    assert.equal(r.changed, false);
    assert.equal(r.lastSync.message, "Chưa cài mã Apify trên máy chủ");
    assert.equal(f.calls.length, 0);
    assert.equal(store.reviewStats, undefined);
    await assert.rejects(reviewStatsService.manualSync({ fetchImpl: f }), /Chưa cài mã Apify/);
  });

  it("thành công: đúng actor + input tiết kiệm, mã ở header, cập nhật 2 nguồn, báo website", async () => {
    withToken();
    const f = fakeFetch(OK_ROUTES());
    let notified = 0;
    const r = await reviewStatsService.sync({ fetchImpl: f, notify: () => notified++ });
    assert.equal(r.lastSync.ok, true);
    assert.equal(store.reviewStats.tripadvisor.count, 94);
    assert.equal(store.reviewStats.google.count, 33);
    assert.equal(store.reviewStats.google.rating, 4.8);
    assert.ok(store.reviewStats.google.updatedAt);
    assert.equal(notified, 1);
    assert.equal(r.lastSync.sources.google.message, "4.7 · 31 đánh giá → 4.8 · 33 đánh giá");
    assert.deepEqual(r.lastSync.sources.google.after, { rating: 4.8, count: 33 });

    const g = f.calls.find((c) => c.url.includes(G_ACT));
    const gu = new URL(g.url);
    assert.equal(gu.origin, "https://api.apify.com");
    assert.equal(gu.pathname, `/v2/acts/${G_ACT}`);
    assert.ok(Number(gu.searchParams.get("maxTotalChargeUsd")) > 0);
    assert.equal(g.init.method, "POST");
    assert.equal(g.init.headers.authorization, `Bearer ${TOKEN}`);
    const gi = bodyOf(g);
    assert.deepEqual(gi.startUrls, [{ url: "https://maps.google.com/?cid=12890319484623913190" }]);
    assert.equal(gi.maxReviews, 0);
    assert.equal(gi.maxImages, 0);
    assert.equal(gi.scrapeContacts, false);
    const ti = bodyOf(f.calls.find((c) => c.url.includes(TA_ACT)));
    assert.match(ti.startUrls[0].url, /Attraction_Review-g17733187-d27950353/);
    assert.equal(ti.maxItemsPerQuery, 1);
    assert.equal(f.calls.length, 2);
    for (const c of f.calls) assert.ok(!c.url.includes(TOKEN));
    assert.deepEqual(Object.keys(store.reviewStats).sort(), ["google", "lastSync", "tripadvisor"]);
    noLeak(store);
  });

  it("số lượt dạng chuỗi '1,291' vẫn đọc đúng; không đổi → không báo website", async () => {
    withToken();
    store.reviewStats = {
      tripadvisor: { rating: 5, count: 1291 },
      google: { rating: 4.7, count: 31 },
    };
    const f = fakeFetch(OK_ROUTES(TA_PLACE(5, "1,291"), G_PLACE(4.7, 31)));
    let notified = 0;
    const r = await reviewStatsService.sync({ fetchImpl: f, notify: () => notified++ });
    assert.equal(r.changed, false);
    assert.equal(notified, 0);
    assert.match(r.lastSync.sources.tripadvisor.message, /Không đổi \(5\.0 · 1291/);
  });

  it("số bất thường / mã sai / hết hạn mức / lỗi mạng / dataset rỗng → giữ số cũ, không lộ mã", async () => {
    withToken();
    store.reviewStats = {
      tripadvisor: { rating: 5, count: 93 },
      google: { rating: 4.7, count: 31 },
    };
    const err =
      (status, type, message = "") =>
      () =>
        json({ error: { type, message: `${message} ${TOKEN}` } }, status);
    const r1 = await reviewStatsService.sync({
      fetchImpl: fakeFetch([
        [TA_ACT, TA_PLACE(5, 12)],
        [G_ACT, err(401, "token-not-valid")],
      ]),
      notify: () => true,
    });
    assert.equal(r1.lastSync.ok, false);
    assert.match(r1.lastSync.sources.tripadvisor.message, /giảm bất thường.*giữ số cũ/);
    assert.match(r1.lastSync.sources.google.message, /Mã Apify.*không đúng.*giữ số cũ/);

    const r2 = await reviewStatsService.sync({
      fetchImpl: fakeFetch([
        [TA_ACT, TA_PLACE(9, 93)],
        [G_ACT, err(402, "platform-feature-disabled", "Monthly usage hard limit exceeded")],
      ]),
      notify: () => true,
    });
    assert.match(r2.lastSync.sources.tripadvisor.message, /điểm nhận về không hợp lệ/);
    assert.match(r2.lastSync.sources.google.message, /hết hạn mức Apify/);

    const r3 = await reviewStatsService.sync({ fetchImpl: fakeFetch([]), notify: () => true });
    assert.match(r3.lastSync.sources.google.message, /Không kết nối được Apify/);
    const r4 = await reviewStatsService.sync({
      fetchImpl: fakeFetch([
        [TA_ACT, () => json([])],
        [G_ACT, () => json({}, 408)],
      ]),
      notify: () => true,
    });
    assert.match(r4.lastSync.sources.tripadvisor.message, /không trả về số/);
    assert.match(r4.lastSync.sources.google.message, /chạy quá lâu/);
    assert.equal(store.reviewStats.tripadvisor.count, 93);
    assert.equal(store.reviewStats.google.count, 31);
    noLeak(store);
  });

  it("Cập nhật ngay: chạy nền (trả ngay), đang chạy hiện trong dữ liệu, chờ 5 phút giữa 2 lần", async () => {
    withToken();
    let release;
    const gate = new Promise((r) => {
      release = r;
    });
    const f = fakeFetch([
      [TA_ACT, async () => (await gate, TA_PLACE()())],
      [G_ACT, async () => (await gate, G_PLACE()())],
      ["/users/me/limits", LIMITS()],
    ]);
    const { promise, already } = await reviewStatsService.manualSync({
      fetchImpl: f,
      by: "boss",
      notify: () => true,
    });
    assert.equal(already, false);
    const mid = await reviewStatsService.get({ fetchImpl: f });
    assert.equal(mid.running.manual, true);
    const again = await reviewStatsService.manualSync({ fetchImpl: f, notify: () => true });
    assert.equal(again.already, true); // bấm lại khi đang chạy → không chạy thêm
    release();
    const r = await promise;
    assert.equal(r.lastSync.manual, true);
    assert.equal(r.lastSync.by, "boss");
    assert.equal((await reviewStatsService.get({ fetchImpl: f })).running, null);
    await assert.rejects(
      reviewStatsService.manualSync({ fetchImpl: f, notify: () => true }),
      (e) => e.statusCode === 429 && /bấm lại sau \d+ phút/.test(e.message),
    );

    store.reviewStats.lastSync.at = new Date(Date.now() - 6 * 60_000).toISOString();
    _resetLimitsCache();
    const empty = fakeFetch([["/users/me/limits", LIMITS(5, 5)]]);
    await assert.rejects(
      reviewStatsService.manualSync({ fetchImpl: empty, notify: () => true }),
      /hết hạn mức Apify tháng này/,
    );
    assert.equal(empty.calls.filter((c) => c.url.includes("/acts/")).length, 0);
  });

  it("lịch hằng ngày: chạy bù khi lâu (>24 giờ) chưa cập nhật, lỗi không làm sập", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let runs = 0;
    const stop = scheduleDailyReviewSync({
      run: async () => {
        runs++;
        throw new Error("boom");
      },
      clock: () => Date.now(),
      hour: 6,
      lastSyncAt: async () => new Date(Date.now() - 25 * 3600_000).toISOString(),
    });
    t.mock.timers.tick(60_000);
    await tick();
    await tick();
    assert.equal(runs, 1);
    stop();
  });

  it("lịch hằng ngày: vừa cập nhật (<24 giờ) → không chạy bù", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let runs = 0;
    const stop = scheduleDailyReviewSync({
      run: async () => runs++,
      clock: () => Date.now(),
      hour: 6,
      lastSyncAt: async () => new Date(Date.now() - 3 * 3600_000).toISOString(),
    });
    t.mock.timers.tick(60_000);
    await tick();
    await tick();
    assert.equal(runs, 0);
    stop();
  });
});

describe("lấy đánh giá qua Apify — chạy không đồng bộ (fetch giả)", () => {
  // Mẫu THẬT lấy từ Apify 25/11/2026 (đã thay tên / mã người viết / lời khách — không có dữ liệu cá nhân)
  const G_ITEMS = JSON.parse(
    readFileSync(new URL("./fixtures/apify-google-reviews.json", import.meta.url), "utf8"),
  );
  const TA_ITEMS = JSON.parse(
    readFileSync(new URL("./fixtures/apify-tripadvisor-reviews.json", import.meta.url), "utf8"),
  );
  const G_START = "/acts/compass~crawler-google-places/runs?";
  const TA_START = "/acts/maxcopell~tripadvisor-reviews/runs?";
  const started = (id) => () =>
    json({ data: { id, status: "READY", defaultDatasetId: `${id}-ds` } }, 201);
  // Dạng trả về của GET /actor-runs/<id> (rút gọn từ lần chạy thật)
  const runInfo = (id, status, { events = {}, prices = {}, usage = 0.0001 } = {}) => ({
    data: {
      id,
      status,
      statusMessage: status === "SUCCEEDED" ? "Finished!" : `run ${status} ${TOKEN}`,
      startedAt: "2026-11-25T08:00:08.000Z",
      finishedAt: "2026-11-25T08:00:18.000Z",
      defaultDatasetId: `${id}-ds`,
      usageTotalUsd: usage,
      chargedEventCounts: events,
      pricingInfo: {
        pricingModel: "PAY_PER_EVENT",
        pricingPerEvent: {
          actorChargeEvents: Object.fromEntries(
            Object.entries(prices).map(([k, eventPriceUsd]) => [k, { eventPriceUsd }]),
          ),
        },
      },
    },
  });
  const G_DONE = runInfo("g-run", "SUCCEEDED", { usage: 0.0162 });
  const TA_DONE = runInfo("ta-run", "SUCCEEDED", {
    events: { "apify-actor-start": 2, "review-scraped": 10 },
    prices: { "apify-actor-start": 0.00005, "review-scraped": 0.005 },
  });
  /** fetch giả cho Apify: trạng thái lần chạy / dataset đổi được giữa các lần hỏi */
  function apify({
    g = () => json(G_DONE),
    ta = () => json(TA_DONE),
    gItems = () => json(G_ITEMS),
    gStart,
    taStart,
    used,
  } = {}) {
    return fakeFetch([
      ["/users/me/limits", LIMITS(used)],
      [G_START, gStart ?? started("g-run")],
      [TA_START, taStart ?? started("ta-run")],
      ["/actor-runs/g-run", () => g()],
      ["/actor-runs/ta-run", () => ta()],
      ["/datasets/g-run-ds/items", () => gItems()],
      ["/datasets/ta-run-ds/items", () => json(TA_ITEMS)],
    ]);
  }
  let T;
  const clock = () => T;
  const later = (ms = 4000) => {
    T += ms;
  };
  const status = (f) => reviewImportService.previewStatus({ fetchImpl: f, now: clock });
  const start = (f) => reviewImportService.startPreview({ fetchImpl: f, now: clock });
  const fresh = () => {
    _resetPreviewJob();
    _resetLimitsCache();
    store = {};
  };
  let filters;
  beforeEach(() => {
    T = Date.parse("2026-11-25T08:00:00.000Z");
    filters = [];
    stub(reviewRepository, "find", async (filter) => {
      filters.push(filter);
      return [{ source: "tripadvisor", name: "Traveller B", date: "2026-11-05", text: "x" }];
    });
  });

  it("chuẩn hoá mẫu thật: lời gốc, tên, ngày giờ VN, ngôn ngữ, link — không mang mã / ảnh người viết", () => {
    const g = mapGoogleReviews(G_ITEMS);
    assert.equal(g.length, 4);
    assert.deepEqual(
      { ...g[0] },
      {
        source: "google",
        name: "Guest A",
        title: "",
        text: "Tour lead was late",
        rating: 1,
        date: "2026-11-23",
        url: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sreview-1",
        language: "vi",
      },
    );
    assert.equal(g[1].text, ""); // chỉ chấm sao → service bỏ
    assert.equal(g[2].text, "导游很好，车很干净"); // không lấy bản dịch
    assert.equal(g[2].language, "zh"); // zh-Hans → zh
    const ta = mapTripadvisorReviews(TA_ITEMS);
    assert.deepEqual(
      { ...ta[2] },
      {
        source: "tripadvisor",
        name: "旅客 C",
        title: "很好",
        text: "非常满意，导游中文说得很好",
        rating: 5,
        date: "2026-10-02",
        url: "https://www.tripadvisor.com/ShowUserReviews-g17733187-d27950353-rta3-Vietlook_Travel-Ha_Dong_Hanoi.html",
        language: "zh",
      },
    );
    const out = JSON.stringify([g, ta]);
    for (const leak of ["reviewer-", "user-1", "googleusercontent", "avatar", "Profile"])
      assert.ok(!out.includes(leak), leak);
    assert.equal(mapTripadvisorReviews(Array(15).fill(TA_ITEMS[0])).length, 10);
  });

  it("thành công: bắt đầu trả ngay, hỏi lại đến khi xong; máy chủ khởi động lại giữa chừng vẫn lấy tiếp", async () => {
    withToken();
    let gState = "RUNNING";
    const f = apify({ g: () => json(gState === "RUNNING" ? runInfo("g-run", "RUNNING") : G_DONE) });
    assert.equal((await status(f)).status, "idle");
    const s1 = await start(f);
    assert.equal(s1.status, "running");
    assert.deepEqual(s1.pending.sort(), ["google", "tripadvisor"]);
    // bắt đầu = POST /runs (không chờ), đúng input tiết kiệm, trần chi phí, mã chỉ ở header
    const gCall = f.calls.find((c) => c.url.includes(G_START));
    const taCall = f.calls.find((c) => c.url.includes(TA_START));
    assert.equal(gCall.init.method, "POST");
    assert.match(gCall.url, /timeout=120/);
    assert.match(gCall.url, /maxTotalChargeUsd=0\.5/);
    assert.match(taCall.url, /maxTotalChargeUsd=0\.1/);
    assert.equal(bodyOf(gCall).maxReviews, 20);
    assert.equal(bodyOf(gCall).reviewsSort, "newest");
    assert.equal(bodyOf(taCall).maxItemsPerQuery, 10);
    assert.equal(bodyOf(taCall).disableMachineTranslations, true);
    assert.equal(gCall.init.headers.authorization, `Bearer ${TOKEN}`);
    assert.ok(f.calls.every((c) => !c.url.includes(TOKEN)));
    assert.ok(!f.calls.some((c) => c.url.includes("run-sync")));
    // lần lấy lưu trong MongoDB (cài đặt), không chỉ trong bộ nhớ
    assert.equal(store[JOB_KEY].status, "running");
    assert.equal(store[JOB_KEY].runs.google.runId, "g-run");

    later();
    const s2 = await status(f);
    assert.equal(s2.status, "running");
    assert.deepEqual(s2.pending, ["google"]); // Tripadvisor xong trước
    assert.equal(store[JOB_KEY].runs.tripadvisor.state, "done");

    _resetPreviewJob(); // giả lập máy chủ khởi động lại (mất bộ nhớ) — lần lấy vẫn còn trong DB
    gState = "SUCCEEDED";
    later();
    const s3 = await status(f);
    assert.equal(s3.status, "done");
    assert.deepEqual(s3.result.counts, { tripadvisor: 3, google: 3 }); // bỏ 1 đánh giá chỉ chấm sao
    assert.deepEqual(s3.result.errors, {});
    assert.deepEqual(
      s3.result.items.map((x) => [x.source, x.name, x.exists]),
      [
        ["tripadvisor", "Traveller A", false],
        ["tripadvisor", "Traveller B", true],
        ["tripadvisor", "旅客 C", false],
        ["google", "Guest A", false],
        ["google", "客人 C", false],
        ["google", "Guest D", false],
      ],
    );
    // Nguyên nhân lỗi production: { source: { $in } } bị sanitizeFilter bọc $eq → CastError → mất cả kết quả.
    // Bộ lọc phải qua được bước kiểm tra của Mongoose khi sanitizeFilter bật.
    assert.equal(filters.length, 1);
    const prev = mongoose.get("sanitizeFilter");
    mongoose.set("sanitizeFilter", true);
    try {
      const q = Review.find(filters[0]);
      q._castConditions();
      assert.ok(!q.error());
      const old = Review.find({ source: { $in: ["google"] } });
      old._castConditions();
      assert.equal(old.error()?.name, "CastError"); // truy vấn cũ — đúng lỗi đã gặp trên production
    } finally {
      mongoose.set("sanitizeFilter", prev);
    }
    noLeak(s3);
    assert.ok(!JSON.stringify(s3).includes("g-run")); // CMS không thấy mã lần chạy
    // mở lại hộp: trả kết quả đã lưu, không gọi Apify nữa
    const n = f.calls.length;
    later(60_000);
    assert.equal((await status(f)).status, "done");
    assert.equal(f.calls.length, n);
    // quá 12 giờ → về trạng thái ban đầu
    later(13 * 3600_000);
    assert.equal((await status(f)).status, "idle");
  });

  it("đang chạy: bấm lại không tốn thêm; hỏi dồn dập → mỗi lần chạy chỉ hỏi Apify ~3 giây/lần", async () => {
    withToken();
    const f = apify({
      g: () => json(runInfo("g-run", "RUNNING")),
      ta: () => json(runInfo("ta-run", "RUNNING")),
    });
    await start(f);
    const again = await start(f);
    assert.equal(again.status, "running");
    assert.equal(f.calls.filter((c) => c.url.includes("/runs?")).length, 2);
    const polls = () => f.calls.filter((c) => c.url.includes("/actor-runs/")).length;
    const n = polls();
    later();
    await Promise.all([status(f), status(f), status(f)]);
    await status(f);
    assert.equal(polls() - n, 2); // 1 lần / nền tảng
    later();
    await status(f);
    assert.equal(polls() - n, 4);
  });

  it("1 nền tảng lỗi (hết hạn mức khi bắt đầu / lần chạy lỗi) → nền tảng kia vẫn có kết quả, câu báo riêng", async () => {
    withToken();
    const f = apify({
      taStart: () =>
        json(
          {
            error: {
              type: "platform-feature-disabled",
              message: `Monthly usage hard limit exceeded ${TOKEN}`,
            },
          },
          402,
        ),
    });
    const s1 = await start(f);
    assert.deepEqual(s1.pending, ["google"]);
    later();
    const s2 = await status(f);
    assert.equal(s2.status, "done");
    assert.match(
      s2.result.errors.tripadvisor,
      /hết hạn mức Apify tháng này — thử lại khi sang chu kỳ mới/,
    );
    assert.deepEqual(s2.result.counts, { tripadvisor: 0, google: 3 });
    assert.equal(s2.result.items.length, 3);
    noLeak(s2);
    noLeak(store);

    fresh();
    const f2 = apify({
      g: () => json(runInfo("g-run", "FAILED", { usage: 0.004 })),
      gItems: () => json([]),
    });
    await start(f2);
    later();
    const s3 = await status(f2);
    assert.equal(s3.status, "done");
    assert.match(s3.result.errors.google, /không đọc được/);
    assert.equal(s3.result.counts.tripadvisor, 3);
    noLeak(s3);
    noLeak(store);
  });

  it("cả 2 không bắt đầu được → báo từng nền tảng ngay (không còn câu chung chung)", async () => {
    withToken();
    const f = apify({
      gStart: () => json({ error: { type: "rate-limit-exceeded" } }, 429),
      taStart: () => json({ error: { type: "record-not-found" } }, 404),
    });
    const s = await start(f);
    assert.equal(s.status, "done");
    assert.match(s.result.errors.google, /bận/);
    assert.match(s.result.errors.tripadvisor, /Không tìm thấy công cụ/);
    assert.deepEqual(s.result.items, []);
  });

  it("hết giờ / mất dấu / lỗi mạng khi hỏi: báo 'chạy quá lâu', lỗi tạm thời thì hỏi lại", async () => {
    withToken();
    let gRes = () => {
      throw new TypeError(`fetch failed ${TOKEN}`);
    };
    const f = apify({
      g: () => gRes(),
      ta: () => json(runInfo("ta-run", "RUNNING")),
      gItems: () => json([]), // hết giờ khi chưa lấy được gì
    });
    await start(f);
    later();
    assert.equal((await status(f)).status, "running"); // lỗi mạng khi hỏi → chưa kết luận
    assert.equal(store[JOB_KEY].runs.google.state, "running");
    gRes = () => json(runInfo("g-run", "TIMED-OUT"));
    later();
    const s1 = await status(f);
    assert.deepEqual(s1.pending, ["tripadvisor"]);
    assert.match(store[JOB_KEY].runs.google.error, /chạy quá lâu nên đã dừng/);
    // Tripadvisor kẹt "đang chạy" quá 6 phút → dừng chờ, trả phần đã có
    later(7 * 60_000);
    const s2 = await status(f);
    assert.equal(s2.status, "done");
    assert.match(s2.result.errors.tripadvisor, /chạy quá lâu/);
    assert.match(s2.result.errors.google, /chạy quá lâu/);
    noLeak(store);
  });

  it("chỉ có đánh giá chấm sao → báo rõ; chưa cài mã / không đủ hạn mức → chặn trước, không chạy", async () => {
    withToken();
    const noText = [
      { ...G_ITEMS[0], reviews: G_ITEMS[0].reviews.map((r) => ({ ...r, text: "" })) },
    ];
    const f = apify({ gItems: () => json(noText) });
    await start(f);
    later();
    const s = await status(f);
    assert.match(s.result.errors.google, /chỉ chấm sao/);
    assert.equal(s.result.counts.google, 0);

    fresh();
    const poor = apify({ used: 4.95 });
    await assert.rejects(start(poor), /giữ lại cho cập nhật tự động/);
    assert.ok(!poor.calls.some((c) => c.url.includes("/runs?")));
    _resetLimitsCache();
    const none = apify({ used: 5 });
    await assert.rejects(start(none), /Đã dùng hết hạn mức Apify tháng này/);
    assert.equal((await status(none)).status, "idle");

    env.reviews.apifyToken = "";
    await assert.rejects(start(apify()), /Chưa cài mã Apify/);
    assert.deepEqual(await reviewImportService.sources(), {
      tripadvisor: false,
      google: false,
      provider: "Apify",
      cost: 0,
      quota: null,
    });
    withToken();
    _resetLimitsCache();
    const src = await reviewImportService.sources({ fetchImpl: apify() });
    assert.equal(src.google, true);
    assert.equal(src.cost, 0.07); // ước tính ≈ đo thật 0,066 USD
  });

  it("mapLang + đánh dấu Đã có (cùng nguồn + tên + ngày hoặc 40 ký tự đầu)", () => {
    assert.equal(mapLang("vi"), "vi");
    assert.equal(mapLang("zh-Hant"), "zh");
    assert.equal(mapLang("fr"), "other");
    assert.equal(mapLang(""), "");
    const items = [
      { source: "google", name: "Lin", date: "2026-09-01", text: "A" },
      {
        source: "google",
        name: "Bob",
        date: "",
        text: "Same beginning of the text, long enough for 40 chars",
      },
      { source: "tripadvisor", name: "Lin", date: "2026-09-01", text: "A" },
    ];
    const existing = [
      { source: "google", name: " lin ", date: "2026-09-01", text: "x" },
      {
        source: "google",
        name: "Bob",
        date: "2025-01-01",
        text: "Same beginning of the text, long enough for 40 chars!!",
      },
    ];
    assert.deepEqual(
      markExisting(items, existing).map((x) => x.exists),
      [true, true, false],
    );
  });
});

describe("điểm đánh giá — quyền truy cập API", () => {
  const app = createApp();
  const user = (role, permissions = {}) => ({
    _id: `64b7f0c2a1b2c3d4e5f6e0${role === "admin" ? "01" : "02"}`,
    username: role,
    role,
    isActive: true,
    tokenVersion: 0,
    permissions,
  });
  const cookie = (u) => `vl_at=${signAccessToken(u)}`;

  it("trang công khai /public/site có reviewStats, không gọi Apify, không có dữ liệu cũ", async () => {
    store.reviewStats = { tripadvisor: { key: "enc:v1:secret", count: 94 } };
    const res = await request(app).get("/api/v1/public/site");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.reviewStats.tripadvisor.count, 94);
    assert.ok(!JSON.stringify(res.body).includes("enc:v1"));
  });

  it("theo quyền Đánh giá: xem số = xem, “Cập nhật ngay” = sửa; PUT đã bỏ", async () => {
    const admin = user("admin");
    const editor = user("editor", { reviews: "full" });
    stub(userRepository, "findById", async (id) => (String(id) === admin._id ? admin : editor));
    stub(auditLogRepository, "create", async () => ({}));
    const hit = (method, path) => {
      const agent = request(app);
      return agent[method](path)
        .set("Cookie", cookie(editor))
        .set("X-Requested-With", "fetch")
        .send({});
    };
    const GET = ["get", "/api/v1/settings/review-stats"];
    const SYNC = ["post", "/api/v1/settings/review-stats/sync"];
    for (const [method, path] of [GET, SYNC]) {
      const anon = await request(app)[method](path).set("X-Requested-With", "fetch");
      assert.equal(anon.status, 401, `${method} ${path}`);
    }
    try {
      // không có quyền Đánh giá → chặn cả 2
      editor.permissions = { tours: "full" };
      assert.equal((await hit(...GET)).status, 403);
      assert.equal((await hit(...SYNC)).status, 403);
      // chỉ xem → xem được số + hạn mức, không bấm cập nhật (tốn hạn mức Apify)
      editor.permissions = { reviews: "view" };
      assert.equal((await hit(...GET)).status, 200);
      assert.equal((await hit(...SYNC)).status, 403);
      // sửa → bấm được (chưa có mã Apify → 400 báo rõ, không gọi gì)
      editor.permissions = { reviews: "edit" };
      assert.equal((await hit(...SYNC)).status, 400);
    } finally {
      editor.permissions = { reviews: "full" };
    }
    const put = await request(app)
      .put("/api/v1/settings/review-stats")
      .set("Cookie", cookie(admin))
      .set("X-Requested-With", "fetch")
      .send({});
    assert.equal(put.status, 404);
    const ok = await request(app).get("/api/v1/settings/review-stats").set("Cookie", cookie(admin));
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.configured, false);
    // chưa có mã → "Cập nhật ngay" báo rõ, không gọi gì
    const sync = await request(app)
      .post("/api/v1/settings/review-stats/sync")
      .set("Cookie", cookie(admin))
      .set("X-Requested-With", "fetch");
    assert.equal(sync.status, 400);
    assert.match(sync.body.error.message, /Chưa cài mã Apify/);
    // lấy đánh giá: nhân viên có quyền Đánh giá xem được máy chủ đã cấu hình chưa (true / false)
    const src = await request(app)
      .get("/api/v1/admin/reviews/import/sources")
      .set("Cookie", cookie(editor));
    assert.equal(src.status, 200);
    assert.deepEqual(src.body.data, {
      tripadvisor: false,
      google: false,
      provider: "Apify",
      cost: 0,
      quota: null,
    });
    // trạng thái lần lấy đọc từ MongoDB (route bất đồng bộ) — chưa lấy lần nào → idle
    const prev = await request(app)
      .get("/api/v1/admin/reviews/import/preview")
      .set("Cookie", cookie(editor));
    assert.equal(prev.status, 200);
    assert.deepEqual(prev.body.data, { status: "idle" });
    // bắt đầu lấy (tốn hạn mức) cần quyền sửa: chỉ xem → 403; sửa → tới bước kiểm tra cấu hình (400)
    try {
      editor.permissions = { reviews: "view" };
      assert.equal((await hit("post", "/api/v1/admin/reviews/import/preview")).status, 403);
      editor.permissions = { reviews: "edit" };
      const start = await hit("post", "/api/v1/admin/reviews/import/preview");
      assert.equal(start.status, 400);
      assert.match(start.body.error.message, /Apify/);
    } finally {
      editor.permissions = { reviews: "full" };
    }
  });
});

describe("khoá bí mật 9Pay — xác nhận mật khẩu, nhật ký, không lộ khoá", () => {
  const app = createApp();
  const PASSWORD = "Admin-Pass-2026!";
  const admin = {
    _id: "64b7f0c2a1b2c3d4e5f6e0a1",
    username: "boss",
    role: "admin",
    isActive: true,
    tokenVersion: 0,
    permissions: {},
    failedLoginCount: 0,
    lockUntil: null,
  };
  const cookie = `vl_at=${signAccessToken(admin)}`;
  let audits = [];
  let fails = 0;
  let lockNext = false;
  const put = (path, body) =>
    request(app)
      .put(`/api/v1/settings/${path}`)
      .set("Cookie", cookie)
      .set("X-Requested-With", "fetch")
      .send(body);

  beforeEach(async () => {
    audits = [];
    fails = 0;
    lockNext = false;
    admin.passwordHash ??= await passwordService.hash(PASSWORD);
    fxService._reset({ rate: 25700, source: "vietcombank", fetchedAt: new Date().toISOString() });
    stub(userRepository, "findById", async () => admin);
    stub(userRepository, "findByIdWithPassword", async () => admin);
    stub(userRepository, "resetFailedLogins", async () => ({}));
    stub(userRepository, "registerFailedLogin", async () => {
      fails++;
      return lockNext
        ? { ...admin, lockUntil: new Date(Date.now() + 60_000) }
        : { ...admin, failedLoginCount: fails };
    });
    stub(auditLogRepository, "create", async (e) => {
      audits.push(e);
      return e;
    });
  });
  const flush = () => new Promise((r) => setImmediate(r));
  const base = { enabled: false, merchantKey: "", accountName: "VL", depositPercent: 100 };
  const SECRET = "9pay-Secret-Value-XYZ";

  it("đổi mã thiếu / sai mật khẩu → báo lỗi tiếng Việt, không lưu; sai được tính vào khoá tài khoản", async () => {
    const none = await put("payment", { ...base, merchantKey: "MERCH01", secretKey: SECRET });
    assert.equal(none.status, 400);
    assert.equal(none.body.error.code, "REAUTH_REQUIRED");
    assert.equal(none.body.error.details[0].field, "body.confirmPassword");
    assert.match(none.body.error.message, /Nhập mật khẩu của bạn để xác nhận/);

    const wrong = await put("payment", {
      ...base,
      merchantKey: "MERCH01",
      secretKey: SECRET,
      confirmPassword: "nope",
    });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.error.code, "REAUTH_FAILED");
    assert.match(wrong.body.error.message, /Mật khẩu không đúng/);
    assert.equal(fails, 1);
    await flush();
    assert.ok(audits.some((a) => a.action === "auth.reauth_failed"));

    lockNext = true;
    const locked = await put("payment", {
      ...base,
      merchantKey: "MERCH01",
      secretKey: SECRET,
      confirmPassword: "nope",
    });
    assert.equal(locked.status, 423);
    await flush();
    assert.ok(audits.some((a) => a.action === "auth.locked"));
    assert.ok(!JSON.stringify(audits).includes("nope"));
  });

  it("đổi mã cần mật khẩu; chỉ đổi tỷ lệ cọc thì không; nhật ký không có mã", async () => {
    const ok1 = await put("payment", { ...base, depositPercent: 30 });
    assert.equal(ok1.status, 200);

    audits = [];
    const res = await put("payment", {
      ...base,
      merchantKey: "MERCH01",
      secretKey: SECRET,
      confirmPassword: PASSWORD,
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers["cache-control"], "no-store");
    assert.equal(res.body.data.secretKeySet, true);
    assert.equal(res.body.data.keyInfo.secretKey.by, "boss");
    assert.ok(!JSON.stringify(res.body).includes(SECRET));
    await flush();
    const secrets = audits.filter((a) => a.action === "settings.secret");
    assert.deepEqual(
      secrets.map((a) => a.meta.key),
      ["9pay.merchantKey", "9pay.secretKey"],
    );
    assert.equal(secrets[1].meta.name, "Mã bí mật 9Pay (Secret Key)");
    const dump = JSON.stringify(audits);
    assert.ok(!dump.includes(SECRET) && !dump.includes(PASSWORD));

    const clear = await put("payment", {
      ...base,
      merchantKey: "MERCH01",
      clearSecretKey: true,
      confirmPassword: PASSWORD,
    });
    assert.equal(clear.status, 200);
    assert.equal(clear.body.data.secretKeySet, false);
  });
});
