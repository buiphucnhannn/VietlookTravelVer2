import Image from "next/image";
import Link from "next/link";
import BgImage from "@/components/ui/BgImage";
import { siteConfig } from "@/constants/site";
import { Container } from "@/components/ui";
import SpinBadge from "@/components/ui/SpinBadge";
import YouTubeLite from "@/components/ui/YouTubeLite";
import { lp } from "@/i18n/config";
import { DEFAULT_HOME_IMAGES } from "./images";

/**
 * Khối "About us" kiểu localvietnam: ảnh blob + video giới thiệu.
 * `imageSlot`: chỉ bản xem trước CMS (nút đổi ảnh phủ lên ảnh) — website không truyền.
 */
export default function AboutBlob({ lang, dict, image = DEFAULT_HOME_IMAGES.about, imageSlot }) {
  const t = dict.home;
  return (
    <section className="relative isolate overflow-hidden bg-surface py-14 lg:py-[4.5rem]">
      <BgImage src="/images/tours/v2/hanoi-33622716.jpg" tone="side" />
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="heading-xl text-ink">{t.aboutTitle}</h2>
          <p className="mt-4 text-lg font-medium text-forest-700">{t.aboutSubtitle}</p>
          <span className="mt-5 block h-[3px] w-16 rounded-full bg-forest-700" />
          <p className="mt-6 text-lg leading-relaxed text-ink/80">{t.aboutText}</p>
          <Link
            href={`${lp(lang)}/about`}
            className="mt-7 inline-block text-lg font-medium text-forest-700 underline underline-offset-4 hover:text-sun-500"
          >
            {t.aboutCta}
          </Link>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <SpinBadge className="absolute top-[8%] right-0 z-10 sm:right-2" />
          <div className="blob relative aspect-square overflow-hidden shadow-2xl">
            <Image
              src={image}
              alt=""
              fill
              // khung vòm tối đa 576px (max-w-xl)
              sizes="(min-width: 640px) 576px, 92vw"
              className="object-cover"
            />
            {/* CMS → Trang chủ: nút đổi ảnh nằm trên ảnh (chỉ có trong bản xem trước) */}
            {imageSlot}
          </div>
          <div className="absolute -bottom-6 left-0 w-[62%] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white sm:-left-10">
            <YouTubeLite
              id={siteConfig.youtubeIds[0]}
              title="Discovering the timeless beauty with Vietlook Travel"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
