"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import {
  Chips,
  Counter,
  DateInput,
  Field,
  FormError,
  Honeypot,
  Input,
  PhoneInput,
  Select,
  SuccessPanel,
  formMsg,
  useEnquiry,
  validate,
} from "./fields";
import ConsentCheckbox, {
  consentError,
  dropConsentError,
  focusFirstError,
  hasFieldErrors,
} from "./ConsentCheckbox";

/**
 * Ô "Gói" chỉ hiện gói hợp với ô "Dịch vụ" (theo thứ tự t.services — giống nhau ở 3 ngôn ngữ), tránh yêu cầu
 * mâu thuẫn kiểu "E-visa support" + "Departure VIP lane":
 *   0 Fast-track only / 3 Fast-track + airport transfer → gói đến (không kèm visa tại sân bay), gói đi, cộng thêm
 *   1 E-visa support → gói đến (không kèm visa tại sân bay) + cộng thêm
 *   2 Visa on arrival + fast-track → gói đến CÓ visa tại sân bay + cộng thêm
 */
const isVoa = (l) => /voa/i.test(l.key) || /visa on arrival/i.test(l.name?.en ?? "");
const plainArrivalOr =
  (...groups) =>
  (l) =>
    (l.group === "arrival" && !isVoa(l)) || groups.includes(l.group);
const SERVICE_FITS = [
  plainArrivalOr("departure", "addons"),
  plainArrivalOr("addons"),
  (l) => (l.group === "arrival" && isVoa(l)) || l.group === "addons",
  plainArrivalOr("departure", "addons"),
];
function levelsFor(levels, services, service) {
  const fits = SERVICE_FITS[services.indexOf(service)];
  const list = fits ? levels.filter(fits) : levels;
  return list.length ? list : levels;
}
const defaultLevel = (list) => (list.find((l) => l.popular) ?? list[0])?.key;

/**
 * Form đặt dịch vụ visa/fast-track (yêu cầu 24): quốc tịch, số người, ngày nhập cảnh, sân bay,
 * số hiệu chuyến bay, gói dịch vụ. `levels` = danh sách gói đã dịch, có `group` để gom nhóm trong select.
 */
