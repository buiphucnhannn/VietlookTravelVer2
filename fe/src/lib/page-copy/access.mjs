/**
 * Khối "Du lịch không rào cản" dùng chung (CMS → Giao diện trang → Toàn website → Khối du lịch không rào cản).
 *
 * Trang Tour nhóm có 3 ô riêng cho dải gọn (accessTitle / accessText / accessCta, mặc định "access.*" trong từ
 * điển). Để ô chưa sửa bên đó đi theo chữ của khối chung, ghép chữ khối chung vào dict.access trước khi tính
 * mặc định của trang Tour nhóm (website + bản xem trước CMS dùng cùng hàm này).
 * Không import gì (dùng được cả server lẫn trình duyệt).
 */

/** Các trang có ô mặc định lấy từ dict.access cần đi theo khối chung */
export const ACCESS_LAYERED = ["group-tailor-made-tours"];

/** dict + chữ khối chung (`a` = resolvePage của khoá "access") đè lên dict.access */
export function withAccessCopy(dict, a) {
  if (!a) return dict;
  return {
    ...dict,
    access: {
      ...dict.access,
      eyebrow: a.eyebrow,
      title: a.title,
      text: a.text,
      cta: a.cta,
      note: a.note,
      points: a.points,
      badgeLong: a.bandText,
    },
  };
}
