import Image from "next/image";
import Link from "next/link";
import { lp, tr } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Hình "dải lụa xoắn" (lấy từ Demo 3 theo yêu cầu khách 31/10, mục 3): dải lụa vàng xoắn thành
 * ngôi sao 5 cánh, mỗi cánh là ảnh một điểm đến (cắt theo clip-path), logo Vietlook ở tâm.
 * Toạ độ/clip-path tính theo khung 1534×1635 của ảnh dải lụa (frame.webp).
 */
const petals = [
  {
    slug: "halong-bay",
    image: "/images/ribbon/top.webp",
    name: { en: "Ha Long Bay", zh: "下龙湾", vi: "Vịnh Hạ Long" },
    box: [37.03, 11.68, 31.94, 32.97],
    clip: "24.5% 0%,16.3% 0.9%,8.8% 8.9%,3.5% 19.7%,0.2% 35.1%,0.2% 51.2%,3.9% 71.6%,8.4% 87%,11.6% 95.2%,15.1% 99.3%,17.1% 99.8%,44.9% 93.9%,55.7% 86.5%,67.6% 79.6%,96.7% 65.5%,99.8% 62.7%,95.5% 55.1%,83.3% 38.8%,74.3% 28.9%,63.7% 19.1%,51.2% 9.8%,42.7% 5%,34.1% 1.7%",
  },
  {
    slug: "hue",
    image: "/images/ribbon/ul.webp",
    name: { en: "Hue Imperial City", zh: "顺化皇城", vi: "Kinh thành Huế" },
    box: [3.06, 24.22, 35.46, 33.27],
    clip: "79.4% 0%,66.9% 2.9%,43.4% 10.5%,28.9% 16.2%,18.6% 21.1%,12.9% 24.6%,5.1% 31.4%,1.5% 36.8%,0.2% 40.6%,0.2% 45.4%,3.1% 52.4%,9.6% 60.8%,18% 69.3%,26.8% 76.5%,41.4% 86.4%,66.5% 99.8%,76.8% 98%,91.9% 93%,96% 91%,98.3% 88.6%,98.9% 86.8%,99.8% 73%,89.2% 44.5%,85.1% 31.6%,81.4% 14.2%,81.1% 1.7%",
  },
  {
    slug: "ninh-binh",
    image: "/images/ribbon/ur.webp",
    name: { en: "Trang An, Ninh Binh", zh: "宁平长安", vi: "Tràng An, Ninh Bình" },
    box: [54.63, 29.3, 42.18, 24.71],
    clip: "99.2% 13.1%,97.7% 8.4%,94.9% 4%,88.1% 0.7%,75.7% 0.2%,59.7% 5.2%,45.7% 13.1%,25.7% 29%,10.8% 44.8%,5.1% 52.2%,0% 60.6%,7.4% 74%,11.4% 86.9%,13.1% 89.6%,37.2% 94.1%,54.6% 99.5%,66.5% 99.8%,74% 89.9%,81.1% 78.5%,85.6% 70%,91.7% 56.2%,95.8% 44.3%,98.9% 31.2%,99.8% 21.5%",
  },
  {
    slug: "da-nang",
    image: "/images/ribbon/lr.webp",
    name: { en: "Golden Bridge, Da Nang", zh: "岘港金桥", vi: "Cầu Vàng, Đà Nẵng" },
    box: [50.26, 56.15, 47.46, 28.99],
    clip: "1.1% 29.5%,0% 36.3%,0.4% 38.6%,2.2% 41.4%,58.7% 93.5%,66.2% 98.3%,70.7% 99.8%,74.2% 99.8%,79.1% 97.7%,83% 93.5%,86.8% 87.3%,90.4% 79.3%,93.5% 69.2%,97.1% 52.5%,99.2% 37.1%,99.9% 23.6%,97.8% 16.9%,94.2% 10.8%,91.3% 7.6%,85.9% 4.2%,80.2% 2.1%,71.2% 0.4%,48.1% 0%,35.4% 2.1%,21.2% 8%,16.9% 11.2%,11.7% 19%,6.5% 24.3%,2.9% 26.8%",
  },
  {
    slug: "hoi-an",
    image: "/images/ribbon/ll.webp",
    name: { en: "Hoi An Ancient Town", zh: "会安古镇", vi: "Phố cổ Hội An" },
    box: [2.15, 60.06, 52.54, 27.89],
    clip: "0.1% 82.7%,1.5% 89%,4.2% 94.1%,6.6% 96.7%,11% 98.9%,15.5% 99.8%,23.4% 99.8%,37.2% 97.6%,44.9% 95.4%,61.8% 87.5%,76.8% 76.8%,89.5% 64.9%,97.1% 55.9%,99.9% 51.5%,97.9% 48.7%,74.3% 30.5%,30.9% 0%,24.9% 7.2%,18.5% 18.2%,13.9% 27.4%,7.4% 43.4%,4.7% 51.3%,1.1% 65.8%,0.1% 74.6%",
  },
  // Mảnh nhỏ nối liền với cánh Hội An (giữa 2 vòng lụa)
  {
    slug: "hoi-an",
    image: "/images/ribbon/ll.webp",
    name: { en: "Hoi An Ancient Town", zh: "会安古镇", vi: "Phố cổ Hội An" },
    box: [31.62, 57.61, 11.6, 6.06],
    clip: "0% 25.3%,7.3% 37.4%,83.1% 96%,94.4% 99%,99.4% 89.9%,78.7% 38.4%,56.2% 1%,49.4% 0%,6.2% 15.2%",
    sliver: true,
  },
  {
    slug: "sapa",
    image: "/images/ribbon/bottom.webp",
    name: { en: "Sapa rice terraces", zh: "沙坝梯田", vi: "Ruộng bậc thang Sa Pa" },
    box: [19.75, 74.98, 69.36, 22.75],
    clip: "99.9% 51.3%,99.1% 48.9%,95.6% 47.3%,92.1% 44.1%,53% 0%,43.1% 18.8%,29.9% 37.6%,25.6% 42.5%,14.1% 52.7%,0.9% 60.8%,0% 63.4%,2% 68%,8.6% 77.2%,14.6% 83.6%,21.7% 89.5%,29.6% 94.4%,44.9% 99.2%,52.9% 99.7%,59.9% 98.7%,70.1% 94.9%,81% 86.8%,87.2% 79.3%,91.5% 72.3%,96.5% 61.6%",
  },
];

