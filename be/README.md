# Vietlook Travel — API

Express 5 · MongoDB (Mongoose 9) · Cloudinary · Zod · JWT (cookie HttpOnly) · Pino. Node ≥ 22.9, ES modules.

## Bắt đầu

```bash
cp .env.example .env     # điền MONGODB_URI, CLOUDINARY_* (xem chú thích trong file)
npm install
npm run secret           # sinh JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / PROXY_SECRET → dán vào .env
npm run dev              # http://localhost:4000/api/v1/health — lần đầu tự tạo admin từ ADMIN_USERNAME / ADMIN_PASSWORD
```

| Script                   | Mô tả                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`            | Chạy dev, tự khởi động lại khi sửa code                                                                                                                               |
| `npm start`              | Chạy production                                                                                                                                                       |
| `npm test`               | Test (node:test + supertest) — KHÔNG cần DB thật, không gửi email thật (tests/setup.js xoá key dịch vụ)                                                               |
| `npm run lint`           | ESLint                                                                                                                                                                |
| `npm run format`         | Prettier                                                                                                                                                              |
| `npm run secret`         | Sinh JWT secret, DATA_ENCRYPTION_KEY, PROXY_SECRET ngẫu nhiên                                                                                                         |
| `npm run admin:reset`    | Quên mật khẩu admin: đặt lại tài khoản `ADMIN_USERNAME` theo `ADMIN_PASSWORD` trong `.env`, mở khoá, đăng xuất mọi thiết bị                                           |
| `npm run i18n:fill-vi`   | Dịch tự động các ô TIẾNG VIỆT còn trống từ tiếng Anh (`-- --dry` chỉ đếm, `-- --backup <thư mục>` sao lưu trước, `-- --only tours,articles`) — không đụng ô đã có chữ |
| `npm run seed`           | Nạp dữ liệu ban đầu từ `seed-data/` — chỉ thêm bản ghi còn thiếu. ⚠ `-- --force` GHI ĐÈ nội dung đã sửa trong CMS                                                     |
| `npm run images:upload`  | Đưa ảnh có sẵn trong `fe/public/images` lên Cloudinary (chỉ ảnh chưa có, chạy lại an toàn)                                                                            |
| `npm run emails:preview` | Xem trước mọi email (6 loại form × nhân viên / khách en-zh-vi) ra file HTML trong thư mục tạm (`-- <thư mục>` để chọn nơi lưu) — không gửi email, không cần DB        |

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
- ⚠ Bản demo: `DEMO_LOGIN=true` hiện nút "Đăng nhập nhanh" ở `/login` (vào thẳng tài khoản `ADMIN_USERNAME`, mật khẩu không bao giờ gửi ra trình duyệt). Khi bật, **bất kỳ ai** mở trang đăng nhập đều vào được CMS với quyền admin; server ghi cảnh báo mỗi lần khởi động. **Bàn giao chính thức phải đặt `DEMO_LOGIN=false`** (mặc định).

## API (`/api/v1`)

| Nhóm              | Đường dẫn                                                                                                                                                                                   | Quyền                          | Mô tả                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hệ thống          | `GET /health`                                                                                                                                                                               | công khai                      | Trạng thái server + DB                                                                                                                                      |
| Website           | `GET /public/{tours,tours/:slug,destinations,themes,articles,articles/:slug,taxonomy,services,pages,home,slugs,site}`                                                                       | công khai                      | Nội dung đang hiển thị (website cache theo thẻ)                                                                                                             |
| Form              | `POST /enquiries`                                                                                                                                                                           | công khai (captcha + giới hạn) | Đặt tour / thiết kế tour / xe / visa / liên hệ / đối tác → lưu DB rồi gửi email                                                                             |
| Đăng nhập         | `POST /auth/login`, `/auth/refresh`, `GET /auth/resume`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/password`, `GET /auth/demo`, `POST /auth/demo-login` (chỉ khi `DEMO_LOGIN=true`) | —                              | Cookie HttpOnly, xoay vòng refresh token                                                                                                                    |
| Nội dung CMS      | `/admin/{tours,destinations,themes,articles,categories,authors,cars,car-areas,visa-types,fast-track}` — `GET / POST / GET :id / PUT :id / PATCH :id/visibility / PATCH order / DELETE :id`  | admin, editor                  | CRUD + ẩn hiện + thứ tự                                                                                                                                     |
| Đơn / yêu cầu     | `GET /enquiries`, `/enquiries/stats`, `/enquiries/code/:code`, `GET/PATCH/DELETE /enquiries/:id`, `POST /enquiries/:id/notes`, `POST /enquiries/:id/resend-email`                           | admin, editor (xoá: admin)     | Trạng thái, thanh toán, ghi chú nội bộ, gửi lại email                                                                                                       |
| Trang chủ & trang | `GET/PUT /settings/home`, `GET /settings/pages`, `GET/PUT /settings/pages/:key`                                                                                                             | admin, editor                  | Banner, tour nổi bật, giới thiệu + 4 chính sách                                                                                                             |
| Cài đặt           | `GET/PUT /settings/notifications`, `GET/PUT /settings/payment`, `GET/PUT /settings/tracking`                                                                                                | admin                          | Email nhận thông báo, 9Pay (chỉ môi trường thật, key mã hoá, không bao giờ trả nguyên văn), mã Google                                                       |
| Ảnh               | `POST /uploads/images?folder=` (từ thiết bị), `POST /uploads/images/from-url` (từ link), `DELETE /uploads/images`                                                                           | admin, editor                  | Cloudinary · kiểm tra chữ ký file · chặn link nội bộ · không xoá được ảnh hệ thống                                                                          |
| Video             | `POST /uploads/videos/from-drive`, `GET /uploads/videos/from-drive/:jobId`                                                                                                                  | admin, editor                  | Không tải file video lên máy chủ: dán link YouTube / Google Drive đã chia sẻ (`utils/video.js`); riêng video nền trang chủ từ Drive được Cloudinary chép về |
| Dịch tự động      | `POST /translate`                                                                                                                                                                           | admin, editor                  | Dịch en / zh / vi (giữ nguyên thẻ HTML), giới hạn 30 lần / phút                                                                                             |
| Tài khoản         | `/users` …, `GET /audit-logs`                                                                                                                                                               | admin                          | Quản lý tài khoản, nhật ký thao tác                                                                                                                         |

