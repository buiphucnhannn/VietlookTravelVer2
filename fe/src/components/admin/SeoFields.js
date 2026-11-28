"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, Input, Textarea } from "./ui";

/*
 * Ô "Hiển thị trên Google" dùng chung (điểm đến, chủ đề…). Bản sao của SeoFields trong ArticleEditor.js —
 * tách riêng để trang khác dùng mà không phải tải cả trình soạn bài viết.
 */

export const seoEmpty = () => ({
  en: { title: "", description: "" },
  zh: { title: "", description: "" },
  vi: { title: "", description: "" },
});

/** Gộp seo từ máy chủ (có thể thiếu ngôn ngữ / thiếu trường) thành đủ 3 ngôn ngữ, chuỗi đã cắt khoảng trắng */
export const normalizeSeo = (seo, { trim = false } = {}) =>
  Object.fromEntries(
    ["en", "zh", "vi"].map((l) => {
      const t = String(seo?.[l]?.title ?? "");
      const d = String(seo?.[l]?.description ?? "");
      return [l, { title: trim ? t.trim() : t, description: trim ? d.trim() : d }];
    }),
  );

const TITLE_MAX = 60;
const DESC_MAX = 160;

function Counter({ n, max }) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold tabular-nums",
        n > max ? "text-sun-600" : n > max * 0.85 ? "text-amber-600" : "text-slate-400",
      )}
    >
      {n}/{max}
    </span>
  );
}

/**
 * Tiêu đề + mô tả SEO theo ngôn ngữ, có đếm ký tự và xem trước kiểu kết quả Google.
 * value = { en: { title, description }, zh: {...}, vi: {...} }
 */
export function SeoFields({ value, onChange, lang, fallbackTitle, fallbackDescription, path }) {
  const cur = value?.[lang] ?? { title: "", description: "" };
  const setLang = (patch) =>
    onChange({ ...seoEmpty(), ...value, [lang]: { title: "", description: "", ...cur, ...patch } });
  const title = cur.title || fallbackTitle || "Tiêu đề trang";
  const desc =
    cur.description || fallbackDescription || "Mô tả ngắn hiện dưới tiêu đề trên Google.";
  const prefix = lang === "en" ? "" : ` › ${lang}`;
  const crumbs = path ? ` › ${path.split("/").join(" › ")}` : "";

  return (
    <div className="space-y-5">
      <Field
        label={
          <span className="flex w-full items-center justify-between gap-2">
            Tiêu đề trên Google <Counter n={cur.title.length} max={TITLE_MAX} />
          </span>
        }
        hint={`Nên dưới ${TITLE_MAX} ký tự để Google không cắt bớt`}
      >
        <Input
          value={cur.title}
          maxLength={200}
          placeholder={fallbackTitle}
          onChange={(e) => setLang({ title: e.target.value })}
        />
      </Field>
      <Field
        label={
          <span className="flex w-full items-center justify-between gap-2">
            Mô tả trên Google <Counter n={cur.description.length} max={DESC_MAX} />
          </span>
        }
        hint={`Nên ${DESC_MAX - 40}–${DESC_MAX} ký tự, nêu nội dung chính của trang`}
      >
        <Textarea
          value={cur.description}
          rows={3}
          maxLength={500}
          placeholder={fallbackDescription}
          onChange={(e) => setLang({ description: e.target.value })}
        />
      </Field>

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Xem trước trên Google
        </p>
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="truncate text-xs text-slate-600">
            vietlooktravel.com{prefix}
            {crumbs}
          </p>
          <p className="mt-1 truncate text-lg leading-snug text-[#1a0dab]">
            {title.length > TITLE_MAX + 5 ? `${title.slice(0, TITLE_MAX)}…` : title}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {desc.length > DESC_MAX + 5 ? `${desc.slice(0, DESC_MAX)}…` : desc}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Thẻ thu gọn "Hiển thị trên Google" đặt dưới bản xem trước của trình sửa trang (Trang chủ · Giao diện trang ·
 * Giới thiệu / chính sách) — mở ra là SeoFields của ngôn ngữ đang sửa. `edited`: đã nhập ô nào → ghi "Đã sửa".
 */
export function SeoCard({ className, ...props }) {
  const [open, setOpen] = useState(false);
  const cur = props.value?.[props.lang];
  const edited = !!(cur?.title?.trim() || cur?.description?.trim());
  return (
    <section
      data-seo-card
      className={cn(
        "mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 sm:px-5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Search className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-slate-900">
            Hiển thị trên Google
            {edited && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                Đã sửa
              </span>
            )}
          </span>
          <span className="block text-xs leading-relaxed text-slate-500">
            Tiêu đề và mô tả khách thấy khi tìm ra trang này (đang sửa bản{" "}
            {{ en: "tiếng Anh", zh: "tiếng Trung", vi: "tiếng Việt" }[props.lang]}). Không bắt buộc
            — để trống thì website dùng câu có sẵn.
          </span>
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 text-slate-400 transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 p-4 sm:p-5">
          <SeoFields {...props} />
        </div>
      )}
    </section>
  );
}
