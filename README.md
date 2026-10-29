# Vietlook Travel Operators

Website lữ hành song ngữ Anh – Trung (B2B/B2C) xây dựng bằng **Next.js 16 (App Router, Cache Components) + TailwindCSS v4 + JavaScript**.

## Bắt đầu

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000  -> tự chuyển sang /en (hoặc /zh nếu trình duyệt tiếng Trung)
```

| Script           | Mô tả                                  |
| ---------------- | -------------------------------------- |
| `npm run dev`    | Chạy môi trường phát triển             |
| `npm run build`  | Build production                       |
| `npm start`      | Chạy bản build                         |
| `npm run lint`   | Kiểm tra ESLint (`lint:fix` để tự sửa) |
| `npm run format` | Format code bằng Prettier              |

Biến môi trường (`.env.local`):

| Biến                   | Ý nghĩa                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Tên miền thật (dùng cho canonical, hreflang, sitemap)          |
| `RESEND_API_KEY`       | (tuỳ chọn) gửi email xác nhận cho khách & doanh nghiệp         |
| `MAIL_FROM`            | (tuỳ chọn) địa chỉ gửi, vd. `Vietlook Travel <no-reply@...>`   |
| `NOTIFY_EMAIL`         | (tuỳ chọn) email nhận thông báo yêu cầu mới                    |

## Trang & mẫu tham khảo

| Đường dẫn (`/en`, `/zh`)              | Nội dung                                                    | Tham khảo            |
| ------------------------------------- | ----------------------------------------------------------- | -------------------- |
| `/`                                   | Banner + tìm tour, 3 dịch vụ, tour dài ngày, chủ đề, điểm đến, B2B, đánh giá, cẩm nang, form lên kế hoạch | localvietnam, lilystravelagency, auroratravel |
| `/tours`, `/tours/[slug]`             | Danh sách + lọc/tìm/phân trang; chi tiết, lịch trình, giá tạm tính, đặt tour | localvietnam |
| `/destinations/[slug]`                | Miền Bắc – Trung – Nam và từng điểm đến                      | localvietnam |
| `/themes/[slug]`                      | 8 chủ đề tour                                                | auroratravel |
| `/packages`, `/halong-bay-cruises`    | Tour trọn gói 1/2/3 tuần, du thuyền Hạ Long                  | localvietnam, lilys |
| `/group-tailor-made-tours`, `/plan-your-trip` | Tour đoàn & thiết kế riêng, form nhiều bước           | localvietnam |
| `/car-rental`                         | Xe riêng kèm tài xế 4–45 chỗ, bảng giá tuyến, form báo giá   | hltcarservice (custom) |
| `/visa-fast-track`                    | Loại visa, gói fast-track theo sân bay, form đặt dịch vụ     | – |
| `/travel-guide/...`                   | Cẩm nang: danh sách, chuyên mục, bài viết                    | localvietnam |
| `/about`, `/contact`, `/partners`, `/policies/[slug]` | Giới thiệu, liên hệ + Google Maps, đối tác B2B, chính sách | – |

URL cũ của WordPress (`/tour/<slug>/`, `/fast-track-and-visa/`, …) được chuyển hướng 301 trong `next.config.mjs`.

## Cấu trúc thư mục

```
public/images/
├── tours/                Ảnh tour (tất cả đều được dùng)
├── rent-car/             Ảnh xe thật; cutouts/ = ảnh xe đã tách nền (WebP)
└── logo/                 Logo cắt từ logo gốc
src/
├── app/[lang]/           Mọi trang theo ngôn ngữ (en, zh)
├── app/api/enquiry/      Nhận yêu cầu từ mọi form, tạo mã yêu cầu, gửi email
├── proxy.js              Tự chuyển hướng sang /en hoặc /zh
├── i18n/                 Cấu hình & từ điển giao diện (en.js, zh.js)
├── components/           ui/ layout/ home/ tours/ car/ visa/ guide/ forms/
├── constants/site.js     Thông tin liên hệ doanh nghiệp
└── data/                 Dữ liệu (sau thay bằng CMS/MongoDB)
    └── generated/        Tour, bài viết, bảng giá xe chuyển từ vietlooktravel.com
```

## Lưu ý dữ liệu

- Tour, lịch trình, giá, bảng giá xe, đánh giá, thông tin liên hệ lấy từ vietlooktravel.com.
- Tour dài ngày không có giá trên web cũ được đặt **giá tham khảo**; phí visa/fast-track là giá tham khảo – cần doanh nghiệp xác nhận.
- Bài viết cũ chỉ có tiếng Anh; bản tiếng Trung hiển thị thông báo "đang dịch".
