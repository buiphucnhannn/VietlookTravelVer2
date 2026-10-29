"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, CalendarDays, Info, ShieldCheck } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import {
  Counter,
  Field,
  FormError,
  Honeypot,
  Input,
  Select,
  SuccessPanel,
  Textarea,
  useEnquiry,
} from "@/components/forms/fields";

const noopSubscribe = () => () => {};
const todayISO = () => new Date().toISOString().slice(0, 10);

/** Ngày sớm nhất có thể đặt (+2 ngày) và 6 ngày gợi ý để chọn nhanh (tour khởi hành hằng ngày). */
function buildDepartures(today, days) {
  if (!today) return { minDate: "", departures: [] };
  const min = new Date(today);
  min.setDate(min.getDate() + 2);
  const list = [];
  const d = new Date(min);
  while (list.length < 6) {
    d.setDate(d.getDate() + 1);
    if (days >= 4 ? d.getDay() === 1 || d.getDay() === 4 : d.getDay() !== 0)
      list.push(d.toISOString().slice(0, 10));
    if (days < 4 && list.length) d.setDate(d.getDate() + 2);
  }
  return { minDate: min.toISOString().slice(0, 10), departures: list };
}

const childFactor = (age) => (age < 5 ? 0 : age <= 10 ? 0.75 : 1);

