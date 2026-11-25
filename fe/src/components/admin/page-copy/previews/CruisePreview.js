"use client";

import { Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sec } from "../blocks";
import { AdviceBoxPreview, TourGridNote, TourHero } from "./tours-shared";

/**
 * Bản xem trước 3 trang du thuyền (components/tours/CruisePage.js): /halong-bay-cruises,
 * /halong-bay-overnight-cruises, /day-cruises — cùng bố cục, mỗi trang 1 khoá riêng trong registry.
 * Danh sách du thuyền: dữ liệu mục Tour (tự phân loại theo tên tour).
 */

const TABS = [
  { kind: "overnight", label: "Du thuyền Hạ Long ngủ đêm", ship: true },
  { kind: "day", label: "Du thuyền trong ngày", ship: true },
  { kind: "all", label: "Mọi tour Hạ Long" },
];

const LIST_TEXT = {
  all: "Mọi tour Vịnh Hạ Long (du thuyền và tour bộ) hiện tự động.",
  overnight: "Các du thuyền Hạ Long có ngủ đêm trên tàu hiện tự động.",
  day: "Các chuyến du thuyền, tàu tham quan trong ngày ở Hạ Long, Nha Trang, Phú Quốc hiện tự động.",
};

function CruisePreview({ kind }) {
  return (
    <>
      <TourHero />

      <Sec name="Danh sách du thuyền" className="bg-surface">
        {/* nút chuyển nhanh giữa 3 trang du thuyền (tên nút cố định theo menu) */}
        <div className="mb-3 flex flex-wrap gap-1.5" aria-hidden>
          {TABS.map((t) => (
            <span
              key={t.kind}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1",
                t.kind === kind
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-ink ring-border",
              )}
            >
              {t.ship && <Ship className="size-3.5" />}
              {t.label}
            </span>
          ))}
        </div>
        <TourGridNote title="Danh sách du thuyền và giá" text={LIST_TEXT[kind]} />
        <AdviceBoxPreview title="adviceTitle" text="adviceText" cta="adviceCta" className="mt-5" />
      </Sec>
    </>
  );
}

export const AllCruisesPreview = () => <CruisePreview kind="all" />;
export const OvernightCruisesPreview = () => <CruisePreview kind="overnight" />;
export const DayCruisesPreview = () => <CruisePreview kind="day" />;
