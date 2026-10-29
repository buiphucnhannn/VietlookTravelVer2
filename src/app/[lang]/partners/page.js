import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import { Bus, Clock, FileSignature, Headset, Percent, Stamp } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata } from "@/lib/seo";
import { Container, Reveal, SectionHeading } from "@/components/ui";
import { BannerHero } from "@/components/ui/PageHero";
import ContactForm from "@/components/forms/ContactForm";
import { href } from "@/i18n/config";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/partners",
    title: dict.partners.title,
    description: dict.partners.intro,
  });
}

/** Trang dành cho đại lý / đối tác B2B. */
export default async function PartnersPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = dict.partners;
  const c = {
    ...dict.common,
    fullName: dict.tour.fullName,
    phone: dict.tour.phone,
    message: dict.contact.message,
  };
  const icons = [Percent, Clock, FileSignature, Bus, Stamp, Headset];

  return (
    <>
      <BannerHero
        title={p.title}
        subtitle={p.subtitle}
        images={[
          "/images/tours/v2/halong-bay-5531592.jpg",
          "/images/tours/v2/halong-bay-58597.jpg",
          "/images/tours/v2/phu-quoc-26742974.jpg",
        ]}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: dict.nav.partners }]}
      />
      <Container className="py-10 text-center lg:py-12">
        <p className="mx-auto max-w-4xl text-xl leading-snug font-medium text-ink sm:text-2xl">
          {p.intro}
        </p>
      </Container>

      <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
        <BgImage src="/images/tours/hd/emperor-cruises.jpg" tone="light" />
        <Container>
          <SectionHeading title={p.offerTitle} />
          <div className="rail grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {p.offers.map((o, i) => {
              const Icon = icons[i];
              return (
                <Reveal key={o.title} delay={(i % 3) * 80} className="rounded-3xl bg-surface p-7">
                  <span className="grid size-12 place-items-center rounded-xl bg-brand-600 text-white">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-ink">{o.title}</h3>
                  <p className="mt-1.5 text-muted">{o.text}</p>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="bg-brand-950 py-14 lg:py-[4.5rem]">
        <Container className="grid gap-10 lg:grid-cols-2">
          {/* Bento: ảnh lớn trái + 2 ảnh phải + 1 ảnh ngang dưới; cả cụm cao đúng bằng form bên cạnh */}
          <div className="grid h-[420px] grid-cols-2 grid-rows-[1fr_1fr_0.9fr] gap-4 sm:h-[560px] lg:h-full">
            {[
              ["/images/tours/hd/emperor-cruises.jpg", "row-span-2"],
              ["/images/tours/v2/nha-trang-32089687.jpg", ""],
              ["/images/tours/v2/nha-trang-5116343.jpg", ""],
              ["/images/tours/v2/nha-trang-261715.jpg", "col-span-2"],
            ].map(([src, span]) => (
              <div key={src} className={`relative overflow-hidden rounded-3xl ${span}`}>
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          <div className="rounded-3xl bg-white p-6 sm:p-8">
            <ContactForm
              lang={lang}
              t={{ ...p, formText: p.intro }}
              c={c}
              type="partner"
              extraFields={[
                { key: "company", label: p.company },
                { key: "country", label: p.country },
                { key: "website", label: p.website },
                { key: "volume", label: p.volume },
              ]}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
