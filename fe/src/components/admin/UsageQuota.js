"use client";

import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate } from "./ui";

/**
 * Hạn mức dùng dịch vụ lấy số đánh giá trong tháng (dữ liệu `quota` từ máy chủ — không bao giờ có mã / khoá).
 * Apify: tính bằng USD (gói Free 5 USD / chu kỳ). Nhà cung cấp không có số hạn mức → quota = null →
 * chỉ hiện "Lượt dùng: theo gói của nhà cung cấp".
 * Dùng ở Cài đặt → "Điểm & số lượt đánh giá" và hộp "Lấy đánh giá" (compact).
 * Backend: be/src/services/review-providers/index.js → quotaView().
 */

/** 0.012 → "0,012"; 0.15 → "0,15"; 5 → "5,00" */
export const fmtUsd = (v) => {
  const n = Number(v) || 0;
  const digits = n > 0 && n < 0.1 ? 3 : 2;
  return n.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: digits });
};

const amount = (q, v) => (q.unit === "usd" ? `${fmtUsd(v)} USD` : `${v} lượt`);

export default function UsageQuota({ quota, compact = false, className }) {
  if (!quota)
    return (
      <p className={cn("flex items-center gap-2 text-xs text-slate-500", className)}>
        <Gauge className="size-3.5 shrink-0 text-slate-400" />
        Lượt dùng: theo gói của nhà cung cấp
      </p>
    );
  if (quota.error || quota.left == null)
    return (
      <p className={cn("flex items-start gap-2 text-xs text-slate-500", className)}>
        <Gauge className="mt-px size-3.5 shrink-0 text-slate-400" />
        {quota.error || "Chưa xem được hạn mức còn lại"}
      </p>
    );

  const { total, left } = quota;
  const used = quota.used ?? (total != null ? Math.max(0, total - left) : null);
  const pctLeft = total ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  const empty = left <= 0;
  const tight = !quota.canManual;
  const low = quota.low || tight;
  const reset = quota.resetsAt
    ? `Đặt lại vào ngày ${fmtDate(quota.resetsAt)}`
    : "Đặt lại khi sang chu kỳ mới";

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]">
        <span className="font-semibold text-slate-800">
          Đã dùng{" "}
          <span className={cn("tabular-nums", empty ? "text-sun-700" : low && "text-amber-700")}>
            {used != null && total != null
              ? quota.unit === "usd"
                ? `${fmtUsd(used)} / ${fmtUsd(total)} USD`
                : `${used} / ${total} lượt`
              : amount(quota, left)}
          </span>{" "}
          tháng này
        </span>
        <span className="text-xs text-slate-500">{reset}</span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80"
        role="progressbar"
        aria-label="Hạn mức còn lại trong tháng"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pctLeft)}
        aria-valuetext={`Còn ${amount(quota, left)}`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            empty ? "bg-sun-500" : low ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ width: `${pctLeft}%` }}
        />
      </div>
      {!compact && <p className="mt-1 text-xs text-slate-500">Còn {amount(quota, left)}.</p>}
      {empty ? (
        <p className="mt-1.5 text-xs leading-relaxed text-sun-700">
          Đã dùng hết hạn mức tháng này — cập nhật tự động tạm dừng, số trên website giữ nguyên và
          sẽ tự cập nhật lại khi sang chu kỳ mới.
        </p>
      ) : tight ? (
        <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
          Hạn mức còn rất ít — đang giữ lại cho cập nhật tự động hằng ngày nên tạm chưa bấm tay
          được.
        </p>
      ) : (
        low && (
          <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
            Sắp hết hạn mức — tự động vẫn ưu tiên giữ đủ cho cập nhật hằng ngày.
          </p>
        )
      )}
    </div>
  );
}
