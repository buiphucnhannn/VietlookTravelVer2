"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { CheckCircle2, RefreshCw, Save, Star, TriangleAlert } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";
import { useMutation } from "./hooks";
import { SECRET_RULES, SecretKeyField, secretError, useReauth } from "./secrets";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  LoadingBlock,
  Notice,
  Toggle,
  fmtDateTime,
  useUi,
} from "./ui";

/**
 * Cài đặt → "Điểm & số lượt đánh giá" (chỉ admin): điểm + số lượt đánh giá công ty trên Tripadvisor / Google,
 * hiện ở chân trang, banner trang chủ, dải uy tín, trang tour… (fe/src/lib/review-stats.js).
 * Mỗi nguồn: có khoá API + bật "Tự động cập nhật mỗi ngày" → máy chủ tự lấy số (ô số chỉ để xem);
 * chưa có khoá / tắt → nhập tay (bắt buộc). Khoá CHỈ nhập ở đây (máy chủ không còn khoá dự phòng), lưu mã hoá,
 * ở đây chỉ thấy ••••abcd; đổi / xoá khoá phải nhập lại mật khẩu (secrets.js → useReauth).
 * Backend: be/src/services/review-stats.service.js.
 */
const PATH = "/settings/review-stats";

const SOURCES = [
  {
    id: "tripadvisor",
    name: "Tripadvisor",
    Logo: TripAdvisorIcon,
    logoClass: "size-6 text-[#00af87]",
    keyLabel: "Khoá API Tripadvisor",
    idField: "locationId",
    idLabel: "Mã địa điểm Tripadvisor",
    idHint: "Số đứng sau chữ “-d” trong link trang Tripadvisor của công ty.",
    idPlaceholder: "27950353",
    linkHint: "Khách bấm vào điểm Tripadvisor trên website sẽ mở trang này.",
  },
  {
    id: "google",
    name: "Google",
    Logo: GoogleIcon,
    logoClass: "size-5",
    keyLabel: "Khoá API Google",
    idField: "placeId",
    idLabel: "Mã địa điểm Google (Place ID)",
    idHint: "Để trống — máy chủ tự tìm đúng hồ sơ Google Maps của công ty.",
    idPlaceholder: "ChIJ…",
    linkHint: "Khách bấm vào điểm Google trên website sẽ mở trang này.",
  },
];

const toForm = (d) =>
  Object.fromEntries(
    SOURCES.map((s) => [
      s.id,
      {
        rating: d[s.id].rating == null ? "" : Number(d[s.id].rating).toFixed(1),
        count: d[s.id].count == null ? "" : String(d[s.id].count),
        url: d[s.id].url ?? "",
        auto: d[s.id].auto ?? true,
        key: "",
        editingKey: false,
        clearKey: false,
        [s.idField]: d[s.id][s.idField] ?? "",
      },
    ]),
  );

const ratingOk = (v) => /^\d(\.\d)?$/.test(String(v).trim()) && Number(v) <= 5;
const countOk = (v) => /^\d{1,8}$/.test(String(v).trim());

/** Nguồn này đang ở chế độ tự động (theo form đang sửa): có khoá (đã lưu / vừa nhập) + bật công tắc */
const hasKey = (d, f) => Boolean(f.key.trim()) || (d.keyConfigured && !f.clearKey);
const isAuto = (d, f) => hasKey(d, f) && f.auto;

function errorsOf(d, f) {
  const e = {};
  const keyErr = secretError(f.key, SECRET_RULES.apiKey);
  if (keyErr) e.key = keyErr;
  if (isAuto(d, f)) return e;
  if (!String(f.rating).trim()) e.rating = "Vui lòng nhập điểm";
  else if (!ratingOk(f.rating)) e.rating = "Điểm từ 0 đến 5, tối đa 1 chữ số thập phân";
  if (!String(f.count).trim()) e.count = "Vui lòng nhập số lượt";
  else if (!countOk(f.count)) e.count = "Số lượt là số nguyên";
  return e;
}

