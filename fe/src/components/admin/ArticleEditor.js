"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/admin/Link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { cn, slugify } from "@/lib/utils";
import { ADMIN_BASE } from "@/config/urls.mjs";
import { useMutation, useOptions } from "./hooks";
import RichText from "./RichText";
import { AutoTranslate } from "./translate";
import {
  Button,
  Card,
  Field,
  ImageField,
  Input,
  LangTabs,
  LoadingBlock,
  LocInput,
  Notice,
  PageHeader,
  Select,
  Textarea,
  Toggle,
  filledOf,
  locText,
  useUi,
  useUnsavedGuard,
} from "./ui";

const PATH = "/admin/articles";
const TAGS = ["articles"];
const BASE = `${ADMIN_BASE}/articles`;
const MONTH_CATEGORY = "vietnam-by-month";

const loc = () => ({ en: "", zh: "", vi: "" });
const seoEmpty = () => ({
  en: { title: "", description: "" },
  zh: { title: "", description: "" },
  vi: { title: "", description: "" },
});

/** Ngày hôm nay theo giờ máy (YYYY-MM-DD) cho ô chọn ngày */
const toDateInput = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const empty = () => ({
  slug: "",
  title: loc(),
  excerpt: loc(),
  body: loc(),
  image: "",
  category: "",
  author: "vietlook-team",
  destination: "",
  month: null,
  publishedAt: toDateInput(),
  seo: seoEmpty(),
  isActive: true,
});

/** Dữ liệu API → state form (bù trường thiếu) */
const fromDoc = (doc) => {
  const base = empty();
  const seo = seoEmpty();
  for (const l of ["en", "zh", "vi"]) seo[l] = { ...seo[l], ...doc.seo?.[l] };
  return {
    ...base,
    id: doc.id,
    slug: doc.slug ?? "",
    title: { ...base.title, ...doc.title },
    excerpt: { ...base.excerpt, ...doc.excerpt },
    body: { ...base.body, ...doc.body },
    image: doc.image ?? "",
    category: doc.category ?? "",
    author: doc.author ?? "",
    destination: doc.destination ?? "",
    month: doc.month ?? null,
    publishedAt: toDateInput(doc.publishedAt),
    seo,
    isActive: doc.isActive !== false,
  };
};

/** Chỉ gửi các trường của form (PUT nhận object đầy đủ) */
const toPayload = (d) => ({
  slug: d.slug,
  title: d.title,
  excerpt: d.excerpt,
  body: d.body,
  image: d.image,
  category: d.category,
  author: d.author,
  destination: d.destination,
  month: d.category === MONTH_CATEGORY && d.month ? Number(d.month) : null,
  publishedAt: d.publishedAt || toDateInput(),
  seo: d.seo,
  isActive: d.isActive,
});

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function ArticleEditor({ id }) {
  const isNew = !id;
  const [state, setState] = useState(() =>
    isNew ? { loading: false, error: "", doc: empty() } : { loading: true, error: "", doc: null },
  );

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    api(`${PATH}/${id}`)
      .then((r) => alive && setState({ loading: false, error: "", doc: fromDoc(r.data) }))
      .catch((err) => alive && setState({ loading: false, error: errorMessage(err), doc: null }));
    return () => {
      alive = false;
    };
  }, [id, isNew]);

  const back = (
    <Link
      href={BASE}
      className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
    >
      <ArrowLeft className="size-3.5" />
      Tất cả bài viết
    </Link>
  );

  if (state.loading) return <LoadingBlock text="Đang tải bài viết…" />;
  if (!state.doc)
    return (
      <>
        <PageHeader title="Sửa bài viết" back={back} />
        <Notice tone="error">{state.error || "Không tìm thấy bài viết"}</Notice>
      </>
    );
  return <EditorForm key={state.doc.id ?? "new"} initial={state.doc} back={back} />;
}

