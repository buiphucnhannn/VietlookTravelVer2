# Deploy & bàn giao

## 0. Kiến trúc

```
Trình duyệt ──▶ Vercel (Next.js, tên miền website)
                   │  /api/v1/*  + header X-Proxy-Secret, X-Client-IP
                   ▼
               Backend Express — Cloud VPS của khách (PM2 + Nginx, phương án bàn giao)
                                 hoặc Render (bản chạy thử)
                   ▼
               MongoDB (Atlas hoặc trên VPS) / Cloudinary / Resend / 9Pay
```

- Trình duyệt **chỉ** nói chuyện với tên miền website → cookie đăng nhập (`__Host-vl_at`, `__Secure-vl_rt`) là
  first-party, không cần cấu hình cookie cross-site.
- `PROXY_SECRET` chặn truy cập thẳng vào backend (trừ `/api/v1/health`).
- Ảnh đi thẳng Cloudinary (không qua backend / Vercel).

---

## 1. Chuẩn bị (1 lần)

### 1.1. Sinh secret

```bash
cd be && npm run secret
```

In ra `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATA_ENCRYPTION_KEY` (đặt ở backend) và `PROXY_SECRET`
(**đặt cả backend lẫn Vercel, giá trị giống hệt nhau**).

### 1.2. MongoDB

- Atlas: tạo cluster + user đọc/ghi DB `vietlook`. Network Access: IP của VPS (Render dùng IP động → `0.0.0.0/0`).
- Hoặc MongoDB trên VPS: bind `127.0.0.1`, bật authentication (xem `be/README.md` → Deploy lên Cloud VPS).

### 1.3. Cloudinary

Console → Settings → API Keys: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. `CLOUDINARY_FOLDER` giữ `vietlook`.

### 1.4. Cloudflare Turnstile (captcha)

