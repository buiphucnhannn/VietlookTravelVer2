import { User } from "../models/user.model.js";
import { BaseRepository, trusted } from "./base.repository.js";

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /** Kèm passwordHash — CHỈ dùng khi cần kiểm tra mật khẩu */
  findByUsernameWithPassword(username) {
    return this.model
      .findOne({ username: String(username).trim().toLowerCase() })
      .select("+passwordHash")
      .lean();
  }

  findByIdWithPassword(id) {
    return this.model.findById(id).select("+passwordHash").lean();
  }

  findByUsername(username) {
    return this.model.findOne({ username: String(username).trim().toLowerCase() }).lean();
  }

  /**
   * Ghi nhận 1 lần đăng nhập sai (nguyên tử). Đủ ngưỡng → khoá tới `lockUntil` và đặt lại bộ đếm.
   * Trả về user sau cập nhật (để biết đã bị khoá chưa).
   */
  async registerFailedLogin(id, { maxAttempts, lockMs }) {
    const user = await this.model
      .findByIdAndUpdate(id, { $inc: { failedLoginCount: 1 } }, { returnDocument: "after" })
      .lean();
    if (user && user.failedLoginCount >= maxAttempts) {
      return this.model
        .findByIdAndUpdate(
          id,
          { $set: { lockUntil: new Date(Date.now() + lockMs), failedLoginCount: 0 } },
          { returnDocument: "after" },
        )
        .lean();
    }
    return user;
  }

  /** Xác nhận lại mật khẩu đúng (thao tác nhạy cảm) → xoá bộ đếm nhập sai */
  resetFailedLogins(id) {
    return this.model.updateOne({ _id: id }, { $set: { failedLoginCount: 0 } });
  }

  registerSuccessfulLogin(id, ip) {
    return this.model.updateOne(
      { _id: id },
      { $set: { failedLoginCount: 0, lockUntil: null, lastLoginAt: new Date(), lastLoginIp: ip } },
    );
  }

  /** Đổi mật khẩu + tăng tokenVersion → mọi access token cũ vô hiệu */
  setPassword(id, passwordHash) {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            passwordHash,
            passwordChangedAt: new Date(),
            failedLoginCount: 0,
            lockUntil: null,
          },
          $inc: { tokenVersion: 1 },
        },
        { returnDocument: "after" },
      )
      .lean();
  }

  /** Bỏ cờ managedByEnv của phiên bản cũ (mọi tài khoản giờ đều sửa được trong CMS) */
  clearEnvManaged() {
    return this.model.updateMany({ managedByEnv: true }, { $unset: { managedByEnv: 1 } });
  }

  bumpTokenVersion(id) {
    return this.model.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
  }

  /** Số admin còn hoạt động (không cho khoá / hạ quyền admin cuối cùng) */
  countActiveAdmins(excludeId) {
    return this.model.countDocuments({
      role: "admin",
      isActive: true,
      ...(excludeId && { _id: trusted({ $ne: excludeId }) }),
    });
  }
}

export const userRepository = new UserRepository();
