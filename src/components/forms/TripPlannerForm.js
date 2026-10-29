"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Hotel, Send, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Chips,
  Counter,
  Field,
  FormError,
  Honeypot,
  Input,
  Select,
  SuccessPanel,
  Textarea,
  useEnquiry,
} from "./fields";

/**
 * Form thiết kế tour nhiều bước: số ngày, số khách, hạng khách sạn 3–5★, ngân sách,
 * điểm đến mong muốn, ngày đi, yêu cầu riêng.
 */
export default function TripPlannerForm({ lang, t, c, destinationOptions, compact, className }) {
  const formRef = useRef(null);
  const { status, code, submit, reset } = useEnquiry("planner", lang);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    destinations: [],
    arrival: "",
    flexible: false,
    days: 10,
    adults: 2,
    children: 0,
    hotel: "4",
    tripType: t.tripTypes[0],
    interests: [],
    budget: "1000-2000",
    requests: "",
    name: "",
    email: "",
    phone: "",
    nationality: "",
    contactVia: "Email",
  });
  const set = (k) => (v) =>
    setData((d) => ({
      ...d,
      [k]: v?.target ? (v.target.type === "checkbox" ? v.target.checked : v.target.value) : v,
    }));

  const steps = t.steps;
  const validate = () => {
    if (step === 0 && data.destinations.length === 0) return t.destinationsHint;
    if (step === 3 && (!data.name.trim() || !/^\S+@\S+\.\S+$/.test(data.email)))
      return `${c.required}: ${t.fullName || "Name"} / Email`;
    return "";
  };
  const next = async () => {
    const msg = validate();
    setError(msg);
    if (msg) return;
    if (step < steps.length - 1) setStep(step + 1);
    else await submit(data, formRef.current);
  };

  if (status === "success") {
    return (
      <SuccessPanel
        title={t.successTitle}
        text={t.successText}
        code={code}
        labels={c}
        onReset={() => {
          reset();
          setStep(0);
        }}
      />
    );
  }

  const hotelCards = [
    { value: "3", label: t.hotel3, stars: 3 },
    { value: "4", label: t.hotel4, stars: 4 },
    { value: "5", label: t.hotel5, stars: 5 },
  ];
  const budgets = ["500-1000", "1000-2000", "2000-3500", "3500+"];

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      className={cn(
        "relative rounded-2xl bg-white p-5 shadow-[0_20px_60px_-30px_rgba(15,62,95,0.45)] ring-1 ring-border sm:p-8",
        className,
      )}
      noValidate
    >
      <Honeypot />

      {/* Thanh tiến trình */}
      <ol className="mb-8 grid grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-col gap-2">
            <span
              className={cn(
                "h-1.5 rounded-full transition-colors duration-500",
                i <= step ? "bg-sun-500" : "bg-border",
              )}
            />
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold sm:text-sm",
                i === step ? "text-ink" : "text-muted",
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[0.7rem]",
                  i < step
                    ? "bg-brand-600 text-white"
                    : i === step
                      ? "bg-sun-500 text-white"
                      : "bg-surface text-muted",
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cn(compact ? "hidden" : "hidden sm:inline")}>{s}</span>
            </span>
          </li>
        ))}
      </ol>

      <div key={step} className="animate-fade-up space-y-6">
        {step === 0 && (
          <>
            <Field label={t.destinations} hint={t.destinationsHint} required>
              <Chips
                multiple
                options={destinationOptions}
                value={data.destinations}
                onChange={set("destinations")}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t.startDate} htmlFor="tp-arrival">
                <Input id="tp-arrival" type="date" value={data.arrival} onChange={set("arrival")} />
                <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={data.flexible}
                    onChange={set("flexible")}
                    className="size-4 accent-brand-600"
                  />
                  {t.flexible}
                </label>
              </Field>
              <Field label={`${t.tripLength}: ${data.days}`} htmlFor="tp-days">
                <input
                  id="tp-days"
                  type="range"
                  min={1}
                  max={30}
                  value={data.days}
                  onChange={(e) => set("days")(+e.target.value)}
                  className="mt-4 w-full accent-sun-500"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>1</span>
                  <span>7</span>
                  <span>14</span>
                  <span>21</span>
                  <span>30</span>
                </div>
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t.adults}>
                <Counter value={data.adults} min={1} onChange={set("adults")} label={t.adults} />
              </Field>
              <Field label={t.children}>
                <Counter value={data.children} onChange={set("children")} label={t.children} />
              </Field>
            </div>
            <Field label={t.hotelClass}>
              <div className="grid gap-3 sm:grid-cols-3">
                {hotelCards.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    aria-pressed={data.hotel === h.value}
                    onClick={() => set("hotel")(h.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition",
                      data.hotel === h.value
                        ? "border-brand-600 bg-brand-50"
                        : "border-border hover:border-brand-300",
                    )}
                  >
                    <Hotel
                      className={cn(
                        "size-7",
                        data.hotel === h.value ? "text-brand-600" : "text-muted",
                      )}
                    />
                    <span>
                      <span className="flex text-amber-brand">
                        {Array.from({ length: h.stars }, (_, i) => (
                          <Star key={i} className="size-3.5 fill-current" />
                        ))}
                      </span>
                      <span className="text-sm font-semibold text-ink">{h.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t.tripType}>
              <Chips
                options={t.tripTypes.map((x) => ({ value: x, label: x }))}
                value={data.tripType}
                onChange={set("tripType")}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label={t.interests}>
              <Chips
                multiple
                options={t.interestOptions.map((x) => ({ value: x, label: x }))}
                value={data.interests}
                onChange={set("interests")}
              />
            </Field>
            <Field label={t.budget}>
              <Chips
                options={budgets.map((b) => ({ value: b, label: `$${b}` }))}
                value={data.budget}
                onChange={set("budget")}
              />
            </Field>
            <Field label={t.requests} hint={t.requestsHint} htmlFor="tp-req">
              <Textarea id="tp-req" value={data.requests} onChange={set("requests")} rows={4} />
            </Field>
          </>
        )}

        {step === 3 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t.fullName} required htmlFor="tp-name">
              <Input id="tp-name" value={data.name} onChange={set("name")} autoComplete="name" />
            </Field>
            <Field label="Email" required htmlFor="tp-email">
              <Input
                id="tp-email"
                type="email"
                value={data.email}
                onChange={set("email")}
                autoComplete="email"
              />
            </Field>
            <Field label={t.phone} htmlFor="tp-phone">
              <Input id="tp-phone" value={data.phone} onChange={set("phone")} autoComplete="tel" />
            </Field>
            <Field label={t.nationality} htmlFor="tp-nat">
              <Input
                id="tp-nat"
                value={data.nationality}
                onChange={set("nationality")}
                autoComplete="country-name"
              />
            </Field>
            <Field label={t.contactVia} className="sm:col-span-2">
              <Select value={data.contactVia} onChange={set("contactVia")}>
                {["Email", "WhatsApp", "WeChat", "Zalo", "Phone"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-muted sm:col-span-2">{c.noOnlinePayment}</p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <FormError show={!!error} text={error} />
        <FormError show={status === "error"} text={c.errorGeneric} />
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex h-12 items-center gap-2 rounded-md px-4 font-semibold text-muted hover:text-ink"
            >
              <ArrowLeft className="size-4" /> {c.back}
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex h-12 items-center gap-2 rounded-md bg-sun-500 px-7 font-semibold text-white shadow-md shadow-sun-500/25 transition hover:bg-sun-600 disabled:opacity-60"
          >
            {step === steps.length - 1 ? (
              <>
                {status === "sending" ? c.sending : c.submit} <Send className="size-4" />
              </>
            ) : (
              <>
                {c.next} <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
