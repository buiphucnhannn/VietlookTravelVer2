import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectReferences,
  DAY,
  deleteAssets,
  extractRefs,
  isManaged,
  listAssets,
  markOrphans,
  nextRunAt,
  orphanStore,
  pendingStore,
  planSweep,
  removedRefs,
  runSweep,
  scheduleDailySweep,
} from "../src/services/media-cleanup.service.js";
import { safeLookup } from "../src/services/upload.service.js";

const F = "vietlook";
const URL_A =
  "https://res.cloudinary.com/vltest/image/upload/v1712345678/vietlook/tours/abc123.webp";
const URL_B =
  "https://res.cloudinary.com/vltest/image/upload/c_crop,x_1,y_2,w_300,h_200/c_scale,w_1600/v1/vietlook/articles/x-y_z.jpg";
const HOURS = 3600_000;
const NOW = Date.parse("2026-11-11T00:00:00Z");
const old = new Date(NOW - 48 * HOURS).toISOString();
const fresh = new Date(NOW - 2 * HOURS).toISOString();

describe("dọn ảnh: tìm tham chiếu", () => {
  it("lấy public_id từ link Cloudinary (có / không có biến đổi, có số phiên bản)", () => {
    assert.deepEqual([...extractRefs(URL_A, F)], ["vietlook/tours/abc123"]);
    assert.deepEqual([...extractRefs(URL_B, F)], ["vietlook/articles/x-y_z"]);
  });

  it("tìm trong object lồng nhau, mảng và HTML bài viết", () => {
    const doc = {
      image: URL_A,
      gallery: [URL_B],
      content: {
        vi: { body: `<p>Chào</p><img src="${URL_A.replace("abc123", "inline1")}" loading="lazy">` },
      },
      banner: {
        slides: [
          {
            video:
              "https://res.cloudinary.com/vltest/video/upload/v9/vietlook/banner/drive-1AbC_d.mp4",
          },
        ],
      },
      home: {
        images: { b2b: "https://res.cloudinary.com/vltest/image/upload/v2/vietlook/home/b2b.webp" },
      },
    };
    assert.deepEqual(
      [...extractRefs(doc, F)].sort(),
      [
        "vietlook/articles/x-y_z",
        "vietlook/banner/drive-1AbC_d",
        "vietlook/home/b2b",
        "vietlook/tours/abc123",
        "vietlook/tours/inline1",
      ].sort(),
    );
  });

  it("không khớp nhầm thư mục có tên dài hơn / ảnh tĩnh / dữ liệu rỗng", () => {
    assert.equal(extractRefs("https://x/myvietlook/tours/a.jpg", F).size, 0);
    assert.equal(extractRefs("/images/tours/a.jpg", F).size, 0);
    assert.equal(extractRefs(null, F).size, 0);
    assert.equal(extractRefs({ a: "vietlook/tours/a" }, "").size, 0);
  });

  it("chỉ dọn trong thư mục CMS, không bao giờ đụng ảnh hệ thống site/", () => {
    assert.equal(isManaged("vietlook/tours/a", F), true);
    assert.equal(isManaged("vietlook/site/images/home/hero", F), false);
    assert.equal(isManaged("other/tours/a", F), false);
    assert.equal(isManaged("vietlookx/a", F), false);
  });

  it("ảnh bị thay / bỏ sau khi lưu", () => {
    const prev = {
      image: URL_A,
      hero: URL_B,
      gallery: ["https://res.cloudinary.com/vltest/image/upload/v1/vietlook/site/x.jpg"],
    };
    const next = { image: URL_A, hero: "" };
    assert.deepEqual(removedRefs(prev, next, F), ["vietlook/articles/x-y_z"]);
    assert.deepEqual(removedRefs(prev, prev, F), []);
    // xoá bản ghi → mọi ảnh (trừ ảnh hệ thống) là ứng viên
    assert.deepEqual(removedRefs(prev, null, F).sort(), [
      "vietlook/articles/x-y_z",
      "vietlook/tours/abc123",
    ]);
  });
});

