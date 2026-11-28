"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, History, RotateCcw, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMutation } from "../hooks";
import { Button, Spinner, useUi } from "../ui";
import { fmtShort } from "./chrome";

/**
 * Lịch sử phiên bản của 1 trang (Trang chủ · Giao diện trang · Giới thiệu / chính sách): mỗi lần lưu / khôi phục,
 * bản trước đó được máy chủ cất lại (giữ 20 bản gần nhất — be/src/services/revision.service.js).
 * Bấm 1 bản → xem bản đó khác bản đang lưu ở phần nào → "Dùng lại bản này" (bản hiện tại cũng được cất vào
 * lịch sử, nên luôn quay lại được).
 *
 *   contentKey  "home" | khoá trang ("about", "car-rental"…)
 *   describe    (dữ liệu bản cũ) → ["Tiêu đề", "Ảnh đầu trang"…]: phần khác với bản đang lưu ([] = giống hệt)
 *   onRestored  (dữ liệu máy chủ trả về sau khi khôi phục) → trình sửa nạp lại
 *   dirty       đang có thay đổi chưa lưu → nhắc sẽ mất khi dùng lại bản cũ
 *   canRestore  chỉ xem → chỉ xem danh sách
 *   tags        thẻ cache website cần làm mới sau khi khôi phục
 */
export default function HistoryDrawer({
  open,
  onClose,
  contentKey,
  title,
  describe,
  onRestored,
  dirty,
  canRestore = true,
  tags = [],
}) {
  if (!open) return null;
  return (
    <Drawer
      onClose={onClose}
      contentKey={contentKey}
      title={title}
      describe={describe}
      onRestored={onRestored}
      dirty={dirty}
      canRestore={canRestore}
      tags={tags}
    />
  );
}

const DRAWER_CSS =
  "@keyframes vl-drawer-in{from{transform:translateX(100%)}to{transform:none}}@media (prefers-reduced-motion:reduce){[class*=vl-drawer-in]{animation:none!important}}";

const REASON = { save: "Trước lần lưu", restore: "Trước khi dùng lại bản cũ" };

