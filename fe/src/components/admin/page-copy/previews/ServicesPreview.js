"use client";

import { ArrowRight, BookOpen, Car, CheckCircle2, Map, Stamp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui";
import { ListOf, Photo, Txt } from "../blocks";
import BrushHeroPreview from "./BrushHeroPreview";
import { SitePage, Zone } from "./site-frame";

/**
 * Bản xem trước trang Dịch vụ — dựng y như app/[lang]/services/page.js.
 * Ảnh đầu trang = ảnh của 3 dịch vụ đầu (đổi ảnh ở từng thẻ dịch vụ bên dưới).
 */

const icons = [Users, Map, Car, Stamp, BookOpen];

export default function ServicesPreview({ lang }) {
  return (
    <SitePage lang={lang} path="/services">
      <BrushHeroPreview images="images" title="heroTitle" subtitle="heroSubtitle" pills={false} />

      <Zone name="5 dịch vụ chính">
        <section className="py-14 lg:py-[4.5rem]">
          <Container>
            <p className="mb-10 text-center text-xs font-bold tracking-[0.18em] text-brand-700 uppercase sm:text-sm lg:mb-14">
              <Txt f="intro" />
            </p>

            <div className="space-y-14 lg:space-y-20">
              <ListOf f="items">
                {(i) => {
                  const Icon = icons[i] ?? Map;
                  const flip = i % 2 === 1;
                  return (
                    <div key={i} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                      <div
                        className={cn(
                          "group relative block aspect-[16/10] overflow-hidden rounded-3xl bg-slate-100 shadow-xl",
                          flip && "lg:order-2",
                        )}
                      >
                        <Photo
                          f={`images.${i}`}
                          sizes="(min-width: 1024px) 50vw, 100vw"
                          pill="bottom-4 right-4"
                        />
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-950/40 to-transparent" />
                        <span className="pointer-events-none absolute top-5 left-5 font-hand text-6xl leading-none text-white/90 drop-shadow-lg">
                          0{i + 1}
                        </span>
                      </div>

                      <div>
                        <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                          <Icon className="size-6" />
                        </span>
                        <h2 className="heading-lg mt-5 text-ink">
                          <Txt f={`items.${i}.title`} />
                        </h2>
                        <p className="mt-4 text-lg leading-relaxed whitespace-pre-line text-ink/75">
                          <Txt f={`items.${i}.text`} />
                        </p>
                        <ul className="mt-6 space-y-2.5">
                          <ListOf f={`points${i}`}>
                            {(j) => (
                              <li key={j} className="flex items-start gap-3 font-medium text-ink">
                                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-500" />
                                <Txt f={`points${i}.${j}`} />
                              </li>
                            )}
                          </ListOf>
                        </ul>
                        <span className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-brand-600 px-6 font-semibold text-white shadow-md">
                          <Txt f={`items.${i}.cta`} dark />
                          <ArrowRight className="size-4" />
                        </span>
                      </div>
                    </div>
                  );
                }}
              </ListOf>
            </div>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
