// Nạp TRƯỚC mọi test (node --import ./tests/setup.js): biến môi trường giả, không cần MongoDB / Cloudinary thật.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.PROXY_SECRET = "";
process.env.TURNSTILE_SECRET_KEY = "";
process.env.DEMO_LOGIN = "false"; // đăng nhập nhanh demo luôn tắt khi test
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789-abcdefghijklmnop";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789-abcdefghijklmnop";
process.env.CLOUDINARY_CLOUD_NAME = "vltest"; // video nền chép từ Drive: chỉ nhận video của đúng tài khoản này
// config/env.js tự nạp be/.env (không ghi đè biến đã đặt) → đặt rỗng mọi key dịch vụ thật để test
// KHÔNG BAO GIỜ gửi email thật / gọi Cloudinary / dùng DB thật dù máy dev có .env đầy đủ.
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/vietlook-test";
process.env.RESEND_API_KEY = "";
process.env.NOTIFY_EMAIL = "ops@example.com";
process.env.MAIL_REDIRECT_TO = ""; // test chuyển hướng email truyền địa chỉ trực tiếp vào applyRedirect
process.env.CLOUDINARY_API_KEY = "";
process.env.CLOUDINARY_API_SECRET = "";
process.env.ADMIN_USERNAME = "";
process.env.ADMIN_PASSWORD = "";
process.env.DATA_ENCRYPTION_KEY = "test-data-encryption-key-0123456789";
// 9Pay: test luôn dùng cổng mặc định, không giả lập — dù máy dev đang cấu hình sandbox / NINEPAY_FAKE
process.env.NINEPAY_ENDPOINT = "";
process.env.NINEPAY_FAKE = "false";
// Dịch tự động: test dùng createTranslator + fetch giả, không bao giờ dùng key thật của máy dev
process.env.TRANSLATE_PROVIDERS = "";
process.env.AZURE_TRANSLATOR_KEY = "";
process.env.DEEPL_API_KEY = "";
process.env.GOOGLE_TRANSLATE_API_KEY = "";
process.env.LIBRETRANSLATE_URL = "";
process.env.LINGVA_INSTANCES = "";
process.env.LIBRETRANSLATE_API_KEY = "";
process.env.MYMEMORY_EMAIL = "";
// Điểm đánh giá: khoá API chỉ nhập trong CMS (không có biến môi trường) — test dùng fetch giả + kho cài đặt giả
