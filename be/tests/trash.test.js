import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Article } from "../src/models/article.model.js";
import { Enquiry } from "../src/models/enquiry.model.js";
import {
  TRASH_DAYS,
  deletedSlug,
  excludeDeletedAggregate,
  excludeDeletedQuery,
  includeDeleted,
  originalSlug,
} from "../src/models/soft-delete.plugin.js";
import { Tour } from "../src/models/tour.model.js";
import { auditLogRepository } from "../src/repositories/audit-log.repository.js";
import { enquiryRepository } from "../src/repositories/content.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { createContentService } from "../src/services/content.service.js";
import { enquiryService } from "../src/services/enquiry.service.js";
import { articleService, tourService } from "../src/services/modules.service.js";
import { signAccessToken } from "../src/services/token.service.js";
import { nextPurgeAt, purgeTrash } from "../src/services/trash.service.js";
import { contentListQuery, enquiryListQuery } from "../src/validators/content.validator.js";

/**
 * Thùng rác (xoá mềm) cho tour, bài viết, đơn / yêu cầu — không cần MongoDB thật:
 * truy vấn Mongoose được "chạy" bằng hàm giả trả lại điều kiện lọc; service dùng repository giả trong bộ nhớ.
 */

const ID = "64b7f0c2a1b2c3d4e5f6a001";
const isNe = (v) => v && typeof v === "object" && "$ne" in v;

/* ---------- Plugin: mọi truy vấn đọc tự bỏ mục đã xoá ---------- */

describe("thùng rác — truy vấn đọc tự bỏ mục đã xoá", () => {
  const P = mongoose.Query.prototype;
  const ops = ["_find", "_findOne", "_countDocuments"];
  const keep = {};
  before(() => {
    for (const op of ops) {
      keep[op] = P[op];
      P[op] = async function () {
        return this.getFilter();
      };
    }
  });
  after(() => {
    for (const op of ops) P[op] = keep[op];
  });

  it("3 model có trường deletedAt (mặc định null, có index)", () => {
    for (const M of [Tour, Article, Enquiry]) {
      const path = M.schema.path("deletedAt");
      assert.ok(path, M.modelName);
      assert.equal(path.instance, "Date");
      assert.equal(path.options.index, true);
      assert.equal(path.options.default, null);
    }
  });

  it("find / findOne / findById / countDocuments → thêm deletedAt: null", async () => {
    for (const M of [Tour, Article, Enquiry]) {
      assert.deepEqual(await M.find({ isActive: true }), { isActive: true, deletedAt: null });
      assert.deepEqual(await M.findOne({ slug: "a" }), { slug: "a", deletedAt: null });
      assert.deepEqual((await M.findById(ID)).deletedAt, null);
      assert.deepEqual(await M.countDocuments({}), { deletedAt: null });
    }
    // tìm theo đường dẫn cũ (chuyển hướng 301) cũng bỏ tour đã xoá
    assert.deepEqual(await Tour.findOne({ oldSlugs: "x" }), { oldSlugs: "x", deletedAt: null });
  });

  it("hỏi rõ deletedAt hoặc includeDeleted → không tự thêm điều kiện", async () => {
    const f = await Tour.find({ deletedAt: mongoose.trusted({ $ne: null }) });
    assert.ok(isNe(f.deletedAt));
    assert.deepEqual(await includeDeleted(Enquiry.findOne({ code: "VL-1" })), { code: "VL-1" });
  });

  it("lệnh ghi (updateMany / findOneAndUpdate / delete) không bị lọc", () => {
    const pres = (op) => (Tour.schema.s.hooks._pres.get(op) ?? []).map((h) => h.fn);
    for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "deleteMany", "deleteOne"])
      assert.ok(!pres(op).includes(excludeDeletedQuery), op);
    for (const op of ["find", "findOne", "countDocuments", "distinct"])
      assert.ok(pres(op).includes(excludeDeletedQuery), op);
    assert.ok(pres("aggregate").includes(excludeDeletedAggregate));
  });

  it("aggregate (thẻ tour, thống kê đơn) → chèn $match deletedAt: null lên đầu", () => {
    const agg = Tour.aggregate([{ $match: { isActive: true } }, { $sort: { rank: 1 } }]);
    excludeDeletedAggregate.call(agg);
    assert.deepEqual(agg.pipeline()[0], { $match: { deletedAt: null } });
    assert.equal(agg.pipeline().length, 3);
    // $geoNear phải đứng đầu → chèn ngay sau
    const geo = Tour.aggregate([{ $geoNear: { near: [0, 0] } }]);
    excludeDeletedAggregate.call(geo);
    assert.deepEqual(geo.pipeline()[1], { $match: { deletedAt: null } });
    // đã hỏi rõ / includeDeleted → giữ nguyên
    const all = includeDeleted(Enquiry.aggregate([{ $group: { _id: "$status" } }]));
    excludeDeletedAggregate.call(all);
    assert.equal(all.pipeline().length, 1);
  });

  it("slug khi xoá: gắn hậu tố, lấy lại được slug gốc", () => {
    const s = deletedSlug("ha-long-2-ngay", 1700000000000);
    assert.equal(s, "ha-long-2-ngay--deleted-1700000000000");
    assert.equal(originalSlug(s), "ha-long-2-ngay");
    assert.equal(originalSlug(deletedSlug(s, 1)), "ha-long-2-ngay"); // không gắn chồng
    assert.equal(TRASH_DAYS, 30);
  });

  it("danh sách CMS nhận ?trash=1 (tour, bài viết, đơn)", () => {
    assert.equal(contentListQuery.parse({ trash: "1" }).trash, "1");
    assert.equal(enquiryListQuery.parse({ trash: "1" }).trash, "1");
    assert.equal(contentListQuery.safeParse({ trash: "yes" }).success, false);
  });
});

