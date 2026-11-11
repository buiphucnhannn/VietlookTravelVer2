import { Suspense } from "react";
import { Be_Vietnam_Pro, Patrick_Hand } from "next/font/google";
import Header, { HeaderStatic } from "@/components/layout/Header";
import ImageRetry from "@/components/fx/ImageRetry";
import Footer from "@/components/layout/Footer";
import FloatingContact from "@/components/layout/FloatingContact";
import { A11yProvider } from "@/components/layout/A11y";
import SmoothScroll from "@/components/fx/SmoothScroll";
import { siteConfig } from "@/constants/site";
import { buildNavigation } from "@/data/navigation";
import { getCatalog, getTracking } from "@/lib/catalog";
import Tracking from "@/components/layout/Tracking";
import { getDictionary } from "@/i18n/dictionaries";
import { href, locales, localeMeta, tr } from "@/i18n/config";
import { JsonLd, pageMetadata } from "@/lib/seo";
// CSS riêng của website (không kèm lớp của khu quản trị → nhẹ hơn)
import "../site.css";

// Font chính của toàn website (mọi ngôn ngữ): Be Vietnam Pro — thiết kế riêng cho tiếng Việt, đủ mọi dấu
// (ạ, ế, ộ, ữ…). Tên địa danh có dấu (Hà Nội, Phú Quốc…) xuất hiện cả ở trang tiếng Anh/Trung nên không
// dùng Poppins nữa (Poppins thiếu các chữ này → chữ bị lẫn font hệ thống, dấu lệch).
// Tốc độ: `subsets` chỉ quyết định file nào được TẢI TRƯỚC (preload) — CSS vẫn có đủ latin-ext + vietnamese,
// trình duyệt tự tải phần còn lại khi trang cần. Trước đây tải trước 18 file (mọi cỡ chữ × mọi bảng chữ) giành
// băng thông với ảnh chính trên điện thoại → nay chỉ tải trước 5 file bảng latin. Bỏ cỡ 300 (website không dùng).
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
// Chữ viết tay cho các ghi chú kèm mũi tên — Patrick Hand có đủ dấu tiếng Việt (Caveat thì không)
const patrickHand = Patrick_Hand({
  variable: "--font-hand-vi",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: "400",
  display: "swap",
  // chỉ dùng cho vài ghi chú phía dưới trang → không tải trước
  preload: false,
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    metadataBase: new URL(siteConfig.url),
    ...pageMetadata({ lang, title: dict.meta.title, description: dict.meta.description }),
    // Đặt SAU pageMetadata để mẫu "%s | Vietlook Travel" không bị ghi đè
    title: { default: dict.meta.title, template: `%s | ${siteConfig.name}` },
  };
}

export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const catalog = await getCatalog();
  const nav = buildNavigation(lang, dict, catalog);
  const tracking = await getTracking();

  const org = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: siteConfig.legalName,
    alternateName: siteConfig.name,
    url: `${siteConfig.url}${href(lang)}`,
    logo: `${siteConfig.url}/images/logo/vietlook-logo.png`,
    telephone: siteConfig.contact.hotline,
    email: siteConfig.contact.email,
    foundingDate: String(siteConfig.since),
    address: {
      "@type": "PostalAddress",
      streetAddress: tr(siteConfig.contact.address, "en"),
      addressLocality: "Hanoi",
      addressCountry: "VN",
    },
    sameAs: [siteConfig.social.facebook, siteConfig.social.tripadvisor, siteConfig.social.youtube],
  };

  return (
    <html
      lang={localeMeta[lang].hreflang}
      className={`${beVietnam.variable} ${patrickHand.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col font-sans">
        <A11yProvider labels={dict.a11y}>
          {/* Bàn phím: phím Tab đầu tiên hiện link nhảy thẳng tới nội dung (bỏ qua menu) */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-brand-700 focus:shadow-xl focus:ring-2 focus:ring-brand-500"
          >
            {dict.a11y.skipToContent}
          </a>
          {/* Mã Google + banner cookie (Consent Mode v2) — chỉ khi CMS có cài mã đo lường */}
          <Tracking
            tracking={tracking}
            labels={dict.consent}
            privacyHref={href(lang, "/policies/privacy")}
          />
          <JsonLd data={org} />
          <ImageRetry />
          <Suspense fallback={null}>
            <SmoothScroll />
          </Suspense>
          <Suspense
            fallback={
              <HeaderStatic
                lang={lang}
                nav={nav}
                contact={siteConfig.contact}
                labels={{
                  ...dict.topbar,
                  planTrip: dict.nav.planTrip,
                  menu: dict.nav.menu,
                  close: dict.nav.close,
                }}
              />
            }
          >
            <Header
              lang={lang}
              nav={nav}
              contact={siteConfig.contact}
              labels={{
                ...dict.topbar,
                planTrip: dict.nav.planTrip,
                menu: dict.nav.menu,
                close: dict.nav.close,
              }}
            />
          </Suspense>
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <Footer lang={lang} dict={dict} policies={catalog.policies} />
          <FloatingContact
            labels={{
              ...dict.floating,
              addWeChat: dict.common.addWeChat,
              wechatHint: dict.common.wechatHint,
              copy: dict.common.copy,
              copied: dict.common.copied,
            }}
            contact={siteConfig.contact}
            messaging={siteConfig.messaging}
          />
        </A11yProvider>
      </body>
    </html>
  );
}
