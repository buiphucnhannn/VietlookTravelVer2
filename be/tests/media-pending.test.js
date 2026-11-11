import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { userRepository } from "../src/repositories/user.repository.js";
import {
  confirmSaved,
  DAY,
  makeConfirmSavedMedia,
  orphanStore,
  pendingStore,
  planSweep,
  runSweep,
} from "../src/services/media-cleanup.service.js";
import { signAccessToken } from "../src/services/token.service.js";
import {
  discardPending,
  driveProbeError,
  imagePublicId,
  managedPublicId,
  recordUpload,
} from "../src/services/upload.service.js";

/**
 * File "chờ lưu": ảnh / video tải lên lúc soạn nhưng CHƯA từng được lưu vào bản ghi nào.
 * - lưu thành công → hết chờ lưu (từ đây luôn chờ đủ 21 ngày trước khi dọn)
 * - không bao giờ được lưu → dọn sau 24 giờ (không thể nằm trong bản sao lưu nào)
 * - nhân viên bỏ (gỡ video, đóng form) → xoá ngay, chỉ khi an toàn
 */

const HOURS = 3600_000;
const NOW = Date.parse("2026-11-11T00:00:00Z");
const ago = (h) => new Date(NOW - h * HOURS);
const IMG = (id) => `https://res.cloudinary.com/vltest/image/upload/v1/vietlook/tours/${id}.webp`;

/* ---- cơ sở dữ liệu giả lập (đủ cho mediaorphans / mediapending / medialocks / dữ liệu nội dung) ---- */
function fakeDb(data) {
  return {
    data,
    listCollections: () => ({ toArray: async () => Object.keys(data).map((name) => ({ name })) }),
    collection(name) {
      const rows = (data[name] ??= []);
      const drop = (pred) => {
        for (let i = rows.length - 1; i >= 0; i--) if (pred(rows[i])) rows.splice(i, 1);
      };
      const apply = (r, u) => {
        Object.assign(r, u.$set);
        for (const [k, v] of Object.entries(u.$inc ?? {})) r[k] = (r[k] ?? 0) + v;
        for (const [k, v] of Object.entries(u.$addToSet ?? {}))
          r[k] = [...new Set([...(r[k] ?? []), v])];
      };
      return {
        find: () => ({
          toArray: async () => rows.map((r) => ({ ...r })),
          async *[Symbol.asyncIterator]() {
            yield* rows;
          },
        }),
        createIndex: async () => "ok",
        findOne: async ({ publicId }) => rows.find((r) => r.publicId === publicId) ?? null,
        async findOneAndUpdate({ publicId }, u) {
          const r = rows.find((x) => x.publicId === publicId);
          if (!r) return null;
          apply(r, u);
          return { ...r };
        },
        async bulkWrite(ops) {
          for (const { updateOne: u } of ops) {
            let r = rows.find((x) => x.publicId === u.filter.publicId);
            if (!r) rows.push((r = { publicId: u.filter.publicId, ...u.update.$setOnInsert }));
            Object.assign(r, u.update.$set);
          }
        },
        deleteMany: async ({ publicId }) => drop((r) => publicId.$in.includes(r.publicId)),
        async updateOne(filter, u, { upsert } = {}) {
          if (filter.publicId) {
            let r = rows.find((x) => x.publicId === filter.publicId);
            const matched = !!r;
            if (!r && !upsert) return { matchedCount: 0 };
            if (!r) rows.push((r = { publicId: filter.publicId, ...u.$setOnInsert }));
            apply(r, u);
            return { matchedCount: matched ? 1 : 0 };
          }
          // khoá chạy
          const r = rows.find((x) => x._id === filter._id);
          if (r && r.expiresAt <= filter.expiresAt.$lte) return Object.assign(r, u.$set);
          if (r || !upsert) throw Object.assign(new Error("E11000"), { code: 11000 });
          rows.push({ _id: filter._id, ...u.$set });
        },
        deleteOne: async (f) => drop((r) => r._id === f._id && r.owner === f.owner),
      };
    },
  };
}

