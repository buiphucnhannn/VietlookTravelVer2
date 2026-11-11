import { siteConfig } from "@/constants/site";

// Không ghi /admin, /login vào đây: robots.txt ai cũng đọc được → không "chỉ đường" tới khu quản trị.
// Các trang đó đã gửi X-Robots-Tag: noindex, nofollow và không có trong sitemap.
export default function robots() {
  // Tên miền tạm / bản preview (xem siteConfig.allowIndexing): chặn toàn bộ, không khai báo sitemap
  // (sitemap chứa link của tên miền đang chạy thử — không muốn Google thu thập).
  if (!siteConfig.allowIndexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