function EditorForm({ initial, back }) {
  const router = useRouter();
  const { toast, confirm } = useUi();
  const isNew = !initial.id;
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(initial); // bản đã lưu gần nhất (so sánh để biết có thay đổi)
  const [lang, setLang] = useState("en");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState({});
  const { run, busy } = useMutation(TAGS);
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const categories = useOptions("/admin/categories?limit=200&sort=order", (c) => ({
    value: c.slug,
    label: locText(c.name) || c.slug,
  }));
  const authors = useOptions("/admin/authors?limit=200&sort=order", (a) => ({
    value: a.slug,
    label: locText(a.name) || a.slug,
  }));
  const destinations = useOptions("/admin/destinations?limit=200&sort=order", (x) => ({
    value: x.slug,
    label: locText(x.name) || x.slug,
  }));

  const dirty = useMemo(
    () => JSON.stringify(toPayload(d)) !== JSON.stringify(toPayload(saved)),
    [d, saved],
  );
  useUnsavedGuard(dirty);

  const save = useCallback(async () => {
    const errs = {};
    if (!d.title.en.trim()) errs.title = "Cần nhập tiêu đề tiếng Anh";
    if (!d.slug.trim()) errs.slug = "Cần nhập đường dẫn trang";
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (errs.title) setLang("en");
      toast(Object.values(errs)[0], "error");
      return;
    }
    const body = toPayload(d);
    const r = await run(
      () =>
        isNew
          ? api(PATH, { method: "POST", body })
          : api(`${PATH}/${d.id}`, { method: "PUT", body }),
      isNew ? "Đã tạo bài viết" : "Đã lưu bài viết",
    );
    if (!r?.data) return;
    const next = fromDoc(r.data);
    setSaved(next);
    setD(next);
    if (isNew) router.replace(`${BASE}/${r.data.id}`);
  }, [d, isNew, router, run, toast]);

  // Ctrl/⌘ + S để lưu nhanh
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Quay lại danh sách khi còn thay đổi chưa lưu → hỏi trước
  const guardBack = async (e) => {
    if (!dirty) return;
    e.preventDefault();
    const ok = await confirm({
      title: "Bỏ thay đổi?",
      message: "Bài viết đang soạn chưa được lưu. Nếu rời trang, các thay đổi sẽ mất.",
      confirmText: "Rời trang",
      danger: true,
    });
    if (ok) {
      setD(saved);
      router.push(BASE);
    }
  };

  const filled = filledOf(d.title);
  const isMonth = d.category === MONTH_CATEGORY;

  // Nút dịch + tab ngôn ngữ (đặt ở góc phải mỗi khung có nội dung 3 thứ tiếng).
  // Chỉ đưa phần chữ cho nút dịch; bài mới chưa có đường dẫn thì tạo từ tiêu đề tiếng Anh vừa dịch.
  const langBar = (
    <div className="flex items-center gap-2">
      <AutoTranslate
        lang={lang}
        value={{ title: d.title, excerpt: d.excerpt, body: d.body, seo: d.seo }}
        onChange={(next) =>
          setD((x) => ({
            ...x,
            ...next,
            ...(!slugTouched && !x.slug && next.title.en && { slug: slugify(next.title.en) }),
          }))
        }
        className="rounded-full"
        label={
          <>
            <span className="sm:hidden">Dịch</span>
            <span className="hidden sm:inline">Dịch tự động</span>
          </>
        }
      />
      <LangTabs value={lang} onChange={setLang} filled={filled} />
    </div>
  );

  return (
    <div>
      <PageHeader
        back={<span onClickCapture={guardBack}>{back}</span>}
        title={isNew ? "Viết bài mới" : "Sửa bài viết"}
        description={
          isNew
            ? "Nhập bản tiếng Anh trước (bắt buộc). Bản tiếng Trung / tiếng Việt có thể bổ sung sau."
            : locText(saved.title)
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card
            title="Nội dung"
            description="Chấm xanh: đã nhập · chấm xám: dùng bản tiếng Anh"
            actions={langBar}
          >
            <div className="space-y-5">
              <Field
                label="Tiêu đề"
                required={lang === "en"}
                error={lang === "en" ? errors.title : undefined}
              >
                <LocInput
                  value={d.title}
                  lang={lang}
                  aria-invalid={lang === "en" && !!errors.title}
                  placeholder="VD: 10 Best Things to Do in Hanoi"
                  onChange={(title) =>
                    set({
                      title,
                      ...(!slugTouched && lang === "en" && { slug: slugify(title.en) }),
                    })
                  }
                />
              </Field>
              <Field label="Tóm tắt" hint="1–3 câu, hiện trên thẻ bài viết và đầu bài">
                <LocInput
                  value={d.excerpt}
                  lang={lang}
                  multiline
                  rows={3}
                  onChange={(excerpt) => set({ excerpt })}
                />
              </Field>
              <Field label="Nội dung bài viết">
                <RichText
                  value={d.body[lang]}
                  onChange={(html) => setD((x) => ({ ...x, body: { ...x.body, [lang]: html } }))}
                  folder="articles"
                  minHeight={420}
                  placeholder={
                    lang !== "en" && d.body.en
                      ? "Để trống thì website hiển thị bản tiếng Anh"
                      : "Nhập nội dung bài viết…"
                  }
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Hiển thị trên Google"
            description="Để trống thì dùng tiêu đề và tóm tắt của bài."
            actions={langBar}
          >
            <SeoFields
              value={d.seo}
              onChange={(seo) => set({ seo })}
              lang={lang}
              fallbackTitle={d.title[lang] || d.title.en}
              fallbackDescription={d.excerpt[lang] || d.excerpt.en}
              path={`travel-guide/${d.slug || "…"}`}
            />
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Xuất bản">
            <div className="space-y-5">
              <Toggle
                checked={d.isActive}
                onChange={(isActive) => set({ isActive })}
                label="Hiện trên website"
                hint={d.isActive ? "Khách xem được bài này" : "Bài đang ẩn, khách không thấy"}
              />
              <Field label="Ngày đăng" hint="Bài sắp xếp theo ngày đăng, mới nhất trước">
                <Input
                  type="date"
                  value={d.publishedAt}
                  onChange={(e) => set({ publishedAt: e.target.value })}
                />
              </Field>
              <Field
                label="Đường dẫn trang"
                required
                error={errors.slug}
                hint={
                  isNew
                    ? "Phần cuối của địa chỉ trang, viết không dấu. Tự tạo từ tiêu đề tiếng Anh."
                    : "Phần cuối của địa chỉ trang. Nếu đổi, địa chỉ cũ vẫn tự dẫn sang địa chỉ mới."
                }
              >
                <Input
                  value={d.slug}
                  aria-invalid={!!errors.slug}
                  className="font-mono text-[13px]"
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: slugify(e.target.value) });
                  }}
                />
              </Field>
              {!isNew && saved.slug && (
                <a
                  href={`/travel-guide/${saved.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  <ExternalLink className="size-4" />
                  Xem trên website
                </a>
              )}
              {!isNew && !saved.isActive && (
                <p className="text-xs text-slate-500">
                  Bài đang ẩn nên khách chưa xem được trên website.
                </p>
              )}
            </div>
          </Card>

          <Card title="Ảnh bìa">
            <Field hint="Ảnh ngang 16:10, tối thiểu 1200px. Hiện ở thẻ bài viết và đầu bài.">
              <ImageField
                value={d.image}
                onChange={(image) => set({ image })}
                folder="articles"
                crop={{ width: 1920 }}
              />
            </Field>
          </Card>

          <Card title="Phân loại">
            <div className="space-y-5">
              <Field label="Chuyên mục">
                <OptionSelect
                  value={d.category}
                  onChange={(category) => set({ category })}
                  options={categories}
                  emptyLabel="— Không có chuyên mục —"
                />
              </Field>
              {isMonth && (
                <Field label="Tháng" hint="Bài thuộc mục “Việt Nam theo tháng”">
                  <Select
                    value={d.month ?? ""}
                    onChange={(e) => set({ month: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">— Chọn tháng —</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Tác giả">
                <OptionSelect
                  value={d.author}
                  onChange={(author) => set({ author })}
                  options={authors}
                  emptyLabel="— Không ghi tác giả —"
                />
              </Field>
              <Field label="Điểm đến liên quan" hint="Bài sẽ hiện ở trang điểm đến này">
                <OptionSelect
                  value={d.destination}
                  onChange={(destination) => set({ destination })}
                  options={destinations}
                  emptyLabel="— Không gắn điểm đến —"
                />
              </Field>
            </div>
          </Card>
        </aside>
      </div>

      <div className="sticky bottom-0 z-30 mt-6 -mb-2 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 backdrop-blur sm:px-5">
          <p
            className={cn(
              "flex items-center gap-2 text-sm",
              dirty ? "font-semibold text-amber-700" : "text-slate-500",
            )}
          >
            <span
              className={cn("size-2 rounded-full", dirty ? "bg-amber-500" : "bg-emerald-500")}
            />
            {dirty ? "Có thay đổi chưa lưu" : isNew ? "Bài viết mới" : "Đã lưu mọi thay đổi"}
            <span className="hidden text-xs font-normal text-slate-400 sm:inline">
              · Ctrl + S để lưu
            </span>
          </p>
          <div className="flex gap-2">
            {dirty && !isNew && (
              <Button variant="ghost" onClick={() => setD(saved)}>
                Hoàn tác
              </Button>
            )}
            <Button icon={Save} onClick={save} loading={busy} disabled={!dirty && !isNew}>
              {isNew ? "Tạo bài viết" : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ô chọn theo danh sách; giữ giá trị hiện tại nếu không còn trong danh sách (đã xoá / chưa tải) */
function OptionSelect({ value, onChange, options, emptyLabel }) {
  const missing = value && !options.some((o) => o.value === value);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{emptyLabel}</option>
      {missing && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

const TITLE_MAX = 60;
const DESC_MAX = 160;

function Counter({ n, max }) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold tabular-nums",
        n > max ? "text-sun-600" : n > max * 0.85 ? "text-amber-600" : "text-slate-400",
      )}
    >
      {n}/{max}
    </span>
  );
}

/**
 * Tiêu đề + mô tả SEO theo ngôn ngữ, có đếm ký tự và xem trước kiểu kết quả Google.
 * value = { en: { title, description }, zh: {...}, vi: {...} }
 */
export function SeoFields({ value, onChange, lang, fallbackTitle, fallbackDescription, path }) {
  const cur = value?.[lang] ?? { title: "", description: "" };
  const setLang = (patch) =>
    onChange({ ...seoEmpty(), ...value, [lang]: { title: "", description: "", ...cur, ...patch } });
  const title = cur.title || fallbackTitle || "Tiêu đề trang";
  const desc =
    cur.description || fallbackDescription || "Mô tả ngắn hiện dưới tiêu đề trên Google.";
  const prefix = lang === "en" ? "" : ` › ${lang}`;
  const crumbs = path ? ` › ${path.split("/").join(" › ")}` : "";

  return (
    <div className="space-y-5">
      <Field
        label={
          <span className="flex w-full items-center justify-between gap-2">
            Tiêu đề trên Google <Counter n={cur.title.length} max={TITLE_MAX} />
          </span>
        }
        hint={`Nên dưới ${TITLE_MAX} ký tự để Google không cắt bớt`}
      >
        <Input
          value={cur.title}
          maxLength={200}
          placeholder={fallbackTitle}
          onChange={(e) => setLang({ title: e.target.value })}
        />
      </Field>
      <Field
        label={
          <span className="flex w-full items-center justify-between gap-2">
            Mô tả trên Google <Counter n={cur.description.length} max={DESC_MAX} />
          </span>
        }
        hint={`Nên ${DESC_MAX - 40}–${DESC_MAX} ký tự, nêu nội dung chính của trang`}
      >
        <Textarea
          value={cur.description}
          rows={3}
          maxLength={500}
          placeholder={fallbackDescription}
          onChange={(e) => setLang({ description: e.target.value })}
        />
      </Field>

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Xem trước trên Google
        </p>
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="truncate text-xs text-slate-600">
            vietlooktravel.com{prefix}
            {crumbs}
          </p>
          <p className="mt-1 truncate text-lg leading-snug text-[#1a0dab]">
            {title.length > TITLE_MAX + 5 ? `${title.slice(0, TITLE_MAX)}…` : title}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {desc.length > DESC_MAX + 5 ? `${desc.slice(0, DESC_MAX)}…` : desc}
          </p>
        </div>
      </div>
    </div>
  );
}