/* ---------- Service nội dung với repository giả ---------- */

/** Repository giả trong bộ nhớ: đọc mặc định bỏ mục đã xoá (giống plugin) */
function fakeRepo(seed = []) {
  const rows = new Map(seed.map((d) => [String(d._id), { deletedAt: null, ...d }]));
  const alive = () => [...rows.values()].filter((d) => !d.deletedAt);
  const calls = { deleteById: 0, paginate: [] };
  return {
    rows,
    calls,
    async findById(id) {
      const d = rows.get(String(id));
      return d && !d.deletedAt ? { ...d } : null;
    },
    async findByIdent(slug) {
      return alive().find((d) => d.slug === slug) ?? null;
    },
    async exists(filter) {
      return alive().some((d) => String(d._id) === String(filter._id)) ? { _id: filter._id } : null;
    },
    async create(data) {
      const _id = `new${rows.size}`;
      const d = { _id, deletedAt: null, ...data };
      rows.set(_id, d);
      return { ...d, toJSON: () => ({ ...d }) };
    },
    async paginate(filter, opts) {
      calls.paginate.push({ filter, opts });
      return { items: [], total: 0 };
    },
    async deleteById() {
      calls.deleteById++;
    },
    async softDeleteById(id, set = {}) {
      const d = rows.get(String(id));
      if (!d || d.deletedAt) return null;
      Object.assign(d, set, { deletedAt: new Date() });
      return { ...d };
    },
    async findDeletedById(id) {
      const d = rows.get(String(id));
      return d?.deletedAt ? { ...d } : null;
    },
    async restoreById(id, set = {}) {
      const d = rows.get(String(id));
      if (!d?.deletedAt) return null;
      Object.assign(d, set, { deletedAt: null });
      return { ...d };
    },
    async purgeByIds(ids) {
      let deletedCount = 0;
      for (const id of ids)
        if (rows.get(String(id))?.deletedAt) {
          rows.delete(String(id));
          deletedCount++;
        }
      return { deletedCount };
    },
    async releaseOldSlug() {},
  };
}

