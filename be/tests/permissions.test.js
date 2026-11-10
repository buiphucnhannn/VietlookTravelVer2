import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  LEGACY_EDITOR_PERMISSIONS,
  can,
  effectivePermissions,
  normalizePermissions,
} from "../src/constants/permissions.js";
import { auditLogRepository } from "../src/repositories/audit-log.repository.js";
import { enquiryRepository } from "../src/repositories/content.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { signAccessToken } from "../src/services/token.service.js";
import { createUserSchema, updateUserSchema } from "../src/validators/user.validator.js";

/**
 * Phân quyền chi tiết: không cần MongoDB thật — thay các hàm repository bằng dữ liệu giả.
 * Được phép → đi tiếp tới bước kiểm tra dữ liệu (gửi dữ liệu sai → 422); bị chặn → 403 trước đó.
 */
const app = createApp();
const ID = {
  admin: "64b7f0c2a1b2c3d4e5f60001",
  staff: "64b7f0c2a1b2c3d4e5f60002",
  legacy: "64b7f0c2a1b2c3d4e5f60003",
  booking: "64b7f0c2a1b2c3d4e5f6b001",
  request: "64b7f0c2a1b2c3d4e5f6c001",
};
const users = {
  [ID.admin]: { _id: ID.admin, username: "boss", name: "Boss", role: "admin", isActive: true },
  [ID.staff]: {
    _id: ID.staff,
    username: "staff",
    name: "Staff",
    role: "editor",
    isActive: true,
    tokenVersion: 0,
    permissions: { tours: "view", articles: "full", bookings: "edit" },
  },
  // tài khoản cũ chưa từng phân quyền
  [ID.legacy]: { _id: ID.legacy, username: "old", name: "Old", role: "editor", isActive: true },
};
const enquiries = {
  [ID.booking]: { _id: ID.booking, code: "VL-BK260512-7QX2", type: "booking", status: "new" },
  [ID.request]: { _id: ID.request, code: "VL-CT260512-7QX3", type: "contact", status: "new" },
};

const saved = [];
const stub = (obj, name, fn) => {
  saved.push([obj, name, obj[name]]);
  obj[name] = fn;
};
let lastEnquiryFilter = null;

before(() => {
  stub(userRepository, "findById", async (id) => users[String(id)] ?? null);
  stub(enquiryRepository, "findById", async (id) => enquiries[String(id)] ?? null);
  stub(enquiryRepository, "updateById", async (id, upd) => ({
    ...enquiries[String(id)],
    ...upd.$set,
  }));
  stub(enquiryRepository, "deleteById", async () => ({}));
  stub(enquiryRepository, "addNote", async (id) => enquiries[String(id)]);
  stub(enquiryRepository, "paginate", async (filter) => {
    lastEnquiryFilter = filter;
    return { items: [], total: 0 };
  });
  stub(enquiryRepository, "stats", async () => ({ bookings: { new: 2 }, requests: { new: 5 } }));
  stub(enquiryRepository, "recentSince", async () => 7);
  stub(enquiryRepository, "findByCode", async (code) =>
    Object.values(enquiries).find((e) => e.code === code),
  );
  stub(auditLogRepository, "create", async () => ({}));
});
after(() => {
  for (const [obj, name, fn] of saved.reverse()) obj[name] = fn;
});

const cookie = (id) => `vl_at=${signAccessToken(users[id])}`;
const call = (id, method, path, body) => {
  const r = request(app)[method](`/api/v1${path}`).set("Cookie", cookie(id));
  if (method !== "get") r.set("X-Requested-With", "fetch");
  return body === undefined ? r : r.send(body);
};
const BAD_ID = "khong-phai-ma"; // được phép → validate báo 422