Secret key → backend (`TURNSTILE_SECRET_KEY`); site key → Vercel (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
Turnstile → Hostnames phải có tên miền website. Đặt secret mà thiếu site key → mọi form bị từ chối.

### 1.5. Resend (email)

`RESEND_API_KEY`, `MAIL_FROM` (địa chỉ trên tên miền công ty đã xác minh, có SPF/DKIM/DMARC — xem `be/README.md`).
Không đặt thì đơn vẫn lưu CMS, chỉ không gửi email.

---

## 2. Backend

### 2.1. Cloud VPS (bàn giao)

Theo `be/README.md` → "Deploy lên Cloud VPS": `npm ci --omit=dev`, `be/.env` (chmod 600), PM2, Nginx + HTTPS,
tường lửa chỉ mở 22/80/443. `TRUST_PROXY=2` (Vercel → Nginx → API).

### 2.2. Render (bản chạy thử)

New → Web Service → repo: Root Directory `be`, Region Singapore, Build `npm ci --omit=dev`, Start `npm start`,
Health Check Path `/api/v1/health`. Gói Free ngủ sau ~15 phút (nên dùng Starter). Không cần đặt `PORT`.
Không có ổ đĩa lâu dài → `npm run db:backup` phải chạy ở máy khác (hoặc dùng sao lưu của Atlas).

### 2.3. Biến môi trường backend

App **không khởi động** nếu thiếu / sai biến bắt buộc (log ghi rõ tên biến). Đầy đủ + chú thích: `be/.env.example`.

| Biến | Production |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI`, `MONGODB_DB_NAME` | chuỗi kết nối, `vietlook` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATA_ENCRYPTION_KEY` | từ `npm run secret` (bắt buộc, ≥ 32 ký tự) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | tài khoản admin đầu tiên (bắt buộc) |
| `PROXY_SECRET` | **trùng với Vercel** |
| `PUBLIC_SITE_URL` | `https://<tên-miền-website>` (link trong email, link 9Pay quay về) |
| `CORS_ORIGINS` | `https://<tên-miền-website>` (nhiều tên miền cách nhau `,`) |
| `TRUST_PROXY` | `2` |
| `CLOUDINARY_*` | khoá Cloudinary |
| `TURNSTILE_SECRET_KEY` | secret Turnstile |
| `RESEND_API_KEY`, `MAIL_FROM`, `NOTIFY_EMAIL` | Resend; `NOTIFY_EMAIL` = email nhận thông báo dự phòng của **khách** |
| `MAIL_REDIRECT_TO` | **để trống** (có giá trị = mọi email chỉ gửi tới 1 địa chỉ thử) |
| `DEMO_LOGIN` | **`false`** (true = ai cũng vào được CMS bằng nút "Đăng nhập nhanh") |
| `NINEPAY_FAKE` | `false` (production luôn bỏ qua) · `NINEPAY_ENDPOINT` để trống = cổng thật |
| `MEDIA_CLEANUP_DAILY` | `true` nếu muốn tự xoá ảnh CMS không dùng |
| `BACKUP_DIR`, `BACKUP_KEEP` | thư mục sao lưu ngoài thư mục code, `7` |

Kiểm tra: `curl https://<backend>/api/v1/health` → `{"success":true,"data":{"status":"ok","database":"connected",...}}`.
Các route khác trả 403 `DIRECT_ACCESS` khi gọi thẳng là **đúng** (đã bật `PROXY_SECRET`).

### 2.4. Dữ liệu lần đầu

```bash
npm run seed            # chỉ thêm bản ghi còn thiếu, KHÔNG ghi đè nội dung đã sửa trong CMS
npm run images:upload   # ảnh có sẵn trong fe/public/images → Cloudinary (chạy lại an toàn)
```

Tài khoản admin đầu tiên tự tạo khi server khởi động (từ `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

---

## 3. Frontend lên Vercel

Add New → Project → repo: **Root Directory `fe`**, Framework Next.js, Node 22.x, build/install mặc định.

| Biến (Production) | Giá trị |
| --- | --- |
| `BACKEND_URL` | `https://<backend>` (không có `/` cuối) — bắt buộc |
| `PROXY_SECRET` | **giống hệt** backend |
| `NEXT_PUBLIC_SITE_URL` | `https://<tên-miền-website>` (canonical, hreflang, sitemap) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | site key Turnstile |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_FOLDER` | xem `fe/.env.example` |

- `BACKEND_URL` dùng **cả lúc build** (prerender + `generateStaticParams`) → backend phải đang chạy và **đã có dữ liệu**
  trước khi deploy; DB rỗng → build fail `empty-generate-static-params`.
- `NEXT_PUBLIC_*` nhúng vào bundle lúc build → đổi giá trị phải **Redeploy**.

### Đổi sang tên miền chính

Vercel → Settings → Domains → thêm tên miền, rồi cập nhật cùng lúc: `NEXT_PUBLIC_SITE_URL` (Vercel → Redeploy),
`PUBLIC_SITE_URL` + `CORS_ORIGINS` (backend → khởi động lại), Turnstile Hostnames, Return/IPN URL trong trang quản lý 9Pay.

---

## 4. Checklist sau deploy

- [ ] `GET /api/v1/health` → `status: ok`
- [ ] `https://<tên-miền>` mở trang tiếng Anh (không tiền tố); `/zh`, `/vi` hoạt động; `/en/...` chuyển về bản không tiền tố
- [ ] `/tours`, `/tours/<slug>`, `/travel-guide` render được; URL web cũ chuyển hướng 301 đúng (`docs/redirect-map.csv`)
- [ ] Gửi từng form (đặt tour, thiết kế tour, xe, visa, liên hệ, đối tác) → thấy trong CMS + email tới đúng người nhận
- [ ] `/login` → `/admin`; upload ảnh lên Cloudinary được
- [ ] Cookie `__Host-vl_at`, `__Secure-vl_rt`, `__Host-vl_session` (HttpOnly, Secure, SameSite=Strict)

## 5. Checklist bàn giao

- [ ] `DEMO_LOGIN=false`, `MAIL_REDIRECT_TO` trống, `NINEPAY_FAKE=false` / không đặt
- [ ] CMS → Cài đặt → Email nhận thông báo = email của **khách**; `NOTIFY_EMAIL` = email khách
- [ ] CMS → Cài đặt → Thanh toán 9Pay: admin nhập 3 mã thật **trực tiếp trên CMS / server** (không gửi qua Zalo / email);
      đăng ký Return URL `https://<tên-miền>/api/v1/payments/return`, IPN URL `https://<tên-miền>/api/v1/payments/ipn`;
      thanh toán thật 1 đơn thành công
- [ ] `NEXT_PUBLIC_SITE_URL`, `PUBLIC_SITE_URL`, `CORS_ORIGINS` = tên miền chính (`https://vietlooktravel.com`)
- [ ] UptimeRobot: theo dõi `https://<backend>/api/v1/health` (không cần `PROXY_SECRET`) + trang chủ website
- [ ] Sao lưu: database mỗi ngày giữ 7 bản (cron `npm run db:backup`, `BACKUP_KEEP=7` — `be/README.md` → Sao lưu database);
      toàn web mỗi tuần giữ 3 bản (snapshot VPS của nhà cung cấp, hoặc nén thư mục `be/` + `.env` + thư mục sao lưu); chép ra nơi khác
- [ ] Đổi mật khẩu admin mặc định; tạo tài khoản nhân viên với quyền phù hợp
- [ ] Sitemap nộp Google Search Console; mã GTM / GA4 / Ads nhập trong CMS → Cài đặt

---

## 6. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
| --- | --- |
| Backend không khởi động, log `[env] Invalid environment variables` | Thiếu / sai biến bắt buộc; log liệt kê tên biến |
| `/api/v1/health` trả 503 `database: disconnected` | Sai `MONGODB_URI` hoặc IP chưa được phép trong Atlas |
| API trả 403 `DIRECT_ACCESS` | Gọi thẳng backend không kèm `X-Proxy-Secret` — đúng thiết kế, gọi qua tên miền website |
| Form báo `Xác minh captcha thất bại` | Có `TURNSTILE_SECRET_KEY` nhưng thiếu site key ở Vercel / tên miền chưa có trong Turnstile Hostnames |
| Đăng nhập xong bị đá về `/login` | `PROXY_SECRET` 2 bên khác nhau, hoặc cookie bị chặn (kiểm tra HTTPS) |
| Vercel build fail `empty-generate-static-params` | Backend chưa chạy / DB rỗng lúc build → bật backend + `npm run seed` rồi redeploy |
| Request đầu tiên lỗi / chậm sau khi Render ngủ | Gói Free ngủ 30–60s; `fe/src/proxy.js` chờ 5s, `catalog.js` chờ 30s → dùng gói trả phí hoặc VPS |
| Đổi env trên Vercel không có tác dụng | `NEXT_PUBLIC_*` chỉ đọc lúc build → Redeploy (nên Clear build cache) |
