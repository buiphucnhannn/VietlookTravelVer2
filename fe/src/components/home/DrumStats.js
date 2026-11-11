import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Car, Map, MapPin, Plane, Star } from "lucide-react";
import { lp, tr } from "@/i18n/config";
import { siteConfig } from "@/constants/site";
import { getCatalog } from "@/lib/catalog";
import { Container, Reveal } from "@/components/ui";
import CountUp from "@/components/ui/CountUp";
import { cn } from "@/lib/utils";

/**
 * "Vietlook in numbers" – chủ đề SƠN MÀI & ĐỒNG:
 * nền sơn mài đỏ thẫm, trống đồng Đông Sơn màu đồng (Demo 3) xoay chậm ở tâm; 6 con số thật
 * nằm TRÊN một quỹ đạo nét đứt bao quanh trống (có chấm sáng chạy vòng) → trống, quỹ đạo và
 * con số gắn liền thành một hình. Mỗi con số dẫn tới trang liên quan.
 * Desktop: bố cục quỹ đạo; mobile: trống + lưới 2 cột.
 */

// Góc đặt 6 con số trên quỹ đạo (độ, 0° = bên phải, chiều kim đồng hồ). 3 phải · 3 trái.
const ANGLES = [-140, 180, 140, -40, 0, 40];