const makeService = (repo, extra = {}) =>
  createContentService({
    repo,
    label: "tour",
    softDelete: true,
    trackOldSlugs: true,
    ...extra,
  });

describe("thùng rác — tour / bài viết (service)", () => {
  it("tour và bài viết bật Thùng rác; điểm đến / chủ đề vẫn xoá hẳn", async () => {
    assert.equal(tourService.softDelete, true);
    assert.equal(articleService.softDelete, true);
    const { destinationService } = await import("../src/services/modules.service.js");
    assert.equal(destinationService.softDelete, false);
  });

  it("xoá → vào Thùng rác: không xoá thật, slug gắn hậu tố, trả bản ghi gốc (để ghi nhật ký)", async () => {
    const repo = fakeRepo([{ _id: "t1", slug: "ha-long", image: "x" }]);
    const removed = [];
    const svc = makeService(repo, { beforeRemove: (d) => removed.push(d.slug) });
    const doc = await svc.remove("t1");
    assert.equal(doc.slug, "ha-long");
    assert.equal(repo.calls.deleteById, 0);
    const row = repo.rows.get("t1");
    assert.ok(row.deletedAt instanceof Date);
    assert.match(row.slug, /^ha-long--deleted-\d+$/);
    assert.deepEqual(removed, ["ha-long"]); // vẫn gỡ khỏi trang chủ như trước
    // mục đã xoá: không sửa / không xoá lại được
    await assert.rejects(svc.get("t1"), { statusCode: 404 });
    await assert.rejects(svc.remove("t1"), { statusCode: 404 });
  });

  it("slug của tour đã xoá được dùng lại ngay cho tour mới", async () => {
    const repo = fakeRepo([{ _id: "t1", slug: "ha-long" }]);
    const svc = makeService(repo);
    await svc.remove("t1");
    const created = await svc.create({ slug: "ha-long" });
    assert.equal(created.slug, "ha-long");
  });

  it("khôi phục: lấy lại đúng slug cũ nếu còn trống", async () => {
    const repo = fakeRepo([{ _id: "t1", slug: "ha-long", isActive: true }]);
    const svc = makeService(repo);
    await svc.remove("t1");
    const doc = await svc.restore("t1");
    assert.equal(doc.slug, "ha-long");
    assert.equal(doc.deletedAt, null);
    assert.equal(doc.isActive, true); // giữ nguyên trạng thái ẩn / hiện
    assert.equal(doc.slugChanged, undefined);
    assert.ok(await svc.get("t1"));
  });

  it("khôi phục khi slug cũ đã có tour khác dùng → thêm -2 và báo slugChanged", async () => {
    const repo = fakeRepo([{ _id: "t1", slug: "ha-long" }]);
    const svc = makeService(repo);
    await svc.remove("t1");
    await svc.create({ slug: "ha-long" });
    const doc = await svc.restore("t1");
    assert.equal(doc.slug, "ha-long-2");
    assert.equal(doc.slugChanged, true);
    assert.equal(doc.originalSlug, "ha-long");
  });

  it("khôi phục mục không có trong Thùng rác → 404", async () => {
    const svc = makeService(fakeRepo([{ _id: "t1", slug: "a" }]));
    await assert.rejects(svc.restore("t1"), { statusCode: 404 });
    await assert.rejects(svc.restore("nope"), { statusCode: 404 });
  });

  it("xoá hẳn: chỉ mục trong Thùng rác; mục đang dùng → 409", async () => {
    const repo = fakeRepo([
      { _id: "t1", slug: "a" },
      { _id: "t2", slug: "b" },
    ]);
    const svc = makeService(repo);
    await assert.rejects(svc.purge("t2"), { statusCode: 409 });
    assert.ok(repo.rows.has("t2"));
    await svc.remove("t1");
    const doc = await svc.purge("t1");
    assert.equal(doc.slug, "a"); // nhật ký ghi slug gốc
    assert.equal(repo.rows.has("t1"), false);
    await assert.rejects(svc.purge("t1"), { statusCode: 404 });
  });

  it("danh sách ?trash=1 → chỉ mục đã xoá, mới xoá trước; mặc định không lọc gì thêm", async () => {
    const repo = fakeRepo();
    const svc = makeService(repo, { listSelect: "slug title" });
    await svc.list({ trash: "1", sort: "name" });
    const { filter, opts } = repo.calls.paginate.at(-1);
    assert.ok(isNe(filter.deletedAt));
    assert.deepEqual(opts.sort, { deletedAt: -1, _id: -1 });
    assert.match(opts.select, /deletedAt/);
    assert.equal(opts.collation, undefined);
    await svc.list({});
    assert.equal("deletedAt" in repo.calls.paginate.at(-1).filter, false);
    // loại không có Thùng rác bỏ qua ?trash
    const plain = createContentService({ repo, label: "điểm đến" });
    await plain.list({ trash: "1" });
    assert.equal("deletedAt" in repo.calls.paginate.at(-1).filter, false);
  });

  it("loại không bật Thùng rác → xoá hẳn như cũ", async () => {
    const repo = fakeRepo([{ _id: "d1", slug: "ha-noi" }]);
    const svc = createContentService({ repo, label: "điểm đến" });
    await svc.remove("d1");
    assert.equal(repo.calls.deleteById, 1);
  });
});

