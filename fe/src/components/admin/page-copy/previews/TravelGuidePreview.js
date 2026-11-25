"use client";

import { useContext, useEffect, useState } from "react";
import { ChevronRight, Newspaper, Search, Share2, Tags } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { siteConfig } from "@/constants/site";
import { api } from "@/lib/api";
import { AutoNote } from "../../home/shared";
import { Img, ModuleNote, PageCopyContext, Sec, Shown, Txt } from "../blocks";

/**
 * Bản xem trước trang Cẩm nang du lịch (app/[lang]/travel-guide/page.js → components/guide/GuideIndex.js):
 * đầu trang (tiêu đề nét cọ + giới thiệu + chuyên mục) → thanh lọc + ô tìm kiếm → lưới bài viết → nút xem thêm.
 * Bài viết, chuyên mục, ảnh nền đầu trang (ảnh bài viết): dữ liệu của mục Bài viết / Chuyên mục → chỉ hiện.
 * Chữ thanh lọc / tìm kiếm / nút xem thêm dùng chung cho trang từng chuyên mục.
 */

const loc = (v, lang) => v?.[lang] || v?.en || "";
const host = (() => {
  try {
    return new URL(siteConfig.url).hostname;
  } catch {
    return "";
  }
})();

/** Chuyên mục đang hiện trên website (chỉ để mô phỏng; lỗi mạng → không hiện chip) */
function useCategories() {
  const [cats, setCats] = useState(null);
  useEffect(() => {
    let alive = true;
    api("/public/taxonomy")
      .then((r) => alive && setCats(r.data?.categories ?? []))
      .catch(() => alive && setCats([]));
    return () => {
      alive = false;
    };
  }, []);
  return cats;
}

/** Thẻ bài viết mô phỏng (bài thật: mục Bài viết) */
function PostMock() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-border">
      <span className="block aspect-[16/11] bg-gradient-to-br from-cream-100 to-sand-300/50" />
      <div className="space-y-1.5 p-3">
        <span className="block h-2 w-12 rounded bg-sun-500/40" />
        <span className="block h-2.5 w-full rounded bg-slate-200" />
        <span className="block h-2.5 w-3/4 rounded bg-slate-200" />
        <span className="block h-2 w-1/2 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function TravelGuidePreview() {
  const lang = useContext(PageCopyContext)?.lang ?? "vi";
  const cats = useCategories();
  return (
    <>
      {/* ========== Đầu trang ========== */}
      <Sec
        name="Đầu trang"
        dark
        className="bg-[radial-gradient(ellipse_at_30%_0%,#1f4f73,#0b1b2b_70%)] text-white sm:pb-10"
      >
        <div className="flex min-h-[250px] flex-col items-center justify-center text-center sm:min-h-[290px]">
          <p className="mb-3 flex max-w-full items-center gap-1 text-[11px] text-white/75">
            Vietlook <ChevronRight className="size-3 shrink-0" />{" "}
            <span className="truncate text-white">
              <Shown f="heroTitle" />
            </span>
          </p>
          <Txt
            f="heroTitle"
            dark
            className="brush text-2xl font-extrabold tracking-tight drop-shadow-md [--brush-color:var(--color-clay-600)] sm:text-[2.4rem]"
          />
          <Txt
            f="heroIntro"
            dark
            className="mt-4 max-w-2xl text-[13px] font-semibold drop-shadow-md sm:text-[15px]"
          />
          <div className="mt-4 flex max-w-2xl flex-wrap justify-center gap-1.5">
            {(cats ?? []).map((c) => (
              <span
                key={c.slug}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/30"
              >
                {loc(c.name, lang)}
              </span>
            ))}
          </div>
          <AutoNote dark className="mt-4" href={`${ADMIN_BASE}/taxonomy`} linkText="Sửa chuyên mục">
            Ảnh nền tự lấy từ ảnh các bài viết; tên chuyên mục ở mục Chuyên mục & tác giả.
          </AutoNote>
        </div>
      </Sec>

      {/* ========== Danh sách bài viết ========== */}
      <Sec name="Danh sách bài viết" className="bg-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
              <Txt f="allCategories" dark />
            </span>
            {(cats ?? []).slice(0, 4).map((c) => (
              <span
                key={c.slug}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink/80"
              >
                {loc(c.name, lang)}
              </span>
            ))}
            {cats?.length > 4 && (
              <span className="px-1 py-1.5 text-xs text-slate-400">+{cats.length - 4}</span>
            )}
          </div>
          <label className="flex h-10 items-center gap-2 rounded-full border border-border bg-white px-3.5 text-ink/60 lg:w-72">
            <Search className="size-4 shrink-0" />
            <Txt f="searchPlaceholder" className="text-xs" />
          </label>
        </div>

        <ModuleNote
          icon={Newspaper}
          title="Các bài viết: ảnh, chuyên mục, tiêu đề, tóm tắt, ngày đăng"
          text="Hiện tự động 8 bài mới nhất, khách bấm nút bên dưới để xem thêm."
          href={`${ADMIN_BASE}/articles`}
          linkText="Sửa bài viết ở mục Bài viết"
          className="mt-5"
        >
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <PostMock key={i} />
            ))}
          </div>
        </ModuleNote>

        <div className="mt-5 text-center">
          <span className="inline-flex rounded-md bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white">
            <Txt f="loadMore" dark />
          </span>
        </div>

        <div className="mt-6 rounded-2xl bg-surface p-5 text-center">
          <p className="mb-1.5 flex items-center justify-center gap-1.5 text-[10.5px] font-semibold tracking-wide text-slate-400 uppercase">
            <Tags className="size-3.5" /> Khi khách tìm không thấy bài nào
          </p>
          <Txt f="noResults" className="text-[13px] text-muted" />
        </div>
      </Sec>

      {/* ========== Khi chia sẻ link ========== */}
      <Sec name="Khi chia sẻ link trang" className="bg-slate-50">
        <div className="mx-auto grid max-w-3xl items-center gap-5 md:grid-cols-[1.1fr_1fr]">
          <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200">
            <Img f="shareImage" aspect="aspect-[1200/630]" className="[&_img]:rounded-none" />
            <div className="border-t border-slate-100 px-3.5 py-2.5 text-left">
              <p className="text-[10px] tracking-wide text-slate-400 uppercase">{host}</p>
              <p className="truncate text-[13px] font-bold text-slate-800">
                <Shown f="heroTitle" />
              </p>
              <p className="line-clamp-2 text-[11.5px] text-slate-500">
                <Shown f="heroIntro" />
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 text-left">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Share2 className="size-[18px]" />
            </span>
            <p className="text-sm font-semibold text-slate-700">
              Khung hiện khi gửi link trang qua Facebook, Zalo, WhatsApp…
            </p>
            <p className="text-xs leading-relaxed text-slate-500">
              Tiêu đề và mô tả lấy từ tiêu đề trang và đoạn giới thiệu ở trên. Ảnh nên là ảnh ngang
              (tỉ lệ khoảng 2:1).
            </p>
          </div>
        </div>
      </Sec>
    </>
  );
}
