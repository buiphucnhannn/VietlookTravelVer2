"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCheck, CloudDownload, ExternalLink, MessageSquareQuote, Star } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";
import { useMutation } from "./hooks";
import { Badge, Button, EmptyState, Modal, Notice, fmtDate, useUi } from "./ui";

/**
 * CMS → Đánh giá → "Lấy đánh giá từ Tripadvisor / Google": xem tối đa 5 đánh giá mới nhất mỗi nền tảng
 * (qua API chính thức, dùng khoá nhập ở Cài đặt → Điểm & số lượt đánh giá), tick chọn → "Thêm vào danh sách"
 * tạo đánh giá qua đúng luồng thêm thường (POST /admin/reviews: kiểm tra dữ liệu + nhật ký).
 * Lời khách giữ nguyên văn + link bài gốc + nhãn nguồn (điều khoản API của Tripadvisor / Google).
 * Backend: be/src/services/review-import.service.js.
 */
export const IMPORT_PATH = "/admin/reviews/import";
const PLACES = ["home", "about", "group", "car"];
export const IMPORT_NAMES = { tripadvisor: "Tripadvisor", google: "Google" };
const LANG_LABEL = { en: "Tiếng Anh", zh: "Tiếng Trung", vi: "Tiếng Việt", other: "Ngôn ngữ khác" };

/** "Lấy đánh giá từ Tripadvisor / Google" theo các nền tảng có khoá */
export const importTitle = (sources) =>
  `Lấy đánh giá từ ${sources.map((s) => IMPORT_NAMES[s]).join(" / ")}`;

const keyOf = (r) => `${r.source}|${r.name}|${r.date}|${r.text.slice(0, 40)}`;

export default function ReviewImportDialog({ open, sources, nextOrder, onClose, onImported }) {
  const [state, setState] = useState({ loading: true, items: [], errors: {}, error: "" });
  const [picked, setPicked] = useState(() => new Set());
  const [nonce, setNonce] = useState(0);
  const { run, busy } = useMutation(["reviews"]);
  const { toast } = useUi();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    api(`${IMPORT_PATH}/preview`)
      .then((r) => alive && setState({ loading: false, error: "", ...r.data }))
      .catch(
        (err) =>
          alive && setState({ loading: false, items: [], errors: {}, error: errorMessage(err) }),
      );
    return () => {
      alive = false;
    };
  }, [open, nonce]);
  // (popup chỉ gắn khi mở → lần đầu đã ở trạng thái đang tải; "Thử lại" đặt lại trạng thái rồi tải lại)
  const retry = useCallback(() => {
    setState({ loading: true, items: [], errors: {}, error: "" });
    setPicked(new Set());
    setNonce((n) => n + 1);
  }, []);

  const { loading, items, errors, error } = state;
  const fresh = items.filter((r) => !r.exists);
  const toggle = (k) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const allPicked = fresh.length > 0 && fresh.every((r) => picked.has(keyOf(r)));

  const add = async () => {
    const chosen = items.filter((r) => picked.has(keyOf(r)) && !r.exists);
    let done = 0;
    const failed = [];
    const ok = await run(async () => {
      for (const [i, r] of chosen.entries()) {
        try {
          await api("/admin/reviews", {
            method: "POST",
            body: {
              name: r.name,
              title: r.title,
              text: r.text,
              rating: r.rating,
              source: r.source,
              url: r.url,
              date: r.date,
              language: r.language,
              trip: { en: "", zh: "", vi: "" },
              photo: "",
              showOn: PLACES,
              order: nextOrder + i,
              isActive: true,
            },
          });
          done++;
        } catch (err) {
          failed.push(`${r.name}: ${errorMessage(err)}`);
        }
      }
      if (!done) throw new Error(failed[0] ?? "Không thêm được đánh giá nào");
      return true;
    }, "");
    if (!ok) return;
    if (failed.length)
      toast.error(failed.join("\n"), {
        title: `Đã thêm ${done} đánh giá, ${failed.length} đánh giá chưa thêm được`,
      });
    else toast(`Đã thêm ${done} đánh giá vào danh sách`);
    onImported?.();
  };

  const count = [...picked].filter((k) => fresh.some((r) => keyOf(r) === k)).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={CloudDownload}
      title={importTitle(sources)}
      description="Chỉ hiện tối đa 5 đánh giá mới nhất mỗi nền tảng (giới hạn của TripAdvisor/Google)."
      footer={
        <>
          <span className="flex w-full items-center text-[13px] text-slate-500 sm:mr-auto sm:w-auto">
            {count ? (
              <>
                Đã chọn <b className="mx-1 text-slate-800">{count}</b> đánh giá
              </>
            ) : (
              "Tick chọn đánh giá muốn hiện trên website"
            )}
          </span>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Đóng
          </Button>
          <Button icon={CheckCheck} onClick={add} loading={busy} disabled={!count}>
            Thêm vào danh sách
          </Button>
        </>
      }
    >
      {error ? (
        <Notice tone="error" title="Chưa lấy được đánh giá">
          {error}{" "}
          <button type="button" onClick={retry} className="font-semibold underline">
            Thử lại
          </button>
        </Notice>
      ) : loading ? (
        <SkeletonRows />
      ) : (
        <div className="space-y-3">
          {Object.entries(errors ?? {}).map(([src, msg]) => (
            <Notice key={src} tone="warn" title={`${IMPORT_NAMES[src]}: chưa lấy được đánh giá`}>
              {msg}{" "}
              <button type="button" onClick={retry} className="font-semibold underline">
                Thử lại
              </button>
            </Notice>
          ))}
          {items.length ? (
            <>
              {fresh.length > 1 && (
                <div className="flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
                  <span>
                    {items.length} đánh giá · {items.length - fresh.length} đã có
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-brand-700 hover:underline"
                    onClick={() =>
                      setPicked(allPicked ? new Set() : new Set(fresh.map((r) => keyOf(r))))
                    }
                  >
                    {allPicked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
              )}
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                {items.map((r) => (
                  <ImportRow
                    key={keyOf(r)}
                    r={r}
                    checked={picked.has(keyOf(r))}
                    onToggle={() => toggle(keyOf(r))}
                  />
                ))}
              </ul>
            </>
          ) : (
            !Object.keys(errors ?? {}).length && (
              <EmptyState
                icon={MessageSquareQuote}
                title="Chưa có đánh giá nào để lấy"
                text="Tripadvisor / Google chưa trả về đánh giá nào có nội dung. Thử lại sau khi có đánh giá mới."
              />
            )
          )}
        </div>
      )}
    </Modal>
  );
}

