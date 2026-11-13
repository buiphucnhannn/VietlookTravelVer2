import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { REVIEW_PLACES } from "../src/constants/content.js";
import { LEGACY_EDITOR_PERMISSIONS } from "../src/constants/permissions.js";
import { auditLogRepository } from "../src/repositories/audit-log.repository.js";
import { reviewRepository } from "../src/repositories/content.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { signAccessToken } from "../src/services/token.service.js";
import { reviewSchema } from "../src/validators/review.validator.js";

/** Đánh giá khách: kiểm tra dữ liệu, trang công khai, phân quyền — không cần MongoDB thật (thay repository) */
const app = createApp();
const saved = [];
const stub = (obj, name, fn) => {
  saved.push([obj, name, obj[name]]);
  obj[name] = fn;
};
after(() => {
  for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
});

const valid = { name: "Bhavik Shah", text: "It was a wonderful experience." };
const msgs = (r) => r.error.issues.map((i) => i.message);

describe("đánh giá khách — kiểm tra dữ liệu", () => {
  it("mặc định: 5 sao, Tripadvisor, hiện ở mọi trang, đang hiện", () => {
    const d = reviewSchema.parse(valid);
    assert.equal(d.rating, 5);
    assert.equal(d.source, "tripadvisor");
    assert.deepEqual(d.showOn, REVIEW_PLACES);
    assert.equal(d.isActive, true);
    assert.equal(d.url, "");
    assert.equal(d.date, "");
    assert.equal(typeof d.trip, "object"); // nhãn chuyến đi không bắt buộc
  });

  it("bắt buộc tên + nội dung, báo bằng tiếng Việt", () => {
    const r = reviewSchema.safeParse({ name: "  ", text: "<b></b>" });
    assert.equal(r.success, false);
    assert.ok(msgs(r).includes("Vui lòng nhập tên người viết đánh giá"));
    assert.ok(msgs(r).includes("Vui lòng nhập nội dung đánh giá"));
  });

  it("lời khách là chữ thuần: bỏ thẻ HTML, giữ xuống dòng, giữ emoji và dấu so sánh", () => {
    const d = reviewSchema.parse({
      name: "Nisarg\n  s",
      title: "<i>Danang</i>   Trip",
      text: "Nice Trip.<script>alert(1)</script>\r\n\r\n\r\n\r\nKids < 5 loved it 😊👍",
    });
    assert.equal(d.name, "Nisarg s");
    assert.equal(d.title, "Danang Trip");
    assert.equal(d.text, "Nice Trip.alert(1)\n\nKids < 5 loved it 😊👍");
  });

  it("số sao 1–5, nguồn / trang / ngôn ngữ trong danh sách cho phép", () => {
    assert.equal(reviewSchema.safeParse({ ...valid, rating: 0 }).success, false);
    assert.equal(reviewSchema.safeParse({ ...valid, rating: 6 }).success, false);
    assert.equal(reviewSchema.safeParse({ ...valid, rating: 4.5 }).success, false);
    assert.equal(reviewSchema.parse({ ...valid, rating: "4" }).rating, 4);
    assert.equal(reviewSchema.safeParse({ ...valid, source: "yelp" }).success, false);
    assert.equal(reviewSchema.safeParse({ ...valid, language: "fr" }).success, false);
    assert.equal(reviewSchema.safeParse({ ...valid, showOn: ["blog"] }).success, false);
    const none = reviewSchema.safeParse({ ...valid, showOn: [] });
    assert.ok(msgs(none).includes("Chọn ít nhất một trang để hiện đánh giá"));
    assert.deepEqual(reviewSchema.parse({ ...valid, showOn: ["car", "home", "car"] }).showOn, [
      "home",
      "car",
    ]);
  });

  it("link bài gốc chỉ nhận http(s)", () => {
    const ok = "https://www.tripadvisor.com/ShowUserReviews-g1-d2-r3.html";
    assert.equal(reviewSchema.parse({ ...valid, url: ` ${ok} ` }).url, ok);
    for (const url of ["javascript:alert(1)", "data:text/html,x", "ftp://x.com", "trang web"])
      assert.equal(reviewSchema.safeParse({ ...valid, url }).success, false, url);
  });

  it("ngày đánh giá: YYYY-MM-DD có thật, không ở tương lai", () => {
    assert.equal(reviewSchema.parse({ ...valid, date: "2025-10-03" }).date, "2025-10-03");
    assert.equal(reviewSchema.safeParse({ ...valid, date: "2025-02-30" }).success, false);
    assert.equal(reviewSchema.safeParse({ ...valid, date: "03/10/2025" }).success, false);
    assert.equal(reviewSchema.safeParse({ ...valid, date: "2999-01-01" }).success, false);
  });

  it("ảnh minh hoạ chỉ nhận ảnh của website", () => {
    assert.equal(
      reviewSchema.safeParse({ ...valid, photo: "/images/tours/v2/hanoi-920561.jpg" }).success,
      true,
    );
    assert.equal(
      reviewSchema.safeParse({ ...valid, photo: "https://evil.example/x.jpg" }).success,
      false,
    );
  });
});

