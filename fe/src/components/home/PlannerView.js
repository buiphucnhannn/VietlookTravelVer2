import Image from "next/image";
import { Mail } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui";
import TripPlannerForm from "@/components/forms/TripPlannerForm";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { tr } from "@/i18n/config";
import { phoneDigits } from "@/lib/contact.mjs";

/**
 * Giao diện khối form lên kế hoạch chuyến đi trên trang chủ (PlannerBlock trong ./PlannerAndAbout.js lấy số WhatsApp +
 * email rồi dựng khối này). Tách riêng để bản xem trước trong CMS → Trang chủ dựng y hệt.
 */
export default function PlannerView({ lang, dict, destinationOptions, contact }) {
  const t = dict.home;
  return (
    <section className="relative isolate overflow-clip py-14 lg:py-[4.5rem]" id="plan">
      <Image
        src="/images/tours/v2/ninh-binh-c42.jpg"
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-forest-900/95 via-forest-900/85 to-forest-900/60" />
      <Container className="grid items-start gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="text-white lg:sticky lg:top-36">
          <SectionHeading title={t.plannerTitle} subtitle={t.plannerSubtitle} align="left" light />
          <div className="space-y-3">
            {contact.phones
              .filter((ph) => ph.whatsapp)
              .map((ph) => (
                <a
                  key={ph.raw}
                  href={`https://wa.me/${phoneDigits(ph.number)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 hover:bg-white/15"
                >
                  <WhatsAppIcon className="size-6 text-[#25d366]" />
                  <span>
                    <span className="block text-xs text-white/70">{tr(ph.channels, lang)}</span>
                    <span className="font-semibold">{ph.number}</span>
                  </span>
                </a>
              ))}
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 hover:bg-white/15"
            >
              <Mail className="size-6 text-amber-brand" />
              <span className="font-semibold break-all">{contact.email}</span>
            </a>
          </div>
        </div>
        <TripPlannerForm
          lang={lang}
          t={{ ...dict.planner, ...dict.tour }}
          c={dict.common}
          destinationOptions={destinationOptions}
        />
      </Container>
    </section>
  );
}
