"use client";

import { ADMIN_BASE } from "@/config/urls.mjs";
import { Container } from "@/components/ui";
import { ImagePill, Txt, usePlain } from "../blocks";
import { CONTACT_SETTINGS_HREF } from "./site-shared";
import { AutoChip, SiteFooter, SiteHeader, SitePage, Zone } from "./site-frame";

/**
 * Bản xem trước "Đầu & chân trang" — dựng bằng đúng Header + Footer của website (components/layout).
 * Sửa được: dòng giới thiệu thanh trên cùng, chữ link B2B, nút lên kế hoạch, dải "biết đến chúng tôi qua",
 * dải mời lên kế hoạch (ảnh + chữ + nút), tiêu đề 4 cột, chữ trước logo thanh toán, câu bản quyền.
 * Chỉ xem: số điện thoại, email, địa chỉ, WeChat, mạng xã hội (CMS → Cài đặt → Thông tin liên hệ); tên các mục menu
 * & link (cấu trúc điều hướng, giữ cố định).
 */

const SETTINGS = `${ADMIN_BASE}${CONTACT_SETTINGS_HREF}`;

export default function GlobalPreview({ lang }) {
  const plain = usePlain();
  const header = {
    dmc: <Txt f="topTagline" dark />,
    partners: <Txt f="partnersLabel" dark />,
    planTrip: <Txt f="planTrip" dark />,
  };
  const footer = {
    knowUs: <Txt f="knowUs" dark />,
    ctaTitle: <Txt f="ctaTitle" dark />,
    ctaText: <Txt f="ctaText" dark />,
    ctaButton: <Txt f="ctaButton" dark />,
    colAbout: <Txt f="colAbout" />,
    colServices: <Txt f="colServices" />,
    colCompany: <Txt f="colCompany" />,
    colContact: <Txt f="colContact" />,
    payments: <Txt f="payments" />,
    rights: <Txt f="rights" />,
    ctaImage: plain("ctaImage"),
    ctaPhoto: plain("ctaPhoto"),
  };
  return (
    <SitePage lang={lang} path="/" chrome={false}>
      {/* 1. Đầu trang trên ảnh đầu trang (trang chủ, trang dịch vụ…): trong suốt */}
      <Zone name="Đầu trang · trên ảnh đầu trang" dark at="left-3 bottom-3">
        <SiteHeader lang={lang} path="/" edit={header} />
        <div className="relative isolate h-[300px] overflow-hidden bg-brand-950 lg:h-[340px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh minh hoạ nền sau header */}
          <img
            src="/images/tours/hd/ha-long.jpg"
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/25 to-black/50" />
          <p className="absolute inset-x-0 bottom-14 [zoom:var(--pz,1)] text-center font-sans text-sm text-white/80">
            Ảnh minh hoạ — mỗi trang dùng ảnh đầu trang riêng
          </p>
        </div>
      </Zone>

      {/* 2. Đầu trang nền trắng (khi cuộn xuống, trang tour, trang cảm ơn) */}
      <Zone name="Đầu trang · khi cuộn xuống / trang không có ảnh" at="left-3 bottom-3">
        <SiteHeader lang={lang} path="/thank-you" edit={header} />
        <div className="h-16 lg:h-[108px]" />
        <div className="h-28 bg-cream-50" />
      </Zone>

      {/* 3. Chân trang */}
      <Zone name="Chân trang (mọi trang)" dark at="right-3 top-[4.5rem]">
        <div className="relative z-10 border-y border-dashed border-slate-300 bg-slate-50 py-2">
          <Container className="flex flex-wrap items-center gap-2">
            <span className="[zoom:var(--pz,1)] font-sans text-xs font-semibold text-slate-500">
              Ảnh dải mời lên kế hoạch:
            </span>
            <ImagePill f="ctaImage" floating={false} title="Ảnh nền" />
            <ImagePill f="ctaPhoto" floating={false} title="Ảnh nhỏ nghiêng" />
            <AutoChip
              href={SETTINGS}
              label="Điện thoại, email, địa chỉ, mạng xã hội · sửa ở Cài đặt"
              className="ml-auto"
            />
          </Container>
        </div>
        <SiteFooter lang={lang} edit={footer} />
      </Zone>
    </SitePage>
  );
}
