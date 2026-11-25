"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Star,
  TriangleAlert,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";
import UsageQuota, { fmtUsd } from "./UsageQuota";
import { usePermission } from "./permissions";
import { Button, Card, LoadingBlock, Notice, fmtDateTime, useUi } from "./ui";

/**
 * "Điểm & số lượt đánh giá (tự cập nhật hằng ngày)" — ở Cài đặt (admin) và cuối trang Đánh giá (nhân viên có quyền).
 * Quyền "Đánh giá": Xem → thấy số, trạng thái, hạn mức; Sửa trở lên → thêm nút "Cập nhật ngay" (tốn hạn mức Apify).
 * Điểm + số lượt đánh giá công ty trên Google / Tripadvisor tự cập nhật mỗi sáng qua dịch vụ Apify (mã đặt trên
 * máy chủ, không nhập ở đây). Thẻ hiện số đang dùng, trạng thái lần chạy cuối, lần tự cập nhật tiếp theo,
 * hạn mức tháng và nút "Cập nhật ngay" (chạy nền 20–90 giây; trang tự hỏi lại đến khi xong).
 * Backend: be/src/services/review-stats.service.js (GET /settings/review-stats, POST /settings/review-stats/sync).
 */
const PATH = "/settings/review-stats";
const POLL_MS = 4000;
const POLL_MAX_MS = 4 * 60_000;

const SOURCES = [
  { id: "google", name: "Google", Logo: GoogleIcon, logoClass: "size-5" },
  {
    id: "tripadvisor",
    name: "Tripadvisor",
    Logo: TripAdvisorIcon,
    logoClass: "size-6 text-[#00af87]",
  },
];

const fmtStats = (s) => `${Number(s.rating).toFixed(1)} · ${s.count} đánh giá`;
const money = (p, v) => (p?.unit === "searches" ? `${v} lượt` : `~${fmtUsd(v)} USD`);

