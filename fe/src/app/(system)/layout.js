import { Be_Vietnam_Pro, Patrick_Hand } from "next/font/google";
import ImageRetry from "@/components/fx/ImageRetry";
import { ICONS } from "@/lib/seo";
import "../globals.css";

/**
 * Root layout riêng cho khu quản trị (CMS): không header / footer / hiệu ứng của website, không cho Google index.
 * Giao diện tiếng Việt → font Be Vietnam Pro (đủ dấu tiếng Việt).
 */
const font = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  // 800: chữ đậm nhất của website (tiêu đề lớn) — bản xem trước Giao diện trang hiện đúng như website
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-admin",
  display: "swap",
});

// Chữ viết tay của website (số thứ tự trang Dịch vụ, ghi chú kèm mũi tên) — chỉ tải khi bản xem trước Giao diện trang cần
const hand = Patrick_Hand({
  variable: "--font-hand-vi",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: "400",
  display: "swap",
  preload: false,
});

export const metadata = {
  title: { default: "Quản trị", template: "%s – Quản trị | Vietlook Travel" },
  robots: { index: false, follow: false, nocache: true },
  icons: ICONS,
};

export const viewport = { themeColor: "#0a253c" };

export default function SystemLayout({ children }) {
  return (
    <html lang="vi" translate="no" className={`${font.variable} ${hand.variable} notranslate`}>
      <body className="admin-root min-h-svh bg-[#f4f6f9] font-[family-name:var(--font-admin)] text-ink antialiased">
        <ImageRetry />
        {children}
      </body>
    </html>
  );
}
