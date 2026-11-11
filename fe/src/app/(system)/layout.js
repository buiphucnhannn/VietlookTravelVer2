import { Be_Vietnam_Pro } from "next/font/google";
import ImageRetry from "@/components/fx/ImageRetry";
import { ICONS } from "@/lib/seo";
import "../globals.css";

/**
 * Root layout riêng cho khu quản trị (CMS): không header / footer / hiệu ứng của website, không cho Google index.
 * Giao diện tiếng Việt → font Be Vietnam Pro (đủ dấu tiếng Việt).
 */
const font = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-admin",
  display: "swap",
});

export const metadata = {
  title: { default: "Quản trị", template: "%s – Quản trị | Vietlook Travel" },
  robots: { index: false, follow: false, nocache: true },
  icons: ICONS,
};

export const viewport = { themeColor: "#0a253c" };

export default function SystemLayout({ children }) {
  return (
    <html lang="vi" translate="no" className={`${font.variable} notranslate`}>
      <body className="admin-root min-h-svh bg-[#f4f6f9] font-[family-name:var(--font-admin)] text-ink antialiased">
        <ImageRetry />
        {children}
      </body>
    </html>
  );
}
