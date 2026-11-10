# Vietlook Travel

Website lữ hành 3 ngôn ngữ (EN / ZH / VI) cho Vietlook Travel — B2C & B2B.

```
.
├── fe/     Website — Next.js 16 (App Router) + TailwindCSS v4   → xem fe/README.md
├── be/     REST API + CMS — Express 5 + MongoDB + Cloudinary    → xem be/README.md
└── docs/   Tài liệu dự án (phạm vi, demo, bàn giao)
```

## Chạy local

```bash
# 1) Backend (cổng 4000)
cd be
cp .env.example .env        # điền MONGODB_URI, CLOUDINARY_*, ADMIN_USERNAME / ADMIN_PASSWORD
npm install
npm run images:upload       # (1 lần) đưa ảnh có sẵn lên Cloudinary
npm run seed                # (1 lần) nạp tour, điểm đến, bài viết… vào MongoDB
npm run dev

# 2) Frontend (cổng 3000) — terminal khác
cd fe
cp .env.example .env.local
npm install
npm run dev
```

## Trang quản trị (CMS)

- Địa chỉ: `/admin` · đăng nhập tại `/login`. Bảo vệ: proxy kiểm tra đăng nhập ở server TRƯỚC khi render, mọi API quản trị bắt buộc đăng nhập + phân quyền, header chống nhúng iframe / không cache / không index, robots.txt chặn bot.
- Tài khoản admin đầu tiên: `ADMIN_USERNAME` / `ADMIN_PASSWORD` trong `be/.env` (server tạo 1 lần khi chưa có). Đổi mật khẩu và tạo tài khoản khác ngay trong CMS; quên mật khẩu → `npm run admin:reset` trong `be/`.
- Trang chủ, Giới thiệu, Chính sách: sửa trực tiếp trên bản thu nhỏ của trang rồi bấm Lưu.
- Tour nhập theo "Mẫu thông tin tour": tour ghép / riêng, lịch trình có bữa ăn + nơi nghỉ đêm, giá theo số khách × hạng khách sạn 3★/4★/5★, giá trẻ em, phụ thu, FAQ, ảnh, video.
- Video: chỉ dán link YouTube / Google Drive. Ảnh: tải từ máy hoặc dán link.
- Mã Google (Tag Manager / Analytics / Ads): nhập ở Cài đặt → Đo lường & quảng cáo.
- Lưu trong CMS → website cập nhật ngay (xoá cache theo thẻ).
- Ảnh: tải thẳng từ CDN Cloudinary (tự đổi cỡ, AVIF/WebP) — KHÔNG dùng bộ tối ưu ảnh của Vercel.

## Deploy

| Phần | Nơi chạy                | Ghi chú                                                                                          |
| ---- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| fe   | Vercel                  | **Root Directory = `fe`** · env: `BACKEND_URL`, `PROXY_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |
| be   | Cloud VPS (PM2 + Nginx) | `pm2 start ecosystem.config.cjs --env production` — xem `be/README.md`                           |

## Quy ước

- Không commit file `.env*` (chỉ commit `.env.example`). Key thật đặt trên Vercel / server.
- Mỗi phần có `.gitignore` riêng; `.gitignore` ở gốc chứa quy tắc chung (OS, editor, secret).
