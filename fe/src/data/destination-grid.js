/**
 * Lưới 6 ô ảnh điểm đến ở trang chủ (yêu cầu khách 11/2026):
 * Hà Nội · Huế – Đà Nẵng · Nha Trang – Đà Lạt · TP.HCM · Phú Quốc · Côn Đảo.
 *
 * Nhân viên chọn 6 điểm đến trong CMS → Trang chủ. Điểm đến có trong GRID_PAIRS được hiện GHÉP với điểm
 * đến đi kèm (1 ảnh của điểm chính, tên ghép "Huế – Đà Nẵng"), trừ khi điểm đi kèm đã có ô riêng.
 * Ô ghép dẫn tới trang miền của điểm chính (danh sách mọi điểm đến + tour của miền).
 */
export const GRID_PAIRS = Object.freeze({
  hue: "da-nang",
  "nha-trang": "dalat",
});

/** 6 ô mặc định khi CMS chưa chọn */
export const DEFAULT_GRID = [
  "hanoi",
  "hue",
  "nha-trang",
  "ho-chi-minh-city",
  "phu-quoc",
  "con-dao",
];

/** Điểm đến đi kèm của ô `slug` (null nếu ô đơn hoặc điểm đi kèm đã có ô riêng) */
export function pairOf(slug, picked = []) {
  const partner = GRID_PAIRS[slug];
  return partner && !picked.includes(partner) ? partner : null;
}