/** Số phút còn phải chờ trước khi bấm lại (0 = bấm được) — tự đếm lùi */
function useCooldown(until) {
  const [now, setNow] = useState(() => Date.now());
  const end = until ? new Date(until).getTime() : 0;
  useEffect(() => {
    if (!end || end <= Date.now()) return undefined;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [end]);
  return end > now ? Math.ceil((end - now) / 60_000) : 0;
}

export default function ReviewStatsCard() {
  const title = "Điểm & số lượt đánh giá (tự cập nhật hằng ngày)";
  const [state, setState] = useState({ data: null, error: "" });
  const [result, setResult] = useState(null); // kết quả lần bấm "Cập nhật ngay" vừa rồi
  const [starting, setStarting] = useState(false);
  const watch = useRef(null); // { since: thời điểm bấm, until: hạn chờ } khi đang chờ kết quả
  const { toast } = useUi();
  const { canEdit } = usePermission("reviews"); // "Cập nhật ngay" tốn hạn mức → cần quyền sửa Đánh giá

  const load = useCallback(async () => {
    try {
      const r = await api(PATH);
      setState({ data: r.data, error: "" });
      return r.data;
    } catch (err) {
      setState((s) => ({ ...s, error: s.data ? "" : errorMessage(err) }));
      return null;
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const { data, error } = state;
  const running = Boolean(data?.running);
  const waitMin = useCooldown(data?.cooldownUntil);

  // Đang chạy (do mình bấm hoặc lịch tự động) → hỏi lại mỗi 4 giây; xong thì hiện kết quả
  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(async () => {
      const d = await load();
      const w = watch.current;
      if (d && !d.running && w) {
        watch.current = null;
        const res = d.lastSync;
        // (số đổi → máy chủ tự báo website làm mới)
        if (res?.at && Date.parse(res.at) >= w.since - 1000) setResult(res);
      } else if (w && Date.now() > w.until) {
        watch.current = null;
        toast.error(
          "Dịch vụ chạy lâu hơn bình thường. Số mới (nếu lấy được) sẽ tự hiện khi bạn mở lại trang này.",
          { title: "Chưa có kết quả" },
        );
      }
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [running, data, load, toast]);

  if (error || !data)
    return (
      <Card icon={Star} title={title}>
        {error ? (
          <Notice tone="error">
            {error}{" "}
            <button type="button" onClick={load} className="font-semibold underline">
              Thử lại
            </button>
          </Notice>
        ) : (
          <LoadingBlock rows={2} />
        )}
      </Card>
    );

  const { configured, quota, lastSync, provider } = data;
  const lastOk = SOURCES.map((s) => data[s.id].updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const noQuota = configured && quota && !quota.error && quota.canManual === false;
  const busy = starting || running;
  const disabled = !configured || noQuota || waitMin > 0 || busy;

  const syncNow = async () => {
    setResult(null);
    setStarting(true);
    try {
      const r = await api(`${PATH}/sync`, { method: "POST" });
      watch.current = { since: Date.now(), until: Date.now() + POLL_MAX_MS };
      setState({ data: r.data, error: "" });
    } catch (err) {
      toast.error(errorMessage(err), { title: "Chưa cập nhật được" });
      load(); // để thấy thời gian chờ / hạn mức mới
    } finally {
      setStarting(false);
    }
  };

  const hint = busy
    ? "Đang lấy số mới từ Google và Tripadvisor… có thể mất khoảng 1 phút. Bạn cứ làm việc khác, kết quả sẽ tự hiện ở đây."
    : !canEdit
      ? "Máy chủ tự lấy số mới mỗi sáng. Bạn đang ở chế độ chỉ xem nên không bấm “Cập nhật ngay” được."
      : !configured
        ? "Nút cập nhật sẽ dùng được khi máy chủ có mã Apify."
        : noQuota
          ? "Tạm chưa bấm được vì hạn mức tháng này còn quá ít — số tự cập nhật lại khi sang chu kỳ mới."
          : waitMin > 0
            ? `Vừa cập nhật — có thể bấm lại sau ${waitMin} phút.`
            : "Muốn có số mới ngay mà không chờ đến sáng mai? Bấm “Cập nhật ngay”.";

  return (
    <Card
      icon={Star}
      title={title}
      description="Điểm và số lượt đánh giá của công ty trên Google và Tripadvisor — hiện ở đầu trang, trang chủ, chân trang và trang tour. Máy chủ tự lấy số mới mỗi sáng, không cần nhập tay."
    >
      {!configured && (
        <Notice tone="info" className="mb-4" title="Chưa bật tự cập nhật — số đang giữ nguyên">
          Cài mã {provider?.name ?? "Apify"} trên máy chủ để bật tự cập nhật (nhờ đơn vị phát triển
          website).
        </Notice>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {SOURCES.map((s) => (
          <SourceTile
            key={s.id}
            s={s}
            d={data[s.id]}
            busy={running}
            status={configured ? lastSync?.sources?.[s.id] : null}
          />
        ))}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
        <InfoRow icon={CalendarClock} label="Lần tự cập nhật tiếp theo">
          {configured && data.nextAutoAt ? fmtDateTime(data.nextAutoAt) : "Chưa bật"}
        </InfoRow>
        <InfoRow icon={CheckCircle2} label="Cập nhật thành công gần nhất">
          {lastOk ? fmtDateTime(lastOk) : "Chưa có"}
        </InfoRow>
      </dl>

      {configured && (
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50/80 p-3.5 ring-1 ring-slate-200/80">
          <UsageQuota quota={quota} />
          {provider?.syncCost > 0 && (
            <p className="text-xs leading-relaxed text-slate-500">
              Chi phí ước tính: tự cập nhật mỗi ngày {money(provider, provider.syncCost)}/lần (
              {money(provider, provider.syncCost * 30)}/tháng) · mỗi lần bấm “Cập nhật ngay”{" "}
              {money(provider, provider.syncCost)}
              {provider.reviewCost
                ? ` · mỗi lần “Lấy đánh giá” ở mục Đánh giá ${money(provider, provider.reviewCost)}`
                : ""}
              .
            </p>
          )}
        </div>
      )}

      {result && <SyncResult result={result} />}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-slate-100 pt-4">
        <p
          className={cn(
            "flex min-w-0 flex-1 basis-64 items-start gap-2 text-xs leading-relaxed",
            busy ? "text-brand-800" : "text-slate-500",
          )}
          aria-live="polite"
        >
          {busy && <Loader2 className="mt-px size-3.5 shrink-0 animate-spin" />}
          {hint}
        </p>
        {canEdit && (
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={syncNow}
            loading={busy}
            disabled={disabled}
            className="ml-auto"
          >
            {busy ? "Đang cập nhật…" : "Cập nhật ngay"}
            {!busy && configured && provider?.syncCost > 0 && (
              <span className="ml-1 text-xs font-normal text-slate-500">
                · {money(provider, provider.syncCost)}
              </span>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 flex-wrap items-start gap-x-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
      <dt className="shrink-0 text-slate-500">{label}:</dt>
      <dd className="min-w-0 font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function SourceTile({ s, d, status, busy }) {
  const bad = status && !status.ok;
  const Icon = busy ? Loader2 : !status ? Clock3 : bad ? TriangleAlert : CheckCircle2;
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <s.Logo className={s.logoClass} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{s.name}</p>
          <p className="flex items-center gap-1 text-[15px] font-semibold text-slate-800 tabular-nums">
            <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
            {fmtStats(d)}
          </p>
        </div>
      </div>
      <p
        className={cn(
          "flex min-w-0 items-start gap-1.5 text-xs leading-relaxed",
          bad && !busy ? "text-amber-800" : "text-slate-500",
        )}
      >
        <Icon
          className={cn(
            "mt-px size-3.5 shrink-0",
            busy
              ? "animate-spin text-brand-600"
              : !status
                ? "text-slate-400"
                : bad
                  ? "text-amber-600"
                  : "text-emerald-600",
          )}
        />
        <span className="min-w-0 break-words">
          {busy
            ? "Đang lấy số mới…"
            : status?.message
              ? `Lần chạy gần nhất: ${status.message}`
              : "Chưa tự cập nhật lần nào"}
          <span className="block text-slate-500">
            Số này cập nhật lúc: {d.updatedAt ? fmtDateTime(d.updatedAt) : "chưa có"}
          </span>
        </span>
      </p>
    </div>
  );
}

/** Kết quả từng nền tảng sau khi bấm "Cập nhật ngay" */
function SyncResult({ result }) {
  const rows = SOURCES.filter((s) => result.sources?.[s.id]);
  if (!rows.length) return null;
  return (
    <Notice
      tone={result.ok ? "success" : "warn"}
      className="mt-4"
      title={result.ok ? "Đã cập nhật xong" : "Chưa cập nhật được hết"}
    >
      <ul className="mt-0.5 space-y-0.5">
        {rows.map((s) => (
          <li key={s.id}>
            <b>{s.name}:</b> {result.sources[s.id].message}
          </li>
        ))}
      </ul>
    </Notice>
  );
}
