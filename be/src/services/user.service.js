import { ROLES } from "../constants/roles.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { passwordService } from "./password.service.js";

/**
 * Chỉ trả các trường an toàn ra ngoài (truy vấn .lean() bỏ qua toJSON của model
 * → luôn đi qua hàm này, không trả thẳng document).
 */
export function toPublicUser(u) {
  if (!u) return null;
  return {
    id: String(u._id ?? u.id),
    username: u.username,
    email: u.email || "",
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    locked: Boolean(u.lockUntil && new Date(u.lockUntil).getTime() > Date.now()),
    lastLoginAt: u.lastLoginAt ?? null,
    passwordChangedAt: u.passwordChangedAt ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Thu hồi mọi phiên + vô hiệu access token hiện có của 1 tài khoản */
async function forceLogout(id) {
  await userRepository.bumpTokenVersion(id);
  await sessionRepository.revokeAllForUser(id);
}

async function getOr404(id) {
  const user = await userRepository.findById(id);
  if (!user) throw ApiError.notFound("Không tìm thấy tài khoản");
  return user;
}

export const userService = {
  async list(query) {
    const page = getPagination(query);
    const filter = {};
    if (query.q) {
      const rx = new RegExp(escapeRegex(query.q), "i");
      filter.$or = [{ username: rx }, { name: rx }, { email: rx }]; // $or được phép; giá trị là RegExp đã escape
    }
    if (query.role) filter.role = query.role;
    const { items, total } = await userRepository.paginate(filter, page);
    return { items: items.map(toPublicUser), meta: buildPageMeta(page, total) };
  },

  async getById(id) {
    return toPublicUser(await getOr404(id));
  },

  async create({ username, email = "", name, password, role }) {
    if (await userRepository.findByUsername(username))
      throw ApiError.conflict("Tên đăng nhập này đã được dùng");
    const user = await userRepository.create({
      username,
      email,
      name,
      role,
      passwordHash: await passwordService.hash(password),
    });
    return toPublicUser(user.toObject());
  },

  /** Sửa tên / vai trò / trạng thái. Không cho tự hạ quyền, tự khoá, hoặc làm mất admin cuối cùng. */
  async update(id, data, actorId) {
    const user = await getOr404(id);
    const isSelf = String(user._id) === String(actorId);

    if (isSelf && (data.isActive === false || (data.role && data.role !== user.role)))
      throw ApiError.badRequest("Không thể tự khoá hoặc tự đổi vai trò của chính mình");

    const losesAdmin =
      user.role === ROLES.ADMIN &&
      user.isActive &&
      (data.isActive === false || (data.role && data.role !== ROLES.ADMIN));
    if (losesAdmin && (await userRepository.countActiveAdmins(user._id)) === 0)
      throw ApiError.badRequest("Phải còn ít nhất 1 tài khoản admin đang hoạt động");

    const updated = await userRepository.updateById(id, { $set: data });
    // Bị khoá hoặc đổi vai trò → đăng xuất ngay để quyền mới có hiệu lực
    if (data.isActive === false || (data.role && data.role !== user.role)) await forceLogout(id);
    return toPublicUser(updated);
  },

  /** Admin đặt lại mật khẩu cho tài khoản khác → tài khoản đó bị đăng xuất mọi nơi */
  async resetPassword(id, newPassword) {
    await getOr404(id);
    const updated = await userRepository.setPassword(id, await passwordService.hash(newPassword));
    await sessionRepository.revokeAllForUser(id);
    return toPublicUser(updated);
  },

  async unlock(id) {
    await getOr404(id);
    return toPublicUser(
      await userRepository.updateById(id, { $set: { lockUntil: null, failedLoginCount: 0 } }),
    );
  },

  async remove(id, actorId) {
    const user = await getOr404(id);
    if (String(user._id) === String(actorId))
      throw ApiError.badRequest("Không thể xoá tài khoản của chính mình");
    if (user.role === ROLES.ADMIN && (await userRepository.countActiveAdmins(user._id)) === 0)
      throw ApiError.badRequest("Phải còn ít nhất 1 tài khoản admin đang hoạt động");
    await sessionRepository.revokeAllForUser(id);
    await userRepository.deleteById(id);
  },
};