export default function ReviewStatsCard() {
  const title = "Điểm & số lượt đánh giá";
  const [state, setState] = useState({ data: null, form: null, error: "" });
  const [nonce, setNonce] = useState(0);
  const [checked, setChecked] = useState(false); // đã bấm Lưu → hiện lỗi ô trống
  const { run, busy } = useMutation(["settings"]); // website đọc lại số mới ngay sau khi lưu
  const sync = useMutation(["settings"]);
  const { confirm, toast } = useUi();
  const reauth = useReauth();

  useEffect(() => {
    let alive = true;
    api(PATH)
      .then((r) => alive && setState({ data: r.data, form: toForm(r.data), error: "" }))
      .catch((err) => alive && setState((s) => ({ ...s, error: errorMessage(err) })));
    return () => {
      alive = false;
    };
  }, [nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const apply = (data) => {
    setState({ data, form: toForm(data), error: "" });
    setChecked(false);
  };

  const { data, form, error } = state;
  if (error || !form)
    return (
      <Card icon={Star} title={title}>
        {error ? (
          <Notice tone="error">
            {error}{" "}
            <button type="button" onClick={reload} className="font-semibold underline">
              Thử lại
            </button>
          </Notice>
        ) : (
          <LoadingBlock rows={3} />
        )}
      </Card>
    );

  const set = (src, patch) =>
    setState((s) => ({ ...s, form: { ...s.form, [src]: { ...s.form[src], ...patch } } }));
  const errors = Object.fromEntries(SOURCES.map((s) => [s.id, errorsOf(data[s.id], form[s.id])]));
  const firstError = SOURCES.flatMap((s) =>
    Object.values(errors[s.id]).map((m) => `${s.name}: ${m.toLowerCase()}`),
  )[0];
  const anyKey = SOURCES.some((s) => hasKey(data[s.id], form[s.id]));
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(data));

  const body = () =>
    Object.fromEntries(
      SOURCES.map((s) => {
        const f = form[s.id];
        return [
          s.id,
          {
            rating: String(f.rating).trim() === "" ? null : Number(f.rating),
            count: String(f.count).trim() === "" ? null : Number(f.count),
            url: f.url.trim(),
            auto: f.auto,
            [s.idField]: f[s.idField].trim(),
            ...(f.key.trim() ? { key: f.key.trim() } : {}),
            clearKey: f.clearKey && !f.key.trim(),
          },
        ];
      }),
    );

  /** Lưu (khi cần) — trả dữ liệu mới, null nếu lỗi */
  const save = async ({ quiet } = {}) => {
    setChecked(true);
    if (firstError) {
      toast.error(firstError);
      return null;
    }
    // khoá sắp đổi / xoá → hộp xác nhận mật khẩu (máy chủ kiểm tra lại)
    const changes = SOURCES.flatMap((s) => {
      const f = form[s.id];
      if (f.key.trim()) return [{ label: s.keyLabel, op: "replace" }];
      if (f.clearKey && data[s.id].keyConfigured) return [{ label: s.keyLabel, op: "clear" }];
      return [];
    });
    const b = body();
    const send = (confirmPassword) =>
      api(PATH, { method: "PUT", body: { ...b, ...(confirmPassword && { confirmPassword }) } });
    const r = await run(() => reauth.run(send, changes), quiet ? "" : "Đã lưu điểm đánh giá");
    if (r?.data) apply(r.data);
    return r?.data ?? null;
  };

  const syncNow = async () => {
    if (dirty && !(await save({ quiet: true }))) return;
    const r = await sync.run(() => api(`${PATH}/sync`, { method: "POST" }));
    if (!r?.data) return;
    apply(r.data);
    const res = r.data.result ?? {};
    const lines = SOURCES.filter((s) => res.sources?.[s.id] && !res.sources[s.id].skipped).map(
      (s) => `${s.name}: ${res.sources[s.id].message}`,
    );
    const msg = lines.join("\n") || res.message || "Đã kiểm tra";
    if (res.ok) toast(msg, "success");
    else toast.error(msg, { title: "Chưa cập nhật được hết" });
  };

  const confirmRemove = (s) =>
    confirm({
      title: `Xoá ${s.keyLabel.toLowerCase()}?`,
      message: `Sau khi lưu, ${s.name} chuyển về nhập tay: website dùng điểm và số lượt bạn nhập.`,
      confirmText: "Xoá khoá",
      danger: true,
    });

  const last = data.lastSync;

  return (
    <Card
      icon={Star}
      title={title}
      description="Điểm và số lượt đánh giá của công ty trên Tripadvisor và Google — hiện ở chân trang, banner trang chủ, trang tour và nhiều chỗ khác trên website."
    >
      {/* 2 nguồn cạnh nhau (máy tính) — subgrid giữ các hàng thẳng nhau giữa 2 thẻ; điện thoại xếp chồng */}
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-0">
        {SOURCES.map((s) => (
          <SourcePanel
            key={s.id}
            s={s}
            d={data[s.id]}
            f={form[s.id]}
            set={(patch) => set(s.id, patch)}
            errors={checked ? errors[s.id] : {}}
            status={last?.sources?.[s.id]}
            onRequestClear={() => confirmRemove(s)}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-slate-100 pt-5">
        <div className="min-w-0 text-xs leading-relaxed text-slate-500">
          {anyKey ? (
            <>
              Máy chủ tự cập nhật mỗi ngày lúc 6 giờ sáng cho mục đang bật tự động.
              <span className="mt-0.5 block">
                {last?.at
                  ? `Lần tự cập nhật gần nhất: ${fmtDateTime(last.at)}${last.ok ? "" : " (có lỗi — xem từng mục)"}`
                  : "Chưa tự cập nhật lần nào — bấm “Cập nhật ngay” để thử."}
              </span>
            </>
          ) : (
            <>
              Chưa có khoá API nên website dùng số nhập tay. Nhập khoá để máy chủ tự cập nhật mỗi
              ngày.
              <span className="mt-0.5 block">Bấm Lưu là website hiện số mới ngay.</span>
            </>
          )}
        </div>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {anyKey && (
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={syncNow}
              loading={sync.busy}
              disabled={busy}
            >
              Cập nhật ngay
            </Button>
          )}
          <Button icon={Save} onClick={() => save()} loading={busy} disabled={sync.busy}>
            Lưu
          </Button>
        </div>
      </div>
      {reauth.dialog}
    </Card>
  );
}

/** Ô điểm / số lượt: chế độ tự động → chỉ xem (nền xám, huy hiệu "Tự động") */
function NumberField({ label, value, onChange, auto, error, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} required={!auto} htmlFor={id}>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          readOnly={auto}
          aria-readonly={auto || undefined}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "tabular-nums",
            auto &&
              "cursor-default border-dashed bg-slate-50 pr-[4.75rem] font-semibold text-slate-600 hover:border-slate-200 focus:border-slate-200 focus:ring-0",
          )}
          {...props}
        />
        {auto && (
          <Badge
            tone="green"
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
          >
            Tự động
          </Badge>
        )}
      </div>
    </Field>
  );
}

function SourcePanel({ s, d, f, set, errors, status, onRequestClear }) {
  const auto = isAuto(d, f);
  const keyOn = hasKey(d, f);
  const keyMode = f.clearKey ? "clear" : f.editingKey || !d.keyConfigured ? "edit" : "view";

  return (
    // 7 hàng: tiêu đề · điểm + số lượt · link · khoá · mã địa điểm · tự động · cập nhật lần cuối
    <div className="grid min-w-0 content-start gap-y-5 rounded-2xl bg-slate-50/60 p-4 ring-1 ring-slate-200/80 sm:p-5 lg:row-span-7 lg:grid-rows-subgrid">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-slate-200">
            <s.Logo className={s.logoClass} />
          </span>
          <h3 className="truncate text-sm font-bold text-slate-900">{s.name}</h3>
        </div>
        {auto ? <Badge tone="green">Tự động cập nhật</Badge> : <Badge tone="gray">Nhập tay</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <NumberField
          label="Điểm (0–5)"
          value={f.rating}
          auto={auto}
          error={errors.rating}
          placeholder="5.0"
          onChange={(rating) => set({ rating: rating.replace(",", ".") })}
        />
        <NumberField
          label="Số lượt đánh giá"
          value={f.count}
          auto={auto}
          error={errors.count}
          inputMode="numeric"
          placeholder="93"
          onChange={(count) => set({ count: count.replace(/[^\d]/g, "") })}
        />
      </div>

      <Field label="Link trang đánh giá" hint={s.linkHint}>
        <Input
          type="url"
          value={f.url}
          onChange={(e) => set({ url: e.target.value })}
          placeholder="https://"
          spellCheck={false}
          className="truncate"
        />
      </Field>

      <SecretKeyField
        label={s.keyLabel}
        hint="Không bắt buộc. Có khoá thì máy chủ tự lấy số mới mỗi ngày."
        configured={d.keyConfigured}
        masked={d.keyMasked}
        info={{ at: d.keyUpdatedAt, by: d.keyUpdatedBy }}
        value={f.key}
        onChange={(key) => set({ key })}
        mode={keyMode}
        onMode={(m) =>
          set({
            key: "",
            editingKey: m === "edit",
            clearKey: m === "clear",
            ...(m === "clear" && { auto: false }),
          })
        }
        rule={SECRET_RULES.apiKey}
        onRequestClear={onRequestClear}
        placeholder="Dán khoá API vào đây"
      />

      <Field label={s.idLabel} hint={s.idHint}>
        <Input
          value={f[s.idField]}
          placeholder={s.idPlaceholder}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => set({ [s.idField]: e.target.value.trim() })}
          className="font-mono"
        />
      </Field>

      <div className="rounded-xl bg-white p-3.5 ring-1 ring-slate-200">
        <p className="mb-2.5 text-[13px] font-semibold text-slate-700">Tự động cập nhật mỗi ngày</p>
        <Toggle
          checked={keyOn && f.auto}
          disabled={!keyOn}
          onChange={(v) => set({ auto: v })}
          label={keyOn && f.auto ? "Đang bật" : "Đang tắt"}
          hint={
            !keyOn
              ? "Nhập khoá API để bật tự động."
              : f.auto
                ? "Máy chủ tự lấy điểm và số lượt mới mỗi sáng."
                : "Website dùng điểm và số lượt bạn nhập ở trên."
          }
        />
      </div>

      <SourceStatus d={d} status={keyOn ? status : null} />
    </div>
  );
}

function SourceStatus({ d, status }) {
  const bad = status && !status.ok && !status.skipped;
  return (
    <div className="flex min-w-0 items-start gap-2 self-end text-xs leading-relaxed text-slate-500">
      {bad ? (
        <TriangleAlert className="mt-px size-3.5 shrink-0 text-amber-600" />
      ) : (
        <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-600" />
      )}
      <span className="min-w-0 break-words">
        Cập nhật lần cuối: {d.updatedAt ? fmtDateTime(d.updatedAt) : "chưa có"}
        {status?.message && (
          <span className={cn("block", bad && "text-amber-700")}>{status.message}</span>
        )}
      </span>
    </div>
  );
}