/* ---------- Đơn / yêu cầu ---------- */

describe("thùng rác — đơn / yêu cầu (service)", () => {
  const saved = [];
  const stub = (obj, name, fn) => {
    saved.push([obj, name, obj[name]]);
    obj[name] = fn;
  };
  let repo;
  before(() => {
    repo = fakeRepo([
      { _id: "e1", code: "VL-BK1", type: "booking", name: "An" },
      { _id: "e2", code: "VL-CT2", type: "contact", name: "Bình" },
    ]);
    for (const k of [
      "findById",
      "softDeleteById",
      "restoreById",
      "findDeletedById",
      "purgeByIds",
      "exists",
      "paginate",
    ])
      stub(enquiryRepository, k, repo[k]);
  });
  after(() => {
    for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
  });

  it("xoá → Thùng rác; khôi phục; xoá hẳn chỉ khi đang trong Thùng rác", async () => {
    const e = await enquiryService.remove("e1");
    assert.equal(e.code, "VL-BK1");
    assert.ok(repo.rows.get("e1").deletedAt);
    await assert.rejects(enquiryService.get("e1"), { statusCode: 404 });
    const back = await enquiryService.restore("e1");
    assert.equal(back.code, "VL-BK1");
    assert.equal(repo.rows.get("e1").deletedAt, null);
    await assert.rejects(enquiryService.purge("e1"), { statusCode: 409 });
    await enquiryService.remove("e1");
    await enquiryService.purge("e1");
    assert.equal(repo.rows.has("e1"), false);
  });

  it("danh sách ?trash=1 → chỉ đơn đã xoá, vẫn giới hạn theo nhóm đơn", async () => {
    await enquiryService.list({ trash: "1", kind: "bookings" });
    const { filter, opts } = repo.calls.paginate.at(-1);
    assert.ok(isNe(filter.deletedAt));
    assert.equal(filter.type, "booking");
    assert.deepEqual(opts.sort, { deletedAt: -1, _id: -1 });
  });
});

/* ---------- Route + quyền ---------- */

