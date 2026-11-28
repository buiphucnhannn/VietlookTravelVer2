import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Destination } from "../src/models/destination.model.js";
import { Theme } from "../src/models/theme.model.js";
import { destinationSchema, themeSchema } from "../src/validators/content.validator.js";

const dest = (extra = {}) => ({
  slug: "ha-noi",
  region: "north-vietnam",
  name: { vi: "Hà Nội" },
  ...extra,
});
const theme = (extra = {}) => ({ slug: "am-thuc", name: { vi: "Ẩm thực" }, ...extra });

describe("SEO (Google) cho điểm đến và chủ đề", () => {
  for (const [label, schema, base] of [
    ["điểm đến", destinationSchema, dest],
    ["chủ đề", themeSchema, theme],
  ]) {
    it(`${label}: không gửi seo → hợp lệ, không có tiêu đề / mô tả riêng`, () => {
      const r = schema.safeParse(base());
      assert.equal(r.success, true, JSON.stringify(r.error?.issues));
      for (const lang of ["en", "zh", "vi"]) {
        assert.equal(r.data.seo?.[lang]?.title ?? "", "");
        assert.equal(r.data.seo?.[lang]?.description ?? "", "");
      }
    });

    it(`${label}: giữ tiêu đề / mô tả đã nhập (cắt khoảng trắng)`, () => {
      const r = schema.safeParse(
        base({ seo: { vi: { title: "  Tiêu đề Google ", description: "Mô tả ngắn" } } }),
      );
      assert.equal(r.success, true);
      assert.equal(r.data.seo.vi.title, "Tiêu đề Google");
      assert.equal(r.data.seo.vi.description, "Mô tả ngắn");
      assert.equal(r.data.seo.en?.title ?? "", "");
    });

    it(`${label}: tiêu đề > 200 ký tự / mô tả > 500 ký tự bị chặn`, () => {
      const longTitle = schema.safeParse(base({ seo: { en: { title: "a".repeat(201) } } }));
      assert.equal(longTitle.success, false);
      assert.deepEqual(longTitle.error.issues[0].path, ["seo", "en", "title"]);
      const longDesc = schema.safeParse(base({ seo: { zh: { description: "b".repeat(501) } } }));
      assert.equal(longDesc.success, false);
      assert.deepEqual(longDesc.error.issues[0].path, ["seo", "zh", "description"]);
    });
  }

  it("model Mongoose có trường seo cho cả hai loại", () => {
    for (const Model of [Destination, Theme]) {
      const doc = new Model({ slug: "x", region: "north-vietnam", name: { vi: "X" } });
      assert.equal(doc.seo.vi.title, "");
      assert.ok(Model.schema.path("seo.en.title"), Model.modelName);
    }
  });
});
