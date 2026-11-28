"use client";

import Button from "@/components/ui/Button";
import { Container } from "@/components/ui";
import { Photo, Txt } from "../blocks";
import { SitePage, Zone } from "./site-frame";

/**
 * Bản xem trước Trang không tìm thấy — dựng y như app/[lang]/not-found.js (khách thấy khi mở link sai / trang đã
 * xoá), có đầu & chân trang như website. Số "404" lớn giữ cố định.
 */
export default function NotFoundPreview({ lang }) {
  return (
    <SitePage lang={lang} path="/page-not-found">
      <Zone name="Trang 404" dark at="left-3 top-20 lg:top-[7.25rem]">
        <section className="relative isolate overflow-hidden bg-brand-950 text-white">
          <Photo f="image" className="-z-10 [&_img]:opacity-35" hero title="Ảnh nền" />
          <Container className="flex min-h-[min(70vh,720px)] flex-col items-center justify-center pt-36 pb-24 text-center">
            <p className="text-8xl font-extrabold tracking-tighter">404</p>
            <h1 className="mt-3 text-3xl font-bold">
              <Txt f="title" dark />
            </h1>
            <p className="mt-3 max-w-md whitespace-pre-line text-white/80">
              <Txt f="text" dark />
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href="#" variant="cta">
                <Txt f="homeButton" dark />
              </Button>
              <Button href="#" variant="outline-white">
                <Txt f="toursButton" dark />
              </Button>
            </div>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
