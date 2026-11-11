# Vietlook Travel — API

Express 5 · MongoDB (Mongoose 9) · Cloudinary · Zod · JWT (cookie HttpOnly) · Pino. Node ≥ 22.9, ES modules.

## Bắt đầu

```bash
cp .env.example .env     # điền MONGODB_URI, CLOUDINARY_* (xem chú thích trong file)
npm install
npm run secret           # sinh JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / PROXY_SECRET → dán vào .env
npm run dev              # http://localhost:4000/api/v1/health — lần đầu tự tạo admin từ ADMIN_USERNAME / ADMIN_PASSWORD
```

| Script                   | Mô tả                                                                                                                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`            | Chạy dev, tự khởi động lại khi sửa code                                                                                                                                                                                                                     |
| `npm start`              | Chạy production                                                                                                                                                                                                                                             |
| `npm test`               | Test (node:test + supertest) — KHÔNG cần DB thật, không gửi email thật (tests/setup.js xoá key dịch vụ)                                                                                                                                                     |
| `npm run lint`           | ESLint                                                                                                                                                                                                                                                      |
| `npm run format`         | Prettier                                                                                                                                                                                                                                                    |
| `npm run secret`         | Sinh JWT secret, DATA_ENCRYPTION_KEY, PROXY_SECRET ngẫu nhiên                                                                                                                                                                                               |
| `npm run admin:reset`    | Quên mật khẩu admin: đặt lại tài khoản `ADMIN_USERNAME` theo `ADMIN_PASSWORD` trong `.env`, mở khoá, đăng xuất mọi thiết bị                                                                                                                                 |
| `npm run i18n:fill`      | `-- --to zh` hoặc `-- --to vi`: dịch tự động các ô còn trống từ tiếng Anh (`--from vi` để dịch từ tiếng Việt; `--dry` chỉ đếm, `--backup <thư mục>` sao lưu trước, `--only tours,articles`) — không đụng ô đã có chữ, tự chờ & thử lại khi dịch vụ dịch bận |
| `npm run media:cleanup`  | Liệt kê ảnh CMS trên Cloudinary không còn dùng (cũ hơn 24 giờ); `-- --apply` để xoá thật. Bật tự chạy mỗi ngày: `MEDIA_CLEANUP_DAILY=true`                                                                                                                  |
| `npm run db:backup`      | Sao lưu toàn bộ database ra `BACKUP_DIR/vietlook-<ngày giờ>.json.gz`, giữ `BACKUP_KEEP` (7) ngày gần nhất — xem "Sao lưu database"                                                                                                                          |
| `npm run db:restore`     | `-- <file.json.gz>` xem trước; thêm `--yes` để khôi phục (tự sao lưu dữ liệu hiện tại trước), `--only tours,articles` chỉ vài bảng                                                                                                                          |
| `npm run seed`           | Nạp dữ liệu ban đầu từ `seed-data/` — chỉ thêm bản ghi còn thiếu. ⚠ `-- --force` GHI ĐÈ nội dung đã sửa trong CMS                                                                                                                                           |
| `npm run images:upload`  | Đưa ảnh có sẵn trong `fe/public/images` lên Cloudinary (chỉ ảnh chưa có, chạy lại an toàn)                                                                                                                                                                  |
| `npm run emails:preview` | Xem trước mọi email (6 loại form × nhân viên / khách en-zh-vi) ra file HTML trong thư mục tạm (`-- <thư mục>` để chọn nơi lưu) — không gửi email, không cần DB                                                                                              |

## Cấu trúc

```
src/
├── server.js            Khởi động: kết nối DB/Cloudinary → listen → tắt êm
├── app.js               Express app + thứ tự middleware (không listen → test được)
├── config/              env (kiểm tra bằng Zod), database, cloudinary, logger
├── constants/           Hằng số dùng chung (roles, permissions...)
├── emails/              Mẫu email (HTML + chữ thuần)
├── scripts/             Lệnh chạy tay: seed, admin:reset, db:backup/restore, i18n:fill, media:cleanup
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