describe("phân quyền — hàm tính quyền", () => {
  it("admin luôn toàn quyền, bỏ qua permissions đã lưu", () => {
    const p = effectivePermissions({ role: "admin", permissions: { tours: "none" } });
    assert.equal(p.tours, "full");
    assert.equal(p.audit, "view"); // Nhật ký: mức cao nhất là xem
    assert.equal(can({ role: "admin" }, "pages", "full"), true);
  });

  it("nhân viên cũ chưa phân quyền → quyền như trước (nội dung toàn quyền, đơn sửa, không nhật ký)", () => {
    assert.deepEqual(effectivePermissions(users[ID.legacy]), { ...LEGACY_EDITOR_PERMISSIONS });
    assert.equal(LEGACY_EDITOR_PERMISSIONS.tours, "full");
    assert.equal(LEGACY_EDITOR_PERMISSIONS.bookings, "edit");
    assert.equal(LEGACY_EDITOR_PERMISSIONS.audit, "none");
  });

  it("đã phân quyền: mục không ghi = không truy cập; mức lạ bị bỏ", () => {
    const p = effectivePermissions(users[ID.staff]);
    assert.equal(p.tours, "view");
    assert.equal(p.destinations, "none");
    assert.equal(normalizePermissions({ audit: "full", tours: "boss" }).audit, "view");
    assert.equal(normalizePermissions({ tours: "boss" }).tours, "none");
    // tất cả "none" vẫn là đã phân quyền (không quay về quyền cũ)
    assert.equal(
      effectivePermissions({ role: "editor", permissions: { tours: "none" } }).pages,
      "none",
    );
  });

  it("validator chỉ nhận mục / mức đã biết", () => {
    assert.equal(updateUserSchema.safeParse({ permissions: { tours: "edit" } }).success, true);
    assert.equal(updateUserSchema.safeParse({ permissions: { users: "full" } }).success, false);
    assert.equal(updateUserSchema.safeParse({ permissions: { settings: "view" } }).success, false);
    assert.equal(updateUserSchema.safeParse({ permissions: { audit: "edit" } }).success, false);
    assert.equal(updateUserSchema.safeParse({ permissions: { tours: "admin" } }).success, false);
    assert.equal(updateUserSchema.safeParse({ permissions: { tours: { $ne: 1 } } }).success, false);
    const c = createUserSchema.safeParse({
      username: "nv1",
      name: "Nhân viên",
      password: "Abcdef12345!x",
      permissions: { bookings: "full" },
    });
    assert.equal(c.success, true);
  });
});

describe("phân quyền — nội dung (none / view / edit / full)", () => {
  // staff: tours = view, articles = full, destinations = none
  it("không truy cập → 403 mọi thao tác", async () => {
    for (const [m, p] of [
      ["get", `/admin/destinations/${ID.booking}`],
      ["post", "/admin/destinations"],
      ["put", `/admin/destinations/${ID.booking}`],
      ["delete", `/admin/destinations/${ID.booking}`],
      ["get", "/admin/cars"],
      ["get", "/admin/car-areas"],
    ]) {
      const res = await call(ID.staff, m, p, m === "get" ? undefined : {});
      assert.equal(res.status, 403, `${m} ${p}`);
      assert.equal(res.body.error.code, "FORBIDDEN");
    }
  });

  it("chỉ xem → xem được, không thêm / sửa / ẩn hiện / đổi thứ tự / xoá", async () => {
    assert.equal((await call(ID.staff, "get", "/admin/tours?page=x")).status, 422);
    assert.equal((await call(ID.staff, "get", `/admin/tours/${BAD_ID}`)).status, 422);
    for (const [m, p] of [
      ["post", "/admin/tours"],
      ["put", `/admin/tours/${ID.booking}`],
      ["patch", "/admin/tours/order"],
      ["patch", `/admin/tours/${ID.booking}/visibility`],
      ["delete", `/admin/tours/${ID.booking}`],
    ])
      assert.equal((await call(ID.staff, m, p, {})).status, 403, `${m} ${p}`);
  });

  it("toàn quyền → thêm / sửa / xoá đi tiếp tới bước kiểm tra dữ liệu", async () => {
    for (const [m, p] of [
      ["post", "/admin/articles"],
      ["put", `/admin/articles/${BAD_ID}`],
      ["patch", "/admin/articles/order"],
      ["delete", `/admin/articles/${BAD_ID}`],
    ])
      assert.equal((await call(ID.staff, m, p, {})).status, 422, `${m} ${p}`);
  });

  it("mục dùng làm ô chọn: người sửa Bài viết đọc được danh sách Chuyên mục, không đọc chi tiết", async () => {
    assert.equal((await call(ID.staff, "get", "/admin/authors?page=x")).status, 422);
    assert.equal((await call(ID.staff, "get", `/admin/authors/${ID.booking}`)).status, 403);
    assert.equal((await call(ID.staff, "post", "/admin/authors", {})).status, 403);
  });

  it("tải ảnh / dịch cần quyền sửa ít nhất 1 mục nội dung", async () => {
    const res = await call(ID.staff, "post", "/translate", {});
    assert.equal(res.status, 422); // có quyền sửa Bài viết
    const viewOnly = { ...users[ID.staff], permissions: { tours: "view", bookings: "full" } };
    users[ID.staff] = viewOnly;
    try {
      assert.equal((await call(ID.staff, "post", "/translate", {})).status, 403);
      assert.equal((await call(ID.staff, "delete", "/uploads/images", {})).status, 403);
    } finally {
      users[ID.staff].permissions = { tours: "view", articles: "full", bookings: "edit" };
    }
  });
});

