import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

/**
 * Băm mật khẩu bằng scrypt (có sẵn trong Node — không cần thư viện native như bcrypt/argon2).
 * Định dạng lưu: scrypt$N$r$p$<salt base64>$<hash base64>  → đổi tham số sau này vẫn kiểm tra được hash cũ.
 * N = 2^15, r = 8, p = 1 (~32MB RAM, ~50–100ms / lần) — đủ chậm để chống dò offline, đủ nhẹ cho VPS nhỏ.
 */
const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LEN = 64;
const SALT_LEN = 16;
const MAXMEM = 64 * 1024 * 1024;

async function derive(password, salt, { N, r, p }) {
  return scrypt(String(password).normalize("NFKC"), salt, KEY_LEN, { N, r, p, maxmem: MAXMEM });
}

// Hash giả để so sánh khi tài khoản không tồn tại → thời gian phản hồi như nhau (chống dò tên đăng nhập qua timing)
let dummyHash;

export const passwordService = {
  async hash(password) {
    const salt = randomBytes(SALT_LEN);
    const key = await derive(password, salt, PARAMS);
    const { N, r, p } = PARAMS;
    return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
  },

  async verify(password, stored) {
    const parts = String(stored ?? "").split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [, N, r, p, saltB64, keyB64] = parts;
    const expected = Buffer.from(keyB64, "base64");
    const actual = await derive(password, Buffer.from(saltB64, "base64"), {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  },

  /** Tốn thời gian như verify thật nhưng luôn trả false */
  async verifyDummy(password) {
    dummyHash ??= await this.hash(randomBytes(16).toString("hex"));
    await this.verify(password, dummyHash);
    return false;
  },
};