### Thêm loại nội dung CMS mới (cách tour, điểm đến, xe… đang làm)

1. `models/<loai>.model.js` — schema (dùng `localizedString`, `seoSchema`, `publishable` trong `shared.schema.js`)
2. `repositories/content.repository.js` — thêm `new ContentRepository(Model)` (hoặc lớp con nếu cần truy vấn riêng)
3. `services/modules.service.js` — `createContentService({ repo, label, prepare, afterUpdate, beforeRemove… })`
4. `validators/content.validator.js` — Zod schema của form
5. `routes/content.routes.js` — 1 dòng `router.use("/<loai>", crud(service, schema, "<loai>", "<mục quyền>"))`
   (controller CRUD dùng chung: `controllers/content.controller.js`); thêm mục quyền trong `constants/permissions.js`
6. Website đọc: thêm vào `services/public.service.js` + `routes/site.routes.js` (`/public/...`)

## Tài khoản admin đầu tiên

`ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` trong `.env` chỉ dùng để **tạo tài khoản admin đầu tiên**
khi database chưa có tài khoản đó (`services/admin-bootstrap.service.js` → `ensureFirstAdmin`). Sau đó:

- Admin đổi mật khẩu ngay trong CMS (mục "Đổi mật khẩu"); khởi động lại server KHÔNG ghi đè mật khẩu đã đổi.
- Tài khoản quản trị / biên tập khác: tạo, khoá, đặt lại mật khẩu trong CMS (mục "Tài khoản quản trị").
- Quên mật khẩu admin: `npm run admin:reset` → đặt lại mật khẩu theo `.env`, mở khoá và đăng xuất mọi phiên cũ.
- ⚠ Bản demo: `DEMO_LOGIN=true` hiện nút "Đăng nhập nhanh" ở `/login` (vào thẳng tài khoản `ADMIN_USERNAME`, mật khẩu không bao giờ gửi ra trình duyệt). Khi bật, **bất kỳ ai** mở trang đăng nhập đều vào được CMS với quyền admin; server ghi cảnh báo mỗi lần khởi động. **Bàn giao chính thức phải đặt `DEMO_LOGIN=false`** (mặc định).

## API (`/api/v1`)

