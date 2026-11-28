import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import mongoose from "mongoose";
import { destinationRepository, tourRepository } from "../src/repositories/content.repository.js";
import { destinationService } from "../src/services/modules.service.js";
import { settingsService } from "../src/services/settings.service.js";

/**
 * Xoá điểm đến / chủ đề đang được dùng: phải tính CẢ tour trong Thùng rác (tour khôi phục ra không được trỏ tới
 * điểm đến đã mất) — không cần MongoDB thật: truy vấn được "chạy" bằng hàm giả trả lại điều kiện lọc.
 */

describe("điểm đến / chủ đề đang dùng — tính cả tour trong Thùng rác", () => {
  const P = mongoose.Query.prototype;
  const keep = {};
  before(() => {
    keep.count = P._countDocuments;
    P._countDocuments = async function () {
      return this.getFilter();
    };
  });
  after(() => {
    P._countDocuments = keep.count;
  });

  it("đếm tour gắn điểm đến / chủ đề: không tự thêm deletedAt: null (đếm cả tour đã xoá mềm)", async () => {
    assert.deepEqual(await tourRepository.countUsing("destinations", "hue"), {
      destinations: "hue",
    });
    assert.deepEqual(await tourRepository.countUsing("themes", "family"), { themes: "family" });
    // truy vấn đọc thường vẫn bỏ tour trong Thùng rác (không đổi hành vi chung)
    assert.deepEqual(await tourRepository.model.countDocuments({ destinations: "hue" }), {
      destinations: "hue",
      deletedAt: null,
    });
  });

  it("chủ đề: xoá chủ đề gỡ khỏi mọi tour, kể cả tour trong Thùng rác (lệnh ghi không bị lọc)", () => {
    const q = tourRepository.pullRef("themes", "family");
    assert.deepEqual(q.getFilter(), { themes: "family" });
  });

  describe("xoá điểm đến", () => {
    const stash = {};
    const doc = { _id: "d1", slug: "hue" };
    let deleted;
    before(() => {
      stash.findById = destinationRepository.findById;
      stash.deleteById = destinationRepository.deleteById;
      stash.countUsing = tourRepository.countUsing;
      stash.renameHomeRef = settingsService.renameHomeRef;
      destinationRepository.findById = async () => doc;
      destinationRepository.deleteById = async () => {
        deleted = true;
      };
      settingsService.renameHomeRef = async () => {};
    });
    after(() => {
      destinationRepository.findById = stash.findById;
      destinationRepository.deleteById = stash.deleteById;
      tourRepository.countUsing = stash.countUsing;
      settingsService.renameHomeRef = stash.renameHomeRef;
    });

    it("còn tour gắn (kể cả trong Thùng rác) → 409, báo rõ số tour, không xoá", async () => {
      deleted = false;
      tourRepository.countUsing = async (field, value) => {
        assert.equal(field, "destinations");
        assert.equal(value, "hue");
        return 2; // vd. 1 tour đang bán + 1 tour trong Thùng rác
      };
      await assert.rejects(destinationService.remove("d1"), (err) => {
        assert.equal(err.statusCode ?? err.status, 409);
        assert.match(
          err.message,
          /^Điểm đến này đang gắn với 2 tour \(kể cả tour trong Thùng rác\)/,
        );
        return true;
      });
      assert.equal(deleted, false);
    });

    it("không còn tour nào gắn → xoá được", async () => {
      deleted = false;
      tourRepository.countUsing = async () => 0;
      await destinationService.remove("d1");
      assert.equal(deleted, true);
    });
  });
});
