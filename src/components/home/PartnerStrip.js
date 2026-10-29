import Image from "next/image";

// Logo WebP lossless, nền trong suốt, đã cắt sát viền (chuẩn hoá bằng scripts/partner-logos.mjs).
// w = bề rộng tương ứng chiều cao 160px; big = logo dạng khối/xếp chồng → cho cao hơn để cân thị giác.
// Danh sách cần Vietlook xác nhận (tài liệu mục 9 #6).
const L = (f) => `/images/partners/${f}.webp`;
export const partners = [
  { name: "Vietnam Airlines", logo: L("vietnam-airlines"), w: 434, big: true },
  { name: "VietJet Air", logo: L("vietjet"), w: 918 },
  { name: "Bamboo Airways", logo: L("bamboo"), w: 643 },
  { name: "Sun World", logo: L("sunworld"), w: 496 },
  { name: "Vinpearl", logo: L("vinpearl"), w: 279, big: true },
  { name: "Paradise Vietnam", logo: L("paradise"), w: 472 },
  { name: "Emperor Cruises", logo: L("emperor"), w: 225, big: true },
];

/**
 * Dải "đối tác tiêu biểu đồng hành" – làm theo dải đối tác của dự án TranDuyMedia:
 * nền kem đậm, 1 dòng tiêu đề ngắn in hoa + logo đặt thẳng trên nền (không khung/badge),
 * tự lướt ngang liên tục; rê chuột → dừng, logo đang trỏ nở to, nổi lên và hiện tên.
 * Đặt ngay dưới phần đầu trang chủ (tài liệu mục 4: "logo các đối tác lớn để chung").
 */
export default function PartnerStrip({ title }) {
  // Một nửa track (7 ô × 290px) dài hơn khung 1920px → lặp 2 lần cho vòng liền mạch
  const row = [...partners, ...partners];
  return (
    <section
      className="relative overflow-hidden bg-cream-100 pt-10 pb-3 sm:pt-12 sm:pb-4"
      aria-labelledby="partners-title"
    >
      <h2
        id="partners-title"
        className="px-5 text-center text-xl font-bold tracking-tight text-balance text-forest-900 uppercase sm:text-2xl lg:text-[1.75rem]"
      >
        {title}
      </h2>

      {/* 2 mép mờ dần vào nền cho mềm */}
      <div className="marquee mt-2 [mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent)] sm:mt-3">
        <div className="mx-auto max-w-[1920px] overflow-hidden">
          <ul className="marquee-track" style={{ "--marquee-duration": "22s" }}>
            {row.map((p, i) => (
              // ô bề rộng cố định thay cho gap → 2 nửa track nối nhau không bị lệch
              <li
                key={i}
                aria-hidden={i >= partners.length ? "true" : undefined}
                className="group relative flex h-[110px] w-[170px] shrink-0 items-center justify-center sm:h-[150px] sm:w-[290px]"
              >
                <Image
                  src={p.logo}
                  alt={p.name}
                  width={p.w}
                  height={160}
                  sizes="240px"
                  className={`h-auto w-auto max-w-[130px] object-contain ${
                    p.big ? "max-h-14 sm:max-h-[68px]" : "max-h-10 sm:max-h-[46px]"
                  } opacity-90 transition-[opacity,transform,filter,scale,translate] duration-[1100ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-2 group-hover:scale-[1.3] group-hover:opacity-100 group-hover:drop-shadow-[0_10px_18px_rgba(60,40,10,0.2)] sm:max-w-[170px]`}
                />
                <span className="pointer-events-none absolute inset-x-2 bottom-1.5 translate-y-1 truncate text-center text-[12px] font-semibold text-ink opacity-0 transition-[opacity,translate,transform] delay-150 duration-700 ease-out group-hover:translate-y-0 group-hover:opacity-100 sm:bottom-3">
                  {p.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