| Nhóm              | Đường dẫn                                                                                                                                                                                   | Quyền                                      | Mô tả                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hệ thống          | `GET /health`                                                                                                                                                                               | công khai                                  | Trạng thái server + DB                                                                                                                                      |
| Website           | `GET /public/{tours,tours/:slug,destinations,themes,articles,articles/:slug,taxonomy,services,pages,home,slugs,site}`                                                                       | công khai                                  | Nội dung đang hiển thị (website cache theo thẻ)                                                                                                             |
| Form              | `POST /enquiries`                                                                                                                                                                           | công khai (captcha + giới hạn)             | Đặt tour / thiết kế tour / xe / visa / liên hệ / đối tác → lưu DB rồi gửi email                                                                             |
| Thanh toán 9Pay   | `GET /public/payment-config`, `POST /payments/:code/start`, `GET /payments/return`, `POST /payments/ipn`                                                                                    | công khai (giới hạn; start cần `payToken`) | Bật trong CMS → bước thanh toán sau khi đặt tour; xem mục "Thanh toán 9Pay"                                                                                 |
| Đăng nhập         | `POST /auth/login`, `/auth/refresh`, `GET /auth/resume`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/password`, `GET /auth/demo`, `POST /auth/demo-login` (chỉ khi `DEMO_LOGIN=true`) | —                                          | Cookie HttpOnly, xoay vòng refresh token                                                                                                                    |
| Nội dung CMS      | `/admin/{tours,destinations,themes,articles,categories,authors,cars,car-areas,visa-types,fast-track}` — `GET / POST / GET :id / PUT :id / PATCH :id/visibility / PATCH order / DELETE :id`  | admin, editor                              | CRUD + ẩn hiện + thứ tự                                                                                                                                     |
| Đơn / yêu cầu     | `GET /enquiries`, `/enquiries/stats`, `/enquiries/code/:code`, `GET/PATCH/DELETE /enquiries/:id`, `POST/DELETE /enquiries/:id/notes`, `POST /enquiries/:id/resend-email`                    | theo quyền bookings / requests (xoá: full) | Trạng thái, thanh toán, ghi chú nội bộ, gửi lại email                                                                                                       |
| Trang chủ & trang | `GET/PUT /settings/home`, `GET /settings/pages`, `GET/PUT /settings/pages/:key`                                                                                                             | admin, editor                              | Banner, tour nổi bật, giới thiệu + 4 chính sách                                                                                                             |
| Cài đặt           | `GET/PUT /settings/notifications`, `GET/PUT /settings/payment`, `GET/PUT /settings/tracking`                                                                                                | admin                                      | Email nhận thông báo, 9Pay (chỉ môi trường thật, key mã hoá, không bao giờ trả nguyên văn), mã Google                                                       |
| Ảnh               | `POST /uploads/images?folder=` (từ thiết bị), `POST /uploads/images/from-url` (từ link), `POST /uploads/images/link-preview`, `DELETE /uploads/images`                                      | admin, editor                              | Cloudinary · kiểm tra chữ ký file · chặn link nội bộ · không xoá được ảnh hệ thống                                                                          |
| Video             | `POST /uploads/videos/from-drive`, `GET /uploads/videos/from-drive/:jobId`                                                                                                                  | admin, editor                              | Không tải file video lên máy chủ: dán link YouTube / Google Drive đã chia sẻ (`utils/video.js`); riêng video nền trang chủ từ Drive được Cloudinary chép về |
| Dịch tự động      | `POST /translate`                                                                                                                                                                           | admin, editor                              | Dịch en / zh / vi (giữ nguyên thẻ HTML), giới hạn 30 lần / phút                                                                                             |
| Tài khoản         | `/users` …                                                                                                                                                                                  | admin                                      | Quản lý tài khoản, phân quyền từng mục                                                                                                                      |
| Nhật ký thao tác  | `GET /audit-logs`                                                                                                                                                                           | admin, editor có quyền xem `audit`         | Ai sửa / xoá gì, khi nào                                                                                                                                    |

"admin, editor" = admin luôn được; nhân viên (editor) cần quyền ở mục tương ứng (xem: `view`, thêm/sửa: `edit`, xoá: `full`).
Phản hồi: `{ success: true, data, meta? }` · lỗi: `{ success: false, error: { code, message, details? } }`.
Mọi request thay đổi dữ liệu (POST/PATCH/DELETE) phải có header `X-Requested-With: fetch`.

## Bảo mật đã cấu hình sẵn

- **Biến môi trường**: kiểm tra bằng Zod lúc khởi động; production bắt buộc JWT secret ≥ 32 ký tự, 2 secret khác nhau.
- **Mật khẩu**: băm scrypt (salt riêng, so sánh timing-safe); mật khẩu đặt tuỳ ý (không ràng buộc độ mạnh, tối đa 128 ký tự).
- **Đăng nhập**: JWT trong cookie `HttpOnly` + `SameSite=Strict` + `Secure` (`__Host-` prefix ở production); access 15 phút,
  refresh 7 ngày xoay vòng, phát hiện refresh token bị dùng lại → thu hồi mọi phiên; giới hạn số thiết bị.
- **Chống dò mật khẩu**: rate limit theo IP + toàn hệ thống; sai `LOGIN_MAX_ATTEMPTS` lần → khoá tài khoản tạm thời;
  tên đăng nhập không tồn tại trả cùng thông báo và cùng thời gian phản hồi.
- **Thu hồi tức thì**: đổi mật khẩu / khoá / đổi vai trò → `tokenVersion` tăng → token cũ hết hiệu lực ngay.
- **Phân quyền**: `admin` = toàn quyền; `editor` (Nhân viên) = quyền từng mục `none` / `view` / `edit` / `full` (`constants/permissions.js`, đồng bộ với `fe/src/components/admin/permissions.js`); Cài đặt + Tài khoản luôn chỉ admin. Không thể tự khoá, tự hạ quyền, hay xoá admin cuối cùng.
- **NoSQL injection**: Zod bỏ trường lạ + `sanitizeFilter` của Mongoose + query parser `simple` + escape regex tìm kiếm.
- **CSRF**: SameSite=Strict + bắt buộc header `X-Requested-With` + kiểm tra `Origin`.
- **Header**: Helmet (CSP `default-src 'none'`, HSTS ở production), ẩn `X-Powered-By`, `Cache-Control: no-store` cho route quản trị.
- **Giới hạn**: body JSON 1MB, ảnh 8MB × 10, chỉ JPG/PNG/WebP/AVIF/GIF (chặn SVG), timeout chống slowloris.
- **Ảnh**: tải từ thiết bị hoặc từ link (`from-url`: Cloudinary tự tải; `link-preview`: máy chủ tải về để xem trước / cắt — chỉ cổng 80/443, kiểm tra IP thật lúc kết nối, tối đa 25MB / 20 giây / 3 lần chuyển hướng); kiểm tra chữ ký file thật (chặn file đổi đuôi), chặn link localhost / IP nội bộ, chặn SVG; ảnh trong nội dung chỉ giữ ảnh Cloudinary của website; chỉ xoá được ảnh trong `CLOUDINARY_FOLDER` (trừ ảnh hệ thống `site/`).
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
- **Máy dev:** đặt `MAIL_REDIRECT_TO=<email của bạn>` → mọi email (nhân viên lẫn khách) chỉ gửi tới địa chỉ đó, tiêu đề có `[DEV → người nhận thật]` + dải báo nhỏ đầu email. **Production để trống.**
- **Để email vào hộp thư chính (không vào "Quảng cáo" / Spam):**
  - `MAIL_FROM` ở production PHẢI là địa chỉ trên **tên miền của công ty đã xác minh trong Resend** (vd. `Vietlook Travel <booking@vietlooktravel.com>`), với **SPF, DKIM** (bản ghi DNS Resend cung cấp) và **DMARC** (vd. `v=DMARC1; p=none; rua=mailto:…` rồi siết dần) đã cấu hình. Gửi từ tên miền dùng chung / chưa xác minh là lý do lớn nhất khiến Gmail xếp vào Quảng cáo hoặc Spam.
  - Email đã được thiết kế dạng thư giao dịch: tiêu đề ngắn không chữ quảng cáo, 1 ảnh (logo), ít link, có bản chữ thuần, `Reply-To` (khách → email công ty; nhân viên → email khách), `X-Entity-Ref-ID` = mã yêu cầu, thư cho nhân viên có `Auto-Submitted: auto-generated`; KHÔNG có `List-Unsubscribe` / `Precedence` (dấu hiệu thư hàng loạt).
  - Gmail còn học theo người nhận: kéo thư sang tab **Chính** (Primary) / đánh dấu "Không phải spam" một lần thì các thư sau thường vào đúng chỗ.

## Thanh toán 9Pay

Code: `src/services/payment/` (`ninepay.adapter.js` = ký link / kiểm tra kết quả theo tài liệu 9Pay, `payment.service.js` = nghiệp vụ, `fx.service.js` = tỷ giá), `src/controllers/payment.controller.js`, `src/routes/payment.routes.js`, email `src/emails/payment.js`. Test: `tests/payment.test.js`.

- **Bật / tắt:** CMS → Cài đặt → Thanh toán 9Pay (chỉ admin). Bật **và** đủ 3 mã (Merchant Key, Secret Key, Checksum Key) → sau khi khách gửi đơn đặt tour, website hiện bước "Thanh toán" (Thanh toán qua 9Pay / Thanh toán sau). Tắt hoặc thiếu mã → đặt tour y như cũ, không có bước thanh toán. Mã đọc lại mỗi lần dùng → đổi tài khoản nhận tiền áp dụng ngay, mã cũ không còn được dùng (kể cả để xác nhận kết quả).
- **Đơn nào thanh toán được:** chỉ đơn **đặt tour** có giá tạm tính > 0 (giá do máy chủ tính từ bảng giá CMS, không lấy số trình duyệt gửi), chưa huỷ, chưa trả đủ. Form khác (xe, visa, thiết kế tour…) cần báo giá trước → chưa thanh toán online.
- **Số tiền:** giá tour (USD) × **Tỷ lệ đặt cọc (%)** trong CMS (100 = trả đủ) → đổi sang VND theo tỷ giá tự động, làm tròn lên 1.000đ (9Pay: 10.000đ – 200.000.000đ). Đã cọc → lần sau trả phần còn lại. Đơn: `paymentStatus` = `unpaid` / `deposit` (đã đặt cọc) / `paid`; mỗi lần bấm thanh toán = 1 dòng trong `payments[]` (mã hoá đơn `<mã đơn>-<lượt>`, số tiền, tỷ giá + nguồn, trạng thái, mã giao dịch 9Pay).
- **Tỷ giá USD → VND (tự động):** giá **bán** USD của Vietcombank (`portal.vietcombank.com.vn/…/pXML.aspx`), lỗi thì dùng `open.er-api.com` (dữ liệu của ExchangeRate-API, chỉ dùng ở máy chủ). Lưu DB (Setting `fx`) + bộ nhớ, làm mới nền tối đa 6 giờ / lần, không bao giờ bắt khách chờ; lỗi / số bất thường (ngoài 15.000–40.000) → giữ tỷ giá gần nhất. Chưa từng lấy được → `PAYMENT_USD_VND_RATE`.
- **Kết quả:** 9Pay đưa khách về `GET /payments/return` và gọi `POST /payments/ipn` (máy chủ ↔ máy chủ). Cả hai: kiểm `checksum` = SHA256(result + Checksum Key), khớp mã hoá đơn + số tiền, ghi nhận đúng 1 lần (nhận lại không gửi email / ghi nhật ký trùng) → email cho nhân viên ("Khách đã thanh toán …") + biên nhận cho khách, nhật ký "Khách thanh toán online qua 9Pay". Khách về trang cảm ơn `?payment=success|failed|cancelled|pending`; thất bại / huỷ có nút "Thử thanh toán lại" (dùng `payToken` còn trong tab, hết hạn sau 6 giờ).
- **Chống người lạ tạo link thanh toán cho đơn của người khác:** `POST /enquiries` trả `payment.token` (HMAC, gắn mã đơn, hết hạn 6 giờ) chỉ cho trình duyệt vừa gửi đơn; `/payments/:code/start` bắt buộc token này (10 lần / 10 phút / IP).
- **Đăng ký trong trang quản lý 9Pay** (website chuyển tiếp `/api/v1` sang API nên dùng tên miền website):
  - Return URL: `${PUBLIC_SITE_URL}/api/v1/payments/return` (link được gửi kèm mỗi giao dịch theo tên miền khách đang mở)
  - IPN URL: `${PUBLIC_SITE_URL}/api/v1/payments/ipn` (vd. `https://vietlooktravel.com/api/v1/payments/ipn`)