/** Đặt tour online: chọn ngày, người lớn, trẻ em (độ tuổi) → giá tạm tính → gửi yêu cầu. */
export default function BookingWidget({ lang, tour, t, c }) {
  const formRef = useRef(null);
  const { status, code, submit, reset } = useEnquiry("booking", lang);
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [ages, setAges] = useState([]);
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    nationality: "",
    notes: "",
  });
  const [error, setError] = useState("");

  // Ngày hôm nay chỉ đọc phía client (server trả chuỗi rỗng) để tránh lệch khi render sẵn
  const today = useSyncExternalStore(noopSubscribe, todayISO, () => "");
  const { minDate, departures } = useMemo(
    () => buildDepartures(today, tour.days),
    [today, tour.days],
  );

  // Giá tạm tính = giá/người lớn thật của tour (bảng giá bậc số khách sẽ lấy từ CMS)
  const unit = tour.price || null;

  const estimate = useMemo(() => {
    if (!unit) return null;
    const kids = ages.map((a) => Math.round(unit * childFactor(a)));
    return { adults: unit * adults, kids, total: unit * adults + kids.reduce((s, x) => s + x, 0) };
  }, [unit, adults, ages]);

  const setChildren = (n) =>
    setAges((a) => (n > a.length ? [...a, ...Array(n - a.length).fill(8)] : a.slice(0, n)));
  const fmtDate = (iso) =>
    new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(iso));

  if (status === "success") {
    return (
      <SuccessPanel
        title={c.thankYou}
        text={t.bookingSent}
        code={code}
        labels={c}
        onReset={() => (reset(), setStep(0))}
      />
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (step === 0) {
      if (!date) return setError(`${c.required}: ${t.departureDate}`);
      setError("");
      return setStep(1);
    }
    if (!contact.name.trim() || !/^\S+@\S+\.\S+$/.test(contact.email))
      return setError(`${c.required}: ${t.fullName} / ${t.email}`);
    setError("");
    await submit(
      {
        ...contact,
        tour: tour.title,
        tourSlug: tour.slug,
        tourCode: tour.code,
        departureDate: date,
        adults,
        children: ages.length,
        childAges: ages,
        estimateUSD: estimate?.total ?? "on request",
      },
      formRef.current,
    );
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className={cn("relative space-y-4", step === 0 && "short:space-y-3")}
    >
      <Honeypot />
      {/* Mô tả chỉ cần ở bước chọn ngày; bước liên hệ bỏ đi để khung luôn vừa màn hình */}
      {step === 0 && <p className="-mt-2 text-sm leading-snug text-muted">{t.bookSubtitle}</p>}
      {step === 0 ? (
        <>
          <Field label={t.departureDate} required htmlFor="bk-date">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-brand-500" />
              <Input
                id="bk-date"
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-11 short:h-11"
              />
            </div>
          </Field>
          {departures.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted">{t.departureNote}</p>
              <div className="flex flex-wrap gap-1.5">
                {departures.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDate(d)}
                    className={cn(
                      "rounded-full border px-3 py-0.5 text-xs font-medium transition",
                      date === d
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-border hover:border-brand-300",
                    )}
                  >
                    {fmtDate(d)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={c.adults}>
              <Counter
                value={adults}
                min={1}
                max={60}
                onChange={setAdults}
                label={c.adults}
                className="short:h-11"
              />
            </Field>
            <Field label={c.children}>
              <Counter
                value={ages.length}
                max={10}
                onChange={setChildren}
                label={c.children}
                className="short:h-11"
              />
            </Field>
          </div>
          {ages.length > 0 && (
            <Field label={t.childAges} hint={t.childPolicy}>
              <div className="grid grid-cols-3 gap-2">
                {ages.map((age, i) => (
                  <Select
                    key={i}
                    aria-label={`${t.childAgeLabel} ${i + 1}`}
                    value={age}
                    onChange={(e) =>
                      setAges((a) => a.map((x, j) => (j === i ? +e.target.value : x)))
                    }
                    className="h-10 px-3 text-sm"
                  >
                    {Array.from({ length: 16 }, (_, k) => k + 1).map((k) => (
                      <option key={k} value={k}>
                        {k} {c.age}
                      </option>
                    ))}
                  </Select>
                ))}
              </div>
            </Field>
          )}

          <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 short:py-2.5">
            {estimate ? (
              <>
                <div className="space-y-1 text-sm text-muted">
                  <p className="flex justify-between">
                    <span>
                      {adults} × {c.adults.toLowerCase()} ({formatUSD(unit)})
                    </span>
                    <span>{formatUSD(estimate.adults)}</span>
                  </p>
                  {ages.map((a, i) => (
                    <p key={i} className="flex justify-between">
                      <span>
                        {c.child} {a} {c.age}
                      </span>
                      <span>{estimate.kids[i] ? formatUSD(estimate.kids[i]) : c.free}</span>
                    </p>
                  ))}
                </div>
                <p className="mt-2 flex items-end justify-between border-t border-brand-100 pt-2">
                  <span className="font-semibold text-ink">{t.estimate}</span>
                  <span className="text-2xl font-extrabold text-sun-500">
                    {formatUSD(estimate.total)}
                  </span>
                </p>
                <p className="mt-1.5 flex gap-1.5 text-[0.7rem] leading-snug text-muted">
                  <Info className="mt-0.5 size-3.5 shrink-0" /> {t.estimateNote}
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-brand-700">{c.priceOnRequest}</p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Nút quay lại + tóm tắt lựa chọn gộp thành một hàng */}
          <div className="flex items-center gap-2 rounded-lg bg-surface py-1.5 pr-3 pl-1.5 text-sm">
            <button
              type="button"
              onClick={() => setStep(0)}
              aria-label={c.back}
              title={c.back}
              className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-muted shadow-sm ring-1 ring-border hover:text-ink"
            >
              <ArrowLeft className="size-4" />
            </button>
            <p className="min-w-0">
              <strong className="text-ink">{date && fmtDate(date)}</strong> · {adults}{" "}
              {c.adults.toLowerCase()}
              {ages.length > 0 && ` · ${ages.length} ${c.children.toLowerCase()}`}
              {estimate && (
                <>
                  {" "}
                  · <strong className="text-sun-500">{formatUSD(estimate.total)}</strong>
                </>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.fullName} required htmlFor="bk-name">
              <Input
                id="bk-name"
                autoComplete="name"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </Field>
            <Field label={t.email} required htmlFor="bk-email">
              <Input
                id="bk-email"
                type="email"
                autoComplete="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.phone} htmlFor="bk-phone">
              <Input
                id="bk-phone"
                autoComplete="tel"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
            </Field>
            <Field label={t.nationality} htmlFor="bk-nat">
              <Input
                id="bk-nat"
                value={contact.nationality}
                onChange={(e) => setContact({ ...contact, nationality: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t.notes} htmlFor="bk-notes">
            <Textarea
              id="bk-notes"
              rows={4}
              className="min-h-32"
              value={contact.notes}
              onChange={(e) => setContact({ ...contact, notes: e.target.value })}
            />
          </Field>
          <p className="flex gap-2 text-xs leading-snug text-muted">
            <ShieldCheck className="size-4 shrink-0 text-brand-500" /> {c.noOnlinePayment}
          </p>
        </>
      )}

      <FormError show={!!error} text={error} />
      <FormError show={status === "error"} text={c.errorGeneric} />
      <button
        type="submit"
        disabled={status === "sending"}
        className="flex h-12 w-full items-center justify-center rounded-md bg-sun-500 text-base font-semibold text-white shadow-md shadow-sun-500/25 transition hover:bg-sun-600 disabled:opacity-60 short:h-11"
      >
        {step === 0 ? t.continue : status === "sending" ? c.sending : t.sendBooking}
      </button>
    </form>
  );
}
