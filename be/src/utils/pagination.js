/** Chuẩn hoá { page, limit } (đã qua validator) → { page, limit, skip } — giới hạn limit để tránh truy vấn nặng. */
export function getPagination({ page, limit } = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const p = Math.max(1, Number.parseInt(page, 10) || 1);
  const l = Math.min(maxLimit, Math.max(1, Number.parseInt(limit, 10) || defaultLimit));
  return { page: p, limit: l, skip: (p - 1) * l };
}

export const buildPageMeta = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1,
});
