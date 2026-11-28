import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  ABOUT_HIDEABLE,
  HOME_HIDEABLE,
  PAGE_COPY_HIDEABLE,
} from "../src/constants/hidden-blocks.js";
import { PAGE_COPY_SCHEMA } from "../src/constants/page-copy.js";
import { settingRepository } from "../src/repositories/content.repository.js";
import { settingsService } from "../src/services/settings.service.js";
import { homeSettingsSchema, pageSchema } from "../src/validators/content.validator.js";
import { PAGE_COPY_VALIDATORS } from "../src/validators/page-copy.validator.js";

/**
 * Bật / tắt từng khối trên website (`hidden: { <khối>: true }`) — trang chủ, trang Giới thiệu, Giao diện trang:
 * khai báo 2 bên khớp nhau, kiểm tra dữ liệu, lưu gọn, website bỏ khối đang tắt.
 */

const FE = new URL("../../fe/src/", import.meta.url);
const B = await import(new URL("lib/hidden-blocks.mjs", FE));
const { PAGE_COPY } = await import(new URL("lib/page-copy/registry.mjs", FE));
const R = await import(new URL("lib/page-copy/resolve.mjs", FE));

const sorted = (keys) => [...keys].sort();

describe("ẩn khối — khai báo", () => {
  it("website (lib/hidden-blocks.mjs) và máy chủ (constants/hidden-blocks.js) cùng danh sách khối", () => {
    assert.deepEqual(sorted(Object.keys(B.HOME_BLOCKS)), sorted(HOME_HIDEABLE));
    assert.deepEqual(sorted(Object.keys(B.ABOUT_BLOCKS)), sorted(ABOUT_HIDEABLE));
    assert.deepEqual(
      sorted(Object.keys(B.PAGE_COPY_BLOCKS)),
      sorted(Object.keys(PAGE_COPY_HIDEABLE)),
    );
    for (const [key, blocks] of Object.entries(B.PAGE_COPY_BLOCKS)) {
      assert.ok(PAGE_COPY_SCHEMA[key], `trang ${key} không có trong Giao diện trang`);
      assert.deepEqual(sorted(Object.keys(blocks)), sorted(PAGE_COPY_HIDEABLE[key]), key);
      assert.deepEqual(PAGE_COPY[key].hideable, Object.keys(blocks), key);
    }
  });

  it("có tên khối tiếng Việt; banner / đầu trang không tắt được", () => {
    const all = [B.HOME_BLOCKS, B.ABOUT_BLOCKS, ...Object.values(B.PAGE_COPY_BLOCKS)];
    for (const blocks of all)
      for (const [k, name] of Object.entries(blocks)) {
        assert.ok(name.trim().length > 2, k);
        assert.doesNotMatch(k, /hero|banner|header/i);
      }
  });
});

describe("ẩn khối — kiểm tra dữ liệu", () => {
  it("trang chủ: chỉ giữ khối đang tắt, bỏ khoá lạ; không gửi → không có (giữ như lần lưu trước)", () => {
    const r = homeSettingsSchema.parse({
      hidden: { reviews: true, map: false, banner: true, __proto__: { x: 1 } },
    });
    assert.deepEqual(r.hidden, { reviews: true });
    assert.equal(homeSettingsSchema.parse({}).hidden, undefined);
    assert.deepEqual(homeSettingsSchema.parse({ hidden: {} }).hidden, {});
    assert.equal(homeSettingsSchema.safeParse({ hidden: { reviews: "yes" } }).success, false);
    assert.equal(homeSettingsSchema.safeParse({ hidden: ["reviews"] }).success, false);
  });

  it("trang Giới thiệu: cờ ẩn khối nằm trong data", () => {
    const r = pageSchema.parse({ data: { hidden: { why: true, story: true, numbers: false } } });
    assert.deepEqual(r.data.hidden, { why: true });
    assert.equal(pageSchema.parse({ data: {} }).data.hidden, undefined);
  });

  it("Giao diện trang: chỉ khối khai báo của đúng trang; trang không có khối tắt được → bỏ", () => {
    const car = PAGE_COPY_VALIDATORS["car-rental"].parse({
      data: { hidden: { faq: true, reviews: true, heroImage: true, terms: true } },
    });
    assert.deepEqual(car.data.hidden, { reviews: true, faq: true });
    const contact = PAGE_COPY_VALIDATORS.contact.parse({ data: { hidden: { faq: true } } });
    assert.equal(contact.data.hidden, undefined);
    assert.equal(
      PAGE_COPY_VALIDATORS["visa-fast-track"].safeParse({ data: { hidden: { terms: 1 } } }).success,
      false,
    );
  });
});

