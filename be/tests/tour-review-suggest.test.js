import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultKeywords,
  placeKey,
  rankReviews,
} from "../src/services/tour-review-suggest.service.js";

const r = (text, extra = {}) => ({
  id: text.slice(0, 10),
  name: "Khách",
  title: "",
  text,
  rating: 5,
  source: "tripadvisor",
  date: "2026-01-01",
  trip: "",
  ...extra,
});

test("placeKey: bỏ chữ chỉ loại địa danh, bỏ dấu", () => {
  assert.equal(placeKey("Vịnh Hạ Long"), "ha long");
  assert.equal(placeKey("Ha Long Bay"), "ha long");
  assert.equal(placeKey("Da Nang City"), "da nang");
  assert.equal(placeKey("Hoi An Ancient Town"), "hoi an");
});

test("rankReviews: 'ha long' khớp 'Halong', 'ha noi' khớp 'Hanoi'; bài khớp nhiều nơi xếp trước", () => {
  const items = rankReviews(
    [
      r("Great cruise in Halong, guide was kind"),
      r("We loved Hanoi and Ha Long bay, then Hoi An", { date: "2025-01-01" }),
      r("Amazing Sapa trekking"),
    ],
    ["ha long", "ha noi", "hoi an"],
  );
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].matches, ["ha long", "ha noi", "hoi an"]);
  assert.deepEqual(items[1].matches, ["ha long"]);
});

test("rankReviews: chữ ngắn so theo từ (không khớp nhầm 'hue' trong chữ khác)", () => {
  const items = rankReviews([r("The hues of the sunset"), r("Hue citadel was great")], ["hue"]);
  assert.equal(items.length, 1);
  assert.match(items[0].text, /citadel/);
});

test("rankReviews: nhắc mã tour được cộng điểm cao", () => {
  const items = rankReviews(
    [r("Ha Long and Hoi An were fine"), r("Tour LTV92 in Ha Long was great")],
    ["ha long", "hoi an"],
    "LTV92",
  );
  assert.match(items[0].text, /LTV92/);
});

test('defaultKeywords: lấy địa danh từ chặng / tên tour, bỏ chữ chung chung, giữ "Hội An", "Tràng An"', async () => {
  const kw = await defaultKeywords({
    titles: ["Tour Hạ Long – Ninh Bình 10 ngày 9 đêm"],
    route: ["Chào mừng đến Hà Nội", "Tràng An – Hội An", "Đón sân bay"],
  });
  for (const k of ["ha noi", "trang an", "hoi an", "ha long", "ninh binh"])
    assert.ok(kw.includes(k), k);
  assert.ok(!kw.some((k) => /chao|mung|ngay|dem|tour|don/.test(k)), kw.join(","));
});
