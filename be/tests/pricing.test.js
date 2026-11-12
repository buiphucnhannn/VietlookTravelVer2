import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { priceLineLabel } from "../src/emails/format.js";
import { SMALL_GROUP_DEFAULT, estimatePrice, smallGroupPercent } from "../src/utils/pricing.js";
import { smallGroupSettingsSchema } from "../src/validators/content.validator.js";

const SG = { ...SMALL_GROUP_DEFAULT }; // 1 khách 60%, 2 khách 30%, 3–4 khách 15%, từ 5 khách 0%
const FLAT = { price: 100, pricing: {} }; // tour chỉ có 1 giá, chưa có bảng giá theo số khách
const est = (tour, adults, extra = {}) => estimatePrice(tour, { adults, smallGroup: SG, ...extra });

describe("phụ thu nhóm nhỏ — tour chỉ có 1 giá", () => {
  it("1 / 2 / 4 / 6 khách → +60% / +30% / +15% / không phụ thu", () => {
    assert.equal(est(FLAT, 1).total, 100 + 60);
    assert.equal(est(FLAT, 2).total, 200 + 60);
    assert.equal(est(FLAT, 4).total, 400 + 60);
    assert.equal(est(FLAT, 6).total, 600);
    assert.equal(est(FLAT, 6).lines.length, 1);
  });

  it("thành 1 dòng riêng trong chi tiết giá, email hiện đúng 3 ngôn ngữ", () => {
    const line = est(FLAT, 2).lines[1];
    assert.deepEqual(line, { label: "Small-group supplement (2 guests) +30%", amount: 60 });
    assert.equal(est(FLAT, 1).lines[1].label, "Small-group supplement (1 guest) +60%");
    assert.equal(priceLineLabel(line.label, "vi"), "Phụ thu nhóm nhỏ (2 khách) +30%");
    assert.equal(priceLineLabel(line.label, "en"), "Small-group supplement (2 guests) +30%");
    assert.equal(priceLineLabel(line.label, "zh"), "小团附加费（2人）+30%");
  });

  it("đếm khách phải trả tiền: trẻ miễn phí không tính, % tính trên tiền tour (người lớn + trẻ em)", () => {
    // 1 lớn + bé 3 tuổi (miễn phí) = 1 khách trả tiền → +60%
    assert.equal(est(FLAT, 1, { childAges: [3] }).total, 100 + 60);
    // 1 lớn + bé 7 tuổi (75%) = 2 khách trả tiền → +30% trên 175
    assert.equal(est(FLAT, 1, { childAges: [7] }).total, 175 + Math.round(175 * 0.3));
  });

  it("phụ thu ngày lễ % chỉ tính trên tiền tour, không cộng dồn phụ thu nhóm nhỏ", () => {
    const tour = { price: 100, pricing: { holidayPercent: 10, holidayDates: ["12-31"] } };
    assert.equal(est(tour, 2, { date: "2099-12-31" }).total, 200 + 60 + 20);
  });

  it("tour đã có bảng giá theo số khách → không phụ thu (bảng giá đã tính theo số khách)", () => {
    const tiered = {
      price: 100,
      pricing: { groupTiers: [{ minPax: 1, maxPax: 9, price: 150 }] },
    };
    assert.equal(est(tiered, 2).total, 300);
    assert.equal(smallGroupPercent(tiered, 1, SG), 0);
  });

  it("tắt trong Cài đặt / không truyền cài đặt / chưa có giá → không phụ thu", () => {
    assert.equal(est(FLAT, 2, { smallGroup: { ...SG, enabled: false } }).total, 200);
    assert.equal(estimatePrice(FLAT, { adults: 2 }).total, 200);
    assert.equal(est({ price: null }, 2).total, null);
  });

  it("% đổi trong Cài đặt được áp dụng", () => {
    assert.equal(est(FLAT, 3, { smallGroup: { ...SG, threeFour: 20 } }).total, 300 + 60);
    assert.equal(est(FLAT, 8, { smallGroup: { ...SG, fivePlus: 5 } }).total, 800 + 40);
  });

  it("ô nhập Cài đặt: số nguyên 0–200", () => {
    const ok = smallGroupSettingsSchema.safeParse({
      enabled: true,
      one: 60,
      two: "30",
      threeFour: 15,
      fivePlus: 0,
    });
    assert.equal(ok.success, true);
    assert.equal(ok.data.two, 30);
    for (const bad of [-1, 201, 12.5, "abc"])
      assert.equal(
        smallGroupSettingsSchema.safeParse({ ...SG, one: bad }).success,
        false,
        String(bad),
      );
  });
});
