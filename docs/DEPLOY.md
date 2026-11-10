# Deploy: Backend (Render) + Frontend (Vercel)

## 0. Kiến trúc

```
Trình duyệt ──▶ Vercel (Next.js, domain website)
                   │  rewrite /api/v1/*  + header X-Proxy-Secret, X-Client-IP
                   ▼
               Render (Express API)
                   ▼
               MongoDB Atlas / Cloudinary / Resend
```

- Trình duyệt **chỉ** nói chuyện với domain Vercel → cookie đăng nhập (`__Host-vl_at`, `__Secure-vl_rt`) là
  cookie first-party, không cần cấu hình cookie cross-site.
- `PROXY_SECRET` chặn truy cập thẳng vào backend (trừ `/api/v1/health`).
- Ảnh đi thẳng Cloudinary (không qua Render/Vercel).

---

## 1. Chuẩn bị (làm 1 lần, ở máy local)

### 1.1. Sinh secret

```bash
cd be
npm run secret
```

Copy 4 dòng in ra:

| Biến | Dùng ở đâu |
| --- | --- |
| `JWT_ACCESS_SECRET` | Render |
| `JWT_REFRESH_SECRET` | Render |
| `DATA_ENCRYPTION_KEY` | Render |
| `PROXY_SECRET` | **Cả Render và Vercel (giá trị giống hệt nhau)** |

### 1.2. MongoDB Atlas

1. Tạo cluster (M0 free là đủ) + user có quyền đọc/ghi DB `vietlook`.
2. **Network Access → Add IP Address → `0.0.0.0/0`** (Render dùng IP egress động, không whitelist cố định được).
3. Lấy connection string: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority`.

### 1.3. Cloudinary

Console → Settings → API Keys: lấy `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
`CLOUDINARY_FOLDER` giữ `vietlook`.

### 1.4. (Tuỳ chọn) Cloudflare Turnstile

