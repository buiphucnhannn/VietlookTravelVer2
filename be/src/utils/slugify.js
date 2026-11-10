/** "Hà Nội – Hạ Long 3 ngày" → "ha-noi-ha-long-3-ngay" (bỏ dấu, đ → d, chỉ a-z 0-9 và gạch ngang) */
export function slugify(input, max = 120) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}
