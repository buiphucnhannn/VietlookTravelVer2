# Vietlook Travel — Website + CMS

Website lữ hành 3 ngôn ngữ (EN / ZH / VI), B2B & B2C. **Next.js 16 (App Router, Cache Components) + TailwindCSS v4 + JavaScript**.
Bản Next này khác nhiều so với bản cũ — đọc `node_modules/next/dist/docs/` trước khi sửa (xem `AGENTS.md`, file do `next dev` tự sinh).

## Bắt đầu

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000 — cần backend (be/) chạy ở cổng 4000
```

| Script           | Mô tả                                     |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | Chạy môi trường phát triển                |
| `npm run build`  | Build production (cần backend có dữ liệu) |
| `npm start`      | Chạy bản build                            |
| `npm run lint`   | Kiểm tra ESLint (`lint:fix` để tự sửa)    |
| `npm run format` | Format code bằng Prettier                 |

Biến môi trường: xem `.env.example`.

- **Ngôn ngữ**: tiếng Anh không có tiền tố (`/tours/...`, `/en/...` chuyển về bản không tiền tố), tiếng Trung `/zh/...`, tiếng Việt `/vi/...`. Trang chủ tự chuyển sang `/zh` hoặc `/vi` theo ngôn ngữ trình duyệt nếu khách chưa tự chọn. Nội dung thiếu bản dịch tự dùng ngôn ngữ khác (en → vi → zh) — `src/i18n/config.js`.
- **Captcha**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (ở đây) + `TURNSTILE_SECRET_KEY` (be/.env) → mọi form công khai có Turnstile; để trống cả hai = bỏ qua. Xem be/README.md mục "Captcha".
- **Mã Google + cookie**: mã GTM / GA4 / Google Ads nhập trong CMS (Cài đặt). Chưa có mã → không chèn script, không hiện banner. Có mã → Consent Mode v2 mặc định từ chối, banner cookie (Chấp nhận / Từ chối / Tuỳ chỉnh, link "Cài đặt cookie" ở chân trang); script Google chỉ nạp sau khi khách đồng ý (`components/layout/Tracking.js`, `ConsentBanner.js`, `lib/consent.js`). Trang cảm ơn gửi sự kiện `generate_lead` (kèm `form_type`) khi đã đồng ý → tạo thẻ chuyển đổi Google Ads / sự kiện chính GA4 từ sự kiện này.
- **URL web cũ**: `/tour/<slug>/` → `/tours/<slug>` và các trang / bài / chuyên mục cũ trong `src/data/old-site-redirects.json` (chuyển hướng vĩnh viễn, nạp trong `next.config.mjs`). Danh sách đầy đủ + đối chiếu: `docs/old-site-urls.csv`, `docs/redirect-map.csv`.
- **Ảnh**: tải thẳng từ Cloudinary qua loader riêng (`src/lib/image-loader.js`) — không dùng bộ tối ưu ảnh của Vercel.

Nội dung (tour, điểm đến, bài viết, dịch vụ, trang) lấy từ backend qua `src/lib/catalog.js` (cache theo thẻ, CMS lưu xong website cập nhật ngay). CMS ở `src/app/(system)/admin`, đăng nhập `src/app/(system)/login`.

## Trang

| Đường dẫn                                             | Nội dung                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/`                                                   | Banner + tìm tour, dịch vụ, tour dài ngày, chủ đề, điểm đến, B2B, đánh giá, cẩm nang, form lên kế hoạch  |
| `/tours`, `/tours/[slug]`                             | Danh sách + lọc/tìm/phân trang; chi tiết, lịch trình, giá tạm tính, đặt tour + thanh toán 9Pay (nếu bật) |
| `/destinations`, `/destinations/[slug]`               | Miền Bắc – Trung – Nam và từng điểm đến                                                                  |
| `/themes/[slug]`                                      | Chủ đề tour                                                                                              |
| `/packages`, `/halong-bay-cruises`                    | Tour trọn gói 1/2/3 tuần, du thuyền Hạ Long                                                              |
| `/group-tailor-made-tours`, `/plan-your-trip`         | Tour đoàn & thiết kế riêng, form nhiều bước                                                              |
| `/services`, `/car-rental`, `/visa-fast-track`        | Dịch vụ; xe riêng kèm tài xế + form báo giá; visa & fast-track + form đặt                                |
| `/travel-guide/...`                                   | Cẩm nang: danh sách, chuyên mục, tác giả, bài viết                                                       |
| `/about`, `/contact`, `/partners`, `/policies/[slug]` | Giới thiệu, liên hệ + Google Maps, đối tác B2B, chính sách                                               |
| `/thank-you`                                          | Trang cảm ơn sau khi gửi form / thanh toán                                                               |

## Cấu trúc thư mục

```
public/images/            Ảnh gốc (npm run images:upload ở be/ đưa lên Cloudinary)
public/videos/            Video nền trang chủ mặc định
src/
├── app/[lang]/           Mọi trang theo ngôn ngữ (en, zh, vi)
├── app/(system)/         CMS (/admin) và trang đăng nhập (/login)
├── proxy.js              Chọn ngôn ngữ, 404 / đổi slug, bảo vệ /admin, chuyển /api/v1 sang backend
├── config/urls.mjs       BACKEND_URL, đường dẫn admin
├── i18n/                 Cấu hình & từ điển giao diện (dictionaries/en.js, zh.js, vi.js)
├── components/           ui/ layout/ home/ tours/ car/ visa/ guide/ forms/ admin/
├── constants/site.js     Thông tin liên hệ doanh nghiệp, tên miền chính
├── lib/                  Gọi API, SEO, giá tạm tính (pricing.js — bản sao be/src/utils/pricing.js), ...
└── data/                 Dữ liệu cố định trong code (bảng giá xe theo tuyến, bản đồ, chuyển hướng URL cũ...)
```
