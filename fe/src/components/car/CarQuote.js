"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockScroll, smoothScrollTo } from "@/components/fx/SmoothScroll";
import Image from "next/image";
import { ArrowUpDown, Briefcase, Circle, MapPin, Send, Users, X } from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import { fmtDate, fmtDuration, isTime } from "@/lib/dates";
import { useVisualViewport } from "@/lib/use-visual-viewport";
import { useA11y } from "@/components/layout/A11y";
import {
  Counter,
  DateInput,
  Field,
  FormError,
  Honeypot,
  Input,
  PhoneInput,
  Select,
  SuccessPanel,
  Textarea,
  TimeInput,
  dateError,
  formMsg,
  isFutureDate,
  useMinBookingDate,
  useEnquiry,
  validate,
} from "@/components/forms/fields";
import ConsentCheckbox, {
  consentError,
  dropConsentError,
  focusFirstError,
  hasFieldErrors,
} from "@/components/forms/ConsentCheckbox";

/**
 * Kiểm tra ngày / giờ đi – về của báo giá xe: không được là ngày đã qua; ngày về ≥ ngày đi;
 * giờ đúng dạng HH:mm; về trong cùng ngày → giờ về sau giờ đón.
 */
function carDateErrors(q, lang) {
  const m = formMsg(lang);
  const e = {};
  const round = q.tripType === "roundTrip";
  if (q.date && dateError(q.date, m)) e.date = dateError(q.date, m);
  if (q.time && !isTime(q.time)) e.time = m.timeInvalid;
  if (round && q.returnTime && !isTime(q.returnTime)) e.returnTime = m.timeInvalid;
  if (round && q.returnDate) {
    if (dateError(q.returnDate, m)) e.returnDate = dateError(q.returnDate, m);
    else if (isFutureDate(q.date) && q.returnDate < q.date) e.returnDate = m.returnAfter;
    else if (
      q.returnDate === q.date &&
      isTime(q.time) &&
      isTime(q.returnTime) &&
      q.returnTime <= q.time
    )
      e.returnTime = m.returnTimeAfter;
  }
  return e;
}

const QuoteCtx = createContext(null);

/** Số khách tối đa chọn được = sức chứa của xe lớn nhất (vd. xe 45 chỗ chở tối đa 44 khách). */
const maxPax = (vehicles) => Math.max(1, ...vehicles.map((v) => v.pax || 0));

/** Trạng thái báo giá dùng chung giữa ô báo giá (hero), sân khấu xe, bảng tuyến và form đầy đủ. */
export function CarQuoteProvider({ children }) {
  const [quote, setQuote] = useState({
    tripType: "oneWay",
    from: "",
    to: "",
    date: "",
    time: "09:00",
    returnDate: "",
    returnTime: "17:00",
    passengers: 2,
    vehicle: "",
    airport: "none",
    flight: "",
    route: "",
  });
  const update = (patch) => setQuote((q) => ({ ...q, ...patch }));
  const goToForm = () => smoothScrollTo("#quote");
  const goToQuick = () => smoothScrollTo("#quick-quote", { block: "center" });
  return (
    <QuoteCtx.Provider value={{ quote, update, goToForm, goToQuick }}>{children}</QuoteCtx.Provider>
  );
}

export const useCarQuote = () => useContext(QuoteCtx);

function PlaceSelect({ value, onChange, options, icon, label, t }) {
  const groups = [
    { key: "air", label: t.grpAirports },
    { key: "city", label: t.grpCities },
  ];
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 focus-within:border-brand-500">
      {icon}
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none bg-transparent pr-6 text-[0.95rem] focus:outline-none"
      >
        <option value="">{t.selectPlace}</option>
        {groups.map((g) => {
          const opts = options.filter((o) => o.group === g.key);
          if (!opts.length) return null;
          return (
            <optgroup key={g.key} label={g.label}>
              {opts.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.name}
                </option>
              ))}
            </optgroup>
          );
        })}
        {options.some((o) => o.key === "__other") && <option value="__other">{t.otherDest}</option>}
      </select>
    </label>
  );
}

/**
 * Ô "Xem giá cố định" – luồng như hltcarservice.com:
 * chọn tuyến → danh sách loại xe kèm giá (giá thật từ web cũ, chưa có thì "Giá liên hệ")
 * → Tiếp tục → popup nhập thông tin & gửi yêu cầu (không thanh toán online).
 */
