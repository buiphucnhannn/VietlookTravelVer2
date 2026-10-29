import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Landmark } from "lucide-react";
import { lp, tr } from "@/i18n/config";
import { Container, Reveal } from "@/components/ui";
import DrumLogo from "./DrumLogo";

// Di tích tiêu biểu Bắc → Trung → Nam (ảnh HD ≥ 2048px trong thư viện dự án)
const monuments = [
  {
    image: "/images/tours/v2/hanoi-32914156.jpg",
    name: { en: "Ho Chi Minh Mausoleum", zh: "胡志明陵" },
    place: { en: "Hanoi", zh: "河内" },
  },
  {
    image: "/images/tours/hd/bai-dinh.jpg",
    name: { en: "Bai Dinh Pagoda", zh: "拜订寺" },
    place: { en: "Ninh Binh", zh: "宁平" },
  },
  {
    image: "/images/tours/v2/hue-36847479.jpg",
    name: { en: "Hue Imperial City", zh: "顺化皇城" },
    place: { en: "Hue", zh: "顺化" },
  },
  {
    image: "/images/tours/v2/hoi-an-92090.jpg",
    name: { en: "Hoi An Ancient Town", zh: "会安古镇" },
    place: { en: "Quang Nam", zh: "广南" },
  },
  {
    image: "/images/tours/v2/hoi-an-20605047.jpg",
    name: { en: "My Son Sanctuary", zh: "美山圣地" },
    place: { en: "Quang Nam", zh: "广南" },
  },
  {
    image: "/images/tours/v2/nha-trang-20316070.jpg",
    name: { en: "Long Son Pagoda", zh: "龙山寺" },
    place: { en: "Nha Trang", zh: "芽庄" },
  },
];

/**
 * Khối "trống đồng chuyển động" (mục 6.5 + 6.3): hoa văn trống đồng xoay, vòng chữ quanh logo
 * Vietlook, 6 ảnh di tích Việt Nam bay vòng quanh. Là một khối trên trang chủ – KHÔNG phải màn chặn.
 * Hiệu ứng luôn chạy, kể cả khi Windows/trình duyệt bật giảm chuyển động.
 */
export default function HeritageDrum({ lang, dict }) {
  const t = dict.home;
  const n = monuments.length;
  return (
    <section className="relative isolate overflow-hidden bg-forest-900 py-14 text-white lg:py-[4.5rem]">
      {/* vầng sáng ấm phía sau trống */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_50%,rgba(197,115,59,0.35),transparent_55%)]" />
      <Container className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <p className="text-xs font-bold tracking-[0.18em] text-amber-brand uppercase sm:text-sm">
            {t.heritageEyebrow}
          </p>
          <h2 className="heading-lg mt-3 text-white">{t.heritageTitle}</h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">{t.heritageText}</p>
          <ul className="mt-7 grid max-w-xl grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {monuments.map((m) => (
              <li key={m.image} className="flex items-start gap-2">
                <Landmark className="mt-0.5 size-4 shrink-0 text-amber-brand" />
                <span>
                  <span className="font-semibold text-white">{tr(m.name, lang)}</span>
                  <span className="block text-white/60">{tr(m.place, lang)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={`${lp(lang)}/destinations`}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-clay-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-clay-600"
          >
            {t.heritageCta} <ArrowRight className="size-4" />
          </Link>
        </Reveal>

        {/* Trống đồng + quỹ đạo di tích */}
        <div className="relative mx-auto aspect-square w-full max-w-[540px]">
          {/* nền trống: đĩa kem */}
          <div className="absolute inset-[16%] rounded-full bg-cream-50 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] ring-8 ring-white/5" />
          <div className="absolute inset-[16%] grid place-items-center">
            <DrumLogo size={360} className="!h-full !w-full" />
          </div>

          {/* quỹ đạo: cả vòng xoay chậm, từng ảnh xoay ngược để luôn đứng thẳng */}
          <div className="absolute inset-0 animate-spin-orbit">
            <span className="absolute inset-[6%] rounded-full border border-dashed border-white/20" />
            {monuments.map((m, i) => {
              const a = (360 / n) * i - 90;
              const x = 50 + 44 * Math.cos((a * Math.PI) / 180);
              const y = 50 + 44 * Math.sin((a * Math.PI) / 180);
              return (
                <span
                  key={m.image}
                  className="absolute size-[19%] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <span className="block size-full animate-spin-orbit-reverse">
                    <span className="relative block size-full overflow-hidden rounded-full shadow-xl ring-4 ring-amber-brand/80">
                      <Image
                        src={m.image}
                        alt={tr(m.name, lang)}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    </span>
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
