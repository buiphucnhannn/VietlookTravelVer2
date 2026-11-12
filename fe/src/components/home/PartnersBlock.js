import {
  Building2,
  CalendarDays,
  Handshake,
  Landmark,
  MapPin,
  Route,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Container, Reveal, SectionHeading } from "@/components/ui";
import { lp } from "@/i18n/config";

// Biểu tượng theo thứ tự dự án mặc định (ngân hàng · nhà máy điện · cao tốc · đoàn khách); dự án thêm sau dùng icon chung
const projectIcons = [Landmark, Zap, Route, Users];

/**
 * Danh sách "Dự án đã phục vụ" (dự án thật do Vietlook cung cấp 11/2026) — dạng thẻ icon, KHÔNG dùng ảnh
 * mạng của sự kiện công ty khác. Mỗi thẻ: tên dự án · quy mô · thời gian · địa điểm / hành trình · 1 câu mô tả.
 * Câu chữ: dict.home.projects (sửa được trong CMS → Trang chủ). Ô trống (vd. chưa rõ năm) → ẩn.
 * Dùng ở trang chủ và trang Đối tác (/partners).
 */
export function ProjectCases({ projects, className }) {
  const n = projects.length;
  return (
    <ul
      className={cn(
        // Subgrid: mỗi thẻ chiếm 4 hàng (icon · tên · thông tin · mô tả) → các hàng thẳng nhau giữa các thẻ cùng hàng
        "grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:gap-x-5",
        n % 3 === 0 ? "lg:grid-cols-3" : n >= 4 && "xl:grid-cols-4",
        className,
      )}
    >
      {projects.map((p, i) => {
        const Icon = projectIcons[i] ?? Building2;
        const facts = [
          [Users, p.size],
          [CalendarDays, p.time],
          [MapPin, p.place],
        ].filter(([, v]) => v);
        return (
          <Reveal
            as="li"
            key={i}
            delay={(i % 4) * 80}
            className="row-span-4 grid grid-rows-subgrid gap-y-3 rounded-3xl border border-sand-300/70 bg-cream-50 p-6"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-forest-700 text-white">
              <Icon className="size-6" />
            </span>
            <h3 className="mt-1 text-lg leading-snug font-bold text-ink">{p.title}</h3>
            {/* luôn giữ hàng thông tin (kể cả trống) để mô tả các thẻ bắt đầu cùng độ cao */}
            <ul className="flex flex-col gap-1.5 text-sm font-medium text-ink/80">
              {facts.map(([FactIcon, v]) => (
                <li key={v} className="flex items-start gap-2">
                  <FactIcon className="mt-0.5 size-4 shrink-0 text-clay-600" />
                  {v}
                </li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed text-muted">{p.text}</p>
          </Reveal>
        );
      })}
    </ul>
  );
}

/**
 * Section riêng "Dự án đã phục vụ" trên trang chủ (logo đối tác để chung ở dải PartnerStrip phía trên).
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
        <ProjectCases projects={t.projects} />
        <div className="mt-8 text-center">
          <Button href={`${lp(lang)}/partners`} variant="cta" size="lg">
            <Handshake className="size-5" /> {t.partnersCta}
          </Button>
        </div>
      </Container>
    </section>
  );
}
