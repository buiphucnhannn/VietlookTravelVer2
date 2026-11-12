import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { href, tr } from "@/i18n/config";
import { regions } from "@/data/regions";
import { Button, Container } from "@/components/ui";
import {
  FacebookIcon,
  GoogleMapsIcon,
  TripAdvisorIcon,
  WeChatIcon,
  WhatsAppIcon,
  ZaloIcon,
} from "@/components/ui/BrandIcons";
import Logo from "./Logo";
import { CookieSettingsLink } from "./ConsentBanner";

export default function Footer({ lang, dict, policies }) {
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
  // Chỉ hiện trang đang bật "Hiện trên website" trong CMS (policies: các trang đã xuất bản)
  const legalLinks = [
    { key: "terms", label: n.termsPolicy },
    { key: "privacy", label: n.privacyPolicy },
    { key: "payment", label: n.paymentPolicy },
    { key: "cancellation", label: n.cancelPolicy },
  ]
    .filter((l) => !policies || policies[l.key])
    .map(({ key, label }) => ({ label, href: h(`/policies/${key}`) }));
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
                icon: GoogleMapsIcon,
                label: "Google Maps",
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

      {/* Chân trang chính – NỀN SÁNG (yêu cầu khách 05/11: vùng nền đen bị chìm → nền sáng).
          Nền "bình minh": kem ấm (trái) → xanh trời nhạt (phải) theo 2 màu logo; dưới cùng là dãy núi đá
          vôi cách điệu nối liền với dải pháp lý xanh nhạt. */}
      <div className="relative isolate overflow-hidden bg-[linear-gradient(115deg,#fffaf1_0%,#fbf7f0_38%,#eaf5fc_100%)] text-ink/75">
        <div
          aria-hidden
          className="h-1 bg-gradient-to-r from-sun-500 via-amber-brand to-brand-500"
        />
        <svg
          aria-hidden
          viewBox="0 0 1440 220"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-20 w-full sm:h-24"
        >
          <circle cx="1185" cy="70" r="34" fill="#f7b32b" opacity="0.16" />
          <path
            fill="#e2f0fa"
            d="M0 220V150C60 150 80 90 130 90S190 140 230 140 290 60 340 60 400 130 450 130 520 100 570 100 640 40 700 40 760 120 820 120 890 80 950 80 1020 140 1080 140 1150 70 1210 70 1270 120 1330 120 1400 90 1440 90V220Z"
          />
          <path
            fill="var(--color-brand-100)"
            d="M0 220V185C70 185 100 150 160 150S240 180 300 180 380 130 450 130 540 175 610 175 700 145 770 145 860 185 930 185 1010 120 1080 120 1160 170 1230 170 1320 140 1380 140L1440 160V220Z"
          />
        </svg>
        <Container className="relative flex flex-col items-start justify-between gap-6 border-b border-brand-200/60 py-4 sm:flex-row sm:items-center">
          <Logo lang={lang} />
          <div className="flex items-center gap-3">
            {/* Logo mạng xã hội giữ ĐÚNG MÀU THƯƠNG HIỆU (theo bộ nhận diện chính thức của từng hãng) */}
            {[
              {
                icon: FacebookIcon,
                href: social.facebook,
                label: "Facebook",
                cls: "size-6 text-[#0866FF]",
              },
              { icon: TripAdvisorIcon, href: social.tripadvisor, label: "Tripadvisor", owl: true },
              { icon: GoogleMapsIcon, href: social.google, label: "Google Maps", cls: "size-6" },
              {
                icon: WhatsAppIcon,
                href: messaging.whatsapp,
                label: "WhatsApp",
                cls: "size-6 text-[#25D366]",
              },
              { icon: ZaloIcon, href: messaging.zalo, label: "Zalo", cls: "size-7" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid size-10 place-items-center rounded-full bg-white shadow-sm ring-1 ring-brand-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-200"
              >
                {s.owl ? (
                  // Tripadvisor: cú đen trên nền tròn xanh #34E0A1 (logo chính thức)
                  <span className="grid size-7 place-items-center rounded-full bg-[#34E0A1]">
                    <s.icon className="size-5 text-black" />
                  </span>
                ) : (
                  <s.icon className={s.cls} />
                )}
              </a>
            ))}
          </div>
        </Container>

        <Container className="relative grid gap-8 pt-7 pb-20 sm:grid-cols-2 sm:pb-16 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="relative mb-5 pb-2.5 text-base font-bold tracking-wide text-brand-700 uppercase after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-8 after:rounded-full after:bg-sun-500">
                {col.title}
              </h3>
              <ul className="space-y-3 leading-snug">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="transition-colors hover:text-sun-600">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="relative mb-5 pb-2.5 text-base font-bold tracking-wide text-brand-700 uppercase after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-8 after:rounded-full after:bg-sun-500">
              {f.contact}
            </h3>
            <ul className="space-y-4 text-sm leading-relaxed">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-sun-500" />
                <span>{tr(contact.address, lang)}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-sun-500" />
                <span>
                  <a
                    href={`tel:${contact.hotlineRaw}`}
                    className="font-semibold text-ink hover:text-sun-600"
                  >
                    {contact.hotline}
                  </a>
                  <span className="block text-xs text-muted">
                    {tr(contact.channels.hotline, lang)}
                  </span>
                  <a
                    href={`tel:${contact.hotline2Raw}`}
                    className="mt-2 block font-semibold text-ink hover:text-sun-600"
                  >
                    {contact.hotline2}
                  </a>
                  <span className="block text-xs text-muted">{contact.channels.hotline2}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-sun-500" />
                <a href={`mailto:${contact.email}`} className="break-all hover:text-sun-600">
                  {contact.email}
                </a>
              </li>
              <li className="flex gap-3">
                <WeChatIcon className="mt-0.5 size-4 shrink-0 text-sun-500" />
                <span>
                  {lang === "zh" ? "微信号" : "WeChat ID"}: {messaging.wechatId}
                </span>
              </li>
            </ul>
          </div>
        </Container>
      </div>
      <div className="-mt-px bg-brand-100 text-sm text-ink/70">
        {/* Tầng 1: link pháp lý (trái) · phương thức thanh toán (phải) */}
        <Container className="flex flex-col items-center gap-4 border-b border-brand-200 py-3.5 md:flex-row md:justify-between">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-start md:gap-x-0">
            {legalLinks.map((l, i) => (
              <li key={l.href} className="flex items-center whitespace-nowrap">
                {i > 0 && (
                  <span aria-hidden className="mx-3 hidden text-ink/25 md:inline">
                    ·
                  </span>
                )}
                <Link href={l.href} className="transition-colors hover:text-sun-600">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-2" aria-label={f.payments}>
            <span className="mr-1 text-xs whitespace-nowrap">{f.payments}:</span>
            {/* Cổng thanh toán duy nhất: 9Pay (logo chính thức từ 9pay.vn) */}
            <span className="flex h-10 items-center rounded-lg bg-white px-3 shadow-sm ring-1 ring-brand-200">
              <Image
                src="/images/logo/9pay.svg"
                alt="9Pay"
                width={179}
                height={72}
                className="h-7 w-auto"
              />
            </span>
          </div>
        </Container>
        {/* Tầng 2: bản quyền – mobile xếp dọc từng dòng (không tràn ngang); từ md nối 1 hàng, ngắt theo cụm */}
        <Container className="flex flex-col items-center gap-1 pt-3 pb-20 text-center text-xs text-muted sm:pb-3 md:flex-row md:flex-wrap md:justify-center md:gap-x-2">
          <span className="md:whitespace-nowrap">
            © {siteConfig.since}–2026 {siteConfig.legalName}. {f.rights}
          </span>
          <span aria-hidden className="hidden text-ink/25 md:inline">
            ·
          </span>
          <span className="md:whitespace-nowrap">
            {f.businessNo}: {legal.businessNo || f.updating}
          </span>
          <span aria-hidden className="hidden text-ink/25 md:inline">
            ·
          </span>
          <span className="break-words md:whitespace-nowrap">
            {f.licenceNo}: {legal.licenceNo || f.updating}
          </span>
          {/* chỉ hiện khi website có cài mã Google (banner cookie đang bật) */}
          <CookieSettingsLink
            label={dict.consent.reopen}
            className="underline-offset-2 hover:text-ink hover:underline md:ml-2"
          />
        </Container>
      </div>
    </footer>
  );
}