export function QuickQuote({ lang, t, c, places, routes, vehicles }) {
  const { quote, update } = useCarQuote();
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const [dateErr, setDateErr] = useState({});
  const minDate = useMinBookingDate();
  const kindFor = quote.tripType === "byDay" ? "day" : "transfer";

  // Đưa đón (một chiều / khứ hồi): chọn được mọi điểm đón – tuyến chưa có giá cố định thì báo "Giá liên hệ".
  // Theo ngày / tour: chỉ các điểm có tour trong ngày.
  const fromOptions = useMemo(() => {
    if (kindFor === "transfer") return places;
    const keys = new Set(
      routes
        .filter((r) => r.kind === kindFor)
        .flatMap((r) => (kindFor === "day" ? [r.from] : [r.from, r.to])),
    );
    return places.filter((p) => keys.has(p.key));
  }, [routes, places, kindFor]);

  const toOptions = useMemo(() => {
    if (!quote.from) return [];
    if (kindFor === "transfer") {
      return [...places.filter((p) => p.key !== quote.from), { key: "__other", group: "other" }];
    }
    const keys = new Set(
      routes
        .filter(
          (r) =>
            r.kind === kindFor &&
            (r.from === quote.from || (kindFor === "transfer" && r.to === quote.from)),
        )
        .map((r) => (r.from === quote.from ? r.to : r.from)),
    );
    return [...places.filter((p) => keys.has(p.key)), { key: "__other", group: "other" }];
  }, [routes, places, quote.from, kindFor]);

  const route = routes.find(
    (r) =>
      r.kind === kindFor &&
      ((r.from === quote.from && r.to === quote.to) ||
        (kindFor === "transfer" && r.from === quote.to && r.to === quote.from)),
  );
  const placeName = (k) =>
    places.find((p) => p.key === k)?.name || (k === "__other" ? t.otherDest : "");

  const priced = vehicles.map((v) => ({
    ...v,
    price: route && v.priceKey ? (route.prices[v.priceKey] ?? null) : null,
  }));
  const best =
    priced.find((v) => v.price && v.pax >= quote.passengers) ||
    priced.find((v) => v.pax >= quote.passengers);
  const selected = priced.find((v) => v.key === quote.vehicle) || best;

  const tabs = [
    { key: "oneWay", label: t.oneWay },
    { key: "roundTrip", label: t.roundTrip },
    { key: "byDay", label: t.byDay },
  ];

  return (
    <div
      id="quick-quote"
      className="rounded-3xl bg-white/95 p-5 text-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/50 backdrop-blur sm:p-6"
    >
      <h2 className="text-lg font-bold">{t.quickTitle}</h2>
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
        {tabs.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => (
              update({ tripType: x.key, from: "", to: "", vehicle: "" }),
              setShown(false)
            )}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold transition",
              quote.tripType === x.key ? "bg-white text-ink shadow" : "text-muted hover:text-ink",
            )}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="relative mt-4 space-y-2">
        <PlaceSelect
          t={t}
          label={t.pickup}
          value={quote.from}
          onChange={(v) => (
            update({
              from: v,
              to: kindFor === "day" ? "" : quote.to === v ? "" : quote.to,
              vehicle: "",
            }),
            setShown(false)
          )}
          options={fromOptions}
          icon={<Circle className="size-4 shrink-0 text-amber-brand" strokeWidth={3} />}
        />
        <PlaceSelect
          t={t}
          label={kindFor === "day" ? t.tourType : t.dropoff}
          value={quote.to}
          onChange={(v) => (update({ to: v, vehicle: "" }), setShown(false))}
          options={toOptions}
          icon={<MapPin className="size-4 shrink-0 text-brand-600" />}
        />
        {kindFor === "transfer" && (
          <button
            type="button"
            aria-label={t.swap}
            onClick={() => (
              update({ from: quote.to === "__other" ? quote.from : quote.to, to: quote.from }),
              setShown(false)
            )}
            className="absolute top-1/2 right-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-white shadow-sm transition hover:rotate-180 hover:border-brand-400"
          >
            <ArrowUpDown className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="qq-date" className="mb-1 block text-xs font-semibold text-muted">
            {t.date}
          </label>
          <DateInput
            id="qq-date"
            lang={lang}
            min={minDate}
            value={quote.date}
            onChange={(e) => (update({ date: e.target.value }), setDateErr({}))}
            aria-invalid={!!dateErr.date}
            className="rounded-xl px-3 text-sm"
          />
          {dateErr.date && (
            <span className="mt-1 block text-xs font-medium text-sun-600">{dateErr.date}</span>
          )}
        </div>
        <div>
          <label htmlFor="qq-time" className="mb-1 block text-xs font-semibold text-muted">
            {t.time}
          </label>
          <TimeInput
            id="qq-time"
            lang={lang}
            value={quote.time}
            onChange={(e) => (update({ time: e.target.value }), setDateErr({}))}
            aria-invalid={!!dateErr.time}
            className="rounded-xl px-3 text-sm"
          />
          {dateErr.time && (
            <span className="mt-1 block text-xs font-medium text-sun-600">{dateErr.time}</span>
          )}
        </div>
        {quote.tripType === "roundTrip" && (
          <>
            <div>
              <label htmlFor="qq-return" className="mb-1 block text-xs font-semibold text-muted">
                {t.returnDate}
              </label>
              <DateInput
                id="qq-return"
                lang={lang}
                min={isFutureDate(quote.date) ? quote.date : minDate}
                value={quote.returnDate}
                onChange={(e) => (update({ returnDate: e.target.value }), setDateErr({}))}
                aria-invalid={!!dateErr.returnDate}
                className="rounded-xl px-3 text-sm"
              />
              {dateErr.returnDate && (
                <span className="mt-1 block text-xs font-medium text-sun-600">
                  {dateErr.returnDate}
                </span>
              )}
            </div>
            <div>
              <label
                htmlFor="qq-return-time"
                className="mb-1 block text-xs font-semibold text-muted"
              >
                {t.returnTime}
              </label>
              <TimeInput
                id="qq-return-time"
                lang={lang}
                value={quote.returnTime}
                onChange={(e) => (update({ returnTime: e.target.value }), setDateErr({}))}
                aria-invalid={!!dateErr.returnTime}
                className="rounded-xl px-3 text-sm"
              />
              {dateErr.returnTime && (
                <span className="mt-1 block text-xs font-medium text-sun-600">
                  {dateErr.returnTime}
                </span>
              )}
            </div>
          </>
        )}
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs font-semibold text-muted">{t.passengers}</span>
        <Counter
          value={quote.passengers}
          min={1}
          max={maxPax(vehicles)}
          onChange={(v) => update({ passengers: v, vehicle: "" })}
          label={t.passengers}
        />
      </div>
      <button
        type="button"
        disabled={!quote.from || !quote.to}
        onClick={() => setShown(true)}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-brand text-base font-bold text-ink shadow-lg shadow-amber-brand/30 transition hover:brightness-105 disabled:opacity-50"
      >
        {t.seePrices}
      </button>

      {shown && (
        <div className="mt-5 animate-fade-up border-t border-border pt-5">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span className="flex-1">{placeName(quote.from)}</span>
            {route?.hours && (
              <span className="shrink-0 text-xs text-[#a26a00]">
                {fmtDuration(route.hours, lang)}
              </span>
            )}
            <span className="flex-1 text-right">{placeName(quote.to)}</span>
          </div>
          {!route && (
            <p className="mt-3 rounded-lg bg-amber-brand/15 px-3 py-2 text-sm text-ink">
              {t.noFixed}
            </p>
          )}
          <p className="mt-4 mb-2 text-sm font-semibold">{t.chooseVehicle}</p>
          <ul data-lenis-prevent className="max-h-[340px] space-y-3 overflow-y-auto pt-2 pr-1">
            {priced.map((v) => {
              const tooSmall = v.pax < quote.passengers;
              const isSel = selected?.key === v.key;
              return (
                <li key={v.key}>
                  <button
                    type="button"
                    disabled={tooSmall}
                    onClick={() => update({ vehicle: v.key })}
                    className={cn(
                      "relative flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition",
                      isSel
                        ? "border-amber-brand bg-amber-brand/10"
                        : "border-border hover:border-brand-300",
                      tooSmall && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {v.key === best?.key && (
                      <span className="absolute -top-2 right-3 rounded-full bg-amber-brand px-2 py-0.5 text-[0.65rem] font-bold text-ink">
                        {t.bestMatch}
                      </span>
                    )}
                    <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg">
                      <Image src={v.image} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                    <span className="flex-1 leading-tight">
                      <span className="block text-sm font-bold">{v.name}</span>
                      <span className="flex gap-2 text-xs text-muted">
                        <span>
                          {v.seats} {t.seats}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users className="size-3" /> {v.pax}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Briefcase className="size-3" /> {v.luggage}
                        </span>
                      </span>
                    </span>
                    <span className="text-right text-sm font-extrabold">
                      {v.price ? (
                        formatUSD(v.price)
                      ) : (
                        <span className="font-semibold text-brand-700">{c.contactPrice}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="text-xs text-muted">
              {quote.tripType === "roundTrip"
                ? t.roundNote
                : kindFor === "day"
                  ? t.dayNote
                  : t.oneWayNote}
            </p>
            <p className="shrink-0 text-2xl font-extrabold">
              {selected?.price ? (
                formatUSD(selected.price)
              ) : (
                <span className="text-base text-brand-700">{c.contactPrice}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const e = carDateErrors(quote, lang);
              setDateErr(e);
              if (Object.keys(e).length) return;
              update({ vehicle: selected?.key || "" });
              setOpen(true);
            }}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-amber-brand font-bold text-ink hover:brightness-105"
          >
            {t.continue}
          </button>
        </div>
      )}

      {open && (
        <CheckoutModal
          lang={lang}
          t={t}
          c={c}
          onClose={() => setOpen(false)}
          summary={{
            route: `${placeName(quote.from)} → ${placeName(quote.to)}`,
            pickup: [fmtDate(quote.date, lang), quote.time].filter(Boolean).join(" · "),
            back:
              quote.tripType === "roundTrip"
                ? [fmtDate(quote.returnDate, lang), quote.returnTime].filter(Boolean).join(" · ")
                : null,
            pax: quote.passengers,
            vehicle: selected?.name,
            price: selected?.price ? formatUSD(selected.price) : c.contactPrice,
            airport: [quote.from, quote.to].some(
              (k) => places.find((p) => p.key === k)?.group === "air",
            ),
          }}
          payload={{
            ...quote,
            routeSlug: route?.slug,
            vehicle: selected?.key,
            priceUSD: selected?.price ?? "on request",
          }}
        />
      )}
    </div>
  );
}

/** Popup "Thông tin của bạn": tóm tắt chuyến + liên hệ + hình thức thanh toán (không online). */
function CheckoutModal({ lang, t, c, summary, payload, onClose }) {
  const formRef = useRef(null);
  const overlayRef = useRef(null);
  useVisualViewport(overlayRef);
  const a11y = useA11y();
  const { status, code, submit, error: sendError } = useEnquiry("car", lang);
  const [d, setD] = useState({
    name: "",
    phone: "",
    email: "",
    flight: "",
    notes: "",
    payment: "cash",
    consent: false,
  });
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const setConsent = (v) => {
    setD({ ...d, consent: v });
    if (v) setErrs(dropConsentError);
  };

  useEffect(() => {
    lockScroll(true);
    return () => lockScroll(false);
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = {
      ...validate(d, lang, { email: "either" }),
      ...carDateErrors(payload, lang),
      ...consentError(d.consent, c),
    };
    setErrs(v);
    if (Object.keys(v).length) return focusFirstError(formRef.current);
    // Backend chỉ nhận giá trị đơn (chữ/số/mảng) → tóm tắt chuyến gửi dạng một dòng chữ
    const text = [...rows, [t.total, summary.price]].map(([k, v]) => `${k}: ${v}`).join(" · ");
    await submit({ ...payload, ...d, summary: text }, formRef.current);
  };

  const rows = [
    [t.sumRoute, summary.route],
    [t.sumPickup, summary.pickup || "—"],
    summary.back && [t.sumReturn, summary.back],
    [t.passengers, summary.pax],
    [t.vehicle, summary.vehicle || "—"],
  ].filter(Boolean);

  // Portal ra body để không bị khung cha có backdrop-filter giới hạn vị trí "fixed"
  return createPortal(
    <div
      ref={overlayRef}
      data-lenis-prevent
      className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-950/60 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t.yourInfo}
      onClick={onClose}
    >
      {/* Thẻ giữa màn hình, không cao quá màn hình: tiêu đề + hàng nút luôn hiện, chỉ phần thân cuộn */}
      <div
        className="relative flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={a11y.close}
          className="absolute top-2 right-2.5 z-10 grid size-10 place-items-center rounded-full bg-white/90 hover:bg-surface sm:top-6 sm:right-6"
        >
          <X className="size-5" />
        </button>
        {status === "success" ? (
          <div className="min-h-0 scrollbar-thin overflow-y-auto overscroll-contain p-5 sm:p-8">
            <SuccessPanel title={t.successTitle} text={t.successText} code={code} labels={c} />
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={onSubmit}
            noValidate
            className="relative flex min-h-0 flex-1 flex-col"
          >
            <h3 className="shrink-0 border-b border-black/5 py-3.5 pr-14 pl-5 text-xl font-bold text-ink sm:pt-7 sm:pr-16 sm:pb-4 sm:pl-8 sm:text-2xl">
              {t.yourInfo}
            </h3>
            <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-8 sm:py-5">
              <Honeypot />
              <dl className="space-y-2 rounded-2xl bg-[#f6f1e8] p-4 text-sm">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-semibold text-ink">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-black/5 pt-2">
                  <dt className="text-muted">{t.total}</dt>
                  <dd className="text-lg font-extrabold text-ink">{summary.price}</dd>
                </div>
              </dl>
              <Field label={c.fullName} required htmlFor="ck-name" error={errs.name}>
                <Input
                  id="ck-name"
                  autoComplete="name"
                  value={d.name}
                  onChange={set("name")}
                  aria-invalid={!!errs.name}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={c.phone} htmlFor="ck-phone" error={errs.phone}>
                  <PhoneInput
                    id="ck-phone"
                    value={d.phone}
                    onChange={set("phone")}
                    aria-invalid={!!errs.phone}
                  />
                </Field>
                <Field label="Email" htmlFor="ck-email" error={errs.email}>
                  <Input
                    id="ck-email"
                    type="email"
                    autoComplete="email"
                    value={d.email}
                    onChange={set("email")}
                    aria-invalid={!!errs.email}
                  />
                </Field>
              </div>
              {summary.airport && (
                <Field label={t.flightNumber} htmlFor="ck-flight">
                  <Input
                    id="ck-flight"
                    value={d.flight}
                    onChange={set("flight")}
                    placeholder="VN123"
                  />
                </Field>
              )}
              <Field label={c.notesOptional} htmlFor="ck-notes">
                <Textarea
                  id="ck-notes"
                  rows={2}
                  value={d.notes}
                  onChange={set("notes")}
                  placeholder={t.notesHint}
                />
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-ink">{t.payment}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ["cash", t.payCash],
                    ["bank", t.payBank],
                  ].map(([k, label]) => (
                    <label
                      key={k}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold",
                        d.payment === k ? "border-amber-brand bg-amber-brand/10" : "border-border",
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={k}
                        checked={d.payment === k}
                        onChange={set("payment")}
                        className="accent-[#f7b32b]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <ConsentCheckbox
                id="ck-consent"
                lang={lang}
                c={c}
                checked={d.consent}
                onChange={setConsent}
                error={errs.consent}
              />
              <FormError
                show={hasFieldErrors(errs)}
                text={
                  errs.date || errs.returnDate || errs.time || errs.returnTime || formMsg(lang).fix
                }
              />
              <FormError show={status === "error"} text={sendError || c.errorGeneric} />
            </div>
            <div className="shrink-0 border-t border-black/5 bg-white px-5 pt-3 pb-3 sm:px-8 sm:pt-4 sm:pb-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 rounded-xl border border-border font-semibold text-ink hover:bg-surface"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-brand px-2 font-bold text-ink hover:brightness-105 disabled:opacity-60"
                >
                  <Send className="size-4 shrink-0" />{" "}
                  {status === "sending" ? c.sending : t.confirm}
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-muted">{c.noOnlinePayment}</p>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Form báo giá đầy đủ cho lộ trình riêng/nhiều ngày: lộ trình, ngày đi, loại xe, số khách, đón/tiễn sân bay. */
export function CarQuoteForm({ lang, t, c, vehicles }) {
  const formRef = useRef(null);
  const { quote, update } = useCarQuote();
  const { status, code, submit, reset, error: sendError } = useEnquiry("car", lang);
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    consent: false,
  });
  const [errs, setErrs] = useState({});

  if (status === "success") {
    return (
      <SuccessPanel
        title={t.successTitle}
        text={t.successText}
        code={code}
        labels={c}
        onReset={reset}
      />
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = {
      // chưa có lộ trình thì nhân viên không báo giá được → bắt buộc
      ...(!String(quote.route ?? "").trim() && { route: formMsg(lang).route }),
      ...validate(contact, lang, { email: "either" }),
      ...carDateErrors(quote, lang),
      ...consentError(contact.consent, c),
    };
    setErrs(v);
    if (Object.keys(v).length) return focusFirstError(formRef.current);
    await submit({ ...quote, ...contact }, formRef.current);
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Honeypot />
      <Field
        label={t.route}
        hint={t.routeHint}
        className="sm:col-span-2 lg:col-span-3"
        htmlFor="cq-route"
        required
        error={errs.route}
      >
        <Input
          id="cq-route"
          value={quote.route}
          onChange={(e) => update({ route: e.target.value })}
          aria-invalid={!!errs.route}
        />
      </Field>
      <Field label={t.date} htmlFor="cq-date" error={errs.date}>
        <DateInput
          id="cq-date"
          lang={lang}
          value={quote.date}
          onChange={(e) => update({ date: e.target.value })}
          aria-invalid={!!errs.date}
        />
      </Field>
      <Field label={t.time} htmlFor="cq-time" error={errs.time}>
        <TimeInput
          id="cq-time"
          lang={lang}
          value={quote.time}
          onChange={(e) => update({ time: e.target.value })}
          aria-invalid={!!errs.time}
        />
      </Field>
      <Field label={t.vehicle} htmlFor="cq-vehicle">
        <Select
          id="cq-vehicle"
          value={quote.vehicle}
          onChange={(e) => update({ vehicle: e.target.value })}
        >
          <option value="">—</option>
          {vehicles.map((v) => (
            <option key={v.key} value={v.key}>
              {v.name} ({v.seats} {t.seats})
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.passengers}>
        <Counter
          value={quote.passengers}
          min={1}
          max={maxPax(vehicles)}
          onChange={(v) => update({ passengers: v })}
          label={t.passengers}
        />
      </Field>
      <Field label={t.airport} htmlFor="cq-airport">
        <Select
          id="cq-airport"
          value={quote.airport}
          onChange={(e) => update({ airport: e.target.value })}
        >
          <option value="none">{t.airportNone}</option>
          <option value="pickup">{t.airportPickup}</option>
          <option value="dropoff">{t.airportDropoff}</option>
          <option value="both">{t.airportBoth}</option>
        </Select>
      </Field>
      <Field label={t.flightNumber} htmlFor="cq-flight">
        <Input
          id="cq-flight"
          value={quote.flight}
          onChange={(e) => update({ flight: e.target.value })}
          placeholder="VN123"
        />
      </Field>
      <Field label={c.fullName} required htmlFor="cq-name" error={errs.name}>
        <Input
          id="cq-name"
          aria-invalid={!!errs.name}
          autoComplete="name"
          value={contact.name}
          onChange={(e) => setContact({ ...contact, name: e.target.value })}
        />
      </Field>
      <Field label="Email" htmlFor="cq-email" error={errs.email}>
        <Input
          id="cq-email"
          aria-invalid={!!errs.email}
          type="email"
          autoComplete="email"
          value={contact.email}
          onChange={(e) => setContact({ ...contact, email: e.target.value })}
        />
      </Field>
      <Field
        label={c.phone}
        className="sm:col-span-2 lg:col-span-1"
        htmlFor="cq-phone"
        error={errs.phone}
      >
        <PhoneInput
          id="cq-phone"
          aria-invalid={!!errs.phone}
          value={contact.phone}
          onChange={(e) => setContact({ ...contact, phone: e.target.value })}
        />
      </Field>
      <Field label={c.notes} className="sm:col-span-2 lg:col-span-3" htmlFor="cq-notes">
        <Textarea
          id="cq-notes"
          rows={2}
          value={contact.notes}
          onChange={(e) => setContact({ ...contact, notes: e.target.value })}
        />
      </Field>
      <div className="space-y-3 sm:col-span-2 lg:col-span-3">
        <ConsentCheckbox
          id="cq-consent"
          lang={lang}
          c={c}
          checked={contact.consent}
          onChange={(v) => {
            setContact({ ...contact, consent: v });
            if (v) setErrs(dropConsentError);
          }}
          error={errs.consent}
        />
        <FormError show={hasFieldErrors(errs)} text={formMsg(lang).fix} />
        <FormError show={status === "error"} text={sendError || c.errorGeneric} />
        <button
          type="submit"
          disabled={status === "sending"}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-sun-500 text-base font-semibold text-white shadow-lg shadow-sun-500/25 transition hover:bg-sun-600 disabled:opacity-60"
        >
          <Send className="size-4" /> {status === "sending" ? c.sending : t.getQuote}
        </button>
        <p className="text-center text-xs text-muted">{c.noOnlinePayment}</p>
      </div>
    </form>
  );
}
