import Image from "next/image";
import BgImage from "@/components/ui/BgImage";
import B2BSlides from "./B2BSlides";
import {
  CheckCircle2,
  Clock4,
  Handshake,
  Headphones,
  Layers,
  MapPinned,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button, Container, Reveal, SectionHeading } from "@/components/ui";
import { lp } from "@/i18n/config";

const whyIcons = [Layers, Wallet, MapPinned, ShieldCheck, Headphones, Handshake];

export function WhyUs({ dict }) {
  const t = dict.home;
  return (
    <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
      <BgImage src="/images/tours/v2/sapa-6872795.jpg" tone="light" />
      <Container>
        <SectionHeading title={t.whyTitle} subtitle={t.whySubtitle} />
        <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {t.why.map((w, i) => {
            const Icon = whyIcons[i];
            return (
              <Reveal key={w.title} delay={(i % 3) * 80} className="flex gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-forest-700 to-forest-700 text-white shadow-lg shadow-forest-700/25">
                  <Icon className="size-6" />
                </span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-ink">{w.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{w.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

// Ảnh di sản Bắc → Nam cho 2 khung viền cọ (ảnh từ thư viện Vietlook, ≥1920px)
// Mỗi khung một bộ ảnh RIÊNG (không ảnh nào chung) → 2 khung không bao giờ trùng ảnh.
// Khung lớn: miền Bắc · khung nhỏ: miền Trung & Nam – thể hiện dịch vụ toàn Việt Nam.
const northImages = [
  "/images/b2b/emperor-cruises.webp",
  "/images/b2b/tam-coc-bich-dong.webp",
  "/images/tours/v2/sapa-235925.jpg",
];
const centralSouthImages = [
  "/images/b2b/hoi-an-9-copy.webp",
  "/images/b2b/da-nang.webp",
  "/images/b2b/phu-quoc.webp",
];

/**
 * Khối B2B theo phong cách Demo 1 (yêu cầu khách 31/10, mục 8): nền ảnh du thuyền Hạ Long phủ tối,
 * 2 khung ảnh viền cọ đổi ảnh luân phiên + 2 huy hiệu số liệu; bên phải thông điệp B2B rõ ràng:
 * đối tượng (agencies, OTA, MICE), giá net, báo giá trong 24h.
 */
export function B2BBlock({ lang, dict }) {
  const t = dict.home;
  const audiences =
    lang === "zh"
      ? ["旅行社", "OTA平台", "会奖（MICE）", "批发商"]
      : ["Travel agencies", "OTAs", "MICE organisers", "Tour operators"];
  return (
    <section
      id="b2b"
      className="relative isolate scroll-mt-28 overflow-hidden bg-brand-950 py-14 text-white lg:py-[4.5rem]"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/images/b2b/tourduthuyenhalong1ngay1-2.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-950/70 to-brand-950/35" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(23,128,193,0.4),transparent_50%),radial-gradient(circle_at_90%_90%,rgba(238,59,53,0.25),transparent_45%)]" />

      <Container className="relative grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="relative mx-auto h-[320px] w-full max-w-lg sm:h-[440px]">
          <B2BSlides
            images={northImages}
            mask="/images/b2b/brush-mask.svg"
            interval={4800}
            className="top-0 left-0 h-[66%] w-[70%]"
          />
          {/* Cùng nhịp nhưng lệch nửa chu kỳ → 2 khung không đổi ảnh cùng lúc */}
          <B2BSlides
            images={centralSouthImages}
            mask="/images/b2b/brush-mask-2.svg"
            interval={4800}
            startDelay={2400}
            className="right-0 bottom-0 h-[60%] w-[64%] animate-float"
          />
          {/* Huy hiệu: thời gian báo giá */}
          <div className="absolute bottom-[8%] left-[4%] flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-ink shadow-xl">
            <Clock4 className="size-8 text-sun-500" />
            <div className="leading-tight">
              <p className="text-2xl font-extrabold">24h</p>
              <p className="text-xs text-muted">{lang === "zh" ? "报价回复" : "quote turnaround"}</p>
            </div>
          </div>
          {/* Huy hiệu: quy mô đoàn */}
          <div className="absolute top-[10%] right-[3%] rounded-xl bg-sun-500 px-4 py-3 text-center shadow-xl">
            <p className="text-2xl font-extrabold">2–200+</p>
            <p className="text-xs text-white/90">{dict.common.paxGroup}</p>
          </div>
        </Reveal>

        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-amber-brand uppercase">
            {t.b2bEyebrow}
          </p>
          <h2 className="mt-3 text-4xl leading-[1.08] font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
            {t.b2bTitle}
          </h2>
          {/* Đối tượng đối tác – thể hiện rõ hướng B2B */}
          <ul className="mt-5 flex flex-wrap gap-2">
            {audiences.map((a) => (
              <li
                key={a}
                className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-sm font-semibold text-white backdrop-blur"
              >
                {a}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-lg leading-relaxed text-white/85">{t.b2bText}</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {t.b2bPoints.map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-brand" />
                <span className="text-white/90">{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href={`${lp(lang)}/partners`} variant="cta" size="lg" className="bg-sun-500 hover:bg-sun-600">
              <Handshake className="size-5" /> {t.b2bCta}
            </Button>
            <Button href={`${lp(lang)}/group-tailor-made-tours`} variant="outline-white" size="lg">
              {dict.nav.groupTours}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