describe("dọn ảnh: kế hoạch quét", () => {
  const assets = [
    { publicId: "vietlook/tours/used", createdAt: old },
    { publicId: "vietlook/tours/orphan-old", createdAt: old },
    { publicId: "vietlook/tours/orphan-new", createdAt: fresh },
    { publicId: "vietlook/site/images/x", createdAt: old },
    ...Array.from({ length: 7 }, (_, i) => ({ publicId: `vietlook/tours/u${i}`, createdAt: old })),
  ];
  const refs = new Set([
    "vietlook/tours/used",
    ...Array.from({ length: 7 }, (_, i) => `vietlook/tours/u${i}`),
  ]);

  const base = { assets, refs, now: NOW, folder: F, graceMs: 7 * DAY };

  it("file không dùng & cũ hơn 24 giờ chỉ được đánh dấu, chưa xoá; bỏ qua ảnh hệ thống", () => {
    const p = planSweep(base);
    assert.equal(p.total, 10);
    assert.equal(p.referenced, 8);
    assert.equal(p.young, 1);
    assert.deepEqual(
      p.toMark.map((a) => a.publicId),
      ["vietlook/tours/orphan-old"],
    );
    assert.equal(p.toMark[0].deletableAt.getTime(), NOW + 7 * DAY);
    assert.deepEqual(p.toDelete, []);
    assert.equal(p.aborted, false);
  });

  it("chỉ xoá khi đã đánh dấu đủ thời gian chờ", () => {
    const at = (days) => ({
      publicId: "vietlook/tours/orphan-old",
      firstSeenAt: new Date(NOW - days * DAY),
    });
    const waiting = planSweep({ ...base, candidates: [at(6.9)] });
    assert.deepEqual(waiting.toDelete, []);
    assert.equal(waiting.waiting.length, 1);
    assert.deepEqual(waiting.toMark, []);
    const due = planSweep({ ...base, candidates: [at(7)] });
    assert.deepEqual(
      due.toDelete.map((a) => a.publicId),
      ["vietlook/tours/orphan-old"],
    );
    // đánh dấu đủ lâu nhưng file mới tải lên < 24 giờ → vẫn chưa xoá
    const young = planSweep({
      ...base,
      candidates: [
        { publicId: "vietlook/tours/orphan-new", firstSeenAt: new Date(NOW - 30 * DAY) },
      ],
    });
    assert.deepEqual(young.toDelete, []);
    assert.deepEqual(young.toUnmark, []); // vẫn giữ đánh dấu
  });

  it("bỏ đánh dấu file được dùng lại hoặc không còn trên Cloudinary", () => {
    const p = planSweep({
      ...base,
      candidates: [
        { publicId: "vietlook/tours/used", firstSeenAt: new Date(NOW - 30 * DAY) },
        { publicId: "vietlook/tours/gone", firstSeenAt: new Date(NOW - 30 * DAY) },
      ],
    });
    assert.deepEqual(p.toUnmark.sort(), ["vietlook/tours/gone", "vietlook/tours/used"]);
    assert.deepEqual(p.toDelete, []);
  });

  it("thời gian chờ = 0 (chạy tay) → xoá ngay file không dùng", () => {
    const p = planSweep({ ...base, graceMs: 0 });
    assert.deepEqual(
      p.toDelete.map((a) => a.publicId),
      ["vietlook/tours/orphan-old"],
    );
  });

  it("dừng khi quá 30% file không dùng (trừ khi --force)", () => {
    const few = new Set(["vietlook/tours/used"]);
    const p = planSweep({ ...base, refs: few });
    assert.equal(p.aborted, true);
    assert.match(p.reason, /30%/);
    assert.equal(planSweep({ ...base, refs: few, force: true }).aborted, false);
  });

  it("dừng khi không tìm thấy tham chiếu nào (quét nhầm cơ sở dữ liệu)", () => {
    const p = planSweep({ ...base, refs: new Set(), maxRatio: 1 });
    assert.equal(p.aborted, true);
  });

  it("dừng khi cơ sở dữ liệu gần như trống", () => {
    const p = planSweep({ ...base, docCount: 3, minDocs: 10 });
    assert.equal(p.aborted, true);
    assert.match(p.reason, /empty/);
    assert.equal(planSweep({ ...base, docCount: 50, minDocs: 10 }).aborted, false);
  });
});

