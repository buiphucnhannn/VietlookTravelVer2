"use client";

import { useRef, useState } from "react";
import { Check, Mail, Send } from "lucide-react";
import {
  Field,
  FormError,
  Honeypot,
  Input,
  Select,
  SuccessPanel,
  Textarea,
  useEnquiry,
} from "./fields";

/** Form liên hệ (kiểu "Send us a request" của localvietnam). Dùng chung cho trang Đối tác (type="partner"). */
export default function ContactForm({ lang, t, c, type = "contact", extraFields = [] }) {
  const formRef = useRef(null);
  const { status, code, submit, reset } = useEnquiry(type, lang);
  const [error, setError] = useState("");
  const [d, setD] = useState({
    subject: t.subjects?.[0] || "",
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });

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
    if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email))
      return setError(`${c.required}: ${c.fullName} / Email`);
    setError("");
    await submit(d, formRef.current);
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative space-y-5">
      <Honeypot />
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <Mail className="size-5" />
      </span>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-ink">{t.formTitle}</h2>
        {t.formText && <p className="mt-2 text-muted">{t.formText}</p>}
      </div>
      {t.subjects && (
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-ink">
          {t.subjects.slice(0, 3).map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <Check className="size-4 text-brand-500" /> {s}
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {extraFields.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            htmlFor={`cf-${f.key}`}
            className={f.wide ? "sm:col-span-2" : ""}
          >
            <Input id={`cf-${f.key}`} value={d[f.key] || ""} onChange={set(f.key)} />
          </Field>
        ))}
        {t.subjects && (
          <Field label={t.subject} className="sm:col-span-2" htmlFor="cf-subject">
            <Select id="cf-subject" value={d.subject} onChange={set("subject")}>
              {t.subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={c.fullName} required htmlFor="cf-name">
          <Input id="cf-name" autoComplete="name" value={d.name} onChange={set("name")} />
        </Field>
        <Field label="Email" required htmlFor="cf-email">
          <Input
            id="cf-email"
            type="email"
            autoComplete="email"
            value={d.email}
            onChange={set("email")}
          />
        </Field>
        <Field label={c.phone} className="sm:col-span-2" htmlFor="cf-phone">
          <Input id="cf-phone" autoComplete="tel" value={d.phone} onChange={set("phone")} />
        </Field>
        <Field label={c.message} className="sm:col-span-2" htmlFor="cf-msg">
          <Textarea id="cf-msg" rows={5} value={d.message} onChange={set("message")} />
        </Field>
      </div>
      <FormError show={!!error} text={error} />
      <FormError show={status === "error"} text={c.errorGeneric} />
      <button
        type="submit"
        disabled={status === "sending"}
        className="mx-auto flex h-12 items-center gap-2 rounded-md bg-brand-600 px-7 font-semibold text-white shadow-md hover:bg-brand-700 disabled:opacity-60"
      >
        <Send className="size-4" /> {status === "sending" ? c.sending : c.submit}
      </button>
      <p className="text-center text-sm text-muted">{c.weReply}</p>
    </form>
  );
}
