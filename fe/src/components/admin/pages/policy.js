"use client";

import { memo } from "react";
import { Mail, Pencil, Phone } from "lucide-react";
import Link from "@/components/admin/Link";
import { cn } from "@/lib/utils";
import { ADMIN_BASE } from "@/config/urls.mjs";
import Container from "@/components/ui/Container";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import RichText from "../RichTextLazy";
import { AutoChip, LANG_NAME, otherOf } from "./canvas";
import { usePublicData } from "./live";

/* =========================================================================
 * Trang chính sách — y như website (app/[lang]/policies/[slug]/page.js):
 * menu các chính sách · bài viết · cột phải (mục lục + thẻ hỏi đáp)
 * ========================================================================= */

// Chữ trong HTML (&amp; &lt; …) → ký tự thật, để mục lục hiện "Bảo mật & lưu trữ" chứ không phải "&amp;"
const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
/** Các đề mục lớn (<h2>) trong bài → mục lục như trên website */
const tocOf = (html) =>
  [...(html ?? "").matchAll(/<h2[^>]*>(.*?)<\/h2>/g)]
    .map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim())
    .filter(Boolean);

/** Chữ giao diện dự phòng khi chưa tải xong bộ chữ của website */
const FALLBACK = {
  en: { title: "Booking policies", onThisPage: "On this page" },
  zh: { title: "预订政策", onThisPage: "本页内容" },
  vi: { title: "Chính sách đặt tour", onThisPage: "Trong trang này" },
};

/**
 * Bài viết sửa tại chỗ: khung soạn thảo mang đúng kiểu chữ của website (theme.css .prose-guide) —
 * cỡ chữ, giãn dòng, đề mục, gạch đầu dòng, link. Có "!" vì kiểu .admin-prose (globals.css) nằm ngoài lớp
 * của Tailwind → không có "!" thì không đè được.
 */
const PROSE = cn(
  "[&_.admin-prose]:text-[1.05rem]! [&_.admin-prose]:leading-8! [&_.admin-prose]:text-foreground/90!",
  "[&_.admin-prose>:first-child]:mt-0! [&_.admin-prose_p]:my-4! [&_.admin-prose_li>p]:my-0!",
  "[&_.admin-prose_h2]:mt-10! [&_.admin-prose_h2]:mb-3! [&_.admin-prose_h2]:text-2xl! [&_.admin-prose_h2]:font-bold! [&_.admin-prose_h2]:tracking-tight! [&_.admin-prose_h2]:text-ink! sm:[&_.admin-prose_h2]:text-3xl!",
  "[&_.admin-prose_h3]:mt-7! [&_.admin-prose_h3]:mb-2! [&_.admin-prose_h3]:text-xl! [&_.admin-prose_h3]:font-semibold! [&_.admin-prose_h3]:text-ink!",
  "[&_.admin-prose_:is(ul,ol)]:my-4! [&_.admin-prose_:is(ul,ol)]:pl-6! [&_.admin-prose_li+li]:mt-1.5!",
  "[&_.admin-prose_ul_li]:marker:text-brand-500! [&_.admin-prose_ol_li]:marker:font-semibold! [&_.admin-prose_ol_li]:marker:text-brand-600!",
  "[&_.admin-prose_a]:font-medium! [&_.admin-prose_a]:text-brand-600! [&_.admin-prose_a]:decoration-brand-200! [&_.admin-prose_a]:underline-offset-4!",
  "[&_.admin-prose_strong]:font-semibold! [&_.admin-prose_strong]:text-ink!",
);

/**
 * `menu`: [{ key, href, icon, title, active, hidden, onClick }] — các trang chính sách (bấm để chuyển sang sửa
 * trang đó; `onClick` hỏi lại nếu còn thay đổi chưa lưu)
 */
