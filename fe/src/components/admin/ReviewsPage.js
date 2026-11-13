"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CloudDownload,
  Eye,
  Mail,
  MessageSquareQuote,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { todayVN } from "@/lib/dates";
import { cn, foldSearch } from "@/lib/utils";
import { EditorModal, FormSection, LangBar, useEditVerb } from "./catalogShared";
import { useAdminList, useMutation } from "./hooks";
import { DragHandle, PositionBadge, Sortable, usePagedSort } from "./Sortable";
import {
  Badge,
  Button,
  Card,
  DEFAULT_LANG,
  DateInput,
  EmptyState,
  Field,
  ImageField,
  Input,
  LoadingBlock,
  LocInput,
  Notice,
  PageHeader,
  Pagination,
  SearchBox,
  Select,
  Textarea,
  Toggle,
  filledOf,
  fmtDate,
  locText,
  usePaged,
  useUi,
} from "./ui";
import VisibilityToggle from "./VisibilityToggle";
import ReviewImportDialog, { IMPORT_PATH, importTitle } from "./ReviewImportDialog";
import { usePendingImages } from "./pendingImages";
import { usePermission } from "./permissions";
import { useAutoFill } from "./translate";
import { FacebookIcon, GoogleIcon, TripAdvisorIcon } from "@/components/ui/BrandIcons";

/**
 * CMS → Đánh giá khách: đánh giá thật của khách hiện ở khối đánh giá trang chủ, giới thiệu, tour đoàn, thuê xe.
 * Lời khách giữ NGUYÊN VĂN (không dịch); chỉ nhãn chuyến đi có 3 ngôn ngữ (tự dịch khi lưu).
 * Thứ tự trong danh sách = thứ tự trên website (kéo – thả hoặc bấm số thứ tự để đổi).
 */

const PATH = "/admin/reviews";
const TAGS = ["reviews"];
const PAGE_SIZE = 10;
const MAX_TEXT = 5000;
const HINT =
  "Chép nguyên văn đánh giá từ TripAdvisor/Google, ghi đúng tên người viết và dán link bài gốc.";

export const REVIEW_SOURCES = [
  { value: "tripadvisor", label: "Tripadvisor", tone: "green" },
  { value: "google", label: "Google", tone: "blue" },
  { value: "facebook", label: "Facebook", tone: "violet" },
  { value: "email", label: "Email khách gửi", tone: "amber" },
  { value: "other", label: "Nguồn khác", tone: "gray" },
];
const sourceOf = (v) => REVIEW_SOURCES.find((s) => s.value === v) ?? REVIEW_SOURCES.at(-1);

const PLACES = [
  { value: "home", label: "Trang chủ" },
  { value: "about", label: "Giới thiệu" },
  { value: "group", label: "Tour đoàn" },
  { value: "car", label: "Thuê xe" },
];
const ALL_PLACES = PLACES.map((p) => p.value);

const LANGUAGES = [
  { value: "", label: "Không ghi" },
  { value: "en", label: "Tiếng Anh" },
  { value: "zh", label: "Tiếng Trung" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "other", label: "Ngôn ngữ khác" },
];

const RATING_WORDS = { 1: "Rất tệ", 2: "Chưa tốt", 3: "Bình thường", 4: "Rất tốt", 5: "Tuyệt vời" };

const EMPTY = {
  name: "",
  title: "",
  text: "",
  rating: 5,
  source: "tripadvisor",
  url: "",
  date: "",
  trip: { en: "", zh: "", vi: "" },
  photo: "",
  language: "en",
  showOn: ALL_PLACES,
  order: 0,
  isActive: true,
};

const payload = (d) => ({
  name: d.name.trim(),
  title: d.title.trim(),
  text: d.text.trim(),
  rating: Number(d.rating) || 5,
  source: d.source,
  url: d.url.trim(),
  date: d.date || "",
  trip: d.trip,
  photo: d.photo,
  language: d.language,
  showOn: ALL_PLACES.filter((p) => d.showOn.includes(p)),
  order: Number(d.order) || 0,
  isActive: d.isActive,
});