function ImportRow({ r, checked, onToggle }) {
  const [more, setMore] = useState(false);
  const long = r.text.length > 220 || r.text.split("\n").length > 3;
  const Logo = r.source === "google" ? GoogleIcon : TripAdvisorIcon;
  return (
    <li
      className={cn(
        "flex gap-3 px-3.5 py-3.5 transition sm:gap-3.5 sm:px-4",
        r.exists ? "bg-slate-50/80" : checked ? "bg-brand-50/50" : "bg-white hover:bg-slate-50/60",
      )}
    >
      <input
        type="checkbox"
        className="mt-2.5 size-[18px] shrink-0 cursor-pointer accent-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        checked={r.exists ? false : checked}
        disabled={r.exists}
        onChange={onToggle}
        aria-label={`Chọn đánh giá của ${r.name}`}
      />
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold uppercase sm:size-10",
          r.source === "google" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700",
        )}
      >
        {r.name.trim().charAt(0) || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 truncate font-semibold text-slate-900" title={r.name}>
            {r.name}
          </span>
          <Badge tone={r.source === "google" ? "blue" : "green"} className="shrink-0">
            <Logo className={r.source === "google" ? "size-3" : "size-3.5"} />
            {IMPORT_NAMES[r.source]}
          </Badge>
          {r.exists && (
            <Badge tone="gray" className="shrink-0">
              Đã có
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-0.5" aria-label={`${r.rating} trên 5 sao`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "size-3.5",
                  n <= r.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200",
                )}
              />
            ))}
          </span>
          {r.date && <span>{fmtDate(r.date)}</span>}
          {LANG_LABEL[r.language] && <span>{LANG_LABEL[r.language]}</span>}
        </div>
        {r.title && (
          <p className="mt-2 text-sm font-semibold break-words text-slate-800">{r.title}</p>
        )}
        <p
          className={cn(
            "mt-1 text-sm leading-relaxed break-words whitespace-pre-line text-slate-600",
            !more && "line-clamp-3",
          )}
        >
          {r.text}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
          {long && (
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              className="text-brand-700 hover:underline"
            >
              {more ? "Thu gọn" : "Xem thêm"}
            </button>
          )}
          {r.url && (
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 hover:underline"
            >
              Xem bài gốc <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function SkeletonRows() {
  return (
    <div role="status" aria-label="Đang lấy đánh giá…" className="space-y-3">
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex animate-pulse gap-3.5 px-4 py-4">
            <span className="mt-2.5 size-[18px] shrink-0 rounded bg-slate-100" />
            <span className="size-10 shrink-0 rounded-full bg-slate-100" />
            <span className="flex-1 space-y-2.5 pt-1">
              <span className="block h-3 w-2/5 rounded-full bg-slate-100" />
              <span className="block h-2.5 w-1/4 rounded-full bg-slate-100/80" />
              <span
                className="block h-2.5 rounded-full bg-slate-100/80"
                style={{ width: `${92 - i * 8}%` }}
              />
              <span className="block h-2.5 w-3/5 rounded-full bg-slate-100/80" />
            </span>
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-slate-400">Đang lấy đánh giá mới nhất…</p>
    </div>
  );
}