function fakeApi(assets) {
  const deleted = [];
  return {
    deleted,
    async resources(q) {
      return {
        resources: assets
          .filter((a) => (a.resourceType ?? "image") === q.resource_type)
          .filter((a) => a.publicId.startsWith(q.prefix))
          .filter((a) => !deleted.includes(a.publicId))
          .map((a) => ({ public_id: a.publicId, created_at: a.createdAt, bytes: 1000 })),
      };
    },
    async delete_resources(ids) {
      deleted.push(...ids);
      return { deleted: Object.fromEntries(ids.map((id) => [id, "deleted"])) };
    },
  };
}

describe("dọn ảnh: file chưa từng được lưu", () => {
  const used = Array.from({ length: 9 }, (_, i) => `vietlook/tours/u${i}`);
  const assets = [
    ...used.map((publicId) => ({ publicId, createdAt: ago(100).toISOString() })),
    { publicId: "vietlook/tours/never-saved", createdAt: ago(30).toISOString() },
  ];
  const refs = new Set(used);
  const base = { assets, refs, now: NOW, folder: "vietlook", graceMs: 21 * DAY };

  it("chờ lưu, không ai dùng, quá 24 giờ → xoá luôn, không chờ 21 ngày", () => {
    const p = planSweep({
      ...base,
      pending: [{ publicId: "vietlook/tours/never-saved", uploadedAt: ago(30) }],
    });
    assert.deepEqual(
      p.toDelete.map((a) => [a.publicId, a.fast]),
      [["vietlook/tours/never-saved", true]],
    );
    assert.equal(p.neverSaved, 1);
    assert.deepEqual(p.toMark, []);
  });

  it("chưa đủ 24 giờ kể từ lần tải (hoặc tải lại) gần nhất → chưa đụng", () => {
    const p = planSweep({
      ...base,
      pending: [{ publicId: "vietlook/tours/never-saved", uploadedAt: ago(3) }],
    });
    assert.deepEqual(p.toDelete, []);
    assert.equal(p.young, 1);
  });

  it("không có dấu chờ lưu (file cũ / đã từng lưu) → vẫn chờ đủ thời gian chờ", () => {
    const p = planSweep(base);
    assert.deepEqual(p.toDelete, []);
    assert.deepEqual(
      p.toMark.map((a) => a.publicId),
      ["vietlook/tours/never-saved"],
    );
  });

  it("đã bị bỏ khỏi bản ghi khi lưu (từng được lưu) → chờ đủ ngày dù còn dấu chờ lưu", () => {
    const p = planSweep({
      ...base,
      pending: [{ publicId: "vietlook/tours/never-saved", uploadedAt: ago(30) }],
      candidates: [
        { publicId: "vietlook/tours/never-saved", firstSeenAt: ago(25), reason: "removed-on-save" },
      ],
    });
    assert.deepEqual(p.toDelete, []);
    assert.equal(p.waiting.length, 1);
  });

  it("đang được dùng / file đã mất → bỏ dấu chờ lưu", () => {
    const p = planSweep({
      ...base,
      pending: [
        { publicId: "vietlook/tours/u1", uploadedAt: ago(1) },
        { publicId: "vietlook/tours/gone", uploadedAt: ago(1) },
      ],
    });
    assert.deepEqual(p.toClear.sort(), ["vietlook/tours/gone", "vietlook/tours/u1"]);
  });

  it("chốt an toàn vẫn áp dụng (cơ sở dữ liệu trống → không xoá gì)", () => {
    const p = planSweep({
      ...base,
      refs: new Set(),
      pending: [{ publicId: "vietlook/tours/never-saved", uploadedAt: ago(30) }],
    });
    assert.equal(p.aborted, true);
  });

  it("chạy thật: file chưa lưu xoá sau 24 giờ; file đã lưu rồi bị bỏ chờ đủ ngày", async () => {
    const db = fakeDb({
      tours: used.map((id) => ({ image: id })),
    });
    const all = [
      ...assets,
      { publicId: "vietlook/tours/saved-then-removed", createdAt: ago(30).toISOString() },
    ];
    const api = fakeApi(all);
    const pending = pendingStore(db);
    const store = orphanStore(db);
    await pending.add("vietlook/tours/never-saved", { owner: "u1", now: ago(30) });
    await pending.add("vietlook/tours/saved-then-removed", { owner: "u1", now: ago(30) });
    // lưu vào tour (bỏ dấu chờ lưu) rồi bị gỡ khỏi tour
    await confirmSaved({ image: IMG("saved-then-removed") }, { pending, enabled: true });
    const audits = [];
    const deps = { db, api, store, pending, audit: async (m) => audits.push(m), enabled: true };
    const r = await runSweep({ apply: true, minDocs: 1, graceMs: 21 * DAY, now: NOW }, deps);
    assert.deepEqual(api.deleted, ["vietlook/tours/never-saved"]);
    assert.equal(r.deletedNeverSaved, 1);
    assert.deepEqual(db.data.mediapending, []);
    assert.deepEqual(
      db.data.mediaorphans.map((x) => x.publicId),
      ["vietlook/tours/saved-then-removed"],
    );
    assert.equal(audits[0].neverSaved, 1);
  });

  it("kiểm tra lại ngay trước khi xoá: vừa được tải lại / vừa lưu → không xoá", async () => {
    const db = fakeDb({ tours: used.map((id) => ({ image: id })) });
    const api = fakeApi(assets);
    const real = pendingStore(db);
    await real.add("vietlook/tours/never-saved", { owner: "u1", now: ago(30) });
    let lists = 0;
    const pending = {
      ...real,
      async list() {
        // lần đọc thứ 2 (ngay trước khi xoá): nhân viên vừa tải lại đúng ảnh này
        if (++lists === 2) await real.touch("vietlook/tours/never-saved", { now: new Date(NOW) });
        return real.list();
      },
    };
    const deps = { db, api, store: orphanStore(db), pending, audit: async () => {}, enabled: true };
    await runSweep({ apply: true, minDocs: 1, now: NOW }, deps);
    assert.deepEqual(api.deleted, []);
    assert.equal(db.data.mediapending.length, 1);
  });
});

