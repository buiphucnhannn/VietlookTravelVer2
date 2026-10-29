import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { lp } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/constants/site";
import { Container } from "@/components/ui";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import ThankYouCode from "@/components/forms/ThankYouCode";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    ...pageMetadata({
      lang,
      path: "/thank-you",
      title: dict.thanks.title,
      description: dict.thanks.text,
    }),
    // Trang đích chuyển đổi (Google Ads) – không cho lập chỉ mục
    robots: { index: false, follow: false },
  };
}

/**
 * Trang cảm ơn sau khi gửi form (tài liệu mục 3: "trang cảm ơn sau form") – URL riêng để
 * Google Ads/GA4 đo chuyển đổi. Mã yêu cầu nhận qua ?code=...
 */
export default async function ThankYouPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.thanks;
  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center bg-cream-50 py-8 lg:min-h-[calc(100svh-6.75rem)] short:py-4">
      <Container className="max-w-3xl text-center">
        <CheckCircle2 className="mx-auto size-14 text-forest-700 short:size-12" strokeWidth={1.5} />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-forest-900 sm:text-[2.6rem] sm:leading-tight lg:[text-wrap:nowrap] short:mt-4 short:text-[2.2rem]">
          {t.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink/75 sm:text-lg short:mt-4">
          {t.text}
        </p>
        <Suspense fallback={null}>
          <ThankYouCode
            labels={{ yourRequestCode: dict.common.yourRequestCode, copy: dict.common.copy }}
          />
        </Suspense>
        <p className="mx-auto mt-8 max-w-lg text-sm leading-relaxed text-ink/70 short:mt-6">
          <Clock className="mr-1.5 inline size-4 -translate-y-px text-clay-600" />
          <span>
            {t.step1} {t.step2}
          </span>
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4 short:mt-7">
          <a
            href={siteConfig.messaging.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#25d366] px-6 font-semibold text-white transition hover:brightness-105"
          >
            <WhatsAppIcon className="size-5" /> {t.whatsapp}
          </a>
          <Link
            href={`${lp(lang)}/tours`}
            className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-forest-700 ring-1 ring-forest-700 transition hover:bg-forest-700 hover:text-white"
          >
            {t.browse}
          </Link>
        </div>
      </Container>
    </section>
  );
}
