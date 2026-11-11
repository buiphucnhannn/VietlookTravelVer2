/**
 * Tìm kiếm trong CMS không phân biệt dấu tiếng Việt, hoa / thường và khoảng trắng:
 *   "ha noi" = "hà nội" = "Hanoi" = "HÀNỘI"  ·  "da nang" khớp "Đà Nẵng"  ·  "vlhn01" khớp mã "VL-HN01"
 * Dữ liệu trong DB giữ nguyên (có dấu) → không cần thêm trường phụ; câu tìm được đổi thành RegExp mà mỗi chữ
 * cái khớp mọi biến thể có dấu của nó, giữa các chữ cho phép khoảng trắng / gạch nối (slug, mã tour).
 */

// Chữ không dấu → mọi biến thể có dấu (chữ thường; chữ hoa thêm tự động)
const VARIANTS = {
  a: "aàáạảãâầấậẩẫăằắặẳẵ",
  e: "eèéẹẻẽêềếệểễ",
  i: "iìíịỉĩ",
  o: "oòóọỏõôồốộổỗơờớợởỡ",
  u: "uùúụủũưừứựửữ",
  y: "yỳýỵỷỹ",
  d: "dđ",
};
// Dấu rời (dữ liệu dạng NFD) — ghi bằng ký tự thật để MongoDB (PCRE) hiểu được, không dùng \u
const MARKS = "[̀-ͯ]*";
// Ký tự phân cách được bỏ qua: khoảng trắng, gạch nối, gạch dưới, chấm, phẩy, gạch chéo
const SEP_CHARS = /[\s\-_.,/–—]+/g;
const SEP = "[\\s\\-_.,/–—]*";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "Hà Nội" → "ha noi" (bỏ dấu, đ → d, chữ thường) */
export const foldText = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

/**
 * Câu tìm → RegExp (hoặc null nếu câu tìm rỗng) dùng cho điều kiện { field: rx } của MongoDB.
 *   searchRegex("ha noi")  →  /h[MARKS][SEP][aàá…ẴẶ][MARKS][SEP]n…/i
 */
export function searchRegex(q) {
  const chars = [...foldText(q).trim().replace(SEP_CHARS, "")];
  if (!chars.length) return null;
  const parts = chars.map((c) => {
    const v = VARIANTS[c];
    return v ? `[${v}${v.toUpperCase()}]` : escapeRegex(c);
  });
  return new RegExp(parts.join(MARKS + SEP), "i");
}