describe("phân quyền — chỉ admin", () => {
  it("nhân viên không vào được Tài khoản, Cài đặt email / thanh toán / mã đo lường", async () => {
    for (const id of [ID.staff, ID.legacy])
      for (const [m, p] of [
        ["get", "/users"],
        ["post", "/users"],
        ["patch", `/users/${ID.admin}`],
        ["get", "/settings/payment"],
        ["get", "/settings/notifications"],
        ["put", "/settings/tracking"],
      ])
        assert.equal((await call(id, m, p, m === "get" ? undefined : {})).status, 403, `${m} ${p}`);
  });

  it("nhật ký thao tác: nhân viên chưa được cấp → 403; được cấp xem → vào được", async () => {
    assert.equal((await call(ID.staff, "get", "/audit-logs")).status, 403);
    users[ID.staff].permissions = { ...users[ID.staff].permissions, audit: "view" };
    try {
      assert.equal((await call(ID.staff, "get", "/audit-logs?page=x")).status, 422);
    } finally {
      delete users[ID.staff].permissions.audit;
    }
  });

  it("Trang chủ / Giới thiệu & chính sách theo quyền riêng", async () => {
    assert.equal((await call(ID.staff, "get", "/settings/home")).status, 403);
    assert.equal((await call(ID.staff, "put", "/settings/pages/about", {})).status, 403);
    users[ID.staff].permissions = { ...users[ID.staff].permissions, home: "view" };
    try {
      assert.equal((await call(ID.staff, "put", "/settings/home", {})).status, 403);
    } finally {
      delete users[ID.staff].permissions.home;
    }
  });
});

describe("phân quyền — đơn đặt tour / yêu cầu tách riêng", () => {
  // staff: bookings = edit, requests = none
  it("danh sách: chỉ thấy đơn đặt tour, hỏi yêu cầu → 403", async () => {
    const res = await call(ID.staff, "get", "/enquiries");
    assert.equal(res.status, 200);
    assert.equal(lastEnquiryFilter.type, "booking"); // tự giới hạn đúng nhóm được xem
    assert.equal((await call(ID.staff, "get", "/enquiries?kind=requests")).status, 403);
    assert.equal(
      (await call(ID.staff, "get", "/enquiries?kind=bookings&type=contact")).status,
      403,
    );
  });

  it("thống kê không trả số của nhóm không được xem", async () => {
    const res = await call(ID.staff, "get", "/enquiries/stats");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.bookings, { new: 2 });
    assert.equal(res.body.data.requests, undefined);
  });

  it("chi tiết / sửa / ghi chú yêu cầu không được xem → 404 (không lộ đơn tồn tại)", async () => {
    assert.equal((await call(ID.staff, "get", `/enquiries/${ID.request}`)).status, 404);
    assert.equal(
      (await call(ID.staff, "patch", `/enquiries/${ID.request}`, { status: "contacted" })).status,
      404,
    );
    assert.equal(
      (await call(ID.staff, "post", `/enquiries/${ID.request}/notes`, { text: "hi" })).status,
      404,
    );
    assert.equal((await call(ID.staff, "get", "/enquiries/code/VL-CT260512-7QX3")).status, 404);
  });

  it("đơn đặt tour (quyền sửa): xem, đổi trạng thái được; xoá → 403", async () => {
    assert.equal((await call(ID.staff, "get", `/enquiries/${ID.booking}`)).status, 200);
    const upd = await call(ID.staff, "patch", `/enquiries/${ID.booking}`, { status: "contacted" });
    assert.equal(upd.status, 200);
    assert.equal((await call(ID.staff, "delete", `/enquiries/${ID.booking}`)).status, 403);
  });

  it("chỉ xem đơn → không đổi trạng thái; toàn quyền → xoá được", async () => {
    const keep = users[ID.staff].permissions;
    try {
      users[ID.staff].permissions = { bookings: "view" };
      const r1 = await call(ID.staff, "patch", `/enquiries/${ID.booking}`, { status: "contacted" });
      assert.equal(r1.status, 403);
      users[ID.staff].permissions = { bookings: "full" };
      assert.equal((await call(ID.staff, "delete", `/enquiries/${ID.booking}`)).status, 204);
    } finally {
      users[ID.staff].permissions = keep;
    }
  });
});