- Secret key → Render (`TURNSTILE_SECRET_KEY`)
- Site key → Vercel (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`)
- Trong Turnstile → Settings → **Hostnames** phải chứa domain Vercel (kể cả domain preview nếu muốn test).

> Nếu đặt `TURNSTILE_SECRET_KEY` ở backend mà **không** đặt site key ở frontend, mọi form công khai sẽ bị
> `Xác minh captcha thất bại`.

### 1.5. (Tuỳ chọn) Resend

`RESEND_API_KEY`, `MAIL_FROM`, `NOTIFY_EMAIL`. Không đặt thì form vẫn lưu DB, chỉ không gửi email.

---

## 2. Deploy backend lên Render

### 2.1. Tạo Web Service

Render Dashboard → **New +** → **Web Service** → connect repo GitHub.

| Trường | Giá trị |
| --- | --- |
| Name | `vietlook-api` (tuỳ ý) |
| Region | Singapore |
| Root Directory | `be` |
| Runtime | Node |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/api/v1/health` |
| Instance Type | Free (ngủ sau ~15 phút) hoặc Starter (nên dùng cho production) |

### 2.2. Environment Variables (Render)

| Biến | Giá trị | Bắt buộc |
| --- | --- | --- |
| `NODE_ENV` | `production` | ✅ |
| `NODE_VERSION` | `22` | ✅ |
| `MONGODB_URI` | connection string Atlas | ✅ |
| `MONGODB_DB_NAME` | `vietlook` | ✅ |
| `JWT_ACCESS_SECRET` | từ `npm run secret` (≥ 32 ký tự) | ✅ |
| `JWT_REFRESH_SECRET` | từ `npm run secret` (≥ 32, khác access) | ✅ |
| `DATA_ENCRYPTION_KEY` | từ `npm run secret` (≥ 32) | ✅ |
| `ADMIN_USERNAME` | tài khoản admin đầu tiên | ✅ |
| `ADMIN_PASSWORD` | mật khẩu admin đầu tiên | ✅ |
| `ADMIN_NAME` | `Quản trị viên` | ❌ |
| `PROXY_SECRET` | **trùng với Vercel** | ✅ |
| `CORS_ORIGINS` | `https://<domain-vercel>` (nhiều domain cách nhau `,`) | ✅ |
| `PUBLIC_SITE_URL` | `https://<domain-vercel>` (dùng trong email) | ✅ |
| `COOKIE_SECURE` | `true` | ✅ |
| `TRUST_PROXY` | `2` (Vercel → Render proxy → app) | ✅ |
| `CLOUDINARY_CLOUD_NAME` | … | ✅ (nếu dùng ảnh) |
| `CLOUDINARY_API_KEY` | … | ✅ |
| `CLOUDINARY_API_SECRET` | … | ✅ |
| `CLOUDINARY_FOLDER` | `vietlook` | ❌ |
| `JWT_ACCESS_TTL` | `15m` | ❌ |
| `JWT_REFRESH_TTL` | `7d` | ❌ |
| `MAX_SESSIONS` | `5` | ❌ |
| `RATE_LIMIT_WINDOW_MS` | `900000` | ❌ |
| `RATE_LIMIT_MAX` | `3000` | ❌ |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCK_MINUTES` | `5` / `15` | ❌ |
| `TURNSTILE_SECRET_KEY` | Turnstile secret | ❌ |
| `RESEND_API_KEY` / `MAIL_FROM` / `NOTIFY_EMAIL` | Resend | ❌ |
| `LOG_LEVEL` | `info` | ❌ |

Không cần đặt `PORT` — Render tự inject và `src/config/env.js` đọc biến này.

> App **không khởi động** nếu thiếu biến bắt buộc (Zod validate lúc boot, log sẽ ghi rõ tên biến thiếu).

### 2.3. Kiểm tra

```bash
curl https://<service>.onrender.com/api/v1/health
# {"success":true,"data":{"status":"ok","database":"connected","cloudinary":"configured",...}}
```

- `database: disconnected` → sai `MONGODB_URI` hoặc Atlas chưa whitelist `0.0.0.0/0`.
- 403 `DIRECT_ACCESS` ở các route khác là **đúng** (đã bật `PROXY_SECRET`).

### 2.4. Nạp dữ liệu lần đầu

Render Dashboard → service → **Shell**:

```bash
npm run seed            # chỉ thêm bản ghi còn thiếu, KHÔNG ghi đè nội dung đã sửa trong CMS
# npm run seed -- --force   # (cẩn thận) ghi đè toàn bộ theo be/seed-data
```

Tài khoản admin đầu tiên được tạo tự động khi server khởi động từ `ADMIN_USERNAME` / `ADMIN_PASSWORD`
(`ensureFirstAdmin`). Đổi mật khẩu ngay trong CMS sau lần đăng nhập đầu.

### 2.5. (Tuỳ chọn) `render.yaml`

Nếu muốn tạo service bằng Blueprint thay vì click tay, thêm file `render.yaml` ở **root repo**:

```yaml
services:
  - type: web
    name: vietlook-api
    runtime: node
    rootDir: be
    region: singapore
    plan: free
    buildCommand: npm ci --omit=dev
    startCommand: npm start
    healthCheckPath: /api/v1/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_VERSION
        value: "22"
      - key: MONGODB_URI
        sync: false
      - key: MONGODB_DB_NAME
        value: vietlook
      - key: JWT_ACCESS_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: DATA_ENCRYPTION_KEY
        generateValue: true
      - key: PROXY_SECRET
        generateValue: true
      # … các biến còn lại: sync: false để Render hỏi khi tạo Blueprint
```

> Với `generateValue: true`, nhớ copy `PROXY_SECRET` sang Vercel sau khi service được tạo.

---

## 3. Deploy frontend lên Vercel

### 3.1. Import project

Vercel → **Add New… → Project** → chọn repo →:

| Trường | Giá trị |
| --- | --- |
| Root Directory | `fe` |
| Framework Preset | Next.js |
| Build Command | `npm run build` (mặc định) |
| Install Command | `npm install` (mặc định) |
| Node.js Version | 22.x |

### 3.2. Environment Variables (Vercel)

Đặt cho **Production** (và Preview nếu cần):

| Biến | Giá trị |
| --- | --- |
| `BACKEND_URL` | `https://<service>.onrender.com` (không có `/` cuối) |
| `PROXY_SECRET` | **giống hệt** giá trị trên Render |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain-website>` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key (nếu dùng) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | `dzpmroj28` |
| `NEXT_PUBLIC_CLOUDINARY_FOLDER` | `vietlook` |

Lưu ý:

- `BACKEND_URL` được dùng **cả lúc build** (Next fetch nội dung từ backend để prerender + `generateStaticParams`).
- Biến `NEXT_PUBLIC_*` được **nhúng cứng vào bundle lúc build** → đổi giá trị phải **Redeploy**.
- Không cần `NODE_ENV` (Vercel tự set).

### 3.3. Trước khi bấm Deploy

Backend phải đang chạy và **đã có dữ liệu** (bước 2.4). Nếu Render free đang ngủ, mở
`https://<service>.onrender.com/api/v1/health` trước cho nó thức.

Lý do: `fe/src/lib/catalog.js` gọi API khi build; với `cacheComponents: true`, một
`generateStaticParams` trả về rỗng sẽ làm **build fail** (`empty-generate-static-params`).

### 3.4. Domain

1. Vercel → Project → Settings → Domains → thêm domain (hoặc dùng `*.vercel.app`).
2. Cập nhật lại:
   - Vercel: `NEXT_PUBLIC_SITE_URL=https://<domain-chính-thức>` → **Redeploy**.
   - Render: `PUBLIC_SITE_URL`, `CORS_ORIGINS=https://<domain-chính-thức>` → service tự restart.

---

## 4. Checklist sau deploy

- [ ] `GET /api/v1/health` → `status: ok`
- [ ] `https://<domain>` → redirect sang `/en` (hoặc `/zh`, `/vi` theo `Accept-Language`)
- [ ] `/tours`, `/tours/<slug>`, `/travel-guide`, `/admin` render được
- [ ] Gửi form liên hệ → thấy đơn trong CMS (`/admin` → Đơn/yêu cầu)
- [ ] `/login` → đăng nhập admin → vào được `/admin`
- [ ] Upload ảnh trong CMS → ảnh lên Cloudinary
- [ ] DevTools → Application → Cookies: có `__Host-vl_at`, `__Secure-vl_rt`, `__Host-vl_session`
      (HttpOnly, Secure, SameSite=Strict). Không thấy cookie = lỗi HTTPS/`COOKIE_SECURE`.
- [ ] Đổi mật khẩu admin mặc định

---

## 5. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
| --- | --- |
| Render deploy fail ngay khi boot, log `[env] Invalid environment variables` | Thiếu biến bắt buộc; log liệt kê chính xác biến nào |
| `/api/v1/health` trả 503 `database: disconnected` | Sai `MONGODB_URI` hoặc Atlas chưa whitelist `0.0.0.0/0` |
| API trả 403 `DIRECT_ACCESS` | Gọi thẳng Render không kèm `X-Proxy-Secret` — đúng thiết kế, hãy gọi qua domain Vercel |
| Form báo `Xác minh captcha thất bại` | Đặt `TURNSTILE_SECRET_KEY` nhưng thiếu site key ở Vercel / domain chưa có trong Turnstile Hostnames |
| Đăng nhập xong bị đá về `/login` | `PROXY_SECRET` 2 bên khác nhau, hoặc cookie bị chặn (kiểm tra HTTPS) |
| Vercel build fail `empty-generate-static-params` | Backend chưa chạy / DB rỗng lúc build → bật backend + `npm run seed` rồi redeploy |
| Vercel build chậm/timeout vì backend Render free ngủ | Nâng Render Starter, hoặc ping `/api/v1/health` mỗi 10 phút (UptimeRobot) |
| Request đầu tiên sau khi Render ngủ bị lỗi/timeout | Free plan spin-down 30–60s; `currentUser()` trong `fe/src/proxy.js` timeout 5s, `catalog.js` timeout 30s |
| Đổi env trên Vercel không có tác dụng | Biến `NEXT_PUBLIC_*` chỉ đọc lúc build → Redeploy (nên Clear build cache) |
| Font lỗi lúc build | Đã fix bằng Next 16.4.6; nếu tái diễn → Clear build cache rồi redeploy |

---

## 6. Chi phí tối thiểu

| Thành phần | Gói |
| --- | --- |
| Vercel | Hobby (miễn phí) |
| Render | Free (ngủ) hoặc Starter ~7 USD/tháng |
| MongoDB Atlas | M0 free |
| Cloudinary | Free tier |
| Turnstile / Resend | Free tier |
