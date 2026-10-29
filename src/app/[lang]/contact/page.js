import { ChevronRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import BgImage from "@/components/ui/BgImage";
import { getDictionary } from "@/i18n/dictionaries";
import { tr } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/constants/site";
import { Container } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import ContactForm from "@/components/forms/ContactForm";
import { FacebookIcon, WeChatIcon, WhatsAppIcon, ZaloIcon } from "@/components/ui/BrandIcons";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/contact",
    title: dict.contact.title,
    // Phụ đề hero ngắn → thêm thông tin liên hệ cho kết quả tìm kiếm
    description:
      lang === "zh"
        ? `${dict.contact.subtitle}河内办公室，热线、WhatsApp、微信与Zalo全天候联系 Vietlook Travel。`
        : `${dict.contact.subtitle} Contact Vietlook Travel in Hanoi by hotline, WhatsApp, WeChat, Zalo or email.`,
  });
}

/** Trang liên hệ: form, hotline, email, WhatsApp, WeChat, Google Maps (kiểu localvietnam). */
export default async function ContactPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.contact;
  const c = {
    ...dict.common,
    fullName: dict.tour.fullName,
    phone: dict.tour.phone,
    message: t.message,
  };
  const { contact, messaging, social, maps } = siteConfig;

  const channels = [
    {
      icon: WhatsAppIcon,
      color: "text-[#25d366]",
      title: contact.hotline,
      sub: "WhatsApp",
      href: messaging.whatsapp,
    },
    {
      icon: WeChatIcon,
      color: "text-[#07c160]",
      title: messaging.wechatId,
      sub: "WeChat",
      href: null,
      id: "wechat",
    },
    { icon: ZaloIcon, color: "", title: contact.hotline, sub: "Zalo", href: messaging.zalo },
    {
      icon: FacebookIcon,
      color: "text-[#1877f2]",
      title: "Facebook",
      sub: "/vietlooktravelhanoi",
      href: social.facebook,
    },
  ];

  return (
    <>
      <BrushHero
        title={t.title}
        subtitle={t.subtitle}
        images={[
          "/images/tours/v2/hanoi-32307858.jpg",
          "/images/tours/v2/hanoi-3300834.jpg",
          "/images/tours/v2/hanoi-33497770.jpg",
        ]}
        breadcrumbs={[{ label: "Vietlook", href: "/" + lang }, { label: t.title }]}
      />
      <section className="relative isolate overflow-clip bg-[#e6f4ef] py-14 lg:py-[4.5rem]">
        <BgImage src="/images/tours/v2/hanoi-32307858.jpg" tone="mist" />
        <Container>
          <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <ContactForm lang={lang} t={t} c={c} />
            </div>
            <div className="space-y-3 lg:sticky lg:top-32">
              <h2 className="text-2xl font-bold text-ink">{t.directTitle}</h2>
              <p className="pb-2 text-ink/80">{t.directText}</p>
              {channels.map((ch) => {
                const Tag = ch.href ? "a" : "div";
                return (
                  <Tag
                    key={ch.sub}
                    id={ch.id}
                    {...(ch.href
                      ? { href: ch.href, target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="flex scroll-mt-40 items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-border transition hover:shadow-md"
                  >
                    <ch.icon className={`size-7 ${ch.color}`} />
                    <span className="flex-1">
                      <span className="block font-semibold text-ink">{ch.title}</span>
                      <span className="text-sm text-muted">{ch.sub}</span>
                    </span>
                    {ch.href && <ChevronRight className="size-5 text-muted" />}
                  </Tag>
                );
              })}
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
                <p className="font-semibold text-brand-700">{t.subtitle}</p>
                <p className="mt-3 text-sm text-muted">— {dict.common.team}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-[4.5rem]">
        <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-ink">{t.office}</h2>
            <p className="text-lg font-semibold text-brand-700">{siteConfig.legalName}</p>
            <ul className="space-y-4 text-ink/85">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-sun-500" />{" "}
                {tr(contact.address, lang)}
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-sun-500" />
                <span>
                  <a
                    href={`tel:${contact.hotlineRaw}`}
                    className="font-semibold hover:text-brand-600"
                  >
                    {contact.hotline}
                  </a>{" "}
                  ·{" "}
                  <a href={`tel:${contact.hotline2Raw}`} className="hover:text-brand-600">
                    {contact.hotline2}
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-sun-500" />
                <a href={`mailto:${contact.email}`} className="hover:text-brand-600">
                  {contact.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-sun-500" /> {tr(contact.hours, lang)}
              </li>
            </ul>
            <a
              href={maps.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-brand-600 hover:text-sun-500"
            >
              {t.findUs} <ChevronRight className="size-4" />
            </a>
          </div>
          <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-border">
            <iframe
              title="Vietlook Travel – Google Maps"
              src={lang === "zh" ? maps.embed.replace("hl=en", "hl=zh-CN") : maps.embed}
              className="h-[420px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Container>
      </section>
    </>
  );
}
