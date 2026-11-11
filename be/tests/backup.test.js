import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { backupFileName, parseBackupName, planRotation } from "../src/utils/backup.js";

describe("db backup — file names", () => {
  it("round-trips a date through the file name", () => {
    const d = new Date("2026-11-11T03:04:05.678Z");
    const name = backupFileName(d);
    assert.equal(name, "vietlook-2026-11-11T03-04-05.json.gz");
    assert.deepEqual(parseBackupName(name), {
      day: "2026-11-11",
      at: new Date("2026-11-11T03:04:05Z"),
    });
  });
  it("ignores files that are not automatic backups", () => {
    for (const n of [
      "pre-restore-2026-11-11T03-04-05.json.gz",
      "notes.txt",
      "vietlook-2026-11-11.json.gz",
      "vietlook-2026-11-11T03-04-05.json.gz.part",
    ])
      assert.equal(parseBackupName(n), null);
  });
});

describe("db backup — rotation (keep last 7 daily backups)", () => {
  const day = (d, h = 2) => backupFileName(new Date(Date.UTC(2026, 10, d, h, 0, 0)));

  it("keeps everything when there are 7 days or fewer", () => {
    const names = [1, 2, 3, 4, 5, 6, 7].map((d) => day(d));
    const { keep, remove } = planRotation(names, 7);
    assert.equal(keep.length, 7);
    assert.deepEqual(remove, []);
  });

  it("removes the oldest days beyond 7", () => {
    const names = Array.from({ length: 10 }, (_, i) => day(i + 1));
    const { keep, remove } = planRotation(names, 7);
    assert.deepEqual(
      keep,
      [10, 9, 8, 7, 6, 5, 4].map((d) => day(d)),
    );
    assert.deepEqual(remove.sort(), [1, 2, 3].map((d) => day(d)).sort());
  });

  it("keeps only the newest backup of each day", () => {
    const names = [day(5, 1), day(5, 13), day(5, 23), day(6, 2)];
    const { keep, remove } = planRotation(names, 7);
    assert.deepEqual(keep, [day(6, 2), day(5, 23)]);
    assert.deepEqual(remove.sort(), [day(5, 1), day(5, 13)].sort());
  });

  it("never touches unrelated files and respects a custom keep count", () => {
    const names = ["pre-restore-2026-11-01T00-00-00.json.gz", "README.txt", day(1), day(2), day(3)];
    const { keep, remove } = planRotation(names, 2);
    assert.deepEqual(keep, [day(3), day(2)]);
    assert.deepEqual(remove, [day(1)]);
  });

  it("always keeps at least the newest backup", () => {
    assert.deepEqual(planRotation([day(1), day(2)], 0).keep, [day(2)]);
  });
});
