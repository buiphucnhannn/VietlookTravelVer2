import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentName } from "../src/repositories/audit-log.repository.js";
import { enrichTargets } from "../src/services/audit.service.js";

const ID = "6650a1b2c3d4e5f601234567";

describe("nhật ký — tên dễ đọc của đối tượng", () => {
  it("contentName: ưu tiên tiếng Việt, tour lấy tiêu đề trong content, không dùng đường dẫn", () => {
    assert.equal(
      contentName({ name: { en: "Ha Long", vi: "Hạ Long" }, slug: "ha-long" }),
      "Hạ Long",
    );
    assert.equal(contentName({ title: { en: "Guide", vi: "" } }), "Guide");
    assert.equal(
      contentName({ slug: "x", content: { en: { title: "Ha Long 2D1N" }, vi: { title: "" } } }),
      "Ha Long 2D1N",
    );
    assert.equal(contentName({ slug: "only-slug" }), "");
  });

  it("enrichTargets: dòng cũ không có tên → tra tên hiện tại; đã xoá → targetGone; xoá không tra", async () => {
    const asked = [];
    const lookup = async (refs) => {
      asked.push(...refs);
      return new Map([
        [`author:${ID}`, { name: "Vietlook Travel Team" }],
        ["enquiry:VL-BK1", { name: "VL-BK1", customer: "Emily Carter", kind: "bookings" }],
      ]);
    };
    const rows = await enrichTargets(
      [
        {
          action: "author.show",
          target: { type: "author", id: ID },
          meta: { slug: "vietlook-team" },
        },
        {
          action: "tour.update",
          target: { type: "tour", id: "6650a1b2c3d4e5f6012345ff" },
          meta: {},
        },
        { action: "tour.delete", target: { type: "tour", id: ID }, meta: { name: "Hạ Long 2N1Đ" } },
        { action: "enquiry.note", target: { type: "enquiry", id: "VL-BK1" } },
        { action: "auth.login", target: {}, meta: {} },
      ],
      lookup,
    );
    assert.equal(rows[0].targetName, "Vietlook Travel Team");
    assert.equal(rows[0].targetGone, false);
    assert.equal(rows[1].targetName, "");
    assert.equal(rows[1].targetGone, true);
    assert.equal(rows[2].targetName, "Hạ Long 2N1Đ");
    assert.equal(rows[2].targetGone, true);
    assert.equal(rows[3].customer, "Emily Carter");
    assert.equal(rows[3].targetKind, "bookings");
    assert.equal(rows[4].targetGone, false);
    // xoá + đăng nhập không cần tra
    assert.equal(asked.length, 3);
  });

  it("enrichTargets: tên ghi lúc thao tác được ưu tiên hơn tên hiện tại", async () => {
    const [row] = await enrichTargets(
      [{ action: "tour.update", target: { type: "tour", id: ID }, meta: { name: "Tên cũ" } }],
      async () => new Map([[`tour:${ID}`, { name: "Tên mới" }]]),
    );
    assert.equal(row.targetName, "Tên cũ");
    assert.equal(row.targetGone, false);
  });
});
