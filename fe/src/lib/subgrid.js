/**
 * Thẻ nằm cạnh nhau trong một lưới: "tiêu đề ra tiêu đề, nội dung ra nội dung".
 *
 * Dùng CSS subgrid: lưới cha (`grid` + số cột theo màn hình) chia hàng, mỗi thẻ chiếm N hàng
 * (`subgrid(N, bp)`) và mỗi phần tử con TRỰC TIẾP của thẻ là một hàng (biểu tượng · tiêu đề ·
 * mô tả · chân thẻ…). Các thẻ cùng hàng dùng chung các hàng đó → tiêu đề 2 dòng ở một thẻ đẩy mô tả
 * của MỌI thẻ bên cạnh xuống cùng mức, các thẻ cao bằng nhau.
 *
 * - `bp`: mốc màn hình bắt đầu có từ 2 cột trở lên ("sm" | "md" | "lg"; bỏ trống = mọi màn hình).
 *   Dưới mốc đó thẻ giữ bố cục cũ (xếp chồng / dải vuốt `rail`) → không ảnh hưởng điện thoại.
 * - Khoảng cách giữa các hàng trong thẻ giữ bằng margin (mt-*) như trước (gap-y của thẻ = 0).
 * - Thẻ thiếu một hàng (vd không có giá) → đặt `<span aria-hidden />` giữ chỗ để các hàng không lệch.
 * - Thẻ bọc nhiều lớp (Reveal › Link › …) → mỗi lớp đều dùng `subgrid(N, bp)` tới lớp chứa các hàng.
 */
const CLASSES = {
  "": {
    2: "grid grid-cols-1 grid-rows-subgrid gap-y-0 row-span-2",
    3: "grid grid-cols-1 grid-rows-subgrid gap-y-0 row-span-3",
    4: "grid grid-cols-1 grid-rows-subgrid gap-y-0 row-span-4",
    5: "grid grid-cols-1 grid-rows-subgrid gap-y-0 row-span-5",
    6: "grid grid-cols-1 grid-rows-subgrid gap-y-0 row-span-6",
    7: "grid grid-cols-1 grid-rows-subgrid gap-y-0 row-span-7",
  },
  sm: {
    2: "sm:grid sm:grid-cols-1 sm:grid-rows-subgrid sm:gap-y-0 sm:row-span-2",
    3: "sm:grid sm:grid-cols-1 sm:grid-rows-subgrid sm:gap-y-0 sm:row-span-3",
    4: "sm:grid sm:grid-cols-1 sm:grid-rows-subgrid sm:gap-y-0 sm:row-span-4",
    5: "sm:grid sm:grid-cols-1 sm:grid-rows-subgrid sm:gap-y-0 sm:row-span-5",
    6: "sm:grid sm:grid-cols-1 sm:grid-rows-subgrid sm:gap-y-0 sm:row-span-6",
    7: "sm:grid sm:grid-cols-1 sm:grid-rows-subgrid sm:gap-y-0 sm:row-span-7",
  },
  md: {
    2: "md:grid md:grid-cols-1 md:grid-rows-subgrid md:gap-y-0 md:row-span-2",
    3: "md:grid md:grid-cols-1 md:grid-rows-subgrid md:gap-y-0 md:row-span-3",
    4: "md:grid md:grid-cols-1 md:grid-rows-subgrid md:gap-y-0 md:row-span-4",
    5: "md:grid md:grid-cols-1 md:grid-rows-subgrid md:gap-y-0 md:row-span-5",
    6: "md:grid md:grid-cols-1 md:grid-rows-subgrid md:gap-y-0 md:row-span-6",
    7: "md:grid md:grid-cols-1 md:grid-rows-subgrid md:gap-y-0 md:row-span-7",
  },
  lg: {
    2: "lg:grid lg:grid-cols-1 lg:grid-rows-subgrid lg:gap-y-0 lg:row-span-2",
    3: "lg:grid lg:grid-cols-1 lg:grid-rows-subgrid lg:gap-y-0 lg:row-span-3",
    4: "lg:grid lg:grid-cols-1 lg:grid-rows-subgrid lg:gap-y-0 lg:row-span-4",
    5: "lg:grid lg:grid-cols-1 lg:grid-rows-subgrid lg:gap-y-0 lg:row-span-5",
    6: "lg:grid lg:grid-cols-1 lg:grid-rows-subgrid lg:gap-y-0 lg:row-span-6",
    7: "lg:grid lg:grid-cols-1 lg:grid-rows-subgrid lg:gap-y-0 lg:row-span-7",
  },
};

export function subgrid(rows, bp = "") {
  return CLASSES[bp][rows];
}
