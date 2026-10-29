/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  // Ẩn nút "N" (dev tools) ở góc màn hình khi chạy dev
  devIndicators: false,
  partialPrefetching: true,
  experimental: {
    globalNotFound: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // 85 cho ảnh lớn hiển thị toàn bề rộng (slider tour dài ngày)
    qualities: [75, 85],
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
  // Giữ SEO website cũ (WordPress): chuyển hướng 301 các đường dẫn cũ sang cấu trúc mới
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
