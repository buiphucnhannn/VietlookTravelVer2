import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { auditLogRepository } from "../src/repositories/audit-log.repository.js";
import { pageRepository, settingRepository } from "../src/repositories/content.repository.js";
import { settingRevisionRepository } from "../src/repositories/setting-revision.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { MAX_REVISIONS, assertFresh } from "../src/services/revision.service.js";
import { signAccessToken } from "../src/services/token.service.js";
import { PAGE_COPY_VALIDATORS } from "../src/validators/page-copy.validator.js";
import { homeSettingsSchema } from "../src/validators/content.validator.js";

/**
 * Lịch sử phiên bản + chống ghi đè (Trang chủ · Giao diện trang · Giới thiệu / chính sách) và phần
 * "Hiển thị trên Google" của các trang — không cần MongoDB thật: kho cài đặt / trang giả, lịch sử lưu trong bộ nhớ
 * (repository thật chạy trên model giả → kiểm tra luôn cách giữ 20 bản mới nhất).
 */

const app = createApp();
const ID = {
  admin: "64b7f0c2a1b2c3d4e5f6a001",
  homeViewer: "64b7f0c2a1b2c3d4e5f6a002",
  pagesEditor: "64b7f0c2a1b2c3d4e5f6a003",
};
const users = {
  [ID.admin]: { _id: ID.admin, username: "boss", name: "Chị Lan", role: "admin", isActive: true },
  [ID.homeViewer]: {
    _id: ID.homeViewer,
    username: "viewer",
    name: "Người xem",
    role: "editor",
    isActive: true,
    tokenVersion: 0,
    permissions: { home: "view", pages: "view" },
  },
  [ID.pagesEditor]: {
    _id: ID.pagesEditor,
    username: "pages",
    name: "Anh Minh",
    role: "editor",
    isActive: true,
    tokenVersion: 0,
    permissions: { pages: "edit" },
  },
};

/* ----- kho giả ----- */
let clock = Date.parse("2026-11-20T08:00:00Z");
const tick = () => new Date((clock += 60_000));
const settings = {};
const pages = {};
let revs = [];
const audits = [];
let seq = 0;

/** Model giả đủ cho SettingRevisionRepository: find().sort().skip().limit().select().lean(), findOne, deleteMany */
const query = (rows) => {
  const q = {
    sort: () => ((rows = [...rows].sort((a, b) => b.createdAt - a.createdAt)), q),
    skip: (n) => ((rows = rows.slice(n)), q),
    limit: (n) => ((rows = rows.slice(0, n)), q),
    select: (s) => {
      if (s === "-data") rows = rows.map(({ data, ...r }) => (void data, r));
      return q;
    },
    lean: async () => rows.map((r) => structuredClone(r)),
  };
  return q;
};
const fakeModel = {
  create: async (doc) => {
    const row = {
      ...structuredClone(doc),
      _id: (++seq).toString(16).padStart(24, "0"),
      createdAt: tick(),
    };
    revs.push(row);
    return { toObject: () => structuredClone(row) };
  },
  find: (f) => query(revs.filter((r) => r.key === f.key)),
  findOne: (f) => ({
    lean: async () => structuredClone(revs.find((r) => r._id === f._id && r.key === f.key) ?? null),
  }),
  deleteMany: async (f) => {
    const ids = new Set(f._id.$in);
    const before = revs.length;
    revs = revs.filter((r) => !ids.has(r._id));
    return { deletedCount: before - revs.length };
  },
};

const saved = [];
const stub = (obj, name, fn) => {
  saved.push([obj, name, obj[name]]);
  obj[name] = fn;
};

