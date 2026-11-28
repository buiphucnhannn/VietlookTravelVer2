"use client";

import { Bus, Clock, FileSignature, Flag, Gift, Headset, Percent, Stamp } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { Container, SectionHeading } from "@/components/ui";
import ContactForm from "@/components/forms/ContactForm";
import { withHomeCopy } from "@/components/home/copy";
import { ProjectCases } from "@/components/home/PartnersBlock";
import { BgEdit, ListOf, Photo, Txt } from "../blocks";
import BrushHeroPreview from "./BrushHeroPreview";
import { Auto, Loading, SitePage, FormStates, Zone, useCatalog, useDict } from "./site-frame";

/**
 * Bản xem trước trang Đối tác B2B — dựng y như app/[lang]/partners/page.js.
 * Khối "Dự án đã phục vụ" dùng chung với Trang chủ (chỉ xem, sửa ở Trang chủ).
 */

const BENTO = ["row-span-2", "", "", "col-span-2"];
const icons = [Percent, Clock, FileSignature, Bus, Stamp, Headset, Flag, Gift];

export default function PartnersPreview({ lang }) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  const homeCopy = dict && catalog && withHomeCopy(dict.home, catalog.home.copy, lang);
  const c = dict && {
    ...dict.common,
    fullName: dict.tour.fullName,
    phone: dict.tour.phone,
    message: dict.contact.message,
  };

  return (
    <SitePage lang={lang} path="/partners">
      <BrushHeroPreview
        images="heroImages"
        title="heroTitle"
        subtitle="heroSubtitle"
        crumb={dict?.nav.partners}
      />
      <Zone name="Giới thiệu">
        <Container className="py-10 text-center lg:py-12">
          <p className="mx-auto max-w-4xl text-xl leading-snug font-medium whitespace-pre-line text-ink sm:text-2xl">
            <Txt f="intro" />
          </p>
        </Container>
      </Zone>

      <Zone name="Ưu đãi đối tác" hide="offers">
        <section className="relative isolate overflow-hidden py-14 lg:py-[4.5rem]">
          <BgEdit f="offersImage" tone="light" />
          <Container>
            <SectionHeading title={<Txt f="offerTitle" />} />
            <div className="rail grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              <ListOf f="offers">
                {(i) => {
                  const Icon = icons[i] ?? Gift;
                  return (
                    <div
                      key={i}
                      className="row-span-3 grid grid-rows-subgrid content-start gap-y-3 rounded-3xl bg-surface p-6"
                    >
                      <span className="grid size-12 place-items-center rounded-xl bg-brand-600 text-white">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="mt-1 text-xl leading-snug font-bold text-ink">
                        <Txt f={`offers.${i}.title`} />
                      </h3>
                      <p className="whitespace-pre-line text-muted">
                        <Txt f={`offers.${i}.text`} />
                      </p>
                    </div>
                  );
                }}
              </ListOf>
            </div>
          </Container>
        </section>
      </Zone>

      <Zone name="Dự án đã phục vụ" hide="projects">
        <section className="bg-white py-14 lg:py-[4.5rem]">
          <Container>
            {homeCopy ? (
              <Auto
                href={`${ADMIN_BASE}/home`}
                label="Dùng chung với Trang chủ · sửa ở Trang chủ"
                at="-top-6 right-0"
              >
                <SectionHeading
                  eyebrow={homeCopy.partnersEyebrow}
                  title={homeCopy.projectsTitle}
                  subtitle={homeCopy.partnersSubtitle}
                />
                <ProjectCases projects={homeCopy.projects} />
              </Auto>
            ) : (
              <Loading className="min-h-[480px]" />
            )}
          </Container>
        </section>
      </Zone>

      <Zone name="Form hợp tác" dark>
        <section className="bg-brand-950 py-14 lg:py-[4.5rem]">
          <Container className="grid gap-10 lg:grid-cols-2">
            <div className="grid h-[420px] grid-cols-2 grid-rows-[1fr_1fr_0.9fr] gap-4 sm:h-[560px] lg:h-full">
              <ListOf f="gallery">
                {(i) => (
                  <div
                    key={i}
                    className={`relative overflow-hidden rounded-3xl bg-white/10 ${BENTO[i] ?? ""}`}
                  >
                    <Photo
                      f={`gallery.${i}`}
                      sizes={
                        BENTO[i] === "row-span-2"
                          ? "(min-width: 1024px) 50vw, 100vw"
                          : "(min-width: 1024px) 25vw, 50vw"
                      }
                      title={`Ảnh ${i + 1}`}
                    />
                  </div>
                )}
              </ListOf>
            </div>
            <div className="rounded-3xl bg-white p-6 sm:p-8">
              {dict ? (
                <FormStates labels={c}>
                  <Auto live label="Các ô của form giữ nguyên như website" at="-bottom-3 right-0">
                    <ContactForm
                      lang={lang}
                      t={{ formTitle: <Txt f="formTitle" />, formText: <Txt f="formText" /> }}
                      c={c}
                      type="partner"
                      extraFields={[
                        { key: "company", label: <Txt f="company" /> },
                        { key: "country", label: <Txt f="country" /> },
                        { key: "website", label: <Txt f="website" /> },
                        { key: "volume", label: <Txt f="volume" /> },
                      ]}
                    />
                  </Auto>
                </FormStates>
              ) : (
                <Loading className="min-h-[560px]" />
              )}
            </div>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}