describe("ẩn khối — Giao diện trang: soạn / lưu / website", () => {
  const entry = PAGE_COPY["car-rental"];
  const defs = { en: {}, zh: {}, vi: {} };

  it("website: khối đã tắt có trong p.hidden; chưa tắt gì → {}; trang khác giữ nguyên hình dạng", () => {
    const ctx = { dict: {}, data: {} };
    assert.deepEqual(R.resolvePage(entry, {}, ctx, "en").hidden, {});
    assert.deepEqual(
      R.resolvePage(entry, { hidden: { faq: true, bogus: true } }, ctx, "en").hidden,
      { faq: true },
    );
    assert.equal("hidden" in R.resolvePage(PAGE_COPY.contact, {}, ctx, "en"), false);
  });

  it("CMS: mở → tắt khối → lưu gọn chỉ còn khối đang tắt; bật lại hết → không gửi hidden", () => {
    const state = R.fillPage(entry, { hidden: { how: true } }, defs);
    assert.deepEqual(state.hidden, { how: true });
    state.hidden = { ...state.hidden, faq: true, gallery: false };
    const body = R.stripPage(entry, state, defs);
    assert.deepEqual(body.hidden, { how: true, faq: true });
    assert.equal(R.countEdited(entry, body), Object.keys(body).length - 1 + 2);
    assert.equal(PAGE_COPY_VALIDATORS["car-rental"].safeParse({ data: body }).success, true);
    assert.equal("hidden" in R.stripPage(entry, { ...state, hidden: {} }, defs), false);
    // "Về mặc định cả trang" → bật lại mọi khối
    assert.deepEqual(R.fillPage(entry, {}, defs).hidden, {});
  });
});

describe("ẩn khối — lưu trang chủ", () => {
  const store = { home: null };
  const stubs = [];
  /** Thay tạm 1 hàm của đối tượng (có hàm đó mới thay) — trả lại như cũ sau khi chạy xong */
  const stub = (obj, name, fn) => {
    if (typeof obj?.[name] !== "function") return;
    stubs.push([obj, name, obj[name]]);
    obj[name] = fn;
  };
  before(async () => {
    stub(settingRepository, "get", async () => store.home);
    stub(settingRepository, "getEntry", async () =>
      store.home ? { value: store.home, updatedAt: new Date(), updatedBy: "t" } : null,
    );
    stub(settingRepository, "set", async (_k, v) => {
      store.home = v;
    });
    // lịch sử phiên bản (nếu có) — không cần ở đây
    const rev = await import("../src/services/revision.service.js").catch(() => null);
    stub(rev?.revisionService, "snapshot", async () => {});
    stub(rev?.revisionService, "homeVideos", async () => []);
  });
  after(() => {
    for (const [obj, name, fn] of stubs.reverse()) obj[name] = fn;
  });

  it("gửi cờ ẩn → lưu; lần lưu sau không gửi cờ → giữ nguyên (khối đang tắt không tự bật lại)", async () => {
    const input = homeSettingsSchema.parse({ hidden: { reviews: true, map: true } });
    let r = await settingsService.saveHome(input, { username: "t" });
    assert.deepEqual(r.hidden, { reviews: true, map: true });
    r = await settingsService.saveHome(homeSettingsSchema.parse({}), { username: "t" });
    assert.deepEqual(r.hidden, { reviews: true, map: true });
    r = await settingsService.saveHome(homeSettingsSchema.parse({ hidden: {} }), { username: "t" });
    assert.deepEqual(r.hidden, {});
  });

  it("chưa lưu bao giờ → hidden rỗng (mọi khối hiện)", async () => {
    store.home = null;
    assert.deepEqual((await settingsService.getHome()).hidden, {});
  });
});