export default function RibbonStar({ lang, className }) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[1534/1635] w-full max-w-[540px] drop-shadow-[0_18px_30px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      {/* Nền giấy dó viền xé */}
      <Image
        src="/images/ribbon/paper.webp"
        alt=""
        width={1100}
        height={1166}
        aria-hidden
        className="pointer-events-none absolute max-w-none drop-shadow-[0_10px_18px_rgba(90,60,20,0.25)]"
        style={{ left: "-4.56%", top: "-4.28%", width: "109.13%", height: "108.56%" }}
      />

      {petals.map((p, i) => {
        const [left, top, width, height] = p.box;
        const name = tr(p.name, lang);
        return (
          <Link
            key={i}
            href={`${lp(lang)}/destinations/${p.slug}`}
            aria-label={name}
            tabIndex={p.sliver ? -1 : undefined}
            className="group absolute block"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
              clipPath: `polygon(${p.clip})`,
            }}
          >
            <Image
              src={p.image}
              alt={p.sliver ? "" : name}
              fill
              sizes="(min-width: 1024px) 380px, 60vw"
              className="object-cover transition duration-700 ease-out group-hover:scale-110 group-hover:brightness-110 group-hover:saturate-125"
            />
            {!p.sliver && (
              <span className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm sm:text-sm">
                  {name}
                </span>
              </span>
            )}
          </Link>
        );
      })}

      {/* Logo Vietlook ở tâm ngôi sao (đứng yên – theo yêu cầu bỏ hình tròn xoay) */}
      <div
        className="pointer-events-none absolute"
        style={{ left: "38.14%", top: "43.3%", width: "22.03%", height: "20.8%" }}
      >
        <span className="relative block aspect-square size-full rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
          <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
            <defs>
              <path
                id="ribbon-logo-ring"
                d="M 100,100 m -79,0 a 79,79 0 1,1 158,0 a 79,79 0 1,1 -158,0"
              />
            </defs>
            <circle cx="100" cy="100" r="96" fill="none" stroke="#1780c1" strokeWidth="3" />
            <circle cx="100" cy="100" r="66" fill="none" stroke="#ee3b35" strokeWidth="1.5" />
            <text fontSize="17" fontWeight="800" letterSpacing="1.5">
              <textPath href="#ribbon-logo-ring" textLength="490" lengthAdjust="spacingAndGlyphs">
                <tspan fill="#1780c1">VIETLOOK</tspan> <tspan fill="#ee3b35">TRAVEL</tspan>{" "}
                <tspan fill="#1780c1">•</tspan> <tspan fill="#1780c1">VIETLOOK</tspan>{" "}
                <tspan fill="#ee3b35">TRAVEL</tspan> <tspan fill="#1780c1">•</tspan>
              </textPath>
            </text>
          </svg>
          <Image
            src="/images/ribbon/logo-mark.webp"
            alt="Vietlook Travel"
            width={210}
            height={210}
            className="absolute top-1/2 left-1/2 w-[63%] -translate-x-1/2 -translate-y-1/2"
          />
        </span>
      </div>

      {/* Dải lụa vàng phủ lên trên cùng */}
      <Image
        src="/images/ribbon/frame.webp"
        alt=""
        width={1534}
        height={1635}
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
      />
    </div>
  );
}
