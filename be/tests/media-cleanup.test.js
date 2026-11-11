import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectReferences,
  deleteAssets,
  extractRefs,
  isManaged,
  listAssets,
  planSweep,
  removedRefs,
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

  it("chỉ xoá file không dùng và cũ hơn 24 giờ, bỏ qua ảnh hệ thống", () => {
    const p = planSweep({ assets, refs, now: NOW, folder: F });
    assert.equal(p.total, 10);
    assert.equal(p.referenced, 8);
    assert.equal(p.young, 1);
    assert.deepEqual(
      p.toDelete.map((a) => a.publicId),
      ["vietlook/tours/orphan-old"],
    );
    assert.equal(p.aborted, false);
  });

  it("dừng khi sắp xoá quá 30% (trừ khi --force)", () => {
    const few = new Set(["vietlook/tours/used"]);
    const p = planSweep({ assets, refs: few, now: NOW, folder: F });
    assert.equal(p.aborted, true);
    assert.match(p.reason, /30%/);
    assert.equal(planSweep({ assets, refs: few, now: NOW, folder: F, force: true }).aborted, false);
  });

  it("dừng khi không tìm thấy tham chiếu nào (quét nhầm cơ sở dữ liệu)", () => {
    const p = planSweep({ assets, refs: new Set(), now: NOW, folder: F, maxRatio: 1 });
    assert.equal(p.aborted, true);
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
