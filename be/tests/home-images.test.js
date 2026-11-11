import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { homeSettingsSchema } from "../src/validators/content.validator.js";

const CDN = "https://res.cloudinary.com/demo/image/upload/v1/vietlook/home/abc.jpg";

describe("trang chủ — ảnh các khối (home.images)", () => {
  it("không gửi ảnh → mặc định trống (website dùng ảnh có sẵn)", () => {
    assert.deepEqual(homeSettingsSchema.parse({}).images, {});
    const r = homeSettingsSchema.parse({ images: { services: {} } });
    assert.deepEqual(r.images, {
      services: { tours: "", car: "", visa: "" },
      star: [],
      b2bNorth: [],
      b2bSouth: [],
      about: "",
    });
  });

  it("nhận ảnh kho ảnh / ảnh có sẵn, ô trống giữ nguyên", () => {
    const r = homeSettingsSchema.parse({
      images: {
        services: { tours: CDN },
        star: ["", CDN, "", "", "", "/images/ribbon/bottom.webp"],
        b2bNorth: [CDN, "", ""],
        about: CDN,
      },
    });
    assert.equal(r.images.services.tours, CDN);
    assert.equal(r.images.services.car, "");
    assert.equal(r.images.star[1], CDN);
    assert.equal(r.images.b2bNorth[0], CDN);
    assert.equal(r.images.about, CDN);
  });

  it("từ chối link ảnh lạ và vượt số ô", () => {
    assert.equal(
      homeSettingsSchema.safeParse({ images: { about: "https://evil.example/x.jpg" } }).success,
      false,
    );
    assert.equal(
      homeSettingsSchema.safeParse({ images: { b2bSouth: ["", "", "", ""] } }).success,
      false,
    );
    assert.equal(
      homeSettingsSchema.safeParse({ images: { star: Array(7).fill("") } }).success,
      false,
    );
  });
});
