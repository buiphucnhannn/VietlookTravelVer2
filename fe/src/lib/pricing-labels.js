/**
 * Các dòng chi tiết giá tạm tính (lib/pricing.js sinh nhãn tiếng Anh, lưu kèm đơn) → tiếng Việt để hiện trong CMS.
 * Nhãn lạ (đơn cũ) giữ nguyên.
 */
const RULES = [
  [/^(\d+) adult\(s\) × \$(.+)$/, (m) => `${m[1]} người lớn × $${m[2]}`],
  [
    /^Child (\d+)y \((\d+)%\)$/,
    (m) =>
      m[2] === "0" ? `Trẻ ${m[1]} tuổi (miễn phí)` : `Trẻ ${m[1]} tuổi (${m[2]}% giá người lớn)`,
  ],
  [/^Holiday surcharge × (\d+)$/, (m) => `Phụ thu ngày lễ & cao điểm × ${m[1]} khách`],
  [/^Holiday surcharge (\d+(?:\.\d+)?)%$/, (m) => `Phụ thu ngày lễ & cao điểm ${m[1]}%`],
  [/^Single supplement$/, () => "Phụ thu phòng đơn"],
  [
    /^Small-group supplement \((\d+) guests?\) \+(\d+)%$/,
    (m) => `Phụ thu nhóm nhỏ (${m[1]} khách) +${m[2]}%`,
  ],
];

export function priceLineVi(label) {
  const s = String(label ?? "");
  for (const [rx, fn] of RULES) {
    const m = s.match(rx);
    if (m) return fn(m);
  }
  return s;
}
