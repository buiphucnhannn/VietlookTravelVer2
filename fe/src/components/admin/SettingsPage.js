"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CreditCard, Eye, EyeOff, Mail, Save, Send } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useMutation } from "./hooks";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  LoadingBlock,
  Notice,
  PageHeader,
  Select,
  StringList,
  Toggle,
  fmtDateTime,
  useUi,
} from "./ui";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAIL_OFF_TEXT =
  "Tính năng gửi email chưa được bật. Liên hệ đơn vị phát triển website để bật.";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Cài đặt"
        description="Email nhận thông báo, thanh toán 9Pay và mã đo lường của Google."
      />
      <div className="space-y-6">
        <NotificationsCard />
        <PaymentCard />
        <TrackingCard />
      </div>
    </>
  );
}

/**
 * Nạp 1 mục cài đặt → { data, form, setForm, error, reload }.
 * toForm (hàm cố định, khai báo ngoài component) chuyển dữ liệu đã lưu thành giá trị form.
 */
function useSetting(path, toForm) {
  const [state, setState] = useState({ data: null, form: null, error: "" });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    api(path)
      .then((r) => alive && setState({ data: r.data, form: toForm(r.data), error: "" }))
      .catch((err) => alive && setState((s) => ({ ...s, error: errorMessage(err) })));
    return () => {
      alive = false;
    };
  }, [path, toForm, nonce]);
  const setForm = useCallback((fn) => setState((s) => ({ ...s, form: fn(s.form) })), []);
  const reload = useCallback(() => {
    setState((s) => ({ ...s, error: "" }));
    setNonce((n) => n + 1);
  }, []);
  return { ...state, setForm, reload };
}

/** Tiêu đề thẻ: tên mục + nhãn tình trạng (đang bật / tắt) nằm ngay cạnh */
function CardTitle({ badge, children }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {children} {badge}
    </span>
  );
}

/** Chân thẻ: ghi chú bên trái, nút bên phải — giống nhau ở mọi mục */
function CardFooter({ note, children }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-slate-100 pt-5">
      <p className="min-w-0 text-xs leading-relaxed text-slate-500">{note}</p>
      <div className="ml-auto flex flex-wrap justify-end gap-2">{children}</div>
    </div>
  );
}

/** Thẻ khi đang tải / tải lỗi */
function CardState({ title, error, reload }) {
  return (
    <Card title={title}>
      {error ? (
        <Notice tone="error">
          {error}{" "}
          <button type="button" onClick={reload} className="font-semibold underline">
            Thử lại
          </button>
        </Notice>
      ) : (
        <LoadingBlock />
      )}
    </Card>
  );
}

const notificationsForm = (d) => ({
  recipients: d.recipients ?? [],
  replyTo: d.replyTo ?? "",
  sendCustomerConfirmation: d.sendCustomerConfirmation ?? true,
});

const paymentForm = (d) => ({
  enabled: !!d.enabled,
  environment: d.environment ?? "sandbox",
  merchantKey: d.merchantKey ?? "",
  accountName: d.accountName ?? "",
  secretKey: "",
  checksumKey: "",
});

const trackingForm = (d) => ({
  gtmId: d?.gtmId ?? "",
  ga4Id: d?.ga4Id ?? "",
  adsId: d?.adsId ?? "",
});

/* ---------- Email thông báo ---------- */