- **Thử với môi trường sandbox của 9Pay:** đặt `NINEPAY_ENDPOINT=https://sand-payment.9pay.vn`, nhập 3 mã sandbox trong CMS, thẻ test của 9Pay: `4456 5300 0000 1005`, NGUYEN VAN A, hạn bất kỳ trong tương lai, CVV bất kỳ, OTP `1234`. Chạy thật: xoá biến (mặc định `https://payment.9pay.vn`) và nhập mã thật.
- **Máy dev không có mã 9Pay:** `NINEPAY_FAKE=true` (hoặc tạo file rỗng `be/.ninepay-fake` — không cần khởi động lại; ghi số vd. `30` vào file để thử đặt cọc 30%) → coi như đã bật với mã giả, cổng thanh toán là trang giả lập `/api/v1/payments/fake/portal` (chọn Thành công / Thất bại / Huỷ). Không bao giờ chạy ở production.
- **Cần đối chiếu khi có tài khoản sandbox** (đánh dấu `TODO(9Pay)` trong `ninepay.adapter.js`): mã hoá đơn có dấu `-`, nội dung phản hồi IPN mà 9Pay mong đợi (đang trả HTTP 200 JSON), tham số `back_url`.

## Website đọc dữ liệu (`/public/*`)

Website (Next.js, chạy ở server) gọi các endpoint này và cache theo thẻ; CMS lưu xong báo website xoá đúng thẻ → cập nhật ngay.
Vì vậy API **không** đặt `Cache-Control` dài cho `/public/*` (CDN cache lại sẽ làm website chậm cập nhật) — chỉ có ETag + gzip.
`GET /public/*` không bị giới hạn tần suất chung (mọi khách đi qua cùng 1 IP máy chủ website).

