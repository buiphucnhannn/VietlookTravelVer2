/**
 * Ảnh các khối trang chủ: ảnh có sẵn của website + ảnh nhân viên thay trong CMS → Trang chủ
 * (lưu ở home.images, ô trống = dùng ảnh có sẵn). Dùng chung cho website và bản thu nhỏ trong CMS.
 *
 * `crop`: khung cắt + bề ngang ảnh xuất ra khi nhân viên tải ảnh mới — đúng tỉ lệ khung hiển thị trên web,
 * rộng ≥ 2 lần kích thước hiển thị lớn nhất (màn hình nét cao) để ảnh luôn sắc nét.
 */

export const DEFAULT_HOME_IMAGES = {
  services: {
    tours: "/images/services/svc-tour-cao-bang.webp",
    car: "/images/services/svc-car-vietlook-carnival.webp",
    visa: "/images/services/svc-visa-welcome.webp",
  },
  // 6 cánh ngôi sao dải lụa: trên · trái trên · phải trên · phải dưới · trái dưới · dưới
  star: [
    "/images/ribbon/top.webp",
    "/images/ribbon/ul.webp",
    "/images/ribbon/ur.webp",
    "/images/ribbon/lr.webp",
    "/images/ribbon/ll.webp",
    "/images/ribbon/bottom.webp",
  ],
  // Khối đối tác: khung lớn (miền Bắc) + khung nhỏ (miền Trung & Nam), mỗi khung 3 ảnh đổi luân phiên
  b2bNorth: [
    "/images/b2b/tam-coc-bich-dong.webp",
    "/images/tours/hd/bai-dinh.jpg",
    "/images/tours/v2/sapa-235925.jpg",
  ],
  b2bSouth: [
    "/images/b2b/hoi-an-9-copy.webp",
    "/images/b2b/da-nang.webp",
    "/images/b2b/phu-quoc.webp",
  ],
  about: "/images/tours/v2/vietnam-12674100.jpg",
};

/**
 * Khung cắt từng ô. Ngôi sao: tỉ lệ đúng hộp của từng cánh (RibbonStar.js, khung tối đa 540px),
 * bề ngang ≈ 2,5 lần cánh (màn hình nét cao + hiệu ứng phóng to khi rê chuột).
 */
export const HOME_IMAGE_CROPS = {
  services: { ratio: 16 / 10, width: 1200 }, // thẻ ~420px
  star: [
    { ratio: 0.909, width: 500 },
    { ratio: 1, width: 540 },
    { ratio: 1.602, width: 640 },
    { ratio: 1.536, width: 720 },
    { ratio: 1.767, width: 800 },
    { ratio: 2.86, width: 1040 },
  ],
  b2b: { ratio: 6 / 5, width: 1000 }, // khung ~445px
  about: { ratio: 1, width: 1200 }, // ảnh vòm vuông ~576px
};

const pick = (v, fallback) => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const list = (arr, defs) => defs.map((d, i) => pick(arr?.[i], d));

/** Ảnh dùng thật trên web: ảnh CMS nếu có, không thì ảnh có sẵn */
export function homeImages(o = {}) {
  const d = DEFAULT_HOME_IMAGES;
  return {
    services: {
      tours: pick(o.services?.tours, d.services.tours),
      car: pick(o.services?.car, d.services.car),
      visa: pick(o.services?.visa, d.services.visa),
    },
    star: list(o.star, d.star),
    b2bNorth: list(o.b2bNorth, d.b2bNorth),
    b2bSouth: list(o.b2bSouth, d.b2bSouth),
    about: pick(o.about, d.about),
  };
}
