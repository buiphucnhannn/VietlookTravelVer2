import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  articleSchema,
  destinationSchema,
  themeSchema,
  tourSchema,
  visaTypeSchema,
} from "../src/validators/content.validator.js";
import { prepareArticle } from "../src/services/modules.service.js";
import { slugify } from "../src/utils/slugify.js";

const name = (v) => ({ en: "", zh: "", vi: "", ...v });

describe("nội dung nhiều ngôn ngữ: chỉ cần 1 ngôn ngữ bất kỳ", () => {
  const dest = (n) => ({ slug: "ha-long", region: "north-vietnam", name: n });

  it("nhận tên chỉ có tiếng Việt / chỉ có tiếng Trung / chỉ có tiếng Anh", () => {
    for (const n of [
      name({ vi: "Vịnh Hạ Long" }),
      name({ zh: "下龙湾" }),
      name({ en: "Ha Long" }),
    ]) {
      assert.equal(destinationSchema.safeParse(dest(n)).success, true, JSON.stringify(n));
      assert.equal(themeSchema.safeParse({ slug: "x", name: n }).success, true);
      assert.equal(visaTypeSchema.safeParse({ key: "x", name: n }).success, true);
    }
  });

  it("từ chối khi cả 3 ngôn ngữ đều trống", () => {
    const r = destinationSchema.safeParse(dest(name({ vi: "   " })));
    assert.equal(r.success, false);
    assert.match(r.error.issues[0].message, /ít nhất một ngôn ngữ/);
    assert.equal(
      destinationSchema.safeParse({ slug: "x", region: "north-vietnam" }).success,
      false,
    );
  });

  it("vẫn giữ giới hạn độ dài", () => {
    assert.equal(
      themeSchema.safeParse({ slug: "x", name: name({ vi: "a".repeat(81) }) }).success,
      false,
    );
  });

  it("bài viết: tiêu đề tiếng Việt là đủ", () => {
    const ok = articleSchema.safeParse({
      slug: "bai-viet",
      title: name({ vi: "Cẩm nang Hà Nội" }),
    });
    assert.equal(ok.success, true);
    assert.doesNotThrow(() => prepareArticle(ok.data));
    assert.equal(articleSchema.safeParse({ slug: "bai-viet", title: name({}) }).success, false);
  });

  it("tour: tên ở 1 ngôn ngữ bất kỳ", () => {
    const tour = (titles) => ({
      slug: "ha-noi-3-ngay",
      content: Object.fromEntries(["en", "zh", "vi"].map((l) => [l, { title: titles[l] ?? "" }])),
    });
    assert.equal(tourSchema.safeParse(tour({ zh: "河内三日游" })).success, true);
    assert.equal(tourSchema.safeParse(tour({ vi: "Hà Nội 3 ngày" })).success, true);
    assert.equal(tourSchema.safeParse(tour({})).success, false);
  });

  it("tạo đường dẫn từ tên tiếng Việt (bỏ dấu, đ → d)", () => {
    assert.equal(slugify("Đà Nẵng – Hội An 3 ngày"), "da-nang-hoi-an-3-ngay");
  });
});

describe("bài viết: ghi công ảnh bìa, bảng, ghi công ảnh trong chú thích", () => {
  const base = { slug: "bai-viet", title: name({ en: "Guide" }) };

  it("nhận nguồn ảnh bìa (≤ 200 ký tự) + link https; mặc định để trống", () => {
    const ok = articleSchema.safeParse({
      ...base,
      imageCredit: "  InterEdit88 / Wikimedia Commons (CC0) ",
      imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Ha_Long.jpg",
    });
    assert.equal(ok.success, true);
    assert.equal(ok.data.imageCredit, "InterEdit88 / Wikimedia Commons (CC0)");
    const empty = articleSchema.parse(base);
    assert.equal(empty.imageCredit, "");
    assert.equal(empty.imageCreditUrl, "");
  });

  it("từ chối nguồn ảnh quá dài và link không phải https", () => {
    assert.equal(articleSchema.safeParse({ ...base, imageCredit: "a".repeat(201) }).success, false);
    for (const imageCreditUrl of ["http://x.com/a", "javascript:alert(1)", "commons.wikimedia.org"])
      assert.equal(articleSchema.safeParse({ ...base, imageCreditUrl }).success, false);
  });

  it("lọc HTML giữ bảng (thead/th) và dòng ghi công ảnh có link", () => {
    const html =
      "<table><thead><tr><th></th><th>Hanoi</th></tr></thead><tbody><tr><td>Jan</td><td>17°C</td></tr></tbody></table>" +
      '<figure><img src="https://res.cloudinary.com/demo/image/upload/v1/a.jpg" alt="x"><figcaption>Bay. ' +
      '<span class="photo-credit">Photo: <a href="https://commons.wikimedia.org/wiki/User:A" target="_blank">A</a>' +
      " / Wikimedia Commons</span></figcaption></figure>";
    const body = prepareArticle(articleSchema.parse({ ...base, body: { en: html } })).body.en;
    assert.match(body, /<table><thead><tr><th><\/th><th>Hanoi<\/th><\/tr><\/thead><tbody>/);
    assert.match(
      body,
      /<span class="photo-credit">Photo: <a href="https:\/\/commons\.wikimedia\.org\/wiki\/User:A" target="_blank" rel="noopener noreferrer nofollow">A<\/a> \/ Wikimedia Commons<\/span>/,
    );
  });
});