export const PolicyBody = memo(function PolicyBody({ body, lang, set, menu = [] }) {
  const d = { body };
  const live = usePublicData(lang);
  const t = { ...FALLBACK[lang], ...live?.dict.policy };
  const toc = tocOf(d.body[lang] || otherOf(d.body, lang));

  return (
    // Màn rộng (khung xem trước ≥ 1240px): 3 cột như website. Hẹp hơn: mục lục + thẻ hỏi đáp xuống dưới menu
    // (website ẩn cột phải khi màn hẹp — ở đây vẫn hiện để người sửa thấy đủ các phần của trang).
    <Container className="grid gap-10 py-12 lg:grid-cols-[270px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-6 lg:py-14 @min-[1240px]:grid-cols-[270px_minmax(0,1fr)_290px] @min-[1240px]:grid-rows-1 @min-[1240px]:gap-12">
      {/* Menu chính sách */}
      <nav
        data-jump="Menu chính sách"
        className="self-start rounded-2xl border border-border bg-white p-3 lg:col-start-1 lg:row-start-1"
      >
        <p className="px-3 pt-2 pb-3 text-xs font-bold tracking-[0.18em] text-brand-700 uppercase">
          {t.title}
        </p>
        <ul className="space-y-1">
          {menu
            .filter((m) => !m.hidden)
            .map((m) => (
              <li key={m.key}>
                <Link
                  href={m.href}
                  data-admin-link
                  onClick={m.active ? (e) => e.preventDefault() : m.onClick}
                  aria-current={m.active ? "page" : undefined}
                  title={m.active ? undefined : "Chuyển sang sửa trang này"}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition",
                    m.active
                      ? "cursor-default bg-brand-600 text-white shadow-sm"
                      : "text-ink hover:bg-brand-50 hover:text-brand-700",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg",
                      m.active ? "bg-white/15" : "bg-brand-50 text-brand-600",
                    )}
                  >
                    <m.icon className="size-4" />
                  </span>
                  <span className="whitespace-nowrap">{m.title}</span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>

      {/* Bài viết (sửa tại chỗ) */}
      <div
        data-jump="Nội dung chính sách"
        className={cn(
          "max-w-3xl min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 @min-[1240px]:row-span-1",
          PROSE,
        )}
      >
        {/* Khung sửa nội dung: cùng màu với ô sửa chữ chung — rê chuột viền xanh nét đứt + nhãn "Bấm để sửa nội
            dung", đang gõ viền cam + nền cam nhạt. key theo ngôn ngữ: mỗi ngôn ngữ có lời nhắc riêng khi còn trống */}
        <div className="group/rt relative cursor-text rounded-md outline-2 outline-offset-[6px] outline-transparent outline-dashed focus-within:bg-orange-500/[0.04] focus-within:outline-orange-500 focus-within:outline-solid hover:outline-blue-500 focus-within:hover:outline-orange-500">
          <span
            data-edit-ui
            aria-hidden
            className="pointer-events-none absolute -top-9 left-0 z-20 hidden items-center gap-1 rounded-md bg-blue-600 px-2 py-1 font-sans text-[11px] leading-none font-semibold text-white shadow-lg group-focus-within/rt:hidden group-hover/rt:flex"
          >
            <Pencil className="size-3" />
            Bấm để sửa nội dung
            <span className="font-normal text-white/75">· Nội dung chính sách</span>
          </span>
          <RichText
            key={lang}
            lang={lang}
            value={d.body[lang]}
            onChange={(html) => set({ body: { ...d.body, [lang]: html } })}
            folder="pages"
            minHeight={420}
            placeholder={
              otherOf(d.body, lang)
                ? `Chưa có bản ${LANG_NAME[lang]} — khi lưu sẽ tự dịch từ ngôn ngữ đã viết. Bấm vào đây để tự viết…`
                : "Bấm vào đây để viết nội dung…"
            }
          />
        </div>
      </div>

      {/* Cột phải: mục lục + thẻ hỏi đáp (tự động, không sửa ở đây) */}
      <aside className="hidden space-y-6 self-start lg:col-start-1 lg:row-start-2 lg:block @min-[1240px]:col-start-3 @min-[1240px]:row-start-1">
        <div className="group/auto relative rounded-2xl border border-border p-5">
          <AutoChip className="top-0 right-4 -translate-y-1/2">
            Tự động — theo đề mục lớn trong bài
          </AutoChip>
          <p className="mb-3 text-xs font-bold tracking-[0.18em] text-brand-700 uppercase">
            {t.onThisPage}
          </p>
          {toc.length ? (
            <ol className="space-y-1 border-l-2 border-brand-100">
              {toc.map((text, i) => (
                <li
                  key={i}
                  className="-ml-0.5 block border-l-2 border-transparent py-1.5 pl-4 text-[0.95rem] text-muted"
                >
                  {text}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm leading-relaxed text-slate-400">
              Các tiêu đề lớn trong bài sẽ tự hiện thành mục lục ở đây.
            </p>
          )}
        </div>

        <HelpCard t={t} dict={live?.dict} contact={live?.contact} />
      </aside>
    </Container>
  );
});

/** Thẻ "Câu hỏi về chính sách này?" — 3 kênh liên hệ lấy từ CMS → Thông tin liên hệ */
function HelpCard({ t, dict, contact }) {
  const channels = [
    { href: contact?.messaging.whatsapp, icon: WhatsAppIcon, label: "WhatsApp" },
    { href: contact && `tel:${contact.contact.hotlineRaw}`, icon: Phone, label: "Hotline" },
    { href: contact && `mailto:${contact.contact.email}`, icon: Mail, label: "Email" },
  ];
  return (
    <div className="group/auto relative rounded-2xl border border-border bg-white p-5">
      <AutoChip href={`${ADMIN_BASE}/contact`} className="top-0 right-4 -translate-y-1/2">
        Tự động — sửa ở Thông tin liên hệ
      </AutoChip>
      {dict ? (
        <>
          <p className="text-lg font-bold text-ink">{t.helpTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t.helpText}</p>
        </>
      ) : (
        <div className="space-y-2" aria-hidden>
          <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {channels.map((c) => (
          <a
            key={c.label}
            href={c.href || "#"}
            title={c.href?.replace(/^(tel|mailto):/, "")}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 font-semibold text-ink transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            <c.icon className="size-5 text-brand-600" />
            {c.label}
          </a>
        ))}
      </div>
      <span className="mt-4 flex h-11 items-center justify-center rounded-xl bg-sun-500 text-sm font-semibold text-white transition hover:bg-sun-600">
        {dict?.nav.planTrip ?? "Free Trip Planning"}
      </span>
    </div>
  );
}