before(() => {
  stub(userRepository, "findById", async (id) => users[String(id)] ?? null);
  stub(auditLogRepository, "create", async (e) => (audits.push(e), e));
  stub(settingRepository, "get", async (k) => settings[k]?.value ?? null);
  stub(settingRepository, "getEntry", async (k) => (settings[k] ? { ...settings[k] } : null));
  stub(settingRepository, "set", async (k, value, updatedBy) => {
    settings[k] = { value: structuredClone(value), updatedAt: tick(), updatedBy };
    return settings[k];
  });
  stub(pageRepository, "findByIdent", async (k) => (pages[k] ? structuredClone(pages[k]) : null));
  stub(pageRepository, "upsertByIdent", async (k, doc) => {
    pages[k] = { ...pages[k], ...structuredClone(doc), updatedAt: tick() };
    return structuredClone(pages[k]);
  });
  stub(settingRevisionRepository, "model", fakeModel);
});
after(() => {
  for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
});
beforeEach(() => {
  for (const k of Object.keys(settings)) delete settings[k];
  for (const k of Object.keys(pages)) delete pages[k];
  revs = [];
  audits.length = 0;
});

const call = (id, method, path, body) => {
  const agent = request(app);
  const r = agent[method](`/api/v1${path}`).set("Cookie", `vl_at=${signAccessToken(users[id])}`);
  if (method !== "get") r.set("X-Requested-With", "fetch");
  return body === undefined ? r : r.send(body);
};
const homeBody = (title) => ({ banner: { titleMain: { vi: title } } });
const saveHome = (title, extra = {}) =>
  call(ID.admin, "put", "/settings/home", { ...homeBody(title), ...extra });

describe("lịch sử phiên bản — trang chủ", () => {
  it("GET /settings/home trả kèm updatedAt (trang danh sách hiện “Cập nhật …”)", async () => {
    await saveHome("Một");
    const r = await call(ID.admin, "get", "/settings/home");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.updatedAt, settings.home.updatedAt.toISOString());
  });

  it("lần lưu đầu không có bản cũ; lần sau cất bản trước (người lưu, lúc lưu) — nội dung không đổi thì không cất", async () => {
    await saveHome("Một");
    assert.equal(revs.length, 0);
    const firstAt = settings.home.updatedAt;
    await saveHome("Hai");
    assert.equal(revs.length, 1);
    assert.equal(revs[0].key, "home");
    assert.equal(revs[0].data.banner.titleMain.vi, "Một");
    assert.equal(revs[0].savedBy, "Chị Lan");
    assert.equal(+new Date(revs[0].savedAt), +firstAt);
    assert.deepEqual(revs[0].by, { id: ID.admin, name: "Chị Lan" });
    assert.equal(revs[0].reason, "save");
    await saveHome("Hai");
    assert.equal(revs.length, 1, "lưu lại y hệt → không thêm bản");
  });

  it(`chỉ giữ ${MAX_REVISIONS} bản mới nhất; danh sách mới nhất trước, không kèm nội dung`, async () => {
    for (let i = 0; i < MAX_REVISIONS + 6; i++) await saveHome(`Bản ${i}`);
    assert.equal(revs.length, MAX_REVISIONS);
    const r = await call(ID.admin, "get", "/settings/revisions/home");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, MAX_REVISIONS);
    assert.equal(r.body.data[0].data, undefined);
    const one = await call(ID.admin, "get", `/settings/revisions/home/${r.body.data[0].id}`);
    assert.equal(one.body.data.data.banner.titleMain.vi, `Bản ${MAX_REVISIONS + 4}`);
    const last = await call(ID.admin, "get", `/settings/revisions/home/${r.body.data.at(-1).id}`);
    assert.equal(last.body.data.data.banner.titleMain.vi, "Bản 5", "bản cũ nhất còn giữ");
  });

  it("có người lưu sau lúc mở trang → 409 CONTENT_CONFLICT (không ghi gì); đúng bản → lưu được", async () => {
    await saveHome("Một");
    const opened = settings.home.updatedAt.toISOString();
    await call(ID.admin, "put", "/settings/home", homeBody("Người khác sửa"));
    const r = await saveHome("Bản của tôi", { baseUpdatedAt: opened });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, "CONTENT_CONFLICT");
    assert.equal(r.body.error.details.updatedAt, settings.home.updatedAt.toISOString());
    assert.equal(r.body.error.details.by, "Chị Lan");
    assert.equal(settings.home.value.banner.titleMain.vi, "Người khác sửa");
    // "Ghi đè": gửi lại với lúc lưu mới nhất
    const ok = await saveHome("Bản của tôi", { baseUpdatedAt: r.body.error.details.updatedAt });
    assert.equal(ok.status, 200);
    assert.equal(settings.home.value.banner.titleMain.vi, "Bản của tôi");
    assert.equal(
      settings.home.value.baseUpdatedAt,
      undefined,
      "không lưu dấu thời gian vào dữ liệu",
    );
  });

  it("“Dùng lại bản này”: cất bản hiện tại trước, rồi lưu lại bản cũ + ghi nhật ký", async () => {
    await saveHome("Một");
    await saveHome("Hai");
    const [old] = (await call(ID.admin, "get", "/settings/revisions/home")).body.data;
    const r = await call(ID.admin, "post", `/settings/revisions/home/${old.id}/restore`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.banner.titleMain.vi, "Một");
    assert.equal(settings.home.value.banner.titleMain.vi, "Một");
    const newest = revs.at(-1);
    assert.equal(newest.reason, "restore");
    assert.equal(
      newest.data.banner.titleMain.vi,
      "Hai",
      "bản trước khi khôi phục vẫn quay lại được",
    );
    await new Promise((res) => setImmediate(res));
    assert.ok(
      audits.some((a) => a.action === "settings.revision_restore" && a.meta.key === "home"),
    );
  });

  it("phân quyền: chỉ xem → xem được lịch sử, không khôi phục; không có quyền trang chủ → 403; khoá lạ → 404", async () => {
    await saveHome("Một");
    await saveHome("Hai");
    const list = await call(ID.homeViewer, "get", "/settings/revisions/home");
    assert.equal(list.status, 200);
    const id = list.body.data[0].id;
    assert.equal(
      (await call(ID.homeViewer, "post", `/settings/revisions/home/${id}/restore`)).status,
      403,
    );
    assert.equal((await call(ID.pagesEditor, "get", "/settings/revisions/home")).status, 403);
    assert.equal((await call(ID.admin, "get", "/settings/revisions/tracking")).status, 404);
    assert.equal((await call(ID.admin, "get", "/settings/revisions/__proto__")).status, 404);
    assert.equal((await call(ID.admin, "get", "/settings/revisions/home/abc")).status, 422);
    // id của trang khác → không lấy nhầm
    assert.equal((await call(ID.admin, "get", `/settings/revisions/about/${id}`)).status, 404);
  });
});

