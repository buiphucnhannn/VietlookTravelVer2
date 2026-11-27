"use client";

import { Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui";
import { Auto, SitePage, Zone, useCatalog, useDict } from "./site-frame";
import { AdviceEdit, TourHero, TourListPreview } from "./tours-shared";

/**
 * Bản xem trước 3 trang du thuyền — dựng y như components/tours/CruisePage.js: /halong-bay-cruises,
 * /halong-bay-overnight-cruises, /day-cruises (cùng bố cục, mỗi trang 1 khoá riêng trong registry).
 * Danh sách du thuyền: dữ liệu mục Tour (tự phân loại theo tour), chỉ xem.
 */

const PAGES = {
  all: { path: "/halong-bay-cruises", hide: ["destination"], list: (c) => c.cruiseTours() },
  overnight: {
    path: "/halong-bay-overnight-cruises",
    hide: ["destination"],
    list: (c) => c.cruisesByKind("overnight"),
  },
  day: { path: "/day-cruises", hide: [], list: (c) => c.cruisesByKind("day") },
};

function CruisePreview({ kind, lang }) {
  const dict = useDict(lang);
  const catalog = useCatalog();
  const page = PAGES[kind];
  return (
    <SitePage lang={lang} path={page.path}>
      <TourHero />
      <Zone name="Danh sách du thuyền">
        <section className="bg-surface py-14 lg:py-[4.5rem]">
          <Container>
            {/* chuyển nhanh giữa 3 trang du thuyền (tên nút cố định theo menu) */}
            <Auto label="Nút chuyển trang du thuyền · cố định" at="-top-3 right-0">
              <nav className="mb-6 flex flex-wrap gap-2">
                {["overnight", "day", "all"].map((k) => (
                  <span
                    key={k}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1",
                      k === kind
                        ? "bg-brand-600 text-white ring-brand-600"
                        : "bg-white text-ink ring-border",
                    )}
                  >
                    {k !== "all" && <Ship className="size-4" aria-hidden />}
                    {dict?.cruises.tabs[k]}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-xs",
                        k === kind ? "bg-white/20" : "bg-surface text-muted",
                      )}
                    >
                      {catalog ? PAGES[k].list(catalog).length : "…"}
                    </span>
                  </span>
                ))}
              </nav>
            </Auto>
            <TourListPreview
              lang={lang}
              dict={dict}
              catalog={catalog}
              tours={page.list}
              hide={page.hide}
              label="Danh sách du thuyền & giá · sửa ở mục Tour"
            />
            <div className="mt-10">
              <AdviceEdit lang={lang} title="adviceTitle" text="adviceText" cta="adviceCta" />
            </div>
          </Container>
        </section>
      </Zone>
    </SitePage>
  );
}

export const AllCruisesPreview = ({ lang }) => <CruisePreview kind="all" lang={lang} />;
export const OvernightCruisesPreview = ({ lang }) => <CruisePreview kind="overnight" lang={lang} />;
export const DayCruisesPreview = ({ lang }) => <CruisePreview kind="day" lang={lang} />;
