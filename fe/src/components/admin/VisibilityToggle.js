"use client";

import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMutation } from "./hooks";
import { useUi } from "./ui";
import { usePermission } from "./permissions";

/**
 * Nút ẩn / hiện nhanh trên website (PATCH /:id/visibility).
 * onDone(doc) cập nhật lại dòng trong danh sách.
 */
export default function VisibilityToggle({ path, item, tags, onDone }) {
  const { run, busy } = useMutation(tags);
  const { toast } = useUi();
  const { canEdit } = usePermission();
  const on = item.isActive;
  // Bật / tắt rồi báo kết quả kèm nút "Hoàn tác" (bấm nhầm thì trả lại ngay)
  const set = async (isActive, undo = false) => {
    const r = await run(
      () => api(`${path}/${item.id}/visibility`, { method: "PATCH", body: { isActive } }),
      null,
      { retry: () => set(isActive, undo) },
    );
    if (!r?.data) return;
    onDone?.(r.data);
    const msg = isActive ? "Đã hiện trên website" : "Đã ẩn khỏi website";
    if (undo) toast(msg);
    else toast(msg, { action: { label: "Hoàn tác", onClick: () => set(!isActive, true) } });
  };
  const toggle = () => set(!on);
  // Chỉ xem → nhãn trạng thái, không bấm được
  if (!canEdit)
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
          on
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-slate-100 text-slate-500 ring-slate-200",
        )}
      >
        {on ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        {on ? "Đang hiện" : "Đang ẩn"}
      </span>
    );
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={on ? "Đang hiện — bấm để ẩn" : "Đang ẩn — bấm để hiện"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition disabled:opacity-60",
        on
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
          : "bg-slate-100 text-slate-500 ring-slate-200 hover:bg-slate-200",
      )}
    >
      {on ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {on ? "Đang hiện" : "Đang ẩn"}
    </button>
  );
}
