import { ENQUIRY_STATUS, ENQUIRY_TYPE_VALUES } from "../constants/content.js";
import { trusted } from "../repositories/base.repository.js";
import { enquiryRepository } from "../repositories/content.repository.js";

/**
 * Số liệu trang Tổng quan (CMS): đơn đặt tour + yêu cầu từ form trong 14 ngày gần nhất.
 * Ngày tính theo giờ Việt Nam (UTC+7). Chỉ trả nhóm tài khoản được xem ("bookings" / "requests").
 */
export const DAYS = 14;
const DAY_MS = 864e5;
const VN_OFFSET_MS = 7 * 3600e3;

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam của 1 thời điểm */
export const vnDayKey = (d) =>
  new Date(new Date(d).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

/** 0h (giờ Việt Nam) của ngày đầu tiên trong cửa sổ `days` ngày kết thúc hôm nay */
export const windowStart = (now, days = DAYS) =>
  new Date(new Date(`${vnDayKey(now)}T00:00:00+07:00`).getTime() - (days - 1) * DAY_MS);

const kindOf = (type) => (type === "booking" ? "bookings" : "requests");

/** Điều kiện lọc đơn theo nhóm được xem (2 nhóm → không lọc) */
export const kindFilter = (kinds) =>
  kinds.length === 1
    ? kinds[0] === "bookings"
      ? { type: "booking" }
      : { $nor: [{ type: "booking" }] }
    : {};

/** % thay đổi so với kỳ trước (làm tròn); kỳ trước = 0 → null (không so được) */
export const trendPct = (now, prev) => (prev ? Math.round(((now - prev) / prev) * 100) : null);

/**
 * Gom số liệu (hàm thuần — test được không cần DB).
 * @param rows   đơn trong cửa sổ: { type, status, createdAt }
 * @param oldest đơn "Mới" lâu nhất (chưa ai xử lý): { code, type, createdAt } | null
 */
export function buildOverview({ rows = [], oldest = null, pending = 0, kinds, now = new Date() }) {
  const start = windowStart(now);
  const days = Array.from({ length: DAYS }, (_, i) => {
    const day = { date: vnDayKey(start.getTime() + i * DAY_MS + 12 * 3600e3) };
    for (const k of kinds) day[k] = 0;
    return day;
  });
  const index = new Map(days.map((d, i) => [d.date, i]));
  const byStatus = Object.fromEntries(ENQUIRY_STATUS.map((s) => [s, 0]));
  const byType = Object.fromEntries(
    ENQUIRY_TYPE_VALUES.filter((t) => kinds.includes(kindOf(t))).map((t) => [t, 0]),
  );

  for (const r of rows) {
    const kind = kindOf(r.type);
    if (!kinds.includes(kind)) continue; // phòng hờ: không bao giờ đếm nhóm không được xem
    const i = index.get(vnDayKey(r.createdAt));
    if (i === undefined) continue;
    days[i][kind] += 1;
    if (r.status in byStatus) byStatus[r.status] += 1;
    if (r.type in byType) byType[r.type] += 1;
  }

  const sum = (from, to) => {
    const out = { total: 0 };
    for (const k of kinds) out[k] = 0;
    for (const d of days.slice(from, to))
      for (const k of kinds) {
        out[k] += d[k];
        out.total += d[k];
      }
    return out;
  };
  const last7 = sum(7, 14);
  const prev7 = sum(0, 7);
  const trend = Object.fromEntries(
    ["total", ...kinds].map((k) => [k, trendPct(last7[k], prev7[k])]),
  );

  return {
    kinds,
    days,
    last7,
    prev7,
    trend,
    byStatus,
    byType,
    pending,
    oldestNew: oldest
      ? {
          code: oldest.code,
          type: oldest.type,
          kind: kindOf(oldest.type),
          createdAt: oldest.createdAt,
          ageDays: Math.max(0, Math.floor((now - new Date(oldest.createdAt)) / DAY_MS)),
        }
      : null,
  };
}

export function createOverviewService({ repo = enquiryRepository, clock = () => new Date() } = {}) {
  return {
    /** @param kinds nhóm tài khoản được xem — ["bookings", "requests"] / 1 nhóm */
    async enquiries(kinds) {
      const now = clock();
      const only = kindFilter(kinds);
      const [rows, [oldest = null], pending] = await Promise.all([
        repo.find(
          { ...only, createdAt: trusted({ $gte: windowStart(now) }) },
          { select: "type status createdAt" },
        ),
        repo.find(
          { ...only, status: "new" },
          { sort: { createdAt: 1 }, select: "code type createdAt", limit: 1 },
        ),
        repo.count({ ...only, status: "new" }),
      ]);
      return buildOverview({ rows, oldest, pending, kinds, now });
    },
  };
}

export const overviewService = createOverviewService();