describe("lịch sử phiên bản — giao diện trang, giới thiệu / chính sách", () => {
  it("giao diện trang: cất bản cũ, chống ghi đè, khôi phục (quyền Giao diện trang)", async () => {
    const put = (vi, extra = {}) =>
      call(ID.pagesEditor, "put", "/settings/page-copy/car-rental", {
        data: { heroTitle: { vi } },
        ...extra,
      });
    const first = await put("Xe riêng");
    assert.equal(first.status, 200);
    await put("Xe đời mới");
    assert.equal(revs.length, 1);
    assert.equal(revs[0].data.heroTitle.vi, "Xe riêng");

    const stale = await put("Bản cũ", { baseUpdatedAt: first.body.data.updatedAt });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, "CONTENT_CONFLICT");
    assert.equal(stale.body.error.details.by, "Anh Minh");

    const [rev] = (await call(ID.pagesEditor, "get", "/settings/revisions/car-rental")).body.data;
    const r = await call(
      ID.pagesEditor,
      "post",
      `/settings/revisions/car-rental/${rev.id}/restore`,
    );
    assert.equal(r.status, 200);
    assert.equal(r.body.data.data.heroTitle.vi, "Xe riêng");
    assert.equal(pages["car-rental"].data.heroTitle.vi, "Xe riêng");
    assert.equal(revs.at(-1).reason, "restore");
    assert.equal(
      (await call(ID.homeViewer, "post", `/settings/revisions/car-rental/${rev.id}/restore`))
        .status,
      403,
    );
  });

  it("trang giới thiệu / chính sách: cất đủ tiêu đề, nội dung, SEO, ẩn / hiện; khôi phục đúng như cũ", async () => {
    const body = (title) => ({
      title: { vi: title },
      body: { vi: "<p>Nội dung</p>" },
      seo: { vi: { title: "Điều khoản", description: "Mô tả" } },
      isActive: true,
    });
    const first = await call(ID.pagesEditor, "put", "/settings/pages/terms", body("Điều khoản"));
    assert.equal(first.status, 200);
    await call(ID.pagesEditor, "put", "/settings/pages/terms", {
      ...body("Điều khoản mới"),
      isActive: false,
    });
    assert.equal(revs.length, 1);
    assert.equal(revs[0].data.title.vi, "Điều khoản");
    assert.equal(revs[0].data.seo.vi.title, "Điều khoản");
    assert.equal(revs[0].data.isActive, true);

    const stale = await call(ID.pagesEditor, "put", "/settings/pages/terms", {
      ...body("x"),
      baseUpdatedAt: first.body.data.updatedAt,
    });
    assert.equal(stale.status, 409);

    const r = await call(
      ID.pagesEditor,
      "post",
      `/settings/revisions/terms/${revs[0]._id}/restore`,
    );
    assert.equal(r.status, 200);
    assert.equal(pages.terms.title.vi, "Điều khoản");
    assert.equal(pages.terms.isActive, true);
    assert.equal(pages.terms.updatedBy, "Anh Minh");
  });
});

