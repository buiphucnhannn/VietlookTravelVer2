import { CalendarCheck, CreditCard, Map, MessageSquareText, Plane } from "lucide-react";
import { Container, Reveal, SectionHeading } from "@/components/ui";

const icons = [MessageSquareText, CalendarCheck, Map, CreditCard, Plane];

/**
 * Quy trình đặt tour 5 bước (mẫu khách gửi: icon nét mảnh, chấm vàng, số thứ tự lớn màu vàng).
 * Dùng cho EN + ZH qua dict.home.steps.
 */
export default function BookingSteps({ dict }) {
  const t = dict.home;
  return (
    <section className="relative isolate overflow-hidden bg-cream-50 py-14 lg:py-[4.5rem]">
      {/* Hoa văn nhẹ phía sau cho ấm */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(247,179,43,0.18),transparent_55%)]" />
      <Container>
        <SectionHeading eyebrow={t.stepsEyebrow} title={t.stepsTitle} />
        <ol className="relative grid gap-10 md:grid-cols-5 md:gap-6">
          {/* đường nối chấm giữa các bước (desktop) */}
          <span
            aria-hidden
            className="absolute top-10 right-[10%] left-[10%] hidden border-t-2 border-dotted border-amber-brand/50 md:block"
          />
          {t.steps.map((s, i) => {
            const Icon = icons[i];
            return (
              <Reveal as="li" key={s.title} delay={i * 90} className="relative text-center">
                <span className="relative mx-auto grid size-20 place-items-center rounded-full bg-white text-ink shadow-[0_10px_30px_-14px_rgba(60,40,10,0.35)] ring-1 ring-sand-300/60">
                  <Icon className="size-9" strokeWidth={1.3} />
                  <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-amber-brand ring-4 ring-cream-50" />
                </span>
                <span className="mt-4 block text-5xl leading-none font-semibold text-amber-brand/90 [font-variant-numeric:tabular-nums]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mx-auto mt-3 max-w-[13rem] text-[0.95rem] leading-snug font-semibold text-ink">
                  {s.title}
                </p>
                <p className="mx-auto mt-1.5 max-w-[14rem] text-sm leading-relaxed text-muted">
                  {s.text}
                </p>
              </Reveal>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
