import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

// Chỉ truy vấn theo trường có trong schema (bỏ trường lạ trong filter)
mongoose.set("strictQuery", true);
// Chống NoSQL injection: filter chứa toán tử ($gt, $ne, $where...) do người dùng gửi lên
// bị bọc thành { $eq: ... } → không thể "đăng nhập không cần mật khẩu" kiểu { password: { $ne: "" } }.
// Khi CẦN dùng toán tử trong repository: viết tường minh hoặc dùng mongoose.trusted({...}).
mongoose.set("sanitizeFilter", true);

/** Kết nối MongoDB. Gọi 1 lần khi khởi động server. */
export async function connectDatabase() {
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
  mongoose.connection.on("error", (err) => logger.error({ err }, "MongoDB error"));

  await mongoose.connect(env.mongo.uri, {
    dbName: env.mongo.dbName,
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
    // Luôn tự tạo index khai báo trong model (unique slug / mã đơn / tên đăng nhập, TTL phiên đăng nhập & nhật ký).
    // Dữ liệu nhỏ → tạo rất nhanh; DB mới trên máy chủ khách (hoặc khôi phục vào DB trống) không bị thiếu index.
    autoIndex: true,
  });
  logger.info(`MongoDB connected (db: ${env.mongo.dbName})`);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

/** Dùng cho /health: 1 = connected */
export const isDatabaseReady = () => mongoose.connection.readyState === 1;
