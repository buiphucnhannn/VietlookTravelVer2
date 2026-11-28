import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { auditLogRepository } from "../src/repositories/audit-log.repository.js";
import { enquiryRepository } from "../src/repositories/content.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { actionPatternRegex, auditService } from "../src/services/audit.service.js";
import {
  buildOverview,
  createOverviewService,
  kindFilter,
  trendPct,
  vnDayKey,
  windowStart,
} from "../src/services/overview.service.js";
import { signAccessToken } from "../src/services/token.service.js";
import { listAuditLogsQuery } from "../src/validators/audit-log.validator.js";

// "Bây giờ" = 28/11/2026 10:00 giờ Việt Nam
const NOW = new Date("2026-11-28T03:00:00Z");
const at = (iso) => new Date(iso);

describe("tổng quan — gom số liệu theo ngày (giờ Việt Nam)", () => {
  it("vnDayKey / windowStart: đổi ngày lúc 0h giờ Việt Nam (17h UTC hôm trước)", () => {
    assert.equal(vnDayKey(at("2026-11-27T16:59:59Z")), "2026-11-27");
    assert.equal(vnDayKey(at("2026-11-27T17:00:00Z")), "2026-11-28");
    // 14 ngày tính cả hôm nay → bắt đầu 15/11 0h (VN) = 14/11 17h UTC
    assert.equal(windowStart(NOW).toISOString(), "2026-11-14T17:00:00.000Z");
  });

  it("đếm đúng ngày, tổng 7 ngày gần nhất so với 7 ngày trước, theo trạng thái / loại", () => {
    const rows = [
      // 23h30 ngày 27 (VN) → ngày 27, KHÔNG phải 28
      { type: "booking", status: "new", createdAt: at("2026-11-27T16:30:00Z") },
      // 0h30 ngày 28 (VN) → hôm nay
      { type: "car", status: "contacted", createdAt: at("2026-11-27T17:30:00Z") },
      { type: "visa", status: "new", createdAt: at("2026-11-28T02:00:00Z") },
      // ngày đầu cửa sổ (15/11) thuộc 7 ngày trước
      { type: "booking", status: "completed", createdAt: at("2026-11-14T17:00:00Z") },
      // ngoài cửa sổ → bỏ
      { type: "booking", status: "new", createdAt: at("2026-11-14T16:59:00Z") },
    ];
    const o = buildOverview({ rows, kinds: ["bookings", "requests"], now: NOW });
    assert.equal(o.days.length, 14);
    assert.equal(o.days[0].date, "2026-11-15");
    assert.equal(o.days[13].date, "2026-11-28");
    assert.deepEqual(o.days[13], { date: "2026-11-28", bookings: 0, requests: 2 });
    assert.deepEqual(o.days[12], { date: "2026-11-27", bookings: 1, requests: 0 });
    assert.deepEqual(o.days[0], { date: "2026-11-15", bookings: 1, requests: 0 });
    assert.deepEqual(o.last7, { total: 3, bookings: 1, requests: 2 });
    assert.deepEqual(o.prev7, { total: 1, bookings: 1, requests: 0 });
    assert.deepEqual(o.trend, { total: 200, bookings: 0, requests: null });
    assert.equal(o.byStatus.new, 2);
    assert.equal(o.byStatus.contacted, 1);
    assert.equal(o.byStatus.completed, 1);
    assert.equal(o.byType.booking, 2);
    assert.equal(o.byType.car, 1);
    assert.equal(o.byType.partner, 0);
  });

  it("trendPct: kỳ trước 0 → null; giảm → số âm", () => {
    assert.equal(trendPct(5, 0), null);
    assert.equal(trendPct(3, 4), -25);
    assert.equal(trendPct(0, 0), null);
  });

  it("đơn chờ lâu nhất: số ngày đã chờ", () => {
    const o = buildOverview({
      kinds: ["requests"],
      now: NOW,
      oldest: { code: "VL-CT1", type: "contact", createdAt: at("2026-11-25T01:00:00Z") },
      pending: 4,
    });
    assert.equal(o.oldestNew.ageDays, 3);
    assert.equal(o.oldestNew.kind, "requests");
    assert.equal(o.pending, 4);
  });

  it("chỉ được xem 1 nhóm: không đếm / không trả nhóm kia", async () => {
    assert.deepEqual(kindFilter(["bookings", "requests"]), {});
    assert.deepEqual(kindFilter(["bookings"]), { type: "booking" });
    assert.deepEqual(kindFilter(["requests"]), { $nor: [{ type: "booking" }] });

    const filters = [];
    const repo = {
      find: async (filter, opts) => {
        filters.push(filter);
        return opts.limit === 1
          ? []
          : [
              { type: "booking", status: "new", createdAt: at("2026-11-28T01:00:00Z") },
              { type: "planner", status: "new", createdAt: at("2026-11-28T01:00:00Z") },
            ];
      },
      count: async (filter) => (filters.push(filter), 0),
    };
    const o = await createOverviewService({ repo, clock: () => NOW }).enquiries(["requests"]);
    assert.ok(filters.every((f) => f.$nor?.[0]?.type === "booking"));
    assert.deepEqual(o.kinds, ["requests"]);
    assert.deepEqual(o.days[13], { date: "2026-11-28", requests: 1 });
    assert.equal(o.last7.bookings, undefined);
    assert.equal("booking" in o.byType, false);
    assert.equal(o.oldestNew, null);
  });
});

