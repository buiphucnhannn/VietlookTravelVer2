"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";
import Link from "./Link";
import UsageQuota from "./UsageQuota";
import { usePermission } from "./permissions";
import { Button, Modal, Spinner, useUi } from "./ui";

/**
 * CMS → Tour → 9. Đánh giá của khách → "Tìm đánh giá phù hợp".
 * Tripadvisor / Google không gắn đánh giá với từng tour → hệ thống dò trong kho đánh giá của CÔNG TY
 * (đã lấy về), xếp bài nhắc tới các nơi trong tour lên đầu; nhân viên tích chọn rồi thêm vào tour.
 * Tìm ở đây KHÔNG tốn hạn mức (không gọi Apify). Hạn mức chỉ tốn khi bấm "Lấy đánh giá mới" ở trang Đánh giá
 * → hiện rõ hạn mức còn lại để không ai bấm lấy thừa.
 * Backend: POST /admin/tours/review-suggestions (be/src/services/tour-review-suggest.service.js).
 */

const MAX_REVIEWS = 50; // trùng giới hạn của mục 9 trong TourEditor
const SOURCE = {
  tripadvisor: {
    label: "Tripadvisor",
    icon: TripAdvisorIcon,
    tone: "bg-emerald-50 text-emerald-700",
  },
  google: { label: "Google", icon: GoogleIcon, tone: "bg-sky-50 text-sky-700" },
};

// Mỗi ký tự → dạng không dấu, chữ thường (giữ nguyên độ dài để tô sáng đúng chỗ trên chữ gốc)
const foldChar = (ch) =>
  ch.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase()[0] ??
  ch;
const foldKeep = (s) => [...String(s ?? "")].map(foldChar).join("");
const foldFlat = (s) => foldKeep(s).replace(/[^a-z0-9]+/g, "");
/** Bài này đã có trong tour chưa (so tên + đầu nội dung, bỏ dấu / khoảng trắng) */
const sameKey = (name, text) => `${foldFlat(name)}|${foldFlat(text).slice(0, 60)}`;

/** Tô sáng các từ khoá trong đoạn chữ (không phân biệt dấu, "ha long" khớp "Halong") */
function Highlight({ text, words }) {
  const parts = useMemo(() => {
    const src = String(text ?? "");
    const pats = words
      .map((w) =>
        [...foldFlat(w)].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\-]*"),
      )
      .filter(Boolean);
    if (!pats.length) return [src];
    const folded = foldKeep(src);
    const rx = new RegExp(pats.join("|"), "g");
    const out = [];
    let last = 0;
    for (const m of folded.matchAll(rx)) {
      if (!m[0]) continue;
      if (m.index > last) out.push(src.slice(last, m.index));
      out.push(<mark key={m.index}>{src.slice(m.index, m.index + m[0].length)}</mark>);
      last = m.index + m[0].length;
    }
    if (last < src.length) out.push(src.slice(last));
    return out;
  }, [text, words]);
  return parts;
}

const Stars = ({ n }) => (
  <span className="flex text-amber-400" aria-label={`${n} sao`}>
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={cn("size-3.5", i < n ? "fill-current" : "text-slate-200")} />
    ))}
  </span>
);

/** Tên nơi đẹp hơn để hiện trên chip: "ha long" → "Ha Long" */
const pretty = (k) => k.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

