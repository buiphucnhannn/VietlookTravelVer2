"use client";

import { CheckCircle2, Clock, Copy } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { Sec, Txt } from "../blocks";

/**
 * Bản xem trước Trang cảm ơn (app/[lang]/thank-you/page.js) — trang khách thấy ngay sau khi gửi form.
 * Mã yêu cầu và kết quả thanh toán do hệ thống tự điền → chỉ mô phỏng, không sửa ở đây.
 */
export default function ThankYouPreview() {
  return (
    <Sec name="Toàn trang" className="bg-cream-50 sm:py-14">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <CheckCircle2 className="size-11 text-forest-700" strokeWidth={1.5} />
        <Txt
          f="title"
          className="mt-4 text-2xl font-extrabold tracking-tight text-forest-900 sm:text-[2rem] sm:leading-tight"
        />
        <Txt
          f="text"
          className="mt-3.5 max-w-xl text-sm leading-relaxed text-ink/75 sm:text-base"
        />

        {/* Mã yêu cầu: hệ thống tự điền */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-dashed border-sand-300 bg-cream-50 px-3.5 py-2 text-xs">
          <span className="text-muted">Mã yêu cầu của bạn:</span>
          <span className="font-mono text-sm font-bold tracking-wider text-forest-700">
            VL-T251125-AB12
          </span>
          <Copy className="size-3.5 text-clay-600" />
        </div>
        <p className="mt-1 text-[10.5px] text-slate-400">
          Mã yêu cầu của khách do hệ thống tự điền
        </p>

        <p className="mt-5 max-w-lg text-[13px] leading-relaxed text-ink/70">
          <Clock className="mr-1.5 inline size-3.5 -translate-y-px text-clay-600" />
          <Txt f="step1" /> <Txt f="step2" />
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#25d366] px-5 text-sm font-semibold text-white">
            <WhatsAppIcon className="size-4 shrink-0" />
            <Txt f="whatsapp" dark />
          </span>
          <span className="inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold text-forest-700 ring-1 ring-forest-700">
            <Txt f="browse" />
          </span>
        </div>
      </div>
    </Sec>
  );
}