describe("dọn ảnh: lịch chạy hằng ngày", () => {
  it("03:00 giờ Việt Nam kế tiếp", () => {
    // 07:00 VN ngày 11 → 03:00 VN ngày 12 = 20:00 UTC ngày 11
    assert.equal(nextRunAt(NOW).toISOString(), "2026-11-11T20:00:00.000Z");
    // 02:59 VN → cùng ngày
    assert.equal(
      nextRunAt(Date.parse("2026-11-10T19:59:00Z")).toISOString(),
      "2026-11-10T20:00:00.000Z",
    );
    // đúng 03:00 VN → hôm sau
    assert.equal(
      nextRunAt(Date.parse("2026-11-10T20:00:00Z")).toISOString(),
      "2026-11-11T20:00:00.000Z",
    );
    // cuối năm
    assert.equal(
      nextRunAt(Date.parse("2026-12-31T21:00:00Z")).toISOString(),
      "2027-01-01T20:00:00.000Z",
    );
  });

  it("lên lịch bằng setTimeout và dừng được", () => {
    let ran = 0;
    const stop = scheduleDailySweep({ run: async () => ran++, clock: () => NOW });
    stop();
    assert.equal(ran, 0);
  });
});

/* ---- cơ sở dữ liệu giả lập đủ cho media-cleanup (find / bulkWrite / deleteMany / khoá) ---- */
function fakeDb(data) {
  return {
    data,
    listCollections: () => ({ toArray: async () => Object.keys(data).map((name) => ({ name })) }),
    collection(name) {
      const rows = (data[name] ??= []);
      const drop = (pred) => {
        for (let i = rows.length - 1; i >= 0; i--) if (pred(rows[i])) rows.splice(i, 1);
      };
      return {
        find: () => ({
          toArray: async () => rows.map((r) => ({ ...r })),
          async *[Symbol.asyncIterator]() {
            yield* rows;
          },
        }),
        createIndex: async () => "ok",
        async bulkWrite(ops) {
          for (const { updateOne: u } of ops) {
            let r = rows.find((x) => x.publicId === u.filter.publicId);
            if (!r) rows.push((r = { publicId: u.filter.publicId, ...u.update.$setOnInsert }));
            Object.assign(r, u.update.$set);
          }
        },
        deleteMany: async ({ publicId }) => drop((r) => publicId.$in.includes(r.publicId)),
        findOne: async ({ publicId }) => rows.find((r) => r.publicId === publicId) ?? null,
        async findOneAndUpdate({ publicId }, update) {
          const r = rows.find((x) => x.publicId === publicId);
          if (!r) return null;
          for (const [k, v] of Object.entries(update.$inc ?? {})) r[k] = (r[k] ?? 0) + v;
          return { ...r };
        },
        // giống MongoDB: filter không khớp + upsert → chèn; trùng _id → lỗi 11000
        async updateOne(filter, update, { upsert } = {}) {
          if (filter.publicId) {
            let r = rows.find((x) => x.publicId === filter.publicId);
            if (!r && !upsert) return { matchedCount: 0 };
            const matched = !!r;
            if (!r) rows.push((r = { publicId: filter.publicId, ...update.$setOnInsert }));
            Object.assign(r, update.$set);
            for (const [k, v] of Object.entries(update.$inc ?? {})) r[k] = (r[k] ?? 0) + v;
            for (const [k, v] of Object.entries(update.$addToSet ?? {}))
              r[k] = [...new Set([...(r[k] ?? []), v])];
            return { matchedCount: matched ? 1 : 0 };
          }
          const r = rows.find((x) => x._id === filter._id);
          if (r && r.expiresAt <= filter.expiresAt.$lte) return Object.assign(r, update.$set);
          if (r || !upsert) throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
          rows.push({ _id: filter._id, ...update.$set });
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
          .map((a) => ({ public_id: a.publicId, created_at: a.createdAt, bytes: 1000 })),
      };
    },
    async delete_resources(ids) {
      deleted.push(...ids);
      return { deleted: Object.fromEntries(ids.map((id) => [id, "deleted"])) };
    },
  };
}

describe("dọn ảnh: chạy thật với dữ liệu giả lập", () => {
  const assets = [
    { publicId: "vietlook/tours/used", createdAt: old },
    { publicId: "vietlook/tours/abandoned", createdAt: old }, // tải lên trong CMS nhưng không bao giờ lưu
    // luôn "vừa tải lên" trong suốt các lần chạy giả lập (đến NOW + 10 ngày)
    { publicId: "vietlook/tours/fresh", createdAt: new Date(NOW + 20 * DAY).toISOString() },
    ...Array.from({ length: 7 }, (_, i) => ({ publicId: `vietlook/tours/u${i}`, createdAt: old })),
  ];
  const setup = () => {
    const db = fakeDb({
      tours: [
        { image: "vietlook/tours/used" },
        ...Array.from({ length: 7 }, (_, i) => ({ image: `vietlook/tours/u${i}` })),
      ],
      auditlogs: [{ meta: { id: "vietlook/tours/abandoned" } }],
    });
    const api = fakeApi(assets);
    const audits = [];
    const deps = {
      db,
      api,
      store: orphanStore(db),
      audit: async (m) => audits.push(m),
      enabled: true,
    };
    return { db, api, audits, deps };
  };
  const opts = { apply: true, minDocs: 1, graceMs: 7 * DAY };

  it("đánh dấu → chờ → xoá sau thời gian chờ, ghi 1 dòng nhật ký", async () => {
    const { db, api, audits, deps } = setup();
    let r = await runSweep({ ...opts, now: NOW }, deps);
    assert.equal(r.newOrphans, 1);
    assert.equal(r.deleted, undefined);
    assert.deepEqual(api.deleted, []);
    assert.deepEqual(
      db.data.mediaorphans.map((x) => [x.publicId, x.reason]),
      [["vietlook/tours/abandoned", "unreferenced"]],
    );
    // danh sách đánh dấu không bị tính là "đang dùng"
    r = await runSweep({ ...opts, now: NOW + 3 * DAY }, deps);
    assert.equal(r.waiting, 1);
    assert.equal(db.data.mediaorphans[0].firstSeenAt.getTime(), NOW); // giữ ngày đánh dấu đầu tiên
    assert.deepEqual(api.deleted, []);
    r = await runSweep({ ...opts, now: NOW + 7 * DAY }, deps);
    assert.equal(r.deleted, 1);
    assert.deepEqual(api.deleted, ["vietlook/tours/abandoned"]);
    assert.deepEqual(db.data.mediaorphans, []);
    assert.deepEqual(audits, [{ count: 1, bytes: 1000, graceDays: 7, neverSaved: 0 }]);
    assert.deepEqual(db.data.medialocks, []); // đã nhả khoá
  });

  it("file được dùng lại trong thời gian chờ → bỏ đánh dấu, không xoá", async () => {
    const { db, api, audits, deps } = setup();
    await runSweep({ ...opts, now: NOW }, deps);
    db.data.tours.push({ body: `<img src="https://x/v1/vietlook/tours/abandoned.webp">` });
    const r = await runSweep({ ...opts, now: NOW + 10 * DAY }, deps);
    assert.equal(r.unmarked, 1);
    assert.deepEqual(db.data.mediaorphans, []);
    assert.deepEqual(api.deleted, []);
    assert.deepEqual(audits, []);
  });

  it("chạy thử (không --apply) không ghi / xoá gì", async () => {
    const { db, api, deps } = setup();
    const r = await runSweep({ ...opts, apply: false, now: NOW }, deps);
    assert.equal(r.newOrphans, 1);
    assert.equal(db.data.mediaorphans?.length ?? 0, 0);
    assert.equal(db.data.medialocks?.length ?? 0, 0);
    assert.deepEqual(api.deleted, []);
  });

  it("chốt an toàn: dừng thì không đánh dấu, không xoá", async () => {
    const { db, api, deps } = setup();
    const r = await runSweep({ ...opts, minDocs: 100, now: NOW }, deps);
    assert.equal(r.aborted, true);
    assert.deepEqual(db.data.mediaorphans ?? [], []);
    assert.deepEqual(api.deleted, []);
  });

  it("khoá: 2 lần chạy cùng lúc → chỉ 1 lần chạy, khoá hết hạn thì giành lại được", async () => {
    const { db, deps } = setup();
    const [a, b] = await Promise.all([
      runSweep({ ...opts, now: NOW }, deps),
      runSweep({ ...opts, now: NOW }, deps),
    ]);
    assert.equal([a, b].filter((x) => x.skipped).length, 1);
    const store = orphanStore(db);
    const owner = await store.acquireLock();
    assert.ok(owner);
    assert.equal(await store.acquireLock(), null);
    assert.equal((await runSweep({ ...opts, now: NOW }, deps)).skipped, true);
    db.data.medialocks[0].expiresAt = new Date(Date.now() - 1000); // máy kia chết giữa chừng
    assert.ok(await store.acquireLock());
  });

  it("sau khi lưu: chỉ đánh dấu, không gọi xoá; file bị bỏ khỏi bản ghi hết 'chờ lưu'", async () => {
    const { db, api } = setup();
    const pending = pendingStore(db);
    await pending.add("vietlook/tours/a", { owner: "u1" });
    const n = await markOrphans(
      ["vietlook/tours/a", "vietlook/banner/v", "vietlook/site/x", "other/y"],
      { store: orphanStore(db), pending, enabled: true },
    );
    assert.equal(n, 2);
    assert.deepEqual(db.data.mediapending, []);
    assert.deepEqual(
      db.data.mediaorphans.map((x) => [x.publicId, x.resourceType, x.reason]),
      [
        ["vietlook/tours/a", "image", "removed-on-save"],
        ["vietlook/banner/v", "video", "removed-on-save"],
      ],
    );
    assert.deepEqual(api.deleted, []);
  });
});

describe("dọn ảnh: gọi Cloudinary / cơ sở dữ liệu (giả lập)", () => {
  it("quét mọi collection trừ nhật ký và phiên đăng nhập", async () => {
    const data = {
      tours: [{ image: URL_A }],
      settings: [{ key: "home", value: { images: { about: URL_B } } }],
      auditlogs: [{ target: { id: "vietlook/tours/deleted" } }],
      sessions: [{ x: "vietlook/tours/s" }],
    };
    const db = {
      listCollections: () => ({ toArray: async () => Object.keys(data).map((name) => ({ name })) }),
      collection: (name) => ({
        find: () => ({
          async *[Symbol.asyncIterator]() {
            yield* data[name];
          },
        }),
      }),
    };
    const refs = await collectReferences(db);
    assert.deepEqual([...refs].sort(), ["vietlook/articles/x-y_z", "vietlook/tours/abc123"]);
  });

  it("liệt kê nhiều trang và xoá theo lô 100, tách ảnh / video, bỏ qua ảnh hệ thống", async () => {
    const calls = [];
    const api = {
      async resources(q) {
        calls.push(["list", q.resource_type, q.prefix, q.next_cursor]);
        if (q.resource_type === "video")
          return { resources: [{ public_id: "vietlook/banner/v1", created_at: old }] };
        return q.next_cursor
          ? { resources: [{ public_id: "vietlook/tours/b", created_at: old }] }
          : { resources: [{ public_id: "vietlook/tours/a", created_at: old }], next_cursor: "c2" };
      },
      async delete_resources(ids, o) {
        calls.push(["del", o.resource_type, ids.length]);
        return { deleted: Object.fromEntries(ids.map((id) => [id, "deleted"])) };
      },
    };
    const list = await listAssets(api);
    assert.deepEqual(
      list.map((a) => a.publicId),
      ["vietlook/tours/a", "vietlook/tours/b", "vietlook/banner/v1"],
    );
    assert.equal(list[2].resourceType, "video");

    const many = [
      ...Array.from({ length: 150 }, (_, i) => ({
        publicId: `vietlook/tours/x${i}`,
        resourceType: "image",
      })),
      { publicId: "vietlook/site/keep", resourceType: "image" },
      { publicId: "vietlook/banner/v1", resourceType: "video" },
    ];
    calls.length = 0;
    const n = await deleteAssets(many, api);
    assert.equal(n, 151);
    assert.deepEqual(calls, [
      ["del", "image", 100],
      ["del", "image", 50],
      ["del", "video", 1],
    ]);
  });
});

describe("ảnh từ link: chặn địa chỉ nội bộ", () => {
  it("localhost bị chặn ngay lúc phân giải tên miền", async () => {
    const err = await new Promise((resolve) =>
      safeLookup("localhost", { all: true }, (e) => resolve(e)),
    );
    assert.equal(err?.code, "EBLOCKED");
  });
});
