"use client";

import { CalendarRange } from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { ModuleNote, Sec } from "../blocks";
import { AdviceBoxPreview, TourGridNote, TourHero } from "./tours-shared";

/**
 * Bản xem trước trang Tất cả tour (app/[lang]/tours/page.js) — đúng thứ tự trang thật, thu nhỏ.
 * Bộ lọc + lưới thẻ tour: dữ liệu mục Tour. Lời giới thiệu khi lọc 1 / 2 / 3 tuần: dùng chung trang Gói tour.
 */
export default function ToursPreview() {
  return (
    <>
      <TourHero />

      <Sec name="Danh sách tour" className="bg-surface">
        <TourGridNote
          title="Bộ lọc và danh sách mọi tour đang mở bán"
          text="Tên, ảnh, giá, số ngày của từng tour hiện tự động."
        />
        <ModuleNote
          icon={CalendarRange}
          className="mt-3"
          title="Khi khách lọc tour 1 / 2 / 3 tuần"
          text="Lời giới thiệu trên danh sách và hộp mời thiết kế riêng theo số tuần lấy từ trang Gói tour 1–3 tuần."
          href={`${ADMIN_BASE}/pages?key=packages`}
          linkText="Sửa ở trang Gói tour 1–3 tuần"
        />
        <AdviceBoxPreview title="adviceTitle" text="adviceText" cta="adviceCta" className="mt-5" />
      </Sec>
    </>
  );
}