const validUrl = (v) => {
  if (!v.trim()) return true;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

/** Lỗi của form (tiếng Việt) — { tên ô: câu báo lỗi } */
function validate(d) {
  const e = {};
  if (!d.name.trim()) e.name = "Vui lòng nhập tên người viết đánh giá";
  if (!d.text.trim()) e.text = "Vui lòng nhập nội dung đánh giá";
  else if (d.text.length > MAX_TEXT) e.text = `Nội dung tối đa ${MAX_TEXT} ký tự`;
  if (!validUrl(d.url)) e.url = "Link bài gốc phải bắt đầu bằng http:// hoặc https://";
  if (d.date && d.date > todayVN()) e.date = "Ngày đánh giá không được sau hôm nay";
  if (!d.showOn.length) e.showOn = "Chọn ít nhất một trang để hiện đánh giá";
  return e;
}

/* =========================================================================
 * Trang danh sách
 * ========================================================================= */

export default function ReviewsPage() {
  const { canEdit } = usePermission("reviews");
  const list = useAdminList(PATH, { limit: 200, sort: "order" });
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  // Nền tảng đã có khoá API (Cài đặt → Điểm & số lượt đánh giá) → hiện nút "Lấy đánh giá từ …"
  const [apiSources, setApiSources] = useState([]);
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    if (!canEdit) return;
    let alive = true;
    api(`${IMPORT_PATH}/sources`)
      .then((r) => alive && setApiSources(Object.keys(r.data ?? {}).filter((k) => r.data[k])))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [canEdit]);

  const all = list.items;
  const filtering = Boolean(q.trim() || source);
  const shown = useMemo(() => {
    const needle = foldSearch(q);
    return all.filter(
      (r) =>
        (!source || r.source === source) &&
        (!needle ||
          foldSearch(`${r.name} ${r.title} ${r.text} ${locText(r.trip)}`).includes(needle)),
    );
  }, [all, q, source]);

  const paged = usePaged(shown, PAGE_SIZE);
  const { run } = useMutation(TAGS);
  /** Lưu thứ tự mới của toàn bộ danh sách (sau khi kéo – thả hoặc chuyển tới vị trí khác) */
  const reorder = async (next) => {
    const before = list.items;
    list.setItems(() => next.map((x, i) => ({ ...x, order: i + 1 })));
    const ok = await run(
      () =>
        api(`${PATH}/order`, {
          method: "PATCH",
          body: { items: next.map((x, i) => ({ id: x.id, order: i + 1 })) },
        }),
      "Đã lưu thứ tự mới",
      { retry: () => reorder(next) },
    );
    if (!ok) list.setItems(() => before);
  };
  const sort = usePagedSort({ all, paged, onReorder: reorder });
  const nextOrder = all.reduce((m, x) => Math.max(m, (Number(x.order) || 0) + 1), 1);
  const active = all.filter((r) => r.isActive).length;

  return (
    <>
      <PageHeader
        title="Đánh giá"
        description={`Đánh giá thật của khách, hiện ở trang chủ, trang giới thiệu, trang tour đoàn và trang thuê xe. Thứ tự trong danh sách là thứ tự trên website.${canEdit ? " Giữ nút 6 chấm ở đầu dòng và kéo để đổi thứ tự, hoặc bấm số thứ tự để chuyển nhanh." : ""}`}
        actions={
          canEdit && (
            <div className="flex flex-wrap gap-2">
              {apiSources.length > 0 && (
                <Button variant="secondary" icon={CloudDownload} onClick={() => setImporting(true)}>
                  {importTitle(apiSources)}
                </Button>
              )}
              <Button icon={Plus} onClick={() => setEditing({ ...EMPTY, order: nextOrder })}>
                Thêm đánh giá
              </Button>
            </div>
          )
        }
      />

      <Card
        title="Danh sách đánh giá"
        icon={MessageSquareQuote}
        description={
          list.loading && !all.length
            ? "Đang tải…"
            : `${all.length} đánh giá · ${active} đang hiện trên website`
        }
        bodyClassName="p-0 sm:p-0"
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Tìm tên khách, nội dung…"
              className="min-w-0 flex-1 sm:w-64 sm:flex-none"
            />
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              aria-label="Lọc theo nguồn"
              className="h-[42px] w-auto py-0"
            >
              <option value="">Mọi nguồn</option>
              {REVIEW_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {list.error && (
          <Notice tone="error" className="m-4">
            {list.error}
          </Notice>
        )}
        {filtering && canEdit && shown.length > 0 && (
          <p className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-500">
            Đang lọc danh sách — xoá ô tìm kiếm và bộ lọc nguồn để kéo đổi thứ tự.
          </p>
        )}
        {list.loading && !all.length ? (
          <LoadingBlock />
        ) : !all.length ? (
          <EmptyState
            icon={MessageSquareQuote}
            title="Chưa có đánh giá nào"
            text="Khi chưa có đánh giá đang hiện, khối đánh giá trên website tự ẩn đi."
            action={
              canEdit && (
                <Button icon={Plus} onClick={() => setEditing({ ...EMPTY, order: nextOrder })}>
                  Thêm đánh giá đầu tiên
                </Button>
              )
            }
          />
        ) : !shown.length ? (
          <EmptyState
            icon={Search}
            title="Không tìm thấy đánh giá phù hợp"
            text="Thử từ khoá khác hoặc chọn “Mọi nguồn”."
          />
        ) : (
          <Sortable
            items={paged.items}
            getId={(x) => x.id}
            onReorder={sort.onPageReorder}
            highlight={sort.flash}
            className="divide-y divide-slate-100"
            disabled={!canEdit || filtering}
          >
            {(r, i, drag) => (
              <ReviewRow
                review={r}
                drag={canEdit && !filtering ? drag : null}
                position={canEdit && !filtering ? sort.badge(r, i) : null}
                onEdit={() => setEditing(r)}
                onChanged={(doc) =>
                  list.setItems((xs) => xs.map((x) => (x.id === doc.id ? doc : x)))
                }
                onRemoved={list.reload}
              />
            )}
          </Sortable>
        )}
        <Pagination meta={paged.meta} onPage={paged.setPage} unit="đánh giá" />
      </Card>

      {importing && (
        <ReviewImportDialog
          open
          sources={apiSources}
          nextOrder={nextOrder}
          onClose={() => setImporting(false)}
          onImported={() => {
            setImporting(false);
            setQ("");
            setSource("");
            list.reload();
          }}
        />
      )}

      {editing && (
        <ReviewEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            setQ("");
            setSource("");
            sort.reveal(id); // đánh giá vừa lưu: sang đúng trang + nháy viền
            list.reload();
          }}
        />
      )}
    </>
  );
}

