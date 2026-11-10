# Vietlook Travel — API

Express 5 · MongoDB (Mongoose 9) · Cloudinary · Zod · JWT (cookie HttpOnly) · Pino. Node ≥ 22.9, ES modules.

## Bắt đầu

```bash
cp .env.example .env     # điền MONGODB_URI, CLOUDINARY_* (xem chú thích trong file)
npm install
npm run secret           # sinh JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / PROXY_SECRET → dán vào .env
npm run dev              # http://localhost:4000/api/v1/health — lần đầu tự tạo admin từ ADMIN_USERNAME / ADMIN_PASSWORD
```

| Script           | Mô tả                                           |
| ---------------- | ----------------------------------------------- |
| `npm run dev`    | Chạy dev, tự khởi động lại khi sửa code         |
| `npm start`      | Chạy production                                 |
| `npm test`       | Test (node:test + supertest, không cần DB thật) |
| `npm run lint`   | ESLint                                          |
| `npm run format` | Prettier                                        |
| `npm run secret` | Sinh secret ngẫu nhiên                          |

## Cấu trúc

```
src/
├── server.js            Khởi động: kết nối DB/Cloudinary → listen → tắt êm
├── app.js               Express app + thứ tự middleware (không listen → test được)
├── config/              env (kiểm tra bằng Zod), database, cloudinary, logger
├── constants/           Hằng số dùng chung (roles...)
├── models/              Mongoose schema
├── repositories/        Lớp DUY NHẤT truy vấn DB (kế thừa BaseRepository)
├── services/            Nghiệp vụ — chỉ gọi repository, không đụng req/res
├── controllers/         Nhận req.validated → gọi service → trả JSON
├── routes/              Khai báo endpoint + middleware (auth, validate, rate limit)
├── validators/          Schema Zod cho params / query / body
├── middlewares/         auth, validate, error, rate-limit, upload, captcha, CSRF, proxy guard
├── utils/               ApiError, response, cookie, pagination...
tests/                   Test tự động
```

Luồng một request: `route → middleware (auth, validate) → controller → service → repository → model`.

### Thêm module mới (vd. tours)

1. `models/tour.model.js` — schema (dùng `localizedString`, `imageSchema` trong `shared.schema.js`)
2. `repositories/tour.repository.js` — `class TourRepository extends BaseRepository`
3. `services/tour.service.js` — nghiệp vụ, ném `ApiError` khi lỗi
4. `validators/tour.validator.js` — Zod schema
5. `controllers/tour.controller.js` — chỉ đọc `req.validated`
6. `routes/tour.routes.js` — gắn `requireStaff` / `requireAdmin`, `validate(...)`
7. Thêm 1 dòng `router.use("/tours", tourRoutes)` trong `routes/index.js`

## Tài khoản admin đầu tiên

`ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` trong `.env` chỉ dùng để **tạo tài khoản admin đầu tiên**
khi database chưa có tài khoản đó (`services/admin-bootstrap.service.js` → `ensureFirstAdmin`). Sau đó:

- Admin đổi mật khẩu ngay trong CMS (mục "Đổi mật khẩu"); khởi động lại server KHÔNG ghi đè mật khẩu đã đổi.
- Tài khoản quản trị / biên tập khác: tạo, khoá, đặt lại mật khẩu trong CMS (mục "Tài khoản quản trị").
- Quên mật khẩu admin: `npm run admin:reset` → đặt lại mật khẩu theo `.env`, mở khoá và đăng xuất mọi phiên cũ.

## API (`/api/v1`)

