import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Car, CheckCircle2, Map, Stamp, Users } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { pageMetadata, seoField } from "@/lib/seo";
import { href } from "@/i18n/config";
import { getPageSeo, getPageText } from "@/lib/page-copy/server";
import { cn } from "@/lib/utils";
import { Container, Reveal } from "@/components/ui";
import { BrushHero } from "@/components/ui/PageHero";

// 5 dịch vụ chính theo tài liệu yêu cầu (thứ tự, biểu tượng, trang đích cố định;
// ảnh + chữ sửa được trong CMS → Giao diện trang → Dịch vụ)
const meta = [
  { icon: Users, path: "/group-tailor-made-tours" },
  { icon: Map, path: "/packages" },
  { icon: Car, path: "/car-rental" },
  { icon: Stamp, path: "/visa-fast-track" },
  { icon: BookOpen, path: "/travel-guide" },
];

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = await getPageText("services", lang, dict);
  const seo = await getPageSeo("services"); // CMS → Giao diện trang → Hiển thị trên Google
  return pageMetadata({
    lang,
    path: "/services",
    title: seoField(seo, lang, "title") || p.heroTitle,
    description: seoField(seo, lang, "description") || p.heroSubtitle,
  });
}

/** Trang tổng hợp 5 dịch vụ chính của Vietlook Travel. */
export default async function ServicesPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const p = await getPageText("services", lang, dict);
  const items = p.items.map((item, i) => ({
    ...item,
    image: p.images[i],
    points: p[`points${i}`],
  }));

  return (
    <>
      <BrushHero
        title={p.heroTitle}
        subtitle={p.heroSubtitle}
        images={p.images}
        breadcrumbs={[{ label: "Vietlook", href: href(lang) }, { label: p.heroTitle }]}
      />

      <section className="py-14 lg:py-[4.5rem]">
        <Container>
          <p className="mb-10 text-center text-xs font-bold tracking-[0.18em] text-brand-700 uppercase sm:text-sm lg:mb-14">
            {p.intro}
          </p>

          <div className="space-y-14 lg:space-y-20">
            {items.map((item, i) => {
              const { icon: Icon, path } = meta[i];
              const flip = i % 2 === 1;
              return (
                <Reveal key={i} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                  <Link
                    href={href(lang, path)}
                    className={cn(
                      "group relative block aspect-[16/10] overflow-hidden rounded-3xl shadow-xl",
                      flip && "lg:order-2",
                    )}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-brand-950/40 to-transparent" />
                    <span className="absolute top-5 left-5 font-hand text-6xl leading-none text-white/90 drop-shadow-lg">
                      0{i + 1}
                    </span>
                  </Link>

                  <div>
                    <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                      <Icon className="size-6" />
                    </span>
                    <h2 className="heading-lg mt-5 text-ink">{item.title}</h2>
                    <p className="mt-4 text-lg leading-relaxed whitespace-pre-line text-ink/75">
                      {item.text}
                    </p>
                    <ul className="mt-6 space-y-2.5">
                      {item.points.map((pt, j) => (
                        <li key={j} className="flex items-start gap-3 font-medium text-ink">
                          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-500" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={href(lang, path)}
                      className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-brand-600 px-6 font-semibold text-white shadow-md transition hover:bg-brand-700"
                    >
                      {item.cta}
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
