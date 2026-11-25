import { ChevronRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import BgImage from "@/components/ui/BgImage";
import { getDictionary } from "@/i18n/dictionaries";
import { href, tr } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { getPageText } from "@/lib/page-copy/server";
import { getContactInfo } from "@/lib/catalog";
import { phoneDigits } from "@/lib/contact.mjs";
import { Fragment } from "react";
import { Container } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";
import ContactForm from "@/components/forms/ContactForm";
import {
  FacebookIcon,
  LineIcon,
  WeChatIcon,
  WhatsAppIcon,
  ZaloIcon,
} from "@/components/ui/BrandIcons";
import CopyButton from "@/components/ui/CopyButton";
import LazyIframe from "@/components/ui/LazyIframe";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = await getPageText("contact", lang, dict);
  return pageMetadata({
    lang,
    path: "/contact",
    title: p.heroTitle,
    // Phụ đề hero ngắn → thêm thông tin liên hệ cho kết quả tìm kiếm
    description:
      lang === "zh"
        ? `${p.heroSubtitle}河内办公室，热线、WhatsApp、微信、LINE与Zalo全天候联系 Vietlook Travel。`
        : lang === "vi"
          ? `${p.heroSubtitle} Liên hệ Vietlook Travel tại Hà Nội qua hotline, WhatsApp, WeChat, LINE, Zalo hoặc email.`
          : `${p.heroSubtitle} Contact Vietlook Travel in Hanoi by hotline, WhatsApp, WeChat, LINE, Zalo or email.`,
  });
}

/** Trang liên hệ: form, hotline, email, WhatsApp, WeChat, Google Maps (kiểu localvietnam). */
export default async function ContactPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  // Chữ / ảnh sửa được trong CMS → Giao diện trang → Liên hệ (chưa sửa = nội dung mặc định).
  // Số điện thoại, email, WeChat, địa chỉ, bản đồ: CMS → Cài đặt → Thông tin liên hệ (dùng chung toàn website).
  const p = await getPageText("contact", lang, dict);
  const t = {
    ...dict.contact,
    formTitle: p.formTitle,
    formText: p.formText,
    successTitle: p.successTitle,
    successText: p.successText,
  };
  const c = {
    ...dict.common,
    fullName: dict.tour.fullName,
    phone: dict.tour.phone,
    message: t.message,
  };
  const info = await getContactInfo();
  const { contact, messaging, social, maps } = info;
  const waPhones = contact.phones.filter((ph) => ph.whatsapp);
  const zaloPhone = contact.phones.find((ph) => ph.zalo);
  const lineValues = [messaging.lineId, ...messaging.linePhones].filter(Boolean);

  // WeChat / LINE không có link mở thẳng → hiện ID / số điện thoại (WeChat kèm nút chép)
  const channels = [
    ...waPhones.map((ph, i) => ({
      key: `wa${i + 1}`,
      icon: WhatsAppIcon,
      color: "text-[#25d366]",
      title: ph.number,
      sub: "WhatsApp",
      href: `https://wa.me/${phoneDigits(ph.number)}`,
    })),
    {
      key: "wechat",
      icon: WeChatIcon,
      color: "text-[#07c160]",
      title: messaging.wechatId,
      sub: lang === "zh" ? "微信号" : "WeChat ID",
      href: null,
      id: "wechat",
      copy: messaging.wechatId,
    },
    lineValues.length > 0 && {
      key: "line",
      icon: LineIcon,
      color: "",
      title: lineValues.map((v, i) => (
        <Fragment key={v}>
          {i > 0 && " · "}
          <span className="whitespace-nowrap">{v}</span>
        </Fragment>
      )),
      sub: "LINE",
      href: null,
    },
    zaloPhone && {
      key: "zalo",
      icon: ZaloIcon,
      color: "",
      title: zaloPhone.number,
      sub: "Zalo",
      href: messaging.zalo,
    },
    {
      key: "facebook",
      icon: FacebookIcon,
      color: "text-[#1877f2]",
      title: "Facebook",
      sub: social.facebookHandle,
      href: social.facebook,
    },
  ].filter(Boolean);

  return (
    <>
      <BrushHero
        title={p.heroTitle}
        subtitle={p.heroSubtitle}
        images={p.heroImages}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: p.heroTitle }]}
      />
      <section className="relative isolate overflow-clip bg-[#e6f4ef] py-14 lg:py-[4.5rem]">
        <BgImage src={p.formImage} tone="mist" />
        <Container>
          <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <ContactForm lang={lang} t={t} c={c} />
            </div>
            <div className="space-y-3 lg:sticky lg:top-32">
              <h2 className="text-2xl font-bold text-ink">{p.directTitle}</h2>
              <p className="pb-2 whitespace-pre-line text-ink/80">{p.directText}</p>
              {channels.map((ch) => {
                const Tag = ch.href ? "a" : "div";
                return (
                  <Tag
                    key={ch.key}
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
                    {ch.copy && (
                      <CopyButton
                        value={ch.copy}
                        label={dict.common.copy}
                        copiedLabel={dict.common.copied}
                      />
                    )}
                  </Tag>
                );
              })}
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
                <p className="font-semibold whitespace-pre-line text-brand-700">{p.noteText}</p>
                <p className="mt-3 text-sm text-muted">— {p.noteSign}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-[4.5rem]">
        <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-ink">{p.officeTitle}</h2>
            <p className="text-lg font-semibold text-brand-700">{info.legalName}</p>
            <ul className="space-y-4 text-ink/85">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-sun-500" />{" "}
                {tr(contact.address, lang)}
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-sun-500" />
                <span className="space-y-2">
                  {contact.phones.map((ph) => (
                    <span key={ph.raw} className="block">
                      <a href={`tel:${ph.raw}`} className="font-semibold hover:text-brand-600">
                        {ph.number}
                      </a>
                      <span className="block text-sm text-muted">{tr(ph.channels, lang)}</span>
                    </span>
                  ))}
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
              {p.findUs} <ChevronRight className="size-4" />
            </a>
          </div>
          <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-border">
            {/* Bản đồ chỉ nạp khi khách cuộn tới (Google Maps ~600KB JS) */}
            <LazyIframe
              title="Vietlook Travel – Google Maps"
              src={
                lang === "zh"
                  ? maps.embed.replace("hl=en", "hl=zh-CN")
                  : lang === "vi"
                    ? maps.embed.replace("hl=en", "hl=vi")
                    : maps.embed
              }
              className="h-[420px] w-full"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Container>
      </section>
    </>
  );
}
