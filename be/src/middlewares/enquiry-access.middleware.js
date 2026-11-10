import { can } from "../constants/permissions.js";
import { enquiryRepository } from "../repositories/content.repository.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Đơn đặt tour (type "booking") thuộc mục "bookings"; mọi form khác thuộc mục "requests".
 * Quyền xem / sửa / xoá kiểm tra theo đúng loại của từng đơn.
 */
export const enquiryModule = (type) => (type === "booking" ? "bookings" : "requests");

/** Các nhóm đơn tài khoản được xem: ["bookings", "requests"] / 1 nhóm / [] */
export const viewableKinds = (user) => ["bookings", "requests"].filter((k) => can(user, k, "view"));

const notFound = () => ApiError.notFound("Không tìm thấy đơn / yêu cầu");

/**
 * Route theo :id — tra loại của đơn rồi kiểm tra quyền mức `level` ở đúng nhóm.
 * Không được xem nhóm đó → 404 (không để lộ là đơn có tồn tại); xem được nhưng thiếu quyền → 403.
 */
export const requireEnquiryAccess = (level) => async (req, _res, next) => {
  const id = req.validated?.params?.id ?? req.params.id;
  const doc = await enquiryRepository.findById(id, { select: "type" });
  if (!doc) return next(notFound());
  const module = enquiryModule(doc.type);
  if (!can(req.user, module, "view")) return next(notFound());
  if (!can(req.user, module, level)) return next(ApiError.forbidden());
  next();
};

/** Danh sách / thống kê: cần xem được ít nhất 1 nhóm; lọc theo nhóm không được xem → 403 */
export function requireEnquiryList(req, _res, next) {
  const kinds = viewableKinds(req.user);
  if (!kinds.length) return next(ApiError.forbidden());
  const q = req.validated?.query ?? {};
  const wanted = [q.kind, q.type && enquiryModule(q.type)].filter(Boolean);
  if (wanted.some((k) => !kinds.includes(k))) return next(ApiError.forbidden());
  next();
}
