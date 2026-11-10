/**
 * Tạo secret ngẫu nhiên (dán vào be/.env):
 *   npm run secret
 */
import { randomBytes } from "node:crypto";

const secret = () => randomBytes(48).toString("base64url");
console.log(`JWT_ACCESS_SECRET=${secret()}`);
console.log(`JWT_REFRESH_SECRET=${secret()}`);
console.log(`DATA_ENCRYPTION_KEY=${secret()}`);
// Mã "khóa cửa sau": dán CÙNG giá trị vào backend và frontend (Vercel)
console.log(`PROXY_SECRET=${secret()}`);
