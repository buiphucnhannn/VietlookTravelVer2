import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { toMs } from "../utils/duration.js";
import { passwordService } from "./password.service.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./token.service.js";
import { toPublicUser } from "./user.service.js";

const sha256 = (v) => createHash("sha256").update(v).digest("hex");
// Refresh token cũ dùng lại trong 30s (nhiều tab / request song song) → không coi là đánh cắp
const REFRESH_REUSE_GRACE_MS = 30_000;
// Không chọn "Ghi nhớ đăng nhập" → máy chủ chỉ giữ phiên tối đa 12 giờ
const SHORT_SESSION_MS = 12 * 60 * 60 * 1000;

const invalidCredentials = () =>
  new ApiError(401, "Tên đăng nhập hoặc mật khẩu không đúng", { code: "INVALID_CREDENTIALS" });

const expired = () =>
  new ApiError(401, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", {
    code: "SESSION_EXPIRED",
  });

function locked(lockUntil) {
  const err = new ApiError(
    423,
    "Tài khoản tạm khoá do nhập sai mật khẩu nhiều lần, vui lòng thử lại sau",
    { code: "ACCOUNT_LOCKED" },
  );
  err.retryAfter = Math.max(1, Math.ceil((new Date(lockUntil).getTime() - Date.now()) / 1000));
  return err;
}

const isLocked = (user) => user.lockUntil && new Date(user.lockUntil).getTime() > Date.now();

/** Tạo phiên + cặp token cho người dùng */
async function issueSession(user, meta, remember) {
  const id = new Types.ObjectId();
  const refreshToken = signRefreshToken(id, user._id);
  await sessionRepository.create({
    _id: id,
    user: user._id,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + (remember ? toMs(env.jwt.refreshTtl) : SHORT_SESSION_MS)),
    remember,
    userAgent: String(meta.userAgent ?? "").slice(0, 300),
    ip: meta.ip ?? "",
  });
  return {
    id,
    user: toPublicUser(user),
    remember,
    accessToken: signAccessToken(user),
    refreshToken,
  };
}

export const authService = {
  async login({ username, password, remember = false }, meta) {
    const user = await userRepository.findByUsernameWithPassword(username);
    if (!user) {
      await passwordService.verifyDummy(password); // thời gian như tài khoản có thật
      throw invalidCredentials();
    }
    if (isLocked(user)) throw locked(user.lockUntil);

    const valid = await passwordService.verify(password, user.passwordHash);
    if (!valid) {
      const after = await userRepository.registerFailedLogin(user._id, env.login);
      if (after && isLocked(after)) {
        const err = locked(after.lockUntil);
        err.userId = String(user._id);
        err.username = user.username;
        throw err;
      }
      const err = invalidCredentials();
      err.userId = String(user._id);
      err.username = user.username;
      throw err;
    }
    if (!user.isActive) throw ApiError.forbidden("Tài khoản đã bị vô hiệu hoá", "ACCOUNT_DISABLED");

    await userRepository.registerSuccessfulLogin(user._id, meta.ip ?? "");
    const session = await issueSession(user, meta, remember);
    await sessionRepository.revokeOldest(user._id, env.maxSessions);
    return session;
  },

  /**
   * Đăng nhập nhanh cho bản demo (DEMO_LOGIN=true): vào tài khoản ADMIN_USERNAME, không cần mật khẩu.
   * Tắt cờ → coi như không có tính năng này (404). Tài khoản bị khoá / vô hiệu hoá vẫn bị chặn.
   */
  async demoLogin(meta) {
    if (!env.demoLogin) throw ApiError.notFound("Không tìm thấy");
    const user = await userRepository.findByUsernameWithPassword(env.admin.username);
    if (!user) throw ApiError.notFound("Tài khoản demo chưa sẵn sàng, vui lòng thử lại sau");
    if (!user.isActive) throw ApiError.forbidden("Tài khoản đã bị vô hiệu hoá", "ACCOUNT_DISABLED");
    await userRepository.registerSuccessfulLogin(user._id, meta.ip ?? "");
    const session = await issueSession(user, meta, false);
    await sessionRepository.revokeOldest(user._id, env.maxSessions);
    return session;
  },

  /** Xoay vòng refresh token: mỗi lần làm mới cấp token mới, token cũ bị thu hồi */
  async refresh(refreshToken, meta) {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) throw expired();

    const session = await sessionRepository.findByTokenHash(sha256(refreshToken));
    if (!session || String(session._id) !== payload.sid) throw expired();
    if (new Date(session.expiresAt).getTime() <= Date.now()) throw expired();

    const user = await userRepository.findById(session.user);
    if (!user || !user.isActive) {
      await sessionRepository.revokeAllForUser(session.user);
      throw expired();
    }

    if (session.revokedAt) {
      if (!session.replacedBy) throw expired(); // đã đăng xuất / bị thu hồi
      if (Date.now() - new Date(session.revokedAt).getTime() > REFRESH_REUSE_GRACE_MS) {
        // token đã xoay vòng bị dùng lại sau thời gian ân hạn → nghi bị đánh cắp
        logger.error(
          { event: "auth.token_reuse", actor: String(session.user), ip: meta?.ip },
          "[auth.token_reuse] refresh token cũ bị dùng lại — thu hồi mọi phiên",
        );
        await sessionRepository.revokeAllForUser(session.user);
        throw expired();
      }
      const extra = await issueSession(user, meta, session.remember);
      await sessionRepository.revokeOldest(user._id, env.maxSessions);
      return extra;
    }

    const next = await issueSession(user, meta, session.remember);
    const won = await sessionRepository.revokeIfActive(session._id, next.id);
    if (!won) {
      const latest = await sessionRepository.findById(session._id);
      if (!latest?.replacedBy) {
        await sessionRepository.revokeIfActive(next.id);
        throw expired();
      }
    }
    return next;
  },

  async logout(refreshToken) {
    if (!refreshToken || typeof refreshToken !== "string") return;
    const session = await sessionRepository.findByTokenHash(sha256(refreshToken));
    if (session) await sessionRepository.revokeIfActive(session._id);
  },

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) throw expired();
    return toPublicUser(user);
  },

  /**
   * Đổi mật khẩu của chính mình: kiểm tra mật khẩu hiện tại → lưu hash mới (tokenVersion tăng)
   * → đăng xuất MỌI thiết bị khác → cấp phiên mới cho thiết bị đang dùng.
   */
  async changePassword(userId, { currentPassword, newPassword }, meta) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !user.isActive) throw expired();
    if (!(await passwordService.verify(currentPassword, user.passwordHash)))
      throw ApiError.badRequest("Mật khẩu hiện tại không đúng", [
        { field: "body.currentPassword", message: "Mật khẩu hiện tại không đúng" },
      ]);
    if (await passwordService.verify(newPassword, user.passwordHash))
      throw ApiError.badRequest("Mật khẩu mới phải khác mật khẩu hiện tại");

    const updated = await userRepository.setPassword(
      userId,
      await passwordService.hash(newPassword),
    );
    await sessionRepository.revokeAllForUser(userId);
    return issueSession(updated, meta, false);
  },
};