| Nhóm              | Đường dẫn                                                                                                                                                                                  | Quyền                          | Mô tả                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Hệ thống          | `GET /health`                                                                                                                                                                              | công khai                      | Trạng thái server + DB                                                                                                   |
| Website           | `GET /public/{tours,tours/:slug,destinations,themes,articles,articles/:slug,taxonomy,services,pages,home,slugs,site}`                                                                      | công khai                      | Nội dung đang hiển thị (website cache theo thẻ)                                                                          |
| Form              | `POST /enquiries`                                                                                                                                                                          | công khai (captcha + giới hạn) | Đặt tour / thiết kế tour / xe / visa / liên hệ / đối tác → lưu DB rồi gửi email                                          |
| Đăng nhập         | `POST /auth/login`, `/auth/refresh`, `GET /auth/resume`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/password`                                                                       | —                              | Cookie HttpOnly, xoay vòng refresh token                                                                                 |
| Nội dung CMS      | `/admin/{tours,destinations,themes,articles,categories,authors,cars,car-areas,visa-types,fast-track}` — `GET / POST / GET :id / PUT :id / PATCH :id/visibility / PATCH order / DELETE :id` | admin, editor                  | CRUD + ẩn hiện + thứ tự                                                                                                  |
| Đơn / yêu cầu     | `GET /enquiries`, `/enquiries/stats`, `/enquiries/code/:code`, `GET/PATCH/DELETE /enquiries/:id`, `POST /enquiries/:id/notes`, `POST /enquiries/:id/resend-email`                          | admin, editor (xoá: admin)     | Trạng thái, thanh toán, ghi chú nội bộ, gửi lại email                                                                    |
| Trang chủ & trang | `GET/PUT /settings/home`, `GET /settings/pages`, `GET/PUT /settings/pages/:key`                                                                                                            | admin, editor                  | Banner, tour nổi bật, giới thiệu + 4 chính sách                                                                          |
| Cài đặt           | `GET/PUT /settings/notifications`, `POST /settings/notifications/test`, `GET/PUT /settings/payment`, `GET/PUT /settings/tracking`                                                          | admin                          | Email nhận thông báo, 9Pay (key mã hoá)                                                                                  |
| Ảnh               | `POST /uploads/images?folder=` (từ thiết bị), `POST /uploads/images/from-url` (từ link), `DELETE /uploads/images`                                                                          | admin, editor                  | Cloudinary · kiểm tra chữ ký file · chặn link nội bộ · không xoá được ảnh hệ thống                                       |
| Video             | —                                                                                                                                                                                          | —                              | Không tải file video: chỉ dán link YouTube (công khai / không công khai) hoặc Google Drive đã chia sẻ (`utils/video.js`) |
| Tài khoản         | `/users` …, `GET /audit-logs`                                                                                                                                                              | admin                          | Quản lý tài khoản, nhật ký thao tác                                                                                      |

Phản hồi: `{ success: true, data, meta? }` · lỗi: `{ success: false, error: { code, message, details? } }`.
Mọi request thay đổi dữ liệu (POST/PATCH/DELETE) phải có header `X-Requested-With: fetch`.

## Bảo mật đã cấu hình sẵn

- **Ảnh**: tải từ thiết bị hoặc từ link (Cloudinary tự tải — máy chủ không gọi tới link lạ); kiểm tra chữ ký file thật (chặn file đổi đuôi), chặn link localhost / IP nội bộ, chặn SVG; ảnh trong nội dung chỉ giữ ảnh Cloudinary của website; chỉ xoá được ảnh trong `CLOUDINARY_FOLDER` (trừ ảnh hệ thống `site/`).
- **Video**: chỉ link YouTube / Google Drive, lưu dạng chuẩn; website dựng link nhúng từ mã video (không nhúng nguyên văn link người dùng nhập).

- **Biến môi trường**: kiểm tra bằng Zod lúc khởi động; production bắt buộc JWT secret ≥ 32 ký tự, 2 secret khác nhau.
- **Mật khẩu**: băm scrypt (salt riêng, so sánh timing-safe); mật khẩu đặt tuỳ ý (không ràng buộc độ mạnh, tối đa 128 ký tự).
- **Đăng nhập**: JWT trong cookie `HttpOnly` + `SameSite=Strict` + `Secure` (`__Host-` prefix ở production); access 15 phút,
  refresh 7 ngày xoay vòng, phát hiện refresh token bị dùng lại → thu hồi mọi phiên; giới hạn số thiết bị.
- **Chống dò mật khẩu**: rate limit theo IP + toàn hệ thống; sai `LOGIN_MAX_ATTEMPTS` lần → khoá tài khoản tạm thời;
  email không tồn tại trả cùng thông báo và cùng thời gian phản hồi.
- **Thu hồi tức thì**: đổi mật khẩu / khoá / đổi vai trò → `tokenVersion` tăng → token cũ hết hiệu lực ngay.
- **Phân quyền**: `admin` / `editor`; không thể tự khoá, tự hạ quyền, hay xoá admin cuối cùng.
- **NoSQL injection**: Zod bỏ trường lạ + `sanitizeFilter` của Mongoose + query parser `simple` + escape regex tìm kiếm.
- **CSRF**: SameSite=Strict + bắt buộc header `X-Requested-With` + kiểm tra `Origin`.
- **Header**: Helmet (CSP `default-src 'none'`, HSTS ở production), ẩn `X-Powered-By`, `Cache-Control: no-store` cho route quản trị.
- **Giới hạn**: body JSON 1MB, ảnh 8MB × 10, chỉ JPG/PNG/WebP/AVIF/GIF (chặn SVG), timeout chống slowloris.
- **Ảnh**: tải từ thiết bị hoặc từ link (Cloudinary tự tải — máy chủ không gọi tới link lạ); kiểm tra chữ ký file thật (chặn file đổi đuôi), chặn link localhost / IP nội bộ, chặn SVG; ảnh trong nội dung chỉ giữ ảnh Cloudinary của website; chỉ xoá được ảnh trong `CLOUDINARY_FOLDER` (trừ ảnh hệ thống `site/`).
- **Video**: chỉ link YouTube / Google Drive, lưu dạng chuẩn; website dựng link nhúng từ mã video (không nhúng nguyên văn link người dùng nhập).
- **Captcha**: middleware `requireCaptcha` (Cloudflare Turnstile) sẵn cho form công khai.
- **Log**: Pino, che `password` / `token` / `cookie`…, không ghi body / query; mỗi request có `X-Request-Id`.
- **Nhật ký thao tác** lưu MongoDB 365 ngày (đăng nhập, sai mật khẩu, khoá, tạo / sửa / xoá…).
- **Proxy guard** (tuỳ chọn, `PROXY_SECRET`): chỉ nhận request đi qua website, IP khách không giả được.

## Deploy lên Cloud VPS

```bash
npm ci --omit=dev
# đặt NODE_ENV=production và các key trong be/.env (chmod 600 .env)
pm2 start ecosystem.config.cjs --env production && pm2 save && pm2 startup
```

Nginx reverse proxy → `127.0.0.1:4000`, bật HTTPS (Let's Encrypt), tường lửa chỉ mở 22/80/443.
MongoDB: dùng Atlas hoặc bind `127.0.0.1` + bật authentication, user riêng chỉ có quyền trên DB `vietlook`.