describe("đánh giá khách — GET /public/reviews", () => {
  it("chỉ đánh giá đang hiện, theo thứ tự CMS; không trả trường nội bộ", async () => {
    let args;
    stub(reviewRepository, "listActive", async (a) => {
      args = a;
      return [
        {
          _id: "64b7f0c2a1b2c3d4e5f6a001",
          name: "Ankil P",
          title: "Patel family",
          text: "We had a wonderful experience.",
          rating: 5,
          source: "tripadvisor",
          url: "https://www.tripadvisor.com/x",
          date: "",
          trip: { en: "Family tour · Phu Quoc", vi: "Tour gia đình · Phú Quốc" },
          photo: "",
          language: "en",
          showOn: ["home", "car"],
        },
      ];
    });
    const res = await request(app).get("/api/v1/public/reviews");
    assert.equal(res.status, 200);
    assert.deepEqual(args.sort, { order: 1, createdAt: 1 });
    assert.doesNotMatch(args.select, /createdAt|updatedAt|isActive|order/);
    const [r] = res.body.data;
    assert.equal(r.id, "64b7f0c2a1b2c3d4e5f6a001");
    assert.equal(r._id, undefined);
    assert.deepEqual(r.trip, {
      en: "Family tour · Phu Quoc",
      zh: "",
      vi: "Tour gia đình · Phú Quốc",
    });
    assert.deepEqual(r.showOn, ["home", "car"]);
  });
});

describe("đánh giá khách — phân quyền CMS", () => {
  const ID = {
    staff: "64b7f0c2a1b2c3d4e5f6d001",
    legacy: "64b7f0c2a1b2c3d4e5f6d002",
    review: "64b7f0c2a1b2c3d4e5f6d003",
  };
  const users = {
    [ID.staff]: {
      _id: ID.staff,
      username: "staff",
      role: "editor",
      isActive: true,
      tokenVersion: 0,
      permissions: { tours: "full", reviews: "view" },
    },
    [ID.legacy]: { _id: ID.legacy, username: "old", role: "editor", isActive: true },
  };
  before(() => {
    stub(userRepository, "findById", async (id) => users[String(id)] ?? null);
    stub(auditLogRepository, "create", async () => ({}));
    stub(reviewRepository, "paginate", async () => ({ items: [], total: 0 }));
  });
  const call = (id, method, path, body) => {
    const agent = request(app);
    const r = agent[method](`/api/v1/admin/reviews${path}`).set(
      "Cookie",
      `vl_at=${signAccessToken(users[id])}`,
    );
    if (method !== "get") r.set("X-Requested-With", "fetch");
    return body === undefined ? r : r.send(body);
  };

  it("mục mới có trong quyền cũ của nhân viên (toàn quyền như các mục nội dung khác)", () => {
    assert.equal(LEGACY_EDITOR_PERMISSIONS.reviews, "full");
  });

  it("chỉ xem: xem danh sách được, thêm / xoá bị chặn", async () => {
    assert.equal((await call(ID.staff, "get", "")).status, 200);
    assert.equal((await call(ID.staff, "post", "", valid)).status, 403);
    assert.equal((await call(ID.staff, "delete", `/${ID.review}`)).status, 403);
  });

  it("có quyền sửa: dữ liệu sai → 422 kèm câu tiếng Việt", async () => {
    const res = await call(ID.legacy, "post", "", { name: "", text: "x", rating: 9 });
    assert.equal(res.status, 422);
    assert.match(JSON.stringify(res.body), /Vui lòng nhập tên người viết đánh giá/);
  });
});
