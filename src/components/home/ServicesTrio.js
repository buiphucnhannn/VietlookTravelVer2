import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Car, Map, Stamp } from "lucide-react";
import { Container, Reveal, SectionHeading } from "@/components/ui";
import { lp } from "@/i18n/config";

export default function ServicesTrio({ lang, dict }) {
  const s = dict.home.services;
  const items = [
    {
      key: "tours",
      icon: Map,
      href: `${lp(lang)}/tours`,
      image: "/images/tours/hd/emperor-cruises.jpg",
      tone: "from-forest-900/80",
    },
    {
      key: "car",
      icon: Car,
      href: `${lp(lang)}/car-rental`,
      car: "/images/rent-car/cutouts/kia-carnival-open.webp",
    },
    {
      key: "visa",
      icon: Stamp,
      href: `${lp(lang)}/visa-fast-track`,
      image: "/images/tours/welcome-vietlook.png",
      tone: "from-sun-700/80",
      position: "object-[50%_30%]",
    },
  ];

  return (
    <section className="py-14 lg:py-[4.5rem]">
      <Container>
        <SectionHeading
          eyebrow={dict.home.servicesEyebrow}
          title={dict.home.servicesTitle}
          subtitle={dict.home.servicesSubtitle}
        />
        <div className="rail grid gap-5 md:grid-cols-3">
          {items.map((it, i) => {
            const data = s[it.key];
            return (
              <Reveal key={it.key} delay={i * 90}>
                <Link
                  href={it.href}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_50px_-28px_rgba(15,62,95,0.55)] ring-1 ring-border transition duration-300 hover:-translate-y-1.5"
                >
                  <div className="relative h-44 overflow-hidden">
                    {it.car ? (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,#3b98d3,#0f4870_70%)]">
                        {/* Mặt đường: vạch kẻ chỉ chạy khi rê chuột, xe đứng yên ở giữa – cảm giác xe đang lăn bánh */}
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-forest-900/55" />
                        <div className="absolute inset-x-0 bottom-[18px] h-[3px] animate-road bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.55)_0_28px,transparent_28px_60px)] bg-[length:120px_3px] [animation-play-state:paused] group-hover:[animation-play-state:running]" />
                        <span className="absolute bottom-6 left-1/2 h-3 w-[62%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-md transition-all duration-500 group-hover:w-[58%] group-hover:bg-black/35" />
                        <Image
                          src={it.car}
                          alt=""
                          width={477}
                          height={261}
                          className="absolute bottom-4 left-1/2 w-[60%] -translate-x-1/2 transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.04]"
                        />
                      </div>
                    ) : (
                      <>
                        <Image
                          src={it.image}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className={`object-cover transition-transform duration-700 group-hover:scale-105 ${it.position || ""}`}
                        />
                        <span
                          className={`absolute inset-0 bg-gradient-to-t ${it.tone} to-transparent`}
                        />
                      </>
                    )}
                    <span className="absolute top-4 left-4 grid size-11 place-items-center rounded-xl bg-white text-forest-700 shadow-lg">
                      <it.icon className="size-5" />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-xl font-bold tracking-tight text-ink">{data.title}</h3>
                    <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-muted">
                      {data.text}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 font-semibold text-sun-500">
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
