import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { reviewRepository, settingRepository } from "../src/repositories/content.repository.js";
import { auditLogRepository } from "../src/repositories/audit-log.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import {
  fetchGoogleReviews,
  fetchTripadvisorReviews,
  mapLang,
  markExisting,
  reviewImportService,
} from "../src/services/review-import.service.js";
import {
  GOOGLE_MAPS_CID,
  NO_KEY_MESSAGE,
  insane,
  reviewStatsService,
  scheduleDailyReviewSync,
} from "../src/services/review-stats.service.js";
import { passwordService } from "../src/services/password.service.js";
import { fxService } from "../src/services/payment/fx.service.js";
import { signAccessToken } from "../src/services/token.service.js";
import { encryptSecret } from "../src/utils/crypto.js";
import { reviewStatsSettingsSchema } from "../src/validators/content.validator.js";

/** Điểm & số lượt đánh giá + lấy đánh giá từ API — fetch giả, repository giả, không cần MongoDB / key thật */
const saved = [];
const stub = (obj, name, fn) => {
  saved.push([obj, name, obj[name]]);
  obj[name] = fn;
};
after(() => {
  for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
});

let store = {};
stub(settingRepository, "get", async (key) => store[key] ?? null);
stub(settingRepository, "set", async (key, value) => {
  store[key] = structuredClone(value);
  return { key, value };
});
beforeEach(() => {
  store = {};
});

// Khoá chỉ lấy từ CMS (đã mã hoá trong kho cài đặt) — không còn biến môi trường dự phòng
const REAUTH_OK = { reauth: async () => {} }; // controller xác nhận mật khẩu; test service bỏ qua bước này
/** Gắn khoá (mã hoá) vào cài đặt đã lưu */
const withKeys = (stored = {}, { ta, g } = {}) => ({
  ...stored,
  tripadvisor: { ...stored.tripadvisor, ...(ta && { key: encryptSecret(ta) }) },
  google: { ...stored.google, ...(g && { key: encryptSecret(g) }) },
});
const BOTH = { ta: "ta-secret-key-1234", g: "g-secret-key-9876" };
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

/** fetch giả: trả theo host; ghi lại các lần gọi */
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    for (const [match, res] of routes) if (String(url).includes(match)) return res(url, init);
    throw new TypeError("fetch failed");
  };
  fn.calls = calls;
  return fn;
}
const TA_OK = () =>
  json({ rating: "5.0", num_reviews: "94", web_url: "https://www.tripadvisor.com/x" });
const G_OK = () =>
  json({
    rating: 4.8,
    userRatingCount: 33,
    googleMapsUri: `https://maps.google.com/?cid=${GOOGLE_MAPS_CID}`,
  });

const manualBody = {
  tripadvisor: { rating: 5, count: 93, url: "https://www.tripadvisor.com/a", auto: false },
  google: { rating: 4.7, count: 31, url: "https://maps.google.com/?cid=1", auto: false },
};