function NotificationsCard() {
  const { data, form, setForm, error, reload } = useSetting(
    "/settings/notifications",
    notificationsForm,
  );
  const [testing, setTesting] = useState(false);
  const { run, busy } = useMutation([]);
  const { toast } = useUi();

  if (error || !form)
    return <CardState title="Email nhận thông báo" error={error} reload={reload} />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const cleaned = form.recipients.map((x) => x.trim().toLowerCase()).filter(Boolean);
  const invalid = cleaned.filter((x) => !EMAIL_RX.test(x));
  const badReply = form.replyTo.trim() && !EMAIL_RX.test(form.replyTo.trim());

  const save = async () => {
    if (invalid.length) return toast(`Email chưa đúng: ${invalid.join(", ")}`, "error");
    if (badReply) return toast("Email nhận thư trả lời chưa đúng", "error");
    const body = {
      recipients: [...new Set(cleaned)],
      replyTo: form.replyTo.trim().toLowerCase(),
      sendCustomerConfirmation: form.sendCustomerConfirmation,
    };
    const r = await run(
      () => api("/settings/notifications", { method: "PUT", body }),
      "Đã lưu email thông báo",
    );
    if (r) reload();
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await api("/settings/notifications/test", { method: "POST" });
      toast(
        `Đã gửi email thử tới ${(r.data?.to ?? []).join(", ")}. Hãy kiểm tra hộp thư (cả mục Thư rác).`,
      );
    } catch (err) {
      toast(err?.code === "MAIL_NOT_CONFIGURED" ? MAIL_OFF_TEXT : errorMessage(err), "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card
      icon={Mail}
      title={
        <CardTitle
          badge={
            data.mailConfigured ? (
              <Badge tone="green">Đang bật</Badge>
            ) : (
              <Badge tone="red">Chưa bật</Badge>
            )
          }
        >
          Email nhận thông báo
        </CardTitle>
      }
      description="Khi khách đặt tour hoặc gửi yêu cầu trên website, thông báo sẽ được gửi tới các email dưới đây."
    >
      {!data.mailConfigured && (
        <Notice tone="warn" className="mb-5">
          {MAIL_OFF_TEXT} Đơn và yêu cầu của khách vẫn được lưu đầy đủ trong trang quản trị.
        </Notice>
      )}

      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <Field
          label={`Email người nhận (${cleaned.length}/10)`}
          hint={
            data.fallback
              ? `Để trống thì thông báo gửi tới ${data.fallback}.`
              : "Mỗi dòng 1 email, tối đa 10."
          }
          error={invalid.length ? `Email chưa đúng: ${invalid.join(", ")}` : ""}
        >
          <StringList
            value={form.recipients}
            onChange={(recipients) => set({ recipients: recipients.slice(0, 10) })}
            placeholder="sales@vietlooktravel.com"
            addLabel="Thêm email"
          />
        </Field>

        <div className="space-y-6">
          <Field
            label="Email nhận thư trả lời của khách"
            hint="Khi khách bấm “Trả lời” trên email xác nhận, thư sẽ gửi về địa chỉ này. Có thể để trống."
            error={badReply ? "Email chưa đúng" : ""}
          >
            <Input
              type="email"
              value={form.replyTo}
              aria-invalid={!!badReply}
              placeholder="info@vietlooktravel.com"
              onChange={(e) => set({ replyTo: e.target.value })}
            />
          </Field>

          <Toggle
            checked={form.sendCustomerConfirmation}
            onChange={(sendCustomerConfirmation) => set({ sendCustomerConfirmation })}
            label="Gửi email xác nhận cho khách"
            hint="Khách nhận email “Đã nhận yêu cầu” kèm mã đơn ngay sau khi gửi."
          />
        </div>
      </div>

      <CardFooter note="Email thử gửi tới danh sách đã lưu — hãy bấm Lưu trước khi gửi thử.">
        <Button
          variant="secondary"
          icon={Send}
          onClick={test}
          loading={testing}
          disabled={!data.mailConfigured}
        >
          Gửi email thử
        </Button>
        <Button icon={Save} onClick={save} loading={busy}>
          Lưu
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ---------- Thanh toán 9Pay ---------- */

function SecretInput({ label, isSet, masked, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <Field
      label={label}
      hint={isSet ? `Đã lưu (${masked || "••••"}). Để trống nếu không đổi.` : "Chưa nhập."}
    >
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          placeholder={isSet ? "••••••••" : ""}
          onChange={(e) => onChange(e.target.value)}
          className="pr-11 font-mono"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ẩn" : "Hiện"}
          title={show ? "Ẩn" : "Hiện"}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  );
}

function PaymentCard() {
  const { data, form, setForm, error, reload } = useSetting("/settings/payment", paymentForm);
  const { run, busy } = useMutation([]);
  const { confirm } = useUi();

  if (error || !form) return <CardState title="Thanh toán 9Pay" error={error} reload={reload} />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    const switchingLive =
      form.enabled && form.environment === "production" && data.environment !== "production";
    if (switchingLive) {
      const ok = await confirm({
        title: "Chuyển sang chạy thật?",
        message:
          "Từ giờ khách thanh toán trên website sẽ bị trừ tiền thật. Hãy kiểm tra kỹ các mã 9Pay trước khi lưu.",
        confirmText: "Lưu và chạy thật",
        danger: true,
      });
      if (!ok) return;
    }
    const body = {
      enabled: form.enabled,
      environment: form.environment,
      merchantKey: form.merchantKey.trim(),
      accountName: form.accountName.trim(),
      ...(form.secretKey.trim() && { secretKey: form.secretKey.trim() }),
      ...(form.checksumKey.trim() && { checksumKey: form.checksumKey.trim() }),
    };
    const r = await run(
      () => api("/settings/payment", { method: "PUT", body }),
      "Đã lưu cài đặt 9Pay",
    );
    if (r) reload();
  };

  return (
    <Card
      icon={CreditCard}
      title={
        <CardTitle
          badge={
            data.enabled ? (
              <Badge tone={data.environment === "production" ? "green" : "amber"}>
                {data.environment === "production" ? "Đang bật · Chạy thật" : "Đang bật · Chạy thử"}
              </Badge>
            ) : (
              <Badge>Đang tắt</Badge>
            )
          }
        >
          Thanh toán 9Pay
        </CardTitle>
      }
      description="Tài khoản nhận tiền khi khách thanh toán trực tuyến."
    >
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Toggle
            checked={form.enabled}
            onChange={(enabled) => set({ enabled })}
            label="Bật thanh toán 9Pay"
            hint="Khi tắt, khách chỉ gửi yêu cầu đặt tour; nhân viên liên hệ thanh toán sau."
          />
          <Field label="Chế độ" hint="Chạy thử: không trừ tiền thật.">
            <Select value={form.environment} onChange={(e) => set({ environment: e.target.value })}>
              <option value="sandbox">Chạy thử</option>
              <option value="production">Chạy thật</option>
            </Select>
          </Field>
          <Field label="Tên tài khoản nhận tiền" hint="Chỉ để bạn dễ nhận biết.">
            <Input
              value={form.accountName}
              onChange={(e) => set({ accountName: e.target.value })}
              placeholder="CÔNG TY TNHH VIETLOOK TRAVEL"
            />
          </Field>
        </div>

        <div className="space-y-6">
          <Field label="Merchant Key" hint="Ba mã ở cột này lấy trong trang quản lý của 9Pay.">
            <Input
              value={form.merchantKey}
              onChange={(e) => set({ merchantKey: e.target.value })}
              className="font-mono"
              autoComplete="off"
            />
          </Field>
          <SecretInput
            label="Secret Key"
            isSet={data.secretKeySet}
            masked={data.secretKeyMasked}
            value={form.secretKey}
            onChange={(secretKey) => set({ secretKey })}
          />
          <SecretInput
            label="Checksum Key"
            isSet={data.checksumKeySet}
            masked={data.checksumKeyMasked}
            value={form.checksumKey}
            onChange={(checksumKey) => set({ checksumKey })}
          />
        </div>
      </div>

      {form.enabled && (!form.merchantKey.trim() || (!data.secretKeySet && !form.secretKey)) && (
        <Notice tone="warn" className="mt-6">
          Đã bật 9Pay nhưng còn thiếu Merchant Key hoặc Secret Key nên khách chưa thanh toán được.
        </Notice>
      )}

      <CardFooter note={data.updatedAt ? `Cập nhật lần cuối: ${fmtDateTime(data.updatedAt)}` : ""}>
        <Button icon={Save} onClick={save} loading={busy}>
          Lưu
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ---------- Đo lường & quảng cáo (Google) ---------- */

const TRACKING_TAGS = ["settings"];
const TRACKING_FIELDS = [
  {
    name: "gtmId",
    label: "Google Tag Manager",
    placeholder: "GTM-XXXXXXX",
    hint: "Mã Google Tag Manager, dạng GTM-XXXXXXX",
    rx: /^GTM-[A-Z0-9]{4,12}$/,
    error: "Mã chưa đúng. Mã có dạng GTM-XXXXXXX (bắt đầu bằng GTM-).",
  },
  {
    name: "ga4Id",
    label: "Google Analytics",
    placeholder: "G-XXXXXXXXXX",
    hint: "Mã đo lường Google Analytics, dạng G-XXXXXXXXXX",
    rx: /^G-[A-Z0-9]{6,14}$/,
    error: "Mã chưa đúng. Mã có dạng G-XXXXXXXXXX (bắt đầu bằng G-).",
  },
  {
    name: "adsId",
    label: "Google Ads",
    placeholder: "AW-XXXXXXXXX",
    hint: "Mã Google Ads, dạng AW-XXXXXXXXX",
    rx: /^AW-[0-9]{6,14}$/,
    error: "Mã chưa đúng. Mã có dạng AW- và theo sau là các chữ số.",
  },
];

function TrackingCard() {
  const title = "Đo lường & quảng cáo (Google)";
  const { form, setForm, error, reload } = useSetting("/settings/tracking", trackingForm);
  const { run, busy } = useMutation(TRACKING_TAGS);
  const { toast } = useUi();

  if (error || !form) return <CardState title={title} error={error} reload={reload} />;

  const errorOf = (f) => (form[f.name] && !f.rx.test(form[f.name]) ? f.error : "");

  const save = async () => {
    const bad = TRACKING_FIELDS.find(errorOf);
    if (bad) return toast(`${bad.label}: ${bad.error}`, "error");
    const body = { gtmId: form.gtmId, ga4Id: form.ga4Id, adsId: form.adsId };
    const r = await run(
      () => api("/settings/tracking", { method: "PUT", body }),
      "Đã lưu mã đo lường",
    );
    if (r) reload();
  };

  return (
    <Card
      icon={BarChart3}
      title={title}
      description="Dán mã Google cung cấp để theo dõi lượt truy cập và hiệu quả quảng cáo. Mục nào chưa dùng thì để trống."
    >
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-3">
        {TRACKING_FIELDS.map((f) => (
          <Field key={f.name} label={f.label} hint={f.hint} error={errorOf(f)}>
            <Input
              value={form[f.name]}
              placeholder={f.placeholder}
              maxLength={30}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!errorOf(f)}
              className="font-mono"
              onChange={(e) =>
                setForm((x) => ({ ...x, [f.name]: e.target.value.trim().toUpperCase() }))
              }
            />
          </Field>
        ))}
      </div>

      <CardFooter note="">
        <Button icon={Save} onClick={save} loading={busy}>
          Lưu
        </Button>
      </CardFooter>
    </Card>
  );
}