## Sao lưu database

- `npm run db:backup` đọc mọi bảng → 1 file JSON nén (Extended JSON, giữ đúng ObjectId / ngày giờ) trong `BACKUP_DIR`
  (mặc định `be/backups`, đã có trong `.gitignore`). Mỗi ngày giữ bản mới nhất, chỉ giữ `BACKUP_KEEP` (7) ngày gần nhất;
  file khác mẫu tên (vd. `pre-restore-…`) không bao giờ bị xoá tự động.
- Đặt lịch chạy mỗi ngày:
  - Linux (cron, 2h sáng): `0 2 * * * cd /srv/vietlook/be && /usr/bin/npm run db:backup >> logs/backup.log 2>&1`
  - Windows (Task Scheduler): Action = `cmd /c "cd /d D:\vietlook\be && npm run db:backup >> logs\backup.log 2>&1"`, Trigger = Daily.
- Nên chép thêm thư mục sao lưu ra nơi khác (ổ khác / cloud). MongoDB Atlas (bản trả phí) có sao lưu tự động riêng — dùng song song.
- ⚠ File sao lưu chứa mật khẩu đã mã hoá, phiên đăng nhập, key 9Pay (mã hoá bằng `DATA_ENCRYPTION_KEY`) → bảo quản như bí mật.
- Khôi phục: `npm run db:restore -- backups/vietlook-2026-11-11T02-00-00.json.gz` (xem trước) → thêm `--yes` để ghi.
  Từng bảng trong file được XOÁ rồi nạp lại; dữ liệu hiện tại được tự sao lưu ra `pre-restore-….json.gz` trước. Xong thì
  khởi động lại API và website (xoá bộ nhớ đệm).