describe("thùng rác — route & quyền (Toàn quyền)", () => {
  const app = createApp();
  const U = {
    full: "64b7f0c2a1b2c3d4e5f6f001",
    edit: "64b7f0c2a1b2c3d4e5f6f002",
  };
  const users = {
    [U.full]: {
      _id: U.full,
      username: "full",
      role: "editor",
      isActive: true,
      tokenVersion: 0,
      permissions: { tours: "full", bookings: "full" },
    },
    [U.edit]: {
      _id: U.edit,
      username: "edit",
      role: "editor",
      isActive: true,
      tokenVersion: 0,
      permissions: { tours: "edit", bookings: "edit" },
    },
  };
  const saved = [];
  const stub = (obj, name, fn) => {
    saved.push([obj, name, obj[name]]);
    obj[name] = fn;
  };
  const audits = [];
  const svcCalls = [];
  const BK = "64b7f0c2a1b2c3d4e5f6b001";
  const T1 = "64b7f0c2a1b2c3d4e5f6d001";
  before(() => {
    stub(userRepository, "findById", async (id) => users[String(id)] ?? null);
    stub(auditLogRepository, "create", async (entry) => audits.push(entry));
    stub(enquiryRepository, "findById", async (id, opts) =>
      String(id) === BK && opts?.withDeleted
        ? { _id: BK, code: "VL-BK1", type: "booking", name: "An" }
        : null,
    );
    stub(enquiryService, "restore", async () => ({ id: BK, code: "VL-BK1", type: "booking" }));
    stub(enquiryService, "purge", async () => ({ code: "VL-BK1", type: "booking", name: "An" }));
    for (const k of ["remove", "purge", "restore"])
      stub(tourService, k, async (id) => {
        svcCalls.push([k, id]);
        return { _id: id, slug: "ha-long", content: { vi: { title: "Hạ Long" } } };
      });
  });
  after(() => {
    for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
  });
  const call = (uid, method, path) => {
    const agent = request(app);
    return agent[method](`/api/v1${path}`)
      .set("Cookie", `vl_at=${signAccessToken(users[uid])}`)
      .set("X-Requested-With", "fetch");
  };

  it("tour: xoá / xoá hẳn / khôi phục cần Toàn quyền", async () => {
    for (const [m, p] of [
      ["delete", `/admin/tours/${T1}`],
      ["delete", `/admin/tours/${T1}?hard=1`],
      ["post", `/admin/tours/${T1}/restore`],
    ])
      assert.equal((await call(U.edit, m, p)).status, 403, `${m} ${p}`);
  });

  it("tour: DELETE = vào Thùng rác, ?hard=1 = xoá hẳn, POST /restore = khôi phục (+ nhật ký)", async () => {
    audits.length = 0;
    svcCalls.length = 0;
    assert.equal((await call(U.full, "delete", `/admin/tours/${T1}`)).status, 204);
    assert.equal((await call(U.full, "delete", `/admin/tours/${T1}?hard=1`)).status, 204);
    const r = await call(U.full, "post", `/admin/tours/${T1}/restore`);
    assert.equal(r.status, 200);
    assert.deepEqual(
      svcCalls.map((c) => c[0]),
      ["remove", "purge", "restore"],
    );
    await new Promise((res) => setTimeout(res, 20));
    assert.deepEqual(
      audits.map((a) => a.action),
      ["tour.delete", "tour.purge", "tour.restore"],
    );
    assert.equal(audits[0].meta.trash, true);
    assert.equal(audits[0].meta.name, "Hạ Long");
  });

  it("điểm đến (không có Thùng rác) không có route /restore", async () => {
    users[U.full].permissions.destinations = "full";
    const r = await call(U.full, "post", `/admin/destinations/${T1}/restore`);
    assert.equal(r.status, 404);
  });

  it("đơn: khôi phục / xoá hẳn đơn trong Thùng rác — Toàn quyền ở đúng nhóm", async () => {
    audits.length = 0;
    assert.equal((await call(U.edit, "post", `/enquiries/${BK}/restore`)).status, 403);
    assert.equal((await call(U.edit, "delete", `/enquiries/${BK}?hard=1`)).status, 403);
    const r = await call(U.full, "post", `/enquiries/${BK}/restore`);
    assert.equal(r.status, 200);
    assert.equal((await call(U.full, "delete", `/enquiries/${BK}?hard=1`)).status, 204);
    await new Promise((res) => setTimeout(res, 20));
    assert.deepEqual(
      audits.map((a) => a.action),
      ["enquiry.restore", "enquiry.purge"],
    );
  });
});

