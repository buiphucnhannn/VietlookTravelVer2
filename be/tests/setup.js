// Nạp TRƯỚC mọi test (node --import ./tests/setup.js): biến môi trường giả, không cần MongoDB / Cloudinary thật.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:1/vietlook-test";
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.PROXY_SECRET = "";
process.env.TURNSTILE_SECRET_KEY = "";
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789-abcdefghijklmnop";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789-abcdefghijklmnop";
process.env.CLOUDINARY_CLOUD_NAME = "vltest"; // video nền chép từ Drive: chỉ nhận video của đúng tài khoản này
