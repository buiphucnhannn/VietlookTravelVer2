import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { href, tr } from "@/i18n/config";
import { regions } from "@/data/destinations";
import { Button, Container } from "@/components/ui";
import {
  FacebookIcon,
  GoogleIcon,
  JcbIcon,
  MastercardIcon,
  TripAdvisorIcon,
  VisaCardIcon,
  WeChatIcon,
  WhatsAppIcon,
  YouTubeIcon,
  ZaloIcon,
} from "@/components/ui/BrandIcons";
import Logo from "./Logo";

export default function Footer({ lang, dict }) {
  const f = dict.footer;
  const n = dict.nav;
  const h = (p) => href(lang, p);
  const { contact, social, messaging } = siteConfig;

  const columns = [
    {
      title: f.aboutVietnam,
      links: [
        ...regions.map((r) => ({ label: tr(r.name, lang), href: h(`/destinations/${r.slug}`) })),
        { label: n.guideMonths, href: h("/travel-guide/category/vietnam-by-month") },
        { label: n.guideEssentials, href: h("/travel-guide/category/need-to-know") },
        { label: n.guideAll, href: h("/travel-guide") },
      ],
    },
    {
      title: f.ourServices,
      links: [
        { label: n.allPackages, href: h("/packages") },
        { label: n.groupTours, href: h("/group-tailor-made-tours") },
        { label: n.halong, href: h("/halong-bay-cruises") },
        { label: n.carHire, href: h("/car-rental") },
        { label: n.visa, href: h("/visa-fast-track") },
        { label: n.partners, href: h("/partners") },
      ],
    },
    {
      title: f.company,
      links: [
        { label: n.aboutCompany, href: h("/about") },
        { label: n.reviews, href: h("/about#reviews") },
        { label: n.contact, href: h("/contact") },
        { label: n.whyUs, href: h("/about#why") },
      ],
    },
  ];
  // Link pháp lý (mục 27): Điều khoản · Bảo mật · Thanh toán & hoàn tiền · Hủy/đổi
  const legalLinks = [
    { label: n.termsPolicy, href: h("/policies/terms") },
    { label: n.privacyPolicy, href: h("/policies/privacy") },
    { label: n.paymentPolicy, href: h("/policies/payment") },
    { label: n.cancelPolicy, href: h("/policies/cancellation") },
  ];
  const legal = siteConfig.legal || {};

  return (
    <footer className="mt-auto">
      {/* Dải "biết đến chúng tôi qua" */}
      <div className="bg-forest-700 text-white">
        <Container className="flex flex-col items-center justify-between gap-6 py-8 md:flex-row">
          <p className="text-lg font-semibold">{f.knowUs}:</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              {
                icon: TripAdvisorIcon,
                label: "Tripadvisor",
                sub: dict.common.ratingText,
                href: social.tripadvisor,
              },
              {
                icon: GoogleIcon,
                label: "Google",
                sub: dict.common.mapsReviews,
                href: social.google,
              },
              {
                icon: FacebookIcon,
                label: "Facebook",
                sub: "/vietlooktravelhanoi",
                href: social.facebook,
              },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15 transition hover:bg-white/20"
              >
                <span className="grid size-9 place-items-center rounded-full bg-white">
                  <s.icon
                    className={
                      s.label === "Facebook"
                        ? "size-5 text-[#1877f2]"
                        : s.label === "Tripadvisor"
                          ? "size-6 text-[#00af87]"
                          : "size-5"
                    }
                  />
                </span>
                <span className="leading-tight">
                  <span className="block font-semibold">{s.label}</span>
                  <span className="block text-xs text-white/70">{s.sub}</span>
                </span>
              </a>
            ))}
          </div>
        </Container>
      </div>

      {/* Dải CTA */}
      <div className="relative isolate overflow-hidden bg-[#2b3640] text-white">
        <BgImage src="/images/tours/v2/hanoi-33946371.jpg" tone="night" />
        <Container className="grid items-center gap-8 py-12 md:grid-cols-[auto_1fr_auto]">
          <div className="relative hidden h-28 w-44 md:block">
            <Image
              src="/images/tours/v2/halong-bay-1018475.jpg"
              alt=""
              fill
              sizes="176px"
              className="rotate-[-4deg] rounded-xl object-cover shadow-2xl ring-4 ring-white"
            />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{f.ctaTitle}</h2>
            <p className="mt-2 text-white/75">{f.ctaText}</p>
          </div>
          <Button href={h("/plan-your-trip")} variant="cta" size="lg">
            {f.ctaButton}
          </Button>
        </Container>
      </div>

      {/* Chân trang chính */}
      <div className="bg-[#1c2126] text-white/75">
        <Container className="flex flex-col items-start justify-between gap-6 border-b border-white/10 py-6 sm:flex-row sm:items-center">
          <Logo lang={lang} light />
          <div className="flex items-center gap-3">
            {[
              { icon: FacebookIcon, href: social.facebook, label: "Facebook" },
              { icon: TripAdvisorIcon, href: social.tripadvisor, label: "Tripadvisor" },
              { icon: YouTubeIcon, href: social.youtube, label: "YouTube" },
              { icon: WhatsAppIcon, href: messaging.whatsapp, label: "WhatsApp" },
              { icon: ZaloIcon, href: messaging.zalo, label: "Zalo" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:-translate-y-0.5 hover:bg-sun-500"
              >
                <s.icon className="size-5" />
              </a>
            ))}
          </div>
        </Container>

        <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-base font-bold tracking-wide text-white uppercase">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="mb-4 text-base font-bold tracking-wide text-white uppercase">
              {f.contact}
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-sun-400" />
                <span>{tr(contact.address, lang)}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-sun-400" />
                <span>
                  <a
                    href={`tel:${contact.hotlineRaw}`}
                    className="font-semibold text-white hover:underline"
                  >
                    {contact.hotline}
                  </a>
                  <span className="block text-xs text-white/55">
                    Hotline 24/7 · Zalo · WhatsApp · WeChat
                  </span>
                  <a href={`tel:${contact.hotline2Raw}`} className="hover:text-white">
                    {contact.hotline2}
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-sun-400" />
                <a href={`mailto:${contact.email}`} className="break-all hover:text-white">
                  {contact.email}
                </a>
              </li>
              <li className="flex gap-3">
                <WeChatIcon className="mt-0.5 size-4 shrink-0 text-sun-400" />
                <span>WeChat: {messaging.wechatId}</span>
              </li>
            </ul>
          </div>
        </Container>
      </div>
      <div className="bg-[#16191d] text-sm text-white/60">
        {/* Tầng 1: link pháp lý (trái) · phương thức thanh toán (phải) */}
        <Container className="flex flex-col items-center gap-4 border-b border-white/10 py-5 md:flex-row md:justify-between">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-start md:gap-x-0">
            {legalLinks.map((l, i) => (
              <li key={l.href} className="flex items-center whitespace-nowrap">
                {i > 0 && (
                  <span aria-hidden className="mx-3 hidden text-white/25 md:inline">
                    ·
                  </span>
                )}
                <Link href={l.href} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-2" aria-label={f.payments}>
            <span className="mr-1 text-xs whitespace-nowrap">{f.payments}:</span>
            <VisaCardIcon className="h-7 w-auto rounded" />
            <MastercardIcon className="h-7 w-auto rounded" />
            <JcbIcon className="h-7 w-auto rounded" />
          </div>
        </Container>
        {/* Tầng 2: bản quyền – mobile xếp dọc từng dòng (không tràn ngang); từ md nối 1 hàng, ngắt theo cụm */}
        <Container className="flex flex-col items-center gap-1 py-4 text-center text-xs text-white/45 md:flex-row md:flex-wrap md:justify-center md:gap-x-2">
          <span className="md:whitespace-nowrap">
            © {siteConfig.since}–2026 {siteConfig.legalName}. {f.rights}
          </span>
          <span aria-hidden className="hidden text-white/25 md:inline">
            ·
          </span>
          <span className="md:whitespace-nowrap">
            {f.businessNo}: {legal.businessNo || f.updating}
          </span>
          <span aria-hidden className="hidden text-white/25 md:inline">
            ·
          </span>
          <span className="break-words md:whitespace-nowrap">
            {f.licenceNo}: {legal.licenceNo || f.updating}
          </span>
        </Container>
      </div>
    </footer>
  );
}
