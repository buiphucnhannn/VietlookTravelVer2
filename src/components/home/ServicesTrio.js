import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Car, Map, Stamp } from "lucide-react";
import { Container, Reveal, SectionHeading } from "@/components/ui";
import { lp } from "@/i18n/config";

/**
 * 3 danh mục chính của web (yêu cầu khách 31/10, mục 2 + 9): rõ ràng, ẢNH THẬT, dễ bấm.
 * ẢNH THẬT CỦA VIETLOOK (yêu cầu khách): Tour – thung lũng Bảo Lạc, Cao Bằng (ảnh tour web cũ vietlooktravel.com; bỏ ảnh du thuyền vì sản phẩm không còn);
 * Xe – Kia Carnival thật của Vietlook cạnh hàng xe, giữ biển số (ảnh nét nhất trong kho rent-car);
 * Visa/Fast-track – nhân viên cầm biển "VIETLOOK TRAVEL – WELCOME" tại sân bay.
 * Ảnh đã cắt sẵn đúng khung 16:10 của thẻ và phóng to/làm nét (public/images/services/svc-*.webp).
 * - Cả thẻ là 1 liên kết lớn; nút hành động màu đỏ thương hiệu luôn hiển thị.
 */
export default function ServicesTrio({ lang, dict }) {
  const s = dict.home.services;
  const items = [
    {
      key: "tours",
      icon: Map,
      href: `${lp(lang)}/tours`,
      image: "/images/services/svc-tour-cao-bang.webp",
      position: "object-center",
    },
    {
      key: "car",
      icon: Car,
      href: `${lp(lang)}/car-rental`,
      image: "/images/services/svc-car-vietlook-carnival.webp",
      position: "object-center",
    },
    {
      key: "visa",
      icon: Stamp,
      href: `${lp(lang)}/visa-fast-track`,
      image: "/images/services/svc-visa-welcome.webp",
      position: "object-[50%_30%]",
    },
  ];

  return (
    <section className="bg-cream-50 py-14 lg:py-[4.5rem]">
      <Container>
        <SectionHeading
          eyebrow={dict.home.servicesEyebrow}
          title={dict.home.servicesTitle}
          subtitle={dict.home.servicesSubtitle}
        />
        <div className="rail grid gap-6 md:grid-cols-3">
          {items.map((it, i) => {
            const data = s[it.key];
            return (
              <Reveal key={it.key} delay={i * 90}>
                <Link
                  href={it.href}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_50px_-30px_rgba(60,40,10,0.55)] ring-1 ring-sand-300/60 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(60,40,10,0.7)] hover:ring-sun-500/50"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={it.image}
                      alt={data.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 85vw"
                      className={`object-cover transition-transform duration-700 group-hover:scale-105 ${it.position}`}
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                    <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/95 py-1.5 pr-4 pl-1.5 text-sm font-bold text-ink shadow-lg">
                      <span className="grid size-8 place-items-center rounded-full bg-sun-500 text-white">
                        <it.icon className="size-4" />
                      </span>
                      0{i + 1}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-xl font-bold tracking-tight text-ink group-hover:text-sun-600 sm:text-[1.35rem]">
                      {data.title}
                    </h3>
                    <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-muted">
                      {data.text}
                    </p>
                    <span className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-sun-500 font-semibold text-white shadow-md shadow-sun-500/25 transition-colors group-hover:bg-sun-600">
                      {data.cta}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