function Drawer({ onClose, contentKey, title, describe, onRestored, dirty, canRestore, tags }) {
  const { confirm } = useUi();
  const { run, busy } = useMutation(tags);
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({}); // id → { loading, data, error }
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    api(`/settings/revisions/${contentKey}`)
      .then((r) => alive && setList(r.data ?? []))
      .catch((err) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [contentKey]);

  // Esc đóng · khoá cuộn trang phía sau · trả con trỏ về nút đã mở
  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      // hộp xác nhận đang mở thì để hộp đó xử lý Esc
      if (e.key === "Escape" && !document.querySelector("[role=alertdialog]")) onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  const load = (id) => {
    if (details[id]?.data || details[id]?.loading) return;
    setDetails((d) => ({ ...d, [id]: { loading: true } }));
    api(`/settings/revisions/${contentKey}/${id}`)
      .then((r) => setDetails((d) => ({ ...d, [id]: { data: r.data?.data ?? {} } })))
      .catch((err) => setDetails((d) => ({ ...d, [id]: { error: errorMessage(err) } })));
  };

  const toggle = (id) => {
    setOpenId((cur) => (cur === id ? null : id));
    load(id);
  };

  const restore = async (rev) => {
    const when = fmtShort(rev.savedAt || rev.createdAt);
    const ok = await confirm({
      title: "Dùng lại bản này?",
      message: `Trang sẽ trở về như bản lưu lúc ${when}${rev.savedBy ? ` của ${rev.savedBy}` : ""}. Bản đang lưu hiện tại được cất vào lịch sử, nên vẫn quay lại được.${dirty ? " Các thay đổi chưa lưu trên màn hình sẽ mất." : ""}`,
      confirmText: "Dùng lại bản này",
      cancelText: "Thôi",
      icon: RotateCcw,
    });
    if (!ok) return;
    const r = await run(
      () => api(`/settings/revisions/${contentKey}/${rev.id}/restore`, { method: "POST" }),
      `Đã dùng lại bản lưu lúc ${when}`,
      { errorTitle: "Chưa dùng lại được bản này" },
    );
    if (!r?.data) return;
    onRestored(r.data);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[85] flex justify-end" role="presentation">
      <style>{DRAWER_CSS}</style>
      <div
        className="absolute inset-0 animate-[admin-fade_.18s_ease-out] bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="relative flex h-full w-full max-w-md animate-[vl-drawer-in_.22s_cubic-bezier(.2,.8,.2,1)] flex-col bg-white shadow-[0_24px_80px_-20px_rgba(10,37,60,0.45)] outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="history-title" className="text-lg font-bold tracking-tight text-slate-900">
              Lịch sử phiên bản
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {title} · giữ 20 bản lưu gần nhất
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid size-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 scrollbar-thin overflow-y-auto overscroll-contain px-4 py-4">
          {error ? (
            <p className="rounded-xl bg-sun-50 px-3 py-2.5 text-sm text-sun-700">{error}</p>
          ) : !list ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : !list.length ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                <History className="size-6" />
              </span>
              <p className="mt-3 font-semibold text-slate-900">Chưa có bản cũ nào</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Mỗi lần bạn bấm Lưu, bản trước đó sẽ được cất ở đây để quay lại khi cần.
              </p>
            </div>
          ) : (
            <ol className="space-y-2">
              {list.map((r) => {
                const isOpen = openId === r.id;
                const det = details[r.id];
                const diff = det?.data && describe ? describe(det.data) : null;
                return (
                  <li
                    key={r.id}
                    className={cn(
                      "rounded-xl ring-1 transition",
                      isOpen
                        ? "bg-brand-50/40 ring-brand-200"
                        : "ring-slate-200 hover:ring-brand-200",
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggle(r.id)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                        <History className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {fmtShort(r.savedAt || r.createdAt)}
                          {r.savedBy || r.by?.name ? ` · ${r.savedBy || r.by.name}` : ""}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {REASON[r.reason] ?? REASON.save}
                          {r.by?.name ? ` của ${r.by.name}` : ""} · {fmtShort(r.createdAt)}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-slate-400 transition",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 px-3 pt-2.5 pb-3">
                        {det?.loading || !det ? (
                          <p className="flex items-center gap-2 text-xs text-slate-500">
                            <Spinner className="size-3.5" /> Đang so sánh với bản đang lưu…
                          </p>
                        ) : det.error ? (
                          <p className="text-xs text-sun-700">{det.error}</p>
                        ) : diff ? (
                          diff.length ? (
                            <div className="text-xs leading-relaxed text-slate-600">
                              <p className="mb-1.5 font-semibold text-slate-700">
                                Khác bản đang lưu ở {diff.length} phần:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {diff.slice(0, 12).map((x) => (
                                  <span
                                    key={x}
                                    className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200"
                                  >
                                    {x}
                                  </span>
                                ))}
                                {diff.length > 12 && (
                                  <span className="px-1 py-0.5 text-slate-400">
                                    và {diff.length - 12} phần khác
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">Giống hệt bản đang lưu.</p>
                          )
                        ) : null}
                        {canRestore && (
                          <Button
                            size="sm"
                            icon={RotateCcw}
                            className="mt-3"
                            loading={busy}
                            disabled={!!det?.error}
                            onClick={() => restore(r)}
                          >
                            Dùng lại bản này
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        {!canRestore && (
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Bạn đang ở chế độ chỉ xem — chỉ người có quyền sửa mới dùng lại được bản cũ.
          </p>
        )}
      </aside>
    </div>,
    document.body,
  );
}

/**
 * So sánh nhanh 2 bản theo từng phần: `parts` = [[nhãn, (bản) → giá trị]] → nhãn các phần khác nhau.
 * Dùng cho `describe` của HistoryDrawer.
 */
export function diffParts(parts, a, b) {
  const same = (x, y) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
  return parts.filter(([, pick]) => !same(pick(a), pick(b))).map(([label]) => label);
}
