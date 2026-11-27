"use client";

import { Accessibility, ArrowRight, Ear, HandHeart } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import Button from "@/components/ui/Button";
import { Container } from "@/components/ui";
import { AutoNote } from "../../home/shared";
import { ListOf, Txt } from "../blocks";
import { SitePage, Zone } from "./site-frame";

/**
 * Bản xem trước "Khối du lịch không rào cản" — dựng y như components/ui/AccessibleTravel.js:
 *   1. khối lớn (Trang chủ, Giới thiệu): dòng nhỏ · tiêu đề · giới thiệu · nút · dòng nhỏ dưới nút (tuỳ chọn) · 3 thẻ
 *   2. dải gọn (Tour nhóm & thiết kế riêng): tiêu đề + mô tả dải + chữ nút (dùng chung tiêu đề / nút với khối lớn)
 * Biểu tượng 3 thẻ cố định theo vị trí (xe lăn, tai, bàn tay) — giống trang thật.
 */

const ICONS = [Accessibility, Ear, HandHeart];

export default function AccessPreview({ lang }) {
  return (
    <SitePage lang={lang} path="/" chrome={false}>
      {/* ========== Khối lớn: Trang chủ + Giới thiệu ========== */}
      <Zone name="Khối trên Trang chủ & Giới thiệu">
        <section className="py-14 lg:py-[4.5rem]">
          <Container>
            <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-cream-50 p-6 ring-1 ring-brand-100 sm:p-10 lg:p-12">
              <Accessibility
                aria-hidden
                className="pointer-events-none absolute -top-10 -right-10 -z-10 size-56 text-brand-100/70 sm:size-72"
                strokeWidth={1.2}
              />
              <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14">
                <div>
                  <p className="text-xs font-bold tracking-[0.18em] text-clay-600 uppercase">
                    <Txt f="eyebrow" />
                  </p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance text-ink sm:text-4xl">
                    <Txt f="title" />
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed whitespace-pre-line text-ink/80">
                    <Txt f="text" />
                  </p>
                  <Button href="#" variant="primary" className="mt-7">
                    <Txt f="cta" dark />
                  </Button>
                  {/* dòng nhỏ dưới nút: tuỳ chọn — để trống thì website không hiện */}
                  <p className="mt-3 max-w-md text-sm leading-relaxed whitespace-pre-line text-muted">
                    <Txt
                      f="note"
                      placeholder="Bấm để thêm dòng nhỏ dưới nút (để trống = không hiện)"
                    />
                  </p>
                </div>
                <ul className="grid gap-4">
                  <ListOf f="points">
                    {(i) => {
                      const Icon = ICONS[i] ?? HandHeart;
                      return (
                        <li
                          key={i}
                          className="flex items-start gap-4 rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-border"
                        >
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
                            <Icon className="size-6" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold tracking-tight text-ink">
                              <Txt f={`points.${i}.title`} />
                            </h3>
                            <p className="mt-1 leading-relaxed whitespace-pre-line text-muted">
                              <Txt f={`points.${i}.text`} />
                            </p>
                          </div>
                        </li>
                      );
                    }}
                  </ListOf>
                </ul>
              </div>
            </div>
          </Container>
        </section>
      </Zone>

      {/* ========== Dải gọn: Tour nhóm & thiết kế riêng ========== */}
      <Zone name="Dải gọn trên trang Tour nhóm & thiết kế riêng">
        <Container className="border-t border-dashed border-slate-200 py-10 text-center">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-2xl bg-brand-50/70 p-5 text-left ring-1 ring-brand-100 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
            <span className="flex shrink-0 items-center gap-1.5" aria-hidden>
              {ICONS.map((Icon, i) => (
                <span
                  key={i}
                  className="grid size-11 place-items-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-brand-100"
                >
                  <Icon className="size-5" />
                </span>
              ))}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">
                <Txt f="title" />
              </p>
              <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-line text-ink/75">
                <Txt f="bandText" />
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-semibold text-brand-700 sm:self-center">
              <Txt f="cta" /> <ArrowRight className="size-4" />
            </span>
          </div>
          <AutoNote
            className="mt-3 [zoom:var(--pz,1)]"
            href={`${ADMIN_BASE}/pages?key=group-tailor-made-tours`}
            linkText="Tour nhóm & thiết kế riêng"
          >
            Tiêu đề và chữ nút dùng chung với khối trên. Muốn dải này khác riêng trên trang Tour
            nhóm: sửa trong Giao diện trang →
          </AutoNote>
        </Container>
      </Zone>
    </SitePage>
  );
}
