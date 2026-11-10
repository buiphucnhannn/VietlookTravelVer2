import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

/**
 * Mã hoá secret lưu trong DB (vd. secret key 9Pay) bằng AES-256-GCM.
 * Khoá lấy từ DATA_ENCRYPTION_KEY (.env) → lộ database cũng không đọc được secret.
 * Định dạng: enc:v1:<iv b64>:<tag b64>:<dữ liệu b64>
 */
const key = () => createHash("sha256").update(env.dataEncryptionKey).digest();

export function encryptSecret(plain) {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return `enc:v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}

export function decryptSecret(stored) {
  if (!stored?.startsWith("enc:v1:")) return "";
  try {
    const [, , iv, tag, data] = stored.split(":");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return ""; // sai khoá / dữ liệu hỏng
  }
}

/** Hiện 4 ký tự cuối: "••••••ab12" */
export const maskSecret = (plain) => (plain ? `••••••${String(plain).slice(-4)}` : "");