/* ---------- Tự xoá hẳn sau 30 ngày ---------- */

describe("thùng rác — xoá hẳn mục quá 30 ngày", () => {
  const DAY = 24 * 3600_000;
  const NOW = Date.UTC(2026, 10, 28, 12);
  const kind = (key, docs) => {
    const state = { docs, purged: [], cutoff: null, before: null };
    return {
      state,
      key,
      label: key,
      name: (d) => d.slug ?? d.code,
      repo: {
        async findDeletedBefore(cutoff) {
          state.cutoff = cutoff;
          return docs.filter((d) => d.deletedAt < cutoff);
        },
        async purgeByIds(ids, { before }) {
          state.purged.push(...ids);
          state.before = before;
          return { deletedCount: ids.length };
        },
      },
    };
  };
  const docs = () => [
    {
      _id: "a",
      slug: "old--deleted-1",
      deletedAt: new Date(NOW - 40 * DAY),
      image: "https://res.cloudinary.com/x/image/upload/v1/vietlook/tours/a.jpg",
    },
    { _id: "b", slug: "new--deleted-2", deletedAt: new Date(NOW - 5 * DAY) },
  ];

  it("mặc định chỉ báo cáo — không xoá, không đánh dấu ảnh, không ghi nhật ký", async () => {
    const tours = kind("tours", docs());
    const marks = [];
    const audits = [];
    const r = await purgeTrash({
      now: NOW,
      kinds: [tours],
      mark: (x) => marks.push(...x),
      audit: (m) => audits.push(m),
    });
    assert.equal(r.apply, false);
    assert.equal(r.total, 1);
    assert.equal(r.deleted, 0);
    assert.equal(tours.state.purged.length, 0);
    assert.equal(+tours.state.cutoff, NOW - 30 * DAY);
    assert.deepEqual(
      r.kinds[0].items.map((i) => i.id),
      ["a"],
    );
    assert.equal(marks.length + audits.length, 0);
  });

  it("--apply → xoá hẳn mục quá hạn (chỉ mục vẫn còn trong Thùng rác trước mốc), ghi nhật ký", async () => {
    const tours = kind("tours", docs());
    const enquiries = kind("enquiries", [
      { _id: "e", code: "VL-1", deletedAt: new Date(NOW - 31 * DAY) },
    ]);
    const audits = [];
    const r = await purgeTrash({
      apply: true,
      now: NOW,
      kinds: [tours, enquiries],
      mark: () => {},
      audit: (m) => audits.push(m),
    });
    assert.deepEqual(tours.state.purged, ["a"]);
    assert.equal(+tours.state.before, NOW - 30 * DAY);
    assert.deepEqual(enquiries.state.purged, ["e"]);
    assert.equal(r.deleted, 2);
    assert.deepEqual(audits, [{ count: 2, days: 30, tours: 1, enquiries: 1 }]);
  });

  it("--days đổi số ngày giữ", async () => {
    const tours = kind("tours", docs());
    const r = await purgeTrash({ days: 3, now: NOW, kinds: [tours], audit: () => {} });
    assert.equal(r.total, 2);
  });

  it("job hằng ngày chạy lúc 03:30 giờ Việt Nam", () => {
    const at = nextPurgeAt(Date.UTC(2026, 10, 28, 12)); // 19:00 giờ VN
    assert.equal(at.toISOString(), "2026-11-28T20:30:00.000Z"); // 03:30 ngày 29 giờ VN
    const early = nextPurgeAt(Date.UTC(2026, 10, 28, 20, 0)); // 03:00 giờ VN
    assert.equal(early.toISOString(), "2026-11-28T20:30:00.000Z");
  });
});
