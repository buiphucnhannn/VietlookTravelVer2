"use client";

import { BgPhoto, Sec, Txt } from "../blocks";

/**
 * Bản xem trước Trang không tìm thấy (app/[lang]/not-found.js) — khách thấy khi mở link sai / trang đã xoá.
 * Số "404" lớn giữ cố định. Trang 404 ngoài mọi ngôn ngữ (global-not-found.js) là trang tĩnh 3 thứ tiếng.
 */
export default function NotFoundPreview() {
  return (
    <Sec name="Toàn trang" dark className="bg-brand-950 text-white">
      <BgPhoto f="image" fade="bg-brand-950/65" title="Ảnh nền" />
      <div className="flex min-h-[22rem] flex-col items-center justify-center py-10 text-center sm:min-h-[26rem]">
        <p className="text-7xl font-extrabold tracking-tighter sm:text-8xl">404</p>
        <Txt f="title" dark className="mt-3 text-2xl font-bold sm:text-3xl" />
        <Txt f="text" dark className="mt-3 max-w-md text-sm text-white/80 sm:text-base" />
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <span className="inline-flex h-11 items-center rounded-md bg-clay-500 px-6 text-[0.95rem] font-semibold text-white shadow-sm">
            <Txt f="homeButton" dark />
          </span>
          <span className="inline-flex h-11 items-center rounded-md border-2 border-white/80 px-6 text-[0.95rem] font-semibold text-white">
            <Txt f="toursButton" dark />
          </span>
        </div>
      </div>
    </Sec>
  );
}
