"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, CalendarDays, Info, ShieldCheck } from "lucide-react";
import { cn, dateLocale, formatUSD } from "@/lib/utils";
import { childPercent, hotelClasses, isHoliday, unitPrice } from "@/lib/pricing";
import { tr } from "@/i18n/config";
import { childRatesSummary } from "@/components/tours/PriceTable";
import {
  Counter,
  Field,
  FormError,
  Honeypot,
  Input,
  PhoneInput,
  Select,
  SuccessPanel,
  Textarea,
  formMsg,
  useEnquiry,
  validate,
} from "@/components/forms/fields";
import ConsentCheckbox, {
  consentError,
  dropConsentError,
  focusFirstError,
  hasFieldErrors,
} from "@/components/forms/ConsentCheckbox";
import PaymentStep from "@/components/tours/PaymentStep";
import { fill } from "@/lib/payment";

const noopSubscribe = () => () => {};
// "1 adult" / "2 adults", "1 child" / "2 children" (zh/vi giống nhau ở 2 dạng)
const pax = (n, one, many) => `${n} ${(n === 1 && one ? one : many).toLowerCase()}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Ngày sớm nhất có thể đặt (+2 ngày) và 6 ngày gợi ý để chọn nhanh.
 * Tour có lịch khởi hành cố định (CMS: "Ngày cố định") → gợi ý đúng các ngày đó;
 * khởi hành các thứ trong tuần (CMS) → gợi ý các ngày rơi vào đúng thứ đó.
 * Tính hoàn toàn theo giờ UTC (ngày "YYYY-MM-DD" = 00:00 UTC): khách ở châu Mỹ không bị lệch sang thứ khác.
 */
function buildDepartures(today, days, fixedDates = [], weekdays = []) {
  if (!today) return { minDate: "", departures: [] };
  const min = new Date(today);
  min.setUTCDate(min.getUTCDate() + 2);
  if (fixedDates.length) {
    const minISO = min.toISOString().slice(0, 10);
    return { minDate: minISO, departures: fixedDates.filter((d) => d >= minISO).slice(0, 6) };
  }
  const list = [];
  const d = new Date(min);
  if (weekdays.length) {
    for (let k = 0; k < 60 && list.length < 6; k++) {
      d.setUTCDate(d.getUTCDate() + 1);
      if (weekdays.includes(d.getUTCDay())) list.push(d.toISOString().slice(0, 10));
    }
    return { minDate: min.toISOString().slice(0, 10), departures: list };
  }
  while (list.length < 6) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (days >= 4 ? d.getUTCDay() === 1 || d.getUTCDay() === 4 : d.getUTCDay() !== 0)
      list.push(d.toISOString().slice(0, 10));
    if (days < 4 && list.length) d.setUTCDate(d.getUTCDate() + 2);
  }
  return { minDate: min.toISOString().slice(0, 10), departures: list };
}

// Gợi ý chọn ngày khi tour khởi hành vào thứ cố định / ngày cố định (thay câu "khởi hành hằng ngày")
const FIXED_NOTE = {
  en: "Fixed departures – choose one of the next dates:",
  zh: "固定日期出发——请选择以下日期：",
  vi: "Khởi hành ngày cố định – chọn một trong các ngày sau:",
};
const HOTEL_LABEL = { en: "Hotel class", zh: "酒店星级", vi: "Hạng khách sạn" };
const EXTRA_LABEL = {
  holiday: { en: "Holiday surcharge", zh: "节假日附加费", vi: "Phụ thu lễ Tết" },
  single: { en: "Single supplement", zh: "单房差", vi: "Phụ thu phòng đơn" },
};

/** Đặt tour online: chọn ngày, người lớn, trẻ em (độ tuổi) → giá tạm tính → gửi yêu cầu. */
export default function BookingWidget({ lang, tour, t, c, payment }) {
  const formRef = useRef(null);
  const { status, code, submit, reset, error: sendError } = useEnquiry("booking", lang);
  // 9Pay bật (CMS) + đơn có giá → máy chủ trả "offer" (số tiền + payToken) → hiện bước thanh toán
  const [offer, setOffer] = useState(null);
  const p = payment?.labels;
  const payOnline = Boolean(payment?.enabled && p);
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [ages, setAges] = useState([]);
  // Hạng khách sạn (3★ / 4★ / 5★) — chỉ hiện khi tour có bảng giá theo hạng khách sạn trong CMS
  const classes = useMemo(() => hotelClasses(tour), [tour]);
  const [hotelClass, setHotelClass] = useState(null);
  const cls = classes.includes(hotelClass) ? hotelClass : (classes[0] ?? null);
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    nationality: "",
    notes: "",
    consent: false,
  });
  const [error, setError] = useState("");
  const [errs, setErrs] = useState({});

  // Ngày hôm nay chỉ đọc phía client (server trả chuỗi rỗng) để tránh lệch khi render sẵn
  const today = useSyncExternalStore(noopSubscribe, todayISO, () => "");
  const { minDate, departures } = useMemo(
    () =>
      buildDepartures(
        today,
        tour.days,
        tour.departure === "dates" ? tour.departureDates : [],
        tour.departure === "weekly" ? (tour.departureDays ?? []) : [],
      ),
    [today, tour.days, tour.departure, tour.departureDates, tour.departureDays],
  );

  // Giá tạm tính theo bảng giá trong CMS: bậc số khách, % trẻ em theo tuổi, phụ thu lễ Tết / phòng đơn
  // (cùng công thức với máy chủ — lib/pricing.js; máy chủ tính lại khi nhận đơn)
  const unit = unitPrice(tour, adults + ages.length, cls);

  const estimate = useMemo(() => {
    if (!unit) return null;
    const kids = ages.map((a) => Math.round((unit * childPercent(tour, a)) / 100));
    const extras = [];
    if (isHoliday(tour, date)) {
      const base = unit * adults + kids.reduce((x, y) => x + y, 0);
      const holiday = tour.pricing?.holidaySurcharge;
      const percent = tour.pricing?.holidayPercent;
      let amount = 0;
      if (holiday > 0)
        amount += holiday * (adults + ages.filter((a) => childPercent(tour, a) > 0).length);
      if (percent > 0) amount += Math.round((base * percent) / 100);
      if (amount > 0) extras.push({ key: "holiday", amount });
    }
    const single = tour.pricing?.singleSupplement;
    if (single > 0 && adults === 1 && !ages.length) extras.push({ key: "single", amount: single });
    const total =
      unit * adults + kids.reduce((s, x) => s + x, 0) + extras.reduce((s, x) => s + x.amount, 0);
    return { adults: unit * adults, kids, extras, total };
  }, [unit, adults, ages, date, tour]);

  // Chọn lại ngày → bỏ lỗi cũ của ô ngày (không để "chọn ngày trong tương lai" khi đã chọn đúng)
  const pickDate = (v) => {
    setDate(v);
    setErrs((e) => (e.date ? { ...e, date: undefined } : e));
  };
  const setChildren = (n) =>
    setAges((a) => (n > a.length ? [...a, ...Array(n - a.length).fill(8)] : a.slice(0, n)));
  const fmtDate = (iso) =>
    new Intl.DateTimeFormat(dateLocale(lang), {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(iso));

  if (offer && code && p) {
    const guests = [
      pax(adults, c.adult, c.adults),
      ages.length > 0 && pax(ages.length, c.child, c.children),
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <PaymentStep
        lang={lang}
        code={code}
        offer={offer}
        p={p}
        summary={{
          tour: tour.title,
          date: date && fmtDate(date),
          guests,
          hotel: classes.length > 1 && cls ? `${cls}★` : "",
        }}
      />
    );
  }

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
    const m = formMsg(lang);
    if (step === 0) {
      // Ngày khởi hành bắt buộc và không được sớm hơn ngày sớm nhất có thể đặt (kể cả khi gõ tay)
      const bad = !date
        ? m.date
        : !/^\d{4}-\d{2}-\d{2}$/.test(date) || (minDate && date < minDate)
          ? m.dateFuture
          : "";
      setErrs(bad ? { date: bad } : {});
      if (bad) return setError("");
      setError("");
      return setStep(1);
    }
    const v = { ...validate(contact, lang), ...consentError(contact.consent, c) };
    setErrs(v);
    if (Object.keys(v).length) {
      setError(hasFieldErrors(v) ? m.fix : "");
      return focusFirstError(formRef.current);
    }
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
        ...(cls && { hotelClass: cls }),
        estimateUSD: estimate?.total ?? "on request",
      },
      formRef.current,
      {
        // cùng lượt cập nhật với "đã gửi" → không nháy khung cảm ơn trước bước thanh toán
        stay: (d) => {
          if (!payOnline || !d?.payment) return false;
          setOffer(d.payment);
          return true;
        },
      },
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
          <Field label={t.departureDate} required htmlFor="bk-date" error={errs.date}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-brand-500" />
              <Input
                id="bk-date"
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => pickDate(e.target.value)}
                aria-invalid={!!errs.date}
                className="pl-11 short:h-11"
              />
            </div>
          </Field>
          {departures.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted">
                {tour.departure === "dates" ||
                (tour.departure === "weekly" && tour.departureDays?.length)
                  ? tr(FIXED_NOTE, lang)
                  : t.departureNote}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {departures.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pickDate(d)}
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
          {classes.length > 1 && (
            <Field label={tr(HOTEL_LABEL, lang)}>
              <div className="grid auto-cols-fr grid-flow-col gap-2">
                {classes.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={cls === k}
                    onClick={() => setHotelClass(k)}
                    className={cn(
                      "h-10 rounded-lg border text-sm font-semibold transition",
                      cls === k
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-border text-ink hover:border-brand-300",
                    )}
                  >
                    {k}★
                  </button>
                ))}
              </div>
            </Field>
          )}
          {ages.length > 0 && (
            <Field
              label={t.childAges}
              hint={childRatesSummary(tour.pricing?.childRates, lang) || t.childPolicy}
            >
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
                    {Array.from({ length: 18 }, (_, k) => k).map((k) => (
                      <option key={k} value={k}>
                        {k || "< 1"} {k <= 1 && c.ageOne ? c.ageOne : c.age}
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
                      {pax(adults, c.adult, c.adults)} × {formatUSD(unit)}
                    </span>
                    <span>{formatUSD(estimate.adults)}</span>
                  </p>
                  {ages.map((a, i) => (
                    <p key={i} className="flex justify-between">
                      <span>
                        {c.child} {a} {a <= 1 && c.ageOne ? c.ageOne : c.age}
                      </span>
                      <span>{estimate.kids[i] ? formatUSD(estimate.kids[i]) : c.free}</span>
                    </p>
                  ))}
                  {estimate.extras.map((x) => (
                    <p key={x.key} className="flex justify-between">
                      <span>{tr(EXTRA_LABEL[x.key], lang)}</span>
                      <span>{formatUSD(x.amount)}</span>
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
              <strong className="text-ink">{date && fmtDate(date)}</strong> ·{" "}
              {pax(adults, c.adult, c.adults)}
              {ages.length > 0 && ` · ${pax(ages.length, c.child, c.children)}`}
              {estimate && (
                <>
                  {" "}
                  · <strong className="text-sun-500">{formatUSD(estimate.total)}</strong>
                </>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.fullName} required htmlFor="bk-name" error={errs.name}>
              <Input
                id="bk-name"
                autoComplete="name"
                value={contact.name}
                aria-invalid={!!errs.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </Field>
            <Field label={t.email} required htmlFor="bk-email" error={errs.email}>
              <Input
                id="bk-email"
                type="email"
                autoComplete="email"
                value={contact.email}
                aria-invalid={!!errs.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.phone} htmlFor="bk-phone" error={errs.phone}>
              <PhoneInput
                id="bk-phone"
                value={contact.phone}
                aria-invalid={!!errs.phone}
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
              rows={3}
              className="min-h-24"
              value={contact.notes}
              onChange={(e) => setContact({ ...contact, notes: e.target.value })}
            />
          </Field>
          <p className="flex gap-2 text-xs leading-snug text-muted">
            <ShieldCheck className="size-4 shrink-0 text-brand-500" />{" "}
            {payOnline
              ? payment.depositPercent < 100
                ? fill(p.noteDeposit, { percent: payment.depositPercent })
                : p.note
              : c.noOnlinePayment}
          </p>
          <ConsentCheckbox
            id="bk-consent"
            lang={lang}
            c={c}
            checked={contact.consent}
            onChange={(v) => {
              setContact({ ...contact, consent: v });
              if (v) setErrs(dropConsentError);
            }}
            error={errs.consent}
          />
        </>
      )}

      <FormError show={!!error} text={error} />
      <FormError show={status === "error"} text={sendError || c.errorGeneric} />
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