describe("phân quyền — đổi quyền có hiệu lực ngay", () => {
  it("cùng 1 phiên đăng nhập: đổi quyền trong DB → request kế tiếp theo quyền mới", async () => {
    const c = cookie(ID.staff); // token cũ, không đăng nhập lại
    const get = () => request(app).get("/api/v1/admin/cars?page=x").set("Cookie", c);
    assert.equal((await get()).status, 403);
    users[ID.staff].permissions = { ...users[ID.staff].permissions, cars: "view" };
    try {
      assert.equal((await get()).status, 422);
    } finally {
      delete users[ID.staff].permissions.cars;
    }
    assert.equal((await get()).status, 403);
  });

  it("/auth/me trả quyền thực tế", async () => {
    const res = await call(ID.staff, "get", "/auth/me");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.permissions.tours, "view");
    assert.equal(res.body.data.user.permissions.destinations, "none");
    const adm = await call(ID.admin, "get", "/auth/me");
    assert.equal(adm.body.data.user.permissions.pages, "full");
  });
});

describe("phân quyền — sửa tài khoản (userService.update)", () => {
  let svc;
  let lastSet = null;
  before(async () => {
    svc = (await import("../src/services/user.service.js")).userService;
    stub(userRepository, "updateById", async (id, upd) => {
      lastSet = upd.$set;
      return { ...users[String(id)], ...upd.$set };
    });
    stub(userRepository, "countActiveAdmins", async () => 0);
  });

  it("không tự hạ vai trò / tự khoá / làm mất admin cuối cùng", async () => {
    await assert.rejects(svc.update(ID.admin, { role: "editor" }, ID.admin), /chính mình/);
    await assert.rejects(svc.update(ID.admin, { isActive: false }, ID.admin), /chính mình/);
    await assert.rejects(svc.update(ID.admin, { role: "editor" }, ID.staff), /ít nhất 1/);
  });

  it("đổi quyền nhân viên → lưu đủ mọi mục + mô tả thay đổi để ghi nhật ký", async () => {
    const { user, permissionChanges } = await svc.update(
      ID.staff,
      { permissions: { tours: "edit", articles: "full", bookings: "edit" } },
      ID.admin,
    );
    assert.equal(lastSet.permissions.destinations, "none");
    assert.equal(user.permissions.tours, "edit");
    assert.deepEqual(permissionChanges, ["Tour: Chỉ xem → Thêm & sửa"]);
  });

  it("hạ admin xuống nhân viên không kèm quyền → không truy cập mục nào", async () => {
    stub(userRepository, "countActiveAdmins", async () => 1);
    stub(userRepository, "bumpTokenVersion", async () => ({}));
    const { sessionRepository } = await import("../src/repositories/session.repository.js");
    stub(sessionRepository, "revokeAllForUser", async () => ({}));
    const { user } = await svc.update(ID.admin, { role: "editor" }, ID.staff);
    assert.equal(user.role, "editor");
    assert.ok(Object.values(user.permissions).every((l) => l === "none"));
  });
});
