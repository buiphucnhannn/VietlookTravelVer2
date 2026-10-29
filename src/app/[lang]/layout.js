import { Caveat, Poppins } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingContact from "@/components/layout/FloatingContact";
import SmoothScroll from "@/components/fx/SmoothScroll";
import ConsentBanner from "@/components/layout/ConsentBanner";
import { siteConfig } from "@/constants/site";
import { buildNavigation } from "@/data/navigation";
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
  const nav = buildNavigation(lang, dict);

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
      className={`${poppins.variable} ${caveat.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col font-sans">
        <JsonLd data={org} />
        <SmoothScroll />
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
        <ConsentBanner labels={dict.consent} privacyHref={href(lang, "/policies/privacy")} />
      </body>
    </html>
  );
}
