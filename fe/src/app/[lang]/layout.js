import { Suspense } from "react";
import { Be_Vietnam_Pro, Caveat, Patrick_Hand, Poppins } from "next/font/google";
import Header, { HeaderStatic } from "@/components/layout/Header";
import Script from "next/script";
import { IMAGE_RETRY_SCRIPT } from "@/components/fx/ImageRetry";
import Footer from "@/components/layout/Footer";
import FloatingContact from "@/components/layout/FloatingContact";
import SmoothScroll from "@/components/fx/SmoothScroll";
// import ConsentBanner from "@/components/layout/ConsentBanner"; // tạm ẩn banner cookie
import { siteConfig } from "@/constants/site";
import { buildNavigation } from "@/data/navigation";
import { getCatalog, getTracking } from "@/lib/catalog";
import Tracking from "@/components/layout/Tracking";
import { getDictionary } from "@/i18n/dictionaries";
import { href, locales, localeMeta, tr } from "@/i18n/config";
import { JsonLd, pageMetadata } from "@/lib/seo";
import "../globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Chữ viết tay cho các ghi chú kèm mũi tên (kiểu localvietnam.com)
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

// Tiếng Việt: Poppins/Caveat không có đủ chữ có dấu (ạ, ế, ộ…) → trang /vi dùng font hỗ trợ tiếng Việt
// (xem :lang(vi) trong globals.css). preload: false → trang en/zh không tải các font này.
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  preload: false,
});
const patrickHand = Patrick_Hand({
  variable: "--font-hand-vi",
  subsets: ["latin", "vietnamese"],
  weight: "400",
  display: "swap",
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
  const nav = buildNavigation(lang, dict, await getCatalog());
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
    sameAs: [siteConfig.social.facebook, siteConfig.social.tripadvisor],
  };

  return (
    <html
      lang={localeMeta[lang].hreflang}
      className={`${poppins.variable} ${caveat.variable} ${beVietnam.variable} ${patrickHand.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col font-sans">
        <Tracking tracking={tracking} />
        <JsonLd data={org} />
        <Script id="vl-image-retry" strategy="beforeInteractive">
          {IMAGE_RETRY_SCRIPT}
        </Script>
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
        <main className="flex-1">{children}</main>
        <Footer lang={lang} dict={dict} />
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
        {/* Tạm ẩn banner xin cookie (theo yêu cầu). Bật lại: bỏ comment dòng dưới. */}
        {/* <ConsentBanner labels={dict.consent} privacyHref={href(lang, "/policies/privacy")} /> */}
      </body>
    </html>
  );
}
