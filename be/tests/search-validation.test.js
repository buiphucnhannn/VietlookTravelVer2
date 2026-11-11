import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchRegex } from "../src/utils/search.js";
import { carSchema, tourSchema } from "../src/validators/content.validator.js";

describe("Tìm kiếm CMS không phân biệt dấu / hoa thường / khoảng trắng", () => {
  const data = [
    "Hà Nội – Hạ Long 3 ngày",
    "HÀ NỘI",
    "Hanoi city tour",
    "ha-noi-street-food",
    "Đà Nẵng",
    "VL-HN01",
  ];
  const hits = (q) => data.filter((s) => searchRegex(q).test(s));

  it('"ha noi" = "hà nội" = "hanoi" = "HÀ NỘI"', () => {
    const expected = ["Hà Nội – Hạ Long 3 ngày", "HÀ NỘI", "Hanoi city tour", "ha-noi-street-food"];
    for (const q of ["ha noi", "hà nội", "hanoi", "HÀ NỘI", "  Ha   Noi "])
      assert.deepEqual(hits(q), expected, q);
  });

  it("đ → d, mã có gạch nối, ký tự đặc biệt được escape", () => {
    assert.deepEqual(hits("da nang"), ["Đà Nẵng"]);
    assert.deepEqual(hits("vlhn01"), ["VL-HN01"]);
    assert.deepEqual(hits("(.*)"), []);
  });

  it("câu tìm rỗng / chỉ có dấu phân cách → không lọc", () => {
    assert.equal(searchRegex(""), null);
    assert.equal(searchRegex(" - "), null);
    assert.equal(searchRegex(undefined), null);
  });
});

describe("Kiểm tra số đêm ≤ số ngày (tour) và số khách ≤ số chỗ (xe)", () => {
  const tour = (days, nights) =>
    tourSchema.safeParse({ slug: "qa-tour", days, nights, content: { vi: { title: "Tour thử" } } });

  it("tour: 2 ngày 5 đêm bị chặn với thông báo tiếng Việt ở ô Số đêm", () => {
    const r = tour(2, 5);
    assert.equal(r.success, false);
    assert.deepEqual(r.error.issues[0].path, ["nights"]);
    assert.match(r.error.issues[0].message, /Số đêm không được nhiều hơn số ngày/);
  });

  it("tour: 3N2Đ, 2N2Đ, tour trong ngày 1N0Đ hợp lệ", () => {
    for (const [d, n] of [
      [3, 2],
      [2, 2],
      [1, 0],
    ])
      assert.equal(tour(d, n).success, true, `${d}/${n}`);
  });

  it("xe: 4 chỗ 10 khách bị chặn, 4 chỗ 3 khách hợp lệ", () => {
    const car = (seats, pax) =>
      carSchema.safeParse({ key: "qa-car", seats, pax, name: { vi: "Xe thử" } });
    const bad = car(4, 10);
    assert.equal(bad.success, false);
    assert.deepEqual(bad.error.issues[0].path, ["pax"]);
    assert.equal(car(4, 3).success, true);
    assert.equal(car(7, 7).success, true);
  });
});
