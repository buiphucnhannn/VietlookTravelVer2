"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockScroll, smoothScrollTo } from "@/components/fx/SmoothScroll";
import Image from "next/image";
import {
  ArrowUpDown,
  Briefcase,
  CalendarDays,
  Circle,
  Clock,
  MapPin,
  Send,
  Users,
  X,
} from "lucide-react";
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

const QuoteCtx = createContext(null);

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
  const kindFor = quote.tripType === "byDay" ? "day" : "transfer";

  const fromOptions = useMemo(() => {
    const keys = new Set(
      routes
        .filter((r) => r.kind === kindFor)
        .flatMap((r) => (kindFor === "day" ? [r.from] : [r.from, r.to])),
    );
    return places.filter((p) => keys.has(p.key));
  }, [routes, places, kindFor]);

  const toOptions = useMemo(() => {
    if (!quote.from) return [];
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
        <label className="relative">
          <span className="mb-1 block text-xs font-semibold text-muted">{t.date}</span>
          <CalendarDays className="pointer-events-none absolute bottom-3.5 left-3 size-4 text-muted" />
          <input
            type="date"
            value={quote.date}
            onChange={(e) => update({ date: e.target.value })}
            className="h-12 w-full rounded-xl border border-border pr-2 pl-9 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="relative">
          <span className="mb-1 block text-xs font-semibold text-muted">{t.time}</span>
          <Clock className="pointer-events-none absolute bottom-3.5 left-3 size-4 text-muted" />
          <input
            type="time"
            value={quote.time}
            onChange={(e) => update({ time: e.target.value })}
            className="h-12 w-full rounded-xl border border-border pr-2 pl-9 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        {quote.tripType === "roundTrip" && (
          <>
            <label className="relative">
              <span className="mb-1 block text-xs font-semibold text-muted">{t.returnDate}</span>
              <input
                type="date"
                value={quote.returnDate}
                onChange={(e) => update({ returnDate: e.target.value })}
                className="h-12 w-full rounded-xl border border-border px-3 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="relative">
              <span className="mb-1 block text-xs font-semibold text-muted">{t.returnTime}</span>
              <input
                type="time"
                value={quote.returnTime}
                onChange={(e) => update({ returnTime: e.target.value })}
                className="h-12 w-full rounded-xl border border-border px-3 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
          </>
        )}
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs font-semibold text-muted">{t.passengers}</span>
        <Counter
          value={quote.passengers}
          min={1}
          max={45}
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
                ~{route.hours} {t.hours}
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
                    <span className="relative h-10 w-20 shrink-0">
                      <Image src={v.image} alt="" fill sizes="80px" className="object-contain" />
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
            onClick={() => (update({ vehicle: selected?.key || "" }), setOpen(true))}
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
            pickup: [quote.date, quote.time].filter(Boolean).join(" · "),
            back:
              quote.tripType === "roundTrip"
                ? [quote.returnDate, quote.returnTime].filter(Boolean).join(" · ")
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
  const { status, code, submit } = useEnquiry("car", lang);
  const [d, setD] = useState({
    name: "",
    phone: "",
    email: "",
    flight: "",
    notes: "",
    payment: "cash",
  });
  const [error, setError] = useState("");
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });

  useEffect(() => {
    lockScroll(true);
    return () => lockScroll(false);
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!d.name.trim() || (!d.phone.trim() && !/^\S+@\S+\.\S+$/.test(d.email)))
      return setError(`${c.required}: ${c.fullName} + ${c.phone} / Email`);
    setError("");
    await submit({ ...payload, ...d, summary }, formRef.current);
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
      data-lenis-prevent
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-brand-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 grid size-9 place-items-center rounded-full hover:bg-surface"
        >
          <X className="size-5" />
        </button>
        {status === "success" ? (
          <SuccessPanel title={t.successTitle} text={t.successText} code={code} labels={c} />
        ) : (
          <form ref={formRef} onSubmit={onSubmit} noValidate className="relative space-y-4">
            <Honeypot />
            <h3 className="text-2xl font-bold text-ink">{t.yourInfo}</h3>
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
            <Field label={c.fullName} required htmlFor="ck-name">
              <Input id="ck-name" autoComplete="name" value={d.name} onChange={set("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={c.phone} htmlFor="ck-phone">
                <Input id="ck-phone" autoComplete="tel" value={d.phone} onChange={set("phone")} />
              </Field>
              <Field label="Email" htmlFor="ck-email">
                <Input
                  id="ck-email"
                  type="email"
                  autoComplete="email"
                  value={d.email}
                  onChange={set("email")}
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
            <FormError show={!!error} text={error} />
            <FormError show={status === "error"} text={c.errorGeneric} />
            <div className="grid grid-cols-2 gap-3 pt-1">
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
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-brand font-bold text-ink hover:brightness-105 disabled:opacity-60"
              >
                <Send className="size-4" /> {status === "sending" ? c.sending : t.confirm}
              </button>
            </div>
            <p className="text-center text-xs text-muted">{c.noOnlinePayment}</p>
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
  const { status, code, submit, reset } = useEnquiry("car", lang);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", notes: "" });
  const [error, setError] = useState("");

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
    if (!contact.name.trim() || (!contact.email.trim() && !contact.phone.trim())) {
      return setError(`${c.required}: ${c.fullName} + Email / ${c.phone}`);
    }
    setError("");
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
      >
        <Input
          id="cq-route"
          value={quote.route}
          onChange={(e) => update({ route: e.target.value })}
        />
      </Field>
      <Field label={t.date} htmlFor="cq-date">
        <Input
          id="cq-date"
          type="date"
          value={quote.date}
          onChange={(e) => update({ date: e.target.value })}
        />
      </Field>
      <Field label={t.time} htmlFor="cq-time">
        <Input
          id="cq-time"
          type="time"
          value={quote.time}
          onChange={(e) => update({ time: e.target.value })}
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
          max={45}
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
      <Field label={c.fullName} required htmlFor="cq-name">
        <Input
          id="cq-name"
          autoComplete="name"
          value={contact.name}
          onChange={(e) => setContact({ ...contact, name: e.target.value })}
        />
      </Field>
      <Field label="Email" htmlFor="cq-email">
        <Input
          id="cq-email"
          type="email"
          autoComplete="email"
          value={contact.email}
          onChange={(e) => setContact({ ...contact, email: e.target.value })}
        />
      </Field>
      <Field label={c.phone} className="sm:col-span-2 lg:col-span-1" htmlFor="cq-phone">
        <Input
          id="cq-phone"
          autoComplete="tel"
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
        <FormError show={!!error} text={error} />
        <FormError show={status === "error"} text={c.errorGeneric} />
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