Phản hồi: `{ success: true, data, meta? }` · lỗi: `{ success: false, error: { code, message, details? } }`.
Mọi request thay đổi dữ liệu (POST/PATCH/DELETE) phải có header `X-Requested-With: fetch`.

## Bảo mật đã cấu hình sẵn

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
- **Captcha**: Cloudflare Turnstile cho mọi form công khai (`TURNSTILE_SECRET_KEY`; trống → bỏ qua, form vẫn chạy). Form công khai còn có honeypot + giới hạn 10 lần / 10 phút / IP.
- **Lỗi cho khách**: lỗi form công khai (sai dữ liệu, captcha, quá số lần, tour ngừng bán) trả câu dễ hiểu theo ngôn ngữ trang (`body.lang`: en / zh / vi — `utils/form-messages.js`); website hiện thẳng `error.details[0].message`.
- **Log**: Pino, che `password` / `token` / `cookie`…, không ghi body / query; mỗi request có `X-Request-Id`.
- **Nhật ký thao tác** lưu MongoDB 365 ngày (đăng nhập, sai mật khẩu, khoá, tạo / sửa / xoá…).
- **Proxy guard** (tuỳ chọn, `PROXY_SECRET`): chỉ nhận request đi qua website, IP khách không giả được.

## Form & đơn đặt tour

`POST /enquiries` nhận mọi form của website, phân biệt bằng `type`:

| type      | Form                                                       | Mã yêu cầu        |
| --------- | ---------------------------------------------------------- | ----------------- |
| `booking` | Đặt tour (ngày đi, người lớn, tuổi trẻ em, hạng khách sạn) | `VL-BK<yymmdd>-…` |
| `planner` | Thiết kế tour / lên kế hoạch chuyến đi                     | `VL-TP…`          |
| `car`     | Báo giá xe riêng                                           | `VL-CR…`          |
| `visa`    | Visa & fast-track                                          | `VL-VS…`          |
| `contact` | Liên hệ                                                    | `VL-CT…`          |
| `partner` | Đối tác B2B                                                | `VL-PN…`          |

- Trường chung có cột riêng (tên, email/SĐT, quốc tịch, lời nhắn); trường riêng của từng form lưu trong `details` (chỉ chữ / số / danh sách ngắn, tên trường lạ bị bỏ).
- Đặt tour: **giá tạm tính tính lại ở máy chủ** (`utils/pricing.js`, bản sao ở `fe/src/lib/pricing.js` — sửa thì sửa cả 2): bảng giá theo số khách (người lớn + trẻ em) × hạng khách sạn 3★/4★/5★ → % trẻ em theo tuổi (mặc định < 5 miễn phí, 5–10 tuổi 75%, ≥ 11 như người lớn) → phụ thu lễ Tết (USD / khách phải trả tiền và / hoặc % trên tiền tour, ngày `YYYY-MM-DD` hoặc `MM-DD` hằng năm) → phụ thu phòng đơn (1 người lớn, không trẻ em). Không có giá → `total: null` (báo giá sau).
- Đơn **lưu DB trước**, email gửi nền sau: thiếu `RESEND_API_KEY` / Resend lỗi → đơn vẫn lưu, `emailStatus` đánh dấu `skipped` / `failed`, CMS có nút "Gửi lại email".
- Mẫu email ở `src/emails/` (`templates.js` = email cho nhân viên tiếng Việt + xác nhận cho khách theo ngôn ngữ trang en/zh/vi; `labels.js` = nhãn / giá trị dễ đọc của từng trường form, sửa chữ trên form website thì sửa cả ở đây; `format.js` = định dạng ngày, tiền, mã; `layout.js` = khung HTML có logo). Tên xe / gói fast-track / điểm đến / tên tour tra từ DB lúc gửi. Có bản chữ thuần (text) kèm theo.
- **Máy dev:** đặt `MAIL_REDIRECT_TO=<email của bạn>` → mọi email (nhân viên lẫn khách) chỉ gửi tới địa chỉ đó, tiêu đề có `[DEV → người nhận thật]` + dải vàng đầu email. **Production để trống.**

## Website đọc dữ liệu (`/public/*`)

Website (Next.js, chạy ở server) gọi các endpoint này và cache theo thẻ; CMS lưu xong báo website xoá đúng thẻ → cập nhật ngay.
Vì vậy API **không** đặt `Cache-Control` dài cho `/public/*` (CDN cache lại sẽ làm website chậm cập nhật) — chỉ có ETag + gzip.
`GET /public/*` không bị giới hạn tần suất chung (mọi khách đi qua cùng 1 IP máy chủ website).

## Deploy lên Cloud VPS

```bash
npm ci --omit=dev
# đặt NODE_ENV=production và các key trong be/.env (chmod 600 .env)
pm2 start ecosystem.config.cjs --env production && pm2 save && pm2 startup
```

Nginx reverse proxy → `127.0.0.1:4000`, bật HTTPS (Let's Encrypt), tường lửa chỉ mở 22/80/443.
MongoDB: dùng Atlas hoặc bind `127.0.0.1` + bật authentication, user riêng chỉ có quyền trên DB `vietlook`.
