import { BACKEND_URL } from "./src/config/urls.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
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
  // Giữ SEO website cũ (WordPress): chuyển hướng 301 các đường dẫn cũ sang cấu trúc mới
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
    ];
  },
  async redirects() {
    return [
      { source: "/tour/:slug", destination: "/tours/:slug", permanent: true },
      { source: "/tour-packages", destination: "/tours", permanent: true },
      { source: "/fast-track-and-visa", destination: "/visa-fast-track", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/tailor-made", destination: "/group-tailor-made-tours", permanent: true },
      { source: "/blog", destination: "/travel-guide", permanent: true },
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
