"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CreditCard, Eye, EyeOff, Mail, Save, Users } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { toastError, useMutation } from "./hooks";
import {
  Button,
  Card,
  Field,
  Input,
  LoadingBlock,
  Notice,
  PageHeader,
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
        description="Email nhận thông báo, thanh toán 9Pay, phụ thu nhóm nhỏ và mã đo lường của Google."
      />
      <div className="space-y-6">
        <NotificationsCard />
        <PaymentCard />
        <SmallGroupCard />
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
  merchantKey: d.merchantKey ?? "",
  accountName: d.accountName ?? "",
  secretKey: "",
  checksumKey: "",
  depositPercent: String(d.depositPercent ?? 100),
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

  return (
    <Card
      icon={Mail}
      title="Email thông báo đơn mới"
      description="Mỗi khi khách đặt tour hoặc gửi yêu cầu trên website, hệ thống gửi thư báo ngay cho nhân viên và thư xác nhận cho khách."
    >
      {!data.mailConfigured && (
        <Notice tone="warn" className="mb-5">
          {MAIL_OFF_TEXT} Đơn và yêu cầu của khách vẫn được lưu đầy đủ trong trang quản trị.
        </Notice>
      )}

      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <Field
          label={`Email nhân viên nhận thông báo (${cleaned.length}/10)`}
          hint="Mỗi email một dòng, tối đa 10. Tất cả các email này đều nhận thư báo khi có đơn mới."
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
            label="Email nhận thư khách trả lời"
            hint="Khách bấm “Trả lời” trong thư xác nhận thì thư được gửi về địa chỉ này. Để trống nếu không cần."
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
            hint="Khách nhận thư “Đã nhận yêu cầu” kèm mã đơn ngay sau khi gửi."
          />
        </div>
      </div>

      <CardFooter note="Bấm Lưu để áp dụng cho các đơn tiếp theo.">
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
      hint={
        isSet
          ? `Đã lưu (${masked || "••••"}). Để trống nếu không đổi.`
          : "Lấy trong trang quản lý của 9Pay."
      }
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

const FX_SOURCE = {
  vietcombank: "Vietcombank",
  "er-api": "tỷ giá quốc tế",
  default: "tỷ giá dự phòng",
};

/** Tỷ giá tự động (chỉ xem) — dùng để đổi giá tour (USD) sang tiền Việt khi khách thanh toán */
function FxRate({ fx }) {
  const rate = Math.round(Number(fx?.rate) || 0);
  // "11/11/2026 10:42" (dd/mm/yyyy, giờ Việt Nam)
  const at = fx?.fetchedAt ? fmtDateTime(fx.fetchedAt) : "";
  return (
    <Field
      label="Tỷ giá USD → VND hôm nay"
      hint="Tự cập nhật nhiều lần mỗi ngày. Số tiền khách trả được làm tròn lên tới 1.000đ."
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm">
        <span className="font-semibold whitespace-nowrap text-slate-900 tabular-nums">
          {rate ? `${rate.toLocaleString("vi-VN")}đ` : "—"}
        </span>
        <span className="text-slate-500">
          ({FX_SOURCE[fx?.source] ?? "tự động"}
          {at && `, cập nhật ${at}`})
        </span>
      </div>
    </Field>
  );
}

function PaymentCard() {
  const { data, form, setForm, error, reload } = useSetting("/settings/payment", paymentForm);
  // "settings": website đọc lại cấu hình thanh toán ngay sau khi lưu
  const { run, busy } = useMutation(["settings"]);
  const { confirm, toast } = useUi();

  if (error || !form) return <CardState title="Thanh toán 9Pay" error={error} reload={reload} />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const deposit = Number(form.depositPercent);
  const depositOk = Number.isInteger(deposit) && deposit >= 10 && deposit <= 100;
  const missingKey =
    !form.merchantKey.trim() ||
    (!data.secretKeySet && !form.secretKey.trim()) ||
    (!data.checksumKeySet && !form.checksumKey.trim());

  const save = async () => {
    if (!depositOk) return toast.error("Tỷ lệ đặt cọc là số từ 10 đến 100.");
    if (form.enabled && missingKey)
      return toast.error("Nhập đủ Merchant Key, Secret Key và Checksum Key trước khi bật.");
    const turningOn = form.enabled && !data.enabled;
    if (turningOn) {
      const ok = await confirm({
        title: "Bật thanh toán trực tuyến?",
        message:
          "Từ giờ khách có thể thanh toán thật qua 9Pay ngay trên website. Hãy kiểm tra kỹ 3 mã 9Pay trước khi lưu.",
        confirmText: "Lưu và bật",
        danger: true,
      });
      if (!ok) return;
    }
    const body = {
      enabled: form.enabled,
      merchantKey: form.merchantKey.trim(),
      accountName: form.accountName.trim(),
      ...(form.secretKey.trim() && { secretKey: form.secretKey.trim() }),
      ...(form.checksumKey.trim() && { checksumKey: form.checksumKey.trim() }),
      depositPercent: deposit,
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
      title="Thanh toán 9Pay"
      description={
        data.ready && data.enabled
          ? "Đang nhận tiền — khách thấy bước thanh toán qua 9Pay ngay sau khi đặt tour."
          : "Đang tắt — khách chỉ gửi yêu cầu đặt tour, nhân viên liên hệ thanh toán sau."
      }
      actions={
        <Toggle
          checked={form.enabled}
          onChange={(enabled) => set({ enabled })}
          label={form.enabled ? "Đang bật" : "Đang tắt"}
        />
      }
    >
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        <Field label="Tên tài khoản nhận tiền" hint="Để bạn dễ nhận biết tài khoản đang dùng.">
          <Input
            value={form.accountName}
            onChange={(e) => set({ accountName: e.target.value })}
            placeholder="CÔNG TY TNHH VIETLOOK TRAVEL"
          />
        </Field>
        {/* Tên trong ngoặc giữ đúng chữ 9Pay ghi trên trang quản lý của họ để dễ tìm & chép */}
        <Field
          label="Mã cửa hàng (Merchant Key)"
          hint="Chép từ trang quản lý của 9Pay, mục Merchant Key."
        >
          <Input
            value={form.merchantKey}
            onChange={(e) => set({ merchantKey: e.target.value })}
            className="font-mono"
            autoComplete="off"
          />
        </Field>
        <SecretInput
          label="Mã bí mật (Secret Key)"
          isSet={data.secretKeySet}
          masked={data.secretKeyMasked}
          value={form.secretKey}
          onChange={(secretKey) => set({ secretKey })}
        />
        <SecretInput
          label="Mã kiểm tra (Checksum Key)"
          isSet={data.checksumKeySet}
          masked={data.checksumKeyMasked}
          value={form.checksumKey}
          onChange={(checksumKey) => set({ checksumKey })}
        />
        <Field
          label="Tỷ lệ đặt cọc (%)"
          hint="100 = khách trả toàn bộ. Ví dụ 30 = khách đặt cọc 30%, phần còn lại thu sau."
          error={depositOk ? "" : "Nhập số từ 10 đến 100"}
        >
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              min={10}
              max={100}
              step={5}
              value={form.depositPercent}
              onChange={(e) => set({ depositPercent: e.target.value })}
              className="pr-10"
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-slate-400">
              %
            </span>
          </div>
        </Field>
        <FxRate fx={data.fx} />
      </div>

      {form.enabled && missingKey && (
        <Notice tone="warn" className="mt-6">
          Còn thiếu mã 9Pay nên khách chưa thanh toán được. Nhập đủ Merchant Key, Secret Key và
          Checksum Key rồi bấm Lưu.
        </Notice>
      )}

      <CardFooter
        note={
          <>
            Khi bật và nhập đủ 3 mã, khách sẽ thấy bước thanh toán sau khi đặt tour; khi tắt, khách
            chỉ gửi yêu cầu như hiện tại.
            {data.updatedAt && (
              <span className="mt-0.5 block">Cập nhật lần cuối: {fmtDateTime(data.updatedAt)}</span>
            )}
          </>
        }
      >
        <Button icon={Save} onClick={save} loading={busy}>
          Lưu
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ---------- Phụ thu nhóm nhỏ ---------- */

const SMALL_GROUP_FIELDS = [
  { name: "one", label: "1 khách" },
  { name: "two", label: "2 khách" },
  { name: "threeFour", label: "3–4 khách" },
  { name: "fivePlus", label: "Từ 5 khách" },
];
const smallGroupForm = (d) => ({
  enabled: d?.enabled ?? true,
  one: String(d?.one ?? 60),
  two: String(d?.two ?? 30),
  threeFour: String(d?.threeFour ?? 15),
  fivePlus: String(d?.fivePlus ?? 0),
});
const pctOk = (v) => /^\d{1,3}$/.test(String(v).trim()) && Number(v) <= 200;

function SmallGroupCard() {
  const title = "Phụ thu nhóm nhỏ";
  const { form, setForm, error, reload } = useSetting("/settings/small-group", smallGroupForm);
  // "settings": khung đặt tour trên website đọc lại % mới ngay sau khi lưu
  const { run, busy } = useMutation(["settings"]);
  const { toast } = useUi();

  if (error || !form) return <CardState title={title} error={error} reload={reload} />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const save = async () => {
    const bad = SMALL_GROUP_FIELDS.find((f) => !pctOk(form[f.name]));
    if (bad) return toast.error(`${bad.label}: nhập số nguyên từ 0 đến 200.`);
    const body = { enabled: form.enabled };
    for (const f of SMALL_GROUP_FIELDS) body[f.name] = Number(form[f.name]);
    const r = await run(
      () => api("/settings/small-group", { method: "PUT", body }),
      "Đã lưu phụ thu nhóm nhỏ",
    );
    if (r) reload();
  };

  return (
    <Card
      icon={Users}
      title={title}
      description="Đoàn ít khách thì chi phí xe, hướng dẫn viên chia cho ít người hơn — website tự cộng thêm % vào giá tạm tính theo số khách."
      actions={
        <Toggle
          checked={form.enabled}
          onChange={(enabled) => set({ enabled })}
          label={form.enabled ? "Đang bật" : "Đang tắt"}
        />
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6 md:grid-cols-4">
        {SMALL_GROUP_FIELDS.map((f) => (
          <Field
            key={f.name}
            label={f.label}
            error={pctOk(form[f.name]) ? "" : "Nhập số từ 0 đến 200"}
          >
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={200}
                step={5}
                value={form[f.name]}
                disabled={!form.enabled}
                onChange={(e) => set({ [f.name]: e.target.value })}
                className="pr-10"
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-slate-400">
                %
              </span>
            </div>
          </Field>
        ))}
      </div>

      <CardFooter
        note={
          <>
            Chỉ áp dụng cho tour chưa có bảng giá theo số khách. Tour đã nhập bảng giá theo số khách
            thì tính theo bảng đó.
            <span className="mt-0.5 block">
              Ví dụ: tour giá $100/người, 2 khách → cộng 30% = $260 cho cả đoàn. Trẻ em được miễn
              phí thì không tính vào số khách. Nhập 0 nếu không muốn cộng.
            </span>
          </>
        }
      >
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

      <CardFooter note="Bấm Lưu để áp dụng cho toàn bộ website. Không chắc mã nào thì để trống.">
        <Button icon={Save} onClick={save} loading={busy}>
          Lưu
        </Button>
      </CardFooter>
    </Card>
  );
}
