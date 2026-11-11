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

#### Email vào hộp thư chính (không vào Quảng cáo / Spam)

Code đã làm phần của mình: thư giao dịch ngắn, 1 logo nhỏ, ≤ 3 link (không tham số theo dõi), luôn gửi
kèm bản chữ thuần (multipart), UTF-8, From cố định "Vietlook Travel", Reply-To về hộp thư bán hàng, không
có header thư hàng loạt (List-Unsubscribe / Precedence). Phần còn lại **phải làm trên DNS / Resend**:

1. **Xác minh tên miền công ty** trong Resend → Domains → Add domain (nên dùng tên miền phụ, vd.
   `mail.vietlooktravel.com`). Thêm đúng các bản ghi Resend hiện ra vào DNS: **SPF** (TXT/MX cho
   `send.…`) và **DKIM** (TXT `resend._domainkey…`). Chờ trạng thái **Verified**.
2. **DMARC**: thêm TXT `_dmarc.vietlooktravel.com` = `v=DMARC1; p=none; rua=mailto:<hộp thư nhận báo cáo>`.
   Sau 2–4 tuần không lỗi → đổi `p=quarantine`.
3. **MAIL_FROM** trên tên miền đó, vd. `Vietlook Travel <booking@vietlooktravel.com>` (hoặc `no-reply@`).
   Không dùng Gmail / tên miền cá nhân / `onboarding@resend.dev` — đây là lý do chính thư vào Quảng cáo / Spam.
   CMS → Cài đặt → **Email nhận thư trả lời** (Reply-To) = hộp thư bán hàng (khách bấm Trả lời sẽ tới đó).
4. Resend → Domain → **tắt Open tracking và Click tracking** (link bị đổi sang link theo dõi + ảnh pixel
   là dấu hiệu thư marketing).
5. **Làm nóng tên miền**: tuần đầu gửi ít (vài chục thư/ngày), tăng dần; không gửi thư hàng loạt / bản tin
   từ cùng tên miền phụ này (nếu cần gửi marketing, dùng tên miền phụ khác).
6. Nhờ vài khách / nhân viên đầu tiên: Gmail → kéo thư sang tab **Chính** (chọn "Có" khi hỏi áp dụng cho
   thư sau), **thêm địa chỉ gửi vào Danh bạ**, và trả lời 1 thư — Gmail học rất nhanh từ các thao tác này.
7. Kiểm tra: gửi thử tới https://www.mail-tester.com (mục tiêu ≥ 9/10); Gmail → "Hiển thị bản gốc" phải thấy
   `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`. Theo dõi tỷ lệ spam ở Google Postmaster Tools.

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
| `PUBLIC_SITE_URL` | `https://<tên-miền-website>` (link trong email, link 9Pay quay về) — bỏ trống / để mặc định / không `https` → log khởi động có **cảnh báo** (server vẫn chạy) |
| `CORS_ORIGINS` | `https://<tên-miền-website>` (nhiều tên miền cách nhau `,`) |
| `TRUST_PROXY` | `2` |
| `CLOUDINARY_*` | khoá Cloudinary |
| `TURNSTILE_SECRET_KEY` | secret Turnstile |
| `RESEND_API_KEY`, `MAIL_FROM`, `NOTIFY_EMAIL` | Resend; `NOTIFY_EMAIL` = email nhận thông báo dự phòng của **khách** |
| `MAIL_REDIRECT_TO` | **để trống** (có giá trị = mọi email chỉ gửi tới 1 địa chỉ thử) |
| `DEMO_LOGIN` | **`false`** (true = ai cũng vào được CMS bằng nút "Đăng nhập nhanh") |
| `NINEPAY_FAKE` | `false` (production luôn bỏ qua) · `NINEPAY_ENDPOINT` để trống = cổng thật |
| `MEDIA_CLEANUP_DAILY` | để trống = **bật** ở production: mỗi ngày ~03:00 giờ VN tự dọn ảnh CMS không còn dùng (`false` để tắt) — xem be/README "Dọn ảnh" |
| `MEDIA_ORPHAN_GRACE_DAYS` | `21` — ảnh không dùng được đánh dấu trước, chỉ xoá khi suốt N ngày không ai dùng lại (nên ≥ thời gian giữ bản sao lưu cũ nhất: 3 bản hằng tuần ≈ 21 ngày) |
| `AZURE_TRANSLATOR_KEY` (+ `AZURE_TRANSLATOR_REGION`), `DEEPL_API_KEY`, `GOOGLE_TRANSLATE_API_KEY` | tuỳ chọn — key gói miễn phí cho "Dịch tự động" (ổn định hơn dịch vụ không key); trống = bỏ qua. Xem `be/.env.example` |
| `TRANSLATE_PROVIDERS`, `TRANSLATE_COOLDOWN_MINUTES`, `LINGVA_INSTANCES`, `LIBRETRANSLATE_URL`, `MYMEMORY_EMAIL` | thường để trống / mặc định (`15` phút) |
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
| `NEXT_PUBLIC_SITE_URL` | `https://<tên-miền-website>` (canonical, hreflang, sitemap). Tên miền tạm (`*.vercel.app`, `demo-…`, localhost) → **tự chặn Google index** |
| `NEXT_PUBLIC_ALLOW_INDEXING` | thường để trống; `false` = chưa cho Google index dù đã có tên miền thật; `true` = ép cho index |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | site key Turnstile |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_FOLDER` | xem `fe/.env.example` |

- `BACKEND_URL` dùng **cả lúc build** (prerender + `generateStaticParams`) → backend phải đang chạy và **đã có dữ liệu**
  trước khi deploy; DB rỗng → build fail `empty-generate-static-params`.
- `NEXT_PUBLIC_*` nhúng vào bundle lúc build → đổi giá trị phải **Redeploy**.

### Đổi sang tên miền chính

Vercel → Settings → Domains → thêm tên miền, rồi cập nhật cùng lúc: `NEXT_PUBLIC_SITE_URL` (Vercel → Redeploy),
`PUBLIC_SITE_URL` + `CORS_ORIGINS` (backend → khởi động lại), Turnstile Hostnames, Return/IPN URL trong trang quản lý 9Pay.
Sau khi Redeploy: kiểm `https://<tên-miền>/robots.txt` đã có dòng `Sitemap:` (không còn `Disallow: /`) rồi nộp sitemap
lên Google Search Console. Bản chạy thử trên tên miền tạm luôn bị chặn index nên không trùng nội dung với web cũ.

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
- [ ] `NEXT_PUBLIC_SITE_URL`, `PUBLIC_SITE_URL`, `CORS_ORIGINS` = tên miền chính (`https://vietlooktravel.com`);
      log khởi động backend **không** còn dòng cảnh báo `PUBLIC_SITE_URL chưa đặt đúng`