/** Nhãn nguồn có biểu tượng */
function SourceBadge({ source }) {
  const s = sourceOf(source);
  const icon =
    source === "tripadvisor" ? (
      <TripAdvisorIcon className="size-3.5" />
    ) : source === "google" ? (
      <GoogleIcon className="size-3" />
    ) : source === "facebook" ? (
      <FacebookIcon className="size-3" />
    ) : source === "email" ? (
      <Mail className="size-3" />
    ) : null;
  return (
    <Badge tone={s.tone}>
      {icon}
      {s.label}
    </Badge>
  );
}

/** Dãy sao chỉ đọc */
function Stars({ value, className }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      title={`${value}/5 sao`}
      aria-label={`${value} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3.5",
            n <= value ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200",
          )}
        />
      ))}
    </span>
  );
}

function ReviewRow({ review: r, drag, position, onEdit, onChanged, onRemoved }) {
  const { canEdit, canDelete } = usePermission("reviews");
  const { confirm } = useUi();
  const { run } = useMutation(TAGS);
  const places = PLACES.filter((p) => r.showOn?.includes(p.value));
  const trip = locText(r.trip);

  const remove = async () => {
    const ok = await confirm({
      title: "Xoá đánh giá?",
      message: `Đánh giá của "${r.name}" sẽ bị xoá khỏi website và không khôi phục được. Nếu chỉ muốn tạm gỡ, hãy ẩn thay vì xoá.`,
      confirmText: "Xoá",
      danger: true,
    });
    if (!ok) return;
    if (await run(() => api(`${PATH}/${r.id}`, { method: "DELETE" }), "Đã xoá đánh giá"))
      onRemoved();
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-3 gap-y-2 bg-white py-4 pr-4 pl-3 sm:flex-nowrap sm:gap-4 sm:pr-5",
        drag?.dragging && "ring-1 ring-brand-300",
      )}
    >
      {(drag || position) && (
        <span className="flex shrink-0 flex-col items-center gap-1 pt-0.5 sm:flex-row sm:items-start">
          {drag && <DragHandle {...drag.handle} />}
          {position && <PositionBadge {...position} />}
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-10 shrink-0 place-items-center rounded-full text-base font-bold text-white uppercase max-sm:hidden",
          r.isActive ? "bg-forest-700" : "bg-slate-300",
        )}
      >
        {(r.name || "?").trim()[0]}
      </span>

      <div className={cn("min-w-0 flex-1 basis-0", !r.isActive && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="truncate font-semibold text-slate-900">{r.name}</p>
          <Stars value={r.rating ?? 5} />
          <SourceBadge source={r.source} />
          {!r.isActive && <Badge tone="gray">Đang ẩn</Badge>}
        </div>
        {r.title && (
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-700">{r.title}</p>
        )}
        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{r.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
          {trip && <span className="truncate">{trip}</span>}
          {r.date && <span>Ngày viết: {fmtDate(r.date)}</span>}
          <span className="flex flex-wrap items-center gap-1">
            <span className="text-slate-400">Hiện ở:</span>
            {places.map((p) => (
              <span
                key={p.value}
                className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600"
              >
                {p.label}
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* điện thoại: hàng nút xuống dưới (chừa chỗ cho chữ); máy tính: bên phải */}
      <div className="flex shrink-0 items-center justify-between gap-1 max-sm:w-full max-sm:border-t max-sm:border-slate-100 max-sm:pt-2 sm:items-start">
        <VisibilityToggle path={PATH} item={r} tags={TAGS} onDone={onChanged} />
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            aria-label={canEdit ? "Sửa" : "Xem"}
            title={canEdit ? "Sửa" : "Xem"}
          >
            {canEdit ? <Pencil className="size-4" /> : <Eye className="size-4" />}
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={remove}
              aria-label="Xoá"
              title="Xoá"
              className="text-sun-600"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * Popup thêm / sửa
 * ========================================================================= */

/** Chọn số sao: bấm sao thứ n = n sao */
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Số sao"
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sao`}
            title={`${n} sao — ${RATING_WORDS[n]}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="grid size-9 place-items-center rounded-lg transition hover:bg-amber-50 focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none"
          >
            <Star
              className={cn(
                "size-6 transition",
                n <= shown ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300",
              )}
            />
          </button>
        ))}
      </div>
      <span className="text-sm font-semibold text-slate-700 tabular-nums">
        {shown}/5 <span className="font-medium text-slate-500">· {RATING_WORDS[shown]}</span>
      </span>
    </div>
  );
}

const URL_HINT = {
  tripadvisor:
    "Mở bài đánh giá trên Tripadvisor, chép địa chỉ trên thanh trình duyệt rồi dán vào đây. Để trống → dẫn tới trang Vietlook trên Tripadvisor.",
  google:
    "Trên Google Maps: bấm “Chia sẻ” ở bài đánh giá → “Sao chép đường liên kết”. Để trống → dẫn tới trang Vietlook trên Google Maps.",
  facebook:
    "Chép link bài đánh giá / bài viết trên Facebook. Để trống → dẫn tới trang Facebook của Vietlook.",
  email: "Không bắt buộc với đánh giá khách gửi qua email.",
  other: "Link trang có bài đánh giá (nếu có).",
};

function ReviewEditor({ initial, onClose, onSaved }) {
  const editVerb = useEditVerb();
  const isNew = !initial.id;
  const [d, setD] = useState(() => ({
    ...EMPTY,
    ...initial,
    title: initial.title ?? "",
    url: initial.url ?? "",
    date: initial.date ?? "",
    photo: initial.photo ?? "",
    language: initial.language ?? "",
    trip: { en: "", zh: "", vi: "", ...initial.trip },
    showOn: initial.showOn ?? ALL_PLACES,
  }));
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [tried, setTried] = useState(false);
  const { run, busy } = useMutation(TAGS);
  const autoFill = useAutoFill();
  const images = usePendingImages(d);
  const { toast } = useUi();
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const errors = tried ? validate(d) : {};
  const togglePlace = (p) =>
    set({ showOn: d.showOn.includes(p) ? d.showOn.filter((x) => x !== p) : [...d.showOn, p] });

  const save = async () => {
    setTried(true);
    const problems = Object.values(validate(d));
    if (problems.length) return toast(problems[0], "error");
    // chỉ nhãn chuyến đi có 3 ngôn ngữ → tự dịch phần còn trống; lời khách giữ nguyên văn
    const { value: v, failed } = await autoFill.fill(d, { lang });
    if (v !== d) setD(v);
    // ảnh vừa chọn chỉ được lưu vào kho ảnh lúc này
    const body = await images.prepare(payload(v));
    if (!body) return;
    const ok = await run(
      () =>
        isNew
          ? api(PATH, { method: "POST", body })
          : api(`${PATH}/${d.id}`, { method: "PUT", body }),
      isNew ? "Đã thêm đánh giá" : "Đã lưu đánh giá",
    );
    if (!ok) return;
    const id = ok.data?.id ?? d.id;
    if (failed)
      autoFill.offerRetry((t) =>
        api(`${PATH}/${id}`, { method: "PUT", body: { ...payload(t), photo: body.photo } }),
      );
    onSaved(id);
  };

  return (
    <EditorModal
      size="xl"
      title={isNew ? "Thêm đánh giá khách" : `${editVerb}: đánh giá của ${initial.name}`}
      value={d}
      onClose={onClose}
      onSave={save}
      busy={busy || autoFill.busy || images.busy}
      saveLabel={images.label}
    >
      <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Máy tính — cột trái (dính khi cuộn): chấm điểm, nguồn, hiển thị, ảnh; điện thoại: xuống sau phần lời khách */}
        <div className="order-2 space-y-6 lg:sticky lg:top-0 lg:order-none">
          <FormSection title="Đánh giá">
            <Field label="Số sao khách chấm" required>
              <StarPicker value={Number(d.rating) || 5} onChange={(rating) => set({ rating })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Field label="Nguồn">
                <Select value={d.source} onChange={(e) => set({ source: e.target.value })}>
                  {REVIEW_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ngày viết đánh giá" error={errors.date} hint="Không bắt buộc.">
                <DateInput
                  value={d.date}
                  max={todayVN()}
                  onChange={(e) => set({ date: e.target.value })}
                  aria-invalid={Boolean(errors.date)}
                />
              </Field>
            </div>
            <Field label="Link bài đánh giá gốc" error={errors.url} hint={URL_HINT[d.source]}>
              <Input
                type="url"
                inputMode="url"
                value={d.url}
                placeholder="https://…"
                onChange={(e) => set({ url: e.target.value })}
                aria-invalid={Boolean(errors.url)}
              />
            </Field>
          </FormSection>

          <FormSection title="Hiển thị trên website" className="border-t border-slate-100 pt-5">
            <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <Toggle
                checked={d.isActive}
                onChange={(isActive) => set({ isActive })}
                label="Hiện trên website"
                hint="Tắt để tạm ẩn đánh giá này mà không xoá."
              />
            </div>
            <Field
              label="Hiện ở trang"
              error={errors.showOn}
              hint="Trang Thuê xe chỉ hiện 3 đánh giá đầu tiên được chọn."
            >
              <div className="grid grid-cols-2 gap-2">
                {PLACES.map((p) => {
                  const on = d.showOn.includes(p.value);
                  return (
                    <label
                      key={p.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition select-none",
                        on
                          ? "bg-brand-50 text-brand-800 ring-brand-200"
                          : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => togglePlace(p.value)}
                        className="size-4 accent-brand-600"
                      />
                      {p.label}
                    </label>
                  );
                })}
              </div>
            </Field>
          </FormSection>

          <FormSection
            title="Ảnh minh hoạ chuyến đi (không bắt buộc)"
            className="border-t border-slate-100 pt-5"
          >
            <Field hint="Ảnh do Vietlook chọn theo chuyến đi, không phải ảnh của khách. Hiện chưa hiển thị trên thẻ đánh giá của website.">
              <ImageField
                value={d.photo}
                onChange={(photo) => set({ photo })}
                folder="reviews"
                aspect="aspect-[16/9]"
                crop={{ ratio: 16 / 9, width: 1600 }}
              />
            </Field>
          </FormSection>
        </div>

        {/* Cột phải: lời khách (nguyên văn) + nhãn chuyến đi 3 ngôn ngữ */}
        <div className="order-1 space-y-5 lg:order-none">
          <Notice>{HINT}</Notice>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tên người viết"
              required
              error={errors.name}
              hint="Đúng tên hiển thị ở bài gốc."
            >
              <Input
                value={d.name}
                maxLength={100}
                placeholder="VD: Bhavik Shah"
                onChange={(e) => set({ name: e.target.value })}
                aria-invalid={Boolean(errors.name)}
              />
            </Field>
            <Field label="Khách viết bằng" hint="Ngôn ngữ của lời đánh giá.">
              <Select value={d.language} onChange={(e) => set({ language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Tiêu đề đánh giá" hint="Không bắt buộc — chép nếu bài gốc có tiêu đề.">
            <Input
              value={d.title}
              maxLength={200}
              placeholder="VD: Wonderful experience, Vietnam trip"
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>
          <Field
            label="Nội dung đánh giá"
            required
            error={errors.text}
            hint="Giữ nguyên văn lời khách, kể cả lỗi chính tả — không dịch, không sửa. Website hiện đúng như vậy ở cả 3 ngôn ngữ."
            aside={
              <span className={cn(d.text.length > MAX_TEXT && "font-semibold text-sun-600")}>
                {d.text.length.toLocaleString("vi-VN")}/{MAX_TEXT.toLocaleString("vi-VN")} ký tự
              </span>
            }
          >
            <Textarea
              rows={12}
              value={d.text}
              placeholder="Dán nguyên văn lời đánh giá của khách…"
              onChange={(e) => set({ text: e.target.value })}
              aria-invalid={Boolean(errors.text)}
            />
          </Field>

          <div className="space-y-3 border-t border-slate-100 pt-5">
            <LangBar
              title="Nhãn chuyến đi"
              lang={lang}
              onLang={setLang}
              form={d}
              onForm={setD}
              filled={filledOf(d.trip)}
            />
            <Field hint="Dòng nhỏ dưới tên khách. Viết 1 ngôn ngữ — ngôn ngữ còn trống tự dịch khi lưu.">
              <LocInput
                value={d.trip}
                lang={lang}
                maxLength={160}
                placeholder="VD: Du lịch gia đình · Hà Nội & Đà Nẵng"
                onChange={(trip) => set({ trip })}
              />
            </Field>
          </div>
        </div>
      </div>
    </EditorModal>
  );
}
