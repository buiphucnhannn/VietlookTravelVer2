import { readFileSync } from "node:fs";
import { BACKEND_URL } from "./src/config/urls.mjs";
import { resolveAdminLoginPath, warnIfAdminLoginPathMissing } from "./src/config/admin-path.mjs";

// Đường dẫn bí mật của trang đăng nhập (chỉ server biết — xem src/config/admin-path.mjs)
const ADMIN_LOGIN_PATH = resolveAdminLoginPath();
warnIfAdminLoginPathMissing();

const oldSiteRedirects = JSON.parse(
  readFileSync(new URL("./src/data/old-site-redirects.json", import.meta.url), "utf8"),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  // URL web cũ có "/" cuối (WordPress): khớp thẳng redirects() bên dưới → 1 bước 301, không qua bước 308 bỏ "/"
  // (các URL "/" cuối khác do proxy.js chuyển 301 sang bản không "/")
  skipTrailingSlashRedirect: true,
  // Ẩn nút "N" (dev tools) ở góc màn hình khi chạy dev
  devIndicators: false,
  partialPrefetching: true,
  experimental: {
    globalNotFound: true,
  },
  images: {
    // KHÔNG dùng bộ tối ưu ảnh của Vercel (tránh hết hạn mức khi có nhiều ảnh): ảnh tải thẳng từ CDN Cloudinary,
    // Cloudinary tự đổi kích thước + AVIF/WebP + nén (xem src/lib/image-loader.js)
    loader: "custom",
    loaderFile: "./src/lib/image-loader.js",
    // 85 cho ảnh lớn hiển thị toàn bề rộng (slider tour dài ngày)
    qualities: [75, 85],
    // Ít kích thước hơn mặc định (15 → 10): ảnh dùng lại bản Cloudinary đã tạo sẵn nhiều hơn → tải nhanh hơn,
    // ít lần Cloudinary phải dựng ảnh mới (dễ lỗi tạm thời) và tốn ít lượt biến đổi hơn.
    deviceSizes: [640, 828, 1080, 1280, 1920, 2560],
    imageSizes: [64, 128, 256, 384],
  },
  // Trình duyệt gọi /api/v1 cùng tên miền → chuyển tiếp sang backend (cookie đăng nhập là first-party).
  // Có PROXY_SECRET thì src/proxy.js chuyển tiếp kèm mã bí mật + IP thật của khách (rewrite này không chạy tới).
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
  // Header bảo mật. Khu quản trị: cấm nhúng iframe (chống clickjacking), không cache, không index.
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    ];
    const admin = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/:path*", headers: base },
      { source: "/admin", headers: admin },
      { source: "/admin/:path*", headers: admin },
      { source: "/login", headers: admin },
      // Chỉ nằm trong cấu hình phía server (routes-manifest), không gửi xuống trình duyệt
      ...(ADMIN_LOGIN_PATH ? [{ source: ADMIN_LOGIN_PATH, headers: admin }] : []),
    ];
  },
  async redirects() {
    // Giữ SEO website cũ (WordPress): chuyển hướng vĩnh viễn 301 (đúng yêu cầu tiến độ) sang cấu trúc mới.
    // Mọi URL web cũ: src/data/old-site-redirects.json (sinh lúc chuyển dữ liệu — xem docs/redirect-map.csv):
    // bài viết /<slug>/ → /travel-guide/<slug>, tour tiếng Việt → /vi/tours/…, tour / dịch vụ không chuyển → trang gần nhất…
    // Đặt TRƯỚC quy tắc chung bên dưới (Next khớp theo thứ tự).
    // Tour cũ còn lại /tour/<slug>/ → /tours/<slug> (slug tour giữ nguyên như web cũ).
    return [
      ...Object.entries(oldSiteRedirects).map(([source, destination]) => ({
        source,
        destination,
        statusCode: 301,
      })),
      { source: "/tour/:slug", destination: "/tours/:slug", statusCode: 301 },
      // Link cũ còn nằm trong nội dung bài / tour nhập từ web cũ (cấu trúc URL đời trước của WordPress)
      { source: "/vi/tour/:slug", destination: "/tour/:slug", statusCode: 301 },
      { source: "/our-tours/:cat", destination: "/tour-packages/:cat", statusCode: 301 },
      { source: "/vi/our-tours/:cat", destination: "/tour-packages/:cat", statusCode: 301 },
      { source: "/tour-packages/:cat", destination: "/tours", statusCode: 301 },
      // Chủ đề "Hand-picked" đã thay bằng "Exclusive tours" (11/2026) → giữ link cũ, không 404
      ...["", "/zh", "/vi"].map((p) => ({
        source: `${p}/themes/hand-picked`,
        destination: `${p}/themes/exclusive-tours`,
        statusCode: 301,
      })),
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
