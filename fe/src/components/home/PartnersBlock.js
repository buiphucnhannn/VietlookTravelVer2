import { Building2, Handshake, Ship } from "lucide-react";
import { Button, Container, Reveal, SectionHeading } from "@/components/ui";
import { lp } from "@/i18n/config";

const projectIcons = [Handshake, Building2, Ship];

/**
 * Section riêng "Dự án hợp tác" (tài liệu mục 4: logo đối tác để chung ở dải PartnerStrip đầu trang,
 * chi tiết hợp tác đưa vào 1 section riêng). Nội dung dự án thật chờ Vietlook gửi (mục 9 #6).
 */
export default function PartnersBlock({ lang, dict }) {
  const t = dict.home;
  return (
    <section className="relative isolate overflow-hidden bg-white py-14 lg:py-[4.5rem]">
      <Container>
        <SectionHeading
          eyebrow={t.partnersEyebrow}
          title={t.projectsTitle}
          subtitle={t.partnersSubtitle}
        />
        <div className="rail grid gap-5 md:grid-cols-3">
          {t.projects.map((p, i) => {
            const Icon = projectIcons[i];
            return (
              <Reveal
                key={p.title}
                delay={i * 80}
                className="rounded-3xl border border-sand-300/70 bg-cream-50 p-6"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-forest-700 text-white">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{p.text}</p>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Button href={`${lp(lang)}/partners`} variant="cta" size="lg">
            <Handshake className="size-5" /> {t.partnersCta}
          </Button>
        </div>
      </Container>
    </section>
  );
}