/* ---------- Quyền gọi API ---------- */

const app = createApp();
const ID = {
  admin: "64b7f0c2a1b2c3d4e5f60101",
  bookingsOnly: "64b7f0c2a1b2c3d4e5f60102",
  toursOnly: "64b7f0c2a1b2c3d4e5f60103",
};
const users = {
  [ID.admin]: { _id: ID.admin, username: "boss", role: "admin", isActive: true },
  [ID.bookingsOnly]: {
    _id: ID.bookingsOnly,
    username: "bk",
    role: "editor",
    isActive: true,
    permissions: { bookings: "view" },
  },
  [ID.toursOnly]: {
    _id: ID.toursOnly,
    username: "tr",
    role: "editor",
    isActive: true,
    permissions: { tours: "full" },
  },
};
const saved = [];
const stub = (obj, name, fn) => {
  saved.push([obj, name, obj[name]]);
  obj[name] = fn;
};
let auditFilter = null;
before(() => {
  stub(userRepository, "findById", async (id) => users[String(id)] ?? null);
  stub(enquiryRepository, "find", async () => []);
  stub(enquiryRepository, "count", async () => 0);
  stub(auditLogRepository, "paginate", async (filter) => {
    auditFilter = filter;
    return { items: [], total: 0 };
  });
});
after(() => {
  for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
});
const get = (id, path) =>
  request(app)
    .get(`/api/v1${path}`)
    .set("Cookie", `vl_at=${signAccessToken(users[id])}`);

describe("tổng quan — quyền", () => {
  it("chưa đăng nhập → 401; không xem được đơn lẫn yêu cầu → 403", async () => {
    assert.equal((await request(app).get("/api/v1/overview/enquiries")).status, 401);
    assert.equal((await get(ID.toursOnly, "/overview/enquiries")).status, 403);
  });

  it("chỉ xem đơn đặt tour → chỉ trả nhóm bookings; admin → cả 2 nhóm", async () => {
    const r = await get(ID.bookingsOnly, "/overview/enquiries");
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.kinds, ["bookings"]);
    assert.equal(r.body.data.days.length, 14);
    assert.equal(r.headers["cache-control"], "no-store");
    const a = await get(ID.admin, "/overview/enquiries");
    assert.deepEqual(a.body.data.kinds, ["bookings", "requests"]);
  });
});

/* ---------- Nhật ký: lọc theo loại thao tác / ẩn đăng nhập ---------- */

describe("nhật ký — lọc theo mẫu thao tác", () => {
  it("actionPatternRegex: * = phần bất kỳ, khớp trọn mã, bỏ mẫu lạ", () => {
    const rx = actionPatternRegex(["auth.*", "*.delete"]);
    assert.ok(rx.test("auth.login"));
    assert.ok(rx.test("tour.delete"));
    assert.ok(!rx.test("tour.update"));
    assert.ok(!rx.test("xauth.login"));
    assert.ok(!actionPatternRegex(["*_delete"]).test("enquiry.delete"));
    assert.ok(actionPatternRegex(["*_delete"]).test("enquiry.note_delete"));
    assert.equal(actionPatternRegex(["(.*)"]), null);
    assert.equal(actionPatternRegex([]), null);
  });

  it("validator: tách danh sách mẫu, chặn ký tự lạ", () => {
    const ok = listAuditLogsQuery.safeParse({ match: "*.create,media.upload", exclude: "auth.*" });
    assert.ok(ok.success);
    assert.deepEqual(ok.data.match, ["*.create", "media.upload"]);
    assert.deepEqual(ok.data.exclude, ["auth.*"]);
    assert.equal(listAuditLogsQuery.safeParse({ exclude: "auth.$where" }).success, false);
  });

  it("list: match + exclude ghép bằng $and; chỉ exclude → điều kiện $not", async () => {
    await auditService.list({ match: ["*.create"], exclude: ["auth.*"] });
    assert.equal(auditFilter.$and.length, 2);
    assert.ok(auditFilter.$and[0].action.$regex.test("tour.create"));
    assert.ok(auditFilter.$and[1].action.$not.test("auth.logout"));

    await auditService.list({ exclude: ["auth.*"] });
    assert.ok(auditFilter.action.$not.test("auth.login"));
    assert.equal(auditFilter.$and, undefined);

    await auditService.list({ action: "tour.update" });
    assert.equal(auditFilter.action, "tour.update");
  });

  it("API: ?exclude=auth.* tới được bộ lọc (admin)", async () => {
    const r = await get(ID.admin, "/audit-logs?limit=8&exclude=auth.*");
    assert.equal(r.status, 200);
    assert.ok(auditFilter.action.$not.test("auth.login"));
  });
});
