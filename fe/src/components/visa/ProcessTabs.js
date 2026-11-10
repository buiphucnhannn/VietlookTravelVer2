"use client";

import { useState } from "react";
import {
  Car,
  Clock3,
  CreditCard,
  Signpost,
  FilePenLine,
  FileText,
  Mail,
  Plane,
  Send,
  ShieldCheck,
  Stamp,
  Ticket,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  send: Send,
  plane: Plane,
  stamp: Stamp,
  user: UserCheck,
  car: Car,
  ticket: Ticket,
  shield: ShieldCheck,
  file: FileText,
  edit: FilePenLine,
  clock: Clock3,
  mail: Mail,
  sign: Signpost,
  card: CreditCard,
};

/**
 * Infographic quy trình 5 bước (yêu cầu 24): tab Nhập cảnh / Xuất cảnh / E-visa.
 * `processes`: { arrival: [{icon,title,text}], departure: [...], evisa: [...] } đã dịch.
 */
export default function ProcessTabs({ processes, tabs }) {
  const keys = Object.keys(processes);
  const [tab, setTab] = useState(keys[0]);
  const steps = processes[tab];

  return (
    <div>
      <div className="mx-auto flex w-fit gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-sand-300/70">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            aria-pressed={k === tab}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              k === tab ? "bg-clay-500 text-white shadow" : "text-ink/70 hover:text-clay-600",
            )}
          >
            {tabs[k]}
          </button>
        ))}
      </div>

      <ol key={tab} className="relative mt-10 grid animate-fade-up gap-6 md:grid-cols-5 md:gap-4">
        {/* đường nối chấm giữa các bước (desktop) */}
        <span
          aria-hidden
          className="absolute top-7 right-[10%] left-[10%] hidden border-t-2 border-dashed border-sand-300 md:block"
        />
        {steps.map((s, i) => {
          const Icon = icons[s.icon] || Send;
          return (
            <li
              key={s.title}
              className="relative flex gap-4 md:flex-col md:items-center md:text-center"
            >
              <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-forest-700 text-white shadow-lg ring-4 ring-cream-50">
                <Icon className="size-6" />
                <span className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-amber-brand text-xs font-bold text-ink">
                  {i + 1}
                </span>
              </span>
              <div>
                <h3 className="text-base font-bold text-ink">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
