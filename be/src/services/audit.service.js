import mongoose from "mongoose";
import { logger } from "../config/logger.js";
import {
  AUDIT_TARGET_TYPES,
  auditLogRepository,
  contentName,
} from "../repositories/audit-log.repository.js";
import { trusted } from "../repositories/base.repository.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { searchRegex } from "../utils/search.js";
const refKey = (t) => `${t?.type}:${t?.id}`;
const canLookup = (t) => AUDIT_TARGET_TYPES.includes(t?.type) && Boolean(t?.id);

/** Tên dễ đọc của nội dung để ghi kèm nhật ký: `meta: { name: auditName(doc) }` */
export const auditName = contentName;

/**
 * Bổ sung tên dễ đọc cho các dòng nhật ký (cả dòng cũ chưa ghi tên): tra tên hiện tại theo loại + mã,
 * mỗi loại 1 truy vấn. Thêm vào mỗi dòng:
 *   targetName  tên (ưu tiên tên lúc thao tác đã ghi trong meta.name)
 *   targetGone  true khi đối tượng không còn (đã bị xoá sau đó)
 *   customer, targetKind  với đơn: tên khách, nhóm "bookings" / "requests"
 */
export async function enrichTargets(
  items,
  lookup = (refs) => auditLogRepository.lookupTargets(refs),
) {
  const refs = items
    .filter((x) => canLookup(x.target) && !x.action?.endsWith(".delete"))
    .map((x) => x.target);
  const found = refs.length ? await lookup(refs) : new Map();
  return items.map((x) => {
    const meta = x.meta ?? {};
    const hit = found.get(refKey(x.target));
    const deleted = x.action?.endsWith(".delete");
    return {
      ...x,
      targetName: meta.name || hit?.name || "",
      targetGone: deleted || (canLookup(x.target) && !hit),
      ...((meta.customer || hit?.customer) && { customer: meta.customer || hit.customer }),
      ...((meta.kind || hit?.kind) && { targetKind: meta.kind || hit.kind }),
    };
  });
}

/**
 * Nhật ký thao tác: ghi 1 dòng log (luôn có trường `event` để lọc) + lưu vào MongoDB để xem trong CMS.
 *   auditService.record(req, "user.update", { target: { type: "user", id }, meta: { name, role } })
 * `meta.name`: tên dễ đọc của đối tượng (tiêu đề tour, tên tài khoản…). Không truyền → tự tra theo
 * target trước khi lưu (đối tượng đã xoá thì phải truyền sẵn).
 * Ghi DB không chặn request; lỗi ghi DB chỉ cảnh báo (không làm hỏng thao tác chính).
 * KHÔNG truyền mật khẩu / token / email / số điện thoại vào `meta` (đơn chỉ ghi mã + tên khách).
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
    // tên khách không ghi ra log máy chủ (chỉ lưu trong nhật ký CMS)
    const logMeta = { ...meta };
    delete logMeta.customer;
    (req.log ?? logger)[level](
      { event: action, actor: entry.actor, ip: entry.ip, target: entry.target, ...logMeta },
      `[${action}]`,
    );
    const save = async () => {
      if (!meta.name && canLookup(entry.target) && mongoose.connection.readyState === 1) {
        const [x] = await enrichTargets([entry]).catch(() => [entry]);
        if (x.targetName)
          entry.meta = {
            ...meta,
            name: x.targetName,
            ...(x.customer && { customer: x.customer }),
            ...(x.targetKind && { kind: x.targetKind }),
          };
      }
      return auditLogRepository.create(entry);
    };
    save().catch((err) =>
      logger.warn({ err, event: action }, "[audit] không ghi được nhật ký vào DB"),
    );
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
    if (query.q || query.actions?.length) {
      const or = [];
      const rx = searchRegex(query.q); // không phân biệt dấu / hoa thường / khoảng trắng
      if (rx) {
        // tên người làm, mã đơn, tên nội dung / tài khoản, tên khách của đơn
        or.push(
          { actorName: rx },
          { "target.id": rx },
          { "meta.slug": rx },
          { "meta.name": rx },
          { "meta.customer": rx },
        );
      }
      if (query.actions?.length) or.push({ action: trusted({ $in: query.actions }) });
      if (or.length) filter.$or = or;
    }
    // Khoảng ngày theo giờ Việt Nam (UTC+7)
    const range = {};
    if (query.from) range.$gte = new Date(`${query.from}T00:00:00+07:00`);
    if (query.to) range.$lt = new Date(new Date(`${query.to}T00:00:00+07:00`).getTime() + 864e5);
    if (Object.keys(range).length) filter.createdAt = trusted(range);
    const { items, total } = await auditLogRepository.paginate(filter, page);
    return { items: await enrichTargets(items), meta: buildPageMeta(page, total) };
  },
};
