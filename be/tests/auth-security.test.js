import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { signAccessToken } from "../src/services/token.service.js";
import { ACCESS_COOKIE } from "../src/utils/auth-cookies.js";
import { changePasswordSchema, loginSchema } from "../src/validators/auth.validator.js";
import { createUserSchema, resetPasswordSchema } from "../src/validators/user.validator.js";

/** Giới hạn đăng nhập, độ dài mật khẩu, route đã gỡ — KHÔNG cần MongoDB (repository thay bằng bản giả) */
const app = createApp();

function stub(obj, name, fn) {
  const had = Object.prototype.hasOwnProperty.call(obj, name);
  const prev = obj[name];
  obj[name] = fn;
  return () => (had ? (obj[name] = prev) : delete obj[name]);
}

describe("giới hạn đăng nhập theo IP + tên đăng nhập", () => {
  let restore;
  before(() => {
    restore = stub(userRepository, "findByUsernameWithPassword", async () => null); // mọi lần đều sai
  });
  after(() => restore());

  const login = (ip, username) =>
    request(app)
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "fetch")
      .set("X-Forwarded-For", ip)
      .send({ username, password: "wrong-password" });

  it("1 người gõ sai 10 lần chỉ khoá tên đó; đồng nghiệp cùng IP và nút Đăng nhập nhanh vẫn dùng được", async () => {
    const ip = "10.20.0.1";
    for (let i = 0; i < 10; i++) assert.equal((await login(ip, "qa-alice")).status, 401);
    const blocked = await login(ip, "  QA-Alice "); // cùng tên sau khi chuẩn hoá
    assert.equal(blocked.status, 429);
    assert.match(blocked.body.error.message, /quá nhiều lần/);
    assert.equal((await login(ip, "qa-bob")).status, 401); // không phải 429
    assert.equal((await login("10.20.0.9", "qa-alice")).status, 401); // IP khác
    const demo = await request(app)
      .post("/api/v1/auth/demo-login")
      .set("X-Requested-With", "fetch")
      .set("X-Forwarded-For", ip)
      .send({});
    assert.equal(demo.status, 404); // demo tắt khi test → 404, KHÔNG bị 429
  });

  it("dò nhiều tài khoản từ 1 IP → chặn khi quá 30 lần sai / 15 phút", async () => {
    const ip = "10.20.0.2";
    for (let i = 0; i < 30; i++) assert.equal((await login(ip, `qa-user${i}`)).status, 401);
    assert.equal((await login(ip, "qa-someone-new")).status, 429);
  });
});

describe("mật khẩu quản trị tối thiểu 8 ký tự (chỉ khi đặt mật khẩu)", () => {
  const msg = (r) => r.error.issues.map((i) => i.message);

  it("tạo tài khoản / đặt lại / đổi mật khẩu: dưới 8 ký tự bị chặn, câu tiếng Việt dễ hiểu", () => {
    const user = { username: "qa.user", name: "QA User", role: "admin" };
    const cases = [
      createUserSchema.safeParse({ ...user, password: "1234567" }),
      resetPasswordSchema.safeParse({ newPassword: "abc" }),
      changePasswordSchema.safeParse({ currentPassword: "old", newPassword: "1" }),
    ];
    for (const r of cases) {
      assert.equal(r.success, false);
      assert.ok(msg(r).includes("Mật khẩu cần ít nhất 8 ký tự"), msg(r).join(" | "));
    }
    assert.equal(createUserSchema.safeParse({ ...user, password: "12345678" }).success, true);
    assert.equal(resetPasswordSchema.safeParse({ newPassword: "ghep vai tu" }).success, true);
  });

  it("đăng nhập vẫn nhận mật khẩu cũ ngắn hơn 8 ký tự", () => {
    assert.equal(loginSchema.safeParse({ username: "admin", password: "1" }).success, true);
  });
});

describe("đã gỡ thêm ảnh từ link (from-url)", () => {
  const admin = {
    _id: "64b0000000000000000000a1",
    username: "qa-admin",
    name: "QA",
    role: "admin",
    isActive: true,
    tokenVersion: 0,
  };
  const cookie = `${ACCESS_COOKIE}=${signAccessToken(admin)}`;
  let restore;
  before(() => {
    restore = stub(userRepository, "findById", async (id) =>
      String(id) === admin._id ? admin : null,
    );
  });
  after(() => restore());

  it("POST /uploads/images/from-url → 404; xem trước ảnh từ link vẫn còn", async () => {
    const post = (path, body) =>
      request(app)
        .post(`/api/v1/uploads/images/${path}`)
        .set("X-Requested-With", "fetch")
        .set("Cookie", cookie)
        .send(body);
    const gone = await post("from-url", { url: "https://example.com/a.jpg", folder: "tours" });
    assert.equal(gone.status, 404);
    const preview = await post("link-preview", { url: "not-a-link" });
    assert.equal(preview.status, 422);
  });
});
