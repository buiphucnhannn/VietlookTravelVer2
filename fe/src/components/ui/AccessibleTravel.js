import { Accessibility, ArrowRight, Ear, HandHeart } from "lucide-react";
import { lp } from "@/i18n/config";
import { cn } from "@/lib/utils";
import Button from "./Button";
import Container from "./Container";
import Reveal from "./Reveal";

const ICONS = [Accessibility, Ear, HandHeart];

/**
 * "Du lịch không rào cản" — khách đi xe lăn (có nhân viên đẩy xe), khách khiếm thính, khách đi lại hạn chế.
 * Câu chữ trung thực: "theo yêu cầu", "chúng tôi sắp xếp…" (dict.access), không hứa hẹn y tế.
 * - variant "section" (mặc định): khối riêng — trang chủ, trang Giới thiệu
 * - variant "band": dải gọn 1 dòng — trang Tour nhóm & thiết kế riêng
 */
export default function AccessibleTravel({ lang, dict, variant = "section", className }) {
  const a = dict.access;
  const planHref = `${lp(lang)}/plan-your-trip`;

  if (variant === "band") {
    return (
      <div
        className={cn(
          "flex flex-col gap-4 rounded-2xl bg-brand-50/70 p-5 text-left ring-1 ring-brand-100 sm:flex-row sm:items-center sm:gap-5 sm:p-6",
          className,
        )}
      >
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
          <p className="font-bold text-ink">{a.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink/75">{a.badgeLong}</p>
        </div>
        <a
          href={planHref}
          className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-semibold text-brand-700 hover:text-sun-500 sm:self-center"
        >
          {a.cta} <ArrowRight className="size-4" />
        </a>
      </div>
    );
  }

  return (
    <section id="accessible-travel" className={cn("scroll-mt-28 py-14 lg:py-[4.5rem]", className)}>
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-cream-50 p-6 ring-1 ring-brand-100 sm:p-10 lg:p-12">
          {/* Biểu tượng mờ trang trí góc khối */}
          <Accessibility
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-10 -z-10 size-56 text-brand-100/70 sm:size-72"
            strokeWidth={1.2}
          />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-clay-600 uppercase">
                {a.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance text-ink sm:text-4xl">
                {a.title}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-ink/80">{a.text}</p>
              <Button href={planHref} variant="primary" className="mt-7">
                {a.cta}
              </Button>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{a.note}</p>
            </div>
            <ul className="grid gap-4">
              {a.points.map((p, i) => {
                const Icon = ICONS[i] ?? HandHeart;
                return (
                  <Reveal
                    as="li"
                    key={p.title}
                    delay={i * 80}
                    className="flex items-start gap-4 rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-border"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-tight text-ink">{p.title}</h3>
                      <p className="mt-1 leading-relaxed text-muted">{p.text}</p>
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