describe("dấu chờ lưu: vòng đời", () => {
  it("tải mới → chờ lưu; tải lại cùng ảnh → làm mới; lưu thành công → hết chờ lưu", async () => {
    const db = fakeDb({});
    const pending = pendingStore(db);
    const orphans = orphanStore(db);
    const deps = { pending: () => pending, orphans: () => orphans };
    await recordUpload("vietlook/tours/h-1", { existed: false, owner: "u1" }, deps);
    assert.equal(db.data.mediapending[0].holds, 1);
    assert.deepEqual(db.data.mediapending[0].owners, ["u1"]);
    await orphans.mark([{ publicId: "vietlook/tours/h-1" }]);
    await recordUpload("vietlook/tours/h-1", { existed: true, owner: "u2" }, deps);
    assert.equal(db.data.mediapending[0].holds, 2);
    assert.deepEqual(db.data.mediapending[0].owners, ["u1", "u2"]);
    assert.deepEqual(db.data.mediaorphans, []); // sắp được dùng lại → bỏ đánh dấu dọn
    assert.equal(await confirmSaved({ gallery: [IMG("h-1")] }, { pending, enabled: true }), 1);
    assert.deepEqual(db.data.mediapending, []);
  });

  it("file đã có mà không chờ lưu (từng được lưu) → KHÔNG BAO GIỜ thành chờ lưu", async () => {
    const db = fakeDb({});
    const deps = { pending: () => pendingStore(db), orphans: () => orphanStore(db) };
    await recordUpload("vietlook/tours/h-old", { existed: true, owner: "u1" }, deps);
    assert.deepEqual(db.data.mediapending ?? [], []);
    // ngoài thư mục CMS / ảnh hệ thống → bỏ qua
    await recordUpload("vietlook/site/x", { existed: false }, deps);
    await recordUpload("other/x", { existed: false }, deps);
    assert.deepEqual(db.data.mediapending ?? [], []);
  });

  it("tên ảnh theo nội dung: cùng ảnh → cùng tên (không sinh bản trùng), ảnh khác → tên khác", () => {
    const a = Buffer.from("ảnh A");
    assert.equal(imagePublicId(a), imagePublicId(Buffer.from("ảnh A")));
    assert.notEqual(imagePublicId(a), imagePublicId(Buffer.from("ảnh B")));
    assert.match(imagePublicId(a), /^h-[\da-f]{32}$/);
  });

  it("chỉ nhận link Cloudinary của đúng tài khoản, trong thư mục CMS", () => {
    assert.equal(managedPublicId(IMG("h-1")), "vietlook/tours/h-1");
    assert.equal(
      managedPublicId(
        "https://res.cloudinary.com/vltest/video/upload/c_limit,q_auto,w_1920/v3/vietlook/banner/drive-abc.mp4",
      ),
      "vietlook/banner/drive-abc",
    );
    for (const u of [
      "https://res.cloudinary.com/other/image/upload/v1/vietlook/tours/h-1.webp",
      "https://res.cloudinary.com/vltest/image/upload/v1/vietlook/site/logo.webp",
      "https://evil.com/vltest/image/upload/v1/vietlook/tours/h-1.webp",
      "/images/tours/a.jpg",
      "",
    ])
      assert.equal(managedPublicId(u), null, u);
  });
});