export default async function DrumStats({ lang, dict }) {
  const { allTours, destinations, home, fleet, allPackages } = await getCatalog();
  const t = dict.home;
  const p = lp(lang);
  // Tự tính từ dữ liệu CMS (Visa & fast-track, Xe & khu vực) thay cho số để cứng:
  // số sân bay có giá fast-track, số chỗ của xe nhỏ nhất – lớn nhất
  const airports = new Set(
    allPackages().flatMap((x) =>
      Object.entries(x.prices ?? {})
        .filter(([, v]) => v != null)
        .map(([code]) => code),
    ),
  ).size;
  const seats = fleet.map((f) => f.seats).filter(Boolean);
  const minSeats = seats.length ? Math.min(...seats) : 0;
  const maxSeats = seats.length ? Math.max(...seats) : 0;
  const stats = [
    {
      icon: CalendarCheck,
      value: siteConfig.since,
      label: { en: "Operating since", zh: "创立于", vi: "Hoạt động từ năm" },
      href: `${p}/about`,
    },
    {
      icon: Map,
      value: allTours.length,
      suffix: "+",
      label: { en: "Tours & packages", zh: "条线路与套餐", vi: "Tour & gói du lịch" },
      href: `${p}/tours`,
    },
    {
      icon: MapPin,
      value: destinations.length,
      label: {
        en: "Destinations, North to South",
        zh: "个目的地 · 从北到南",
        vi: "Điểm đến từ Bắc vào Nam",
      },
      href: `${p}/destinations`,
    },
    {
      icon: Plane,
      value: airports,
      label: {
        en: "Airports with fast-track",
        zh: "个机场提供快速通关",
        vi: "Sân bay có dịch vụ fast-track",
      },
      href: `${p}/visa-fast-track`,
    },
    {
      icon: Car,
      value: maxSeats,
      prefix: minSeats && minSeats !== maxSeats ? `${minSeats}–` : "",
      label: {
        en: "Seats – cars to coaches",
        zh: "座 · 从轿车到大巴",
        vi: "Chỗ – từ xe con đến xe khách",
      },
      href: `${p}/car-rental`,
    },
    {
      icon: Star,
      value: siteConfig.tripadvisorRating.score,
      decimals: 1,
      suffix: "★",
      label: {
        en: `Tripadvisor · ${siteConfig.tripadvisorRating.reviews} reviews`,
        zh: `猫途鹰 · ${siteConfig.tripadvisorRating.reviews} 条评价`,
        vi: `Tripadvisor · ${siteConfig.tripadvisorRating.reviews} đánh giá`,
      },
      href: siteConfig.social.tripadvisor,
      external: true,
    },
  ].map((s, i) => ({
    ...s,
    // Nhãn / con số đã sửa trong CMS → Trang chủ (trống → nhãn mặc định, con số tự động)
    label: t.heritageStats?.[i]?.label || s.label,
    text: (home.statValues?.[i] ?? "").trim(),
  }));

  return (
    <section className="relative isolate overflow-hidden bg-[#2a0f0b] py-16 text-cream-50 lg:py-20">
      {/* Nền sơn mài: vầng sáng đỏ son ở tâm, tối dần ra mép + vân tròn rất mờ */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_58%,#7a2216_0%,#4a160f_38%,#2a0f0b_72%)]" />
      <div className="absolute inset-0 -z-10 bg-[repeating-radial-gradient(circle_at_50%_58%,rgba(247,179,43,0.05)_0_1px,transparent_1px_34px)]" />
      {/* Viền vàng mảnh trên/dưới – tách khối rõ ràng với các khối nền kem bên cạnh */}
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-brand/60 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-brand/60 to-transparent" />

      <Container>
        <header className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold tracking-[0.25em] text-amber-brand uppercase sm:text-sm">
            {t.heritageEyebrow}
          </p>
          <h2 className="heading-lg text-white">{t.heritageTitle}</h2>
          <p className="mt-4 text-base text-cream-100/75 sm:text-lg">{t.heritageText}</p>
        </header>

        {/* ===== Desktop: quỹ đạo ===== */}
        <div className="relative mx-auto mt-6 hidden h-[540px] max-w-[1180px] [--drum:310px] [--r:220px] lg:block xl:h-[680px] xl:[--drum:430px] xl:[--r:300px]">
          <Orbit />
          <div className="absolute top-1/2 left-1/2 size-(--drum) -translate-x-1/2 -translate-y-1/2">
            <Drum lang={lang} className="relative size-full" />
          </div>
          {stats.map((s, i) => (
            <OrbitStat key={s.href} stat={s} angle={ANGLES[i]} lang={lang} delay={i * 90} />
          ))}
        </div>

        {/* ===== Mobile / tablet: trống + lưới ===== */}
        <div className="mt-10 lg:hidden">
          <Drum lang={lang} className="relative mx-auto aspect-square w-full max-w-[320px]" />
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((s, i) => (
              <Reveal as="li" key={s.href} delay={i * 70}>
                <StatLink
                  stat={s}
                  className="flex h-full flex-col items-center gap-2 rounded-2xl border border-amber-brand/30 bg-white/5 p-4 text-center"
                >
                  <StatIcon stat={s} />
                  <StatText stat={s} lang={lang} />
                </StatLink>
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

/** Quỹ đạo nét đứt + chấm sáng chạy vòng (nối các con số với nhau và với trống). */
function Orbit() {
  return (
    <svg
      aria-hidden
      viewBox="-100 -100 200 200"
      className="absolute top-1/2 left-1/2 size-[calc(var(--r)*2)] -translate-x-1/2 -translate-y-1/2 overflow-visible"
    >
      <defs>
        <radialGradient id="drum-stats-spark">
          <stop offset="0%" stopColor="#ffe3a3" />
          <stop offset="100%" stopColor="#f7b32b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle
        r="100"
        fill="none"
        stroke="#f7b32b"
        strokeOpacity="0.35"
        strokeWidth="0.5"
        strokeDasharray="1.6 2.4"
      />
      <circle r="91" fill="none" stroke="#f7b32b" strokeOpacity="0.12" strokeWidth="0.35" />
      {/* 2 chấm sáng chạy ngược chiều nhau trên quỹ đạo */}
      <g>
        <circle r="3.2" fill="url(#drum-stats-spark)" />
        <animateMotion
          dur="14s"
          repeatCount="indefinite"
          path="M100,0 A100,100 0 1,1 -100,0 A100,100 0 1,1 100,0"
        />
      </g>
      <g>
        <circle r="2.4" fill="url(#drum-stats-spark)" />
        <animateMotion
          dur="20s"
          repeatCount="indefinite"
          path="M-100,0 A100,100 0 1,0 100,0 A100,100 0 1,0 -100,0"
        />
      </g>
    </svg>
  );
}

/** Trống đồng màu đồng xoay chậm + vòng chữ + logo ở tâm. */
function Drum({ lang, className }) {
  return (
    <Reveal className={className}>
      {/* Hào quang vàng phía sau trống */}
      <span className="absolute inset-[-10%] rounded-full bg-[radial-gradient(circle,rgba(247,179,43,0.35),rgba(247,179,43,0.08)_45%,transparent_70%)]" />
      <Image
        src="/images/drum/trong-dong-bronze.webp"
        alt={tr(
          {
            en: "Dong Son bronze drum pattern",
            zh: "东山铜鼓纹样",
            vi: "Hoa văn trống đồng Đông Sơn",
          },
          lang,
        )}
        width={753}
        height={754}
        sizes="(min-width: 1024px) 430px, 80vw"
        className="absolute inset-0 size-full animate-spin-slower brightness-125 drop-shadow-[0_0_24px_rgba(247,179,43,0.35)] saturate-125"
      />
      {/* Vòng chữ quanh logo, xoay ngược chiều trống */}
      <svg viewBox="0 0 200 200" aria-hidden className="absolute inset-[25%] animate-spin-reverse">
        <defs>
          <path id="drum-stats-ring" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" />
        </defs>
        <circle cx="100" cy="100" r="98" fill="#2a0f0b" stroke="#f7b32b" strokeOpacity="0.6" />
        <text fontSize="13.5" fontWeight="800" letterSpacing="2.4" fill="#f7b32b">
          <textPath href="#drum-stats-ring" textLength="500" lengthAdjust="spacingAndGlyphs">
            VIETLOOK TRAVEL • SINCE 2009 • NORTH • CENTRE • SOUTH •
          </textPath>
        </text>
      </svg>
      <span className="absolute inset-[37.5%] grid place-items-center rounded-full bg-white shadow-[0_0_0_4px_rgba(247,179,43,0.5),0_12px_30px_-8px_rgba(0,0,0,0.6)]">
        <Image
          src="/images/logo/vietlook-icon.png"
          alt="Vietlook Travel"
          width={210}
          height={210}
          className="h-auto w-[74%]"
        />
      </span>
    </Reveal>
  );
}

/** Một con số đặt trên quỹ đạo: nút tròn nằm đúng trên vòng, nhãn hướng ra ngoài. */
function OrbitStat({ stat, angle, lang, delay }) {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad).toFixed(4);
  const sin = Math.sin(rad).toFixed(4);
  const right = Math.cos(rad) > 0;
  return (
    <Reveal
      delay={delay}
      className="absolute"
      style={{
        left: `calc(50% + var(--r) * ${cos})`,
        top: `calc(50% + var(--r) * ${sin})`,
      }}
    >
      <StatLink
        stat={stat}
        className={cn(
          "absolute top-0 flex -translate-y-1/2 items-center gap-4",
          right ? "left-0 -translate-x-[28px]" : "right-0 translate-x-[28px] flex-row-reverse",
        )}
      >
        <StatIcon stat={stat} />
        {/* Đường nối từ nút ra nhãn */}
        <span
          aria-hidden
          className={cn(
            "h-px w-8 shrink-0 bg-gradient-to-r",
            right ? "from-amber-brand/70 to-transparent" : "from-transparent to-amber-brand/70",
          )}
        />
        <span className={cn("w-44 xl:w-56", right ? "text-left" : "text-right")}>
          <StatText stat={stat} lang={lang} align={right ? "left" : "right"} />
        </span>
      </StatLink>
    </Reveal>
  );
}

function StatLink({ stat, className, children }) {
  const cls = cn("group", className);
  return stat.external ? (
    <a href={stat.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={stat.href} className={cls}>
      {children}
    </Link>
  );
}

function StatIcon({ stat }) {
  const Icon = stat.icon;
  return (
    <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-[#2a0f0b] text-amber-brand ring-2 ring-amber-brand/70 transition duration-300 group-hover:scale-110 group-hover:bg-amber-brand group-hover:text-[#2a0f0b]">
      <span className="absolute inset-[-6px] rounded-full border border-amber-brand/25" />
      <Icon className="size-6" />
    </span>
  );
}

function StatText({ stat, lang, align }) {
  return (
    <>
      <span className="block text-3xl leading-none font-extrabold tracking-tight text-white xl:text-4xl">
        {stat.text ? (
          stat.text
        ) : (
          <>
            {stat.prefix}
            <CountUp value={stat.value} decimals={stat.decimals} />
            {stat.suffix && <span className="text-amber-brand">{stat.suffix}</span>}
          </>
        )}
      </span>
      <span
        className={cn(
          "mt-1.5 flex items-center gap-1 text-sm font-medium text-cream-100/75 group-hover:text-amber-brand",
          align === "right" && "justify-end",
          !align && "justify-center",
        )}
      >
        {tr(stat.label, lang)}
        <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
      </span>
    </>
  );
}