export default function TourReviewFinder({ tour, existing, onAdd, disabled }) {
  const [open, setOpen] = useState(false);
  const room = MAX_REVIEWS - existing.length;
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={Sparkles}
        disabled={disabled || room <= 0}
        onClick={() => setOpen(true)}
        title={room <= 0 ? `Tour đã có tối đa ${MAX_REVIEWS} đánh giá` : undefined}
      >
        Tìm đánh giá phù hợp
      </Button>
      {open && (
        <FinderDialog
          tour={tour}
          existing={existing}
          room={room}
          onClose={() => setOpen(false)}
          onAdd={(list) => {
            onAdd(list);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function FinderDialog({ tour, existing, room, onClose, onAdd }) {
  const { toast } = useUi();
  const reviewsPerm = usePermission("reviews");
  const [keywords, setKeywords] = useState(null); // null = để máy chủ tự lấy từ khoá mặc định
  const [defaults, setDefaults] = useState([]);
  const [draft, setDraft] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(() => new Set());
  const [source, setSource] = useState("all");
  const [expanded, setExpanded] = useState(() => new Set());
  const [quota, setQuota] = useState(undefined); // undefined = đang tải / không có quyền xem
  const seq = useRef(0);

  // Dữ liệu tour đang soạn (chưa lưu cũng tìm được)
  const body = useMemo(
    () => ({
      titles: [tour.content?.en?.title, tour.content?.vi?.title].filter(Boolean),
      route: [...(tour.content?.en?.route ?? []), ...(tour.content?.vi?.route ?? [])]
        .filter(Boolean)
        .slice(0, 40),
      destinations: (tour.destinations ?? []).slice(0, 30),
      code: tour.code ?? "",
    }),
    [tour.content, tour.destinations, tour.code],
  );

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(
      () => {
        setLoading(true);
        api("/admin/tours/review-suggestions", {
          method: "POST",
          body: keywords ? { ...body, keywords } : body,
        })
          .then((r) => {
            if (id !== seq.current) return;
            setData(r.data);
            setError("");
            if (!keywords) setDefaults(r.data.keywords);
          })
          .catch((err) => id === seq.current && setError(errorMessage(err)))
          .finally(() => id === seq.current && setLoading(false));
      },
      keywords ? 350 : 0,
    );
    return () => clearTimeout(t);
  }, [body, keywords]);

  // Hạn mức lấy đánh giá MỚI (chỉ người xem được mục Đánh giá)
  useEffect(() => {
    if (!reviewsPerm.canView) return;
    let alive = true;
    api("/settings/review-stats")
      .then((r) => alive && setQuota(r.data ?? null))
      .catch(() => alive && setQuota(null));
    return () => {
      alive = false;
    };
  }, [reviewsPerm.canView]);

  const words = keywords ?? data?.keywords ?? [];
  const have = useMemo(() => new Set(existing.map((r) => sameKey(r.name, r.text))), [existing]);
  const items = (data?.items ?? []).map((it) => ({
    ...it,
    added: have.has(sameKey(it.name, it.text)),
  }));
  const shown = items.filter((it) => source === "all" || it.source === source);
  const chosen = items.filter((it) => picked.has(it.id));
  const full = chosen.length >= room;

  const toggle = (it) => {
    if (it.added) return;
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(it.id)) n.delete(it.id);
      else if (n.size < room) n.add(it.id);
      else toast(`Tour chỉ còn chỗ cho ${room} đánh giá`, "warning");
      return n;
    });
  };
  const addWord = () => {
    const w = draft.trim();
    if (w.length < 2) return;
    setKeywords([...words.filter((x) => foldFlat(x) !== foldFlat(w)), w].slice(0, 20));
    setDraft("");
  };
  const removeWord = (w) => setKeywords(words.filter((x) => x !== w));
  const counts = {
    all: items.length,
    tripadvisor: items.filter((x) => x.source === "tripadvisor").length,
    google: items.filter((x) => x.source === "google").length,
  };

  const add = () => {
    const list = chosen.map((it) => ({
      name: it.name.slice(0, 100),
      country: "",
      rating: it.rating,
      text: (it.title && !it.text.startsWith(it.title) ? `${it.title}\n${it.text}` : it.text).slice(
        0,
        3000,
      ),
      date: (it.date || "").slice(0, 7),
      source: SOURCE[it.source]?.label ?? it.source,
    }));
    onAdd(list);
    toast(`Đã thêm ${list.length} đánh giá vào tour — bấm Lưu để lưu lại`);
  };

  const poolLine = data
    ? `Dò trong ${data.pool} đánh giá của công ty${
        data.sources?.tripadvisor || data.sources?.google
          ? ` (Tripadvisor ${data.sources.tripadvisor ?? 0} · Google ${data.sources.google ?? 0})`
          : ""
      }`
    : "Đang dò trong kho đánh giá của công ty…";

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      icon={Sparkles}
      title="Tìm đánh giá phù hợp cho tour"
      description="Bài nhắc tới các nơi trong tour được xếp lên đầu. Tích chọn những bài đúng với tour rồi bấm Thêm."
      footer={
        <>
          <p className="mr-auto text-xs text-slate-500">
            {chosen.length ? (
              <b className="text-slate-800">Đã chọn {chosen.length} bài</b>
            ) : (
              "Bấm vào bài để chọn"
            )}
            {" · "}tour còn chỗ cho {room} đánh giá
          </p>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button icon={Plus} onClick={add} disabled={!chosen.length}>
            {chosen.length ? `Thêm ${chosen.length} đánh giá` : "Thêm vào tour"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Hạn mức: tìm ở đây miễn phí; lấy đánh giá mới mới tốn */}
        <div className="grid gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4 sm:px-4">
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Check className="size-3.5" /> Tìm ở đây miễn phí — không tốn hạn mức
            </p>
            <p className="text-xs text-slate-500">{poolLine}</p>
          </div>
          {reviewsPerm.canView && (
            <div className="min-w-0 space-y-1.5 sm:text-right">
              {quota === undefined ? (
                <p className="text-xs text-slate-400">Đang xem hạn mức…</p>
              ) : (
                <UsageQuota quota={quota?.quota ?? null} compact className="sm:justify-end" />
              )}
              {reviewsPerm.canEdit && (
                <Link
                  href={`${ADMIN_BASE}/reviews`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                >
                  Thiếu bài mới? Lấy đánh giá mới (tốn hạn mức)
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Từ khoá */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Tìm theo các nơi trong tour</p>
            {keywords && (
              <button
                type="button"
                onClick={() => setKeywords(null)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <RotateCcw className="size-3" /> Về mặc định
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {words.map((w) => (
              <span
                key={w}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-50 pr-1 pl-3 text-xs font-semibold text-brand-800 ring-1 ring-brand-100"
              >
                {pretty(w)}
                <button
                  type="button"
                  onClick={() => removeWord(w)}
                  aria-label={`Bỏ từ khoá ${w}`}
                  className="grid size-6 place-items-center rounded-full text-brand-500 transition hover:bg-brand-100 hover:text-brand-800"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-white pr-1 pl-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-300">
              <Search className="size-3.5 text-slate-400" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWord())}
                placeholder="Thêm nơi / từ khoá…"
                aria-label="Thêm từ khoá"
                className="h-full w-36 bg-transparent text-xs outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={addWord}
                disabled={draft.trim().length < 2}
                aria-label="Thêm từ khoá"
                className="grid size-6 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
              >
                <Plus className="size-3.5" />
              </button>
            </span>
          </div>
          {!keywords && defaults.length > 0 && (
            <p className="mt-1.5 text-[11.5px] text-slate-400">
              Lấy tự động từ điểm đến, các chặng và tên tour. Bấm × để bỏ, hoặc thêm từ khoá khác.
            </p>
          )}
        </div>

        {/* Lọc nguồn */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Lọc theo nguồn">
            {[
              ["all", "Tất cả"],
              ["tripadvisor", "Tripadvisor"],
              ["google", "Google"],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={source === k}
                onClick={() => setSource(k)}
                disabled={!counts[k]}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 transition disabled:opacity-40",
                  source === k
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                )}
              >
                {label}
                <span
                  className={cn("tabular-nums", source === k ? "text-white/70" : "text-slate-400")}
                >
                  {counts[k]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Danh sách */}
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        ) : loading && !data ? (
          <div className="grid place-items-center py-14">
            <Spinner />
          </div>
        ) : !data?.pool ? (
          <Empty
            title="Chưa có đánh giá nào được lấy về"
            text="Vào mục Đánh giá → “Tự động lấy đánh giá” để lấy đánh giá từ Tripadvisor / Google, rồi quay lại đây."
          />
        ) : !shown.length ? (
          <Empty
            title="Không có bài nào nhắc tới các nơi này"
            text="Thử bỏ bớt hoặc thêm từ khoá khác (vd. tên điểm đến, tên hướng dẫn viên)."
          />
        ) : (
          <ul
            className={cn("grid gap-3 lg:grid-cols-2", loading && "opacity-60 transition-opacity")}
          >
            {shown.map((it) => {
              const on = picked.has(it.id);
              const S = SOURCE[it.source];
              const long = it.text.length > 260;
              const open = expanded.has(it.id);
              return (
                <li key={it.id}>
                  <div
                    role="checkbox"
                    aria-checked={on}
                    aria-disabled={it.added || (!on && full)}
                    tabIndex={it.added ? -1 : 0}
                    onClick={() => toggle(it)}
                    onKeyDown={(e) =>
                      (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle(it))
                    }
                    className={cn(
                      "group relative flex h-full flex-col gap-2 rounded-2xl bg-white p-4 text-left ring-1 transition",
                      it.added
                        ? "cursor-default opacity-60 ring-slate-200"
                        : on
                          ? "cursor-pointer bg-brand-50/40 ring-2 ring-brand-500"
                          : "cursor-pointer ring-slate-200 hover:shadow-md hover:ring-brand-300",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-1 transition",
                          on
                            ? "bg-brand-600 text-white ring-brand-600"
                            : "bg-white ring-slate-300 group-hover:ring-brand-400",
                          it.added && "bg-slate-100 ring-slate-200",
                        )}
                      >
                        {(on || it.added) && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {it.name || "Khách"}
                          </span>
                          <Stars n={it.rating} />
                          {S && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                S.tone,
                              )}
                            >
                              <S.icon className="size-3" /> {S.label}
                            </span>
                          )}
                          {it.date && (
                            <span className="text-[11px] text-slate-400">
                              {it.date.slice(0, 7)}
                            </span>
                          )}
                        </div>
                        {it.title && (
                          <p className="mt-1 text-[13px] font-semibold text-slate-800">
                            {it.title}
                          </p>
                        )}
                      </div>
                      {it.added && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          Đã có trong tour
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-[13px] leading-relaxed whitespace-pre-line text-slate-600 [&_mark]:rounded [&_mark]:bg-amber-100 [&_mark]:px-0.5 [&_mark]:text-amber-900",
                        long && !open && "line-clamp-4",
                      )}
                    >
                      <Highlight text={it.text} words={it.matches} />
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      {it.matches.map((m) => (
                        <span
                          key={m}
                          className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-100"
                        >
                          {pretty(m)}
                        </span>
                      ))}
                      {long && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpanded((s) => {
                              const n = new Set(s);
                              if (n.has(it.id)) n.delete(it.id);
                              else n.add(it.id);
                              return n;
                            });
                          }}
                          className="ml-auto text-xs font-semibold text-brand-700 hover:underline"
                        >
                          {open ? "Thu gọn" : "Xem thêm"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function Empty({ title, text }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-2xl bg-slate-50 text-slate-400">
        <SearchX className="size-5" />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-slate-500">{text}</p>
    </div>
  );
}
