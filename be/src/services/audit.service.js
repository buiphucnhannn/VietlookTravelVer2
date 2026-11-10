import { logger } from "../config/logger.js";
import { auditLogRepository } from "../repositories/audit-log.repository.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

/**
 * Nhật ký thao tác: ghi 1 dòng log (luôn có trường `event` để lọc) + lưu vào MongoDB để xem trong CMS.
 *   auditService.record(req, "user.update", { target: { type: "user", id }, meta: { role } })
 * Ghi DB không chặn request; lỗi ghi DB chỉ cảnh báo (không làm hỏng thao tác chính).
 * KHÔNG truyền mật khẩu / token / dữ liệu cá nhân của khách vào `meta`.
 */
export const auditService = {
  record(req, action, { target, meta = {}, actor, level = "info" } = {}) {
    const who = actor ?? req.user;
    const entry = {
      actor: who?.id ?? null,
      actorName: who?.username ?? "",
      action,
      target: target ?? {},
      ip: req.ip ?? "",
      userAgent: String(req.get?.("user-agent") ?? "").slice(0, 300),
      meta,
    };
    (req.log ?? logger)[level](
      { event: action, actor: entry.actor, ip: entry.ip, target: entry.target, ...meta },
      `[${action}]`,
    );
    auditLogRepository
      .create(entry)
      .catch((err) => logger.warn({ err, event: action }, "[audit] không ghi được nhật ký vào DB"));
  },

  /** Ghi log bảo mật (không lưu DB) — vd. CSRF bị chặn, rate limit */
  security(req, event, data = {}) {
    (req.log ?? logger).warn({ event, ip: req.ip, path: req.path, ...data }, `[${event}]`);
  },

  async list(query) {
    const page = getPagination(query, { defaultLimit: 50, maxLimit: 200 });
    const filter = {};
    if (query.action) filter.action = query.action;
    if (query.actor) filter.actor = query.actor;
    const { items, total } = await auditLogRepository.paginate(filter, page);
    return { items, meta: buildPageMeta(page, total) };
  },
};