describe("điểm đánh giá — kiểm tra dữ liệu", () => {
  it("nhận số hợp lệ, làm tròn 1 chữ số, mặc định mã địa điểm Tripadvisor", () => {
    const d = reviewStatsSettingsSchema.parse({
      tripadvisor: { rating: "4.86", count: "93", url: "https://t.com/x" },
      google: { rating: 4.7, count: 31, url: "https://g.com/x" },
    });
    assert.equal(d.tripadvisor.rating, 4.9);
    assert.equal(d.tripadvisor.count, 93);
    assert.equal(d.tripadvisor.locationId, "27950353");
    assert.equal(d.tripadvisor.auto, true);
    assert.equal(d.google.placeId, "");
  });

  it("ô trống được phép (service quyết theo chế độ); số sai / link sai báo tiếng Việt", () => {
    const ok = reviewStatsSettingsSchema.safeParse({
      tripadvisor: { rating: "", count: "", url: "https://t.com" },
      google: { rating: null, url: "https://g.com" },
    });
    assert.equal(ok.success, true);
    const bad = reviewStatsSettingsSchema.safeParse({
      tripadvisor: { rating: 6, count: -1, url: "http://t.com", locationId: "d123" },
      google: { rating: 4, count: 1.5, url: "https://g.com", placeId: "x y" },
    });
    assert.equal(bad.success, false);
    const msgs = bad.error.issues.map((i) => i.message).join(" | ");
    assert.match(msgs, /Tripadvisor: điểm là số từ 0 đến 5/);
    assert.match(msgs, /không được âm/);
    assert.match(msgs, /https:\/\//);
    assert.match(msgs, /chỉ gồm chữ số/);
    assert.match(msgs, /Google: số lượt đánh giá là số nguyên/);
    assert.match(msgs, /Place ID/);
  });

  it("insane(): chặn điểm ngoài 0–5, số lượt không nguyên, số lượt tụt quá 5", () => {
    assert.equal(insane({ count: 93 }, { rating: 5, count: 94 }), "");
    assert.equal(insane({ count: 93 }, { rating: 5, count: 88 }), "");
    assert.match(insane({ count: 93 }, { rating: 5, count: 87 }), /giảm bất thường/);
    assert.match(insane({ count: 93 }, { rating: 7, count: 93 }), /điểm/);
    assert.match(insane({ count: 93 }, { rating: NaN, count: 93 }), /điểm/);
    assert.match(insane({ count: 93 }, { rating: 5, count: NaN }), /số lượt/);
  });
});

describe("điểm đánh giá — lưu & khoá API", () => {
  it("chưa lưu gì → số mặc định 5.0 · 93 và 4.7 · 31, chưa có khoá", async () => {
    const d = await reviewStatsService.get();
    assert.equal(d.tripadvisor.count, 93);
    assert.equal(d.google.rating, 4.7);
    assert.equal(d.tripadvisor.keyConfigured, false);
    assert.equal(d.lastSync.message, NO_KEY_MESSAGE);
    const pub = await reviewStatsService.publicStats();
    assert.deepEqual(Object.keys(pub.tripadvisor).sort(), ["count", "rating", "url"]);
  });

  it("nhập tay: bắt buộc điểm + số lượt", async () => {
    const body = reviewStatsSettingsSchema.parse({
      ...manualBody,
      google: { ...manualBody.google, count: "" },
    });
    await assert.rejects(
      reviewStatsService.save(body, null, REAUTH_OK),
      /Google: vui lòng nhập số lượt/,
    );
  });

  it("khoá lưu MÃ HOÁ, chỉ trả 4 ký tự cuối; để trống = giữ; Xoá khoá = xoá", async () => {
    const body = reviewStatsSettingsSchema.parse({
      ...manualBody,
      tripadvisor: { ...manualBody.tripadvisor, key: "ta-secret-key-1234" },
    });
    const { data, keyChanges } = await reviewStatsService.save(body, { username: "a" }, REAUTH_OK);
    assert.deepEqual(keyChanges, [{ source: "tripadvisor", op: "replace" }]);
    assert.equal(data.tripadvisor.keyConfigured, true);
    assert.equal(data.tripadvisor.keyMasked, "••••••1234");
    assert.ok(store.reviewStats.tripadvisor.key.startsWith("enc:v1:"));
    assert.ok(!JSON.stringify(store).includes("ta-secret-key-1234"));
    assert.ok(!JSON.stringify(data).includes("ta-secret-key-1234"));

    const keep = await reviewStatsService.save(
      reviewStatsSettingsSchema.parse(manualBody),
      null,
      REAUTH_OK,
    );
    assert.equal(keep.data.tripadvisor.keyConfigured, true);
    assert.deepEqual(keep.keyChanges, []);

    const cleared = await reviewStatsService.save(
      reviewStatsSettingsSchema.parse({
        ...manualBody,
        tripadvisor: { ...manualBody.tripadvisor, clearKey: true },
      }),
      null,
      REAUTH_OK,
    );
    assert.equal(cleared.data.tripadvisor.keyConfigured, false);
    assert.deepEqual(cleared.keyChanges, [{ source: "tripadvisor", op: "clear" }]);
  });

  it("tự động (có khoá + bật): ô số trống vẫn lưu được, giữ số đã đồng bộ", async () => {
    store.reviewStats = {
      tripadvisor: { rating: 5, count: 95, auto: true, key: encryptSecret("k") },
    };
    const { data } = await reviewStatsService.save(
      reviewStatsSettingsSchema.parse({
        tripadvisor: { url: "https://t.com/x", auto: true },
        google: manualBody.google,
      }),
      null,
      REAUTH_OK,
    );
    assert.equal(data.tripadvisor.count, 95);
    assert.equal(data.tripadvisor.autoActive, true);
    assert.equal(data.google.autoActive, false);
  });
});

describe("điểm đánh giá — tự cập nhật qua API (fetch giả)", () => {
  it("không có khoá → bỏ qua, không gọi mạng, không ghi DB", async () => {
    const f = fakeFetch([]);
    const r = await reviewStatsService.sync({ fetchImpl: f, notify: () => true });
    assert.equal(r.changed, false);
    assert.equal(r.lastSync.message, NO_KEY_MESSAGE);
    assert.equal(f.calls.length, 0);
    assert.equal(store.reviewStats, undefined);
  });

  it("thành công: cập nhật cả 2 nguồn, gửi đúng header Google, báo website làm mới", async () => {
    store.reviewStats = withKeys({ google: { placeId: "ChIJ_test_place_1234" } }, BOTH);
    const f = fakeFetch([
      ["api.content.tripadvisor.com", TA_OK],
      ["places.googleapis.com/v1/places/ChIJ_test_place_1234", G_OK],
    ]);
    let notified = 0;
    const r = await reviewStatsService.sync({
      fetchImpl: f,
      notify: () => notified++,
    });
    assert.equal(r.lastSync.ok, true);
    assert.equal(store.reviewStats.tripadvisor.count, 94);
    assert.equal(store.reviewStats.tripadvisor.rating, 5);
    assert.equal(store.reviewStats.google.count, 33);
    assert.equal(store.reviewStats.google.rating, 4.8);
    assert.ok(store.reviewStats.tripadvisor.updatedAt);
    assert.equal(notified, 1);
    const ta = f.calls.find((c) => c.url.includes("tripadvisor"));
    assert.match(ta.url, /location\/27950353\/details\?key=ta-secret-key-1234&language=en/);
    const g = f.calls.find((c) => c.url.includes("googleapis"));
    assert.equal(g.init.headers["X-Goog-Api-Key"], "g-secret-key-9876");
    assert.equal(g.init.headers["X-Goog-FieldMask"], "rating,userRatingCount,googleMapsUri");
    // thông báo trạng thái không bao giờ chứa khoá
    assert.ok(!JSON.stringify(store.reviewStats.lastSync).includes("secret"));
  });

  it("số bất thường bị bỏ qua, giữ số cũ; lỗi khoá báo tiếng Việt", async () => {
    store.reviewStats = withKeys(
      {
        tripadvisor: { rating: 5, count: 93 },
        google: { rating: 4.7, count: 31, placeId: "ChIJ_test_place_1234" },
      },
      BOTH,
    );
    const f = fakeFetch([
      ["api.content.tripadvisor.com", () => json({ rating: "5.0", num_reviews: "12" })],
      ["places.googleapis.com", () => json({ error: {} }, 403)],
    ]);
    const r = await reviewStatsService.sync({ fetchImpl: f, notify: () => true });
    assert.equal(r.lastSync.ok, false);
    assert.equal(store.reviewStats.tripadvisor.count, 93);
    assert.equal(store.reviewStats.google.count, 31);
    assert.match(r.lastSync.sources.tripadvisor.message, /giảm bất thường/);
    assert.match(r.lastSync.sources.google.message, /Khoá không hợp lệ hoặc chưa bật Places API/);
  });

  it("điểm ngoài 0–5 bị bỏ qua; lỗi mạng không làm hỏng gì", async () => {
    store.reviewStats = withKeys({ google: { placeId: "ChIJ_test_place_1234" } }, BOTH);
    const f = fakeFetch([
      ["api.content.tripadvisor.com", () => json({ rating: "9", num_reviews: "93" })],
    ]);
    const r = await reviewStatsService.sync({ fetchImpl: f, notify: () => true });
    assert.match(r.lastSync.sources.tripadvisor.message, /điểm nhận về không hợp lệ/);
    assert.match(r.lastSync.sources.google.message, /lỗi kết nối/);
    assert.equal(store.reviewStats.tripadvisor.count, 93); // giữ số cũ (mặc định)
  });

  it("đang tắt tự động: lịch hằng ngày bỏ qua; bấm Cập nhật ngay chỉ kiểm tra khoá, không áp dụng", async () => {
    store.reviewStats = withKeys(
      { tripadvisor: { auto: false, rating: 5, count: 90 } },
      { ta: "k" },
    );
    const f = fakeFetch([["api.content.tripadvisor.com", TA_OK]]);
    const daily = await reviewStatsService.sync({
      fetchImpl: f,
      notify: () => true,
    });
    assert.equal(f.calls.length, 0);
    assert.match(daily.lastSync.sources.tripadvisor.message, /tắt tự động/);
    const now = await reviewStatsService.sync({
      fetchImpl: f,
      manual: true,
      notify: () => true,
    });
    assert.match(now.lastSync.sources.tripadvisor.message, /Khoá dùng được \(5\.0 · 94/);
    assert.equal(store.reviewStats.tripadvisor.count, 90);
  });

  it("Google chưa có Place ID → tự tìm, chỉ nhận đúng cid của công ty", async () => {
    store.reviewStats = withKeys({}, { g: "g" });
    const f = fakeFetch([
      [
        "places:searchText",
        () =>
          json({
            places: [
              { id: "ChIJ_other_company_00", googleMapsUri: "https://maps.google.com/?cid=111" },
              {
                id: "ChIJ_vietlook_place_0",
                googleMapsUri: `https://maps.google.com/?cid=${GOOGLE_MAPS_CID}`,
              },
            ],
          }),
      ],
      ["places/ChIJ_vietlook_place_0", G_OK],
    ]);
    const r = await reviewStatsService.sync({
      fetchImpl: f,
      notify: () => true,
    });
    assert.equal(r.lastSync.sources.google.ok, true);
    assert.equal(store.reviewStats.google.resolvedPlaceId, "ChIJ_vietlook_place_0");
  });

  it("lịch hằng ngày: chạy bù khi lâu chưa cập nhật, lỗi không làm sập", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let runs = 0;
    const stop = scheduleDailyReviewSync({
      run: async () => {
        runs++;
        throw new Error("boom");
      },
      clock: () => Date.now(),
      hour: 6,
      lastSyncAt: async () => null,
    });
    t.mock.timers.tick(60_000);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    assert.equal(runs, 1);
    stop();
  });
});

describe("lấy đánh giá từ Tripadvisor / Google (fetch giả)", () => {
  it("Tripadvisor: tối đa 5, giữ nguyên văn, ngày theo giờ VN, ngôn ngữ, link gốc", async () => {
    const data = Array.from({ length: 7 }, (_, i) => ({
      user: { username: `User ${i}` },
      title: "Great trip",
      text: "Wonderful guide",
      rating: 5,
      published_date: "2026-10-01T20:00:00Z",
      url: `https://www.tripadvisor.com/ShowUserReviews-r${i}`,
      lang: "en",
    }));
    const f = fakeFetch([["/reviews?key=", () => json({ data })]]);
    const items = await fetchTripadvisorReviews({ key: "k", locationId: "27950353" }, f);
    assert.equal(items.length, 5);
    assert.equal(items[0].date, "2026-10-02"); // 20:00 UTC = 03:00 hôm sau giờ VN
    assert.equal(items[0].language, "en");
    assert.equal(items[0].source, "tripadvisor");
    assert.match(items[0].url, /ShowUserReviews-r0/);
  });

  it("Google: lấy originalText (không lấy bản dịch), link review, ngôn ngữ zh-Hant → zh", async () => {
    const f = fakeFetch([
      [
        "places.googleapis.com",
        () =>
          json({
            googleMapsUri: "https://maps.google.com/?cid=1",
            reviews: [
              {
                rating: 4,
                publishTime: "2026-09-01T01:00:00Z",
                text: { text: "Translated", languageCode: "en" },
                originalText: { text: "非常好的导游", languageCode: "zh-Hant" },
                authorAttribution: {
                  displayName: "Lin",
                  uri: "https://www.google.com/maps/contrib/1",
                },
                googleMapsUri: "https://www.google.com/maps/reviews/data=abc",
              },
            ],
          }),
      ],
    ]);
    const [r] = await fetchGoogleReviews({ key: "k", placeId: "ChIJ_test_place_1234" }, f);
    assert.equal(r.text, "非常好的导游");
    assert.equal(r.language, "zh");
    assert.equal(r.rating, 4);
    assert.equal(r.url, "https://www.google.com/maps/reviews/data=abc");
    assert.equal(f.calls[0].init.headers["X-Goog-FieldMask"], "reviews,googleMapsUri");
  });

  it("mapLang + đánh dấu Đã có (cùng nguồn + tên + ngày hoặc 40 ký tự đầu)", () => {
    assert.equal(mapLang("vi"), "vi");
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

  it("preview: chỉ nền tảng có khoá; lỗi hạn mức báo tiếng Việt, nền tảng kia vẫn hiện", async () => {
    stub(reviewRepository, "find", async () => [
      { source: "tripadvisor", name: "Ann", date: "2026-10-01", text: "x" },
    ]);
    store.reviewStats = withKeys({ google: { placeId: "ChIJ_test_place_1234" } }, BOTH);
    const f = fakeFetch([
      [
        "/reviews?key=",
        () =>
          json({
            data: [
              {
                user: { username: "Ann" },
                text: "Hi",
                rating: 5,
                published_date: "2026-10-01T01:00:00Z",
              },
              {
                user: { username: "Tom" },
                text: "Yo",
                rating: 4,
                published_date: "2026-10-02T01:00:00Z",
              },
            ],
          }),
      ],
      ["places.googleapis.com", () => json({}, 429)],
    ]);
    const r = await reviewImportService.preview({ fetchImpl: f });
    assert.deepEqual(r.sources, ["tripadvisor", "google"]);
    assert.match(r.errors.google, /quá nhiều lần|hạn mức/);
    assert.deepEqual(
      r.items.map((x) => [x.name, x.exists]),
      [
        ["Tom", false],
        ["Ann", true],
      ],
    );
    store.reviewStats = withKeys({}, { ta: "k" });
    assert.deepEqual(await reviewImportService.sources(), {
      tripadvisor: true,
      google: false,
    });
    store.reviewStats = {};
    await assert.rejects(reviewImportService.preview(), /Chưa cài khoá/);
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

  it("trang công khai /public/site có reviewStats, không có khoá", async () => {
    store.reviewStats = { tripadvisor: { key: encryptSecret("secret-xyz"), count: 94 } };
    const res = await request(app).get("/api/v1/public/site");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.reviewStats.tripadvisor.count, 94);
    assert.ok(!JSON.stringify(res.body).includes("enc:v1"));
  });

  it("chỉ admin xem / sửa / cập nhật; nhân viên bị chặn", async () => {
    const admin = user("admin");
    const editor = user("editor", { reviews: "full" });
    stub(userRepository, "findById", async (id) => (String(id) === admin._id ? admin : editor));
    stub(auditLogRepository, "create", async () => ({}));
    for (const [method, path] of [
      ["get", "/api/v1/settings/review-stats"],
      ["put", "/api/v1/settings/review-stats"],
      ["post", "/api/v1/settings/review-stats/sync"],
    ]) {
      const anon = await request(app)[method](path).set("X-Requested-With", "fetch");
      assert.equal(anon.status, 401, `${method} ${path}`);
      const agent = request(app);
      const staff = await agent[method](path)
        .set("Cookie", cookie(editor))
        .set("X-Requested-With", "fetch")
        .send({});
      assert.equal(staff.status, 403, `${method} ${path}`);
    }
    const ok = await request(app).get("/api/v1/settings/review-stats").set("Cookie", cookie(admin));
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.tripadvisor.keyConfigured, false);
    // lấy đánh giá từ API: nhân viên có quyền Đánh giá xem được nền tảng nào có khoá
    const src = await request(app)
      .get("/api/v1/admin/reviews/import/sources")
      .set("Cookie", cookie(editor));
    assert.equal(src.status, 200);
    assert.deepEqual(src.body.data, { tripadvisor: false, google: false });
  });
});

describe("khoá bí mật trong Cài đặt — xác nhận mật khẩu, nhật ký, không lộ khoá", () => {
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
  const KEY = "TA0123456789abcdef0123456789ABCD";
  // confirmPassword ở cấp ngoài cùng, các trường còn lại thuộc nguồn Tripadvisor
  const body = ({ confirmPassword, ...extra } = {}) => ({
    ...manualBody,
    tripadvisor: { ...manualBody.tripadvisor, ...extra },
    ...(confirmPassword && { confirmPassword }),
  });

  it("đổi khoá thiếu / sai mật khẩu → báo lỗi tiếng Việt, không lưu; sai được tính vào khoá tài khoản", async () => {
    const none = await put("review-stats", body({ key: KEY }));
    assert.equal(none.status, 400);
    assert.equal(none.body.error.code, "REAUTH_REQUIRED");
    assert.equal(none.body.error.details[0].field, "body.confirmPassword");
    assert.match(none.body.error.message, /Nhập mật khẩu của bạn để xác nhận/);

    const wrong = await put("review-stats", body({ key: KEY, confirmPassword: "nope" }));
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.error.code, "REAUTH_FAILED");
    assert.match(wrong.body.error.message, /Mật khẩu không đúng/);
    assert.equal(fails, 1);
    assert.equal(store.reviewStats, undefined); // không ghi gì
    await flush();
    assert.ok(audits.some((a) => a.action === "auth.reauth_failed"));

    lockNext = true;
    const locked = await put("review-stats", body({ key: KEY, confirmPassword: "nope" }));
    assert.equal(locked.status, 423);
    await flush();
    assert.ok(audits.some((a) => a.action === "auth.locked"));
    assert.ok(!JSON.stringify(audits).includes("nope"));
  });

  it("đúng mật khẩu → lưu mã hoá + nhật ký 'đã thay khoá' (không có khoá, không có mật khẩu)", async () => {
    const res = await put("review-stats", body({ key: KEY, confirmPassword: PASSWORD }));
    assert.equal(res.status, 200);
    assert.equal(res.headers["cache-control"], "no-store");
    assert.equal(res.body.data.tripadvisor.keyConfigured, true);
    assert.equal(res.body.data.tripadvisor.keyUpdatedBy, "boss");
    assert.ok(res.body.data.tripadvisor.keyUpdatedAt);
    assert.equal(res.body.data.tripadvisor.keySource, undefined);
    assert.ok(!JSON.stringify(res.body).includes(KEY));
    assert.ok(store.reviewStats.tripadvisor.key.startsWith("enc:v1:"));
    await flush();
    const secret = audits.find((a) => a.action === "settings.secret");
    assert.deepEqual(secret.meta, {
      key: "review.tripadvisor",
      name: "Khoá API Tripadvisor",
      op: "replace",
    });
    const dump = JSON.stringify(audits);
    assert.ok(!dump.includes(KEY) && !dump.includes(KEY.slice(-4)) && !dump.includes(PASSWORD));

    // chỉ sửa số / công tắc → KHÔNG cần mật khẩu; dán lại đúng khoá cũ cũng không tính là đổi
    audits = [];
    const nums = await put("review-stats", body({ count: 99, key: KEY }));
    assert.equal(nums.status, 200);
    await flush();
    assert.ok(!audits.some((a) => a.action === "settings.secret"));

    // xoá khoá → cần mật khẩu, nhật ký "đã xoá"
    const clearNoPw = await put("review-stats", body({ clearKey: true }));
    assert.equal(clearNoPw.body.error.code, "REAUTH_REQUIRED");
    const cleared = await put("review-stats", body({ clearKey: true, confirmPassword: PASSWORD }));
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.data.tripadvisor.keyConfigured, false);
    await flush();
    assert.equal(audits.find((a) => a.action === "settings.secret").meta.op, "clear");
  });

  it("khoá API sai dạng → báo tiếng Việt", async () => {
    const res = await put("review-stats", body({ key: "short" }));
    assert.equal(res.status, 422);
    assert.match(JSON.stringify(res.body), /chưa đúng dạng/);
  });

  it("9Pay: đổi mã cần mật khẩu; chỉ đổi tỷ lệ cọc thì không; nhật ký không có mã", async () => {
    const base = { enabled: false, merchantKey: "", accountName: "VL", depositPercent: 100 };
    const ok1 = await put("payment", { ...base, depositPercent: 30 });
    assert.equal(ok1.status, 200);

    const SECRET = "9pay-Secret-Value-XYZ";
    const noPw = await put("payment", { ...base, merchantKey: "MERCH01", secretKey: SECRET });
    assert.equal(noPw.status, 400);
    assert.equal(noPw.body.error.code, "REAUTH_REQUIRED");

    audits = [];
    const res = await put("payment", {
      ...base,
      merchantKey: "MERCH01",
      secretKey: SECRET,
      confirmPassword: PASSWORD,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.secretKeySet, true);
    assert.equal(res.body.data.keyInfo.secretKey.by, "boss");
    assert.ok(!JSON.stringify(res.body).includes(SECRET));
    await flush();
    const keys = audits.filter((a) => a.action === "settings.secret").map((a) => a.meta.key);
    assert.deepEqual(keys, ["9pay.merchantKey", "9pay.secretKey"]);
    assert.ok(!JSON.stringify(audits).includes(SECRET));

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