- [ ] UptimeRobot: theo dõi `https://<backend>/api/v1/health` (không cần `PROXY_SECRET`) + trang chủ website
- [ ] Sao lưu: database mỗi ngày giữ 7 bản (cron `npm run db:backup`, `BACKUP_KEEP=7` — `be/README.md` → Sao lưu database);
      toàn web mỗi tuần giữ 3 bản (mục 5.1 — snapshot VPS của nhà cung cấp hoặc cron nén); chép ra nơi khác

### 5.1. Sao lưu toàn web hằng tuần (giữ 3 bản)

Cách 1 — snapshot của nhà cung cấp VPS: bật "Auto backup / Snapshot" hằng tuần, giữ 3 bản (đơn giản nhất, khôi phục cả máy).

Cách 2 — cron trên VPS (ví dụ code ở `/srv/vietlook`, `BACKUP_DIR=/srv/vietlook-backups/db`). Tạo `/srv/vietlook-backups/weekly.sh`:

```bash
#!/bin/sh
# Nén thư mục app (kèm be/.env) + thư mục sao lưu database; giữ 3 bản mới nhất; chép ra nơi khác
set -e
DEST=/srv/vietlook-backups/site
mkdir -p "$DEST"
FILE="$DEST/vietlook-site-$(date +%F).tar.gz"
tar -czf "$FILE" --exclude='node_modules' --exclude='.next' --exclude='.git' \
  -C /srv vietlook vietlook-backups/db
chmod 600 "$FILE"
ls -1t "$DEST"/vietlook-site-*.tar.gz | tail -n +4 | xargs -r rm -f   # chỉ giữ 3 bản
# Chép ra nơi khác (chọn 1): máy chủ khác qua rsync, hoặc rclone lên Google Drive / S3 đã cấu hình sẵn
rsync -a --delete "$DEST"/ backup@<máy-khác>:/backups/vietlook-site/
# rclone sync "$DEST" remote:vietlook-site
```

```bash
chmod 700 /srv/vietlook-backups/weekly.sh
crontab -e   # thêm dòng: 3h sáng Chủ nhật (sau bản sao lưu database 2h sáng hằng ngày)
0 3 * * 0 /srv/vietlook-backups/weekly.sh >> /srv/vietlook-backups/weekly.log 2>&1
```

- File nén chứa `be/.env` (secret, `DATA_ENCRYPTION_KEY`) → chỉ lưu ở nơi có quyền truy cập hạn chế.
- Khôi phục: `tar -xzf vietlook-site-<ngày>.tar.gz -C /srv` → `cd /srv/vietlook/be && npm ci --omit=dev` →
  `npm run db:restore -- /srv/vietlook-backups/db/<file>.json.gz --yes` → `pm2 restart all`.
- Thử khôi phục 1 lần lên máy khác sau khi cài đặt xong để chắc bản sao lưu dùng được.
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