describe("chống ghi đè — assertFresh", () => {
  it("không gửi dấu thời gian / chưa từng lưu / đúng bản → cho lưu; bản trên máy chủ mới hơn → 409", () => {
    const at = new Date("2026-11-20T08:00:00.000Z");
    assert.doesNotThrow(() => assertFresh({ updatedAt: at }, undefined));
    assert.doesNotThrow(() => assertFresh(null, at.toISOString()));
    assert.doesNotThrow(() => assertFresh({ updatedAt: at }, at.toISOString()));
    assert.doesNotThrow(() => assertFresh({ updatedAt: at }, "không phải ngày"));
    assert.throws(
      () => assertFresh({ updatedAt: at, updatedBy: "Lan" }, "2026-11-20T07:59:59.000Z"),
      (e) => e.statusCode === 409 && e.code === "CONTENT_CONFLICT" && e.details.by === "Lan",
    );
  });
});

describe("hiển thị trên Google — trang & trang chủ", () => {
  it("giao diện trang có đường dẫn riêng: lưu seo (bỏ ngôn ngữ trống) → website đọc được; khối dùng chung bỏ qua seo", async () => {
    const r = await call(ID.pagesEditor, "put", "/settings/page-copy/car-rental", {
      data: {
        heroTitle: { vi: "Xe" },
        seo: { vi: { title: " Thuê xe riêng ", description: "Xe đời mới" }, en: { title: "" } },
      },
    });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.data.seo, {
      vi: { title: "Thuê xe riêng", description: "Xe đời mới" },
    });
    const pub = await request(app).get("/api/v1/public/page-copy/car-rental");
    assert.equal(pub.body.data.seo.vi.title, "Thuê xe riêng");

    const g = PAGE_COPY_VALIDATORS.global.safeParse({
      data: { seo: { vi: { title: "x", description: "" } } },
    });
    assert.equal(g.success, true);
    assert.equal(g.data.data.seo, undefined, "đầu & chân trang không có phần Google");
    const long = PAGE_COPY_VALIDATORS.tours.safeParse({
      data: { seo: { vi: { title: "a".repeat(201), description: "" } } },
    });
    assert.equal(long.success, false);
  });

  it("trang chủ: không gửi seo → giữ seo đã lưu; gửi seo → lưu; quá dài → 422", async () => {
    const seo = { vi: { title: "Vietlook — tour Việt Nam", description: "Tour riêng" } };
    assert.equal((await saveHome("Một", { seo })).status, 200);
    assert.deepEqual(settings.home.value.seo.vi, seo.vi);
    await saveHome("Hai");
    assert.deepEqual(settings.home.value.seo.vi, seo.vi, "không gửi seo → giữ nguyên");
    const pub = await request(app).get("/api/v1/public/home");
    assert.equal(pub.body.data.seo.vi.title, "Vietlook — tour Việt Nam");
    assert.equal(
      homeSettingsSchema.safeParse({ seo: { vi: { title: "a".repeat(201) } } }).success,
      false,
    );
  });
});