export default function VisaForm({ lang, t, c, airports, levels, groupLabels }) {
  const formRef = useRef(null);
  const { status, code, submit, reset, error: sendError } = useEnquiry("visa", lang);
  const [errs, setErrs] = useState({});
  const [d, setD] = useState({
    service: t.services[0],
    level: defaultLevel(levelsFor(levels, t.services, t.services[0])),
    nationality: "",
    travellers: 2,
    entryDate: "",
    airport: airports[0].code,
    flight: "",
    name: "",
    email: "",
    phone: "",
    consent: false,
  });
  const set = (k) => (e) => setD({ ...d, [k]: e?.target ? e.target.value : e });
  const setConsent = (v) => {
    setD({ ...d, consent: v });
    if (v) setErrs(dropConsentError);
  };

  // Đổi dịch vụ → gói đang chọn không hợp thì chọn lại gói đầu tiên hợp lệ
  const setService = (service) =>
    setD((x) => {
      const list = levelsFor(levels, t.services, service);
      return {
        ...x,
        service,
        level: list.some((l) => l.key === x.level) ? x.level : defaultLevel(list),
      };
    });
  const shownLevels = levelsFor(levels, t.services, d.service);

  // Nút "Book this package" trên thẻ gói → chọn sẵn gói trong form (dịch vụ không hợp → đổi sang dịch vụ hợp)
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.("a[data-package]");
      if (!a) return;
      const level = a.dataset.package;
      setD((x) => {
        const fits = (s) => levelsFor(levels, t.services, s).some((l) => l.key === level);
        const service = fits(x.service) ? x.service : (t.services.find(fits) ?? x.service);
        return { ...x, service, level };
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [levels, t.services]);

  if (status === "success")
    return (
      <SuccessPanel
        title={t.successTitle}
        text={t.successText}
        code={code}
        labels={c}
        onReset={reset}
      />
    );

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = {
      ...validate(d, lang, { dates: { entryDate: false }, required: ["nationality"] }),
      ...consentError(d.consent, c),
    };
    setErrs(v);
    if (Object.keys(v).length) return focusFirstError(formRef.current);
    await submit(d, formRef.current);
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="relative grid gap-5 sm:grid-cols-2"
    >
      <Honeypot />
      <Field label={t.service} className="sm:col-span-2">
        <Chips
          options={t.services.map((s) => ({ value: s, label: s }))}
          value={d.service}
          onChange={setService}
        />
      </Field>
      <Field label={t.package} htmlFor="vs-level">
        <Select id="vs-level" value={d.level} onChange={set("level")}>
          {groupLabels
            ? Object.entries(groupLabels).map(([g, label]) => {
                const items = shownLevels.filter((l) => l.group === g);
                return items.length ? (
                  <optgroup key={g} label={label}>
                    {items.map((l) => (
                      <option key={l.key} value={l.key}>
                        {l.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })
            : shownLevels.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
        </Select>
      </Field>
      <Field label={t.nationality} required htmlFor="vs-nat" error={errs.nationality}>
        <Input
          id="vs-nat"
          aria-invalid={!!errs.nationality}
          value={d.nationality}
          onChange={set("nationality")}
          autoComplete="country-name"
        />
      </Field>
      <Field label={t.travellers}>
        <Counter
          value={d.travellers}
          min={1}
          max={60}
          onChange={set("travellers")}
          label={t.travellers}
        />
      </Field>
      <Field label={t.entryDate} htmlFor="vs-date" error={errs.entryDate}>
        <DateInput
          id="vs-date"
          lang={lang}
          value={d.entryDate}
          onChange={set("entryDate")}
          aria-invalid={!!errs.entryDate}
        />
      </Field>
      <Field label={t.arrivalAirport} htmlFor="vs-airport">
        <Select id="vs-airport" value={d.airport} onChange={set("airport")}>
          {airports.map((a) => (
            <option key={a.code} value={a.code}>
              {a.label} ({a.code})
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.flightNumber} htmlFor="vs-flight">
        <Input
          id="vs-flight"
          value={d.flight}
          onChange={set("flight")}
          placeholder="VN301 / CZ3045"
        />
      </Field>
      <Field label={c.fullName} required htmlFor="vs-name" error={errs.name}>
        <Input
          id="vs-name"
          value={d.name}
          onChange={set("name")}
          autoComplete="name"
          aria-invalid={!!errs.name}
        />
      </Field>
      <Field label="Email" required htmlFor="vs-email" error={errs.email}>
        <Input
          id="vs-email"
          type="email"
          value={d.email}
          onChange={set("email")}
          autoComplete="email"
          aria-invalid={!!errs.email}
        />
      </Field>
      <Field label={c.phone} className="sm:col-span-2" htmlFor="vs-phone" error={errs.phone}>
        <PhoneInput
          id="vs-phone"
          value={d.phone}
          onChange={set("phone")}
          aria-invalid={!!errs.phone}
        />
      </Field>
      <div className="space-y-3 sm:col-span-2">
        <ConsentCheckbox
          id="vs-consent"
          lang={lang}
          c={c}
          checked={d.consent}
          onChange={setConsent}
          error={errs.consent}
        />
        <FormError show={hasFieldErrors(errs)} text={formMsg(lang).fix} />
        <FormError show={status === "error"} text={sendError || c.errorGeneric} />
        <button
          type="submit"
          disabled={status === "sending"}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-clay-500 font-semibold text-white shadow-lg shadow-clay-500/25 hover:bg-clay-600 disabled:opacity-60"
        >
          <Send className="size-4" /> {status === "sending" ? c.sending : c.submit}
        </button>
        <p className="text-center text-xs text-muted">{c.noOnlinePayment}</p>
      </div>
    </form>
  );
}