- Ảnh / video nằm trên Cloudinary (không thuộc database) — Cloudinary tự lưu trữ; sao lưu toàn web hằng tuần là việc của máy chủ.

## Captcha (Cloudflare Turnstile)

Backend: `TURNSTILE_SECRET_KEY` (be/.env). Frontend: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (fe/.env, cần build lại website).
Có cả hai → mọi form công khai (đặt tour, thiết kế tour, xe, visa, liên hệ, đối tác) gắn widget Turnstile (thường vô hình,
chỉ hiện khi nghi ngờ) và backend kiểm tra token ở `POST /enquiries`. Để trống cả hai → bỏ qua captcha (máy dev).
Đặt secret ở backend mà thiếu site key ở frontend → form bị từ chối. Key thử của Cloudflare (luôn qua):
site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

## Deploy lên Cloud VPS

```bash
npm ci --omit=dev
# đặt NODE_ENV=production và các key trong be/.env (chmod 600 .env)
pm2 start ecosystem.config.cjs --env production && pm2 save && pm2 startup
```

Nginx reverse proxy → `127.0.0.1:4000`, bật HTTPS (Let's Encrypt), tường lửa chỉ mở 22/80/443.
Biến môi trường production + checklist bàn giao: `docs/DEPLOY.md`.
MongoDB: dùng Atlas hoặc bind `127.0.0.1` + bật authentication, user riêng chỉ có quyền trên DB `vietlook`.