describe("lưu thành công → bỏ dấu chờ lưu (middleware)", () => {
  const run = (req, status) => {
    const calls = [];
    const res = Object.assign(new EventEmitter(), { statusCode: status });
    makeConfirmSavedMedia((body) => calls.push(body))(
      { path: "/admin/tours/1", method: "PUT", user: { id: "u1" }, body: { a: 1 }, ...req },
      res,
      () => {},
    );
    res.emit("finish");
    return calls.length;
  };
  it("chỉ khi nhân viên lưu thành công; bỏ qua lỗi, khách, GET, /uploads", () => {
    assert.equal(run({}, 200), 1);
    assert.equal(run({ method: "POST" }, 201), 1);
    assert.equal(run({}, 422), 0);
    assert.equal(run({}, 500), 0);
    assert.equal(run({ user: undefined }, 200), 0);
    assert.equal(run({ method: "GET" }, 200), 0);
    assert.equal(run({ method: "DELETE" }, 200), 0);
    assert.equal(run({ path: "/uploads/images" }, 201), 0);
  });
});

describe("bỏ file vừa tải mà chưa lưu", () => {
  const setup = async ({ refs = [] } = {}) => {
    const db = fakeDb({});
    const pending = pendingStore(db);
    const destroyed = [];
    const deps = {
      pending: () => pending,
      references: async () => new Set(refs),
      destroy: async (id, type) => destroyed.push([id, type]),
    };
    await pending.add("vietlook/tours/h-1", { owner: "u1" });
    await pending.add("vietlook/banner/drive-v", { owner: "u1" });
    return { db, pending, destroyed, deps };
  };
  const u1 = { id: "u1", role: "editor" };

  it("người đã tải bỏ → xoá ngay (ảnh và video), hết chờ lưu", async () => {
    const { db, destroyed, deps } = await setup();
    const n = await discardPending(
      [IMG("h-1"), "https://res.cloudinary.com/vltest/video/upload/v3/vietlook/banner/drive-v.mp4"],
      u1,
      deps,
    );
    assert.equal(n, 2);
    assert.deepEqual(destroyed, [
      ["vietlook/tours/h-1", "image"],
      ["vietlook/banner/drive-v", "video"],
    ]);
    assert.deepEqual(db.data.mediapending, []);
  });

  it("người khác (không phải admin) không xoá được file của mình; admin thì được", async () => {
    const { destroyed, deps } = await setup();
    assert.equal(await discardPending([IMG("h-1")], { id: "u2", role: "editor" }, deps), 0);
    assert.deepEqual(destroyed, []);
    assert.equal(await discardPending([IMG("h-1")], { id: "boss", role: "admin" }, deps), 1);
  });

  it("file đã được lưu / không chờ lưu / link lạ → không bao giờ xoá", async () => {
    const { destroyed, deps } = await setup();
    const n = await discardPending(
      [
        IMG("h-saved"),
        "https://res.cloudinary.com/vltest/image/upload/v1/vietlook/site/logo.webp",
        "https://evil.com/x.jpg",
      ],
      u1,
      deps,
    );
    assert.equal(n, 0);
    assert.deepEqual(destroyed, []);
  });

  it("bản ghi đang dùng (vừa lưu) → không xoá, chuyển sang chờ đủ ngày", async () => {
    const { db, destroyed, deps } = await setup({ refs: ["vietlook/tours/h-1"] });
    assert.equal(await discardPending([IMG("h-1")], u1, deps), 0);
    assert.deepEqual(destroyed, []);
    assert.deepEqual(
      db.data.mediapending.map((x) => x.publicId),
      ["vietlook/banner/drive-v"],
    );
  });

  it("cùng ảnh đang được form khác (tab khác) giữ → chỉ xoá khi form cuối cùng bỏ", async () => {
    const { pending, destroyed, deps } = await setup();
    await pending.touch("vietlook/tours/h-1", { owner: "u1" }); // tab thứ 2 tải đúng ảnh này
    assert.equal(await discardPending([IMG("h-1")], u1, deps), 0);
    assert.deepEqual(destroyed, []);
    assert.equal(await discardPending([IMG("h-1")], u1, deps), 1);
  });
});

describe("lỗi chép video Drive: nói rõ lý do", () => {
  it("phân loại phản hồi của Google", () => {
    assert.equal(driveProbeError(206, "video/mp4", 5_000_000), null);
    assert.equal(driveProbeError(200, "application/octet-stream", NaN), null);
    assert.equal(driveProbeError(404, ""), "missing");
    assert.equal(driveProbeError(302, ""), "private");
    assert.equal(driveProbeError(403, "text/html"), "private");
    assert.equal(driveProbeError(200, "text/html; charset=utf-8"), "private");
    assert.equal(driveProbeError(206, "image/jpeg", 1000), "notVideo");
    assert.equal(driveProbeError(206, "video/mp4", 200 * 1024 * 1024), "large");
  });
});

describe("bỏ file chưa lưu: phân quyền", () => {
  const app = createApp();
  const users = {
    "64b7f0c2a1b2c3d4e5f60011": {
      _id: "64b7f0c2a1b2c3d4e5f60011",
      username: "writer",
      name: "Writer",
      role: "editor",
      isActive: true,
      permissions: { tours: "edit" },
    },
    "64b7f0c2a1b2c3d4e5f60012": {
      _id: "64b7f0c2a1b2c3d4e5f60012",
      username: "sales",
      name: "Sales",
      role: "editor",
      isActive: true,
      permissions: { bookings: "edit" },
    },
  };
  let real;
  before(() => {
    real = userRepository.findById;
    userRepository.findById = async (id) => users[String(id)] ?? null;
  });
  after(() => {
    userRepository.findById = real;
  });
  const del = (id, body) => {
    const r = request(app).delete("/api/v1/uploads/pending").set("X-Requested-With", "fetch");
    if (id) r.set("Cookie", `vl_at=${signAccessToken(users[id])}`);
    return r.send(body);
  };

  it("chưa đăng nhập → 401; không có quyền sửa nội dung → 403", async () => {
    assert.equal((await del(null, { urls: [IMG("h-1")] })).status, 401);
    assert.equal((await del("64b7f0c2a1b2c3d4e5f60012", { urls: [IMG("h-1")] })).status, 403);
  });

  it("có quyền: dữ liệu sai → 422; đúng → 200 (máy chủ chưa bật kho ảnh thì không xoá gì)", async () => {
    assert.equal((await del("64b7f0c2a1b2c3d4e5f60011", { urls: [] })).status, 422);
    const r = await del("64b7f0c2a1b2c3d4e5f60011", { urls: [IMG("h-1")] });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, { discarded: 0 });
  });
});
